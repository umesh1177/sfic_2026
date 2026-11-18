# Deploying Swachh Setu / My Clean Navsari on Render

This repository is pre-configured for zero-friction deployment on **Render** (`render.com`).

---

## Option A — 1-Click Blueprint Deploy (Recommended)

1. Go to [Render Dashboard](https://dashboard.render.com) → **New +** → **Blueprint**.
2. Connect your GitHub repository (`https://github.com/umesh1177/sfic_2026`) and select branch **`umesh`**.
3. Render automatically detects `render.yaml` and provisions all 4 resources together:
   - **`swachh-setu-db`** — Managed PostgreSQL database (`my_clean_navsari`)
   - **`swachh-setu-backend`** — Node.js Express API (`/api/health`)
   - **`swachh-setu-ml`** — FastAPI AI/ML service (`/health`)
   - **`swachh-setu-frontend`** — Vite React Static Site with SPA routing (`/* → /index.html`)
4. Click **Apply** and wait for the builds to finish.
5. On first backend startup, `bootstrapDb.ts` automatically creates all tables and loads initial seed data into the empty Render PostgreSQL database (safe on restarts — never drops existing data).

---

## Option B — Manual Render Service Setup

If you prefer creating services one by one in Render:

### 1. PostgreSQL Database
- **New + → PostgreSQL** → Name: `swachh-setu-db`, Plan: `Free`.
- Copy its **Internal Database URL** (for Backend on Render).

### 2. Backend Web Service
- **Root Directory:** `backend`
- **Build Command:** `npm install --include=dev && npm run build`
- **Start Command:** `npm start`
- **Health Check Path:** `/api/health`
- **Environment Variables:**
  - `NODE_VERSION` = `22.20.0`
  - `NODE_ENV` = `production`
  - `DB_SSL` = `true`
  - `DATABASE_URL` = *(paste Render Internal Database URL)*
  - `JWT_SECRET` = *(any strong random secret)*
  - `ML_SERVICE_URL` = *(optional — URL of your ML service; backend also has built-in CV + Online k-NN fallback)*

### 3. AI/ML Web Service *(Optional — Lightweight Free Tier)*
- **Root Directory:** `ml-service`
- **Build Command:** `pip install --upgrade pip && pip install -r requirements-render.txt`
- **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Health Check Path:** `/health`
- **Environment Variables:**
  - `PYTHON_VERSION` = `3.11.9`
  - `DISABLE_TORCH` = `true`

### 4. Frontend Static Site
- **Root Directory:** `frontend`
- **Build Command:** `npm install --include=dev && npm run build`
- **Publish Directory:** `dist`
- **Redirects/Rewrites:** Source `/*` → Destination `/index.html` → Action `Rewrite`
- **Environment Variables:**
  - `NODE_VERSION` = `22.20.0`
  - `VITE_API_URL` = `https://<your-backend-service>.onrender.com/api`

---

## Built-In Production Safeguards Already Included
- **Automatic PostgreSQL SSL** (`rejectUnauthorized: false`) for Render/cloud DB URLs + idle pool error handling.
- **Automatic Idempotent DB Bootstrap** on first startup for empty Render PostgreSQL databases.
- **Express `trust proxy`** enabled so `express-rate-limit` works properly behind Render's proxy.
- **Smart URL Normalization** in both `VITE_API_URL` and `ML_SERVICE_URL` (handles missing `https://` or `/api` suffix automatically).
- **Render Free-Tier ML Mode** (`requirements-render.txt` + `DISABLE_TORCH=true`) prevents 512MB RAM OOM while keeping fast image classification, relevance filtering, and online learning active.
- **Cold-Start Note:** Free-tier Render web services spin down after 15 minutes of inactivity; the first request after idle takes ~30–50 seconds to wake up.
