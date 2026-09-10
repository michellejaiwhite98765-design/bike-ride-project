# BikeRide — Free-Tier Deployment Guide (Railway replacement)

## Why this document exists

Railway's free plan is a **trial credit only** — once it's used up, every
service goes to 0/online and stays there until you add a payment method.
There is no free-forever tier on Railway. This guide replaces Railway with
a stack that has **no credit card requirement** and **no time-limited
trial**:

| Piece | Old (Railway) | New (free) |
|---|---|---|
| Frontend | Vercel | **Vercel** (unchanged) |
| Backend (Node + Socket.IO) | Railway | **Render.com** free Web Service |
| Database (Postgres + PostGIS) | Railway Postgres | **Neon** free Postgres |

No application code changed. The backend and frontend already read every
URL/secret from environment variables (`DATABASE_URL`, `CLIENT_URL`,
`VITE_API_BASE_URL`, `VITE_SOCKET_URL`, etc.) — moving hosts is purely a
matter of environment variables and where the Docker image runs.

---

## What was added to the repo

### 1. `render.yaml` (new file, repo root)

A Render "Blueprint" file. When you connect this repo to Render and choose
"New -> Blueprint", Render reads this file automatically and provisions the
backend service without you having to click through every field by hand.

```yaml
services:
  - type: web
    name: bikeride-backend
    runtime: docker
    plan: free
    region: oregon
    rootDir: backend
    dockerfilePath: ./Dockerfile
    dockerContext: .
    healthCheckPath: /health
    envVars:
      - key: PORT
        value: 5000
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        sync: false        # you paste this in yourself (Neon connection string)
      - key: JWT_SECRET
        generateValue: true # Render generates a random secret automatically
      - key: JWT_EXPIRES_IN
        value: 7d
      - key: CLIENT_URL
        sync: false        # you paste this in yourself (your Vercel URL)
      - key: PAYMENT_KEY_ID
        value: mock
      - key: PAYMENT_KEY_SECRET
        value: mock
      - key: PAYMENT_WEBHOOK_SECRET
        value: mock
      - key: DEFAULT_PICKUP_RADIUS_KM
        value: "2"
      - key: DEFAULT_DESTINATION_RADIUS_KM
        value: "2"
      - key: DEFAULT_TIME_WINDOW_MINUTES
        value: "30"
      - key: PLATFORM_FEE_FLAT
        value: "5"
      - key: TRACKING_SNAPSHOT_INTERVAL_MS
        value: "20000"
      - key: TRACKING_STALE_AFTER_MS
        value: "30000"
```

Why `sync: false` on two variables: Render can't know your Neon connection
string or your Vercel domain ahead of time — those only exist after you
create those two things. Every other variable has a fixed value and Render
sets it for you automatically from the file.

Why `dockerfilePath`/`dockerContext` point at `backend`: this repo has both
`frontend/` and `backend/` at the root, each with their own `Dockerfile`.
`rootDir: backend` tells Render to treat `backend/` as the project root, so
it builds `backend/Dockerfile` and ignores the frontend entirely.

This file was committed and pushed to your GitHub repo
(`michellejaiwhite98765-design/bike-ride-project`, commit `548555d`) so
Render can see it.

### Nothing else was changed

No source files were modified. The existing `backend/Dockerfile` (which
already runs `npm run migrate && npm start` on boot) and the existing
`frontend/vercel.json` are reused unchanged.

---

## Steps you need to do yourself

I can't create accounts, log into third-party services, or enter passwords
on your behalf — these steps need your own hands on the keyboard. Each one
takes 2-5 minutes.

### Step 1 — Neon (database)

1. Go to https://neon.tech and sign up (GitHub sign-in is fastest — no
   credit card asked).
2. Click **New Project**. Any name/region is fine.
3. Once it's created, open the **SQL Editor** in the Neon console and run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
4. Go to the project's **Connection Details** and copy the connection
   string. It looks like:
   ```
   postgresql://neondb_owner:AbCdEf123@ep-cool-name-12345.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
   Keep this tab open — you'll paste it into Render in Step 2.

### Step 2 — Render (backend)

1. Go to https://render.com and sign up with GitHub (no credit card asked
   for the free tier).
2. Click **New** → **Blueprint**.
3. Connect your GitHub account if prompted, then select the
   `bike-ride-project` repo.
4. Render will detect `render.yaml` automatically and show the
   `bikeride-backend` service it's about to create. Click **Apply**.
5. Once the service exists, open it → **Environment** tab, and fill in the
   two variables that were left blank:
   - `DATABASE_URL` → paste the Neon connection string from Step 1
   - `CLIENT_URL` → leave this for now, you'll fill it in after Step 3
     (or set it temporarily to `http://localhost:5173`)
6. Save changes — Render will redeploy automatically.
7. Wait for the deploy to finish (Render's dashboard shows build/deploy
   logs live). First boot runs your database migrations, so it may take an
   extra 30-60 seconds beyond the usual build time.
8. Once it says **Live**, copy the service URL, e.g.:
   ```
   https://bikeride-backend.onrender.com
   ```

Note: Render's free web services spin down after ~15 minutes with no
traffic, and take ~30-50 seconds to wake up on the next request. That's
normal for the free tier — the site isn't broken, it's just cold-starting.

### Step 3 — Vercel (frontend)

1. Go to https://vercel.com and sign in (you likely already have an
   account from the original deployment).
2. Open your existing `bikeride-frontend` project (or import the repo
   fresh if it's gone) → **Settings** → **Environment Variables**.
3. Set (or update) these two, using the Render URL from Step 2:
   ```
   VITE_API_BASE_URL=https://bikeride-backend.onrender.com/api
   VITE_SOCKET_URL=https://bikeride-backend.onrender.com
   ```
4. Go to **Deployments** → click the "..." menu on the latest deployment →
   **Redeploy**. (Vite bakes env vars in at build time, so a redeploy is
   required for the new values to take effect — just saving them isn't
   enough.)
5. Once it's done, copy your frontend URL, e.g.:
   ```
   https://bikeride-frontend.vercel.app
   ```

### Step 4 — close the loop

1. Go back to Render → `bikeride-backend` → **Environment**.
2. Set `CLIENT_URL` to your real Vercel URL from Step 3, e.g.
   `https://bikeride-frontend.vercel.app`.
3. Save — Render redeploys automatically.
4. Open your Vercel URL in a browser and test: register/login, create a
   ride, search for a ride. If you see CORS errors in the browser console,
   `CLIENT_URL` on Render doesn't exactly match the Vercel URL — fix and
   redeploy.

---

## Verifying it worked

```bash
curl https://bikeride-backend.onrender.com/health
```
Should return `{"success":true,"message":"OK"}`. (First request after idle
may take 30-50s — that's the free-tier cold start, not a failure.)

Swagger API docs: `https://bikeride-backend.onrender.com/api/docs`

---

## Running locally (unchanged from before)

```bash
# 1. Start Postgres + PostGIS via Docker
docker compose up -d db

# 2. Backend
cd backend
cp .env.example .env          # edit DATABASE_URL/JWT_SECRET if needed
npm install
npm run migrate
npm run seed                  # optional: demo data
npm run dev                   # http://localhost:5000

# 3. Frontend (separate terminal)
cd frontend
cp .env.example .env          # points at http://localhost:5000 by default
npm install
npm run dev                   # http://localhost:5173
```

Seeded login (after `npm run seed`): `ravi@bikeride.dev` (rider) /
`priya@bikeride.dev` (passenger), password `password123` for both.

---

## Why I couldn't fully automate this

Creating accounts and logging into Neon/Render/Vercel requires entering
credentials on third-party sites, which falls outside what I'm able to do
on your behalf regardless of how the request is phrased — this is a fixed
rule, not a preference. Everything that didn't require that (writing
`render.yaml`, committing it, pushing it, writing this guide) is done.
Once you've completed Steps 1-4 above, tell me the Render and Vercel URLs
and I can verify the deployment (health check, CORS, etc.) and help debug
anything that doesn't work.
