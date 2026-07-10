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
import { hasMenuPdf, setMenuPdf } from "@/lib/whatsapp-menu-pdf";
import { upsertCustomer, getCustomer, incrementOrderCount } from "@/lib/whatsapp-customers";

interface TwilioIncoming {
  Body?: string;
  From?: string;
  ProfileName?: string;
  NumMedia?: string;
  MediaContentType0?: string;
  MediaUrl0?: string;
  To?: string;
  MessageSid?: string;
  Latitude?: string;
  Longitude?: string;
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
      max_tokens: 250,
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

function buildSystemPrompt(restaurantName: string, menu: string, greeting: string, paymentInfo: string, businessInfo: string, hasMenuPdfAvailable: boolean): string {
  const paymentBlock = paymentInfo
    ? `\n\n${paymentInfo}\n\nQuedamos atentos al envío del comprobante.`
    : "";

  const businessBlock = businessInfo
    ? `\nINFORMACIÓN DEL NEGOCIO (usa estos datos para responder preguntas sobre el restaurante):\n${businessInfo}\n`
    : "";

  const menuRule = hasMenuPdfAvailable
    ? `MENU/CATALOGO: Si piden "el menu", "que tienen", "carta", "catalogo" o similar, NO listes productos. Responde algo como "Te envio nuestro menu!" y agrega exactamente [MENU_PDF] en tu respuesta. Solo menciona productos especificos cuando pregunten por algo puntual.`
    : `MENU/CATALOGO: Si piden "el menu", "que tienen", "carta", "catalogo" o similar, enumera las categorias principales del menu brevemente y pregunta que les interesa. Solo menciona productos especificos cuando pregunten por algo puntual.`;

  return `Eres empleado de "${restaurantName}", atiendes por WhatsApp. Habla natural, colombiano, cercano. NUNCA digas que eres bot/IA. Respuestas CORTAS (max 2-3 lineas). Emojis con moderacion. Moneda: COP, formato $27.900.

REGLAS: Solo productos del MENU. No inventes. Acepta personalizaciones (sin cebolla, extra queso) como notas. Si no esta en menu: "Uy no manejamos eso, pero tenemos..." Si preguntan algo del negocio usa solo la INFO DEL NEGOCIO. Si no sabes: "Dejame confirmo y te aviso". Nada robotico.

${menuRule}

DATOS DEL CLIENTE: Antes de confirmar pedido necesitas: nombre, direccion de entrega (o pueden enviar su ubicacion/pin de WhatsApp). Si el cliente ya dio su direccion o envio ubicacion antes, no la pidas de nuevo.

AL CONFIRMAR PEDIDO genera este bloque interno (el cliente NO lo ve):
===PEDIDO===
- [cant]x [producto] [nota si hay] - $[precio]
TOTAL: $[total]
CLIENTE: [nombre]
TEL: [telefono]
DIRECCION: [direccion o "ubicacion enviada"]
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
      if (body.menuPdf) {
        setMenuPdf(slug, body.menuPdf);
      }
      const updated = { ...existing, ...body };
      delete (updated as Record<string, unknown>).slug;
      delete (updated as Record<string, unknown>).menuPdf;
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
      Latitude: params.get("Latitude") ?? undefined,
      Longitude: params.get("Longitude") ?? undefined,
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

  // Always upsert customer with name from profile
  upsertCustomer(slug, from, { name: customerName });

  // Location detection: Twilio sends Latitude/Longitude when customer shares location
  if (formData.Latitude && formData.Longitude) {
    const lat = parseFloat(formData.Latitude);
    const lng = parseFloat(formData.Longitude);
    const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
    upsertCustomer(slug, from, { latitude: lat, longitude: lng, address: mapsUrl });
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>📍 Ubicacion recibida, gracias! Ya la tenemos guardada para tu pedido 👍</Message></Response>`;
    return new Response(twiml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
  }

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
  const hasPdf = hasMenuPdf(slug);
  const systemPrompt = buildSystemPrompt(restaurantName, menuText, greeting, paymentInfo, businessInfo, hasPdf);

  let reply: string;
  try {
    reply = await callGLM(glmKey, glmBase, glmModel, systemPrompt, history.slice(-6), userMessage);
  } catch (err) {
    console.error("GLM error:", err);
    reply = "Uy perdona, se me fue la conexion 😅 Escribeme de nuevo porfa";
  }

  history.push({ role: "user", content: userMessage });
  history.push({ role: "assistant", content: reply });
  if (history.length > 20) history.splice(0, history.length - 20);
  conversationCache.set(from, history);

  // Detect order in bot response
  const orderData = parseOrderBlock(reply);
  if (orderData && orderData.items.length > 0) {
    // Resolve address: from order block, or from saved customer location
    let address = orderData.address || "";
    if (!address || address === "ubicacion enviada") {
      const savedCustomer = getCustomer(slug, from);
      if (savedCustomer?.address) address = savedCustomer.address;
    }
    if (orderData.address && orderData.address !== "ubicacion enviada") {
      upsertCustomer(slug, from, { address: orderData.address });
    }
    incrementOrderCount(slug, from);

    const orderPayload = {
      customer: orderData.customer || customerName,
      phone: from,
      address: address || undefined,
      lines: orderData.items.map((i) => ({ name: i.name, quantity: i.qty, price: i.price })),
      total: orderData.total,
    };
    addWhatsAppOrder(slug, orderPayload);
    // Bridge serverless isolation: also register in orders API instance
    const ordersBase = process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://axis-pos-nine.vercel.app";
    fetch(`${ordersBase}/api/whatsapp/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, order: orderPayload }),
    }).catch(() => {});
  }

  // Strip internal order block and [MENU_PDF] marker before sending to customer
  let cleanReply = reply.replace(/===PEDIDO===[\s\S]*?===FIN===\s*/g, "").trim();
  const wantsMenuPdf = cleanReply.includes("[MENU_PDF]") && hasPdf;
  cleanReply = cleanReply.replace(/\[MENU_PDF\]/g, "").trim();
  const escaped = cleanReply.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  let mediaTag = "";
  if (wantsMenuPdf) {
    const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://axis-pos-nine.vercel.app";
    mediaTag = `<Media>${baseUrl}/api/whatsapp/menu-pdf?slug=${slug}</Media>`;
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}${mediaTag}</Message></Response>`;
  return new Response(twiml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
