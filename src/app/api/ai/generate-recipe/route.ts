/**
 * Genera la ficha técnica completa de un producto a partir solo de su nombre.
 * POST { name, categories: {id,name}[], inventoryItems: {id,name,unit}[] }
 * Responde JSON con todos los campos de la receta.
 */
export const runtime = "nodejs";

function extractJson(text: string): string {
  // Quitar BOM y caracteres de control raros
  let t = text.replace(/^﻿/, "").trim();
  // Bloque markdown ```json ... ```
  const md = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (md) t = md[1].trim();
  // Extraer desde el primer { hasta el último }
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) return t.slice(start, end + 1);
  return t;
}

export async function POST(req: Request): Promise<Response> {
  let body: {
    name?: string;
    categories?: { id: string; name: string }[];
    inventoryItems?: { id: string; name: string; unit: string }[];
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const { name = "", categories = [], inventoryItems = [] } = body;
  if (!name.trim()) {
    return Response.json({ error: "El nombre es requerido" }, { status: 400 });
  }

  const apiKey = process.env.GLM_API_KEY;
  const baseUrl = process.env.GLM_BASE_URL ?? "https://open.bigmodel.cn/api/paas/v4";
  const model = process.env.GLM_MODEL ?? "glm-4.5-air";

  if (!apiKey) {
    return Response.json({ error: "GLM_API_KEY no configurada." });
  }

  const categoryList = categories.length
    ? categories.map((c) => `"${c.id}" (${c.name})`).join(", ")
    : '"hamburguesas", "bebidas", "postres"';

  const inventoryList = inventoryItems.length
    ? inventoryItems.map((i) => `id="${i.id}" nombre="${i.name}" unidad="${i.unit}"`).join("\n")
    : "(inventario vacío, crea todos como nuevos)";

  const prompt = `Plato: "${name.trim()}"

Genera la ficha técnica completa. Devuelve SOLO este JSON (sin texto extra):

{
  "description": "<descripcion apetitosa max 180 chars>",
  "emoji": "<un emoji>",
  "price": <numero COP entre 8000 y 150000>,
  "category": "<id de categoria>",
  "prepMinutes": <numero>,
  "difficulty": "<easy|medium|hard>",
  "station": "<grill|fry|cold|bar|pastry>",
  "allergens": ["<solo de: gluten lacteos huevo mani mariscos soya pescado>"],
  "tags": ["<etiqueta>"],
  "steps": ["<paso 1>", "<paso 2>", "<paso 3>"],
  "variations": [{"name": "<nombre>", "priceDelta": <numero COP>}],
  "ingredients": [{"name": "<nombre>", "unit": "<kg|g|L|ml|und>", "quantity": <numero>, "waste": <merma tipica decimal: carnes 0.10-0.15, vegetales 0.15-0.25, frutas 0.10-0.20, mariscos 0.15-0.20, pollo 0.08-0.12, otros 0.05-0.10>, "existingId": "<id o null>", "cost": <costo unitario COP por unidad del campo unit, ej: 5000 por kg de carne>}]
}

Categorias (usa el id exacto): ${categoryList}

Inventario (usa existingId solo si el nombre coincide exacto): ${inventoryList}`;

  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        stream: false,
        temperature: 0.5,
        max_tokens: 2000,
        thinking: { type: "disabled" },
        messages: [
          {
            role: "system",
            content: "Eres un asistente de restaurante. SOLO respondes con JSON válido, sin texto adicional, sin markdown, sin explicaciones.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });
  } catch {
    return Response.json({ error: "No se pudo conectar con la IA" }, { status: 503 });
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return Response.json({ error: `Error IA (${upstream.status}): ${detail.slice(0, 200)}` }, { status: 502 });
  }

  const raw = await upstream.json();
  const content: string = raw.choices?.[0]?.message?.content ?? "";

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(extractJson(content));
  } catch {
    console.error("[generate-recipe] JSON parse error. Raw content:", content);
    return Response.json({ error: `La IA no devolvió JSON válido. Respuesta: ${content.slice(0, 200)}` }, { status: 502 });
  }

  return Response.json(parsed);
}
