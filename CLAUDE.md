# Urban Gear Backend

## Project Purpose

Urban Gear is a reseller platform for browsing products, managing reseller accounts, applying reseller margins, previewing customer pricing, and placing future bulk orders. The current repository contains the backend API and a separate reference frontend template.

See [README.md](README.md) for setup and [Requirement.txt](Requirement.txt) for the broader product requirements.

## Stack

- Node.js 20+ and TypeScript 5.9
- Express 5 with ESM modules
- PostgreSQL and Prisma 6
- Zod for request validation
- JWT with HS256 for access tokens
- bcryptjs for password hashing
- Helmet, CORS, express-rate-limit, and Pino logging
- Swagger UI generated from route annotations with centralized OpenAPI schemas

## Architecture

Backend code lives under `src/` and follows:

```text
routes -> controllers -> services -> repositories
```

- `src/config`: validated environment configuration
- `src/lib`: shared clients such as Prisma and logger
- `src/modules`: domain modules (`auth`, `users`, `products`, `quotes`, `orders`, `notifications`)
- `src/shared`: errors, async handlers, and HTTP middleware
- `src/docs/openapi.ts`: Swagger/OpenAPI generator and shared schemas
- `prisma/schema.prisma`: database schema
- `prisma/migrations`: committed database migrations
- `tests`: Vitest and Supertest API tests
- `frontend/src/components/ui`: reusable frontend UI primitives
- `frontend/src/services`: Axios client and domain API services
- `frontend/src/store`: Redux Toolkit state

Keep business rules in services, database access in repositories, and request parsing in schemas/controllers. Prefer small domain types when generated Prisma types create editor/tooling issues.

## Commands

```bash
npm install
npm run db:generate
npm run db:migrate -- --name <migration-name>
npm run db:seed
npm run dev
npm run lint
npm test
npm run build
npm run start
node_modules/.bin/prisma studio
```

Swagger is available at `http://localhost:3000/api/docs`; the raw specification is at `/api/openapi.json`.

For production migrations, use Prisma's deployment workflow (`prisma migrate deploy`) rather than `prisma migrate dev`.

## Authentication And Roles

- Login: `POST /api/v1/auth/login`
- Current user: `GET /api/v1/auth/me`
- JWT verification requires the configured secret, issuer, audience, and HS256 algorithm.
- Protected requests reload the user from PostgreSQL and reject suspended users.
- `ADMIN` users manage users and product mutations.
- `RESELLER` users browse products and preview customer quotes.
- There is no public registration endpoint; administrators create users through `/api/v1/users`.
- Login is rate-limited to 10 attempts per 15 minutes.
- User deletion is implemented as suspension to preserve audit history.

Never return password hashes or passwords. Prevent self-suspension and removal of the last active administrator.

## Margin And Quote Workflow

The stored product `price` is the reseller cost price. A user has a persisted `marginPercent`.

- `PATCH /api/v1/auth/me/margin` saves the authenticated user's default margin.
- `POST /api/v1/quotes/preview` calculates customer-facing prices before an order exists.
- A quote may supply a temporary margin override.
- Quote responses must not expose cost prices.
- Use currency-safe rounding and reject mixed currencies in one quote.

The quote preview is not an order. Implement order creation separately with inventory, pricing snapshots, status transitions, and audit history.

Order creation now stores immutable cost and customer-price snapshots internally, but order responses must never expose `costPrice`. Resellers may list and view only their own orders; admins may review all orders and change pending status.

## Product Notifications

Creating a product fans out an in-app notification to every active `RESELLER`.

- `GET /api/v1/notifications` lists the authenticated user's notifications with `meta.unread`; `unreadOnly=true` filters to unread items.
- `PATCH /api/v1/notifications/{id}/read` marks one notification read and returns 404 when it does not belong to the caller.
- `GET /api/v1/notifications/stream` is a Server-Sent Events stream: a `ready` event carrying the unread count, a `notification` event per new alert, and heartbeat comments every 25 seconds.
- The fan-out runs after a successful product insert in `createProduct`, and is skipped when no active reseller exists. It persists rows with `createManyAndReturn` and then pushes each row to that reseller's open streams.
- Delivery uses the in-process emitter in `notification.events.ts`, so real-time push only works while one backend instance is running. Replace it with Postgres `LISTEN/NOTIFY` or Redis pub/sub before scaling horizontally; the REST endpoints keep working either way.
- The frontend subscribes with `fetch` rather than `EventSource` so the bearer token stays in a header, and reconnects with exponential backoff.
- Notification payloads expose only the product `id`, `name`, and `slug`; never the cost price.

## Environment And Security

Required configuration is validated when the application starts:

- `DATABASE_URL`
- `JWT_SECRET` with at least 32 characters
- `JWT_EXPIRES_IN`
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `CORS_ORIGIN`

Do not commit `.env` or real credentials. Development currently uses local PostgreSQL and placeholder secrets; replace all placeholders, use a secret manager, HTTPS, restricted database access, backups, and a non-localhost CORS origin before deployment.

## Validation Expectations

After backend changes, run the narrowest relevant test first, then:

```bash
npm run lint
npm test
npm run build
```

Tests mock repositories, so passing tests do not replace PostgreSQL migration/integration testing. When changing the schema, run `npm run db:generate`, create a named migration, and verify the migration against a real development database.

## Important Pitfalls

- OpenAPI operations are generated from `@openapi` annotations next to route definitions; update the annotation whenever a public endpoint changes.
- Product reads require an active `ADMIN` or `RESELLER`; the returned `price` is the reseller cost price and must not be treated as customer-facing pricing.
- Product deletion is currently a hard delete; user deletion is a soft suspension.
- The frontend reference template under `WB095FRJM-v1-0-0/` is not integrated with the backend.
- Do not use `npx prisma` without pinning the project-local version; use `node_modules/.bin/prisma` or the npm scripts.
- Do not use development migration commands in production.

## Frontend Architecture

The maintainable frontend lives under `frontend/` and is a React/Vite PWA that reuses the purchased template's visual language and logo assets from `WB095FRJM-v1-0-0/template/`: pink primary theme, Instrument Sans/Sora typography, rounded white cards, and mobile bottom navigation.

- Use Redux Toolkit for cross-screen state such as authentication and session data.
- Use the shared Axios client in `frontend/src/services/http.ts` for common `get`, `post`, `put`, `patch`, and `delete` calls.
- Keep domain API calls in `frontend/src/services`, not inside components.
- Keep reusable presentation primitives in `frontend/src/components/ui`.
- Use RTK Query later only if server-cache complexity grows; the current Axios service layer is intentionally explicit and matches the backend contracts.
- Keep customer pricing derived through quote preview; never display reseller cost as a customer price.
