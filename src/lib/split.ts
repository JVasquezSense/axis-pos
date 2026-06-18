/**
 * Reparte `total` (entero, en pesos) en `weights.length` montos enteros que
 * suman EXACTAMENTE `total`. El sobrante de redondeo se asigna a las posiciones
 * con mayor fracción. Usado por la división de cuenta (por personas o por ítem).
 */
export function distribute(total: number, weights: number[]): number[] {
  if (weights.length === 0) return [];
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const raw = weights.map((w) => (total * w) / sum);
  const floored = raw.map(Math.floor);
  let rem = total - floored.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, f: r - Math.floor(r) })).sort((a, b) => b.f - a.f);
  for (let k = 0; rem > 0 && order.length; k++, rem--) floored[order[k % order.length].i]++;
  return floored;
}
