/**
 * Axis IA — proxy server-side a GLM-4.5 (Zhipu / Z.ai).
 * La API key vive solo en el servidor (GLM_API_KEY). El frontend nunca la ve.
 * Devuelve la respuesta como stream de texto plano (UX de escritura en vivo).
 */
export const runtime = "nodejs";

type Mode = "chat" | "pricing" | "shift" | "inventory";

const SYSTEM_BASE =
  "Eres Axis IA, copiloto de un restaurante (POS Axis). Responde SIEMPRE en español, breve, concreto y accionable. Moneda COP. Usa solo los datos provistos; si faltan, dilo. No inventes cifras.";

const MODE_PROMPT: Record<Mode, string> = {
  chat: "Responde la pregunta del usuario con base en el contexto.",
  pricing:
    "Actúa como 'doctor de precios'. Señala los platos con food cost por encima del 30% y recomienda el nuevo precio (usa el sugerido). Máximo 5 recomendaciones en viñetas, cada una de una línea.",
  shift:
    "Escribe un resumen de turno ejecutivo para el dueño (3-4 frases): ventas, ticket promedio, lo más vendido y 1-2 alertas. Tono claro y directo.",
  inventory:
    "Predice qué insumos se agotarán pronto (menos días restantes), explica el riesgo y sugiere qué comprar y a qué proveedor. Máximo 5 viñetas de una línea.",
};

function fallback(mode: Mode): string {
  return (
    "⚠️ Axis IA en modo demo (configura GLM_API_KEY para respuestas con IA real).\n\n" +
    (mode === "pricing"
      ? "Revisa los platos con food cost > 30% y ajústalos al precio sugerido."
      : mode === "shift"
        ? "Resumen no disponible sin IA: revisa Ventas del día, ticket promedio y alertas en el dashboard."
        : mode === "inventory"
          ? "Revisa Inventario → Kardex: los insumos con menos días restantes son prioridad de compra."
          : "Pregúntame sobre ventas, precios o inventario una vez configurada la clave.")
  );
}

export async function POST(req: Request) {
  let body: { mode?: Mode; message?: string; context?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* noop */
  }
  const mode: Mode = body.mode ?? "chat";
  const apiKey = process.env.GLM_API_KEY;
  const baseUrl = process.env.GLM_BASE_URL ?? "https://open.bigmodel.cn/api/paas/v4";
  const model = process.env.GLM_MODEL ?? "glm-4.5-air";

  const userContent = `${body.context ?? ""}\n\nTarea: ${MODE_PROMPT[mode]}${body.message ? `\nPregunta: ${body.message}` : ""}`.trim();

  if (!apiKey) {
    return new Response(fallback(mode), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        stream: true,
        temperature: 0.5,
        max_tokens: 600,
        thinking: { type: "disabled" }, // sin cadena de razonamiento → menos tokens
        messages: [
          { role: "system", content: SYSTEM_BASE },
          { role: "user", content: userContent },
        ],
      }),
    });
  } catch {
    return new Response("No se pudo conectar con la IA.\n\n" + fallback(mode), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    return new Response(`Error de la IA (${upstream.status}). ${detail.slice(0, 200)}`, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // Transforma el SSE (formato OpenAI) en texto plano: solo el contenido final.
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const reader = upstream.body.getReader();
  let buffer = "";

  const stream = new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith("data:")) continue;
        const data = t.slice(5).trim();
        if (data === "[DONE]") {
          controller.close();
          return;
        }
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) controller.enqueue(encoder.encode(delta));
        } catch {
          /* fragmento incompleto, se ignora */
        }
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  });
}
