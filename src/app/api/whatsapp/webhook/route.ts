/**
 * Twilio WhatsApp Webhook
 * GET  → verificación del webhook
 * POST → recibe mensajes entrantes de WhatsApp via Twilio, procesa con GLM, responde
 */
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { tenantConfigs } from "@/lib/whatsapp-tenants";

interface TwilioIncoming {
  Body?: string;
  From?: string;
  ProfileName?: string;
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
  // Fallback: return first config that has menu (super admin / sandbox)
  for (const [, config] of tenantConfigs) {
    if (config.menu) return config;
  }
  return null;
}

export async function GET() {
  return NextResponse.json({ status: "ok", service: "axis-whatsapp-webhook" });
}

export async function POST(req: NextRequest) {
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
    };
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const userMessage = formData.Body?.trim();
  const from = formData.From;
  const customerName = formData.ProfileName ?? "Cliente";
  const toNumber = formData.To ?? "";

  if (!userMessage || !from) {
    return new Response("<Response></Response>", {
      headers: { "Content-Type": "application/xml" },
    });
  }

  // Try to find tenant config by the WhatsApp number Twilio sent to
  const tenantConfig = findConfigByWhatsappNumber(toNumber);

  // Resolve config: tenant config > custom headers > env vars
  const glmKey = tenantConfig?.glmApiKey || req.headers.get("x-glm-key") || process.env.GLM_API_KEY || "";
  const glmBase = tenantConfig?.glmBaseUrl || req.headers.get("x-glm-base") || process.env.GLM_BASE_URL || "https://open.bigmodel.cn/api/paas/v4";
  const glmModel = tenantConfig?.glmModel || req.headers.get("x-glm-model") || process.env.GLM_MODEL || "glm-4.5-flash";
  const restaurantName = tenantConfig?.restaurantName || req.headers.get("x-restaurant-name") || "Restaurante";
  const menuText = tenantConfig?.menu || req.headers.get("x-menu") || "No hay menú configurado.";
  const greeting = tenantConfig?.greeting || req.headers.get("x-greeting") || "¡Hola! ¿En qué puedo ayudarte?";

  const sid = tenantConfig?.twilioSid || req.headers.get("x-twilio-sid") || "";
  const token = tenantConfig?.twilioToken || req.headers.get("x-twilio-token") || "";
  const whatsappNumber = tenantConfig?.twilioWhatsappNumber || req.headers.get("x-twilio-from") || "";

  if (!glmKey) {
    const twiml = `<Response><Message>Lo siento, el asistente no está disponible en este momento.</Message></Response>`;
    return new Response(twiml, { headers: { "Content-Type": "application/xml" } });
  }

  const history = conversationCache.get(from) ?? [];
  const systemPrompt = buildSystemPrompt(restaurantName, menuText, greeting);

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

  if (sid && token && whatsappNumber) {
    await sendWhatsApp(sid, token, whatsappNumber, from, reply);
    return new Response("<Response></Response>", {
      headers: { "Content-Type": "application/xml" },
    });
  }

  const twiml = `<Response><Message>${reply.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</Message></Response>`;
  return new Response(twiml, { headers: { "Content-Type": "application/xml" } });
}
