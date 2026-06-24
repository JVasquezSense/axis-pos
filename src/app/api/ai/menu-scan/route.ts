/**
 * Extrae productos de un menú. Dos modos:
 * - image: base64 → modelo vision (si la cuenta lo soporta)
 * - text:  texto pegado → modelo de texto estándar
 * Responde JSON plano (no stream).
 */
export const runtime = "nodejs";

export interface ScannedProduct {
  name: string;
  description: string;
  price: number;
  categoryHint: string;
  tags: string[];
}

interface ScanResponse {
  products: ScannedProduct[];
  error?: string;
}

const JSON_SCHEMA = `
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
}`;

const RULES = `Reglas:
- price: número entero COP (si no hay precio visible pon 0)
- categoryHint: elige la categoría más apropiada de la lista
- tags: máximo 3 etiquetas relevantes, array vacío si no aplica
- Si el menú está en otro idioma, traduce nombres y descripciones al español
- Solo JSON puro, sin explicaciones, sin bloques markdown`;

const IMAGE_PROMPT = `Analiza esta foto de menú de restaurante. Extrae TODOS los platos, bebidas y postres visibles.
Devuelve ÚNICAMENTE un JSON válido con este formato exacto:
${JSON_SCHEMA}
${RULES}`;

const TEXT_PROMPT = (menu: string) =>
  `Analiza el siguiente texto de un menú de restaurante. Extrae TODOS los platos, bebidas y postres.
Devuelve ÚNICAMENTE un JSON válido con este formato exacto:
${JSON_SCHEMA}
${RULES}

TEXTO DEL MENÚ:
${menu}`;

function parseGlmJson(raw: string): ScanResponse {
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed.products)) return parsed as ScanResponse;
    return { products: [] };
  } catch {
    throw new Error(`Respuesta no parseable: ${raw.slice(0, 200)}`);
  }
}

export async function POST(req: Request): Promise<Response> {
  let image = "";
  let menuText = "";
  try {
    const body = await req.json();
    image = body.image ?? "";
    menuText = body.text ?? "";
  } catch {
    return Response.json({ products: [], error: "Cuerpo inválido" } as ScanResponse, { status: 400 });
  }

  if (!image && !menuText) {
    return Response.json({ products: [], error: "Se requiere imagen o texto del menú" } as ScanResponse, { status: 400 });
  }

  const apiKey = process.env.GLM_API_KEY;
  const baseUrl = process.env.GLM_BASE_URL ?? "https://open.bigmodel.cn/api/paas/v4";
  const textModel = process.env.GLM_MODEL ?? "glm-4.5-air";
  const visionModel = process.env.GLM_VISION_MODEL ?? textModel;

  if (!apiKey) {
    return Response.json({ products: [], error: "GLM_API_KEY no configurada." } as ScanResponse);
  }

  // Modo texto: mensaje simple
  const messages = image
    ? [{ role: "user", content: [{ type: "image_url", image_url: { url: image } }, { type: "text", text: IMAGE_PROMPT }] }]
    : [{ role: "user", content: TEXT_PROMPT(menuText) }];

  const model = image ? visionModel : textModel;

  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, stream: false, temperature: 0.1, max_tokens: 4000, messages }),
    });
  } catch {
    return Response.json({ products: [], error: "No se pudo conectar con la IA" } as ScanResponse, { status: 503 });
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return Response.json(
      { products: [], error: `Error IA (${upstream.status}): ${detail.slice(0, 300)}` } as ScanResponse,
      { status: 502 }
    );
  }

  const data = await upstream.json();
  const raw: string = data.choices?.[0]?.message?.content ?? "";

  try {
    return Response.json(parseGlmJson(raw));
  } catch (e) {
    return Response.json(
      { products: [], error: String(e) } as ScanResponse,
      { status: 502 }
    );
  }
}
