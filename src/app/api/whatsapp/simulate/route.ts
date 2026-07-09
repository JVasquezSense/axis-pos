/**
 * Simulador de chat WhatsApp — permite probar el flujo GLM→pedido
 * sin necesitar cuenta Twilio real. Usa la misma lógica de prompt.
 */
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

const conversations = new Map<string, { role: string; content: string }[]>();

function buildSystemPrompt(restaurantName: string, menu: string, greeting: string, paymentInfo: string, businessInfo: string): string {
  const paymentBlock = paymentInfo
    ? `\n\n${paymentInfo}\n\nQuedamos atentos al envío del comprobante.`
    : "";

  const businessBlock = businessInfo
    ? `\nINFORMACIÓN DEL NEGOCIO (usa estos datos para responder preguntas sobre el restaurante):\n${businessInfo}\n`
    : "";

  return `Eres empleado de "${restaurantName}", atiendes por WhatsApp. Habla natural, colombiano, cercano. NUNCA digas que eres bot/IA. Respuestas CORTAS (max 2-3 lineas). Emojis con moderacion. Moneda: COP, formato $27.900.

REGLAS: Solo productos del MENU. No inventes. Acepta personalizaciones (sin cebolla, extra queso) como notas. Si no esta en menu: "Uy no manejamos eso, pero tenemos..." Si preguntan algo del negocio usa solo la INFO DEL NEGOCIO. Si no sabes: "Dejame confirmo y te aviso". Nada robotico.

AL CONFIRMAR PEDIDO genera este bloque interno (el cliente NO lo ve):
===PEDIDO===
- [cant]x [producto] [nota si hay] - $[precio]
TOTAL: $[total]
CLIENTE: [nombre]
TEL: [telefono]
===FIN===
Luego muestra al cliente: resumen con productos, total${paymentBlock}
${businessBlock}
SALUDO: ${greeting}

MENU:
${menu}`;
}

export async function POST(req: NextRequest) {
  let body: {
    message: string;
    phone: string;
    restaurantName: string;
    menu: string;
    greeting: string;
    paymentInfo?: string;
    businessInfo?: string;
    glmApiKey?: string;
    glmBaseUrl?: string;
    glmModel?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { message, phone, restaurantName, menu, greeting } = body;
  if (!message?.trim()) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  const apiKey = body.glmApiKey || process.env.GLM_API_KEY || "";
  const baseUrl = body.glmBaseUrl || process.env.GLM_BASE_URL || "https://open.bigmodel.cn/api/paas/v4";
  const model = body.glmModel || process.env.GLM_MODEL || "glm-4.5-flash";

  if (!apiKey) {
    return NextResponse.json({
      reply: "⚠️ No hay API key de GLM configurada. Configúrala en la sección de WhatsApp Bot o en las variables de entorno del servidor.",
      order: null,
    });
  }

  const sessionKey = phone || "simulator";
  const history = conversations.get(sessionKey) ?? [];
  const systemPrompt = buildSystemPrompt(restaurantName || "Mi Restaurante", menu || "[]", greeting || "¡Hola!", body.paymentInfo || "", body.businessInfo || "");

  let reply: string;
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        stream: false,
        temperature: 0.5,
        max_tokens: 800,
        messages: [
          { role: "system", content: systemPrompt },
          ...history.slice(-10),
          { role: "user", content: message },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`GLM ${res.status}: ${detail.slice(0, 200)}`);
    }

    const json = await res.json();
    reply = json.choices?.[0]?.message?.content ?? "No pude procesar tu mensaje.";
  } catch (err) {
    console.error("Simulate GLM error:", err);
    return NextResponse.json({
      reply: `Error al conectar con GLM: ${err instanceof Error ? err.message : "desconocido"}`,
      order: null,
    });
  }

  history.push({ role: "user", content: message });
  history.push({ role: "assistant", content: reply });
  if (history.length > 20) history.splice(0, history.length - 20);
  conversations.set(sessionKey, history);

  let order: { items: { qty: number; name: string; price: number }[]; total: number; customer: string } | null = null;
  const orderMatch = reply.match(/===PEDIDO===([\s\S]*?)===FIN===/);
  if (orderMatch) {
    const block = orderMatch[1];
    const items: { qty: number; name: string; price: number }[] = [];
    const lineRegex = /- (\d+)x\s+(.+?)\s*-\s*\$([0-9.,]+)/g;
    let m;
    while ((m = lineRegex.exec(block)) !== null) {
      items.push({
        qty: parseInt(m[1]),
        name: m[2].trim(),
        price: parseInt(m[3].replace(/\./g, "").replace(/,/g, "")),
      });
    }
    const totalMatch = block.match(/TOTAL:\s*\$([0-9.,]+)/);
    const customerMatch = block.match(/CLIENTE:\s*(.+)/);
    order = {
      items,
      total: totalMatch ? parseInt(totalMatch[1].replace(/\./g, "").replace(/,/g, "")) : items.reduce((s, i) => s + i.qty * i.price, 0),
      customer: customerMatch?.[1]?.trim() ?? "Cliente WhatsApp",
    };
  }

  const cleanReply = reply.replace(/===PEDIDO===[\s\S]*?===FIN===\s*/g, "").trim();
  return NextResponse.json({ reply: cleanReply, order });
}
