export interface WhatsAppCustomer {
  phone: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  orderCount: number;
  lastOrderAt: number;
}

const customers = new Map<string, Map<string, WhatsAppCustomer>>();

function getSlugMap(slug: string) {
  let map = customers.get(slug);
  if (!map) {
    map = new Map();
    customers.set(slug, map);
  }
  return map;
}

export function upsertCustomer(slug: string, phone: string, data: Partial<Omit<WhatsAppCustomer, "phone">>): WhatsAppCustomer {
  const map = getSlugMap(slug);
  const existing = map.get(phone);
  const updated: WhatsAppCustomer = {
    phone,
    name: data.name ?? existing?.name ?? "Cliente",
    address: data.address ?? existing?.address,
    latitude: data.latitude ?? existing?.latitude,
    longitude: data.longitude ?? existing?.longitude,
    orderCount: existing?.orderCount ?? 0,
    lastOrderAt: existing?.lastOrderAt ?? Date.now(),
  };
  if (data.orderCount !== undefined) updated.orderCount = data.orderCount;
  if (data.lastOrderAt !== undefined) updated.lastOrderAt = data.lastOrderAt;
  map.set(phone, updated);
  return updated;
}

export function getCustomer(slug: string, phone: string): WhatsAppCustomer | null {
  return getSlugMap(slug).get(phone) ?? null;
}

export function getAllCustomers(slug: string): WhatsAppCustomer[] {
  return [...getSlugMap(slug).values()].sort((a, b) => b.lastOrderAt - a.lastOrderAt);
}

export function incrementOrderCount(slug: string, phone: string) {
  const map = getSlugMap(slug);
  const c = map.get(phone);
  if (c) {
    c.orderCount++;
    c.lastOrderAt = Date.now();
  }
}
