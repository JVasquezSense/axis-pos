import type { RestaurantTable } from "@/types";

const now = Date.now();
const minsAgo = (m: number) => new Date(now - m * 60000).toISOString();

export const TABLES: RestaurantTable[] = [
  { id: "t1", number: 1, capacity: 2, status: "available", zone: "Terraza", x: 12, y: 18, shape: "round" },
  { id: "t2", number: 2, capacity: 4, status: "occupied", zone: "Terraza", waiter: "Camila R.", guests: 3, seatedAt: minsAgo(42), orderTotal: 86700, x: 32, y: 18, shape: "square" },
  { id: "t3", number: 3, capacity: 4, status: "billing", zone: "Terraza", waiter: "Andrés M.", guests: 4, seatedAt: minsAgo(95), orderTotal: 128300, x: 52, y: 18, shape: "square" },
  { id: "t4", number: 4, capacity: 6, status: "reserved", zone: "Terraza", x: 74, y: 18, shape: "rect" },
  { id: "t5", number: 5, capacity: 2, status: "occupied", zone: "Salón principal", waiter: "Camila R.", guests: 2, seatedAt: minsAgo(15), orderTotal: 43800, x: 12, y: 48, shape: "round" },
  { id: "t6", number: 6, capacity: 4, status: "available", zone: "Salón principal", x: 32, y: 48, shape: "square" },
  { id: "t7", number: 7, capacity: 4, status: "occupied", zone: "Salón principal", waiter: "Andrés M.", guests: 4, seatedAt: minsAgo(68), orderTotal: 152400, x: 52, y: 48, shape: "square" },
  { id: "t8", number: 8, capacity: 8, status: "occupied", zone: "Salón principal", waiter: "Valentina G.", guests: 6, seatedAt: minsAgo(28), orderTotal: 214500, x: 74, y: 48, shape: "rect" },
  { id: "t9", number: 9, capacity: 2, status: "available", zone: "Barra", x: 12, y: 78, shape: "round" },
  { id: "t10", number: 10, capacity: 2, status: "billing", zone: "Barra", waiter: "Valentina G.", guests: 2, seatedAt: minsAgo(110), orderTotal: 67900, x: 32, y: 78, shape: "round" },
  { id: "t11", number: 11, capacity: 4, status: "reserved", zone: "Barra", x: 52, y: 78, shape: "square" },
  { id: "t12", number: 12, capacity: 6, status: "available", zone: "Barra", x: 74, y: 78, shape: "rect" },
];

export const ZONES = ["Todas", "Terraza", "Salón principal", "Barra"];
