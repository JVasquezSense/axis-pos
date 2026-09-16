"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  UtensilsCrossed, Plus, Search, MoreVertical, Pencil, Trash2, Tag, BookOpen,
  DollarSign, Percent, Package, Layers, ScanLine, Receipt,
} from "lucide-react";
import type { Category, Product, Recipe } from "@/types";
import { useMenuStore, emptyProduct, uid } from "@/store/menu.store";
import { useRecipesStore, emptyRecipe } from "@/store/recipes.store";
import { useInventoryStore, inventoryOrDemo } from "@/store/inventory.store";
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
import { ProductKindDialog, type ProductKind } from "@/components/menu/product-kind-dialog";
import { CATEGORY_ICONS, searchCategoryIcons } from "@/lib/category-icons";
import { TaxesDialog } from "@/components/menu/taxes-dialog";
import { ComboFormDialog } from "@/components/menu/combo-form-dialog";
import { MenuScanDialog } from "@/components/menu/menu-scan-dialog";
import { useFeatures } from "@/lib/features";
import { needsSupply } from "@/lib/product-supply";
import { menuService } from "@/services/menu.service";
import { USE_API, apiErrorHandler } from "@/services/http";
import { cn, formatCurrency } from "@/lib/utils";

type Tab = "carta" | "recetas";

export default function MenuPage() {
  const [tab, setTab] = useState<Tab>("carta");
  // Sin fichas tecnicas (plan Mini) el modulo es solo la carta: el producto
  // lleva su costo de produccion y, si descuenta stock, apunta a un insumo.
  const hasRecipes = useFeatures().has("recipes");

  return (
    <div className="space-y-6">
      <PageHeader
        title={hasRecipes ? "Menú & Recetas" : "Productos"}
        description={hasRecipes ? "Carta, categorías, fichas técnicas y costeo" : "Carta, categorías y precios"}
        icon={<UtensilsCrossed className="h-5 w-5" />}
      />
      {hasRecipes && (
        <div className="flex gap-1 rounded-xl border border-border bg-muted/40 p-1 w-fit">
          <TabBtn active={tab === "carta"} onClick={() => setTab("carta")} label="Carta" icon={<UtensilsCrossed className="h-4 w-4" />} />
          <TabBtn active={tab === "recetas"} onClick={() => setTab("recetas")} label="Fichas técnicas" icon={<BookOpen className="h-4 w-4" />} />
        </div>
      )}
      {!hasRecipes || tab === "carta" ? <CartaTab /> : <RecetasTab />}
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
  const { categories, products, addCategory, updateCategory, removeCategory, addProduct, addProductLocal, updateProduct, removeProduct, syncRecipePrice } = useMenuStore();
  const recipes = useRecipesStore((s) => s.recipes);
  const invRaw = useInventoryStore((s) => s.items);
  const invItems = inventoryOrDemo(invRaw);
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState("all");
  const [editing, setEditing] = useState<Product | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [catEditing, setCatEditing] = useState<Category | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [comboOpen, setComboOpen] = useState(false);
  const [comboEditing, setComboEditing] = useState<Product | null>(null);
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const [recipeEditing, setRecipeEditing] = useState<Recipe | null>(null);
  const [recipeIsNew, setRecipeIsNew] = useState(false);
  const [recipeOpen, setRecipeOpen] = useState(false);
  const [kindOpen, setKindOpen] = useState(false);
  const [taxesOpen, setTaxesOpen] = useState(false);

  const hasRecipes = useFeatures().has("recipes");
  const hasInventory = useFeatures().has("inventory");
  // Si por un enlace viejo un producto tuviera dos fichas, manda la que se
  // llama como él; el servidor ya no deja crear una segunda.
  const recipeFor = (pid: string | number) => {
    const mine = recipes.filter((r) => String(r.productId) === String(pid));
    if (mine.length <= 1) return mine[0];
    const product = products.find((p) => String(p.id) === String(pid));
    return mine.find((r) => product && r.name.trim().toLowerCase() === product.name.trim().toLowerCase()) ?? mine[0];
  };

  const openRecipe = (p: Product) => {
    const existing = recipeFor(p.id);
    setRecipeEditing(
      existing ?? {
        ...emptyRecipe(),
        name: p.name,
        emoji: p.image,
        category: p.category,
        price: p.price,
        productId: p.id,
        // La ficha nace como borrador; heredar la disponibilidad del producto
        // evita que darle receta lo deje marcado "Agotado" sin querer.
        status: p.available ? "active" : "draft",
      }
    );
    setRecipeIsNew(!existing);
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

  const sueltos = useMemo(() => visible.filter((p) => !p.isCombo), [visible]);
  const combos = useMemo(() => visible.filter((p) => p.isCombo), [visible]);

  const renderCard = (p: Product) => (
    <Card key={p.id} className={cn("group flex flex-col overflow-hidden", !p.available && "opacity-60")}>
              <div className="relative">
                <ProductImage emoji={p.image} category={p.category} className="aspect-square w-full rounded-b-none" />
                {p.isCombo && <Badge variant="secondary" className="absolute left-2 top-2 gap-1"><Package className="h-3 w-3" /> Combo</Badge>}
                {p.popular && !p.isCombo && <Badge variant="warning" className="absolute left-2 top-2">★ Destacado</Badge>}
                <DropdownMenu>
                  <DropdownMenuTrigger className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-background/90 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100">
                    <MoreVertical className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        if (p.isCombo) { setComboEditing(p); setComboOpen(true); }
                        else { setEditing(p); setFormOpen(true); }
                      }}
                    >
                      <Pencil className="h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    {/* Un combo no lleva ficha técnica propia: la aportan sus componentes. */}
                    {!p.isCombo && hasRecipes && p.kind !== "simple" && (
                      <DropdownMenuItem onClick={() => openRecipe(p)}>
                        <BookOpen className="h-4 w-4" /> {recipeFor(p.id) ? "Ver receta" : "Crear receta"}
                      </DropdownMenuItem>
                    )}
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
                  {hasInventory && needsSupply(p) && (
                    <span className="shrink-0 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600" title="No descuenta inventario: vincúlale un insumo desde Editar">
                      Requiere insumo
                    </span>
                  )}
                </div>
                <p className="line-clamp-1 text-xs text-muted-foreground">{p.description}</p>
                {(() => {
                  // Un combo no lleva ficha técnica: su costo sale de los
                  // componentes. Se muestra su composición en lugar del food cost.
                  if (p.isCombo) {
                    const items = p.comboItems ?? [];
                    return (
                      <p className="mt-1.5 line-clamp-1 text-[10px] text-muted-foreground">
                        {items.length > 0
                          ? items.map((ci) => `${ci.quantity}× ${ci.name ?? ""}`).join(" · ")
                          : "Sin productos"}
                      </p>
                    );
                  }
                  // El producto simple no tiene receta que costear: su margen
                  // sale del costo de producción, igual que en el plan Mini.
                  if (!hasRecipes || p.kind === "simple") {
                    const cost = Number(p.cost ?? 0);
                    if (cost <= 0 || p.price <= 0) return null;
                    const foodCost = cost / p.price;
                    return (
                      <span className="mt-1.5 inline-flex w-fit items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                        Costo <span className={foodCostTone(foodCost)}>{(foodCost * 100).toFixed(0)}%</span>
                      </span>
                    );
                  }
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
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => {
                      if (p.isCombo) { setComboEditing(p); setComboOpen(true); }
                      else { setEditing(p); setFormOpen(true); }
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
  );

  const defaultCategory = () => (activeCat === "all" ? (categories[0]?.id ?? "") : activeCat);

  /**
   * Crear producto pregunta primero el tipo, porque cada uno lleva a una
   * pantalla distinta. Antes se abría siempre la ficha técnica, así que lo que
   * se vende tal cual -una gaseosa, una cajetilla- tenía que inventarse una
   * receta para poder existir.
   */
  const openNew = () => {
    if (!hasRecipes) {
      // Sin fichas técnicas no hay nada que elegir: todo es simple.
      pickKind("simple");
      return;
    }
    setKindOpen(true);
  };

  const pickKind = (kind: ProductKind) => {
    setKindOpen(false);
    if (kind === "compound") {
      // Los que requieren insumos entran por su ficha técnica, que es donde se
      // definen: al guardarla crea el producto ya vinculado.
      setRecipeEditing({ ...emptyRecipe(), category: defaultCategory() });
      setRecipeIsNew(true);
      setRecipeOpen(true);
      return;
    }
    // Una gaseosa no se prepara: arranca sin paso por cocina y sin tiempo
    // objetivo. Se puede activar en el formulario si el producto sí lo lleva.
    setEditing({
      ...emptyProduct(defaultCategory()),
      kind: "simple",
      prepMinutes: 0,
      needsPreparation: false,
    });
    setFormOpen(true);
  };

  /**
   * "Requiere insumos" sin ficha técnica no descuenta nada, así que se abre
   * para armarla en el momento en vez de dejar el producto a medias.
   */
  const needsRecipe = (p: Product) =>
    hasRecipes && p.kind === "compound" && !p.isCombo && !recipeFor(p.id);

  const save = async (p: Product) => {
    if (products.some((x) => x.id === p.id)) {
      updateProduct(p);
      syncRecipePrice(String(p.id), p.price);
      toast.success("Producto actualizado", { description: p.name });
      if (needsRecipe(p)) openRecipe(p);
      return;
    }

    // Se espera al id real antes de abrir la ficha: `addProduct` cambia el id
    // temporal por el del servidor de forma asíncrona, y la receta quedaría
    // colgada de un producto que no existe.
    let saved = p;
    if (USE_API) {
      try {
        saved = await menuService.createProduct(p);
        addProductLocal(saved);
      } catch (err) {
        apiErrorHandler("producto")(err);
        return;
      }
    } else {
      addProduct(p);
    }
    toast.success("Producto creado", { description: saved.name });
    if (needsRecipe(saved)) openRecipe(saved);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setCatOpen(true)}>
          <Tag className="h-4 w-4" /> Categoría
        </Button>
        <Button variant="outline" size="sm" onClick={() => setTaxesOpen(true)}>
          <Receipt className="h-4 w-4" /> Impuestos
        </Button>
        <Button variant="outline" size="sm" onClick={() => setScanOpen(true)}>
          <ScanLine className="h-4 w-4" /> Importar desde foto
        </Button>
        <Button size="sm" variant="outline" onClick={() => { setComboEditing(null); setComboOpen(true); }}>
          <Package className="h-4 w-4" /> Combo
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
            onEdit={() => { setCatEditing(c); setCatOpen(true); }}
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

      {/* Los combos van aparte: son productos vendibles pero se arman distinto. */}
      {sueltos.length > 0 && (
        <section className="space-y-2">
          {combos.length > 0 && (
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Productos <span className="text-muted-foreground/70">({sueltos.length})</span>
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {sueltos.map(renderCard)}
          </div>
        </section>
      )}

      {combos.length > 0 && (
        <section className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Package className="h-3.5 w-3.5" /> Combos <span className="text-muted-foreground/70">({combos.length})</span>
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {combos.map(renderCard)}
          </div>
        </section>
      )}

      {visible.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">No hay productos en esta vista.</p>
      )}

      <TaxesDialog open={taxesOpen} onOpenChange={setTaxesOpen} />

      <ProductKindDialog open={kindOpen} onOpenChange={setKindOpen} onPick={pickKind} />

      <ProductFormDialog product={editing} categories={categories} open={formOpen} onOpenChange={setFormOpen} onSave={save} />

      <ComboFormDialog
        open={comboOpen}
        onOpenChange={setComboOpen}
        combo={comboEditing}
        products={products}
        categories={categories}
        onSave={(c) => {
          if (comboEditing) {
            updateProduct(c);
            toast.success("Combo actualizado", { description: c.name });
          } else {
            addProduct({ ...c, id: uid("p") });
            toast.success("Combo creado", { description: c.name });
          }
        }}
      />
      <RecipeEditor recipe={recipeEditing} isNew={recipeIsNew} open={recipeOpen} onOpenChange={setRecipeOpen} />
      <AddCategoryDialog
        open={catOpen}
        onOpenChange={(v) => { setCatOpen(v); if (!v) setCatEditing(null); }}
        initial={catEditing}
        onCreate={(c) => { addCategory(c); toast.success(`Categoría "${c.name}" creada`); }}
        onUpdate={(c) => { updateCategory(c); toast.success(`Categoría "${c.name}" actualizada`); }}
      />
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
  const invItems = inventoryOrDemo(invRaw);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [station, setStation] = useState("all");
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [editingIsNew, setEditingIsNew] = useState(false);
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
    // invItems entra en el cálculo: el stock cambia en vivo y el food cost con él.
  }, [recipes, invItems]);

  const openNew = () => { setEditing(emptyRecipe()); setEditingIsNew(true); setEditorOpen(true); };

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
            {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
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
              onEdit={() => { setEditing(r); setEditingIsNew(false); setEditorOpen(true); }}
              onDuplicate={() => { duplicate(r.id); toast.success("Receta duplicada"); }}
              onDelete={() => setToDelete(r)}
            />
          ))}
        </div>
      )}

      <RecipeEditor recipe={editing} isNew={editingIsNew} open={editorOpen} onOpenChange={setEditorOpen} />

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

function CatChip({ active, onClick, label, count, icon, onDelete, onEdit }: {
  active: boolean; onClick: () => void; label: string; count: number; icon?: string; onDelete?: () => void; onEdit?: () => void;
}) {
  return (
    <div className={cn("group inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors", active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted")}>
      <button onClick={onClick} className="inline-flex items-center gap-1.5">
        {icon && <Icon name={icon} className="h-4 w-4" />}
        {label}
        <span className={cn("rounded-full px-1.5 text-xs", active ? "bg-primary-foreground/20" : "bg-muted-foreground/15")}>{count}</span>
      </button>
      {/* Solo se podía borrar: cambiar el nombre o el icono obligaba a
          eliminarla con todos sus productos y crearla de nuevo. */}
      {onEdit && (
        <button onClick={onEdit} title="Editar categoría" className={cn("ml-0.5 opacity-0 transition-opacity group-hover:opacity-100", active ? "text-primary-foreground/70 hover:text-primary-foreground" : "text-muted-foreground hover:text-primary")}>
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
      {onDelete && (
        <button onClick={onDelete} title="Eliminar categoría" className={cn("opacity-0 transition-opacity group-hover:opacity-100", active ? "text-primary-foreground/70 hover:text-primary-foreground" : "text-muted-foreground hover:text-destructive")}>
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function AddCategoryDialog({ open, onOpenChange, onCreate, onUpdate, initial }: {
  open: boolean; onOpenChange: (v: boolean) => void; onCreate: (c: Category) => void;
  onUpdate?: (c: Category) => void; initial?: Category | null;
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(CATEGORY_ICONS[0].name);
  const [iconQuery, setIconQuery] = useState("");
  const matches = searchCategoryIcons(iconQuery);
  const isEdit = Boolean(initial);
  // Al abrir en edición se cargan nombre e icono; al crear, se limpia.
  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setIcon(initial?.icon ?? CATEGORY_ICONS[0].name);
    setIconQuery("");
  }, [open, initial]);
  const submit = () => {
    if (!name.trim()) return;
    if (initial && onUpdate) onUpdate({ ...initial, name: name.trim(), icon });
    else onCreate({ id: uid("cat"), name: name.trim(), icon, count: 0 });
    setName(""); setIcon(CATEGORY_ICONS[0].name); setIconQuery(""); onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
          <DialogDescription>{isEdit ? "Cambia el nombre o el icono; los productos se quedan donde están." : "Agrupa los productos de tu carta (ej. Entradas, Bebidas)."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Nombre</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Entradas" />
          </div>
          {/* Rejilla en vez de lista: el icono se reconoce de un vistazo, y el
              buscador entiende español porque el nombre de lucide no. */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Icono</label>
            <Input
              value={iconQuery}
              onChange={(e) => setIconQuery(e.target.value)}
              placeholder="Buscar: cerveza, postres, pollo…"
              className="mb-2 h-9"
            />
            {matches.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                Ningún icono coincide con «{iconQuery}».
              </p>
            ) : (
              <div className="scrollbar-thin grid max-h-52 grid-cols-6 gap-1.5 overflow-y-auto rounded-xl border border-border p-2">
                {matches.map((i) => (
                  <button
                    key={i.name}
                    type="button"
                    title={i.label}
                    onClick={() => setIcon(i.name)}
                    className={cn(
                      "flex h-10 items-center justify-center rounded-xl border transition-colors",
                      icon === i.name
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-transparent hover:bg-muted"
                    )}
                  >
                    <Icon name={i.name} className="h-5 w-5" />
                  </button>
                ))}
              </div>
            )}
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon name={icon} className="h-3.5 w-3.5" />
              {CATEGORY_ICONS.find((i) => i.name === icon)?.label ?? icon}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={!name.trim()}>{isEdit ? "Guardar" : "Crear categoría"}</Button>
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
