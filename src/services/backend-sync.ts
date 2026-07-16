import { API_BASE_URL, USE_API } from "./http";

const SYNC_KEY = "axis-sync-pending";
const SYNC_INTERVAL = 30_000; // retry every 30s

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = window.localStorage.getItem("axis-token");
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : {};
}

async function apiCall<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers as Record<string, string> ?? {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  if (res.status === 204) return undefined as T;
  return res.json();
}

interface SyncState {
  needsSync: boolean;
  lastSynced?: string;
}

function getSyncState(): SyncState {
  try {
    const raw = localStorage.getItem(SYNC_KEY);
    return raw ? JSON.parse(raw) : { needsSync: true };
  } catch { return { needsSync: true }; }
}

function markSynced() {
  localStorage.setItem(SYNC_KEY, JSON.stringify({
    needsSync: false,
    lastSynced: new Date().toISOString(),
  }));
}

export function markNeedsSync() {
  localStorage.setItem(SYNC_KEY, JSON.stringify({ needsSync: true }));
}

async function isApiAlive(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/menu/products/`, {
      headers: authHeaders(),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok || res.status === 401;
  } catch { return false; }
}

interface BackendProduct {
  id: number | string;
  name: string;
  available: boolean;
  [key: string]: unknown;
}

async function syncProducts() {
  const menuCache = localStorage.getItem("axis-menu");
  if (!menuCache) return;
  const { products: localProducts, categories } = JSON.parse(menuCache);
  if (!localProducts || !localProducts.length) return;

  const backendProducts: BackendProduct[] = await apiCall("/menu/products/");
  const bProducts = Array.isArray(backendProducts) ? backendProducts :
    (backendProducts as unknown as { results: BackendProduct[] }).results || [];

  const localIds = new Set(localProducts.map((p: BackendProduct) => String(p.id)));

  // Delete orphan products (in backend but not in local)
  for (const bp of bProducts) {
    if (!localIds.has(String(bp.id))) {
      try {
        await apiCall(`/menu/products/${bp.id}/`, { method: "DELETE" });
        console.log(`[sync] deleted orphan product ${bp.id}: ${bp.name}`);
      } catch (e) {
        console.warn(`[sync] failed to delete product ${bp.id}:`, e);
      }
    }
  }

  // Update existing products (available, etc.)
  const backendIds = new Set(bProducts.map((p: BackendProduct) => String(p.id)));
  for (const lp of localProducts) {
    if (backendIds.has(String(lp.id))) {
      try {
        await apiCall(`/menu/products/${lp.id}/`, {
          method: "PATCH",
          body: JSON.stringify(lp),
        });
        console.log(`[sync] updated product ${lp.id}: ${lp.name}`);
      } catch (e) {
        console.warn(`[sync] failed to update product ${lp.id}:`, e);
      }
    }
  }

  // Sync categories
  if (categories?.length) {
    for (const cat of categories) {
      try {
        await apiCall(`/menu/categories/${cat.id}/`, {
          method: "PATCH",
          body: JSON.stringify(cat),
        });
      } catch {
        try {
          await apiCall("/menu/categories/", {
            method: "POST",
            body: JSON.stringify(cat),
          });
        } catch (e) {
          console.warn(`[sync] failed to sync category ${cat.id}:`, e);
        }
      }
    }
  }
}

async function syncRecipes() {
  const recipesCache = localStorage.getItem("axis-recipes");
  if (!recipesCache) return;
  const { recipes } = JSON.parse(recipesCache);
  if (!recipes?.length) return;

  for (const recipe of recipes) {
    try {
      await apiCall(`/recipes/${recipe.id}/`, {
        method: "PATCH",
        body: JSON.stringify(recipe),
      });
      console.log(`[sync] updated recipe ${recipe.id}: ${recipe.name}`);
    } catch {
      try {
        await apiCall("/recipes/", {
          method: "POST",
          body: JSON.stringify(recipe),
        });
        console.log(`[sync] created recipe ${recipe.id}: ${recipe.name}`);
      } catch (e) {
        console.warn(`[sync] failed to sync recipe ${recipe.id}:`, e);
      }
    }
  }
}

async function syncInventory() {
  const invCache = localStorage.getItem("axis-inventory");
  if (!invCache) return;
  const { items } = JSON.parse(invCache);
  if (!items?.length) return;

  for (const item of items) {
    try {
      await apiCall(`/inventory/${item.id}/`, {
        method: "PATCH",
        body: JSON.stringify(item),
      });
    } catch {
      try {
        await apiCall("/inventory/", {
          method: "POST",
          body: JSON.stringify(item),
        });
        console.log(`[sync] created inventory item ${item.id}: ${item.name}`);
      } catch (e) {
        console.warn(`[sync] failed to sync inventory ${item.id}:`, e);
      }
    }
  }
}

async function runFullSync() {
  console.log("[sync] starting full backend sync...");
  try {
    await syncProducts();
    await syncRecipes();
    await syncInventory();
    markSynced();
    console.log("[sync] full sync completed successfully");

    try {
      const { toast } = await import("sonner");
      toast.success("Datos sincronizados con el servidor");
    } catch { /* no toast available */ }
  } catch (e) {
    console.error("[sync] sync failed:", e);
  }
}

let syncTimer: ReturnType<typeof setInterval> | null = null;

export function startBackgroundSync() {
  if (!USE_API || typeof window === "undefined") return;

  const state = getSyncState();
  if (!state.needsSync) {
    console.log("[sync] already synced at", state.lastSynced);
    return;
  }

  const attempt = async () => {
    const alive = await isApiAlive();
    if (!alive) {
      console.log("[sync] API offline, retrying in", SYNC_INTERVAL / 1000, "s");
      return;
    }
    await runFullSync();
    if (syncTimer) {
      clearInterval(syncTimer);
      syncTimer = null;
    }
  };

  attempt();
  syncTimer = setInterval(attempt, SYNC_INTERVAL);
}

export function stopBackgroundSync() {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}
