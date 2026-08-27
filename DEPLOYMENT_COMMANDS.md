# BikeRide Full-Stack Deployment - Step-by-Step Commands

## Prerequisites
- Vercel account: https://vercel.com/signup
- Railway account: https://railway.app/new
- Git push access to your repository
- 15-20 minutes

---

## PART 1: Deploy Backend to Railway

### Step 1.1: Create Railway Project & PostgreSQL Database

1. Go to https://railway.app/new
2. Click **"GitHub Repo"** (or create new project)
3. Select your **bike-ride-project** repository
4. Click **"Deploy Now"**
5. Railway detects Node.js and prepares deployment

### Step 1.2: Add PostgreSQL Database

In Railway dashboard:
1. Click **"+ New Service"** button
2. Select **"Database"** → **"PostgreSQL"**
3. Wait for database to initialize (2-3 minutes)
4. Go to PostgreSQL plugin **"Settings"**
5. Click **"Connect Database to Project"**
6. Railway will add `DATABASE_URL` environment variable automatically

### Step 1.3: Add PostGIS Extension

In Railway PostgreSQL plugin:
1. Click the **"PostgreSQL"** card
2. Go to the **"Shell"** tab
3. Run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
4. Verify:
   ```sql
   SELECT version();
   ```
   (Should show `PostGIS` in output)

### Step 1.4: Configure Environment Variables

In Railway dashboard → Your Project → Variables:

**Set these environment variables:**

```
NODE_ENV=production
PORT=5000
JWT_SECRET=generate_a_random_string_like_this_aBc123dEfGhIjKlMnOpQrStUvWxYz9876
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

**Note:** `DATABASE_URL` is already set by Railway. Don't manually add it.

### Step 1.5: Configure Start Command

In Railway dashboard → Your Project → Deployments → Settings:

**Set Start Command to:**
```
npm run migrate && npm start
```

This ensures:
- Migrations run first (idempotent - safe to re-run)
- Server starts after database is ready
- No build-time database operations

### Step 1.6: Deploy Backend

In Railway dashboard:
1. Click **"Deploy"** button (or push to GitHub if webhook is configured)
2. Wait for logs to show:
   ```
   [INFO] BikeRide API listening on port 5000 [production]
   ```
3. Copy the public URL from Railway (looks like: `https://bikeride-backend-prod-xyz.up.railway.app`)
4. Save this URL for frontend configuration

**To verify backend is working:**
```bash
curl https://<your-railway-url>/health
```

Expected response:
```json
{"success":true,"message":"OK"}
```

---

## PART 2: Deploy Frontend to Vercel

### Step 2.1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2.2: Authenticate with Vercel

```bash
vercel login
```

This opens a browser. Complete authentication.

### Step 2.3: Deploy Frontend

Navigate to frontend directory and deploy:

```bash
cd C:\Users\LENOVO\Downloads\BikeRide-source\frontend
vercel --prod
```

When prompted:
- **Project name:** `bikeride-frontend` (or accept default)
- **Directory containing code:** Press Enter (use current directory)
- **Want to override the settings?** Answer `N`

Expected output:
```
✓ Production: https://bikeride-frontend.vercel.app [copied to clipboard]
```

### Step 2.4: Set Environment Variables in Vercel

Go to https://vercel.com/dashboard → Select **bikeride-frontend** project

**Settings** tab → **Environment Variables**:

Add two variables:
```
VITE_API_BASE_URL=https://<your-railway-backend-url>/api
VITE_SOCKET_URL=https://<your-railway-backend-url>
```

**Example (replace with your actual Railway URL):**
```
VITE_API_BASE_URL=https://bikeride-backend-prod-abc123.up.railway.app/api
VITE_SOCKET_URL=https://bikeride-backend-prod-abc123.up.railway.app
```

### Step 2.5: Redeploy Frontend with New Environment

In Vercel dashboard:
1. Go to **Deployments** tab
2. Click the latest deployment
3. Click **"Redeploy"** (top right)
4. Confirm redeploy

Wait for build to complete. New frontend will use the updated API URLs.

---

## PART 3: Update Backend CORS for Frontend URL

Go back to Railway dashboard:

1. Click your project
2. Click the Node.js service card
3. Go to **Variables** tab
4. Update `CLIENT_URL` to match your Vercel frontend URL:

```
CLIENT_URL=https://bikeride-frontend.vercel.app
```

5. Click **"Redeploy"** or wait for Railway to auto-redeploy

---

## PART 4: Test Production Deployment

### 4.1: Backend Health Check

```bash
curl https://<your-railway-url>/health
```

Expected:
```json
{"success":true,"message":"OK"}
```

### 4.2: API Swagger Documentation

Open in browser:
```
https://<your-railway-url>/api/docs
```

You should see interactive Swagger documentation.

### 4.3: Frontend Tests

1. Open https://bikeride-frontend.vercel.app in browser
2. Open **Developer Tools** (F12)
3. Go to **Network** tab
4. Go to **Console** tab

#### Test 1: Register a New Account
- Click **"Register"** or navigate to `/register`
- Fill in form:
  - Email: `test@example.com`
  - Password: `Password123!`
  - Name: `Test User`
  - Phone: `1234567890`
- Submit form
- Check **Network tab**: Should see POST to `/api/auth/register`
- Status should be **201**
- Should redirect to login page

#### Test 2: Login
- Email: `test@example.com`
- Password: `Password123!`
- Click Login
- Check **Network tab**: Should see POST to `/api/auth/login`
- Status should be **200**
- Should redirect to dashboard

#### Test 3: Create a Ride
- Click **"Create Ride"** or **"Publish Ride"**
- Fill in:
  - Vehicle: Select a vehicle (or add one first)
  - Source: Any location (e.g., "123 Main St")
  - Destination: Another location (e.g., "456 Park Ave")
  - Date/Time: Tomorrow at 9 AM
  - Seats: 2
  - Tip: $5 (or $0 for no-tip)
- Submit
- Check **Network tab**: POST to `/api/rides`
- Status should be **201**
- Should show ride created confirmation

#### Test 4: WebSocket (Real-time Location)
- Open **Console** tab
- Run:
  ```javascript
  import { getSocket } from './src/services/socket.js';
  const socket = getSocket();
  socket.connect();
  socket.on('connect', () => console.log('Socket connected!'));
  ```
- Should log: `Socket connected!`
- No errors should appear

### 4.4: Check for CORS Errors

In **Console** tab, look for errors like:
```
Access to XMLHttpRequest at 'https://...' from origin 'https://bikeride-frontend.vercel.app' 
has been blocked by CORS policy
```

**If you see CORS errors:**
1. Check that `CLIENT_URL` in Railway matches your Vercel frontend URL exactly
2. Redeploy backend
3. Wait 30 seconds and refresh browser

---

## PART 5: Quick Reference - Exact URLs

Once deployed, your app lives at:

**Frontend:** https://bikeride-frontend.vercel.app
**Backend API:** https://<railway-backend-url>/api
**Backend Swagger Docs:** https://<railway-backend-url>/api/docs
**Backend Health:** https://<railway-backend-url>/health

---

## Troubleshooting

### Problem: "Cannot GET /"
**Cause:** Frontend not deployed or build failed
**Fix:** 
1. Go to Vercel dashboard
2. Check **Deployments** tab for build errors
3. Click failed deployment to see logs
4. Fix errors and redeploy

### Problem: "CORS error in console"
**Cause:** Backend doesn't recognize frontend URL
**Fix:**
1. Go to Railway dashboard
2. Check `CLIENT_URL` variable matches frontend URL exactly
3. Redeploy backend
4. Clear browser cache (Ctrl+Shift+Delete) and refresh

### Problem: "Cannot connect to database"
**Cause:** DATABASE_URL not set or incorrect
**Fix:**
1. Go to Railway PostgreSQL card
2. Click **"PostgreSQL"** in project card
3. Verify DATABASE_URL in Variables
4. Database should be listed as "Connected to project"

### Problem: "npm ERR! missing script: migrate"
**Cause:** Start command trying to run missing script
**Fix:**
1. Check `backend/package.json` has `"migrate": "node scripts/migrate.js"` in scripts section
2. It should already be there - verify it exists
3. Redeploy Railway

### Problem: "WebSocket connection fails"
**Cause:** VITE_SOCKET_URL not set in Vercel
**Fix:**
1. Go to Vercel dashboard → bikeride-frontend → Settings → Environment Variables
2. Verify both `VITE_API_BASE_URL` and `VITE_SOCKET_URL` are set
3. Both should point to same Railway backend URL (one with `/api`, one without)
4. Redeploy frontend

---

## Environment Variables Summary

### Railway Backend Environment Variables
```
NODE_ENV=production
PORT=5000
DATABASE_URL=<auto-set by Railway PostgreSQL>
JWT_SECRET=<your-generated-secret>
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

### Vercel Frontend Environment Variables
```
VITE_API_BASE_URL=https://<your-railway-url>/api
VITE_SOCKET_URL=https://<your-railway-url>
```

---

## Security Notes

- ✅ JWT_SECRET: Use a strong, random value (32+ characters)
- ✅ HTTPS enforced on all connections
- ✅ CORS restricted to Vercel frontend domain
- ✅ Socket.IO CORS restricted to frontend domain
- ✅ Helmet.js provides security headers
- ✅ Rate limiting enabled on /api routes
- ⚠️ Payment service is mocked - only enable real payments after testing thoroughly

---

## Next Steps After Successful Deployment

1. **Add Custom Domain (Optional)**
   - Vercel: Add domain in Settings → Domains
   - Railway: Add domain in Settings → Domains

2. **Set Up Monitoring (Optional)**
   - Railway: Built-in logs and metrics
   - Vercel: Analytics tab in dashboard

3. **Enable Real Payments (Later)**
   - Only after thorough testing
   - Update PAYMENT_* environment variables
   - Update backend/src/services/payment.service.js to use real gateway

4. **Database Backups (Optional)**
   - Railway: Enable automatic backups in PostgreSQL settings

---

## Rollback to Previous Version

**If something breaks:**

**Vercel:**
1. Go to Deployments tab
2. Find previous working deployment
3. Click "..." menu
4. Select "Promote to Production"

**Railway:**
1. Go to Deployments tab
2. Find previous working deployment
3. Click "Deploy"

---

