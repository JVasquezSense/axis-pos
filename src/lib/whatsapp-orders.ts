export interface WhatsAppOrder {
  id: string;
  code: string;
  customer: string;
  phone: string;
  lines: { name: string; quantity: number; price: number }[];
  total: number;
  createdAt: number;
  receiptReceived: boolean;
  receiptUrl?: string;
  synced: boolean;
}

let seq = 5000;

export const whatsappOrders = new Map<string, WhatsAppOrder[]>();

export function addWhatsAppOrder(slug: string, order: Omit<WhatsAppOrder, "id" | "code" | "createdAt" | "receiptReceived" | "synced">): WhatsAppOrder {
  const full: WhatsAppOrder = {
    ...order,
    id: `wa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    code: `#WA${seq++}`,
    createdAt: Date.now(),
    receiptReceived: false,
    synced: false,
  };
  const list = whatsappOrders.get(slug) ?? [];
  list.unshift(full);
  if (list.length > 50) list.pop();
  whatsappOrders.set(slug, list);
  return full;
}

export function markReceiptReceived(slug: string, phone: string, receiptUrl?: string): WhatsAppOrder | null {
  const list = whatsappOrders.get(slug) ?? [];
  const order = list.find((o) => o.phone === phone && !o.receiptReceived);
  if (order) {
    order.receiptReceived = true;
    if (receiptUrl) order.receiptUrl = receiptUrl;
    return order;
  }
  return null;
}

export function getUnsyncedOrders(slug: string): WhatsAppOrder[] {
  const list = whatsappOrders.get(slug) ?? [];
  return list.filter((o) => !o.synced);
}

export function markSynced(slug: string, orderId: string) {
  const list = whatsappOrders.get(slug) ?? [];
  const order = list.find((o) => o.id === orderId);
  if (order) order.synced = true;
}

export function parseOrderBlock(reply: string): { items: { qty: number; name: string; price: number }[]; total: number; customer: string } | null {
  const match = reply.match(/===PEDIDO===([\s\S]*?)===FIN===/);
  if (!match) return null;

  const block = match[1];
  const items: { qty: number; name: string; price: number }[] = [];
  const lineRegex = /- (\d+)x\s+(.+?)\s*-\s*\$([0-9.,]+)/g;
  let m;
  while ((m = lineRegex.exec(block)) !== null) {
    items.push({
      qty: parseInt(m[1]),
      name: m[2].trim(),
      price: parseInt(m[3].replace(/\./g, "").replace(/,/g, "")),
    });
  }
  if (items.length === 0) return null;

  const totalMatch = block.match(/TOTAL:\s*\$([0-9.,]+)/);
  const customerMatch = block.match(/CLIENTE:\s*(.+)/);
  return {
    items,
    total: totalMatch ? parseInt(totalMatch[1].replace(/\./g, "").replace(/,/g, "")) : items.reduce((s, i) => s + i.qty * i.price, 0),
    customer: customerMatch?.[1]?.trim() || "",
  };
}
