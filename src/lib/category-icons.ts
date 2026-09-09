/**
 * Iconos disponibles para las categorías de la carta.
 *
 * Eran diez, y ninguna carta real cabe en diez: un bar necesita cervezas,
 * cócteles y cigarrillos; una panadería, pan y postres. Cada uno lleva su
 * nombre en español para poder buscarlo — el nombre del icono es inglés y
 * nadie va a escribir "Drumstick" para encontrar el pollo.
 *
 * Los nombres son de lucide-react. Si alguno dejara de existir, `<Icon>` cae a
 * un círculo en vez de romper la pantalla.
 */

export interface CategoryIcon {
  /** Nombre del icono en lucide. */
  name: string;
  /** Etiqueta y sinónimos por los que se puede buscar. */
  label: string;
  group: string;
}

export const CATEGORY_ICONS: CategoryIcon[] = [
  // Comida
  { name: "Utensils", label: "Platos, comida, general", group: "Comida" },
  { name: "UtensilsCrossed", label: "Cocina, menú", group: "Comida" },
  { name: "Salad", label: "Ensaladas, verduras, saludable", group: "Comida" },
  { name: "Soup", label: "Sopas, caldos, cremas", group: "Comida" },
  { name: "Beef", label: "Carnes, res, parrilla", group: "Comida" },
  { name: "Ham", label: "Jamón, cerdo, embutidos", group: "Comida" },
  { name: "Drumstick", label: "Pollo, alitas", group: "Comida" },
  { name: "Fish", label: "Pescados, mariscos", group: "Comida" },
  { name: "Shell", label: "Mariscos, conchas", group: "Comida" },
  { name: "Egg", label: "Huevos, desayuno", group: "Comida" },
  { name: "Sandwich", label: "Sándwiches, hamburguesas", group: "Comida" },
  { name: "Pizza", label: "Pizzas", group: "Comida" },
  { name: "Croissant", label: "Panadería, pan, bollería", group: "Comida" },
  { name: "Wheat", label: "Pan, trigo, cereales", group: "Comida" },
  { name: "Popcorn", label: "Snacks, picar, crispetas", group: "Comida" },
  { name: "Bean", label: "Granos, frijoles, legumbres", group: "Comida" },
  { name: "Nut", label: "Frutos secos, nueces", group: "Comida" },
  { name: "CookingPot", label: "Guisos, ollas, del día", group: "Comida" },
  { name: "ChefHat", label: "Especialidades del chef", group: "Comida" },
  { name: "Flame", label: "Parrilla, asados, picante", group: "Comida" },

  // Bebidas
  { name: "CupSoda", label: "Gaseosas, refrescos, bebidas", group: "Bebidas" },
  { name: "GlassWater", label: "Agua, jugos naturales", group: "Bebidas" },
  { name: "Coffee", label: "Café, tinto, calientes", group: "Bebidas" },
  { name: "Milk", label: "Leche, malteadas, lácteos", group: "Bebidas" },
  { name: "Beer", label: "Cervezas", group: "Bebidas" },
  { name: "Wine", label: "Vinos", group: "Bebidas" },
  { name: "Martini", label: "Cócteles, tragos, licores", group: "Bebidas" },
  { name: "Droplet", label: "Zumos, líquidos", group: "Bebidas" },

  // Dulces
  { name: "IceCreamCone", label: "Helados, conos", group: "Dulces" },
  { name: "IceCreamBowl", label: "Helados, copas", group: "Dulces" },
  { name: "Cake", label: "Tortas, cumpleaños", group: "Dulces" },
  { name: "CakeSlice", label: "Porciones de torta, postres", group: "Dulces" },
  { name: "Dessert", label: "Postres", group: "Dulces" },
  { name: "Cookie", label: "Galletas", group: "Dulces" },
  { name: "Donut", label: "Donas", group: "Dulces" },
  { name: "Candy", label: "Dulces, confitería", group: "Dulces" },

  // Frutas
  { name: "Apple", label: "Frutas, manzana", group: "Frutas" },
  { name: "Banana", label: "Banano, plátano", group: "Frutas" },
  { name: "Cherry", label: "Cerezas, frutos rojos", group: "Frutas" },
  { name: "Grape", label: "Uvas", group: "Frutas" },
  { name: "Citrus", label: "Cítricos, limón, naranja", group: "Frutas" },
  { name: "Carrot", label: "Verduras, zanahoria", group: "Frutas" },
  { name: "Leaf", label: "Vegetariano, hierbas", group: "Frutas" },
  { name: "Vegan", label: "Vegano, plant based", group: "Frutas" },

  // Otros
  { name: "Cigarette", label: "Cigarrillos, tabaco", group: "Otros" },
  { name: "Package", label: "Combos, paquetes", group: "Otros" },
  { name: "ShoppingBag", label: "Para llevar", group: "Otros" },
  { name: "Bike", label: "Domicilios, reparto", group: "Otros" },
  { name: "Truck", label: "Mayoreo, distribución", group: "Otros" },
  { name: "PartyPopper", label: "Promociones, fiesta, eventos", group: "Otros" },
  { name: "Gift", label: "Cortesías, regalos", group: "Otros" },
  { name: "Percent", label: "Descuentos, ofertas", group: "Otros" },
  { name: "Star", label: "Destacados, favoritos", group: "Otros" },
  { name: "Crown", label: "Premium, especiales", group: "Otros" },
  { name: "Heart", label: "Los más pedidos", group: "Otros" },
  { name: "Baby", label: "Menú infantil, niños", group: "Otros" },
  { name: "Sun", label: "Desayunos, mañana", group: "Otros" },
  { name: "Moon", label: "Cena, noche", group: "Otros" },
  { name: "Snowflake", label: "Fríos, congelados", group: "Otros" },
  { name: "Clock", label: "Del día, temporada", group: "Otros" },
  { name: "Tag", label: "Etiqueta, genérico", group: "Otros" },
];

/** Sin tildes ni mayúsculas, para que "cafe" encuentre "Café". */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .trim();
}

export function searchCategoryIcons(query: string): CategoryIcon[] {
  const q = normalize(query);
  if (!q) return CATEGORY_ICONS;
  return CATEGORY_ICONS.filter(
    (i) => normalize(i.label).includes(q) || normalize(i.name).includes(q) || normalize(i.group).includes(q)
  );
}
