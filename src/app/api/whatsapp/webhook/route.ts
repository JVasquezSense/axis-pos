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
  MediaUrl0?: string;
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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    signal: controller.signal,
    body: JSON.stringify({
      model,
      stream: false,
      temperature: 0.7,
      max_tokens: 400,
      messages: [
        { role: "system", content: systemPrompt },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: userMessage },
      ],
    }),
  });
  clearTimeout(timeout);

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
        enabled: false, greeting: "", restaurantName: "", menu: "", paymentInfo: "", businessInfo: "",
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
      MediaUrl0: params.get("MediaUrl0") ?? undefined,
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
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { "Content-Type": "application/xml" },
    });
  }

  const tenantConfig = findConfigByWhatsappNumber(toNumber);
  const slug = tenantConfig ? [...tenantConfigs.entries()].find(([, v]) => v === tenantConfig)?.[0] ?? "demo-burger" : "demo-burger";

  // Receipt image detection: customer sends an image after placing an order
  if (hasMedia && mediaType.startsWith("image/")) {
    const mediaUrl = formData.MediaUrl0;
    const order = markReceiptReceived(slug, from, mediaUrl);
    if (order) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>✅ ¡Comprobante recibido! Tu pedido ${order.code} está siendo procesado. Te avisaremos cuando esté listo. 🍔</Message></Response>`;
      return new Response(twiml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
    }
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Recibimos tu imagen. Si deseas hacer un pedido, escríbenos y con gusto te atendemos. 😊</Message></Response>`;
    return new Response(twiml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
  }

  if (!userMessage) {
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
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
  const businessInfo = tenantConfig?.businessInfo || "";

  if (!glmKey) {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Lo siento, el asistente no está disponible en este momento.</Message></Response>`;
    return new Response(twiml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
  }

  const history = conversationCache.get(from) ?? [];
  const systemPrompt = buildSystemPrompt(restaurantName, menuText, greeting, paymentInfo, businessInfo);

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

  // Strip internal order block before sending to customer
  const cleanReply = reply.replace(/===PEDIDO===[\s\S]*?===FIN===\s*/g, "").trim();
  const escaped = cleanReply.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`;
  return new Response(twiml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
