/**
 * Catálogo de features configurables por plan. Las claves de sección coinciden
 * 1:1 con NAV_ITEMS (y con NAV_FEATURES del backend), de modo que activar o
 * desactivar una aquí oculta exactamente esa entrada del menú lateral.
 */
export interface FeatureDef {
  id: string;
  label: string;
  desc: string;
  /** Núcleo: siempre activo, no se puede apagar. */
  core?: boolean;
}

export const SECTION_FEATURES: FeatureDef[] = [
  { id: "dashboard", label: "Dashboard", desc: "KPIs y métricas del día", core: true },
  { id: "salon", label: "Salón", desc: "Mapa de mesas y estados", core: true },
  { id: "orders", label: "Pedidos", desc: "Toma de pedidos", core: true },
  { id: "kitchen", label: "Cocina KDS", desc: "Tablero de preparación", core: true },
  { id: "checkout", label: "Caja", desc: "Cobro y facturación", core: true },
  { id: "shift", label: "Cierre de turno", desc: "Arqueo y cierre" },
  { id: "history", label: "Historial ventas", desc: "Ventas archivadas" },
  { id: "shift-history", label: "Historial turnos", desc: "Cierres anteriores" },
  { id: "returns", label: "Devoluciones", desc: "Notas de crédito" },
  { id: "menu", label: "Menú & Recetas", desc: "Carta, fichas técnicas y costeo" },
  { id: "inventory", label: "Inventario", desc: "Insumos, kardex y conteos" },
  { id: "suppliers", label: "Proveedores", desc: "Compras y facturas" },
  { id: "crm", label: "Clientes (CRM)", desc: "Fidelización y puntos" },
  { id: "reports", label: "Reportes", desc: "Análisis ejecutivo" },
  { id: "employees", label: "Empleados", desc: "Equipo y roles" },
  { id: "reservations", label: "Reservaciones", desc: "Agenda de reservas" },
  { id: "audit", label: "Auditoría", desc: "Bitácora de acciones" },
  { id: "weborders", label: "Pedidos web", desc: "Feed de pedidos de la carta" },
  { id: "website", label: "Página web", desc: "Carta pública del restaurante" },
  { id: "delivery", label: "Mi ruta", desc: "Vista del domiciliario" },
  { id: "delivery-admin", label: "Domicilios", desc: "Gestión de entregas" },
];

export const CAPABILITY_FEATURES: FeatureDef[] = [
  { id: "qr", label: "QR por mesa", desc: "Pedidos desde la mesa escaneando" },
  { id: "whatsapp", label: "Chatbot WhatsApp", desc: "Pedidos y atención por WhatsApp" },
  { id: "ai", label: "Axis IA", desc: "Copiloto e importar carta con IA" },
];

export const ALL_FEATURES = [...SECTION_FEATURES, ...CAPABILITY_FEATURES];

export const PLAN_LABEL: Record<string, string> = {
  starter: "Básico",
  growth: "Pro",
  enterprise: "Enterprise",
};
