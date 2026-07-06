"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  UtensilsCrossed, Plus, Search, MoreVertical, Pencil, Trash2, Tag, BookOpen,
  DollarSign, Percent, Package, Layers, ScanLine,
} from "lucide-react";
import type { Category, Product, Recipe } from "@/types";
import { useMenuStore, emptyProduct, uid } from "@/store/menu.store";
import { useRecipesStore, emptyRecipe } from "@/store/recipes.store";
import { useInventoryStore } from "@/store/inventory.store";
import { INVENTORY } from "@/mock/datasets";
import { computeRecipeCost, foodCostTone, STATION } from "@/lib/recipes";
import { RecipeEditor } from "@/components/recipes/recipe-editor";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { PageHeader } from "@/components/shared/page-header";
import { Icon } from "@/components/shared/icon";
import { ProductImage } from "@/components/shared/product-image";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductFormDialog } from "@/components/menu/product-form-dialog";
import { MenuScanDialog } from "@/components/menu/menu-scan-dialog";
import { cn, formatCurrency } from "@/lib/utils";

const ICON_OPTIONS = ["Salad", "Beef", "Drumstick", "CupSoda", "IceCream", "Pizza", "Coffee", "Soup", "Fish", "Cookie"];
type Tab = "carta" | "recetas";

export default function MenuPage() {
  const [tab, setTab] = useState<Tab>("carta");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Menú & Recetas"
        description="Carta, categorías, fichas técnicas y costeo"
        icon={<UtensilsCrossed className="h-5 w-5" />}
      />
      <div className="flex gap-1 rounded-xl border border-border bg-muted/40 p-1 w-fit">
        <TabBtn active={tab === "carta"} onClick={() => setTab("carta")} label="Carta" icon={<UtensilsCrossed className="h-4 w-4" />} />
        <TabBtn active={tab === "recetas"} onClick={() => setTab("recetas")} label="Fichas técnicas" icon={<BookOpen className="h-4 w-4" />} />
      </div>
      {tab === "carta" ? <CartaTab /> : <RecetasTab />}
    </div>
  );
}

function TabBtn({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
        active ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {icon} {label}
    </button>
  );
}

/* ─── TAB: CARTA ─────────────────────────────────────────────────────────── */

function CartaTab() {
  const { categories, products, addCategory, removeCategory, addProduct, updateProduct, removeProduct } = useMenuStore();
  const recipes = useRecipesStore((s) => s.recipes);
  const invRaw = useInventoryStore((s) => s.items);
  const invItems = invRaw.length > 0 ? invRaw : INVENTORY;
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState("all");
  const [editing, setEditing] = useState<Product | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const [recipeEditing, setRecipeEditing] = useState<Recipe | null>(null);
  const [recipeOpen, setRecipeOpen] = useState(false);

  const recipeFor = (pid: string | number) => recipes.find((r) => String(r.productId) === String(pid));

  const openRecipe = (p: Product) => {
    const existing = recipeFor(p.id);
    setRecipeEditing(
      existing ?? { ...emptyRecipe(), name: p.name, emoji: p.image, category: p.category, price: p.price, productId: p.id }
    );
    setRecipeOpen(true);
  };

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    products.forEach((p) => (m[p.category] = (m[p.category] ?? 0) + 1));
    return m;
  }, [products]);

  const visible = useMemo(
    () => products.filter(
      (p) => (activeCat === "all" || p.category === activeCat) &&
        (query === "" || p.name.toLowerCase().includes(query.toLowerCase()))
    ),
    [products, activeCat, query]
  );

  const openNew = () => {
    // Crear producto = abrir RecipeEditor (crea el producto automáticamente al guardar)
    setRecipeEditing({
      ...emptyRecipe(),
      category: activeCat === "all" ? (categories[0]?.id ?? "") : activeCat,
    });
    setRecipeOpen(true);
  };
  const save = (p: Product) => {
    if (products.some((x) => x.id === p.id)) {
      updateProduct(p);
      toast.success("Producto actualizado", { description: p.name });
    } else {
      addProduct(p);
      toast.success("Producto creado", { description: p.name });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setCatOpen(true)}>
          <Tag className="h-4 w-4" /> Categoría
        </Button>
        <Button variant="outline" size="sm" onClick={() => setScanOpen(true)}>
          <ScanLine className="h-4 w-4" /> Importar desde foto
        </Button>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4" /> Producto
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <CatChip active={activeCat === "all"} onClick={() => setActiveCat("all")} label="Todos" count={products.length} />
        {categories.map((c) => (
          <CatChip
            key={c.id}
            active={activeCat === c.id}
            onClick={() => setActiveCat(c.id)}
            label={c.name}
            count={counts[c.id] ?? 0}
            icon={c.icon}
            onDelete={() => {
              removeCategory(c.id);
              if (activeCat === c.id) setActiveCat("all");
              toast.success(`Categoría "${c.name}" eliminada`);
            }}
          />
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          placeholder="Buscar producto…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visible.map((p) => (
          <Card key={p.id} className={cn("group flex flex-col overflow-hidden", !p.available && "opacity-60")}>
            <div className="relative">
              <ProductImage emoji={p.image} category={p.category} className="h-24 w-full rounded-b-none" />
              {p.popular && <Badge variant="warning" className="absolute left-2 top-2">★ Destacado</Badge>}
              <DropdownMenu>
                <DropdownMenuTrigger className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-background/90 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100">
                  <MoreVertical className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setEditing(p); setFormOpen(true); }}>
                    <Pencil className="h-4 w-4" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openRecipe(p)}>
                    <BookOpen className="h-4 w-4" /> {recipeFor(p.id) ? "Ver receta" : "Crear receta"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setToDelete(p)} className="text-destructive focus:text-destructive">
                    <Trash2 className="h-4 w-4" /> Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex flex-1 flex-col p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold leading-tight">{p.name}</p>
                {!p.available && <span className="shrink-0 text-[10px] font-medium text-muted-foreground">Agotado</span>}
              </div>
              <p className="line-clamp-1 text-xs text-muted-foreground">{p.description}</p>
              {(() => {
                const rc = recipeFor(p.id);
                if (rc && rc.price > 0) {
                  const c = computeRecipeCost(rc, invItems);
                  return (
                    <button onClick={() => openRecipe(p)} className="mt-1.5 inline-flex w-fit items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium hover:bg-accent">
                      <BookOpen className="h-3 w-3" /> Food cost <span className={foodCostTone(c.foodCostPct)}>{(c.foodCostPct * 100).toFixed(0)}%</span>
                    </button>
                  );
                }
                return (
                  <button onClick={() => openRecipe(p)} className="mt-1.5 inline-flex w-fit items-center gap-1 rounded-md border border-dashed border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:border-primary hover:text-primary">
                    <Plus className="h-3 w-3" /> {rc ? "Ver receta" : "Crear receta"}
                  </button>
                );
              })()}
              <div className="mt-auto flex items-center justify-between pt-2">
                <span className="text-sm font-bold">{formatCurrency(p.price)}</span>
                <Button size="icon-sm" variant="ghost" onClick={() => { setEditing(p); setFormOpen(true); }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {visible.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">No hay productos en esta vista.</p>
      )}

      <ProductFormDialog product={editing} categories={categories} open={formOpen} onOpenChange={setFormOpen} onSave={save} />
      <RecipeEditor recipe={recipeEditing} open={recipeOpen} onOpenChange={setRecipeOpen} />
      <AddCategoryDialog open={catOpen} onOpenChange={setCatOpen} onCreate={(c) => { addCategory(c); toast.success(`Categoría "${c.name}" creada`); }} />
      <MenuScanDialog
        open={scanOpen}
        onOpenChange={setScanOpen}
        categories={categories}
        onImport={(products) => { products.forEach(addProduct); }}
      />

      <Dialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar producto</DialogTitle>
            <DialogDescription>¿Eliminar <strong>{toDelete?.name}</strong> del menú? No se puede deshacer.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => { if (toDelete) { removeProduct(toDelete.id); toast.success("Producto eliminado"); } setToDelete(null); }}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── TAB: FICHAS TÉCNICAS ───────────────────────────────────────────────── */

function RecetasTab() {
  const { recipes, duplicate, remove } = useRecipesStore();
  const categories = useMenuStore((s) => s.categories);
  const invRaw = useInventoryStore((s) => s.items);
  const invItems = invRaw.length > 0 ? invRaw : INVENTORY;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [station, setStation] = useState("all");
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Recipe | null>(null);

  const filtered = useMemo(
    () => recipes.filter(
      (r) => {
        const catMatch = category === "all"
          || String(r.category) === String(category)
          || categories.find((c) => c.name.toLowerCase() === String(r.category).toLowerCase())?.id === category;
        return catMatch
          && (station === "all" || r.station === station)
          && (query === "" || r.name.toLowerCase().includes(query.toLowerCase()));
      }
    ),
    [recipes, category, station, query, categories]
  );

  const summary = useMemo(() => {
    if (!recipes.length) return { count: 0, avgFood: 0, avgMargin: 0, lowStock: 0 };
    const costs = recipes.map((r) => computeRecipeCost(r, invItems));
    return {
      count: recipes.length,
      avgFood: (costs.reduce((s, c) => s + c.foodCostPct, 0) / costs.length) * 100,
      avgMargin: costs.reduce((s, c) => s + c.margin, 0) / costs.length,
      lowStock: costs.filter((c) => c.maxPortions <= 10).length,
    };
  }, [recipes]);

  const openNew = () => { setEditing(emptyRecipe()); setEditorOpen(true); };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard icon={Layers} tone="text-primary" label="Recetas" value={`${summary.count}`} />
        <SummaryCard icon={Percent} tone="text-amber-500" label="Food cost prom." value={`${summary.avgFood.toFixed(0)}%`} />
        <SummaryCard icon={DollarSign} tone="text-emerald-500" label="Margen prom." value={formatCurrency(summary.avgMargin)} />
        <SummaryCard icon={Package} tone="text-destructive" label="Stock crítico" value={`${summary.lowStock}`} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Buscar receta…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Categoría" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={station} onValueChange={setStation}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Estación" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las estaciones</SelectItem>
            {(Object.keys(STATION) as (keyof typeof STATION)[]).map((s) => (
              <SelectItem key={s} value={s}>{STATION[s].emoji} {STATION[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4" /> Nueva receta
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<BookOpen />}
          title="No hay recetas"
          description="Crea tu primera ficha técnica para costear y controlar el consumo de inventario."
          action={<Button onClick={openNew}><Plus className="h-4 w-4" /> Nueva receta</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r, i) => (
            <RecipeCard
              key={r.id}
              recipe={r}
              index={i}
              invItems={invItems}
              onEdit={() => { setEditing(r); setEditorOpen(true); }}
              onDuplicate={() => { duplicate(r.id); toast.success("Receta duplicada"); }}
              onDelete={() => setToDelete(r)}
            />
          ))}
        </div>
      )}

      <RecipeEditor recipe={editing} open={editorOpen} onOpenChange={setEditorOpen} />

      <Dialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar receta</DialogTitle>
            <DialogDescription>¿Seguro que deseas eliminar <strong>{toDelete?.name}</strong>? Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => { if (toDelete) { remove(toDelete.id); toast.success("Receta eliminada"); } setToDelete(null); }}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── SHARED ─────────────────────────────────────────────────────────────── */

function CatChip({ active, onClick, label, count, icon, onDelete }: {
  active: boolean; onClick: () => void; label: string; count: number; icon?: string; onDelete?: () => void;
}) {
  return (
    <div className={cn("group inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors", active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted")}>
      <button onClick={onClick} className="inline-flex items-center gap-1.5">
        {icon && <Icon name={icon} className="h-4 w-4" />}
        {label}
        <span className={cn("rounded-full px-1.5 text-xs", active ? "bg-primary-foreground/20" : "bg-muted-foreground/15")}>{count}</span>
      </button>
      {onDelete && (
        <button onClick={onDelete} className={cn("ml-0.5 opacity-0 transition-opacity group-hover:opacity-100", active ? "text-primary-foreground/70 hover:text-primary-foreground" : "text-muted-foreground hover:text-destructive")}>
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function AddCategoryDialog({ open, onOpenChange, onCreate }: {
  open: boolean; onOpenChange: (v: boolean) => void; onCreate: (c: Category) => void;
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(ICON_OPTIONS[0]);
  const submit = () => {
    if (!name.trim()) return;
    onCreate({ id: uid("cat"), name: name.trim(), icon, count: 0 });
    setName(""); setIcon(ICON_OPTIONS[0]); onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nueva categoría</DialogTitle>
          <DialogDescription>Agrupa los productos de tu carta (ej. Entradas, Bebidas).</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Nombre</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Entradas" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Icono</label>
            <Select value={icon} onValueChange={setIcon}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ICON_OPTIONS.map((i) => (
                  <SelectItem key={i} value={i}>
                    <span className="flex items-center gap-2"><Icon name={i} className="h-4 w-4" /> {i}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={!name.trim()}>Crear categoría</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryCard({ icon: IconComp, label, value, tone }: {
  icon: React.ElementType; label: string; value: string; tone: string;
}) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-muted", tone)}>
        <IconComp className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-lg font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}
