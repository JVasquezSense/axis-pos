import type { Category, Product, ModifierGroup } from "@/types";

export const CATEGORIES: Category[] = [
  { id: "entradas", name: "Entradas", icon: "Salad", count: 4 },
  { id: "hamburguesas", name: "Hamburguesas", icon: "Beef", count: 5 },
  { id: "carnes", name: "Carnes", icon: "Drumstick", count: 4 },
  { id: "bebidas", name: "Bebidas", icon: "CupSoda", count: 5 },
  { id: "postres", name: "Postres", icon: "IceCream", count: 3 },
];

const cookingPoint: ModifierGroup = {
  id: "term",
  name: "Término de cocción",
  required: true,
  multiple: false,
  options: [
    { id: "t1", name: "Tres cuartos", price: 0 },
    { id: "t2", name: "Término medio", price: 0 },
    { id: "t3", name: "Bien cocido", price: 0 },
  ],
};

const extras: ModifierGroup = {
  id: "extras",
  name: "Adiciones",
  required: false,
  multiple: true,
  options: [
    { id: "e1", name: "Tocineta extra", price: 4500 },
    { id: "e2", name: "Queso cheddar", price: 3500 },
    { id: "e3", name: "Huevo frito", price: 3000 },
    { id: "e4", name: "Aguacate", price: 4000 },
  ],
};

const drinkSize: ModifierGroup = {
  id: "size",
  name: "Tamaño",
  required: true,
  multiple: false,
  options: [
    { id: "s1", name: "Pequeño", price: 0 },
    { id: "s2", name: "Mediano", price: 2000 },
    { id: "s3", name: "Grande", price: 4000 },
  ],
};

export const PRODUCTS: Product[] = [
  // Entradas
  { id: "p1", name: "Tabla de Nachos", description: "Nachos con guacamole, pico de gallo y queso fundido", price: 24900, category: "entradas", image: "🧀", tags: ["Compartir", "Vegetariano"], available: true, prepMinutes: 8, popular: true },
  { id: "p2", name: "Alitas BBQ", description: "8 alitas bañadas en salsa BBQ ahumada", price: 28900, category: "entradas", image: "🍗", tags: ["Picante"], available: true, prepMinutes: 12, modifiers: [extras] },
  { id: "p3", name: "Croquetas de Jamón", description: "6 croquetas cremosas con alioli", price: 19900, category: "entradas", image: "🥐", tags: ["Clásico"], available: true, prepMinutes: 10 },
  { id: "p4", name: "Ceviche de Camarón", description: "Camarón fresco, limón, cilantro y aguacate", price: 32900, category: "entradas", image: "🦐", tags: ["Fresco", "Del chef"], available: false, prepMinutes: 9 },

  // Hamburguesas
  { id: "p5", name: "Axis Classic", description: "Carne 200g, cheddar, lechuga, tomate y salsa de la casa", price: 27900, category: "hamburguesas", image: "🍔", tags: ["Best seller"], available: true, prepMinutes: 14, popular: true, modifiers: [cookingPoint, extras] },
  { id: "p6", name: "Doble Bacon", description: "Doble carne, doble tocineta y queso suizo", price: 36900, category: "hamburguesas", image: "🥓", tags: ["Doble", "Premium"], available: true, prepMinutes: 16, modifiers: [cookingPoint, extras] },
  { id: "p7", name: "Crispy Chicken", description: "Pollo crocante, coleslaw y salsa picante", price: 26900, category: "hamburguesas", image: "🍗", tags: ["Crujiente"], available: true, prepMinutes: 13, modifiers: [extras] },
  { id: "p8", name: "Veggie Deluxe", description: "Hamburguesa de garbanzo, hummus y vegetales asados", price: 25900, category: "hamburguesas", image: "🥬", tags: ["Vegetariano", "Saludable"], available: true, prepMinutes: 12 },
  { id: "p9", name: "Smokey BBQ", description: "Carne, aros de cebolla, cheddar y BBQ", price: 31900, category: "hamburguesas", image: "🧅", tags: ["Ahumada"], available: true, prepMinutes: 15, modifiers: [cookingPoint, extras] },

  // Carnes
  { id: "p10", name: "Bife de Chorizo", description: "Corte argentino 300g con chimichurri", price: 58900, category: "carnes", image: "🥩", tags: ["Premium", "Parrilla"], available: true, prepMinutes: 22, popular: true, modifiers: [cookingPoint] },
  { id: "p11", name: "Costillas BBQ", description: "Costillar de cerdo glaseado, cocción lenta", price: 49900, category: "carnes", image: "🍖", tags: ["Slow cook"], available: true, prepMinutes: 25 },
  { id: "p12", name: "Pechuga Grillé", description: "Pechuga de pollo, vegetales y puré rústico", price: 34900, category: "carnes", image: "🍗", tags: ["Saludable"], available: true, prepMinutes: 18 },
  { id: "p13", name: "Salmón a la Plancha", description: "Salmón, espárragos y mantequilla de limón", price: 54900, category: "carnes", image: "🐟", tags: ["Del mar", "Premium"], available: true, prepMinutes: 16 },

  // Bebidas
  { id: "p14", name: "Limonada de Coco", description: "Refrescante limonada cremosa", price: 12900, category: "bebidas", image: "🥥", tags: ["Sin alcohol"], available: true, prepMinutes: 4, popular: true, modifiers: [drinkSize] },
  { id: "p15", name: "Cerveza Artesanal", description: "IPA local de barril 350ml", price: 14900, category: "bebidas", image: "🍺", tags: ["Artesanal"], available: true, prepMinutes: 2 },
  { id: "p16", name: "Mojito Clásico", description: "Ron, hierbabuena, limón y soda", price: 18900, category: "bebidas", image: "🍹", tags: ["Coctel"], available: true, prepMinutes: 5 },
  { id: "p17", name: "Jugo Natural", description: "Mango, maracuyá o fresa", price: 9900, category: "bebidas", image: "🧃", tags: ["Natural"], available: true, prepMinutes: 3, modifiers: [drinkSize] },
  { id: "p18", name: "Gaseosa", description: "Línea Coca-Cola 400ml", price: 6900, category: "bebidas", image: "🥤", tags: [], available: true, prepMinutes: 1 },

  // Postres
  { id: "p19", name: "Brownie con Helado", description: "Brownie tibio, helado de vainilla y caramelo", price: 16900, category: "postres", image: "🍫", tags: ["Caliente"], available: true, prepMinutes: 7, popular: true },
  { id: "p20", name: "Cheesecake de Maracuyá", description: "Tarta cremosa con coulis de maracuyá", price: 15900, category: "postres", image: "🍰", tags: ["Del chef"], available: true, prepMinutes: 4 },
  { id: "p21", name: "Volcán de Chocolate", description: "Bizcocho con centro líquido de chocolate", price: 17900, category: "postres", image: "🌋", tags: ["Premium"], available: true, prepMinutes: 9 },
];

export const PRODUCT_GRADIENTS: Record<string, string> = {
  entradas: "from-amber-400/20 to-orange-500/20",
  hamburguesas: "from-orange-400/20 to-red-500/20",
  carnes: "from-rose-400/20 to-red-600/20",
  bebidas: "from-sky-400/20 to-cyan-500/20",
  postres: "from-fuchsia-400/20 to-purple-500/20",
};
