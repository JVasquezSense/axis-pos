import type { Supplier } from "@/types";

export const SUPPLIERS: Supplier[] = [
  { id: "s1", name: "Frigorífico La 70", contact: "Mauricio Ríos", phone: "300 412 7788", email: "ventas@la70.co", category: "Carnes", nit: "900.112.334-1", active: true },
  { id: "s2", name: "Lácteos Andinos", contact: "Patricia Gómez", phone: "311 556 2210", email: "pedidos@lacteosandinos.co", category: "Lácteos", nit: "830.221.998-4", active: true },
  { id: "s3", name: "Plaza Mayorista", contact: "Hernán Díaz", phone: "320 778 1145", email: "hernan@plazamayorista.co", category: "Verduras", nit: "901.334.221-7", active: true },
  { id: "s4", name: "Panadería El Trigal", contact: "Lucía Mejía", phone: "315 220 6634", email: "eltrigal@email.com", category: "Panadería", nit: "800.556.112-9", active: true },
  { id: "s5", name: "Pescados del Pacífico", contact: "Andrés Mosquera", phone: "318 990 4521", email: "pacifico@email.com", category: "Pescados", nit: "901.778.223-3", active: false },
];
