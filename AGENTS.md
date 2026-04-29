# AGENTS.md — Mission Control

## What This Is

Mission Control is the operator control plane for Bailey Eubanks' platform OS. It is a React + Express SPA that runs locally on port 4300 and provides a unified dashboard for managing:

- Astro Cleaning Services (ACS)
- Content Co-op (CCO)
- Aether Video OS — Co-Produce · Co-Script · Co-Cut · Co-Deliver
- Runtime fleet health
- Quotes, invoices, dispatch, scheduling
- AI packets and approvals

## Quick Start

```bash
cd /Users/baileyeubanks/Downloads/root-os-_-mission-control
./scripts/start-mission-control.sh        # dev mode (vite hot reload)
./scripts/start-mission-control.sh --build # production mode (static dist)
```

Then open: http://127.0.0.1:4300/admin

Local recovery mode bypasses Google Auth. You are automatically signed in as `operator` on localhost.

## Architecture

```
server.ts
  → src/server/app.ts (Express API)
    → src/server/mission-control-data.ts (static config + recovery store)
    → src/server/video-os-store.ts (Video OS project/asset/agent/recovery store)
    → src/server/root-billing-store.ts (quote/invoice logic)
    → src/server/packet-service.ts (AI packet queue)
    → src/server/handoff-store.ts (ACS/CCO handoffs)
  → Vite dev server (SPA mode) — serves React frontend
    → src/App.tsx (routing + auth)
    → src/pages/Dashboard.tsx (main landing)
    → src/pages/video/VideoDashboard.tsx (Video OS workspace)
    → src/pages/video/VideoResearch.tsx (Co-Script research)
    → src/pages/video/VideoEdit.tsx (Co-Cut editor)
    → src/pages/video/VideoDeliver.tsx (Co-Deliver hub)
    → src/pages/video/VideoAgents.tsx (AI agent fleet)
    → src/components/layout/Sidebar.tsx (navigation)
```

## Key API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/health` | Service status (supabase, twilio, gemini, packets) |
| `GET /api/mission-control/bootstrap` | Full dashboard payload |
| `GET /api/mission-control/adapter-gaps` | Plan 11 adapter gap ledger |
| `GET /api/mission-control/tasks` | Active work items |
| `GET /api/mission-control/rollout` | Current plan (MEGA_VALUE_PLAN_11) |
| `POST /api/root/quotes` | Create quote |
| `POST /api/root/invoices` | Create invoice |
| `POST /api/packets` | Enqueue AI packet |
| `POST /api/twilio/send` | Send SMS |
| `GET /api/video-os/bootstrap` | Video OS dashboard payload |
| `GET /api/video-os/projects` | List video projects |
| `POST /api/video-os/projects` | Create video project |
| `GET /api/video-os/agents` | List agent tasks |
| `POST /api/video-os/agents/dispatch` | Dispatch AI agent task |
| `GET /api/video-os/research` | List viral research |
| `GET /api/video-os/deliveries` | List delivery packages |
| `GET /api/video-os/projects/:id/assets` | List project assets |
| `POST /api/video-os/assets` | Create asset |
| `GET /api/video-os/assets/:id/comments` | Timeline comments |
| `POST /api/video-os/assets/:id/comments` | Add timeline comment |

## Active Plan

**MEGA_VALUE_PLAN_11** — "Read-only adapter spine before mutation"

Current focus: build read-only adapters over ACS and CCO data before exposing any mutation controls.

## Environment

Copy `.env.example` to `.env.local` and fill in:
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — canonical structured data
- `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_PHONE_NUMBER` — SMS
- `GEMINI_API_KEY` or `GOOGLE_API_KEY` — AI enrichment
- `STRIPE_SECRET_KEY` — billing (optional)

## Service Status

| Service | Config Required | Status Check |
|---------|----------------|--------------|
| Supabase | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | `/api/health` |
| Twilio | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | `/api/health` |
| Gemini | `GEMINI_API_KEY` or `GOOGLE_API_KEY` | `/api/health` |
| Packets | Supabase + model client | `/api/health` |

## Recovery Store

Local state (quotes, invoices, handoffs, approvals) is stored in:
- `.mission-control-recovery/` — runtime recovery data
- `.mission-control-audit/` — audit logs

These are local JSON stores, not committed to git.

## Port Authority

- Mission Control: **4300**
- Module donors: 4301-4306
- Platform Relief: 4317

## Aether Video OS — War Room Edition

The Video OS is a tactical video production operating system inside Mission Control. It is NOT a clone of Wipster, Sandcastles, Opus, Descript, or CapCut. It is a unified command center that weaponizes existing tools into a single producer workflow.

### Tactical Lanes

| Lane | System | Port | Route | What It Does |
|------|--------|------|-------|--------------|
| War Room | Mission Control native | 4300 | `/admin/video` | Tactical dashboard with live systems status |
| Shadow Intel | Mission Control native | 4300 | `/admin/video/research` | Gemini video analysis + viral research + URL recon |
| Phantom Cutter | Mission Control native | 4300 | `/admin/video/edit` | Client-side FFmpeg.wasm: trim, thumb, GIF, audio |
| Rapid Fire | Mission Control native | 4300 | `/admin/video/rapid-fire` | One-click pipeline: recon → intel → cut → battle plan |
| Dead Drop | Mission Control native | 4300 | `/admin/video/deliver` | Multi-platform publishing + scheduling |
| Agent Fleet | Mission Control native | 4300 | `/admin/video/agents` | AI operative dispatch |
| Co-Produce | co-produce donor | 4303 | Launch externally | Production planning intelligence |
| Co-Deliver | co-deliver donor | 4304 | Launch externally | Branded delivery surface |
| Video Review | video-review-platform | 4304 | Launch externally | Real-time collaboration + server ffmpeg |

### Technical Workarounds

**SharedArrayBuffer + COOP/COEP:**
Phantom Cutter requires SharedArrayBuffer for FFmpeg.wasm multi-threading. Added globally:
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

**Local FFmpeg Core Hosting:**
`@ffmpeg/ffmpeg` loads core WASM from unpkg CDN by default. CDN doesn't send CORP headers, so COOP/COEP blocks it. Fix: downloaded `ffmpeg-core.js` + `ffmpeg-core.wasm` (32MB) to `public/ffmpeg-core/`. Now works offline and with strict headers.

**iOS Safari Fallback:**
iOS Safari doesn't support SharedArrayBuffer in Web Workers. UI shows "Phantom Offline" with server fallback messaging. Server-side ffmpeg from Video Review Backend (4304) can be wired as fallback.

**Gemini Video Analysis:**
Uses Gemini 1.5 Pro's 1M token context window for up to 1-hour video analysis. Uploads video as base64 inline data. Parses structured JSON output with fallback to raw text if parsing fails.

### Data Storage
Video OS data is stored in `.mission-control-recovery/` alongside other recovery stores.

## Build & Deploy

```bash
npm run build    # Vite build → dist/
npm run preview  # Preview production build
npm run lint     # Type check
npm run test     # Vitest
```

## Do Not

- Deploy publicly without approval
- Expose mutation controls before adapter gaps are closed
- Rename repo or restructure without updating this file
- Merge donor apps into Mission Control directly (use adapters)
