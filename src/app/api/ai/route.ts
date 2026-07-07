/**
 * Axis IA — proxy server-side a GLM-4.5 (Zhipu / Z.ai).
 * La API key vive solo en el servidor (GLM_API_KEY). El frontend nunca la ve.
 * Devuelve la respuesta como stream de texto plano (UX de escritura en vivo).
 */
export const runtime = "nodejs";

type Mode = "chat" | "pricing" | "shift" | "inventory" | "waiter" | "menu_eng" | "reservations";

const SYSTEM_BASE = `Eres Axis IA, copiloto de restaurante integrado al POS Axis.

REGLAS:
- Responde SIEMPRE en español, breve, concreto y accionable.
- Moneda COP. Usa SOLO datos provistos; si faltan, indícalo.
- No inventes cifras. Sé directo como gerente experimentado.
- Usa **negritas** para cifras clave y nombres de platos/insumos.
- Usa viñetas (- ) para listas. Máximo 6-8 viñetas.
- Cuando sugieras ir a una sección, usa la ruta exacta entre corchetes: [Ver en /ruta]
- Cierra SIEMPRE con 1 acción concreta que el usuario pueda hacer YA.

RUTAS DEL SISTEMA (úsalas exactas):
/dashboard=Dashboard, /salon=Salón/mesas, /orders=Pedidos, /kitchen=Cocina KDS,
/checkout=Caja, /shift=Cierre de turno, /web-orders=Pedidos web,
/menu=Menú & Recetas (productos y fichas técnicas),
/inventory=Inventario, /suppliers=Proveedores (aquí van TODAS las compras, botón 'Registrar compra'),
/employees=Empleados, /crm=Clientes, /reports=Reportes, /website=Página web.
NO existe /compras, /purchases, /cocinas ni /stations — compras van en /suppliers.
Estaciones de cocina (Parrilla, Freidora, Fríos, Barra, Pastelería) son FIJAS.

EJEMPLO DE RESPUESTA (usa este formato):
### Resumen del turno
- **Ventas totales:** $850.000 en **12 pedidos**
- **Ticket promedio:** $70.833
- **Método dominante:** Efectivo (65%)
- **Mejor mesero:** Carlos — $320k en ventas, $45k en propinas
- ⚠️ **Alerta:** Queso cheddar en nivel crítico (1.8kg)

👉 Registra la compra de queso en [Ver en /suppliers] antes del servicio de mañana.

ANOMALÍAS: Si recibes un bloque "=== ANOMALÍAS DETECTADAS ===" en los datos, SIEMPRE menciona las más relevantes:
- [inventory] Insumos sin consumo o con costo desactualizado → posible descuadre, recomendar auditoría en [Ver en /inventory]
- [employee] Empleados activos sin ventas → verificar asistencia en [Ver en /employees]
- [supplier] Proveedores con sobreprecio → recomendar renegociación en [Ver en /suppliers]
Prioriza anomalías críticas y de warning. Las de tipo "info" menciónalas solo si el usuario pregunta.`;

const MODE_PROMPT: Record<Mode, string> = {
  chat:
    "Responde la pregunta del usuario con base en el contexto del negocio. " +
    "Usa **negritas** para datos clave. Si la pregunta implica una sección del sistema, " +
    "incluye [Ver en /ruta] al final. Máximo 4-6 líneas.",

  pricing:
    "Actúa como 'doctor de precios'. Formato:\n" +
    "### Diagnóstico de precios\n" +
    "- **NombrePlato** — food cost **X%** (objetivo 30%). Precio actual $X → sugerido **$Y** (+Z% margen)\n" +
    "Máximo 5 platos problemáticos. Cierra con acción concreta y [Ver en /menu].",

  shift:
    "Escribe resumen ejecutivo del turno. Formato:\n" +
    "### Resumen del turno\n" +
    "- **Ventas totales:** $X en **N pedidos**\n" +
    "- **Ticket promedio:** $X\n" +
    "- **Método dominante:** X (Y%)\n" +
    "- **Mejor mesero:** Nombre — $Xk ventas, $Xk propinas\n" +
    "- ⚠️ **Alerta:** (inventario crítico o food cost alto)\n" +
    "Cierra con 1 acción concreta y la ruta relevante [Ver en /ruta].",

  inventory:
    "Analiza inventario con formato:\n" +
    "### Estado del inventario\n" +
    "- 🔴 **Insumo** — **Xkg** restantes, se agota en **Y días**. Proveedor: Z\n" +
    "- 🟡 **Insumo** — nivel bajo\n" +
    "Máximo 6 insumos urgentes. Cierra con: comprar X en [Ver en /suppliers].",

  waiter:
    "Analiza meseros con formato:\n" +
    "### Ranking de meseros\n" +
    "- 🥇 **Nombre** — ventas **$Xk**, propinas **$Xk**, N mesas\n" +
    "- 🥈 ...\n" +
    "Si todos son 'Sin asignar', indica que deben asignar meseros en [Ver en /checkout]. " +
    "Máximo 5 meseros. Destaca al mejor y si alguno necesita atención.",

  menu_eng:
    "Aplica ingeniería de menú (matriz BCG). Formato:\n" +
    "### Ingeniería de menú\n" +
    "- ⭐ **Estrellas** (promover): NombrePlato — margen **$Xk**, food cost **X%**\n" +
    "- 🐄 **Vacas** (mantener): ...\n" +
    "- ❓ **Puzzles** (ajustar precio): ...\n" +
    "- 🐕 **Perros** (evaluar retiro): ...\n" +
    "Máximo 2 platos por cuadrante. Cierra con acción concreta y [Ver en /menu].",

  reservations:
    "Analiza reservaciones con formato:\n" +
    "### Briefing de reservaciones\n" +
    "- **Hoy:** N reservaciones, X comensales esperados\n" +
    "- **Hora pico:** HH:MM (N mesas comprometidas)\n" +
    "- ⚠️ Pendientes de confirmar: N\n" +
    "Cierra con recomendación operativa y [Ver en /salon].",
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
  let body: { mode?: Mode; message?: string; context?: string; history?: { role: string; content: string }[] } = {};
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
        max_tokens: 1200,
        thinking: { type: "disabled" },
        messages: [
          { role: "system", content: SYSTEM_BASE },
          ...(body.history ?? []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
          { role: "user" as const, content: userContent },
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
