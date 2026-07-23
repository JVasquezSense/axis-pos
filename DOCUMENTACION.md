# 📘 Axis POS — Documentación Técnica del Sistema

> **Plataforma SaaS multi-tenant de punto de venta (POS) para restaurantes.**
> Frontend Next.js 15 · Backend Django 5 / DRF · WebSockets (Channels) · IA (GLM-4.5) · WhatsApp (Twilio)

| | |
|---|---|
| **Versión del documento** | 1.0 |
| **Fecha** | 2026-07-22 |
| **Repositorio Frontend** | `Axis POS` (Next.js) |
| **Repositorio Backend** | `axis-pos-backend` (Django) |
| **Producción — Backend** | Railway · `https://axis-pos-production.up.railway.app` |
| **Producción — Frontend** | Vercel · `https://axis-pos-nine.vercel.app` |
| **Companion rápido** | `MEMORIA.md` (referencia exprés de arquitectura) |

---

## Tabla de contenidos

1. [Introducción y propósito](#1-introducción-y-propósito)
2. [Visión del producto](#2-visión-del-producto)
3. [Stack tecnológico](#3-stack-tecnológico)
4. [Arquitectura general](#4-arquitectura-general)
5. [Backend — Django / DRF](#5-backend--django--drf)
6. [Frontend — Next.js](#6-frontend--nextjs)
7. [Modelo de datos](#7-modelo-de-datos)
8. [Referencia de la API REST](#8-referencia-de-la-api-rest)
9. [Tiempo real (WebSockets)](#9-tiempo-real-websockets)
10. [Autenticación, autorización y multi-tenancy](#10-autenticación-autorización-y-multi-tenancy)
11. [Integraciones: IA y WhatsApp](#11-integraciones-ia-y-whatsapp)
12. [Despliegue e infraestructura](#12-despliegue-e-infraestructura)
13. [Seguridad](#13-seguridad)
14. [Guía de desarrollo (setup)](#14-guía-de-desarrollo-setup)
15. [Roadmap — Backlog de mejoras](#15-roadmap--backlog-de-mejoras)
16. [Decisiones técnicas y deuda conocida](#16-decisiones-técnicas-y-deuda-conocida)
17. [Apéndices](#17-apéndices)

---

## 1. Introducción y propósito

**Axis POS** es un sistema integral para la operación completa de restaurantes. Cubre todo el flujo: salón, toma de pedidos, cocina (KDS en tiempo real), cobro y caja, cierre de turno, inventario con kardex, recetas con costeo, proveedores y compras, CRM con fidelización, domicilios, e-commerce (carta web pública que sincroniza pedidos con el POS), reportes ejecutivos y un panel **super-admin SaaS** para gestionar restaurantes (tenants), planes y MRR.

El sistema se comercializa como **SaaS multi-tenant**: cada restaurante es un `Tenant` y todos sus datos están aislados por `tenant_id`. Un único usuario puede pertenecer a un solo tenant; el super-admin (dueño de la plataforma) gestiona todos los tenants.

### Principios de diseño

1. **Multi-tenancy fail-closed**: ningún dato se expone sin un tenant válido resuelto desde el usuario autenticado.
2. **Capa de servicios en el frontend**: los componentes nunca hacen fetch directo; todo pasa por `*.service.ts`.
3. **Serializers acoplados al frontend**: el JSON de DRF usa camelCase para mapear 1:1 con los tipos TypeScript.
4. **Mock-first**: todo el frontend funciona con datos simulados (`NEXT_PUBLIC_USE_API=false`) y se conecta al backend real con un solo switch.
5. **Tiempo real donde importa**: el KDS (cocina) y los pedidos web se sincronizan por WebSocket.

---

## 2. Visión del producto

### Módulos del panel (22)

| Módulo | Ruta | Función |
|---|---|---|
| Dashboard | `/dashboard` | KPIs animados, ventas por hora/día, YoY, top productos, alertas. Vistas por rol. |
| Salón | `/salon` | Mapa interactivo de mesas (posiciones %, estados, zonas). |
| Reservaciones | `/reservations` | Gestión de reservas y briefing. |
| Pedidos | `/orders` | Toma de pedidos tipo tablet, modificadores, observaciones. |
| Cocina (KDS) | `/kitchen` | Kanban pending/preparing/ready, color por demora, **live WS**. |
| Caja | `/checkout` | Cobro: propina, descuento, métodos (Efectivo, Tarjeta, Nequi, Daviplata, PSE), factura. |
| Cierre de turno | `/shift` (+ `/shift-history`) | Resumen de turno e histórico. |
| Historial ventas | `/history` | Registro persistente de ventas. |
| Pedidos web | `/web-orders` | Feed de pedidos web en vivo. |
| Menú | `/menu` | Productos y categorías. |
| Recetas | `/recipes` | Fichas técnicas (BOM, costeo, variaciones, alérgenos). |
| Inventario | `/inventory` | Tabla avanzada, kardex, movimientos, conteo físico, ajustes. |
| Proveedores | `/suppliers` | CRUD proveedores + registro de compras (foto de factura, IVA). |
| Empleados | `/employees` | Gestión de personal. |
| Auditoría | `/audit` | Log de acciones. |
| Clientes (CRM) | `/crm` | Fidelización, niveles (bronze→platinum), puntos, cupones. |
| Reportes | `/reports` | Líneas/barras/donut; rentabilidad ejecutiva. |
| Domicilios | `/delivery` (+ `/delivery-admin`) | Ruta del domiciliario y gestión. |
| Página web | `/website` (+ `/restaurant/[slug]` pública) | E-commerce de carta que sincroniza con el POS. |
| Super-admin SaaS | `/admin` | MRR, suscripciones, tenants, features por plan, usuarios por tenant. |

### Canales diferenciadores

- **Axis IA**: copiloto conversacional (GLM-4.5) con contexto de negocio.
- **Pedidos por WhatsApp**: webhook entrante (Twilio), parseo con GLM, upsert de clientes, verificación y despacho.

### Roles

`admin` · `waiter` · `cashier` · `kitchen` · `warehouse` · `delivery`

---

## 3. Stack tecnológico

### Frontend

| Categoría | Tecnología | Versión |
|---|---|---|
| Framework | Next.js (App Router, RSC) | 15.5.19 |
| UI lib | React | 19.0.0 |
| Lenguaje | TypeScript (strict) | 5.7.3 |
| Estilos | TailwindCSS + tailwindcss-animate | 3.4.17 / 1.0.7 |
| Primitivos UI | Radix UI (vendored, estilo shadcn/ui) | 1.x–2.x |
| Util CSS | clsx + tailwind-merge + class-variance-authority | — |
| Iconos | lucide-react | 0.469.0 |
| Animación | framer-motion | 11.18.0 |
| Tema | next-themes (light/dark/system) | 0.4.4 |
| Toasts | sonner | 1.7.2 |
| Estado global | Zustand (+ persist) | 5.0.3 |
| Gráficas | recharts | 2.15.0 |
| HTTP | fetch nativo (sin axios/react-query) | — |
| QR | qrcode | 1.5.4 |
| Testing | vitest | 2.1.8 |
| Lint | eslint + eslint-config-next | 9.18.0 |
| Runtime | Node 22.x (prod 24.x en Vercel) | — |

### Backend

| Categoría | Tecnología | Versión |
|---|---|---|
| Lenguaje | Python | 3.12.7 |
| Framework | Django | 5.1.5 |
| API | Django REST Framework | 3.15.2 |
| CORS | django-cors-headers | 4.6.0 |
| Auth | djangorestframework-simplejwt | 5.4.0 |
| WebSockets | channels + channels-redis | 4.2.0 / 4.2.1 |
| ASGI server | daphne | 4.1.2 |
| Async jobs | celery (declarado) | 5.4.0 |
| Cache/broker | redis (py) | 5.2.1 |
| BD driver | psycopg (Postgres) | 3.2.3 |
| Env | django-environ | 0.11.2 |
| Static | whitenoise | 6.8.2 |

### Servicios externos
- **PostgreSQL** (Railway) — BD principal (SQLite fallback local).
- **Redis** (Railway) — channel layers WS y broker Celery.
- **GLM-4.5 / glm-4.5-flash** (Z.ai) — IA del copiloto y parseo de WhatsApp.
- **Twilio WhatsApp API** — canal de pedidos por chat.

---

## 4. Arquitectura general

```
┌─────────────────────────────────────────────────────────────────────┐
│                         NAVEGADOR / POS / MÓVIL                       │
│            Next.js 15 (Vercel) — SSR/RSC + Client Components          │
│   22 módulos  ·  18 stores Zustand  ·  fetch con JWT (refresh auto)   │
└───────────┬───────────────────────────────────────┬──────────────────┘
            │ HTTPS (REST, JWT Bearer)              │ WSS (Channels)
            ▼                                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│              BACKEND Django 5 + DRF (Railway, ASGI daphne)            │
│                                                                       │
│   config/ (settings · urls · asgi · celery)                           │
│   api/    (models · serializers · views · consumers · migrations)     │
│                                                                       │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────────────────┐  │
│   │  JWT Auth    │   │ TenantQuerySet│   │  KitchenConsumer (WS)    │  │
│   │ (token/refresh│   │  (fail-closed)│   │  grupo kitchen_<tenant>  │  │
│   │  claims tenant)│  │  filter tenant│   │  ticket.new / .update    │  │
│   └──────────────┘   └──────────────┘   └──────────────────────────┘  │
└───────────┬───────────────────────────────────────┬──────────────────┘
            ▼                                       ▼
┌─────────────────────────┐               ┌──────────────────────────┐
│   PostgreSQL (Railway)   │               │   Redis (Railway)         │
│  shared schema, fila     │               │  channel layer + celery   │
│  por tenant_id           │               │  broker                   │
└─────────────────────────┘               └──────────────────────────┘

  Servicios server-side (Route Handlers Next.js, secretos en servidor):
   • app/api/ai/*       → GLM-4.5 (chat SSE, describe, recipe, menu-scan)
   • app/api/whatsapp/* → Twilio webhook (GLM parsea pedido)
```

### Capas (frontend)

```
Componente React  →  Store (Zustand)  →  Servicio (*.service.ts)  →  HTTP (http.ts)
                                                                      │
                                                          ┌───────────┴───────────┐
                                                          ▼                       ▼
                                                   mockRequest(...)        request<T>(path)
                                                   (USE_API=false)          (USE_API=true) → DRF
```

> **Regla arquitectónica**: los componentes NUNCA consumen datos directamente. El switch mock/real no toca componentes ni stores; sólo `NEXT_PUBLIC_USE_API` y los servicios.

---

## 5. Backend — Django / DRF

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
│   ├── settings.py           # configuración global
│   ├── urls.py               # root + auth JWT
│   ├── asgi.py               # ProtocolTypeRouter (HTTP + WS)
│   ├── wsgi.py
│   └── celery.py             # app "axis_pos" (autodiscover, sin tasks aún)
└── api/                      # app única con TODO el dominio
    ├── models.py             # todos los modelos
    ├── serializers.py        # camelCase, lógica de servicio embebida
    ├── views.py              # ViewSets + TenantQuerySet mixin + vistas custom
    ├── urls.py               # DefaultRouter DRF
    ├── admin.py              # registra todo en /admin
    ├── routing.py            # rutas WS
    ├── consumers.py          # KitchenConsumer (KDS realtime)
    ├── migrations/           # 0001_initial … 0012_whatsapp_models
    └── management/commands/seed.py
```

**Patrón**: MVC estilo Django + DRF (`models → serializers → viewsets`). Monolito en una sola app `api`. Los serializers asumen parte de la lógica de servicio (ej. `PurchaseSerializer.create` actualiza stock y genera movimientos).

### Configuración (`config/settings.py`)

- `DEBUG` (False en prod), `ALLOWED_HOSTS` (+ `.railway.app`, `RAILWAY_PUBLIC_DOMAIN` auto).
- `DATABASE_URL` → Postgres en prod, SQLite fallback (`sqlite:///db.sqlite3`).
- `REDIS_URL` → si existe: ChannelLayers Redis + Celery broker; si no: `InMemoryChannelLayer`.
- `CORS_ALLOWED_ORIGINS` (default: localhost:3000, axispos.co, axis-pos-nine.vercel.app).
- `SECURE_PROXY_SSL_HEADER` para TLS en edge Railway.
- Locale `es-co`, TZ `America/Bogota`, `USE_TZ=True`.
- Static: `CompressedManifestStaticFilesStorage`.
- DRF: `JWTAuthentication`, permiso default `IsAuthenticated`, **sin paginación**.

### Puntos de extensión

- **Migrations**: 12 archivos (0001–0012) cubren todo el esquema + backfill de slugs + modelos WhatsApp.
- **Seed**: `python manage.py seed` crea superuser `admin@axispos.co` / `Axis2026!`, tenant "Demo Burger" (plan growth) y datos demo.
- **Admin de Django** (`/admin/`): todos los modelos registrados para gestión manual.

---

## 6. Frontend — Next.js

### Estructura (`src/`)

```
src/
├── app/                      # App Router
│   ├── layout.tsx, page.tsx  # raíz + login (/)
│   ├── globals.css           # design tokens HSL (light/dark)
│   ├── error.tsx, global-error.tsx, not-found.tsx
│   ├── (app)/                # grupo PRIVADO (shell: AuthGuard→DataProvider→AppShell)
│   │   ├── layout.tsx
│   │   └── [22 módulos]
│   ├── api/                  # Route Handlers server-side (secretos seguros)
│   │   ├── ai/               # chat (SSE), describe, generate-recipe, menu-scan
│   │   └── whatsapp/         # webhook, config, customers, menu-pdf, orders, simulate
│   └── restaurant/[slug]/    # carta web pública (+ producto detail [id])
├── components/
│   ├── ui/                   # 17 primitivos Radix vendored
│   ├── shared/               # kpi-card, sparkline, page-header, empty-state…
│   ├── [feature]/            # dashboard, salon, orders, kitchen, reports, crm…
│   ├── auth-guard.tsx, data-provider.tsx, providers.tsx
├── services/                 # capa API: 15 *.service.ts + http.ts
├── store/                    # 18 stores Zustand
├── hooks/                    # use-async, use-app-init
├── lib/                      # utils, roles, nav, payments, status, recipes, ai-context…
├── layouts/                  # app-shell, sidebar, header, mobile-nav
├── types/index.ts            # tipos de dominio (map 1:1 con DRF)
└── mock/                     # datasets simulados
```

### Routing

- `/` → login (mock o JWT real).
- `(app)/*` → 22 módulos, todos tras `AuthGuard`.
- `/restaurant/[slug]` → carta web pública.
- `app/api/*` → Route Handlers server-side (proxy IA + WhatsApp).

### Estado global (Zustand — 18 stores)

`app`, `auth`, `order`, `menu`, `recipes`, `inventory`, `tables`, `suppliers`, `sales`, `reservations`, `employees`, `kitchen`, `audit`, `history`, `delivery`, `web`, `whatsapp`, `onboarding`.

7 usan `persist` (app, auth, delivery, history, menu, web, whatsapp). Patrón: **optimista local + `saveCache()` + sync backend si `USE_API`**. El `DataProvider` hidrata en paralelo 8 stores al montar el panel.

Fetching: hook propio `useAsync<T>(fn, deps) → {data, loading, error, reload}` (sustituto ligero de react-query).

### Capa HTTP (`src/services/http.ts`)

- Cliente `fetch` nativo, **Bearer JWT** desde `localStorage` (`axis-token`).
- **Refresh automático**: ante 401 → `POST /auth/token/refresh/` con dedupe de promesas y reintento; si falla, limpia sesión y redirige a `/`.
- `ApiError` custom con status.
- URL base: `process.env.NEXT_PUBLIC_API_URL`.

### Sistema de diseño

- Tokens CSS HSL, **light/dark por clase** (next-themes).
- Paleta semántica: `primary` (rojo), `gold` (acento), `success`, `warning`, `destructive`, `muted`, `accent`, `card`, `popover`, set `sidebar-*`.
- Tipografía: **Inter** (next/font). Radio 0.75rem.
- 17 primitivos Radix vendored estilo shadcn/ui (button, dialog, table, select, tabs, dropdown-menu, sheet, badge, avatar, skeleton, tooltip, progress, separator, switch, sonner, scroll-area, label).
- `cn()` = `twMerge(clsx(...))`. `Button` con `cva` (variants y sizes), soporta `asChild` (Radix Slot).
- Responsivo mobile-first; CSS `@media print` con clase `.print-area` para recibos/reportes.

### Variables de entorno (frontend)

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

## 7. Modelo de datos

Raíz: **`Tenant`** (UUID). Todo dato de negocio hereda de la base abstracta `TenantScoped`:

```python
class TenantScoped(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="%(class)ss")
    class Meta:
        abstract = True
```

### Diagrama de entidades

```
                         ┌──────────────┐
                         │    Tenant     │  (UUID, name, slug, plan, status, features)
                         └──────┬───────┘
            ┌───────────────────┼────────────────────────────────────────┐
            ▼                   ▼                                          ▼
   ┌────────────────┐  ┌────────────────┐                         ┌───────────────┐
   │  UserProfile   │  │   Category     │                         │   Employee    │
   │ 1-1 User       │  └──────┬─────────┘                         └───────────────┘
   │ role, tenant   │         ▼ PROTECT
   └────────────────┘  ┌────────────────┐  SET_NULL   ┌────────────────┐
                       │    Product     │◄────────────│     Recipe     │
                       │ price, available│            │ portions, BOM  │
                       └──────┬─────────┘            └──────┬─────────┘
                              │                             │
                              │ PROTECT            ┌─────────┴──────────┐
                              ▼                    ▼                    ▼
   ┌────────────────┐  ┌──────────────┐   ┌──────────────────┐  ┌──────────────┐
   │ InventoryItem  │◄─│  OrderLine   │   │ RecipeIngredient │  │    Order     │
   │ stock, status  │  │ qty, price   │   │ qty, waste       │  │ code, status │
   └──────┬─────────┘  └──────┬───────┘   └──────────────────┘  └──────┬───────┘
          │                   │                                        │ SET_NULL
          ▼                   │                                        ▼
   ┌──────────────────┐       └────────────────────────────────► ┌──────────┐
   │InventoryMovement │                                          │  Table   │
   │ type, balance    │                                          └──────────┘
   └──────────────────┘
          ▲ entrada (al crear Purchase)
          │
   ┌──────┴─────────┐    ┌──────────────┐    ┌──────────────────┐
   │ PurchaseLine   │◄───│   Purchase   │◄───│    Supplier      │
   │ qty, unit_cost │    │ total, tax   │    │ nit, contact     │
   └────────────────┘    └──────────────┘    └──────────────────┘

   Otras (todas TenantScoped):
     Sale (registro contable post-cobro) · Customer (CRM, tier, points)
     Reservation · WhatsAppCustomer → WhatsAppOrder → WhatsAppOrderLine
     WhatsAppConfig (singleton tenant: Twilio+GLM creds, greeting, menu)
```

### Detalle de entidades y campos

**Núcleo**
| Modelo | Campos clave | Relaciones |
|---|---|---|
| `Tenant` | `name`, `slug` (único, autogenerado), `logo`, `plan` (starter/growth/enterprise), `status` (active/trial/past_due/churned), `city`, `locations`, `features` (JSON: pos, kitchen, inventory, recipes, salon, reservations, crm, suppliers, employees, reports, website, web_orders) | raíz |
| `UserProfile` | `OneToOne(User)`, `FK Tenant` (nullable), `role` | vínculo auth↔tenant |

**Menú**
| Modelo | Campos |
|---|---|
| `Category` | `name`, `icon` |
| `Product` | `name`, `description`, `price`, `FK Category` (PROTECT), `image`, `tags`(JSON), `available`, `prep_minutes`, `popular` |

**Inventario**
| Modelo | Campos |
|---|---|
| `InventoryItem` | `name`, `category`, `stock`, `unit`, `min_stock`, `cost`, `supplier`, `status` (normal/low/critical vía `recompute_status()`), `updated_at` |
| `InventoryMovement` | `FK InventoryItem`, `type` (inicial/entrada/salida/ajuste), `quantity`, `balance`, `unit_cost`, `reason`, `created_at` |

**Recetas**
| Modelo | Campos |
|---|---|
| `Recipe` | `name`, `emoji`, `description`, `category`, `FK Product` (SET_NULL), `station`, `status`, `difficulty`, `portions`, `prep_minutes`, `price`, `variations`/`steps`/`allergens`/`tags`(JSON), `allergens_other` |
| `RecipeIngredient` | `FK Recipe`, `FK InventoryItem` (SET_NULL), `name`, `unit`, `quantity`, `waste` |

**Salón y Pedidos**
| Modelo | Campos |
|---|---|
| `Table` | `number`, `capacity`, `zone`, `status` (available/occupied/reserved/billing), `waiter`, `seated_at`, `x`, `y` (coords mapa), `shape` (round/square/rect) |
| `Order` | `code`, `FK Table` (SET_NULL), `channel` (dine_in/takeaway/delivery/web), `status` (pending/preparing/ready/served/paid), `customer`, `phone`, `receipt`(FileField), `created_at` |
| `OrderLine` | `FK Order`, `FK Product` (PROTECT), `quantity`, `notes`, `unit_price` |
| `Sale` | `total`, `items`, `method` (card/cash/transfer/nequi), `sale_type`, `table_number`, `tip`, `waiter`, `created_at` |

**CRM / Proveedores / Compras**
| Modelo | Campos |
|---|---|
| `Customer` | `name`, `phone`, `email`, `total_spent`, `visits`, `points`, `tier` (bronze/silver/gold/platinum), `last_visit` |
| `Supplier` | `name`, `contact`, `phone`, `email`, `category`, `nit`, `active` |
| `Purchase` | `code`, `FK Supplier` (PROTECT), `date`, `subtotal`, `tax_total`, `total`, `invoice_photo`(base64) |
| `PurchaseLine` | `FK Purchase`, `FK InventoryItem` (PROTECT), `quantity`, `unit_cost`, `tax_rate`, `unit` |

**Otros**
| Modelo | Campos |
|---|---|
| `Reservation` | `name`, `phone`, `table_number`, `date`, `time`, `guests`, `notes`, `status` |
| `Employee` | `name`, `role` (mesero/cocinero/cajero/admin/almacen), `active`, `phone`, `email` |

**WhatsApp**
| Modelo | Campos |
|---|---|
| `WhatsAppCustomer` | `phone` (indexado), `name`, `address`, `lat`/`lng`, `order_count`, `last_order_at`; `unique_together=(tenant, phone)` |
| `WhatsAppOrder` | `code`, `FK WhatsAppCustomer` (SET_NULL), `customer_name`, `phone`, `address`, `total`, `status` (review/verified/dispatched/rejected), `receipt_url` |
| `WhatsAppOrderLine` | `FK WhatsAppOrder`, `name`, `quantity`, `price` |
| `WhatsAppConfig` | creds Twilio (`sid`, `token`, `whatsapp_number`), creds GLM (`api_key`, `model`, `base_url`), `enabled`, `greeting`, `restaurant_name`, `menu_text`, `payment_info`, `business_info`, `menu_pdf` |

### Reglas de cascada y lógica embebida

- `Product→Category`, `OrderLine→Product`, `Purchase→Supplier`, `PurchaseLine→InventoryItem`: **PROTECT**.
- `Recipe→Product`, `Order→Table`, `RecipeIngredient→InventoryItem`, `WhatsAppOrder→WhatsAppCustomer`: **SET_NULL**.
- `InventoryItem.recompute_status()` → recalcula normal/low/critical.
- Crear `Purchase` → actualiza stock de items + genera `InventoryMovement` tipo "entrada" (lógica en `PurchaseSerializer.create`).
- Crear/actualizar `Order` → emite eventos WS al grupo `kitchen_<tenant_id>` (desde `OrderViewSet.perform_create/perform_update`).

---

## 8. Referencia de la API REST

Base: **`/api/v1/`**. Generada por `DefaultRouter` de DRF (CRUD completo salvo excepciones).

### Autenticación
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/token/` | Login. Emite JWT con claims `tenant_id`, `role`, `is_superuser`. |
| POST | `/auth/token/refresh/` | Refresh del token. |
| GET | `/auth/me/` | Identidad + tenant resuelto (`MeView`). |

### Menú / Inventario / Salón / Recetas / CRM
| Ruta | Notas |
|---|---|
| `/menu/categories/` | CRUD |
| `/menu/products/` | CRUD |
| `/inventory/` | CRUD |
| `GET /inventory/movements/` | Listado kardex (action) |
| `POST /inventory/{id}/adjust/` | Ajuste manual (genera movement) |
| `/tables/` | CRUD (mapa salón) |
| `/recipes/` | CRUD anidando ingredientes |
| `/customers/` | CRM |

### Órdenes / Ventas
| Ruta | Notas |
|---|---|
| `/orders/` | CRUD; filtros `?status=pending,preparing&table=5`; emite WS |
| `/sales/` | **sólo GET + POST** (registro contable) |

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
| GET | `/dashboard/summary/` | KPIs tiempo real (ventas hoy, ticket, ventas/hora/día/mes, top products, alertas stock, ocupación). |
| GET | `/reports/executive/` | Resumen 30 días (ingresos, utilidad 35% hardcodeada, mix categoría/canal/pago, heatmap). |

### Super-admin (`IsAdminUser`)
| Método | Ruta |
|---|---|
| CRUD | `/admin/tenants/` |
| PATCH | `/admin/tenants/{id}/features/` (merge flags) |
| GET/POST | `/admin/tenants/{id}/users/` |
| PATCH/DELETE | `/admin/tenants/{id}/users/{user_id}/` |
| GET | `/admin/metrics/` (MRR: starter 299k / growth 599k / enterprise 1.2M COP) |

---

## 9. Tiempo real (WebSockets)

- **Ruta**: `ws://host/ws/kitchen/<tenant_slug_o_id>/` → `KitchenConsumer`.
- **Grupo**: `kitchen_<tenant>`.
- **Eventos**:
  - `ticket.new` — al crear una orden (`OrderViewSet.perform_create`).
  - `ticket.update` — cambio de estado de orden (`perform_update`) y mensajes de tablets de cocina.
- **Capa**: Redis si `REDIS_URL` está definido; `InMemoryChannelLayer` en caso contrario.
- **Auth**: `AuthMiddlewareStack` (requiere usuario autenticado).

> ⚠️ **Gap de seguridad conocido**: el consumer no verifica que el usuario pertenezca al tenant de la ruta WS. Ver §16.

---

## 10. Autenticación, autorización y multi-tenancy

### Autenticación (JWT)
- `djangorestframework-simplejwt`.
- `AxisTokenView` + `AxisTokenSerializer` inyectan claims: `is_superuser`, `role`, `tenant_id` (resueltos desde `UserProfile`).
- **Lifetime: 3650 días (10 años)** — dispositivos POS siempre logueados.
- DRF: sólo `JWTAuthentication`, permiso default `IsAuthenticated`.

### Flujo en el frontend
1. Login → `POST /auth/token/` → guarda `access` y `refresh` en `localStorage`.
2. Decodifica el payload (`atob`) para leer `is_superuser` y `tenant_id`.
3. Cada request añade `Authorization: Bearer <token>`.
4. Ante 401 → refresh automático con dedupe y reintento; si falla, logout + redirección.
5. En login/logout se **purgan caches por tenant** (`TENANT_SCOPED_KEYS`) para evitar fugas entre restaurantes en el mismo navegador.

### Multi-tenancy (fail-closed)
El aislamiento es por **claim del token** (no header/subdominio), resuelto siempre desde el usuario:

```python
def resolve_tenant_id(user):
    return user.profile.tenant_id   # sólo del usuario autenticado

class TenantQuerySet:  # mixin aplicado a TODOS los ViewSets de negocio
    def get_queryset(self):
        qs = super().get_queryset()
        tenant_id = self._resolve_tenant_id()
        return qs.filter(tenant_id=tenant_id) if tenant_id else qs.none()  # fail-closed
    def perform_create(self, serializer):
        serializer.save(tenant_id=self._resolve_tenant_id())
```

Excepción: si sólo existe **un** Tenant en la BD (modo single-tenant/webhooks), asume ese.

### Autorización por roles
- Roles en `UserProfile.ROLE` (admin/cashier/waiter/kitchen/warehouse) van dentro del JWT.
- ⚠️ **No se aplican como `permission_classes`**: cualquier usuario autenticado hace CRUD en su tenant. Sólo `IsAdminUser` (superuser) restringe `/admin/*`.
- El frontend filtra la UI según el `role` (`src/lib/roles.ts` → `ROLE_NAV`).

---

## 11. Integraciones: IA y WhatsApp

### Axis IA (copiloto)
- Componente flotante `components/ai/axis-ai.tsx` inyectado en el AppShell.
- Route Handlers `app/api/ai/*` (**server-side**, `GLM_API_KEY` nunca expuesta al cliente):
  - `chat` — **SSE streaming**.
  - `describe` — descripción de producto.
  - `generate-recipe` — receta a partir de insumos.
  - `menu-scan` — OCR/parseo de menú.
- Contexto construido con `lib/ai-context.ts` (KPIs, inventario, recetas).
- System prompt con modos: `chat`, `pricing`, `shift`, `inventory`, `waiter`, `menu_eng`, `reservations`.

### WhatsApp (pedidos por chat)
- Route Handlers `app/api/whatsapp/*`: webhook entrante (Twilio → GLM parsea el pedido), config, customers, menu-pdf, orders, simulate.
- Multi-tenant vía `lib/whatsapp-tenants.ts`.
- Backend: `WhatsAppConfig` (singleton tenant), `WhatsAppCustomer` (upsert por teléfono), `WhatsAppOrder` (flujo review→verified→dispatched→rejected).

---

## 12. Despliegue e infraestructura

### Backend — Railway
| Item | Valor |
|---|---|
| Proyecto | `resourceful-flexibility` |
| Servicio | `axis-pos` ● Online |
| Repo | `JVasquezSense/axis-pos-backend` (auto-deploy) |
| URL | `https://axis-pos-production.up.railway.app` |
| Región | US East |
| BD | Postgres (volumen `postgres-volume`, interno `postgres.railway.internal:5432`) |
| Start | `daphne -b 0.0.0.0 -p $PORT config.asgi:application` |
| PreDeploy | `python3 manage.py migrate --noinput && python3 manage.py collectstatic --noinput` |
| Builder | Railpack |
| Restart | `ON_FAILURE`, máx. 5 reintentos |

### Frontend — Vercel
| Item | Valor |
|---|---|
| Proyecto | `axis-pos` (team `jvasquezsenses-projects`) |
| URL | `https://axis-pos-nine.vercel.app` |
| Auto-deploy | GitHub (rama `main`) → Vercel |
| Runtime | Node 24.x |
| Región | `iad1` |
| Build | Next.js autodetectado |

### CI/CD
- **Backend**: push a `main` → Railway build (Railpack) → preDeploy (migrate + collectstatic) → daphne. Definido en `railway.json` y `Procfile`.
- **Frontend**: push a `main` → Vercel build automático → preview + production.

### Variables de entorno

**Backend (Railway)** — necesarias:
```
SECRET_KEY=…
DEBUG=False
ALLOWED_HOSTS=…,.railway.app
DATABASE_URL=postgres://…         # provista por Railway Postgres
REDIS_URL=redis://…               # provista por Railway Redis
CORS_ALLOWED_ORIGINS=https://axis-pos-nine.vercel.app
RAILWAY_PUBLIC_DOMAIN=…           # auto
```

**Frontend (Vercel)** — necesarias:
```
NEXT_PUBLIC_USE_API=true
NEXT_PUBLIC_API_URL=https://axis-pos-production.up.railway.app/api/v1
NEXT_PUBLIC_WS_URL=wss://axis-pos-production.up.railway.app
GLM_API_KEY=…                     # server-only
GLM_MODEL=glm-4.5-flash
GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
```

> ⚠️ **Higiene pendiente (detectado en auditoría 2026-07-22)**: el proyecto Vercel contiene variables de backend que el frontend no usa (`DATABASE_URL`, `POSTGRES_*`, `SECRET_KEY`, `PG*`) y `FIREBASE_SERVICE_ACCOUNT_JSON` (de otro proyecto, `ubicar-3a0db`) tanto en Railway como en Vercel. Recomendado: limpiar y rotar. Ver §13/§16.

---

## 13. Seguridad

### Modelo actual
- **Auth**: JWT con claims de tenant/role. Refresh automático en el cliente.
- **Aislamiento multi-tenant**: fail-closed por `tenant_id` resuelto desde el usuario (no desde input del cliente). Sin `tenant_id` → queryset vacío.
- **Secretos server-side**: `GLM_API_KEY` sólo en Route Handlers de Next.js (nunca en bundle del cliente).
- **TLS**: edge Railway (`SECURE_PROXY_SSL_HEADER`); Vercel HSTS preload.
- **CORS**: acotado a dominios conocidos.

### Riesgos conocidos (ver §16 para detalle y mitigación)
1. Roles no se aplican como `permission_classes` (sólo `IsAdminUser`).
2. WebSocket sin verificar pertenencia al tenant de la ruta.
3. Tokens de 10 años (trade-off POS vs. seguridad).
4. Variables de backend y `FIREBASE_SERVICE_ACCOUNT_JSON` expuestas en env de Vercel/Railway.
5. Sin RLS de Postgres (aislamiento sólo a nivel app).
6. Sin tests en backend; lint no configurado.

---

## 14. Guía de desarrollo (setup)

### Backend
```bash
cd axis-pos-backend
python -m venv venv && source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                               # ajustar DATABASE_URL, SECRET_KEY, REDIS_URL
python manage.py migrate
python manage.py seed                              # admin@axispos.co / Axis2026! + Demo Burger
python manage.py runserver                         # http://localhost:8000
# ASGI (HTTP+WS): daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

### Frontend
```bash
cd "Axis POS"
npm install
cp .env.example .env.local
#   NEXT_PUBLIC_USE_API=false                       # mock (demo, sin backend)
#   NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
#   NEXT_PUBLIC_WS_URL=ws://localhost:8000
#   GLM_API_KEY=…                                   # sólo si se usa Axis IA
npm run dev                                        # http://localhost:3000
```

### Acceso demo
- **API real**: `admin@axispos.co` / `Axis2026!`
- **Mock**: cualquier email/password con `NEXT_PUBLIC_USE_API=false`.

### Comandos útiles
| Tarea | Comando |
|---|---|
| Migrar | `python manage.py migrate` |
| Crear migración | `python manage.py makemigrations` |
| Seed demo | `python manage.py seed` |
| Superuser | `python manage.py createsuperuser` |
| Static | `python manage.py collectstatic` |
| Tests backend | `python manage.py test` |
| Tests frontend | `npm test` (vitest) |
| Lint frontend | `npm run lint` |

### CLI de despliegue (ya autenticados)
| Acción | Comando |
|---|---|
| Logs backend | `railway logs` (desde `axis-pos-backend/`) |
| Estado backend | `railway status` |
| Variables Railway | `railway variables` |
| Deploy backend | push a `main` (auto) |
| Logs frontend | `vercel logs axis-pos-nine.vercel.app` |
| Deploy frontend | push a `main` (auto) o `vercel --prod` (tras `vercel link`) |

---

## 15. Roadmap — Backlog de mejoras

Las siguientes 8 funcionalidades conforman el backlog priorizado. Para cada una se documenta **estado actual**, **gap** y **archivos implicados**, con la verificación clave del bucle de calidad (tenant_id · inventario en estado correcto · edición sin romper KDS · realtime bidireccional).

### 15.1 Factura de venta (Ticket de Pago)

**Requisito**: la factura impresa al cobrar debe incluir orden completa, cantidades y valores, descuentos e impuestos, nombre del restaurante, información fiscal, número de factura, fecha/hora, número de orden, mesa, mesero, cliente (si aplica), método de pago y observaciones.

| | |
|---|---|
| **Estado actual** | Existe el módulo Caja (`/checkout`) con propina, descuento, métodos de pago. El modelo `Sale` guarda `total`, `tip`, `method`, `table_number`, `waiter`. Hay CSS `@media print` con `.print-area`. El componente de recibo renderiza un ticket. |
| **Gap** | Faltan campos fiscales en `Tenant` (NIT/RUT, dirección, teléfono, régimen, resolución DIAN). `Sale` no tiene `invoice_number` correlativo ni `tax`/`discount` detallados ni `observations`. La plantilla de impresión no incluye encabezado fiscal. |
| **Archivos** | `api/models.py` (Tenant, Sale), `api/serializers.py`, `src/components/checkout/*` (plantilla de recibo), `src/lib/payments.ts`, `src/store/order.store.ts`, migration nueva. |
| **Complejidad** | Media. |

### 15.2 Salida por Plato (Reporte de Inventario)

**Requisito**: reporte que filtre estrictamente por `tenant_id` y calcule insumos requeridos vs. platos vendidos.

| | |
|---|---|
| **Estado actual** | `ReportsView` (`/reports/executive/`) ya filtra por tenant (via `resolve_tenant_id`). Existe `RecipeIngredient` (BOM receta→insumo) y `OrderLine` (platos vendidos). |
| **Gap** | No existe un endpoint/action específico "salida por plato" que cruce `OrderLine` × `RecipeIngredient` para totalizar insumos consumidos por tenant y período. El cálculo debe multiplicar `quantity` vendida × cada ingrediente de la receta (considerando `waste`). |
| **Archivos** | `api/views.py` (nueva action en un viewset de reportes), `api/serializers.py`, `src/app/(app)/reports/`, `src/services/*.service.ts`. |
| **Complejidad** | Media (lógica de agregación + join de BOM). |

### 15.3 Kardex de Inventario — saldo inicial en 0

**Requisito**: el kardex debe leer el inventario inicial real y calcular movimientos a partir de ahí.

| | |
|---|---|
| **Estado actual** | `InventoryMovement` tiene `type` "inicial/entrada/salida/ajuste" con `balance`. La action `movements` lista movimientos. `InventoryItem.stock` es el saldo actual. |
| **Gap** | La consulta del kardex probablemente no genera un movimiento "inicial" al crear el item, o no encadena `balance` correctamente. Debe garantizarse: al crear `InventoryItem`, crear `InventoryMovement(type="inicial", quantity=stock, balance=stock)`; cada movimiento recalcula `balance` y `InventoryItem.stock`. |
| **Archivos** | `api/models.py` (`InventoryItem.save()` o signal), `api/serializers.py` (`InventoryItemSerializer.create`), `api/views.py` (`movements` action), `src/app/(app)/inventory/`. |
| **Complejidad** | Media. |

### 15.4 Edición de Órdenes

**Requisito**: permitir modificar una orden tras enviarla a cocina (agregar/quitar/modificar productos), con historial de cambios.

| | |
|---|---|
| **Estado actual** | `OrderViewSet` permite PATCH sobre `Order` (DRF CRUD). `OrderLine` es editable vía nested o directamente. Al actualizar se emite `ticket.update` por WS. |
| **Gap** | El frontend (`/orders`, `/salon`) probablemente bloquea la edición tras `status != pending`. Falta un modelo/historial de cambios (auditable). Revisar que el PATCH de líneas reemplace/actualice correctamente y reemita WS. |
| **Archivos** | `api/models.py` (nuevo `OrderChangeLog`), `api/views.py` (`OrderViewSet`), `src/app/(app)/orders/`, `src/app/(app)/salon/`, `src/store/order.store.ts`, `src/services/orders.service.ts`. |
| **Complejidad** | Media-alta (UI de edición + historial). |

### 15.5 Cocina (KDS) — edición + descuento de inventario en "Preparado"

**Requisito**: editar/eliminar productos desde el KDS; **el inventario se descuenta únicamente al marcar "Preparado"**, nunca al cobrar.

| | |
|---|---|
| **Estado actual** | `KitchenConsumer` recibe `ticket.new`/`ticket.update`. `Order.status` pasa pending→preparing→ready→served→paid. `InventoryMovement(type="salida")` existe. **No hay descuento de inventario atado a `preparing`/`ready` hoy.** |
| **Gap** | (a) Lado cocina: permitir editar líneas desde el KDS (UI + WS `ticket.update`). (b) **Trigger crítico**: al pasar a `preparing` (o `ready`), generar `InventoryMovement(type="salida")` por cada `OrderLine` × `RecipeIngredient`. (c) Verificar que **ningún** path de cobro (`Sale`/checkout) descuente inventario. |
| **Archivos** | `api/views.py` (`OrderViewSet.perform_update` → descuento), `api/serializers.py`, `api/models.py` (lógica BOM), `src/app/(app)/kitchen/`, `src/components/kitchen/*`, `src/services/kitchen.service.ts`. |
| **Complejidad** | Alta (core de integridad de inventario). **Es la verificación clave del sistema.** |
| **Check de calidad** | ¿Se descuenta en `preparing` y NO en `paid`? ✅ obligatorio. |

### 15.6 Devoluciones (Notas de Crédito)

**Requisito**: módulo de devoluciones que genere nota de crédito, reintegre inventario según flag `puede_regresar_inventario`, motivo obligatorio, y panel de estadísticas en Reportes (filtrado por tenant).

| | |
|---|---|
| **Estado actual** | **No existe** el módulo. No hay modelo de devolución ni nota de crédito. `Product` no tiene flag de reintegro. |
| **Gap** | Crear de cero: modelo `CreditNote` + `CreditNoteLine` (TenantScoped), flag `Product.puede_regresar_inventario`, endpoint `/returns/` con `POST` (motivo obligatorio), reintegro de `InventoryMovement(type="entrada")` condicional, y widget en `/reports`. |
| **Archivos** | `api/models.py` (nuevos modelos + flag), `api/serializers.py`, `api/views.py` (nuevo viewset), `api/urls.py`, migration, `src/app/(app)/returns/` (nuevo módulo), `src/services/*.service.ts`, `src/store/*.store.ts`, `src/app/(app)/reports/`. |
| **Complejidad** | Alta (módulo nuevo end-to-end). |

### 15.7 Reportes — auditoría de aislamiento multi-tenant

**Requisito**: auditar que absolutamente cada query de cada reporte incluya `tenant_id`.

| | |
|---|---|
| **Estado actual** | `ReportsView` y `DashboardSummaryView` usan `resolve_tenant_id` y filtran. El mixin `TenantQuerySet` protege los viewsets CRUD. |
| **Gap** | Auditoría sistemática: revisar **cada** agregación/reporte (dashboard, executive, "salida por plato", devoluciones, web-orders, whatsapp) para confirmar el filtro. Cualquier `Model.objects.aggregate(...)` sin `.filter(tenant_id=...)` debe corregirse. |
| **Archivos** | `api/views.py` (todos los reportes), posibles `api/serializers.py`. |
| **Complejidad** | Baja-media (auditoría + fixes puntuales). |
| **Check de calidad** | Ningún reporte muestra datos globales. ✅ |

### 15.8 Pedidos Web + QR por Mesa (cliente)

**Requisito**: toma de pedidos desde web (PWA) sincronizada con POS y Cocina: QR único por mesa, menú filtrado por tenant, pedido asociado a mesa, estado + tiempo de espera en tiempo real.

| | |
|---|---|
| **Estado actual** | Existe la carta web pública `/restaurant/[slug]` (renderiza menú por tenant) y el módulo `/web-orders` en el POS (feed de pedidos web). `Order.channel="web"` existe. `KitchenConsumer` emite WS. Hay lib `qrcode` y componente `store-qr`. |
| **Gap** | (a) **QR por mesa**: asignar `Table` al QR y pre-asociar la mesa al pedido web (hoy la carta pública no ata mesa). (b) **Envío de pedido web → API**: endpoint público/autenticado que cree `Order(channel="web", table=…)` y emita WS al KDS y POS. (c) **Cliente ve estado + tiempo de espera**: WS cliente→estado de su orden. (d) PWA/manifest. |
| **Archivos** | `src/app/restaurant/[slug]/` (carta + checkout cliente), `api/views.py` (endpoint pedido web + tiempo espera), `api/consumers.py` (evento estado→cliente), `src/app/(app)/web-orders/`, `src/components/website/*`, `src/store/web.store.ts`, `src/components/shared/store-qr.tsx`. |
| **Complejidad** | Alta (full-stack realtime, público + privado). |
| **Check de calidad** | ¿Sincronización bidireccional cliente↔POS↔KDS? ✅ |

### Metodología recomendada (loop por funcionalidad)

Para cada ítem del backlog, aplicar el bucle:

1. **Análisis** — leer modelos/vistas/frontend actuales; identificar el punto de inyección.
2. **Implementación** — código siguiendo las convenciones del proyecto (TenantScoped, serializers camelCase, servicios en frontend).
3. **Prueba (simulación)** — verificar:
   - ¿`tenant_id` en cada consulta?
   - ¿Inventario descuento en `preparing` y **no** en cobro?
   - ¿La edición de órdenes no rompe el KDS?
   - ¿Realtime QR bidireccional?
4. **Corrección** — fix inmediato de errores de lógica, imports faltantes o fugas multi-tenant.
5. **Repetir** — no avanzar hasta que la funcionalidad esté 100% probada.

> **Orden sugerido**: 15.3 (kardex base) → 15.5 (descuento en preparado, depende de kardex) → 15.2 (salida por plato) → 15.7 (auditoría tenant) → 15.4 (edición órdenes) → 15.1 (factura) → 15.6 (devoluciones) → 15.8 (QR web). El núcleo de inventario (15.3/15.5/15.2) es prerrequisito del resto.

---

## 16. Decisiones técnicas y deuda conocida

### Decisiones (justificadas)
- **Multi-tenancy por fila** (shared schema): simplicidad operativa; el aislamiento se garantiza en la capa de app.
- **Tokens de 10 años**: dispositivos POS siempre logueados (trade-off consciente).
- **App única `api`**: velocidad de desarrollo en fase inicial.
- **Mock-first en frontend**: permite desarrollo/demos sin backend.
- **Serializers camelCase**: acoplamiento deliberado con el frontend TS.

### Deuda técnica y riesgos
| Área | Detalle | Mitigación |
|---|---|---|
| **Autorización server-side** | Roles no se aplican como `permission_classes`; cualquier usuario hace CRUD en su tenant. | Añadir `DjangoModelPermissions` o permisos custom por rol en cada viewset. |
| **WebSocket sin aislamiento de tenant** | `KitchenConsumer` no verifica pertenencia al tenant de la ruta WS. | Validar `user.profile.tenant_id` vs ruta en `connect()`. |
| **Tokens de 10 años** | Alto impacto si se filtran. | Rotación + refresh tokens cortos + revocación. |
| **Utilidad hardcoded al 35%** | `ReportsView` calcula utilidad como `revenue * 0.35`, no desde costos reales. | Derivar de `RecipeIngredient` × ventas. |
| **Celery sin tareas** | Infra lista (`celery.py`, Procfile `worker`) pero no existe `api/tasks.py`. | Migrar a tasks: reportes pesados, envío de notas, sync. |
| **App única** | Todo el dominio en `api/`. | Dividir por bounded context (menu, inventory, orders, crm, whatsapp). |
| **Multi-tenancy sin RLS** | Aislamiento sólo a nivel app. | Considerar RLS de Postgres como defensa en profundidad. |
| **Sin tests en backend** | `manage.py test` disponible pero sin suite. | Añadir suite (pytest-django) con foco en multi-tenancy e inventario. |
| **Sin linter en backend** | Sin flake8/ruff/black. | Configurar ruff en CI. |
| **Sin i18n** | UI hardcodeada en español. | Introducir `next-intl` / gettext si se internacionaliza. |
| **Endpoint `physical-count` 404 en prod** | Frontend llama a `/inventory/physical-count/` que no existe en el router. | Implementar action o quitar la llamada. |
| **`FIREBASE_SERVICE_ACCOUNT_JSON` expuesta** | Presente en env de Railway y Vercel, pero pertenece a otro proyecto (`ubicar-3a0db`). | Eliminar de ambos; rotar la clave en IAM. |
| **Variables de backend en Vercel** | `DATABASE_URL`, `POSTGRES_*`, `SECRET_KEY` en el env del frontend (inútiles + riesgo). | Limpiar el env de Vercel. |

---

## 17. Apéndices

### A. Enumeraciones del dominio
- `Tenant.plan`: starter / growth / enterprise
- `Tenant.status`: active / trial / past_due / churned
- `Order.status`: pending / preparing / ready / served / paid
- `Order.channel`: dine_in / takeaway / delivery / web
- `Sale.method`: card / cash / transfer / nequi
- `Table.status`: available / occupied / reserved / billing
- `InventoryItem.status`: normal / low / critical
- `InventoryMovement.type`: inicial / entrada / salida / ajuste
- `Employee.role`: mesero / cocinero / cajero / admin / almacen
- `UserProfile.role`: admin / cashier / waiter / kitchen / warehouse
- `WhatsAppOrder.status`: review / verified / dispatched / rejected
- `Customer.tier`: bronze / silver / gold / platinum

### B. Accesos de demo
- **Backend admin (Django /admin)**: `admin@axispos.co` / `Axis2026!`
- **Frontend (API real)**: misma cuenta; redirige a `/dashboard`.
- **Frontend (mock)**: cualquier credencial con `NEXT_PUBLIC_USE_API=false`.

### C. Planes SaaS (pricing)
| Plan | MRR (COP) |
|---|---|
| starter | 299.000 |
| growth | 599.000 |
| enterprise | 1.200.000 |

### D. Archivos clave (referencia rápida)

**Frontend**
- `package.json`, `next.config.mjs`, `tsconfig.json`, `tailwind.config.ts`
- `src/services/http.ts` — núcleo HTTP / JWT / refresh
- `src/app/(app)/layout.tsx`, `src/components/auth-guard.tsx`, `data-provider.tsx`, `providers.tsx`
- `src/store/*.store.ts` (18 stores), `src/lib/roles.ts`, `nav.ts`, `ai-context.ts`
- `src/types/index.ts` (~430 líneas, map 1:1 con DRF)
- `src/app/api/ai/route.ts`, `src/app/api/whatsapp/webhook/route.ts`

**Backend**
- `requirements.txt`, `config/settings.py`, `config/urls.py`, `config/asgi.py`, `config/celery.py`
- `api/models.py`, `api/serializers.py`, `api/views.py`, `api/urls.py`
- `api/consumers.py`, `api/routing.py`
- `api/migrations/` (0001–0012), `api/management/commands/seed.py`
- `Procfile`, `railway.json`, `.env.example`

---

*Documentación generada el 2026-07-22 a partir del análisis completo de ambos repositorios y de la inspección en vivo de los entornos de Railway y Vercel.*
