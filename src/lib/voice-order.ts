import type { Product } from "@/types";

/**
 * Emparejamiento de lo dictado con la carta real del restaurante.
 *
 * El modelo devuelve NOMBRES, nunca ids: así no puede inventarse un producto que
 * no existe. Resolver el nombre contra el catálogo es trabajo de aquí, y también
 * el plan B cuando no hay IA disponible (se interpreta la frase con reglas).
 */

/** Minúsculas sin tildes ni signos, para comparar "Mojito" con "mojíto,". */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const NUMBER_WORDS: Record<string, number> = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6,
  siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, quince: 15,
  veinte: 20, media: 0.5,
};

export function parseQuantity(word: string): number | null {
  const n = Number(word);
  if (Number.isFinite(n) && n > 0) return n;
  return NUMBER_WORDS[normalize(word)] ?? null;
}

/** Similitud 0..1 por bigramas (coeficiente de Sørensen–Dice). */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const bigrams = (s: string) => {
    const out = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      out.set(g, (out.get(g) ?? 0) + 1);
    }
    return out;
  };
  const ga = bigrams(a);
  const gb = bigrams(b);
  let hits = 0;
  let total = 0;
  ga.forEach((count, g) => {
    total += count;
    hits += Math.min(count, gb.get(g) ?? 0);
  });
  gb.forEach((count) => { total += count; });
  return total === 0 ? 0 : (2 * hits) / total;
}

export interface ProductMatch {
  product: Product;
  /** 1 = exacto; por debajo de 0.72 se considera dudoso y se pide confirmar. */
  score: number;
}

/**
 * Busca el producto de la carta que mejor corresponde a lo dictado. Prefiere
 * coincidencia exacta, luego "contiene", luego similitud por bigramas.
 */
export function matchProduct(spoken: string, products: Product[]): ProductMatch | null {
  const q = normalize(spoken);
  if (!q) return null;

  let best: ProductMatch | null = null;
  for (const product of products) {
    const name = normalize(product.name);
    let score: number;
    if (name === q) score = 1;
    else if (name.includes(q) || q.includes(name)) {
      // "mojito" dentro de "mojito extra premium": penaliza la diferencia de largo.
      const shorter = Math.min(name.length, q.length);
      const longer = Math.max(name.length, q.length);
      score = 0.8 + 0.15 * (shorter / longer);
    } else score = similarity(name, q);

    if (!best || score > best.score) best = { product, score };
  }
  return best && best.score >= 0.5 ? best : null;
}

/**
 * Candidatos ordenados de mejor a peor para lo dictado, para ofrecerlos como
 * «¿quisiste decir…?» cuando la transcripción no cuadra con ningún producto.
 * Sin umbral de descarte: es mejor proponer tres nombres que dejar al mesero
 * sin salida, y la decisión siempre la toma él.
 */
export function suggestProducts(spoken: string, products: Product[], limit = 3): Product[] {
  const q = normalize(spoken);
  if (!q) return [];
  const singular = singularize(spoken);
  return products
    .map((product) => {
      const name = normalize(product.name);
      const score = Math.max(similarity(name, q), similarity(name, singular));
      // Un pedazo del nombre dicho suelto ("martini") vale más que el parecido crudo.
      const partial = name.includes(q) || q.includes(name) ? 0.75 : 0;
      return { product, score: Math.max(score, partial) };
    })
    .filter((c) => c.score >= 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((c) => c.product);
}

/** Reemplazos vendibles para un producto agotado: lo más cercano de su categoría. */
export function suggestReplacements(product: Product, products: Product[], limit = 3): Product[] {
  const sameCategory = products.filter(
    (p) => p.available && p.id !== product.id && String(p.category) === String(product.category)
  );
  const pool = sameCategory.length > 0 ? sameCategory : products.filter((p) => p.available && p.id !== product.id);
  return pool
    .map((p) => ({ p, score: similarity(normalize(p.name), normalize(product.name)) + (p.popular ? 0.2 : 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((c) => c.p);
}

/** Variación del producto que mejor corresponde a lo dictado ("grande", "sin azúcar"). */
export function matchVariation(spoken: string | undefined, product: Product) {
  if (!spoken) return null;
  const variations = product.variations ?? [];
  if (variations.length === 0) return null;
  const q = normalize(spoken);
  let best: { id: string; name: string; priceDelta: number; score: number } | null = null;
  for (const v of variations) {
    const score = normalize(v.name) === q ? 1 : similarity(normalize(v.name), q);
    if (!best || score > best.score) best = { ...v, score };
  }
  return best && best.score >= 0.6 ? best : null;
}

export interface SpokenLine {
  /** Lo que se entendió que es el producto, tal cual lo dijo el mesero. */
  spoken: string;
  quantity: number;
  notes?: string;
  variation?: string;
  /** true = el mesero pidió quitarlo del pedido. */
  remove?: boolean;
}

const REMOVE_HINTS = ["quita", "quitar", "saca", "sacar", "elimina", "borra", "cancela", "sin el", "sin la"];
const NOTE_SPLIT = /\b(sin|con|extra|poco|mucho|bien|termino|punto|aparte|para llevar)\b/;

/**
 * Plan B sin IA: parte la frase por conectores y saca cantidad + nombre + notas.
 * Reconoce lo básico ("dos mojitos sin hielo y un teriyaki thai"); las frases
 * complicadas las resuelve el modelo cuando hay clave configurada.
 */
export function parseTranscriptLocally(transcript: string): { lines: SpokenLine[]; table: number | null } {
  const clean = normalize(transcript);
  const tableMatch = clean.match(/mesa\s+(\d+|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)/);
  const table = tableMatch ? parseQuantity(tableMatch[1]) : null;

  const withoutTable = clean.replace(/(para\s+la\s+)?mesa\s+\S+/g, " ");
  const chunks = withoutTable.split(/\s+(?:y|mas|tambien|luego|despues)\s+/).filter(Boolean);

  const lines: SpokenLine[] = [];
  for (const chunk of chunks) {
    const words = chunk.trim().split(" ");
    if (words.length === 0) continue;

    const remove = REMOVE_HINTS.some((h) => chunk.startsWith(h));
    let rest = words;
    if (remove) rest = words.slice(1);

    let quantity = 1;
    const asNumber = parseQuantity(rest[0] ?? "");
    if (asNumber !== null) {
      quantity = asNumber;
      rest = rest.slice(1);
    }

    const phrase = rest.join(" ");
    const cut = phrase.search(NOTE_SPLIT);
    const spoken = (cut > 0 ? phrase.slice(0, cut) : phrase).trim();
    const notes = cut > 0 ? phrase.slice(cut).trim() : undefined;
    if (!spoken) continue;

    lines.push({ spoken, quantity, notes, remove: remove || undefined });
  }
  return { lines, table: table && table >= 1 ? table : null };
}

/** Plural simple del español para buscar "mojitos" como "mojito". */
export function singularize(text: string): string {
  const t = normalize(text);
  if (t.endsWith("ces")) return `${t.slice(0, -3)}z`;
  if (t.endsWith("es") && t.length > 4) return t.slice(0, -2);
  if (t.endsWith("s") && t.length > 3) return t.slice(0, -1);
  return t;
}
