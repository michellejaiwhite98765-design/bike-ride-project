# BikeRide

A bike-based ride-sharing and route-matching platform. Riders already travelling from A to B publish their journey and offer their empty seat(s) to passengers heading the same way — with an optional tip, never a taxi fare.

## 1. Project Overview

BikeRide connects two roles a single account can hold at once:

- **Rider** — publishes an existing journey (source, destination, date/time, vehicle, seats) and chooses `WITH_TIP` (passenger pays a rider-set tip + flat platform fee) or `WITHOUT_TIP` (free).
- **Passenger** — searches for nearby published rides, requests to join, and once accepted either pays (WITH_TIP) or is confirmed immediately (WITHOUT_TIP).

Core flow: **Register → Login → Add Vehicle → Create Ride → Publish → Passenger Searches → Match Appears → Request → Accept → (Payment if WITH_TIP) → Booking Confirmed → Ride Started → Ride Completed → Rating → History.**

Every stage is persisted in PostgreSQL — the frontend holds no authoritative state.

## 2. Architecture

```
backend/    Node.js + Express, layered: routes → controllers → services → repositories → pg/PostgreSQL
frontend/   React + Vite, Ant Design + styled-components, React Router, Axios, Day.js
```

**Backend layers** (`backend/src/`):

- `routes/` — Express routers + OpenAPI (`@openapi`) JSDoc annotations
- `controllers/` — thin HTTP handlers, no business logic
- `services/` — business rules, state machines, transactions
- `repositories/` — the only layer that talks to the database, via parameterized SQL through `pg` (node-postgres)
- `middleware/` — auth (JWT), authorization (role), validation (Zod), rate limiting, error handling
- `utils/` — `ApiError`, consistent response helpers, audit logging, geo math, state machine guards, SQL row-mapping helpers

**Data layer**: PostgreSQL + PostGIS, accessed directly through `pg` — no ORM. `backend/src/config/db.js` exposes a connection `pool` and a `withTransaction()` helper (`BEGIN`/`COMMIT`/`ROLLBACK` around a checked-out client). Schema changes live as plain SQL files under `backend/prisma/migrations/` (kept from this project's original Prisma-based setup, now applied by a small custom runner — see `backend/scripts/migrate.js` — instead of the `prisma` CLI). `rides.source_geog` / `destination_geog` (and `ride_requests.pickup_geog` / `drop_geog`) are `geography(Point,4326)` columns kept in sync from the plain lat/lng columns via a `BEFORE INSERT OR UPDATE` trigger (see `prisma/migrations/*_postgis_geo_columns`). Search uses `ST_DWithin` against these columns; matching adds a time-window score and a route-bearing-alignment score on top of proximity (`src/services/matching.service.js`).

**Concurrency-critical path**: accepting a ride request (`src/services/booking.service.js#acceptRequest`) runs inside a single `withTransaction()` call that takes `SELECT ... FOR UPDATE` on the ride row before checking `availableSeats`. Two simultaneous accepts on a 1-seat ride can never both succeed — the second waits for the lock, re-reads the now-decremented count, and fails with a clean 409. This is covered by `backend/tests/concurrentBooking.test.js`.

**Payments**: `src/services/payment.service.js` implements a mock provider behind the same interface a real gateway (e.g. Razorpay) would need — `createOrder` / `verifyPayment` / `handleWebhook` / `refundPayment`. The frontend never determines the amount; `totalAmount = tipAmount + platformFee` is always computed server-side at accept time. The webhook route is mounted before the JSON body parser (`app.js`) since its HMAC check needs the raw body, and both `verifyPayment` and `handleWebhook` are idempotent (re-processing an already-`SUCCESS` payment is a no-op).

## 3. Requirements

- Node.js 18+ (developed/tested on Node 22.7)
- Docker Desktop (for local PostgreSQL + PostGIS)
- npm

## 4. Installation

```bash
git clone <repo-url>
cd Proj
cd backend && npm install
cd ../frontend && npm install
```

## 5. Environment Variables

Copy the example files and adjust as needed:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

`backend/.env`:

| Variable | Purpose |
|---|---|
| `PORT` | API port (default 5000) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | Auth token signing |
| `CLIENT_URL` | Allowed CORS origin (the frontend's URL) |
| `PAYMENT_KEY_ID` / `PAYMENT_KEY_SECRET` / `PAYMENT_WEBHOOK_SECRET` | Reserved for swapping the mock payment provider for a real one |
| `MAP_API_KEY` | Reserved for a future map integration |
| `SMTP_*` | Reserved for real email delivery (password reset currently logs the link server-side instead) |
| `DEFAULT_PICKUP_RADIUS_KM` / `DEFAULT_DESTINATION_RADIUS_KM` / `DEFAULT_TIME_WINDOW_MINUTES` | Matching algorithm tuning |
| `PLATFORM_FEE_FLAT` | Flat platform fee added to paid bookings |

`frontend/.env`:

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Backend API base URL, e.g. `http://localhost:5000/api` |

Never commit real secrets — only `.env.example` files are checked in.

## 6. Database Setup

A `docker-compose.yml` at the repo root starts PostgreSQL 16 with PostGIS preinstalled:

```bash
docker compose up -d db
```

> The compose file maps the container to **host port 5433**, not 5432 — this avoids clashing with a native PostgreSQL install that may already be using 5432. Update `DATABASE_URL` accordingly (`.env.example` already points at 5433).

## 7. Migration

```bash
cd backend
npm run migrate   # applies backend/prisma/migrations/*/migration.sql not yet recorded in _sql_migrations
```

Migrations are plain SQL files; `backend/scripts/migrate.js` tracks which have been applied in a `_sql_migrations` table and runs the rest in order, each in its own transaction. To add a new migration, create a new timestamp-prefixed folder under `backend/prisma/migrations/` with a `migration.sql` file and run `npm run migrate` again.

## 8. Seeding

```bash
cd backend
npm run seed
```

This wipes and repopulates the database with realistic Chennai routes (Avadi→Chennai Central, Ambattur→Anna Nagar, Tambaram→Guindy, Porur→T Nagar), an admin, several riders/passengers, vehicles, a completed ride with a paid booking + payment + mutual ratings, a pending ride request, and notifications.

All seeded users share the password `password123`:

- Admin: `admin@bikeride.dev`
- Rider: `ravi@bikeride.dev`
- Passenger: `priya@bikeride.dev`

## 9. Running Locally

Backend (http://localhost:5000):

```bash
cd backend
npm run dev
```

Frontend (http://localhost:5173):

```bash
cd frontend
npm run dev
```

Health check: `GET http://localhost:5000/health`.

## 10. Testing

```bash
cd backend
npm test
```

Runs the full Jest + Supertest suite against your local dev database (registration, login, invalid login, vehicle ownership, ride creation + tip-amount business rule, ride search/matching, ride requests, duplicate-request rejection, seat-availability rejection, **the concurrent-booking race condition**, free-ride and paid-ride booking flows, payment verification + idempotency, ride start/complete, ratings, and authorization checks). Tests generate their own unique users per run, so they're safe to run repeatedly without resetting the database.

## 11. Build

Frontend production build:

```bash
cd frontend
npm run build   # outputs to frontend/dist
npm run preview # serve the build locally
```

Backend has no build step (plain Node/ESM) — run `npm start` in production.

## 12. API Documentation

Interactive OpenAPI/Swagger docs are served by the running backend at:

```
http://localhost:5000/api/docs
```

Covers auth, users, vehicles, rides (create/search/lifecycle), ride requests, bookings, payments, ratings, notifications, safety reports, and admin — including request/response shapes, validation, auth requirements, and error responses.

## 13. Deployment Notes

- Run `npm run migrate` against production databases before starting the app on a new environment.
- Set a strong, unique `JWT_SECRET` and real `PAYMENT_KEY_*` / `PAYMENT_WEBHOOK_SECRET` values before enabling real payments — `payment.service.js` is the only file that needs to change to swap the mock provider for a real gateway.
- Point `CLIENT_URL` (backend) and `VITE_API_BASE_URL` (frontend, baked in at build time) at their real deployed URLs.
- The app expects a PostgreSQL instance with the `postgis` extension available (any managed Postgres with PostGIS support, e.g. RDS, Cloud SQL, or a self-hosted `postgis/postgis` image, works).
- Serve `frontend/dist` from any static host/CDN; it's a pure client-side SPA that talks to the API over HTTPS.
- Put the backend behind a reverse proxy/load balancer that terminates TLS; Helmet, CORS, and rate limiting are already configured in `app.js`.

## 14. What's Deliberately Not Implemented

Per the product brief, this is explicitly **not** a taxi-dispatch system: no driver assignment, no surge pricing, no commercial fare calculation. The SOS button in `/safety` is intentionally a reminder only — it does not integrate with any emergency-dispatch service, and the UI says so.
