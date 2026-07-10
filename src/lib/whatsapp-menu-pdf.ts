const menuPdfs = new Map<string, Buffer>();

export function setMenuPdf(slug: string, base64: string) {
  const clean = base64.replace(/^data:application\/pdf;base64,/, "");
  menuPdfs.set(slug, Buffer.from(clean, "base64"));
}

export function getMenuPdf(slug: string): Buffer | null {
  return menuPdfs.get(slug) ?? null;
}

export function hasMenuPdf(slug: string): boolean {
  return menuPdfs.has(slug);
}

export function deleteMenuPdf(slug: string) {
  menuPdfs.delete(slug);
}
