# BikeRide Full-Stack Deployment Analysis & Plan

## Current Architecture Analysis

### Backend (Node.js + Express)
- **Entry Point:** `backend/src/server.js`
- **Framework:** Express 5.2.1
- **Real-time:** Socket.IO 4.8.1 (attached to HTTP server)
- **Database:** PostgreSQL with pg client (not Prisma ORM)
- **Database Migrations:** Custom script (`backend/scripts/migrate.js`) - reads SQL files from `backend/prisma/migrations/`
- **Port:** Configurable via `PORT` env var (default 5000)
- **Key Middleware:** Helmet, CORS (dynamic origin), Morgan, JWT auth, Rate limiting
- **Socket.IO CORS:** Respects `env.clientUrls` (comma-separated list)

### Frontend (React + Vite)
- **Build Output:** `frontend/dist`
- **API Base URL:** `import.meta.env.VITE_API_BASE_URL` (defaults to `http://localhost:5000/api`)
- **Socket.IO URL:** `import.meta.env.VITE_SOCKET_URL` (defaults to `http://localhost:5000`)
- **Token Storage:** localStorage (`bikeride_token`)
- **Axios Interceptors:** Auto-attaches JWT bearer token to requests

### Database
- **Type:** PostgreSQL with PostGIS extension
- **Client:** `pg` (node-postgres)
- **Connection Pool:** Configured in `backend/src/config/db.js`
- **Migrations:** Plain SQL files in `backend/prisma/migrations/*/migration.sql`
- **Tracking:** Custom migration tracking in `_sql_migrations` table

---

## Production Deployment Strategy

### Frontend Deployment → Vercel
- Serve static SPA from Vercel CDN
- Environment variables set at build time: `VITE_API_BASE_URL`, `VITE_SOCKET_URL`
- Rewrites: All non-file requests → `/index.html` (React Router SPA handling)

### Backend Deployment → Railway (Recommended) or Render
- Node.js server on port 5000 (or configurable)
- Uses production database (PostgreSQL with PostGIS)
- Environment variables injected at runtime
- Socket.IO connections accepted from frontend domain
- **Build Command:** `npm install` (NO migrations in build)
- **Start Command:** `npm run migrate && npm start` (migrations run on startup, then server starts)

---

## Environment Variables Required

### Backend (`backend/.env` → Railway env vars)
```
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://user:password@host:port/dbname
JWT_SECRET=<generate-strong-random-secret-32-chars-min>
JWT_EXPIRES_IN=7d
CLIENT_URL=https://bikeride-frontend.vercel.app
PAYMENT_KEY_ID=mock
PAYMENT_KEY_SECRET=mock
PAYMENT_WEBHOOK_SECRET=mock
DEFAULT_PICKUP_RADIUS_KM=2
DEFAULT_DESTINATION_RADIUS_KM=2
DEFAULT_TIME_WINDOW_MINUTES=30
PLATFORM_FEE_FLAT=5
TRACKING_SNAPSHOT_INTERVAL_MS=20000
TRACKING_STALE_AFTER_MS=30000
```

### Frontend (`frontend/.env` → Vercel env vars)
```
VITE_API_BASE_URL=https://<railway-backend-url>/api
VITE_SOCKET_URL=https://<railway-backend-url>
```

---

## Critical Configuration Points

### 1. Socket.IO CORS
**Backend:** `backend/src/realtime/socket.js` line 42
```javascript
const io = new Server(httpServer, {
  cors: { origin: env.clientUrls || env.clientUrl, credentials: true },
});
```
✅ Correctly uses `env.clientUrls` (comma-separated list from `CLIENT_URL`)

### 2. Express CORS
**Backend:** `backend/src/app.js` line 18
```javascript
app.use(cors({ origin: env.clientUrls || env.clientUrl, credentials: true }));
```
✅ Correctly configured for dynamic origins

### 3. Frontend API Interceptor
**Frontend:** `frontend/src/services/api.js` lines 11-12
```javascript
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
});
```
✅ Uses environment variable, with fallback to localhost

### 4. Frontend Socket.IO Client
**Frontend:** `frontend/src/services/socket.js` line 4
```javascript
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
```
✅ Uses environment variable, with fallback to localhost

---

## Deployment Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (User)                            │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
  [HTTPS Static]          [WebSocket + HTTP]
        │                         │
        │                         │
   ┌────▼──────────────────────────▼────┐
   │   Vercel CDN                        │
   │   frontend/dist (React SPA)         │
   │   https://bikeride-frontend.vercel.app
   └────┬───────────────────────────┬────┘
        │                           │
        │ Requests to API           │ WebSocket
        │ /api/* routes             │
        │                           │
        └────────────┬──────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │   Railway or Render        │
        │   Node.js + Express        │
        │   + Socket.IO              │
        │   https://<backend-url>    │
        │   PORT=5000                │
        │                            │
        │   ┌────────────────────┐   │
        │   │ PostgreSQL DB      │   │
        │   │ (Railway Postgres) │   │
        │   │ with PostGIS       │   │
        │   └────────────────────┘   │
        └────────────────────────────┘
```

---

## Database Migration Strategy

### Problem: Vercel doesn't support persistent build-time state
- ❌ Cannot run `npm run migrate` during Vercel build
- ❌ Build would be inconsistent (different outputs on different deploys)

### Solution: Run migrations at backend startup
1. Backend starts on Railway
2. First thing: `npm run migrate` runs (idempotent, tracks applied migrations)
3. Then: `npm start` launches the Express server
4. Frontend connects and works with initialized schema

**Start Command:** `npm run migrate && npm start`

This ensures:
- ✅ Database is ready before server accepts connections
- ✅ Idempotent (safe to restart)
- ✅ Works with both first deploy and subsequent redeploys
- ✅ No manual database setup required

---

## Configuration Files to Update

### ✅ Already Created
1. `backend/vercel.json` - Node.js production config
2. `frontend/vercel.json` - Vite production config
3. `backend/.vercelignore` - Optimize backend build
4. `frontend/.vercelignore` - Optimize frontend build

### ✅ Need to Create/Update
1. `backend/.env.production` (for reference, actual values go to Railway UI)
2. `frontend/.env.production` (for reference, actual values go to Vercel UI)

---

## Step-by-Step Deployment Checklist

- [ ] Generate JWT_SECRET (32+ random chars)
- [ ] Create Railway account and PostgreSQL database
- [ ] Create Vercel account
- [ ] Set backend environment variables in Railway
- [ ] Deploy backend to Railway
- [ ] Verify backend health: `GET /health`
- [ ] Verify backend Swagger docs: `GET /api/docs`
- [ ] Set frontend environment variables in Vercel
- [ ] Deploy frontend to Vercel
- [ ] Open frontend URL in browser
- [ ] Test login flow (register → login → dashboard)
- [ ] Test API calls (create ride, search rides)
- [ ] Test Socket.IO (location sharing during live ride)
- [ ] Monitor logs for errors

---

## Testing the Production Setup

### Health Checks
```bash
# Backend health
curl https://<railway-backend-url>/health

# API connectivity from frontend
# Open browser DevTools → Network tab
# Try any action that makes an API call
# Should see requests to https://<railway-backend-url>/api/*
```

### Real-Time Testing
1. Register two accounts (rider + passenger)
2. Create ride as rider
3. Open second browser/incognito for passenger
4. Search for rides
5. Request to join ride
6. Accept request (start ride)
7. Both should see real-time location updates via Socket.IO

---

## Known Gotchas & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| CORS errors in frontend | `CLIENT_URL` in backend doesn't match Vercel frontend URL | Ensure `CLIENT_URL=https://bikeride-frontend.vercel.app` (exact match) |
| WebSocket connection fails | Socket.IO origin not whitelisted | Verify `CLIENT_URL` is in `env.clientUrls` list |
| Migrations don't run | Start command doesn't include `npm run migrate` | Use `npm run migrate && npm start` |
| API returns 500 on startup | Database not ready | Railway Postgres might be initializing; retry after 30s |
| Frontend shows "Cannot find module" | Build-time env vars not set | Set `VITE_API_BASE_URL` and `VITE_SOCKET_URL` before building |

---

## Rollback Plan

If deployment fails:
1. Previous Vercel deployments accessible via "Deployments" tab
2. Previous Railway deployments accessible via "Deployments" tab
3. Both services support instant rollback to prior version
4. Database migrations are idempotent (safe to re-run)

---

