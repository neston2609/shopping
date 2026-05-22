# Database

PostgreSQL, managed with **Prisma**. The single source of truth is
[`../backend/prisma/schema.prisma`](../backend/prisma/schema.prisma).

## Creating the schema

```bash
cd ../backend
npx prisma migrate dev --name init    # generates SQL migration + applies it
npm run db:seed                       # populates demo data
```

Generated SQL migrations live in `backend/prisma/migrations/`. To export raw DDL without
applying it:

```bash
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma \
  --script > ../database/schema.sql
```

## Tables (mapped names)

| Model              | Table                | Purpose |
| ------------------ | -------------------- | ------- |
| Role               | `roles`              | `admin` / `customer` |
| User               | `users`              | Accounts, hashed passwords, loyalty coins |
| Category           | `product_categories` | Self-referencing parent/child tree |
| Product            | `products`           | Catalog: price, discount, SKU, stock, status, rarity |
| ProductImage       | `product_images`     | Ordered images per product |
| ProductAttribute   | `product_attributes` | size / color etc. |
| Cart               | `carts`              | User cart or guest cart (token) |
| CartItem           | `cart_items`         | Unique per (cart, product) |
| Order              | `orders`             | Status, totals, shipping snapshot, tracking |
| OrderItem          | `order_items`        | Line items (price/name snapshot) |
| Payment            | `payments`           | Method, status, amount, transaction id |
| ShippingMethod     | `shipping_methods`   | Fees, zones, enable flag |
| ShippingAddress    | `shipping_addresses` | Saved customer addresses |
| PaymentMethodConfig| `payment_methods`    | Enable flag + encrypted API keys |
| SmtpSettings       | `smtp_settings`      | SMTP host/port/credentials (password encrypted) |
| EmailTemplate      | `email_templates`    | Subject/body with `{{variables}}` |
| EmailLog           | `email_logs`         | Delivery audit trail |

## Relationships & indexes

- `users.role_id → roles.id`
- `products.category_id → product_categories.id` (nullable, `SetNull` on delete)
- `product_categories.parent_id → product_categories.id` (self-referential tree)
- `product_images`, `product_attributes`, `cart_items` → cascade-delete with parent
- `orders.user_id → users.id` (`SetNull`), `order_items.order_id → orders.id` (cascade)
- `payments.order_id` is **unique** (one payment per order)
- Indexes on: product `category_id, status, rarity, price`; order `user_id, status, created_at`;
  category `parent_id, slug`; email log `status, related_order_id`.

## Secrets at rest

`smtp_settings.password_enc` and `payment_methods.config_enc` store AES-256-GCM ciphertext.
The key is the `ENCRYPTION_KEY` env var (32 bytes / 64 hex chars). Rotating the key
invalidates previously stored secrets — re-enter them in the admin panel after rotation.
