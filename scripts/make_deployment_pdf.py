"""
Generates BikeRide_Free_Deployment_Guide.pdf from the content of
FREE_DEPLOYMENT_GUIDE.md, using reportlab (no external converter needed).
Run: python scripts/make_deployment_pdf.py
"""
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    Preformatted, ListFlowable, ListItem, PageBreak, HRFlowable
)
from reportlab.lib.enums import TA_LEFT

OUTPUT_PATH = r"C:\Users\LENOVO\Downloads\BikeRide_Free_Deployment_Guide.pdf"

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="H1Custom", parent=styles["Heading1"], fontSize=20, spaceAfter=14, spaceBefore=6, textColor=colors.HexColor("#0F172A")))
styles.add(ParagraphStyle(name="H2Custom", parent=styles["Heading2"], fontSize=15, spaceAfter=10, spaceBefore=16, textColor=colors.HexColor("#0F766E")))
styles.add(ParagraphStyle(name="H3Custom", parent=styles["Heading3"], fontSize=12.5, spaceAfter=8, spaceBefore=12, textColor=colors.HexColor("#0F172A")))
styles.add(ParagraphStyle(name="BodyCustom", parent=styles["BodyText"], fontSize=10.3, leading=15, spaceAfter=8, alignment=TA_LEFT))
styles.add(ParagraphStyle(name="CodeCustom", parent=styles["Code"], fontSize=8.7, leading=11.5, backColor=colors.HexColor("#0B0F17"), textColor=colors.HexColor("#E2E8F0"), borderPadding=8, leftIndent=4))
styles.add(ParagraphStyle(name="Note", parent=styles["BodyText"], fontSize=9.5, leading=13.5, textColor=colors.HexColor("#334155"), backColor=colors.HexColor("#F1F5F9"), borderPadding=8, spaceAfter=10))

story = []

def h1(text):
    story.append(Paragraph(text, styles["H1Custom"]))

def h2(text):
    story.append(Paragraph(text, styles["H2Custom"]))

def h3(text):
    story.append(Paragraph(text, styles["H3Custom"]))

def p(text):
    story.append(Paragraph(text, styles["BodyCustom"]))

def code(text):
    story.append(Preformatted(text, styles["CodeCustom"]))
    story.append(Spacer(1, 8))

def note(text):
    story.append(Paragraph(text, styles["Note"]))

def bullets(items, ordered=False):
    flow_items = [ListItem(Paragraph(i, styles["BodyCustom"]), leftIndent=14) for i in items]
    story.append(ListFlowable(flow_items, bulletType="1" if ordered else "bullet", start=1, leftIndent=14))
    story.append(Spacer(1, 8))

def hr():
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", color=colors.HexColor("#CBD5E1"), thickness=0.6))
    story.append(Spacer(1, 10))

# ---------------------------------------------------------------- Title
story.append(Paragraph("BikeRide — Free-Tier Deployment Guide", styles["H1Custom"]))
story.append(Paragraph("Replacing the expired Railway trial with a permanently free stack", styles["Note"]))
story.append(Spacer(1, 6))

# ---------------------------------------------------------------- Why
h2("Why this document exists")
p("Railway's free plan is a <b>trial credit only</b> — once it's used up, every service drops "
  "to 0/online and stays there until a payment method is added. There is no free-forever tier on "
  "Railway. This guide replaces Railway with a stack that has <b>no credit card requirement</b> and "
  "<b>no time-limited trial</b>.")

table_data = [
    ["Piece", "Old (Railway)", "New (free)"],
    ["Frontend", "Vercel", "Vercel (unchanged)"],
    ["Backend (Node + Socket.IO)", "Railway", "Render.com free Web Service"],
    ["Database (Postgres + PostGIS)", "Railway Postgres", "Neon free Postgres"],
]
t = Table(table_data, colWidths=[1.7*inch, 1.7*inch, 2.5*inch])
t.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F766E")),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 9.3),
    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F1F5F9")]),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("TOPPADDING", (0, 0), (-1, -1), 6),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
]))
story.append(t)
story.append(Spacer(1, 12))

p("No application code changed. The backend and frontend already read every URL/secret from "
  "environment variables (<font face='Courier'>DATABASE_URL</font>, <font face='Courier'>CLIENT_URL</font>, "
  "<font face='Courier'>VITE_API_BASE_URL</font>, <font face='Courier'>VITE_SOCKET_URL</font>, etc.) — "
  "moving hosts is purely a matter of environment variables and where the Docker image runs.")

hr()

# ---------------------------------------------------------------- What was added
h2("What was added to the repo")
h3("1. render.yaml (new file, repo root)")
p("A Render \"Blueprint\" file. When you connect this repo to Render and choose \"New -&gt; Blueprint\", "
  "Render reads this file automatically and provisions the backend service without you having to click "
  "through every field by hand.")

code("""services:
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
        value: "30000\"""")

note("Why <b>sync: false</b> on two variables: Render can't know your Neon connection string or your "
     "Vercel domain ahead of time — those only exist after you create those two things. Every other "
     "variable has a fixed value and Render sets it for you automatically from the file.")

note("Why <b>dockerfilePath</b>/<b>dockerContext</b> point at backend: this repo has both frontend/ and "
     "backend/ at the root, each with their own Dockerfile. rootDir: backend tells Render to treat "
     "backend/ as the project root, so it builds backend/Dockerfile and ignores the frontend entirely.")

p("This file was committed and pushed to your GitHub repo "
  "(<font face='Courier'>michellejaiwhite98765-design/bike-ride-project</font>, commit "
  "<font face='Courier'>548555d</font>) so Render can see it.")

h3("Nothing else was changed")
p("No source files were modified. The existing backend/Dockerfile (which already runs "
  "<font face='Courier'>npm run migrate &amp;&amp; npm start</font> on boot) and the existing "
  "frontend/vercel.json are reused unchanged.")

hr()

# ---------------------------------------------------------------- Steps
h2("Steps you need to do yourself")
p("Account creation, logins, and entering passwords on third-party sites can't be done on your behalf — "
  "these steps need your own hands on the keyboard. Each one takes 2-5 minutes.")

h3("Step 1 — Neon (database)")
bullets([
    "Go to neon.tech and sign up (GitHub sign-in is fastest — no credit card asked).",
    "Click <b>New Project</b>. Any name/region is fine.",
    "Open the <b>SQL Editor</b> and run: <font face='Courier'>CREATE EXTENSION IF NOT EXISTS postgis;</font>",
    "Go to <b>Connection Details</b> and copy the connection string (starts with postgresql://...). "
    "Keep this for Step 2.",
], ordered=True)

h3("Step 2 — Render (backend)")
bullets([
    "Go to render.com and sign up with GitHub (no credit card asked for the free tier).",
    "Click <b>New</b> → <b>Blueprint</b>, connect GitHub if prompted, select the bike-ride-project repo.",
    "Render detects render.yaml automatically and shows the bikeride-backend service. Click <b>Apply</b>.",
    "Open the service → <b>Environment</b> tab, and fill in the two blank variables: "
    "DATABASE_URL (paste the Neon connection string) and CLIENT_URL (temporarily set to "
    "http://localhost:5173, you'll fix this in Step 4).",
    "Save — Render redeploys automatically. Wait for the build/deploy logs to finish (first boot runs "
    "database migrations, so it may take a little longer than usual).",
    "Once it says <b>Live</b>, copy the service URL, e.g. https://bikeride-backend.onrender.com",
], ordered=True)

note("Render's free web services spin down after ~15 minutes with no traffic, and take ~30-50 seconds "
     "to wake up on the next request. That's normal for the free tier — the site isn't broken, it's "
     "just cold-starting.")

h3("Step 3 — Vercel (frontend)")
bullets([
    "Go to vercel.com and sign in (you likely already have an account from the original deployment).",
    "Open your bikeride-frontend project → <b>Settings</b> → <b>Environment Variables</b>.",
    "Set VITE_API_BASE_URL to https://bikeride-backend.onrender.com/api and VITE_SOCKET_URL to "
    "https://bikeride-backend.onrender.com (use your real Render URL from Step 2).",
    "Go to <b>Deployments</b> → \"...\" menu on the latest deployment → <b>Redeploy</b> "
    "(Vite bakes env vars in at build time, so a redeploy is required).",
    "Copy your frontend URL, e.g. https://bikeride-frontend.vercel.app",
], ordered=True)

h3("Step 4 — close the loop")
bullets([
    "Back on Render → bikeride-backend → Environment.",
    "Set CLIENT_URL to your real Vercel URL from Step 3.",
    "Save — Render redeploys automatically.",
    "Open your Vercel URL and test: register/login, create a ride, search for a ride. CORS errors in "
    "the browser console mean CLIENT_URL on Render doesn't exactly match the Vercel URL.",
], ordered=True)

hr()

# ---------------------------------------------------------------- Verify
h2("Verifying it worked")
code("curl https://bikeride-backend.onrender.com/health")
p("Should return <font face='Courier'>{\"success\":true,\"message\":\"OK\"}</font>. (First request "
  "after idle may take 30-50s — that's the free-tier cold start, not a failure.)")
p("Swagger API docs: https://bikeride-backend.onrender.com/api/docs")

hr()

# ---------------------------------------------------------------- Local
h2("Running locally (unchanged from before)")
code("""# 1. Start Postgres + PostGIS via Docker
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
npm run dev                   # http://localhost:5173""")

p("Seeded login (after npm run seed): <font face='Courier'>ravi@bikeride.dev</font> (rider) / "
  "<font face='Courier'>priya@bikeride.dev</font> (passenger), password "
  "<font face='Courier'>password123</font> for both.")

hr()

# ---------------------------------------------------------------- Why not automated
h2("Why this couldn't be fully automated")
p("Creating accounts and logging into Neon/Render/Vercel requires entering credentials on third-party "
  "sites, which is outside what can be done on your behalf regardless of how the request is phrased — "
  "this is a fixed rule, not a preference. Everything that didn't require that (writing render.yaml, "
  "committing it, pushing it, writing this guide) is done. Once Steps 1-4 above are complete, share the "
  "Render and Vercel URLs for verification (health check, CORS, etc.) and further debugging if needed.")

doc = SimpleDocTemplate(
    OUTPUT_PATH, pagesize=letter,
    topMargin=0.75*inch, bottomMargin=0.75*inch,
    leftMargin=0.75*inch, rightMargin=0.75*inch,
    title="BikeRide Free Deployment Guide",
)
doc.build(story)
print(f"Saved: {OUTPUT_PATH}")
