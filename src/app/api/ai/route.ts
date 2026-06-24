/**
 * Axis IA — proxy server-side a GLM-4.5 (Zhipu / Z.ai).
 * La API key vive solo en el servidor (GLM_API_KEY). El frontend nunca la ve.
 * Devuelve la respuesta como stream de texto plano (UX de escritura en vivo).
 */
export const runtime = "nodejs";

type Mode = "chat" | "pricing" | "shift" | "inventory" | "waiter" | "menu_eng" | "reservations";

const SYSTEM_BASE =
  "Eres Axis IA, copiloto de restaurante integrado al POS Axis. " +
  "Responde SIEMPRE en español, de forma breve, concreta y accionable. " +
  "Moneda COP. Usa solo los datos provistos; si faltan, indícalo. " +
  "No inventes cifras. Sé directo como un gerente experimentado de restaurantes.";

const MODE_PROMPT: Record<Mode, string> = {
  chat: "Responde la pregunta del usuario con base en el contexto del negocio.",

  pricing:
    "Actúa como 'doctor de precios'. Identifica los platos con food cost por encima del 30%, " +
    "explica brevemente por qué son problemáticos y recomienda el precio ajustado. " +
    "Máximo 5 recomendaciones en viñetas de una línea. Incluye el impacto en margen.",

  shift:
    "Escribe un resumen ejecutivo del turno para el dueño (4-5 frases): " +
    "total de ventas, ticket promedio, método de pago dominante, mesero destacado si hay datos, " +
    "y 1-2 alertas operativas (inventario crítico, food cost alto, etc.). Tono directo y claro.",

  inventory:
    "Analiza el inventario: identifica los insumos que se agotarán primero (menos días restantes), " +
    "calcula el riesgo operativo, sugiere qué comprar urgente y a qué proveedor. " +
    "Luego menciona brevemente los proveedores activos disponibles. Máximo 6 viñetas de una línea.",

  waiter:
    "Analiza el desempeño de los meseros en este turno: " +
    "quién generó más ventas, quién obtuvo más propinas, cuántas mesas atendió cada uno. " +
    "Destaca al mejor mesero y señala si alguno necesita atención. " +
    "Si todos dicen 'Sin asignar', indica que el sistema necesita registrar meseros en caja. " +
    "Máximo 5 viñetas de una línea.",

  menu_eng:
    "Aplica ingeniería de menú usando la matriz BCG (popularidad × margen): " +
    "Explica brevemente cada cuadrante, luego da recomendaciones concretas: " +
    "qué platos promover, cuáles ajustar en precio, cuáles retirar. " +
    "Sé específico con nombres de platos. Máximo 6 viñetas accionables.",

  reservations:
    "Analiza las reservaciones: resume el día de hoy (hora pico, total comensales esperados, mesas comprometidas), " +
    "menciona reservaciones pendientes de confirmar si las hay, " +
    "y da 1-2 recomendaciones operativas para preparar el servicio. " +
    "Si no hay reservaciones, sugiere cómo implementar el sistema.",
};

function fallback(mode: Mode): string {
  const msgs: Record<Mode, string> = {
    pricing: "Revisa los platos con food cost > 30% en Menú & Recetas y ajústalos al precio sugerido.",
    shift: "Sin IA: revisa Ventas del día, ticket promedio y alertas en el dashboard.",
    inventory: "Revisa Inventario → Kardex: los insumos con menos días restantes son prioridad de compra.",
    waiter: "Ve a Cierre de turno para ver el ranking de propinas por mesero.",
    menu_eng: "Sin IA: en Menú & Recetas filtra por food cost para identificar platos problemáticos.",
    reservations: "Ve a Reservaciones para ver el listado del día.",
    chat: "Pregúntame sobre ventas, precios, inventario o meseros una vez configurada la clave.",
  };
  return `⚠️ Axis IA en modo demo (configura GLM_API_KEY para respuestas reales).\n\n${msgs[mode]}`;
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

  const userContent = [
    body.context ? `--- DATOS DEL NEGOCIO ---\n${body.context}\n--- FIN DATOS ---` : "",
    `Tarea: ${MODE_PROMPT[mode]}`,
    body.message ? `Pregunta del usuario: ${body.message}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

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
        temperature: 0.4,
        max_tokens: 800,
        thinking: { type: "disabled" },
        messages: [
          { role: "system", content: SYSTEM_BASE },
          { role: "user", content: userContent },
        ],
      }),
    });
  } catch {
    return new Response("No se pudo conectar con la IA.\n\n" + fallback(mode), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    return new Response(`Error de la IA (${upstream.status}). ${detail.slice(0, 200)}`, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

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
          /* fragmento incompleto */
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
