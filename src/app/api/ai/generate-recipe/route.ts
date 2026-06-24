/**
 * Genera la ficha técnica completa de un producto a partir solo de su nombre.
 * POST { name, categories: {id,name}[], inventoryItems: {id,name,unit}[] }
 * Responde JSON con todos los campos de la receta.
 */
export const runtime = "nodejs";

function extractJson(text: string): string {
  const md = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (md) return md[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text.trim();
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

  const prompt = `Eres chef y consultor de restaurantes. Genera la ficha técnica completa para este plato: "${name.trim()}"

Responde ÚNICAMENTE con JSON válido (sin markdown, sin texto extra). Usa esta estructura exacta:
{
  "description": "descripción apetitosa ≤180 chars para la carta",
  "emoji": "un solo emoji representativo del plato",
  "price": 28000,
  "category": "id_exacto_de_la_lista",
  "prepMinutes": 20,
  "difficulty": "easy",
  "station": "grill",
  "allergens": ["gluten"],
  "tags": ["clasica","popular"],
  "steps": ["Paso 1...","Paso 2...","Paso 3..."],
  "variations": [{"name":"Doble proteína","priceDelta":8000}],
  "ingredients": [
    {"name":"Carne molida","unit":"kg","quantity":0.2,"waste":0.05,"existingId":"id_si_coincide_o_null"}
  ]
}

CATEGORÍAS disponibles (usa el id exacto sin paréntesis):
${categoryList}

INVENTARIO existente (pon el id en "existingId" solo si el nombre coincide exactamente):
${inventoryList}

Reglas:
- price: pesos colombianos (COP), rango 8000–150000, realista para restaurante
- prepMinutes: tiempo real de preparación en minutos
- difficulty: "easy" | "medium" | "hard"
- station: "grill" | "fry" | "cold" | "bar" | "pastry"
- allergens: solo de ["gluten","lacteos","huevo","mani","mariscos","soya","pescado"]
- steps: 3 a 6 pasos claros de cocina
- variations: 1 a 3 opciones típicas (tamaño, proteína, sin gluten, etc.)
- ingredients: todos los ingredientes principales con unidades estándar (kg, g, L, ml, und)
- waste: merma como fracción 0–0.3
- existingId: null si no hay coincidencia en el inventario`;

  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        stream: false,
        temperature: 0.7,
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }],
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
    return Response.json({ error: "La IA no devolvió JSON válido", raw: content.slice(0, 300) }, { status: 502 });
  }

  return Response.json(parsed);
}
