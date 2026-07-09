/**
 * Twilio WhatsApp Webhook
 * GET  → verificación del webhook
 * POST → recibe mensajes entrantes de WhatsApp via Twilio, procesa con GLM, responde
 *        También acepta JSON (Content-Type: application/json) para config updates
 */
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { tenantConfigs, type TenantConfig } from "@/lib/whatsapp-tenants";
import { addWhatsAppOrder, markReceiptReceived, parseOrderBlock } from "@/lib/whatsapp-orders";

interface TwilioIncoming {
  Body?: string;
  From?: string;
  ProfileName?: string;
  NumMedia?: string;
  MediaContentType0?: string;
  To?: string;
  MessageSid?: string;
}

async function callGLM(
  apiKey: string,
  baseUrl: string,
  model: string,
  systemPrompt: string,
  history: { role: string; content: string }[],
  userMessage: string
): Promise<string> {
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
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`GLM ${res.status}: ${detail.slice(0, 200)}`);
  }

  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "Lo siento, no pude procesar tu mensaje.";
}

async function sendWhatsApp(sid: string, token: string, from: string, to: string, body: string, accountSid?: string) {
  const acSid = accountSid || (sid.startsWith("AC") ? sid : "");
  const url = `https://api.twilio.com/2010-04-01/Accounts/${acSid || sid}/Messages.json`;
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");

  const params = new URLSearchParams();
  params.set("From", from);
  params.set("To", to);
  params.set("Body", body);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`Twilio send error ${res.status}:`, detail.slice(0, 300));
  }
  return res.ok;
}

const conversationCache = new Map<string, { role: string; content: string }[]>();

function buildSystemPrompt(restaurantName: string, menu: string, greeting: string, paymentInfo: string): string {
  const paymentBlock = paymentInfo
    ? `\n\n${paymentInfo}\n\nQuedamos atentos al envío del comprobante.`
    : "";

  return `Eres el asistente virtual de WhatsApp de "${restaurantName}", un restaurante.
Tu trabajo es ayudar a los clientes a hacer pedidos por WhatsApp.

REGLAS ESTRICTAS:
- Responde SIEMPRE en español, breve y amigable.
- Usa emojis con moderación para ser cálido.
- Moneda: COP (pesos colombianos). Formatea precios con punto de miles: $27.900
- NUNCA inventes productos, precios, categorías o información que NO esté en el MENÚ DISPONIBLE de abajo.
- Si piden algo que NO está en el menú, di exactamente: "Lo siento, no tenemos ese producto. Te puedo ofrecer:" y lista SOLO productos del menú.
- SOLO puedes mencionar productos que aparecen textualmente en la sección MENÚ DISPONIBLE.
- Cuando el cliente confirme su pedido, genera el resumen así:

1. Primero, internamente incluye este bloque EXACTO (el sistema lo necesita para registrar el pedido):
===PEDIDO===
- [cantidad]x [nombre exacto del producto] - $[precio unitario]
TOTAL: $[total]
CLIENTE: [nombre si lo dio]
TEL: [número del cliente]
===FIN===

2. Luego muestra al cliente un resumen VISIBLE con este formato:
"Perfecto, confirmo tu pedido:

[cantidad]x [nombre del producto] - $[precio]
TOTAL: $[total]${paymentBlock}"

- Si el cliente quiere modificar después del resumen, genera uno nuevo.
- No inventes productos. No des descuentos. No inventes tiempos de entrega.
- Si preguntan por horarios, dirección u otra info que no tengas, diles que contacten directamente al restaurante.

SALUDO INICIAL (primera vez que alguien escribe):
${greeting}

MENÚ DISPONIBLE:
${menu}`;
}

function findConfigByWhatsappNumber(toNumber: string) {
  for (const [, config] of tenantConfigs) {
    if (config.enabled && config.twilioWhatsappNumber === toNumber) {
      return config;
    }
  }
  for (const [, config] of tenantConfigs) {
    if (config.twilioWhatsappNumber === toNumber) {
      return config;
    }
  }
  for (const [, config] of tenantConfigs) {
    if (config.menu) return config;
  }
  return null;
}

export async function GET() {
  const count = tenantConfigs.size;
  const slugs = [...tenantConfigs.keys()];
  return NextResponse.json({ status: "ok", service: "axis-whatsapp-webhook", tenants: count, slugs });
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";

  // JSON = config update (from admin panel)
  if (contentType.includes("application/json")) {
    try {
      const body = await req.json();
      const slug = body.slug ?? "demo-burger";
      const existing = tenantConfigs.get(slug) ?? {
        twilioSid: "", twilioToken: "", twilioWhatsappNumber: "",
        glmApiKey: "", glmModel: "glm-4.5-flash",
        glmBaseUrl: "https://open.bigmodel.cn/api/paas/v4",
        enabled: false, greeting: "", restaurantName: "", menu: "", paymentInfo: "",
      };
      const updated = { ...existing, ...body };
      delete (updated as Record<string, unknown>).slug;
      tenantConfigs.set(slug, updated as TenantConfig);
      return NextResponse.json({ ok: true, slug, source: "webhook" });
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
  }

  // Form-urlencoded = Twilio incoming message
  let formData: TwilioIncoming = {};
  try {
    const text = await req.text();
    const params = new URLSearchParams(text);
    formData = {
      Body: params.get("Body") ?? undefined,
      From: params.get("From") ?? undefined,
      ProfileName: params.get("ProfileName") ?? undefined,
      To: params.get("To") ?? undefined,
      MessageSid: params.get("MessageSid") ?? undefined,
      NumMedia: params.get("NumMedia") ?? undefined,
      MediaContentType0: params.get("MediaContentType0") ?? undefined,
    };
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const userMessage = formData.Body?.trim();
  const from = formData.From;
  const toNumber = formData.To ?? "";
  const hasMedia = parseInt(formData.NumMedia || "0") > 0;
  const mediaType = formData.MediaContentType0 || "";
  const customerName = formData.ProfileName ?? "Cliente";

  if (!from) {
    return new Response("<Response></Response>", {
      headers: { "Content-Type": "application/xml" },
    });
  }

  const tenantConfig = findConfigByWhatsappNumber(toNumber);
  const slug = tenantConfig ? [...tenantConfigs.entries()].find(([, v]) => v === tenantConfig)?.[0] ?? "demo-burger" : "demo-burger";

  // Receipt image detection: customer sends an image after placing an order
  if (hasMedia && mediaType.startsWith("image/")) {
    const order = markReceiptReceived(slug, from);
    if (order) {
      const twiml = `<Response><Message>✅ ¡Comprobante recibido! Tu pedido ${order.code} está siendo procesado. Te avisaremos cuando esté listo. 🍔</Message></Response>`;
      return new Response(twiml, { headers: { "Content-Type": "application/xml" } });
    }
    const twiml = `<Response><Message>Recibimos tu imagen. Si deseas hacer un pedido, escríbenos y con gusto te atendemos. 😊</Message></Response>`;
    return new Response(twiml, { headers: { "Content-Type": "application/xml" } });
  }

  if (!userMessage) {
    return new Response("<Response></Response>", {
      headers: { "Content-Type": "application/xml" },
    });
  }

  const glmKey = tenantConfig?.glmApiKey || process.env.GLM_API_KEY || "";
  const glmBase = tenantConfig?.glmBaseUrl || process.env.GLM_BASE_URL || "https://open.bigmodel.cn/api/paas/v4";
  const glmModel = tenantConfig?.glmModel || process.env.GLM_MODEL || "glm-4.5-flash";
  const restaurantName = tenantConfig?.restaurantName || "Restaurante";
  const menuText = tenantConfig?.menu || "No hay menú configurado.";
  const greeting = tenantConfig?.greeting || "¡Hola! ¿En qué puedo ayudarte?";
  const paymentInfo = tenantConfig?.paymentInfo || "";

  if (!glmKey) {
    const twiml = `<Response><Message>Lo siento, el asistente no está disponible en este momento.</Message></Response>`;
    return new Response(twiml, { headers: { "Content-Type": "application/xml" } });
  }

  const history = conversationCache.get(from) ?? [];
  const systemPrompt = buildSystemPrompt(restaurantName, menuText, greeting, paymentInfo);

  let reply: string;
  try {
    reply = await callGLM(glmKey, glmBase, glmModel, systemPrompt, history.slice(-10), userMessage);
  } catch (err) {
    console.error("GLM error:", err);
    reply = "Disculpa, tengo un problema técnico. Por favor intenta de nuevo en un momento. 🙏";
  }

  history.push({ role: "user", content: userMessage });
  history.push({ role: "assistant", content: reply });
  if (history.length > 20) history.splice(0, history.length - 20);
  conversationCache.set(from, history);

  // Detect order in bot response
  const orderData = parseOrderBlock(reply);
  if (orderData && orderData.items.length > 0) {
    addWhatsAppOrder(slug, {
      customer: orderData.customer || customerName,
      phone: from,
      lines: orderData.items.map((i) => ({ name: i.name, quantity: i.qty, price: i.price })),
      total: orderData.total,
    });
  }

  const escaped = reply.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const twiml = `<Response><Message>${escaped}</Message></Response>`;
  return new Response(twiml, { headers: { "Content-Type": "application/xml" } });
}
