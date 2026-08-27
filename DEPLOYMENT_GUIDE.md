# BikeRide Full-Stack Deployment Guide

## Prerequisites
- Vercel account (https://vercel.com)
- Railway or Render account (https://railway.app or https://render.com)
- Git and Node.js installed
- Vercel CLI: `npm install -g vercel`

---

## STEP 1: Deploy Backend to Railway (Recommended for full-stack)

### 1.1 Create Railway Account & Project
1. Go to https://railway.app
2. Sign in with GitHub
3. Create a new project
4. Select "Deploy from GitHub repo"

### 1.2 Connect Your Repository
1. Authorize Railway to access your GitHub
2. Select your BikeRide repository
3. Select the root directory or configure as monorepo

### 1.3 Set Up PostgreSQL Database
1. In Railway dashboard, click "New Service"
2. Select "Database" → "PostgreSQL"
3. Add the PostGIS extension:
   - Go to the Postgres plugin settings
   - Enable PostGIS extension
4. Railway will provide a `DATABASE_URL`

### 1.4 Configure Environment Variables
In Railway dashboard, go to your project and set these variables:

```
PORT=5000
NODE_ENV=production
DATABASE_URL=<from Railway Postgres>
JWT_SECRET=<generate-a-strong-random-secret>
JWT_EXPIRES_IN=7d
CLIENT_URL=https://<your-frontend-domain>.vercel.app
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

### 1.5 Configure Deployment Settings
1. In Railway, go to your project settings
2. Set **Start Command**: `npm run migrate && npm start`
3. Set **Build Command**: `npm install`
4. Railway will automatically deploy on git push

### 1.6 Get Your Backend URL
Once deployed, Railway provides a public URL like:
`https://bikeride-backend-prod-<random>.up.railway.app`

Save this for the frontend config.

---

## STEP 2: Deploy Frontend to Vercel

### 2.1 Install Vercel CLI
```bash
npm install -g vercel
```

### 2.2 Authenticate Vercel
```bash
vercel login
```

### 2.3 Deploy Frontend
```bash
cd C:\Users\LENOVO\Downloads\BikeRide-source\frontend
vercel
```

When prompted:
- **Project name**: `bikeride-frontend`
- **Framework**: Select **Vite**
- **Root directory**: Use default (.)

### 2.4 Set Environment Variables in Vercel
1. Go to https://vercel.com/dashboard
2. Click your **bikeride-frontend** project
3. Go to **Settings** → **Environment Variables**
4. Add:
   ```
   VITE_API_BASE_URL=https://<your-railway-backend-url>/api
   VITE_SOCKET_URL=https://<your-railway-backend-url>
   ```
5. Click "Redeploy" to apply changes

### 2.5 Your Frontend URL
Vercel provides a URL like: `https://bikeride-frontend.vercel.app`

---

## STEP 3: Update CORS & Backend Config

Go back to Railway backend environment variables and update:
```
CLIENT_URL=https://bikeride-frontend.vercel.app
```

Then redeploy the backend.

---

## STEP 4: Test the Deployment

1. Open https://bikeride-frontend.vercel.app
2. Try to register/login
3. Check if API calls work (open browser DevTools → Network tab)
4. Test creating a ride and searching for rides

If you see CORS errors, the `CLIENT_URL` in your backend env vars doesn't match the frontend URL.

---

## Troubleshooting

### Backend won't start
- Check Railway logs: Dashboard → Project → Deployments
- Verify `DATABASE_URL` is correct
- Ensure migrations ran: Check Railway logs for `npm run migrate` output

### Frontend can't reach backend
- Check `VITE_API_BASE_URL` in Vercel env vars (must end with `/api`)
- Verify backend is running: Open `https://<backend-url>/health` in browser
- Check browser console for CORS errors

### Database migrations failed
- SSH into Railway or check logs
- Manually run: `npm run migrate`
- Verify PostGIS extension is installed

---

## Quick Commands Reference

**Redeploy frontend after code changes:**
```bash
git push
# Vercel auto-deploys on push
```

**Redeploy backend after code changes:**
```bash
git push
# Railway auto-deploys on push (if webhook configured)
```

**Check backend health:**
```bash
curl https://<your-backend-url>/health
```

---

## Next Steps (Optional)
- Set up custom domain names for both frontend and backend
- Configure automated backups for PostgreSQL
- Set up monitoring/alerts for uptime
