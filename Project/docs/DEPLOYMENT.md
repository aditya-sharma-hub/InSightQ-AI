# InsightIQ AI — Deployment Guide

## 1. Local Development

To run InsightIQ AI locally:

```powershell
cd "Project"
powershell -ExecutionPolicy Bypass -File .\server.ps1
```

Or using Node:

```powershell
cd "Project"
npm install
npm start
```

The server automatically scans for available ports (defaulting to 8085) and displays startup diagnostics at `http://localhost:8085/`.

---

## 2. Vercel Deployment Settings

When connecting `https://github.com/aditya-sharma-hub/InSightQ-AI` to Vercel:

| Setting | Value | Notes |
| :--- | :--- | :--- |
| **Root Directory** | `Project` | Crucial: The application lives in `Project/` |
| **Framework Preset** | `Other` | Zero-bundler React UMD + Express backend |
| **Build Command** | *Leave Empty / Disabled* | No Webpack/Vite build needed |
| **Install Command** | `npm install` | Installs dependencies |
| **Output Directory** | *Leave Empty / Default* | Static assets served from project root |

### Environment Variables
Configure the following in the Vercel Project Dashboard:

```env
# Supabase Configuration
SUPABASE_URL=https://<your-project-id>.supabase.co
SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Gemini AI Key
GEMINI_API_KEY=AIzaSy...

# Runtime Environment
NODE_ENV=production
```

### Serverless Architecture & Routing
- `api/index.js`: Serverless Function entry point exporting the Express `app` instance.
- `vercel.json`: Rewrites `/api/(.*)`, `/health*`, and `/config*` to `/api` while serving static assets (`index.html`, `styles/`, `theme/`, `assets/`, `app.js`) directly via Vercel Edge CDN.
- Dynamic port listener in `server.js` only activates in standalone mode (`require.main === module`), allowing frictionless zero-downtime serverless execution on Vercel.

---

## 3. Database & Migrations
Supabase migrations are located in `supabase/migrations/` and should be applied using the Supabase CLI or SQL Editor:
- Migrations `001` through `021`: Baseline schema, RLS, functions, and analytics tables.
- Migrations `20260807` through `20260814`: Storage security, catalog relationships, and role persistence.

