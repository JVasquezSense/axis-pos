# Axis POS — Demo SaaS para Restaurantes

Demo funcional **solo frontend** de una plataforma SaaS multi-tenant para restaurantes,
diseñada con calidad enterprise para presentación a inversionistas y clientes potenciales.

> Inspiración de producto: Toast POS · Square · Lightspeed · Stripe Dashboard · Linear.

## ✨ Stack

- **Next.js 15** (App Router) + **TypeScript** estricto
- **TailwindCSS** + sistema de design tokens (light / dark mode)
- Componentes estilo **Shadcn/UI** (Radix primitives) — `src/components/ui`
- **Zustand** para estado temporal (rol, pedido, carrito web)
- **Recharts** para gráficas · **Framer Motion** para animaciones
- **Lucide Icons** · **Sonner** (toasts)
- Responsive · Mobile First

## 🧱 Arquitectura

```
src/
├─ app/                # Rutas (App Router)
│  ├─ (app)/           # Grupo con layout del panel (sidebar + header)
│  └─ restaurant/[slug]/  # Sitio web público del restaurante
├─ components/
│  ├─ ui/              # Primitivos reutilizables (atomic design)
│  ├─ dashboard/ salon/ orders/ kitchen/ reports/ crm/ checkout/ website/
│  └─ shared/          # KPI card, sparkline, page header, empty state…
├─ services/           # ⭐ Capa de API — único punto de acceso a datos
├─ store/              # Estado Zustand
├─ hooks/              # useAsync (data fetching genérico)
├─ types/              # Tipos de dominio (mapean a serializers DRF)
├─ mock/               # Datos simulados realistas
├─ layouts/            # Sidebar, Header, AppShell, MobileNav
└─ lib/                # utils, roles, nav, status, payments
```

### Regla clave: los componentes **nunca** consumen datos directamente

Todo dato pasa por un servicio (`src/services/*.service.ts`) que hoy resuelve
mocks con latencia simulada y mañana llamará a Django REST Framework. El único
archivo a tocar para conectar el backend real es [`src/services/http.ts`](src/services/http.ts).

```ts
// Hoy (mock)
return mockRequest(DASHBOARD, 700);

// Mañana (real) — misma firma, mismos tipos
return request<DashboardData>("/dashboard/summary/");
```

Tiempo real (KDS / pedidos web) está encapsulado en `kitchenService.subscribe()`,
listo para reemplazarse por un WebSocket de **Django Channels**.

## 📦 Módulos

| # | Módulo | Ruta | Highlights |
|---|--------|------|-----------|
| 1 | Dashboard | `/dashboard` | KPIs animados, ventas por hora/día, top productos, alertas, skeletons |
| 2 | Salón | `/salon` | Mapa interactivo de mesas, estados, drawer con acciones |
| 3 | Toma de pedidos | `/orders` | Interfaz tipo tablet, modificadores, observaciones, resumen |
| 4 | Cocina KDS | `/kitchen` | Kanban, color por demora, actualización en vivo (WS-ready) |
| 5 | Caja y cobro | `/checkout` | Propina, descuento, métodos (Efectivo, Tarjeta, Nequi, Daviplata, PSE), factura |
| 6 | Inventario | `/inventory` | Tabla avanzada, búsqueda, filtros, export CSV, estados de stock |
| 7 | Clientes CRM | `/crm` | Fidelización, niveles, historial, puntos, cupones |
| 8 | Reportes | `/reports` | Líneas, barras y donut; rentabilidad ejecutiva |
| 9 | Página web | `/website` + `/restaurant/demo-burger` | E-commerce que sincroniza pedidos con el POS en vivo |
| 10 | Super Admin SaaS | `/admin` | MRR, suscripciones, tenants, consumo |

## 🎭 Roles

Selector en el header: **Administrador / Mesero / Cajero / Cocina**.
La navegación y la ruta inicial se adaptan al rol (`src/lib/roles.ts`).

## 🚀 Uso

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build de producción
npm start        # servir el build
```

## ▲ Despliegue en Vercel

El proyecto está listo para Vercel (framework autodetectado: **Next.js**).

**Opción A — Git (recomendado):**
1. Sube el repositorio a GitHub/GitLab/Bitbucket.
2. En [vercel.com/new](https://vercel.com/new) importa el repo.
3. Build Command `next build` · Output `.next` · Install `npm install` (autodetectado).
4. Deploy. No requiere variables de entorno (los mocks funcionan sin backend).

**Opción B — CLI:**
```bash
npm i -g vercel
vercel          # preview
vercel --prod   # producción
```

**Variables de entorno (opcionales)** — solo al conectar el backend real (ver `.env.example`):
`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`. Configúralas en *Project → Settings → Environment Variables*.

> Node ≥ 18.18 (definido en `engines`). La demo es 100% frontend, sin backend ni autenticación.

## 🔌 Backend (repositorio separado)

El backend (Django + DRF + Channels, listo para Railway) vive en su propio repo:
**https://github.com/JVasquezSense/axis-pos-backend**

Para conectar el frontend al backend real:
1. En `.env.local` define `NEXT_PUBLIC_USE_API=true` y `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL`.
2. El `request()` real ya está implementado en `src/services/http.ts`.
3. En cada servicio, cambia `mockRequest(...)` por `request<T>("/endpoint/")`.

Los tipos de `src/types` mapean 1:1 con los serializers DRF.

---

_Demo construida como pieza comercial. No incluye backend ni autenticación reales._
