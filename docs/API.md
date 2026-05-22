# RETROCONSOLE 1981 — REST API

Base URL: `http://localhost:4000/api`

Auth: send `Authorization: Bearer <token>` (returned by login/register). Cart also works
for guests via an httpOnly `cart_token` cookie. Admin routes require an `admin` role.

All responses are JSON. Errors: `{ "error": "message", "details"?: [...] }`.

## Auth

| Method | Path             | Auth | Body                                   |
| ------ | ---------------- | ---- | -------------------------------------- |
| POST   | `/auth/register` | —    | `{ email, password, firstName?, lastName?, phone? }` |
| POST   | `/auth/login`    | —    | `{ email, password }`                  |
| POST   | `/auth/logout`   | —    | —                                      |
| GET    | `/auth/me`       | user | —                                      |
| PATCH  | `/auth/profile`  | user | `{ firstName?, lastName?, phone? }`    |

## Catalog (public)

| Method | Path                  | Notes |
| ------ | --------------------- | ----- |
| GET    | `/products`           | Query: `q, category, rarity, minPrice, maxPrice, sort(newest\|price_asc\|price_desc\|name), page, limit` |
| GET    | `/products/featured`  | Top 8 for the homepage |
| GET    | `/products/:slug`     | Product detail |
| GET    | `/categories`         | Category tree |
| GET    | `/shipping-methods`   | Enabled methods |
| GET    | `/payment-methods`    | Enabled methods |

## Cart (guest or user)

| Method | Path                    | Body                       |
| ------ | ----------------------- | -------------------------- |
| GET    | `/cart`                 | —                          |
| POST   | `/cart/items`           | `{ productId, quantity }`  |
| PATCH  | `/cart/items/:itemId`   | `{ quantity }` (0 removes) |
| DELETE | `/cart/items/:itemId`   | —                          |

## Checkout

| Method | Path                | Body |
| ------ | ------------------- | ---- |
| POST   | `/checkout/totals`  | `{ shippingMethodId }` → `{ subtotal, shippingFee, total }` |
| POST   | `/checkout`         | `{ email, address{...}, shippingMethodId, paymentMethod }` |

## Account (user)

| Method | Path                          | Notes |
| ------ | ----------------------------- | ----- |
| GET    | `/account/orders`             | Order history |
| GET    | `/account/orders/:orderNumber`| Order detail |
| GET    | `/account/addresses`          | List |
| POST   | `/account/addresses`          | Create |
| PATCH  | `/account/addresses/:id`      | Update |
| DELETE | `/account/addresses/:id`      | Delete |

## Admin (role: admin)

| Method | Path | Notes |
| ------ | ---- | ----- |
| GET    | `/admin/stats` | Dashboard overview |
| GET    | `/admin/email-logs` | Query: `status, page, limit` |
| GET/POST | `/admin/products` · `POST` create | Query `q, page, limit` |
| GET/PUT/DELETE | `/admin/products/:id` | Read / update / delete |
| GET/POST | `/admin/categories` · `POST` create | |
| PUT/DELETE | `/admin/categories/:id` | |
| GET    | `/admin/orders` | Query `status, q, page, limit` |
| GET    | `/admin/orders/:id` | Detail |
| PATCH  | `/admin/orders/:id/status` | `{ status }` → queues customer email |
| PATCH  | `/admin/orders/:id/tracking` | `{ trackingNumber }` |
| PATCH  | `/admin/orders/:id/payment` | `{ status }` |
| GET    | `/admin/customers` · `/admin/customers/:id` | List / profile |
| GET/POST | `/admin/shipping` · `POST` create | |
| PUT/DELETE | `/admin/shipping/:id` | |
| GET    | `/admin/payments` | Masked API keys |
| PUT    | `/admin/payments/:method` | `{ enabled?, label?, config? }` |
| GET/PUT | `/admin/smtp` | Get / update SMTP settings |
| POST   | `/admin/smtp/test-connection` | Verify SMTP |
| POST   | `/admin/smtp/test-email` | `{ to }` |
| GET    | `/admin/templates` · `/admin/templates/:key` | List / get |
| PUT    | `/admin/templates/:key` | `{ name?, subject?, body?, enabled? }` |
| POST   | `/admin/templates/:key/preview` | Render with sample data |

## Email template variables

`{{customer_name}}` `{{order_id}}` `{{order_total}}` `{{order_items}}`
`{{shipping_address}}` `{{tracking_number}}`

Template keys: `order_confirmation`, `payment_confirmation`, `order_shipped`,
`order_delivered`, `order_cancelled`.
