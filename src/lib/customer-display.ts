/**
 * Pantalla del cliente.
 *
 * La caja abre una segunda ventana (/display) en el monitor que mira el
 * cliente, y le publica lo que va a cobrar: productos, totales y estado. Las
 * dos ventanas son del mismo navegador, así que hablan por BroadcastChannel
 * sin pasar por el servidor. Lo último publicado se deja también en
 * localStorage para que una pantalla recién abierta arranque sincronizada y
 * como respaldo donde BroadcastChannel no exista.
 */

export type DisplayPhase = "idle" | "billing" | "paid";

export interface DisplayLine {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  notes?: string;
}

export interface DisplayState {
  phase: DisplayPhase;
  lines: DisplayLine[];
  subtotal: number;
  taxes: { name: string; amount: number }[];
  tip: number;
  discount: number;
  total: number;
  /** Cobrado hasta ahora (cuenta dividida); 0 = todo pendiente. */
  collected: number;
  table: number | null;
  origin: string;
  waiter: string;
  invoiceNumber?: string;
  method?: string;
  updatedAt: number;
}

const CHANNEL = "axis-customer-display";
const STORAGE_KEY = "axis-customer-display";

export const IDLE_STATE: DisplayState = {
  phase: "idle", lines: [], subtotal: 0, taxes: [], tip: 0, discount: 0, total: 0,
  collected: 0, table: null, origin: "", waiter: "", updatedAt: 0,
};

let channel: BroadcastChannel | null = null;
function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  if (!channel) channel = new BroadcastChannel(CHANNEL);
  return channel;
}

export function publishDisplay(state: Omit<DisplayState, "updatedAt">): void {
  if (typeof window === "undefined") return;
  const full: DisplayState = { ...state, updatedAt: Date.now() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
  } catch { /* almacenamiento bloqueado: el canal sigue funcionando */ }
  getChannel()?.postMessage(full);
}

export function readDisplay(): DisplayState {
  if (typeof window === "undefined") return IDLE_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...IDLE_STATE, ...(JSON.parse(raw) as DisplayState) } : IDLE_STATE;
  } catch {
    return IDLE_STATE;
  }
}

export function subscribeDisplay(onState: (s: DisplayState) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const ch = getChannel();
  const onMessage = (e: MessageEvent<DisplayState>) => onState(e.data);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try { onState(JSON.parse(e.newValue) as DisplayState); } catch { /* ignorar */ }
    }
  };
  ch?.addEventListener("message", onMessage);
  window.addEventListener("storage", onStorage);
  return () => {
    ch?.removeEventListener("message", onMessage);
    window.removeEventListener("storage", onStorage);
  };
}

/** Abre (o trae al frente) la ventana de la pantalla del cliente. */
export function openDisplayWindow(): void {
  if (typeof window === "undefined") return;
  // Ventana propia y sin barra de herramientas: se arrastra al segundo monitor
  // y se pone a pantalla completa con F11.
  window.open("/display", "axis-customer-display", "popup=yes,width=1024,height=768");
}
