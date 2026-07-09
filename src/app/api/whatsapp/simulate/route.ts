/**
 * Simulador de chat WhatsApp — permite probar el flujo GLM→pedido
 * sin necesitar cuenta Twilio real. Usa la misma lógica de prompt.
 */
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

const conversations = new Map<string, { role: string; content: string }[]>();

function buildSystemPrompt(restaurantName: string, menu: string, greeting: string): string {
  return `Eres el asistente virtual de WhatsApp de "${restaurantName}", un restaurante.
Tu trabajo es ayudar a los clientes a hacer pedidos por WhatsApp.

REGLAS:
- Responde SIEMPRE en español, breve y amigable.
- Usa emojis con moderación para ser cálido.
- Moneda: COP (pesos colombianos). Formatea precios con punto de miles: $27.900
- SOLO ofrece productos del menú. Si piden algo que no existe, sugiere alternativas.
- Cuando el cliente confirme su pedido, responde con un resumen usando EXACTAMENTE este formato:

===PEDIDO===
- [cantidad]x [nombre exacto del producto] - $[precio unitario]
TOTAL: $[total]
CLIENTE: [nombre si lo dio]
TEL: [número del cliente]
===FIN===

- Después del resumen, dile que su pedido fue registrado y dará un tiempo estimado.
- Si el cliente quiere modificar después del resumen, genera uno nuevo.
- No inventes productos. No des descuentos.
- Si preguntan por horarios, dirección u otra info que no tengas, diles que contacten directamente al restaurante.

SALUDO INICIAL (primera vez que alguien escribe):
${greeting}

MENÚ DISPONIBLE:
${menu}`;
}

export async function POST(req: NextRequest) {
  let body: {
    message: string;
    phone: string;
    restaurantName: string;
    menu: string;
    greeting: string;
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
  const systemPrompt = buildSystemPrompt(restaurantName || "Mi Restaurante", menu || "[]", greeting || "¡Hola!");

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
        thinking: { type: "disabled" },
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

  return NextResponse.json({ reply, order });
}
