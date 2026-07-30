/**
 * Axis IA — extracción de acciones ejecutables.
 *
 * El chat solo redacta texto: si el usuario pide "crea el insumo X", el modelo
 * respondía que lo había creado sin que nada pasara. Esta ruta traduce el
 * mensaje a una acción estructurada; quien la ejecuta contra el backend es el
 * cliente (con la sesión del usuario), previa confirmación del usuario, y luego
 * responde con el dato real.
 *
 * El modelo trabaja con NOMBRES, nunca con ids: resolverlos contra los datos del
 * restaurante es trabajo del cliente (src/lib/ai-actions.ts), así no puede
 * inventarse un insumo, un producto o un proveedor que no existe.
 */
export const runtime = "nodejs";

export type AiActionKind =
  | "create_inventory_item"
  | "update_inventory_item"
  | "delete_inventory_item"
  | "register_purchase"
  | "create_recipe"
  | "add_order_lines"
  | "none";

export interface AiItemPayload {
  name: string;
  category?: string;
  stock?: number;
  unit?: string;
  minStock?: number;
  cost?: number;
  supplier?: string;
}

export interface AiPurchasePayload {
  supplier: string;
  invoiceNumber?: string;
  receivedAt?: string | null;
  dueDate?: string | null;
  lines: { name: string; quantity: number; unitCost: number; taxRate?: number }[];
}

export interface AiRecipePayload {
  name: string;
  price?: number;
  category?: string;
  portions?: number;
  prepMinutes?: number;
  description?: string;
  ingredients?: { name: string; quantity: number; unit?: string; waste?: number }[];
}

export interface AiOrderPayload {
  table?: number | null;
  lines: { name: string; quantity: number; notes?: string }[];
}

export interface AiAction {
  action: AiActionKind;
  item?: AiItemPayload;
  purchase?: AiPurchasePayload;
  recipe?: AiRecipePayload;
  order?: AiOrderPayload;
  /** Qué faltó para poder ejecutar (solo cuando action = "none"). */
  missing?: string;
}

const SYSTEM = `Eres el extractor de acciones del POS Axis. Devuelves SOLO JSON válido, sin texto ni markdown.

ACCIONES:
- "create_inventory_item": crear/registrar un INSUMO de inventario.
- "update_inventory_item": cambiar datos de un insumo que ya existe (stock, costo, mínimo, categoría, proveedor).
- "delete_inventory_item": eliminar un insumo.
- "register_purchase": registrar una COMPRA a un proveedor (entra al inventario).
- "create_recipe": crear un PRODUCTO o RECETA de la carta.
- "add_order_lines": agregar productos a un PEDIDO (tomar la orden de una mesa).
- "none": preguntas, análisis, reportes o cualquier cosa que no sea una de las anteriores.

FORMATOS (uno por acción):
{"action":"create_inventory_item","item":{"name":"Coca Cola","category":"Bebidas","stock":24,"unit":"Und","minStock":6,"cost":2500,"supplier":""}}
{"action":"update_inventory_item","item":{"name":"Coca Cola","stock":40,"cost":2700,"minStock":10}}
{"action":"delete_inventory_item","item":{"name":"Coca Cola"}}
{"action":"register_purchase","purchase":{"supplier":"Distribuidora Sur","invoiceNumber":"FV-102","receivedAt":"2026-07-29","dueDate":"2026-08-29","lines":[{"name":"Coca Cola","quantity":24,"unitCost":2200,"taxRate":19}]}}
{"action":"create_recipe","recipe":{"name":"Limonada de coco","price":12000,"category":"Bebidas","portions":1,"prepMinutes":5,"description":"","ingredients":[{"name":"Limón","quantity":0.1,"unit":"kg","waste":5}]}}
{"action":"add_order_lines","order":{"table":4,"lines":[{"name":"Mojito","quantity":2,"notes":"sin hielo"}]}}
{"action":"none","missing":"nombre del insumo"}

REGLAS:
- Los "name" de insumos, productos y proveedores deben copiarse EXACTOS de las listas de DATOS que recibes cuando existan. Si el usuario nombra algo que no está en la lista, cópialo tal como lo dijo.
- Números en COP sin separadores ni símbolos. Fechas en formato YYYY-MM-DD.
- No inventes cantidades, precios ni fechas que el usuario no haya dicho: omite el campo.
- Si falta un dato imprescindible (nombre, o el proveedor de una compra), devuelve {"action":"none","missing":"<qué falta>"}.
- Si el usuario solo pregunta o pide un análisis, devuelve {"action":"none"}.`;

const num = (v: unknown): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};
const str = (v: unknown, max = 120): string => String(v ?? "").trim().slice(0, max);
const date = (v: unknown): string | null => {
  const t = str(v, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
};

function parseAction(raw: string): AiAction {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return { action: "none" };

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return { action: "none" };
  }

  const kind = String(data?.action ?? "none") as AiActionKind;
  const missing = data?.missing ? str(data.missing) : undefined;

  if (kind === "create_inventory_item" || kind === "update_inventory_item" || kind === "delete_inventory_item") {
    const raw = (data.item ?? {}) as Record<string, unknown>;
    const name = str(raw.name);
    if (!name) return { action: "none", missing: missing ?? "nombre del insumo" };
    return {
      action: kind,
      item: {
        name,
        category: raw.category ? str(raw.category, 60) : undefined,
        unit: raw.unit ? str(raw.unit, 16) : undefined,
        stock: num(raw.stock),
        minStock: num(raw.minStock),
        cost: num(raw.cost),
        supplier: raw.supplier ? str(raw.supplier) : undefined,
      },
    };
  }

  if (kind === "register_purchase") {
    const raw = (data.purchase ?? {}) as Record<string, unknown>;
    const supplier = str(raw.supplier);
    const lines = (Array.isArray(raw.lines) ? raw.lines : [])
      .map((l) => {
        const line = l as Record<string, unknown>;
        return {
          name: str(line.name),
          quantity: num(line.quantity) ?? 0,
          unitCost: num(line.unitCost) ?? 0,
          taxRate: num(line.taxRate),
        };
      })
      .filter((l) => l.name && l.quantity > 0);
    if (!supplier) return { action: "none", missing: missing ?? "proveedor de la compra" };
    if (lines.length === 0) return { action: "none", missing: missing ?? "insumos de la compra" };
    return {
      action: kind,
      purchase: {
        supplier,
        invoiceNumber: raw.invoiceNumber ? str(raw.invoiceNumber, 40) : undefined,
        receivedAt: date(raw.receivedAt),
        dueDate: date(raw.dueDate),
        lines,
      },
    };
  }

  if (kind === "create_recipe") {
    const raw = (data.recipe ?? {}) as Record<string, unknown>;
    const name = str(raw.name);
    if (!name) return { action: "none", missing: missing ?? "nombre del producto" };
    const ingredients = (Array.isArray(raw.ingredients) ? raw.ingredients : [])
      .map((i) => {
        const ing = i as Record<string, unknown>;
        return {
          name: str(ing.name),
          quantity: num(ing.quantity) ?? 0,
          unit: ing.unit ? str(ing.unit, 16) : undefined,
          waste: num(ing.waste),
        };
      })
      .filter((i) => i.name && i.quantity > 0);
    return {
      action: kind,
      recipe: {
        name,
        price: num(raw.price),
        category: raw.category ? str(raw.category, 60) : undefined,
        portions: num(raw.portions),
        prepMinutes: num(raw.prepMinutes),
        description: raw.description ? str(raw.description, 300) : undefined,
        ingredients,
      },
    };
  }

  if (kind === "add_order_lines") {
    const raw = (data.order ?? {}) as Record<string, unknown>;
    const lines = (Array.isArray(raw.lines) ? raw.lines : [])
      .map((l) => {
        const line = l as Record<string, unknown>;
        return {
          name: str(line.name),
          quantity: Math.max(1, Math.round(num(line.quantity) ?? 1)),
          notes: line.notes ? str(line.notes, 120) : undefined,
        };
      })
      .filter((l) => l.name);
    if (lines.length === 0) return { action: "none", missing: missing ?? "productos del pedido" };
    const table = num(raw.table);
    return { action: kind, order: { table: table && table > 0 ? Math.round(table) : null, lines } };
  }

  return { action: "none", missing };
}

export async function POST(req: Request) {
  let message = "";
  let context = "";
  try {
    const body = (await req.json()) as { message?: string; context?: string };
    message = String(body?.message ?? "").slice(0, 600);
    context = String(body?.context ?? "").slice(0, 6000);
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
      // El modelo se ha tomado más de un minuto con contextos grandes; pasado el
      // tope se trata como "no es una acción" y el chat responde normal.
      signal: AbortSignal.timeout(12000),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 600,
        thinking: { type: "disabled" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: context ? `DATOS DEL RESTAURANTE:\n${context}\n\nMENSAJE:\n${message}` : message },
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
