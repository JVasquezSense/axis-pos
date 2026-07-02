export interface OnboardingStep {
  type: "intro" | "spotlight" | "outro";
  navKey?: string;
  title: string;
  description: string;
}

/** Copy general por módulo — independiente del rol, se filtra por lo que cada rol puede ver. */
const MODULE_COPY: Record<string, { title: string; description: string }> = {
  dashboard: { title: "Dashboard", description: "El pulso de tu restaurante: ventas del día, pedidos activos, ocupación de mesas y alertas, todo en una sola vista." },
  salon: { title: "Salón", description: "Mapa interactivo de tus mesas. Ábrelas, ciérralas, reserva o asigna mesero con un par de clics." },
  reservations: { title: "Reservaciones", description: "Agenda y confirma reservas para que ninguna mesa se pierda en horas pico." },
  orders: { title: "Toma de pedidos", description: "Registra pedidos con una interfaz pensada para tablet: modificadores, notas y resumen al instante." },
  kitchen: { title: "Cocina KDS", description: "Tablero en vivo para que cocina vea y actualice cada orden sin usar papel." },
  checkout: { title: "Caja", description: "Cobra con propina, descuentos y varios métodos de pago, y genera la factura." },
  shift: { title: "Cierre de turno", description: "Cuadra la caja y cierra el turno con el resumen de ventas y movimientos del día." },
  weborders: { title: "Pedidos web", description: "Recibe y verifica en vivo los pedidos que llegan desde tu página web." },
  menu: { title: "Menú & Recetas", description: "Administra tu carta, precios y las recetas con su costo real por plato." },
  inventory: { title: "Inventario", description: "Controla stock, mínimos y kardex para no quedarte sin insumos a mitad de servicio." },
  suppliers: { title: "Proveedores", description: "Registra proveedores y compras para saber de dónde sale cada insumo." },
  employees: { title: "Empleados", description: "Gestiona tu equipo, sus roles y accesos al sistema." },
  audit: { title: "Auditoría", description: "Revisa el historial de cambios importantes para tener trazabilidad total." },
  crm: { title: "Clientes", description: "Fideliza con niveles, puntos y el historial de cada cliente." },
  reports: { title: "Reportes", description: "Analiza rentabilidad, ventas por hora y tus productos más vendidos." },
  website: { title: "Página web", description: "Tu propia tienda online, sincronizada con el POS en tiempo real." },
  admin: { title: "Super Admin", description: "Panel para administrar todos los restaurantes de la plataforma." },
};

/** Arma el recorrido a partir de las claves de navegación visibles para el rol actual. */
export function buildOnboardingSteps(navKeys: string[]): OnboardingStep[] {
  return [
    {
      type: "intro",
      title: "¡Bienvenido a Axis POS!",
      description: "Te damos un recorrido rápido por los módulos principales para que empieces con el pie derecho. Toma menos de un minuto.",
    },
    ...navKeys
      .filter((key) => MODULE_COPY[key])
      .map((key) => ({ type: "spotlight" as const, navKey: key, ...MODULE_COPY[key] })),
    {
      type: "outro",
      title: "¡Listo para empezar!",
      description: "Puedes volver a ver este recorrido cuando quieras desde tu menú de usuario, arriba a la derecha.",
    },
  ];
}
