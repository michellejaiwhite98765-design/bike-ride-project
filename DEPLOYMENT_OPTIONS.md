# BikeRide - where to deploy

The same code runs on either setup below; only the settings differ (server
addresses come from environment variables). Both are kept in the repo -
pick one, or switch later.

| | **Option 1: Free forever** | **Option 2: AWS** |
|---|---|---|
| Cost | ₹0, no card needed | Uses AWS credits, then paid (~$8-15/month) |
| Frontend | Vercel (free Hobby plan) | AWS Amplify |
| Backend | Render (free web service) | EC2 server |
| Database | Neon (free Postgres + PostGIS) | On the EC2 server (Docker) |
| HTTPS | Built in | Built in (Caddy + sslip.io) |
| Updates | Automatic on every push to `main` | Run `sh deploy.sh` on the server |
| Catch | Backend sleeps after 15 min idle (fixed by the keep-awake ping); Neon free = 0.5 GB data | Server runs 24/7 on credits; stops when credits/billing lapse |
| Files | `render.yaml`, `frontend/vercel.json`, `.github/workflows/keep-backend-awake.yml` | `deploy/`, `deploy.sh` |
| Guide | below + `FREE_DEPLOYMENT_GUIDE.md` | below + `AWS_DEPLOYMENT_GUIDE.md` |

---

## Option 1: Free forever (Neon + Render + Vercel) - about 20 minutes

Sign up for all three with **"Continue with GitHub"**. None of them asks for a card.

### 1. Database - Neon
1. https://neon.tech -> sign up -> **Create project**: name `bikeride`, region **Asia Pacific (Singapore)**.
2. Copy the **connection string** (starts with `postgresql://`, ends with `?sslmode=require`).
   PostGIS is created automatically by the first migration.

### 2. Backend - Render
1. https://render.com -> sign up -> **New** -> **Blueprint** -> pick the `bike-ride-project` repo -> **Apply**.
2. Open **bikeride-backend** -> **Environment**:
   - `DATABASE_URL` = the Neon connection string
   - `CLIENT_URL` = `http://localhost:5173` for now (fixed in step 4)
3. Save. Wait for **Live** (first build ~5-8 min; migrations run on start).
4. Copy the URL, e.g. `https://bikeride-backend.onrender.com`, and check `<url>/health` shows `"OK"`.

### 3. Frontend - Vercel
1. https://vercel.com -> sign up -> **Add New** -> **Project** -> import `bike-ride-project`.
2. **Root Directory**: `frontend` (framework: Vite).
3. **Environment Variables**:
   - `VITE_API_BASE_URL` = `https://<your-render-url>/api`
   - `VITE_SOCKET_URL` = `https://<your-render-url>`
4. **Deploy**. Copy the site URL, e.g. `https://bike-ride-project.vercel.app`.

### 4. Connect them
1. Render -> **Environment** -> set `CLIENT_URL` to the Vercel URL (no trailing `/`). Save.
2. GitHub repo -> **Settings** -> **Secrets and variables** -> **Actions** -> **Variables** ->
   add `BACKEND_URL` = your Render URL. This turns on the keep-awake ping.
3. Open the Vercel URL -> sign up -> done.

From now on every push to `main` redeploys Vercel and Render by themselves.

**Before a demo:** open the site 2 minutes early so the backend is awake (only needed if the keep-awake ping isn't set up).

---

## Option 2: AWS (Amplify + EC2)

New server (one time): create an Amazon Linux 2023 EC2 instance (t3.micro,
20 GB, allow SSH/HTTP/HTTPS), attach an Elastic IP, then on the server:

```bash
sudo dnf install -y git
git clone https://github.com/michellejaiwhite98765-design/bike-ride-project.git bikeride
cd bikeride && sh deploy/ec2-setup.sh https://<your-amplify-site>
```

It prints the `VITE_API_BASE_URL` / `VITE_SOCKET_URL` values to set in
Amplify -> Environment variables, then redeploy Amplify.

Updates: `cd ~/bikeride && git pull && sh deploy.sh`

---

## Optional settings (both options)

Not required - defaults are built in. Add to Render's Environment tab or the
server's `deploy/.env` to change them. See `backend/.env.example`.

| Setting | Default | Meaning |
|---|---|---|
| `PICKUP_ON_ROUTE_KM` | 2.5 | Normal pickup within this distance of the rider's route |
| `DETOUR_MAX_PERCENT` / `DETOUR_MAX_KM` | 20 / 30 | How far the rider may detour |
| `TIP_RATE_PER_KM` | 5 | Extra fare per detour km (₹) |
| `RIDE_EXPIRE_AFTER_HOURS` | 2 | Unstarted rides expire this long after departure |
| `PAYMENT_DEADLINE_MINUTES` | 30 | Accepted passengers must pay within this time |
| `CLOUDINARY_*`, `WAY2API_API_KEY` | - | Vehicle photos and RC check |
