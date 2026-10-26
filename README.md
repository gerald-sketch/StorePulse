# StorePulse — Small Business Management SaaS

One platform for small businesses to manage their entire operation: inventory, POS, purchasing, suppliers, customers, staff, expenses, and reporting. Built for the Philippine market — VAT-inclusive pricing, GCash/Maya QR payments, peso formatting throughout.

**[Live Demo](https://StorePulsee.vercel.app)** · **[API Status](https://StorePulse.onrender.com/api/health)** · **[Report a Bug](https://github.com/gerald-sketch/StorePulse/issues)**

> **Status:** ✅ Deployed and live — [StorePulsee.vercel.app](https://StorePulsee.vercel.app)
>
> The live demo runs on free tiers (Render + Vercel + Neon). The first request after 15 minutes of inactivity may take 30–50 seconds while the API cold-starts.

---

## Stack

| Layer           | Technology                                                                       |
| --------------- | -------------------------------------------------------------------------------- |
| **Frontend**    | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query              |
| **Backend**     | Node.js, Express 5, TypeScript                                                   |
| **Database**    | PostgreSQL 16, Prisma 7 with `@prisma/adapter-pg` driver adapter                 |
| **Validation**  | Zod — schemas shared between frontend and backend via `@sb/shared`               |
| **Auth**        | JWT (15-min access + 7-day refresh), bcrypt (12 rounds), HTTP-only cookies, RBAC |
| **Payments**    | PayMongo (hosted checkout + HMAC-verified webhooks)                              |
| **Forecasting** | Statistical demand forecasting from 30-day sales velocity                        |
| **Structure**   | npm workspaces monorepo                                                          |
| **Deployment**  | Vercel (frontend) · Render (API) · Neon (database)                               |

---

## Modules

### Core Operations

- **Auth** — register, login, refresh token rotation, logout, RBAC (OWNER / MANAGER / STAFF), self-service password reset
- **Dashboard** — today's sales, MTD revenue, inventory value, low-stock alerts, recent activity, dual-axis sales chart
- **POS** — cart, product search, category filter, discounts, cash tender with change, GCash/Maya QR display, receipt printing, idempotent checkout
- **Products** — CRUD, categories, pricing, stock levels, soft delete
- **Inventory** — stock in/out/adjust with row-level locking, low-stock alerts, category and status filters, colored stock-level bars

### Business Management

- **Customers** — profiles, purchase history, loyalty points
- **Suppliers** — directory, contact info, purchase history per supplier
- **Purchases** — purchase orders, receive-to-stock-in flow, status tracking
- **Employees** — staff accounts, role management, password resets
- **Expenses** — categorized operating costs, monthly totals by category

### Intelligence & Reporting

- **Reports** — sales summary (day/week/month), profit & loss, inventory valuation, top products, CSV export
- **Forecasting** — demand predictions from sales velocity, reorder alerts, stockout projections, fast/slow movers, dead stock detection
- **Team Performance** — per-staff sales analytics with drill-down views

### Billing & Settings

- **Billing** — PayMongo subscription infrastructure (implemented, disabled for the demo)
- **Settings** — business profile, VAT configuration, GCash/Maya QR code upload

---

## Engineering Highlights

These are the parts worth reading the code for.

### Idempotency on every write

Every mutating request carries a client-generated `Idempotency-Key`. The server stores the response and replays it on retry. **A double-click on "Checkout" cannot create two sales, double-charge a customer, or deduct stock twice.**

## Naming Conventions

- Use `camelCase` for variables, functions, object fields, and JSON properties.
- Use `PascalCase` for React components, classes, TypeScript types/interfaces, and Zod schemas.
- Use `UPPER_SNAKE_CASE` for environment variables and module-level constants that represent fixed configuration.
- Keep feature directories lowercase; name API files by role, such as `auth.controller.ts`, `auth.service.ts`, and `auth.routes.ts`.
- Use singular `PascalCase` Prisma model names with `camelCase` fields. Keep HTTP route segments lowercase and kebab-case.
