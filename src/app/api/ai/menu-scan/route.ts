/**
 * Escanea una foto de menú con GLM-4V y extrae productos como JSON.
 * Usa glm-4v-flash (modelo multimodal de Zhipu) — distinto al glm-4.5-air de texto.
 * Responde JSON plano (no stream).
 */
export const runtime = "nodejs";

export interface ScannedProduct {
  name: string;
  description: string;
  price: number;
  categoryHint: string; // texto libre (Entradas, Bebidas, etc.)
  tags: string[];
}

interface ScanResponse {
  products: ScannedProduct[];
  error?: string;
}

const VISION_PROMPT = `Analiza esta foto de menú de restaurante.
Extrae TODOS los platos, bebidas y postres que puedas leer.
Devuelve ÚNICAMENTE un JSON válido sin explicaciones, con este formato exacto:

{
  "products": [
    {
      "name": "Nombre del plato",
      "description": "Descripción breve de ingredientes o características",
      "price": 25000,
      "categoryHint": "Entradas|Principales|Postres|Bebidas|Otros",
      "tags": ["vegetariano", "picante"]
    }
  ]
}

Reglas:
- price: número entero COP (si no hay precio visible, pon 0)
- categoryHint: elige la categoría más apropiada de la lista
- tags: máximo 3 etiquetas relevantes, array vacío si no aplica
- Si el menú está en otro idioma, traduce nombres y descripciones al español
- Solo JSON, sin texto adicional, sin bloques de código markdown`;

export async function POST(req: Request): Promise<Response> {
  let image = "";
  try {
    const body = await req.json();
    image = body.image ?? "";
  } catch {
    return Response.json({ products: [], error: "Cuerpo de petición inválido" } as ScanResponse, { status: 400 });
  }

  if (!image) {
    return Response.json({ products: [], error: "Se requiere una imagen" } as ScanResponse, { status: 400 });
  }

  const apiKey = process.env.GLM_API_KEY;
  const baseUrl = process.env.GLM_BASE_URL ?? "https://open.bigmodel.cn/api/paas/v4";
  const visionModel = process.env.GLM_VISION_MODEL ?? "glm-4v";

  if (!apiKey) {
    return Response.json({
      products: [],
      error: "GLM_API_KEY no configurada. Configura la clave en .env.local para usar esta función.",
    } as ScanResponse);
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: visionModel,
        stream: false,
        temperature: 0.1,
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: image },
              },
              {
                type: "text",
                text: VISION_PROMPT,
              },
            ],
          },
        ],
      }),
    });
  } catch (err) {
    return Response.json({ products: [], error: "No se pudo conectar con la IA de visión" } as ScanResponse, { status: 503 });
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return Response.json(
      { products: [], error: `Error GLM-4V (${upstream.status}): ${detail.slice(0, 300)}` } as ScanResponse,
      { status: 502 }
    );
  }

  const data = await upstream.json();
  const raw: string = data.choices?.[0]?.message?.content ?? "";

  // Limpiar posibles bloques markdown que el modelo incluya
  const cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  let parsed: ScanResponse;
  try {
    parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed.products)) parsed = { products: [] };
  } catch {
    return Response.json(
      { products: [], error: `La IA devolvió respuesta no parseable: ${raw.slice(0, 200)}` } as ScanResponse,
      { status: 502 }
    );
  }

  return Response.json(parsed);
}
