/**
 * Genera una descripción de menú para un producto a partir de los datos de su receta.
 * POST { name, ingredients, allergens, tags, station }
 * Responde JSON { description: string }
 */
export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  let body: {
    name?: string;
    ingredients?: { name: string; quantity: number; unit: string }[];
    allergens?: string[];
    tags?: string[];
    station?: string;
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ description: "", error: "Cuerpo inválido" }, { status: 400 });
  }

  const { name = "", ingredients = [], allergens = [], tags = [], station = "" } = body;
  if (!name.trim()) {
    return Response.json({ description: "", error: "El nombre es requerido" }, { status: 400 });
  }

  const apiKey = process.env.GLM_API_KEY;
  const baseUrl = process.env.GLM_BASE_URL ?? "https://open.bigmodel.cn/api/paas/v4";
  const model = process.env.GLM_MODEL ?? "glm-4.5-air";

  if (!apiKey) {
    return Response.json({ description: "", error: "GLM_API_KEY no configurada." });
  }

  const ingredientsList = ingredients.length
    ? ingredients.map((i) => `${i.name} (${i.quantity} ${i.unit})`).join(", ")
    : "sin insumos registrados aún";

  const allergensList = allergens.length ? allergens.join(", ") : "ninguno";
  const tagsList = tags.length ? tags.join(", ") : "";
  const stationLabel = station ? ` · Estación: ${station}` : "";

  const prompt = `Eres el chef copywriter de un restaurante moderno.
Escribe UNA descripción corta (máximo 2 oraciones, tono apetitoso, en español) para la carta de este plato:

Nombre: ${name}${stationLabel}
Insumos principales: ${ingredientsList}
Alérgenos: ${allergensList}
${tagsList ? `Etiquetas: ${tagsList}` : ""}

Reglas:
- Solo el texto de la descripción, sin comillas ni formato extra
- Máximo 180 caracteres
- Destaca los ingredientes más atractivos o la técnica de cocción
- No menciones los alérgenos directamente en la descripción
- Termina con punto`;

  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        stream: false,
        temperature: 0.8,
        max_tokens: 120,
        thinking: { type: "disabled" },
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch {
    return Response.json({ description: "", error: "No se pudo conectar con la IA" }, { status: 503 });
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return Response.json({ description: "", error: `Error IA (${upstream.status}): ${detail.slice(0, 200)}` }, { status: 502 });
  }

  const data = await upstream.json();
  const description: string = (data.choices?.[0]?.message?.content ?? "").trim().replace(/^["']|["']$/g, "");

  if (!description) {
    return Response.json({ description: "", error: "La IA no devolvió una descripción. Intenta de nuevo." }, { status: 502 });
  }

  return Response.json({ description });
}
