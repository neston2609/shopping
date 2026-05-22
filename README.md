# RETROCONSOLE 1981 — Retro Game Emporium

A full-stack e-commerce platform with a retro arcade theme: a customer storefront and an
admin control panel, backed by a REST API. Built from the **RETROCONSOLE 1981** design
(Press Start 2P + VT323 fonts, CRT scanlines, chunky pixel borders, products styled as
collectible cartridges/consoles with rarity tiers and RPG stat bars).

## Tech stack

| Layer            | Choice                                         |
| ---------------- | ---------------------------------------------- |
| Backend API      | Node.js + Express (REST)                       |
| Database         | PostgreSQL (remote)                            |
| ORM              | Prisma                                         |
| Storefront       | React (Vite SPA)                               |
| Admin dashboard  | React (Vite SPA)                               |
| Auth             | JWT (bearer token) + bcrypt password hashing   |
| Email            | Nodemailer + in-process async queue            |

## Repository layout

```
/backend          Express REST API + Prisma schema, migrations, seed
/frontend         Customer storefront (RETROCONSOLE 1981 design)
/admin-dashboard  Admin control panel
/shared           Shared domain constants (order/payment statuses, roles…)
/database         Database notes + raw SQL reference
```

## Prerequisites

- Node.js 18+ (tested on 24)
- A reachable **PostgreSQL** database and its connection string

## 1. Backend setup

```bash
cd backend
cp .env.example .env            # then edit .env (see below)
npm install
npx prisma migrate dev --name init   # creates tables on your remote Postgres
npm run db:seed                 # roles, admin, demo products, shipping, templates…
npm run dev                     # API on http://localhost:4000
```

Health check: <http://localhost:4000/api/health>

### Required `.env` values

- `DATABASE_URL` — your remote Postgres URL, e.g.
  `postgresql://user:pass@host:5432/retroconsole?schema=public&sslmode=require`
- `JWT_SECRET` — any long random string
- `ENCRYPTION_KEY` — 64 hex chars (32 bytes). Generate with `openssl rand -hex 32`.
  Used to encrypt SMTP passwords and payment API keys at rest.
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — the admin account created by the seed.
- Optional `SMTP_*` — pre-fills the Gmail SMTP settings row on seed.

### Seeded logins

- **Admin:** `admin@retroconsole1981.gg` / `Admin1981!`
- **Customer:** `player1@retroconsole1981.gg` / `Player1981!`

## 2. Storefront setup

```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

The dev server proxies `/api` to the backend (`http://localhost:4000` by default; override
with `VITE_API_PROXY` in `.env`).

## 3. Admin dashboard setup

```bash
cd admin-dashboard
npm install
npm run dev                     # http://localhost:5174
```

Sign in with the seeded admin credentials.

## Features

### Storefront
- Browse categories, product grid, product detail (cartridge/console art, rarity, stats)
- Search + filter by category / rarity / price, with sorting and pagination
- Guest **and** logged-in cart (guest cart merges into the user cart on login)
- 4-step checkout: address → shipping method → payment method → confirm
- Customer accounts: register, login, profile, saved shipping addresses, order history
- Free shipping over $50; pixel-coin loyalty (1 coin per $1 spent)

### Admin dashboard
- Dashboard stats (revenue, orders, low-stock alerts, recent orders)
- Products: full CRUD incl. multiple images, attributes (size/color), SKU, stock, enable/disable, rarity
- Categories: CRUD with parent/child hierarchy
- Orders: list/filter, detail, status transitions (auto-emails), tracking numbers, payment status
- Customers: list + profile with order history
- Shipping methods: CRUD, fees, zones, enable/disable
- Payment methods: enable/disable + encrypted API keys (card, Stripe, PayPal, COD)
- SMTP settings: Gmail defaults, test connection, send test email
- Email templates: edit + live preview with `{{variables}}`
- Email logs: delivery status + errors

## Emails

Order events queue templated emails asynchronously (in-process queue; swap for
BullMQ/Redis to scale). Until SMTP credentials are configured **and enabled** in the admin
panel, the mailer uses Nodemailer's dev (`jsonTransport`) — emails are *logged* but not
actually delivered, so the app stays runnable out of the box. See
[`docs/API.md`](docs/API.md) for the endpoint reference and
[`database/README.md`](database/README.md) for the data model.

## Notes & scope

This is a **runnable full-stack foundation**. Payment gateways (card/Stripe/PayPal) are
**simulated** — orders are marked paid instantly; COD stays pending. The structure
(encrypted key storage, per-method config, payment records) is in place to wire real SDKs.

## Production build

```bash
# backend
cd backend && npx prisma migrate deploy && npm start
# storefront / admin
cd frontend && npm run build           # outputs dist/
cd admin-dashboard && npm run build     # outputs dist/
```
