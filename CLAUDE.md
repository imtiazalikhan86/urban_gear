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
- Self-service password change: `PATCH /api/v1/auth/me/password` verifies the current password with bcrypt, requires a different new password of at least 12 characters, and returns 204.
- Administrator reset: `POST /api/v1/users/{id}/reset-password` sets a password without knowing the old one.
- `POST /api/v1/auth/refresh` exchanges a refresh token for a new access token and rotates the refresh token; `POST /api/v1/auth/logout` revokes one. Login returns both tokens.
- Refresh tokens are 32 random bytes stored as a SHA-256 digest in `refresh_tokens`, valid for `REFRESH_TOKEN_TTL_DAYS` (default 30), single use. Presenting an already revoked token is treated as theft and revokes every refresh token for that user.
- A password change or reset revokes all refresh tokens for that user. Access tokens stay valid until `JWT_EXPIRES_IN` elapses, because they are stateless.
- The frontend refreshes transparently: `services/http.ts` retries a 401 once behind a single-flight guard so parallel requests share one rotation, and emits `urbangear:unauthorized` when refresh fails so `App` can end the session.

### Forgot Password

- `POST /api/v1/auth/password/forgot` always answers 202, whether or not the email matches an account, so it cannot be used to enumerate registered addresses. Suspended users receive nothing.
- `POST /api/v1/auth/password/reset` exchanges the emailed token for a new password of at least 12 characters.
- Tokens are 32 random bytes; only their SHA-256 digest is stored in `password_reset_tokens`. They expire after `PASSWORD_RESET_TTL_MINUTES` (default 30) and are single use: a successful reset burns every outstanding token for that user in the same transaction as the password write.
- Both endpoints are rate limited to 5 requests per 15 minutes.
- Mail goes through `src/lib/mailer.ts`. Without `SMTP_HOST` the message is written to the log instead of sent, which is how local development follows a reset link; production start-up fails without `SMTP_HOST` so live reset emails cannot be silently swallowed.
- The emailed link is `APP_BASE_URL/reset-password?token=...`. The frontend has no router, so it reads the token from the query string on any path; static hosting needs an SPA fallback for that URL.
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
- `search` on the product list matches name, description, SKU, and category, case-insensitively. `ProductWhereInput` in `product.repository.ts` is hand-written, so widening the query means widening that type too.
- Product deletion is currently a hard delete; user deletion is a soft suspension.
- The frontend reference template under `WB095FRJM-v1-0-0/` is not integrated with the backend.
- Do not use `npx prisma` without pinning the project-local version; use `node_modules/.bin/prisma` or the npm scripts.
- Do not use development migration commands in production.

## Frontend Architecture

The maintainable frontend lives under `frontend/` and is a React/Vite PWA built on the purchased template's own stylesheets, copied into `frontend/src/theme/` from `WB095FRJM-v1-0-0/template/`:

- `theme/css/bootstrap.min.css` (the template's Bootstrap 5.3 build), `theme/css/materialdesignicons.min.css` with `theme/fonts/`, and `theme/css/template.css` (the template's own `css/style.css`). `bootstrap-icons` comes from npm for the few `bi` classes the template uses. They are imported in that order in `main.tsx`, before the small `styles.css` that holds only app-specific additions.
- Build screens from template classes, not hand-written CSS: page shell `osahan-page` / `osahan-page-header` / `osahan-page-body`, cards `bg-white rounded-4 shadow-sm`, product cards `osahan-card-2`, buttons `btn btn-primary rounded-4 btn-lg`, inputs `input-group bg-white rounded-4 shadow p-1` with an `mdi` icon, filters `nav nav-pills rounded-pill` + `btn btn-outline-primary`, round icon buttons `icon-sm shadow-sm`, small print `little-text`.
- Icons are Material Design Icons (`<i className="mdi mdi-..." />`). Do not add an icon component library.
- `components/ui` keeps only what the template does not provide directly: `Button`, `Field`, and `Toast`. Cards and badges use template markup inline.
- The template is phone-first, so `.osahan-page` is capped at 560px and centred on wide screens, with a fixed bottom navigation and an off-canvas drawer.

- Routing uses `react-router-dom`. `src/App.tsx` declares the routes and the session bootstrap; `src/layouts/AppLayout.tsx` holds the chrome (sidebar, drawer, header, bottom navigation, toast) and renders an `<Outlet />`.
- The search field lives once, in the layout header: typing navigates to `/search?q=` after a 300ms debounce, and `SearchPage` renders results for that param. Do not add a second search input, and do not sync the URL back into the field while it has focus.
- Navigation is role-aware in `AppLayout`: each nav entry declares `roles` and `bottomNavFor`. Resellers get Cart and Alerts; admins get Users and Orders in the bottom bar instead. Admins never see cart controls, the header bell, the margin panel, or the notification stream, and `RequireRole` in `App.tsx` redirects a wrong-role URL to `/`.
- Screens live in `src/pages`: `HomePage` (catalog and the admin product form), `SearchPage`, `CartPage` (quote preview and order placement), `AlertsPage`, `ProfilePage` (margin, password, orders, sign out), plus the signed-out `LoginPage` and `ResetPasswordPage`.
- `/` `/search` `/products/:id` `/profile` `/orders` require a token; `/cart` and `/alerts` are reseller-only and `/users` is admin-only; `/login` and `/reset-password` are public. Tapping a notification marks it read and opens `/products/:id` for the product it announced; a deleted product returns 404 and the page shows a 'no longer in the catalog' state. Static hosting needs an SPA fallback for these paths.
- Use Redux Toolkit for cross-screen state such as authentication and session data. Current slices: `auth`, `cart` (lines plus the last quote preview), `notifications`, and `ui` (the toast). Anything two screens share belongs in a slice, not in a page.
- Use the shared Axios client in `frontend/src/services/http.ts` for common `get`, `post`, `put`, `patch`, and `delete` calls.
- Keep domain API calls in `frontend/src/services`, not inside components.
- Keep reusable presentation primitives in `frontend/src/components/ui`.
- Use RTK Query later only if server-cache complexity grows; the current Axios service layer is intentionally explicit and matches the backend contracts.
- Keep customer pricing derived through quote preview; never display reseller cost as a customer price.
