# Urban Gear Backend

Backend API for the Urban Gear reseller platform. The first slice exposes a read-only product catalog; authenticated product management will be added with the admin/reseller identity module.

## Stack

- Node.js + TypeScript + Express
- PostgreSQL + Prisma
- Zod request validation
- Pino structured logging

## Local setup

1. Install Node.js 20+ and PostgreSQL 15+.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and set `DATABASE_URL`.
4. Run `npm run db:generate`.
5. Run `npm run db:migrate -- --name init`.
6. Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `.env` and run `npm run db:seed`.
7. Run `npm run dev`.

## Product API

- `GET /health`
- `GET /api/openapi.json`
- `GET /api/docs` for interactive Swagger UI testing
- `GET /api/v1/products?page=1&pageSize=20&category=Bags&minPrice=500&maxPrice=2000&available=true&search=urban`
- `GET /api/v1/products/:id`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me` with a Bearer access token
- `PATCH /api/v1/auth/me/margin` to save the authenticated user's margin percentage
- `POST /api/v1/quotes/preview` to calculate customer pricing before creating an order
- `POST /api/v1/orders` to place a bulk order from a quote selection
- `GET /api/v1/orders` to list reseller-owned orders or admin orders
- `GET /api/v1/orders/:id` to view an order
- `PATCH /api/v1/orders/:id/status` for admins to confirm or cancel pending orders
- `GET /api/v1/users` with an admin Bearer access token
- `POST /api/v1/users` to create an admin or reseller user
- `PATCH /api/v1/users/:id` to update user details, role, or status
- `POST /api/v1/users/:id/reset-password` to reset a user password
- `DELETE /api/v1/users/:id` to suspend a user without removing audit history
- `POST /api/v1/products` with an admin Bearer access token
- `PATCH /api/v1/products/:id` with an admin Bearer access token
- `DELETE /api/v1/products/:id` with an admin Bearer access token

Product reads and quote previews require an active `ADMIN` or `RESELLER` token. Product mutations require an `ADMIN` token. The catalog price is the reseller cost price; customer-facing pricing must come from quote preview.
User management is also `ADMIN` only. There is no public registration endpoint; administrators create reseller accounts.
Product prices represent reseller cost prices. Quote preview applies the reseller's saved margin, or a temporary margin supplied in the preview request, and returns customer-facing prices without exposing the cost price. No order is created by preview.

## Frontend

The reusable React/Vite PWA workspace is under `frontend/`. The original static template under `WB095FRJM-v1-0-0/template/` remains available as a visual reference while screens are migrated.

```bash
cd frontend
npm install
npm run dev
```

The frontend uses Redux Toolkit for app/session state and a shared Axios service layer for API calls. Set `VITE_API_URL` to override the default backend URL.

## Production security checklist

- Set `NODE_ENV=production` and provide a strong random `JWT_SECRET` of at least 32 characters.
- Set production `JWT_ISSUER`, `JWT_AUDIENCE`, and `CORS_ORIGIN` values.
- Replace the seeded admin password before deployment.
- Use a managed PostgreSQL instance with TLS, backups, restricted network access, and a dedicated database role.
- Put the API behind HTTPS and a reverse proxy or load balancer.
