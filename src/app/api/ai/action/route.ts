/**
 * Axis IA — extracción de acciones ejecutables.
 *
 * El chat solo redacta texto: si el usuario pide "crea el insumo X", el modelo
 * respondía que lo había creado sin que nada pasara. Esta ruta traduce el
 * mensaje a una acción estructurada; quien la ejecuta contra el backend es el
 * cliente (con la sesión del usuario), y luego confirma con el dato real.
 */
export const runtime = "nodejs";

export interface AiAction {
  action: "create_inventory_item" | "none";
  item?: {
    name: string;
    category?: string;
    stock?: number;
    unit?: string;
    minStock?: number;
    cost?: number;
    supplier?: string;
  };
  /** Qué faltó para poder ejecutar (solo cuando action = "none"). */
  missing?: string;
}

const SYSTEM = `Eres un extractor de acciones del POS Axis. Devuelves SOLO JSON válido, sin texto ni markdown.

Acciones posibles:
- "create_inventory_item": el usuario pide crear/registrar/añadir un INSUMO de inventario.
- "none": cualquier otra cosa (preguntas, análisis, reportes, crear productos o recetas).

Formato exacto:
{"action":"create_inventory_item","item":{"name":"Coca Cola","category":"Bebidas","stock":24,"unit":"Und","minStock":6,"cost":2500,"supplier":""}}
{"action":"none"}

Reglas:
- "name" es obligatorio; sin nombre claro devuelve {"action":"none","missing":"nombre del insumo"}.
- Unidades válidas: Und, Kg, Gr, Lt, Ml. Elige la que corresponda (por defecto "Und").
- "stock", "minStock" y "cost" son números en COP sin separadores. Si no se dicen: stock 0, minStock 0, cost 0.
- Categorías típicas: Bebidas, Carnes, Verduras, Lácteos, Abarrotes, Panadería, Licores, Desechables.
- No inventes precios ni cantidades que el usuario no haya dicho.`;

function parseAction(raw: string): AiAction {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return { action: "none" };
  try {
    const data = JSON.parse(cleaned.slice(start, end + 1));
    if (data?.action !== "create_inventory_item") return { action: "none", missing: data?.missing };
    const name = String(data?.item?.name ?? "").trim();
    if (!name) return { action: "none", missing: "nombre del insumo" };
    const num = (v: unknown) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    };
    return {
      action: "create_inventory_item",
      item: {
        name,
        category: String(data.item.category ?? "General").trim() || "General",
        unit: String(data.item.unit ?? "Und").trim() || "Und",
        stock: num(data.item.stock),
        minStock: num(data.item.minStock),
        cost: num(data.item.cost),
        supplier: String(data.item.supplier ?? "").trim(),
      },
    };
  } catch {
    return { action: "none" };
  }
}

export async function POST(req: Request) {
  let message = "";
  try {
    message = String(((await req.json()) as { message?: string })?.message ?? "");
  } catch {
    /* body inválido */
  }
  const apiKey = process.env.GLM_API_KEY;
  if (!message.trim() || !apiKey) return Response.json({ action: "none" } satisfies AiAction);

  const baseUrl = process.env.GLM_BASE_URL ?? "https://open.bigmodel.cn/api/paas/v4";
  const model = process.env.GLM_MODEL ?? "glm-4.5-air";

  try {
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 300,
        thinking: { type: "disabled" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: message },
        ],
      }),
    });
    if (!upstream.ok) return Response.json({ action: "none" } satisfies AiAction);
    const json = await upstream.json();
    return Response.json(parseAction(String(json?.choices?.[0]?.message?.content ?? "")));
  } catch {
    return Response.json({ action: "none" } satisfies AiAction);
  }
}
