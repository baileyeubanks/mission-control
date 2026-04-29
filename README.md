# Mission Control

Operational ERP and client portal for **Astro Cleaning Services** and **Content Co-op**.

## Features

### Finance & Billing
- **Quotes & Invoices** — Create, edit, approve, and issue professional documents
- **PDF Generation** — High-quality HTML-to-PDF via Puppeteer with inline Inter font
- **Stripe Payments** — Embedded checkout, payment links, and webhook handling
- **Bank Reconciliation** — CSV upload, transaction matching, reconciliation workflow

### Creative Briefs
- **Public Intake** — 9-step progressive brief form at `/brief` (dark premium CCO aesthetic)
- **Admin Review** — AI enrichment, complexity scoring, budget estimation, convert to proposal
- **Auto-save** — Progress saved to backend on every step change

### Service Catalog
- CRUD for both company service lines (ACS cleaning, CCO video production)

### Video OS
- Project management, asset tracking, timeline comments, agent tasks, viral research

## Tech Stack

- **Frontend:** React 19 + Vite + Tailwind CSS v4 + Framer Motion
- **Backend:** Express + TypeScript (Node 22 with `--experimental-strip-types`)
- **PDF:** puppeteer-core + @sparticuz/chromium (cloud-compatible)
- **Payments:** Stripe (server SDK + React Stripe.js)
- **AI:** Google Gemini SDK with deterministic fallback
- **Database:** Supabase (PostgreSQL + JSONB) with local JSON fallback
- **Queue:** Packet factory with Supabase-backed job queue

## Local Development

```bash
npm install
npm run dev          # Start dev server on :4300
npm run lint         # TypeScript check
npm run build        # Vite production build
npm start            # Production server
```

Copy `.env.example` to `.env.local` and fill in your keys.

## Deployment

### Render (Recommended)

**[Deploy to Render →](https://dashboard.render.com/blueprint/new?repo=https://github.com/baileyeubanks/mission-control)**

Or manually:
1. Go to [dashboard.render.com](https://dashboard.render.com)
2. **New +** → **Blueprint**
3. Paste `https://github.com/baileyeubanks/mission-control`
4. Render reads `render.yaml` and provisions the service

### Required Environment Secrets

Set these in the Render dashboard after deployment:

| Variable | Purpose | Get From |
|---|---|---|
| `STRIPE_SECRET_KEY` | Server-side Stripe | [Stripe Dashboard](https://dashboard.stripe.com/apikeys) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Client-side Stripe | Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | Webhook verification | `stripe listen --print-secret` |
| `GEMINI_API_KEY` | AI enrichment | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `SUPABASE_URL` | Database URL | Supabase project settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Server DB access | Supabase project settings → API |

### Supabase Setup

1. Create a Supabase project
2. Run the migrations in `supabase/migrations/` (00001–00004)
3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Render env vars

The app auto-syncs all writes to Supabase. On server restart, data is hydrated from Supabase back into local JSON files, so nothing is lost.

### Custom Domain

1. In Render dashboard → your service → **Settings** → **Custom Domains**
2. Add `admin.contentco-op.com`
3. In your DNS provider, create a **CNAME** pointing to Render's URL

### Data Persistence Note

Render's **free tier** has ephemeral disks. Data in `.data/` and `.mission-control-recovery/` resets on every deploy. To persist data:
- **Option A:** Upgrade to Render **Starter ($7/mo)** + add a disk
- **Option B:** Use Supabase (already configured) — data syncs automatically

## Project Structure

```
src/
  pages/              # React page components
  server/             # Express routes + data stores
    app.ts            # Main server with all API routes
    root-billing-store.ts
    creative-brief-store.ts
    bank-store.ts
    catalog-store.ts
    data-adapter.ts   # Supabase ↔ JSON fallback layer
  lib/                # Shared types and utilities
supabase/migrations/  # Database schema
render.yaml           # Render Blueprint
```

## License

Apache-2.0
