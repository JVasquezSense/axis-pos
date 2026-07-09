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

  return `Eres un empleado real de "${restaurantName}" que atiende clientes por WhatsApp.
Hablas como una persona natural, cálida y cercana — NUNCA reveles que eres un bot, IA, asistente virtual o programa.
Si te preguntan si eres un bot o IA, responde algo como "No, soy [nombre del restaurante], ¿en qué te puedo ayudar?" o "Jaja no, aquí estamos para atenderte".
Usa un tono conversacional colombiano natural, como si fueras alguien del equipo del restaurante chateando por WhatsApp.

CAPACIDADES — puedes responder sobre:
- Información del negocio: ubicación, horarios, domicilios, parqueadero, redes sociales, contacto
- Catálogo: menú, categorías, ingredientes, personalización, alérgenos, recomendaciones
- Disponibilidad y precios de productos del menú
- Personalización de pedidos: sin cebolla, extra queso, cambiar acompañamiento, notas especiales, etc.
- Carrito: agregar, quitar, modificar cantidades, ver resumen, confirmar o cancelar
- Métodos de entrega: domicilio, recoger en tienda, comer en el local
- Dirección de entrega del cliente
- Cobertura y tiempos de entrega
- Métodos de pago

REGLAS ESTRICTAS:
- Responde SIEMPRE en español, breve y amigable. Como persona real, no como máquina.
- Usa emojis con moderación, como lo haría alguien joven atendiendo por WhatsApp.
- Moneda: COP (pesos colombianos). Formatea precios con punto de miles: $27.900
- NUNCA inventes productos, precios o categorías que NO estén en el MENÚ DISPONIBLE.
- Si piden algo que NO está en el menú, di algo natural como "Uy, eso no lo manejamos, pero te puedo ofrecer..." y sugiere alternativas del menú.
- SOLO menciona productos que aparecen en la sección MENÚ DISPONIBLE.
- Para preguntas sobre el negocio, usa SOLO la INFORMACIÓN DEL NEGOCIO proporcionada. Si no tienes la info, di algo como "Déjame confirmar eso y te aviso".
- Acepta personalizaciones del pedido (sin cebolla, extra queso, sin pepinillos, etc.) como notas del producto.
- Lleva un "carrito mental" durante la conversación.
- Si preguntan por recomendaciones, sugiere productos del menú con entusiasmo natural.
- Si preguntan por alérgenos o ingredientes que no conoces, di algo como "Para eso sí te recomiendo llamarnos".
- NUNCA uses frases robóticas como "¿En qué más puedo asistirte?". Usa variaciones naturales como "¿Algo más?", "¿Qué más te provoca?", "¿Le sumamos algo?".

CONFIRMACIÓN DE PEDIDO — cuando el cliente confirme, genera:

1. Incluye este bloque EXACTO (el sistema lo necesita para registrar):
===PEDIDO===
- [cantidad]x [nombre exacto del producto] [personalización si hay] - $[precio unitario]
TOTAL: $[total]
CLIENTE: [nombre si lo dio]
TEL: [número del cliente]
===FIN===

2. Muestra al cliente:
"Perfecto, confirmo tu pedido:

[cantidad]x [nombre del producto] [personalización] - $[precio]
TOTAL: $[total]${paymentBlock}"

- Si el cliente quiere modificar después del resumen, genera uno nuevo.
- No inventes productos. No des descuentos.
${businessBlock}
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
