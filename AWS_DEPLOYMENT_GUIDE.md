# BikeRide — AWS Free-Tier Deployment Guide

Three pieces, three AWS services, all free-tier eligible:

| Piece | Service | Why |
|---|---|---|
| Database | **RDS PostgreSQL** (db.t3.micro / db.t4g.micro) | Free tier: 750 hrs/month + 20GB storage for 12 months. Supports the PostGIS extension the app needs. |
| Backend API | **EC2** (t2.micro / t3.micro) running the existing `backend/Dockerfile` | Free tier: 750 hrs/month for 12 months. Reuses the Docker image already built for Render — no new build config needed. |
| Frontend | **AWS Amplify Hosting** | Its free tier (1,000 build min/month, 5GB storage, 15GB served/month) is **always free**, not tied to the 12-month clock. Auto-builds from GitHub on every push. |

## Before you start: how AWS "free" actually works

- **Two different free tiers exist right now.** Accounts created before ~July 2024 get the classic "specific services free for 12 months" tier. Newer accounts (which sounds like yours, since you mentioned credits) get a **$100–200 credit pool** that both covers free-tier-eligible usage AND anything else you spin up — it just gets deducted faster if you use non-free services. Check **Billing → Free Tier** in the AWS Console to see exactly what you have.
- **The services below cost $0 as long as you stay within the limits in the table.** The most common ways people accidentally get billed on a "free" deployment:
  - Elastic Beanstalk's default setup creates an **Application Load Balancer**, which is *not* free (~$16/mo). This guide uses plain EC2 instead specifically to avoid that.
  - A **NAT Gateway** (~$32/mo) — you won't create one in this guide; EC2 will get a public IP directly.
  - Leaving an **Elastic IP allocated but not attached** to a running instance — it's free only while attached and the instance is running.
  - RDS storage above 20GB, or keeping automated backups longer than the free retention window.
  - Data transfer **out** to the internet above 100GB/month (irrelevant at hobby-project scale).

---

## Step 1 — RDS PostgreSQL (database)

1. AWS Console → **RDS** → **Create database**.
2. Engine: **PostgreSQL**. Template: **Free tier**.
3. DB instance identifier: `bikeride-db`. Master username: `bikeride`. Set a strong master password — save it, you'll need it in `DATABASE_URL`.
4. Instance class: whatever the Free tier template pre-selects (db.t3.micro or db.t4g.micro).
5. Storage: leave at the default (20GB gp2/gp3), **disable storage autoscaling** (autoscaling past 20GB drops you out of free tier).
6. Connectivity: "Public access" → **Yes** (simplest for a single EC2 instance to reach it; you'll lock it down by security group, not by hiding it in a VPC). Note the VPC it's created in — your EC2 instance needs to be in the same VPC.
7. Create the database. Wait for status **Available** (~5–10 min).
8. Once available, open its **Security group** (under "Connectivity & security") → **Inbound rules** → **Edit** → add a rule: type `PostgreSQL`, port `5432`, source = the security group you'll create for EC2 in Step 2 (you can come back and fix this after Step 2 if you create EC2 first).
9. Enable PostGIS: connect to the database (from your local machine, via `psql` or any Postgres client, using the endpoint shown on the RDS instance page) and run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```

Your `DATABASE_URL` will look like:
```
postgresql://bikeride:<password>@<rds-endpoint>:5432/postgres?schema=public
```

---

## Step 2 — EC2 (backend API)

1. AWS Console → **EC2** → **Launch instance**.
2. Name: `bikeride-backend`. AMI: **Amazon Linux 2023**. Instance type: **t2.micro** or **t3.micro** (whichever shows the "Free tier eligible" tag).
3. Key pair: create a new one, download the `.pem` file — this is how you'll SSH in.
4. Network settings → create a new security group `bikeride-backend-sg` with these inbound rules:
   - SSH (22) from **My IP** only.
   - HTTP (80) from Anywhere — only if you plan to put Nginx in front later.
   - Custom TCP (5000) from Anywhere — the API port, since the frontend will call this directly at first.
5. Storage: leave at the default 8GB (well within the 30GB free-tier EBS allowance).
6. Launch the instance. Once running, go back to your **RDS security group** (Step 1.8) and add an inbound rule allowing port 5432 from `bikeride-backend-sg`.
7. SSH in:
   ```bash
   chmod 400 your-key.pem
   ssh -i your-key.pem ec2-user@<ec2-public-ip>
   ```
8. Install Docker and Git:
   ```bash
   sudo yum update -y
   sudo yum install -y docker git
   sudo systemctl enable --now docker
   sudo usermod -aG docker ec2-user
   # log out and back in for the group change to apply
   exit
   ```
   Reconnect (`ssh -i ...`), then:
9. Clone the repo and build the existing Docker image:
   ```bash
   git clone <your-repo-url> bikeride
   cd bikeride/backend
   docker build -t bikeride-backend .
   ```
10. Run it, passing the same env vars from `backend/.env.example`:
    ```bash
    docker run -d --name bikeride-backend \
      --restart unless-stopped \
      -p 5000:5000 \
      -e PORT=5000 \
      -e NODE_ENV=production \
      -e DATABASE_URL="postgresql://bikeride:<password>@<rds-endpoint>:5432/postgres?schema=public" \
      -e JWT_SECRET="$(openssl rand -hex 32)" \
      -e JWT_EXPIRES_IN=7d \
      -e CLIENT_URL="https://<your-amplify-domain>" \
      -e PAYMENT_KEY_ID=mock \
      -e PAYMENT_KEY_SECRET=mock \
      -e PAYMENT_WEBHOOK_SECRET=mock \
      -e DEFAULT_PICKUP_RADIUS_KM=2 \
      -e DEFAULT_DESTINATION_RADIUS_KM=2 \
      -e DEFAULT_TIME_WINDOW_MINUTES=30 \
      -e PLATFORM_FEE_FLAT=5 \
      -e TRACKING_SNAPSHOT_INTERVAL_MS=20000 \
      -e TRACKING_STALE_AFTER_MS=30000 \
      bikeride-backend
    ```
    The container's `CMD` already runs migrations (`npm run migrate`) before starting the server, so the schema gets created automatically on first boot. `CLIENT_URL` can be a placeholder for now — fix it once Amplify gives you a real URL (Step 3), then re-run the `docker run` command with the updated value.
11. Verify it's up: `curl http://localhost:5000/health` (should return OK), then from your own machine, `http://<ec2-public-ip>:5000/health`.
12. **(Recommended once everything works)** Allocate an Elastic IP and associate it with this instance, so the address doesn't change if the instance restarts — remember it's only free while attached to a *running* instance.

---

## Step 3 — Amplify Hosting (frontend)

1. AWS Console → **Amplify** → **Host a web app** → connect your GitHub repo → pick the branch.
2. When it asks for the app root, set it to `frontend` (this is a monorepo).
3. Build settings — Amplify usually auto-detects Vite; confirm it looks like:
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: dist
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
   ```
4. Environment variables (App settings → Environment variables):
   ```
   VITE_API_BASE_URL=http://<ec2-public-ip>:5000/api
   VITE_SOCKET_URL=http://<ec2-public-ip>:5000
   ```
5. Save and deploy. Amplify gives you a URL like `https://main.xxxxxxxxxx.amplifyapp.com`.
6. Go back to EC2 (Step 2.10) and re-run the `docker run` command with `CLIENT_URL` set to that real Amplify URL, so CORS allows it:
   ```bash
   docker stop bikeride-backend && docker rm bikeride-backend
   # re-run the same docker run command with the correct CLIENT_URL
   ```

---

## Step 4 — Test it

1. Open the Amplify URL.
2. Register an account, log in.
3. Create a ride, search for a ride — confirms the DB + API round-trip works.
4. Open browser DevTools → Network tab if anything fails; a CORS error means `CLIENT_URL` on the backend doesn't match the Amplify URL exactly (including `https://`, no trailing slash).

---

## Later: HTTPS for the API

Right now the frontend calls the backend over plain HTTP on port 5000, which works but browsers will eventually warn about mixed content once Amplify serves the frontend over HTTPS. When ready, the simplest fix is Nginx + Let's Encrypt on the EC2 box, reverse-proxying port 443 → 5000 — happy to walk through that when you get there.

---

## Ongoing costs after month 12

Once the 12-month EC2/RDS free tier ends (or credits run out, whichever's first), this setup becomes roughly $10–15/month (t3.micro EC2 + db.t3.micro RDS running 24/7). Amplify Hosting's free tier has no expiry, so the frontend stays free indefinitely at hobby-project traffic.
