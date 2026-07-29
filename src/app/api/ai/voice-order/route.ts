/**
 * Axis IA — interpretación de un pedido dictado.
 *
 * Recibe el texto transcrito y los nombres de la carta del restaurante, y
 * devuelve líneas estructuradas. Devuelve NOMBRES, nunca ids: el cliente los
 * resuelve contra su catálogo real (src/lib/voice-order.ts), así el modelo no
 * puede colar un producto inexistente.
 */
export const runtime = "nodejs";

export interface VoiceOrderLine {
  /** Nombre del producto tal como el modelo lo entendió. */
  name: string;
  quantity: number;
  notes?: string;
  variation?: string;
  /** true = el mesero pidió quitarlo del pedido en curso. */
  remove?: boolean;
}

export interface VoiceOrderPlan {
  lines: VoiceOrderLine[];
  table: number | null;
  /** Trozos que no se pudieron interpretar, para avisar al mesero. */
  unknown: string[];
  /** true = lo resolvió el modelo; false = hubo que usar reglas locales. */
  ai: boolean;
}

const SYSTEM = `Eres el tomador de pedidos por voz de un restaurante. Devuelves SOLO JSON válido, sin markdown ni explicaciones.

Formato:
{"table":4,"lines":[{"name":"Mojito","quantity":2,"notes":"sin hielo"},{"name":"Teriyaki Thai","quantity":1}],"unknown":[]}

Reglas:
- "name" debe ser uno de los nombres de la CARTA que recibes, copiado tal cual. Nunca inventes productos.
- Lo que no corresponda a ningún producto de la carta va en "unknown" como texto.
- "quantity" entero ≥ 1. Si no se dice cantidad, 1.
- "notes" solo lo que afecta la preparación: "sin hielo", "sin cebolla", "término medio", "para llevar".
- "variation" solo si la carta indica variaciones para ese producto y el usuario nombra una.
- Si pide quitar o cancelar algo, esa línea lleva "remove": true.
- "table" es el número de mesa si lo menciona; si no, null.
- El audio viene de un salón con ruido: corrige errores obvios de transcripción hacia el nombre más parecido de la carta ("mo jito" → "Mojito").`;

function coerce(raw: string, menu: string[]): VoiceOrderPlan {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return { lines: [], table: null, unknown: [], ai: true };

  let data: { lines?: unknown; table?: unknown; unknown?: unknown };
  try {
    data = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return { lines: [], table: null, unknown: [], ai: true };
  }
  const known = new Set(menu.map((n) => n.toLowerCase()));
  const lines: VoiceOrderLine[] = [];
  const unknown: string[] = Array.isArray(data?.unknown) ? data.unknown.map(String).filter(Boolean) : [];

  for (const item of Array.isArray(data?.lines) ? data.lines : []) {
    const name = String(item?.name ?? "").trim();
    if (!name) continue;
    const quantity = Math.max(1, Math.round(Number(item?.quantity) || 1));
    // El nombre debe existir en la carta; si no, se reporta en vez de agregarse.
    if (!known.has(name.toLowerCase())) {
      unknown.push(name);
      continue;
    }
    lines.push({
      name,
      quantity,
      notes: item?.notes ? String(item.notes).slice(0, 120) : undefined,
      variation: item?.variation ? String(item.variation).slice(0, 60) : undefined,
      remove: item?.remove === true ? true : undefined,
    });
  }

  const table = Number(data?.table);
  return {
    lines,
    table: Number.isFinite(table) && table > 0 ? Math.round(table) : null,
    unknown,
    ai: true,
  };
}

export async function POST(req: Request) {
  let transcript = "";
  let menu: string[] = [];
  let current: string[] = [];
  try {
    const body = (await req.json()) as { transcript?: string; menu?: string[]; current?: string[] };
    transcript = String(body?.transcript ?? "").slice(0, 600);
    menu = Array.isArray(body?.menu) ? body.menu.map(String).slice(0, 300) : [];
    current = Array.isArray(body?.current) ? body.current.map(String).slice(0, 40) : [];
  } catch {
    /* body inválido */
  }

  const apiKey = process.env.GLM_API_KEY;
  // Sin clave o sin datos: que el cliente resuelva con sus reglas locales.
  if (!transcript.trim() || menu.length === 0 || !apiKey) {
    return Response.json({ lines: [], table: null, unknown: [], ai: false } satisfies VoiceOrderPlan);
  }

  const baseUrl = process.env.GLM_BASE_URL ?? "https://open.bigmodel.cn/api/paas/v4";
  const model = process.env.GLM_MODEL ?? "glm-4.5-air";
  const userContent = [
    `CARTA (nombres exactos):\n${menu.join("\n")}`,
    current.length > 0 ? `PEDIDO ACTUAL:\n${current.join("\n")}` : "",
    `DICTADO DEL MESERO:\n"${transcript}"`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 700,
        thinking: { type: "disabled" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userContent },
        ],
      }),
    });
    if (!upstream.ok) {
      return Response.json({ lines: [], table: null, unknown: [], ai: false } satisfies VoiceOrderPlan);
    }
    const json = await upstream.json();
    return Response.json(coerce(String(json?.choices?.[0]?.message?.content ?? ""), menu));
  } catch {
    return Response.json({ lines: [], table: null, unknown: [], ai: false } satisfies VoiceOrderPlan);
  }
}
