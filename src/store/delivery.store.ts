import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DeliveryStatus = "pending" | "assigned" | "picked_up" | "on_the_way" | "arrived" | "delivered" | "cancelled";

export const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  pending: "Pendiente",
  assigned: "Asignado",
  picked_up: "Recogido",
  on_the_way: "En camino",
  arrived: "En sitio",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export const DELIVERY_STATUS_COLOR: Record<DeliveryStatus, string> = {
  pending: "bg-gray-500/15 text-gray-600 border-gray-500/30",
  assigned: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  picked_up: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  on_the_way: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  arrived: "bg-violet-500/15 text-violet-600 border-violet-500/30",
  delivered: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  cancelled: "bg-red-500/15 text-red-600 border-red-500/30",
};

export interface DeliveryOrder {
  id: string;
  code: string;
  customerName: string;
  customerPhone: string;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  items: { name: string; quantity: number }[];
  total: number;
  tip: number;
  status: DeliveryStatus;
  driverId: string | null;
  driverName: string | null;
  createdAt: number;
  assignedAt: number | null;
  pickedUpAt: number | null;
  deliveredAt: number | null;
  notes: string;
  paymentMethod: string;
}

interface DeliveryState {
  orders: DeliveryOrder[];
  addOrder: (order: Omit<DeliveryOrder, "id" | "createdAt" | "assignedAt" | "pickedUpAt" | "deliveredAt">) => void;
  assignDriver: (orderId: string, driverId: string, driverName: string) => void;
  updateStatus: (orderId: string, status: DeliveryStatus) => void;
  removeOrder: (orderId: string) => void;
  seedDemo: () => void;
}

const DEMO_ORDERS: Omit<DeliveryOrder, "id">[] = [
  {
    code: "D-A1B2", customerName: "Carlos Gómez", customerPhone: "3101234567",
    address: "Cra 7 #45-12", neighborhood: "Chapinero", lat: 4.6340, lng: -74.0633,
    items: [{ name: "Hamburguesa doble", quantity: 2 }, { name: "Papas grandes", quantity: 1 }],
    total: 52000, tip: 5000, status: "assigned", driverId: "demo-driver-1", driverName: "Pedro Ruiz",
    createdAt: Date.now() - 25 * 60000, assignedAt: Date.now() - 20 * 60000, pickedUpAt: null, deliveredAt: null,
    notes: "Timbre no funciona, llamar al llegar", paymentMethod: "Efectivo",
  },
  {
    code: "D-C3D4", customerName: "María López", customerPhone: "3209876543",
    address: "Calle 80 #23-45 Apto 302", neighborhood: "Barrios Unidos", lat: 4.6680, lng: -74.0770,
    items: [{ name: "Pizza familiar", quantity: 1 }, { name: "Gaseosa 1.5L", quantity: 2 }],
    total: 45000, tip: 3000, status: "on_the_way", driverId: "demo-driver-1", driverName: "Pedro Ruiz",
    createdAt: Date.now() - 45 * 60000, assignedAt: Date.now() - 40 * 60000, pickedUpAt: Date.now() - 30 * 60000, deliveredAt: null,
    notes: "", paymentMethod: "Transferencia",
  },
  {
    code: "D-E5F6", customerName: "Andrés Martínez", customerPhone: "3156781234",
    address: "Av. 68 #12-30", neighborhood: "Kennedy", lat: 4.6151, lng: -74.1224,
    items: [{ name: "Bandeja paisa", quantity: 1 }, { name: "Jugo natural", quantity: 1 }],
    total: 28000, tip: 0, status: "pending", driverId: null, driverName: null,
    createdAt: Date.now() - 5 * 60000, assignedAt: null, pickedUpAt: null, deliveredAt: null,
    notes: "Sin cebolla", paymentMethod: "Datáfono",
  },
  {
    code: "D-G7H8", customerName: "Laura Sánchez", customerPhone: "3181112233",
    address: "Cra 15 #100-20", neighborhood: "Usaquén", lat: 4.6950, lng: -74.0335,
    items: [{ name: "Sushi roll x12", quantity: 1 }, { name: "Edamame", quantity: 1 }],
    total: 62000, tip: 8000, status: "delivered", driverId: "demo-driver-2", driverName: "Ana Torres",
    createdAt: Date.now() - 120 * 60000, assignedAt: Date.now() - 115 * 60000, pickedUpAt: Date.now() - 100 * 60000, deliveredAt: Date.now() - 80 * 60000,
    notes: "", paymentMethod: "Tarjeta",
  },
  {
    code: "D-I9J0", customerName: "Diego Herrera", customerPhone: "3004445566",
    address: "Calle 53 #15-67", neighborhood: "Galerías", lat: 4.6448, lng: -74.0676,
    items: [{ name: "Pollo asado", quantity: 1 }, { name: "Arroz con maduro", quantity: 2 }],
    total: 35000, tip: 4000, status: "arrived", driverId: "demo-driver-2", driverName: "Ana Torres",
    createdAt: Date.now() - 35 * 60000, assignedAt: Date.now() - 30 * 60000, pickedUpAt: Date.now() - 20 * 60000, deliveredAt: null,
    notes: "Conjunto cerrado, portería sur", paymentMethod: "Efectivo",
  },
];

export const useDeliveryStore = create<DeliveryState>()(
  persist(
    (set) => ({
      orders: [],

      addOrder: (order) => {
        const entry: DeliveryOrder = {
          ...order,
          id: `del-${Date.now().toString(36)}`,
          createdAt: Date.now(),
          assignedAt: null,
          pickedUpAt: null,
          deliveredAt: null,
        };
        set((s) => ({ orders: [entry, ...s.orders].slice(0, 500) }));
      },

      assignDriver: (orderId, driverId, driverName) =>
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === orderId
              ? { ...o, driverId, driverName, status: "assigned" as DeliveryStatus, assignedAt: Date.now() }
              : o
          ),
        })),

      updateStatus: (orderId, status) =>
        set((s) => ({
          orders: s.orders.map((o) => {
            if (o.id !== orderId) return o;
            const updates: Partial<DeliveryOrder> = { status };
            if (status === "picked_up") updates.pickedUpAt = Date.now();
            if (status === "delivered") updates.deliveredAt = Date.now();
            return { ...o, ...updates };
          }),
        })),

      removeOrder: (orderId) =>
        set((s) => ({ orders: s.orders.filter((o) => o.id !== orderId) })),

      seedDemo: () =>
        set((s) => {
          if (s.orders.length > 0) return s;
          return { orders: DEMO_ORDERS.map((o, i) => ({ ...o, id: `demo-del-${i}` })) };
        }),
    }),
    { name: "axis-deliveries" }
  )
);
