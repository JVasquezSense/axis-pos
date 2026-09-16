/**
 * Axis IA — interpretación de una compra dictada.
 *
 * "Compré a Bavaria treinta pokers a dos mil quinientos, me regalaron dos, y
 * veinte águilas a dos mil trescientos con diez mil de descuento" → líneas
 * estructuradas. Devuelve NOMBRES del inventario y del proveedor, nunca ids:
 * el cliente los resuelve contra sus catálogos reales.
 */
export const runtime = "nodejs";

export interface VoicePurchaseLine {
  name: string;
  quantity: number;
  unitCost?: number;
  bonusQty?: number;
  discount?: number;
}

export interface VoicePurchasePlan {
  supplier: string | null;
  invoiceNumber: string | null;
  lines: VoicePurchaseLine[];
  unknown: string[];
  ai: boolean;
}

const EMPTY: VoicePurchasePlan = { supplier: null, invoiceNumber: null, lines: [], unknown: [], ai: false };

const SYSTEM = `Eres el asistente de compras de un restaurante en Colombia. Devuelves SOLO JSON válido, sin markdown ni explicaciones.

Formato:
{"supplier":"Bavaria","invoiceNumber":null,"lines":[{"name":"Poker retornable x 330 cm3","quantity":30,"unitCost":2500,"bonusQty":2,"discount":0}],"unknown":[]}

Reglas:
- "name" debe ser uno de los nombres del INVENTARIO que recibes, copiado tal cual. Nunca inventes insumos.
- "supplier" debe ser uno de los PROVEEDORES recibidos, o null si no lo menciona.
- "quantity" es lo comprado (número, puede tener decimales). "unitCost" es el precio por unidad ANTES de IVA, en pesos; si dicen el total de la línea, divide entre la cantidad. Si no dicen precio, omite unitCost.
- "bonusQty": unidades que el proveedor regaló ("me dieron dos de cortesía", "treinta más dos"). "discount": descuento en pesos de esa línea. Omite los que no se mencionen.
- Números en palabras a cifras: "dos mil quinientos" = 2500, "diez mil" = 10000, "media" = 0.5.
- Lo que no corresponda a ningún insumo va en "unknown" como texto.
- Corrige errores obvios de transcripción hacia el nombre más parecido del inventario.`;

function num(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function coerce(raw: string, inventory: string[], suppliers: string[]): VoicePurchasePlan {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return { ...EMPTY, ai: true };
  let data: { supplier?: unknown; invoiceNumber?: unknown; lines?: unknown; unknown?: unknown };
  try {
    data = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return { ...EMPTY, ai: true };
  }
  const known = new Map(inventory.map((n) => [n.toLowerCase(), n]));
  const knownSup = new Map(suppliers.map((n) => [n.toLowerCase(), n]));
  const unknown: string[] = Array.isArray(data?.unknown) ? data.unknown.map(String).filter(Boolean) : [];
  const lines: VoicePurchaseLine[] = [];
  for (const item of Array.isArray(data?.lines) ? data.lines : []) {
    const name = known.get(String(item?.name ?? "").trim().toLowerCase());
    if (!name) {
      if (item?.name) unknown.push(String(item.name));
      continue;
    }
    const quantity = num(item?.quantity) ?? 0;
    if (quantity <= 0) continue;
    lines.push({
      name,
      quantity,
      unitCost: num(item?.unitCost),
      bonusQty: num(item?.bonusQty),
      discount: num(item?.discount),
    });
  }
  const sup = knownSup.get(String(data?.supplier ?? "").trim().toLowerCase()) ?? null;
  const inv = data?.invoiceNumber ? String(data.invoiceNumber).slice(0, 40) : null;
  return { supplier: sup, invoiceNumber: inv, lines, unknown, ai: true };
}

export async function POST(req: Request) {
  let transcript = "";
  let inventory: string[] = [];
  let suppliers: string[] = [];
  try {
    const body = (await req.json()) as { transcript?: string; inventory?: string[]; suppliers?: string[] };
    transcript = String(body?.transcript ?? "").slice(0, 800);
    inventory = Array.isArray(body?.inventory) ? body.inventory.map(String).slice(0, 400) : [];
    suppliers = Array.isArray(body?.suppliers) ? body.suppliers.map(String).slice(0, 100) : [];
  } catch {
    /* body inválido */
  }
  const apiKey = process.env.GLM_API_KEY;
  if (!transcript.trim() || inventory.length === 0 || !apiKey) return Response.json(EMPTY);

  const baseUrl = process.env.GLM_BASE_URL ?? "https://open.bigmodel.cn/api/paas/v4";
  const model = process.env.GLM_MODEL ?? "glm-4.5-air";
  const userContent = [
    `INVENTARIO (nombres exactos):\n${inventory.join("\n")}`,
    suppliers.length ? `PROVEEDORES:\n${suppliers.join("\n")}` : "",
    `DICTADO:\n"${transcript}"`,
  ].filter(Boolean).join("\n\n");

  try {
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      signal: AbortSignal.timeout(12000),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 600,
        thinking: { type: "disabled" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userContent },
        ],
      }),
    });
    if (!upstream.ok) return Response.json(EMPTY);
    const json = await upstream.json();
    return Response.json(coerce(String(json?.choices?.[0]?.message?.content ?? ""), inventory, suppliers));
  } catch {
    return Response.json(EMPTY);
  }
}
