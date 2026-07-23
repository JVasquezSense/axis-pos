# 📒 Memoria Técnica — Axis POS

> Plataforma **SaaS multi-tenant** de punto de venta (POS) para restaurantes.
> Frontend Next.js 15 + Backend Django 5 / DRF + WebSockets (Channels) + IA (GLM-4.5) + WhatsApp (Twilio).

**Repositorios**
- Frontend: `C:\Users\USUARIO\Documents\Synaptix\Axis POS` (Next.js)
- Backend:  `C:\Users\USUARIO\Documents\Synaptix\axis-pos-backend` (Django)

**Producción (deploy)**
- Backend: `https://axis-pos-production.up.railway.app` (Railway, Postgres, Redis)
- Frontend: Vercel (`axis-pos-nine.vercel.app`)
- Fecha de la memoria: **2026-07-22**

---

## 1. Visión general del producto

Axis POS es un sistema integral para restaurantes que cubre **todo el flujo operativo**: salón, toma de pedidos, cocina (KDS en tiempo real), cobro/caja, cierre de turno, inventario con kardex, recetas con costeo, proveedores y compras, CRM con fidelización, domicilios, e-commerce (carta web pública que sincroniza con el POS), reportes ejecutivos y un panel **super-admin SaaS** (gestión de tenants, planes, MRR).

Además incluye dos canales diferenciadores:
- **Axis IA**: copiloto conversacional (GLM-4.5) con contexto de negocio (KPIs, inventario, recetas).
- **Pedidos por WhatsApp**: webhook entrante con Twilio, parseo con GLM, upsert de clientes, verificación y despacho.

Es **multi-tenant por fila** (shared DB, shared schema): cada restaurante es un `Tenant` y todo dato de negocio lleva `tenant_id`. El aislamiento se garantiza en la capa de aplicación (fail-closed).

---

## 2. Stack tecnológico

### Frontend (`Axis POS`)
| Categoría | Tecnología | Versión |
|---|---|---|
| Framework | **Next.js** (App Router, RSC) | 15.5.19 |
| UI lib | **React** | 19.0.0 |
| Lenguaje | **TypeScript** (strict) | 5.7.3 |
| Estilos | TailwindCSS + tailwindcss-animate | 3.4.17 / 1.0.7 |
| Primitivos UI | **Radix UI** (vendored, estilo shadcn/ui) | 1.x–2.x |
| Util CSS | clsx + tailwind-merge + class-variance-authority | — |
| Iconos | lucide-react | 0.469.0 |
| Animación | framer-motion | 11.18.0 |
| Tema | next-themes (light/dark/system) | 0.4.4 |
| Toasts | sonner | 1.7.2 |
| Estado global | **Zustand** (+ persist) | 5.0.3 |
| Gráficas | recharts | 2.15.0 |
| HTTP | fetch nativo (sin axios/react-query) | — |
| QR | qrcode | 1.5.4 |
| Testing | vitest | 2.1.8 |
| Lint | eslint + eslint-config-next | 9.18.0 |
| Runtime | Node 22.x | — |

### Backend (`axis-pos-backend`)
| Categoría | Tecnología | Versión |
|---|---|---|
| Lenguaje | **Python** | 3.12.7 |
| Framework | **Django** | 5.1.5 |
| API | **Django REST Framework** | 3.15.2 |
| CORS | django-cors-headers | 4.6.0 |
| Auth | djangorestframework-simplejwt | 5.4.0 |
| WebSockets | **channels** + channels-redis | 4.2.0 / 4.2.1 |
| ASGI server | daphne | 4.1.2 |
| Async jobs | celery (declarado, sin tareas aún) | 5.4.0 |
| Cache/broker | redis (py) | 5.2.1 |
| BD driver | psycopg (Postgres) | 3.2.3 |
| Env | django-environ | 0.11.2 |
| Static | whitenoise | 6.8.2 |

### Servicios externos
- **PostgreSQL** (Railway) — BD principal (SQLite como fallback local).
- **Redis** (Railway) — channel layers de WS y broker Celery.
- **GLM-4.5 / glm-4.5-flash** (Z.ai / Zhipu `open.bigmodel.cn`) — IA del copiloto y parseo de WhatsApp.
- **Twilio WhatsApp API** — canal de pedidos por chat.

---

## 3. Arquitectura del Frontend

### Estructura (`src/`)
```
src/
├── app/                      # App Router
│   ├── layout.tsx, page.tsx  # raíz + login (/)
│   ├── globals.css           # design tokens HSL (light/dark)
│   ├── error.tsx, global-error.tsx, not-found.tsx
│   ├── (app)/                # grupo de rutas PRIVADAS (shell compartido)
│   │   ├── layout.tsx        # AuthGuard → DataProvider → AppShell
│   │   ├── dashboard/, salon/, reservations/, orders/, kitchen/,
│   │   │   checkout/, shift/, shift-history/, history/, web-orders/,
│   │   │   menu/, recipes/, inventory/, suppliers/, employees/,
│   │   │   audit/, crm/, reports/, delivery/, delivery-admin/,
│   │   │   website/, admin/
│   ├── api/                  # Route Handlers server-side (¡secretos seguros!)
│   │   ├── ai/               # chat (SSE), describe, generate-recipe, menu-scan
│   │   └── whatsapp/         # webhook, config, customers, menu-pdf, orders, simulate
│   └── restaurant/[slug]/    # carta web pública (+ producto detail [id])
├── components/
│   ├── ui/                   # 17 primitivos Radix vendored (button, dialog, table…)
│   ├── shared/               # kpi-card, sparkline, page-header, empty-state, etc.
│   ├── [feature]/            # dashboard, salon, orders, kitchen, reports, crm, …
│   ├── auth-guard.tsx, data-provider.tsx, providers.tsx
├── services/                 # capa API: 15 *.service.ts + http.ts
├── store/                    # 18 stores Zustand
├── hooks/                    # use-async, use-app-init
├── lib/                      # utils, roles, nav, payments, status, recipes, ai-context…
├── layouts/                  # app-shell, sidebar, header, mobile-nav
├── types/index.ts            # tipos de dominio (map 1:1 con DRF)
└── mock/                     # datasets simulados
```

### Regla arquitectónica clave
> **Los componentes NUNCA consumen datos directamente.** Todo pasa por un `*.service.ts`.
> El switch mock→real no toca componentes ni stores: sólo `NEXT_PUBLIC_USE_API` y los servicios. El único archivo núcleo es `src/services/http.ts`.

### Routing
- `/` → login (mock o JWT real).
- `(app)/*` → 22 módulos del panel, todos tras `AuthGuard`.
- `/restaurant/[slug]` → carta web pública.
- `app/api/*` → Route Handlers server-side (proxy IA + WhatsApp).

### Estado global (Zustand, 18 stores)
`app`, `auth`, `order`, `menu`, `recipes`, `inventory`, `tables`, `suppliers`, `sales`, `reservations`, `employees`, `kitchen`, `audit`, `history`, `delivery`, `web`, `whatsapp`, `onboarding`.

7 usan `persist` (app, auth, delivery, history, menu, web, whatsapp). Patrón: **optimista local + `saveCache()` + sync backend si `USE_API`**. El `DataProvider` hidrata en paralelo 8 stores al montar el panel.

### Sistema de diseño
- Tokens CSS HSL, **light/dark por clase** (next-themes).
- Paleta semántica: `primary` (rojo), `gold` (acento), `success`, `warning`, `destructive`, `muted`, `accent`, `card`, `popover`, set `sidebar-*`.
- Tipografía: **Inter** (next/font). Radio 0.75rem.
- Fetching: hook propio `useAsync<T>(fn, deps) → {data, loading, error, reload}` (sustituto ligero de react-query).

### Variables de entorno
```
NEXT_PUBLIC_USE_API=true|false         # mock vs backend real
NEXT_PUBLIC_API_URL=https://axis-pos-production.up.railway.app/api/v1
NEXT_PUBLIC_WS_URL=wss://axis-pos-production.up.railway.app
GLM_API_KEY=…                          # SERVER-ONLY (sin NEXT_PUBLIC_)
GLM_MODEL=glm-4.5-flash
GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
```

Scripts: `dev`, `build`, `start`, `lint`, `test` (vitest).

---

## 4. Arquitectura del Backend

### Estructura
```
axis-pos-backend/
├── manage.py                 # DJANGO_SETTINGS_MODULE=config.settings
├── Procfile                  # release: migrate+collectstatic | web: daphne | worker: celery
├── railway.json              # deploy Railway (Railpack)
├── requirements.txt
├── runtime.txt               # python-3.12.7
├── db.sqlite3                # dev fallback
├── config/
│   ├── settings.py           # config global
│   ├── urls.py               # root + auth JWT
│   ├── asgi.py               # ProtocolTypeRouter (HTTP + WS)
│   ├── wsgi.py
│   └── celery.py             # app "axis_pos" (autodiscover, sin tasks aún)
└── api/                      # app única con TODO el dominio
    ├── models.py             # todos los modelos
    ├── serializers.py        # camelCase, lógica de servicio embebida
    ├── views.py              # ViewSets + TenantQuerySet mixin + MeView/Dashboard/etc.
    ├── urls.py               # DefaultRouter DRF
    ├── admin.py              # registra todo en /admin
    ├── routing.py            # rutas WS
    ├── consumers.py          # KitchenConsumer (KDS realtime)
    ├── migrations/           # 0001_initial … 0012_whatsapp_models
    └── management/commands/seed.py
```

**Patrón**: MVC estilo Django + DRF (models → serializers → viewsets). Monolito de una sola app `api` (separación por bounded context pendiente).

### Modelo multi-tenant
Todo dato de negocio hereda de:
```python
class TenantScoped(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="%(class)ss")
    class Meta:
        abstract = True
```
Aislamiento **fail-closed** en la capa de aplicación (`views.py`), **no** por header/subdominio:
```python
def get_queryset(self):
    tenant_id = resolve_tenant_id(self.request.user)   # siempre desde el JWT/perfil
    return qs.filter(tenant_id=tenant_id) if tenant_id else qs.none()
```

### Autenticación (JWT)
- `POST /api/v1/auth/token/` → `AxisTokenView` inyecta claims extra: `is_superuser`, `role`, `tenant_id`.
- Refresh: `POST /api/v1/auth/token/refresh/`.
- **Lifetime: 3650 días (10 años)** — dispositivos POS siempre logueados.
- DRF: sólo `JWTAuthentication`, permiso default `IsAuthenticated`.
- ⚠️ **Roles NO se aplican como permission classes**: cualquier user autenticado hace CRUD en su tenant. Sólo `IsAdminUser` (superuser) en endpoints `/admin/*`.

### Realtime (WebSocket)
- Ruta: `ws://host/ws/kitchen/<tenant>/` → `KitchenConsumer`.
- Grupo `kitchen_<tenant>`. Eventos: `ticket.new` (al crear orden), `ticket.update` (cambio estado) emitidos desde `OrderViewSet`.
- ⚠️ Sin verificación de pertenencia al tenant (sólo `AuthMiddlewareStack`).

### Settings relevantes
- `DEBUG`, `ALLOWED_HOSTS` (+ `.railway.app`, `RAILWAY_PUBLIC_DOMAIN` auto).
- `DATABASE_URL` (Postgres prod / SQLite fallback).
- `REDIS_URL` → si existe: ChannelLayers Redis + Celery broker; si no: `InMemoryChannelLayer`.
- `CORS_ALLOWED_ORIGINS` (default: localhost:3000, axispos.co, axis-pos-nine.vercel.app).
- `SECURE_PROXY_SSL_HEADER` para TLS en Railway.
- Locale `es-co`, TZ `America/Bogota`, `USE_TZ=True`.
- Static: `CompressedManifestStaticFilesStorage`.

### Seed / Superuser demo
```
python manage.py seed
# → admin@axispos.co / Axis2026!  (superuser)
# → Tenant "Demo Burger" (plan growth, Medellín), 3 categorías, 4 productos, 3 ítems inv.
```

---

## 5. Modelo de datos (esquema)

Raíz: **Tenant** (UUID, `name`, `slug` único, `logo`, `plan` [starter/growth/enterprise], `status`, `features` JSON).

```
Tenant ─┬─ UserProfile (OneToOne User, role, FK tenant nullable)
        ├─ Category ── Product (PROTECT Category)        [menu]
        ├─ InventoryItem ── InventoryMovement             [kardex]
        ├─ Recipe ── RecipeIngredient ──► InventoryItem   [costeo/BOM]
        ├─ Table (coords x/y, shape, status)              [salón]
        ├─ Order ── OrderLine ──► Product                 [pedidos POS]
        │   └─► Table (SET_NULL)
        ├─ Sale (registro contable post-cobro; GET+POST)
        ├─ Customer (CRM: tier, points, total_spent)
        ├─ Supplier ── Purchase ── PurchaseLine ──► InventoryItem
        ├─ Reservation
        ├─ Employee
        └─ WhatsAppCustomer ── WhatsAppOrder ── WhatsAppOrderLine
           WhatsAppConfig (singleton tenant: Twilio+GLM creds, greeting, menu…)
```

**Notas de relaciones:**
- Todo lo raíz hereda `TenantScoped`.
- Las "líneas" (OrderLine, PurchaseLine, RecipeIngredient, WhatsAppOrderLine) **no** son scoped (cuelgan de su padre).
- `Product→Category`, `OrderLine→Product`, `Purchase→Supplier`, `PurchaseLine→InventoryItem`: **PROTECT**.
- `Recipe→Product`, `Order→Table`, `RecipeIngredient→InventoryItem`, `WhatsAppOrder→WhatsAppCustomer`: **SET_NULL**.
- `InventoryItem.recompute_status()` → normal/low/critical.
- Crear `Purchase` actualiza stock de items y genera `InventoryMovement` tipo "entrada".
- Crear/actualizar `Order` emite eventos WS al grupo `kitchen_<tenant>`.

### Tipos de enumeración
- `Tenant.plan`: starter / growth / enterprise
- `Tenant.status`: active / trial / past_due / churned
- `Order.status`: pending / preparing / ready / served / paid
- `Order.channel`: dine_in / takeaway / delivery / web
- `Sale.method`: card / cash / transfer / nequi
- `Table.status`: available / occupied / reserved / billing
- `InventoryItem.status`: normal / low / critical
- `InventoryMovement.type`: inicial / entrada / salida / ajuste
- `Employee.role`: mesero / cocinero / cajero / admin / almacen
- `UserRole` (UserProfile): admin / cashier / waiter / kitchen / warehouse
- `WhatsAppOrder.status`: review / verified / dispatched / rejected
- `Customer.tier`: bronze / silver / gold / platinum

---

## 6. API REST — catálogo de endpoints

Base: **`/api/v1/`**. DRF `DefaultRouter` (CRUD completo salvo excepciones).

### Auth
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/token/` | Login (JWT con claims tenant/role) |
| POST | `/auth/token/refresh/` | Refresh |
| GET | `/auth/me/` | Identidad + tenant resuelto |

### Menú / Inventario / Salón / Recetas / CRM
| Ruta | Notas |
|---|---|
| `/menu/categories/` | CRUD |
| `/menu/products/` | CRUD |
| `/inventory/` | CRUD |
| `GET /inventory/movements/` | listado kardex |
| `POST /inventory/{id}/adjust/` | ajuste manual (genera movement) |
| `/tables/` | CRUD (mapa salón) |
| `/recipes/` | CRUD anidando ingredientes |
| `/customers/` | CRM |

### Órdenes / Ventas
| Ruta | Notas |
|---|---|
| `/orders/` | CRUD; filtros `?status=pending,preparing&table=5`; emite WS |
| `/sales/` | **sólo GET + POST** |

### Compras / Proveedores / Reservas / Empleados
| Ruta | Notas |
|---|---|
| `/suppliers/` | CRUD |
| `/purchases/` | crear → actualiza stock + crea movements |
| `/reservations/` | CRUD |
| `/employees/` | CRUD |

### WhatsApp
| Ruta | Notas |
|---|---|
| `/whatsapp/customers/` | CRUD + `POST .../upsert/` (por teléfono) |
| `/whatsapp/orders/` | filtrable `?status=`; `PATCH .../{id}/receipt/` |
| `/whatsapp/config/` | singleton por tenant (`list` = get_or_create) |

### Analytics / Dashboard
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/dashboard/summary/` | KPIs tiempo real (ventas hoy, ticket, ventas/hora/día/mes, top products, alertas stock, ocupación) |
| GET | `/reports/executive/` | Resumen 30 días (ingresos, utilidad 35% hardcodeada, mix categoría/canal/pago, heatmap) |

### Super-admin (`IsAdminUser`)
| Método | Ruta |
|---|---|
| CRUD | `/admin/tenants/` |
| PATCH | `/admin/tenants/{id}/features/` |
| GET/POST | `/admin/tenants/{id}/users/` |
| PATCH/DELETE | `/admin/tenants/{id}/users/{user_id}/` |
| GET | `/admin/metrics/` (MRR por plan: starter 299k / growth 599k / enterprise 1.2M COP) |

### WebSocket
| Ruta | Descripción |
|---|---|
| `ws://host/ws/kitchen/<tenant>/` | KitchenConsumer, grupo `kitchen_<tenant>`, eventos `ticket.new` / `ticket.update` |

---

## 7. Roles y navegación (frontend)

6 roles en `src/lib/roles.ts` con `defaultRoute` y mapa `ROLE_NAV` que filtra el sidebar:
`admin`, `waiter`,`, `cashier`, `kitchen`, `warehouse`, `delivery`.

El `RoleSwitcher` (selector demo en el header) persiste el rol en `app.store`. Los roles del **backend** son: `admin / cashier / waiter / kitchen / warehouse`.

### Módulos (22)
Dashboard · Salón · Reservaciones · Pedidos · Cocina (KDS) · Caja · Cierre de turno (+ historial) · Historial ventas · Pedidos web · Menú · Recetas · Inventario · Proveedores · Empleados · Auditoría · CRM · Reportes · Domicilios (+ admin) · Website (+ carta pública `/restaurant/[slug]`) · Super-admin SaaS.

---

## 8. Integraciones diferenciadoras

### Axis IA (copiloto)
- Componente flotante `components/ai/axis-ai.tsx` inyectado en el AppShell.
- Route Handlers `app/api/ai/*` (server-side): chat **SSE streaming**, `describe`, `generate-recipe`, `menu-scan`.
- Contexto construido con `lib/ai-context.ts` (KPIs, inventario, recetas…).
- System prompt con modos: `chat`, `pricing`, `shift`, `inventory`, `waiter`, `menu_eng`, `reservations`.
- `GLM_API_KEY` **sólo en el servidor** (nunca expuesta al cliente).

### WhatsApp (pedidos por chat)
- Route Handlers `app/api/whatsapp/*`: webhook entrante (Twilio → GLM parsea el pedido), config, customers, menu-pdf, orders, simulate.
- Multi-tenant vía `lib/whatsapp-tenants.ts`.
- Backend: `WhatsAppConfig` (singleton tenant con creds Twilio+GLM, greeting, menu), `WhatsAppCustomer` (upsert por teléfono), `WhatsAppOrder` (flujo review→verified→dispatched→rejected).

---

## 9. Reglas y convenciones del proyecto

1. **Arquitectura de servicios**: componentes → store → servicio → (mock | http). Nunca fetch directo desde UI.
2. **Switch mock/real**: `NEXT_PUBLIC_USE_API` + un `if` por método de servicio. `http.ts` es el único núcleo HTTP.
3. **Refresh JWT automático**: ante 401 → `POST /auth/token/refresh/` con dedupe de promesas y reintento; si falla, limpia sesión y redirige a `/`.
4. **Purga de caches por tenant** en login/logout: `TENANT_SCOPED_KEYS` (menu, recipes, inventory, history, deliveries, web, whatsapp, app-store) — evita fugas de datos entre restaurantes en el mismo navegador.
5. **Serializers camelCase** en backend para mapear 1:1 con los tipos TS del frontend (`prepMinutes`, `minStock`, `tableNumber`).
6. **Normalización en el borde**: ej. `inventoryService` convierte `DecimalField` (string) a `Number`.
7. **Comparar IDs como strings** en todo lookup (commit `2fcfead`). Los UUID vienen como string y los PK numéricos a veces como number.
8. **Lazy loading de Recharts** vía `next/dynamic` (ssr:false) en `*-charts-lazy.tsx`.
9. **Multi-tenancy fail-closed** en backend: sin perfil → queryset vacío (no se filtra por header cliente).

---

## 10. Riesgos técnicos conocidos / Deuda

| Área | Detalle |
|---|---|
| **Autorización server-side** | Roles NO se aplican como `permission_classes`. Cualquier usuario autenticado hace CRUD en su tenant sin importar su rol. Sólo `IsAdminUser` restringe `/admin/*`. |
| **WebSocket sin aislamiento de tenant** | `KitchenConsumer` no verifica que el user pertenezca al tenant de la ruta WS. |
| **Tokens de 10 años** | Conveniente para POS, pero de alto impacto si se filtran. |
| **Utilidad hardcoded al 35%** | `ReportsView` calcula utilidad como `curr_rev * 0.35`, no desde costos reales. |
| **Celery sin tareas** | Infra lista (`celery.py`, Procfile `worker`) pero no existe `api/tasks.py`. |
| **App única** | Todo el dominio en `api/`. Escalar requeriría dividir por bounded context. |
| **Multi-tenancy sin RLS** | Aislamiento sólo a nivel app (no Postgres RLS ni schema-per-tenant). |
| **No hay tests en backend** | `python manage.py.test` disponible pero sin suite escrita. Frontend: 2 tests (recipes cost, split bill). |
| **Sin linter en backend** | Sin flake8/black/ruff configurado. |
| **i18n** | No hay; UI hardcodeada en español. |

---

## 11. Cómo levantar el proyecto

### Backend
```bash
cd axis-pos-backend
python -m venv venv && source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                               # ajustar DATABASE_URL, SECRET_KEY, REDIS_URL
python manage.py migrate
python manage.py seed                              # crea admin@axispos.co + Demo Burger
python manage.py runserver                         # http://localhost:8000
# ASGI (HTTP+WS juntos en prod): daphne -b 0.0.0.0 -p $PORT config.asgi:application
```

### Frontend
```bash
cd "Axis POS"
npm install
cp .env.example .env.local
#   NEXT_PUBLIC_USE_API=false           # modo mock (demo, sin backend)
#   NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
#   NEXT_PUBLIC_WS_URL=ws://localhost:8000
#   GLM_API_KEY=...                      # sólo si vas a usar Axis IA
npm run dev                                        # http://localhost:3000
```

### Acceso demo
- **Login (API real):** `admin@axispos.co` / `Axis2026!`
- **Login (mock):** cualquier email/password con `NEXT_PUBLIC_USE_API=false`.

---

## 12. Archivos clave (referencia rápida)

### Frontend
- `package.json`, `next.config.mjs`, `tsconfig.json`, `tailwind.config.ts`
- `src/services/http.ts` — núcleo HTTP / JWT / refresh
- `src/app/(app)/layout.tsx`, `src/components/auth-guard.tsx`, `data-provider.tsx`, `providers.tsx`
- `src/store/auth.store.ts`, `app.store.ts`, `order.store.ts`, `menu.store.ts`
- `src/lib/roles.ts`, `nav.ts`, `utils.ts`, `ai-context.ts`
- `src/types/index.ts` (~430 líneas, map 1:1 con DRF)
- `src/app/api/ai/route.ts`, `src/app/api/whatsapp/webhook/route.ts`

### Backend
- `requirements.txt`, `config/settings.py`, `config/urls.py`, `config/asgi.py`, `config/celery.py`
- `api/models.py`, `api/serializers.py`, `api/views.py`, `api/urls.py`
- `api/consumers.py`, `api/routing.py`
- `api/migrations/` (0001–0012)
- `api/management/commands/seed.py`
- `Procfile`, `railway.json`, `.env.example`

---

*Memoria generada el 2026-07-22 a partir del análisis completo de ambos repositorios.*
