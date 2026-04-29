# Root Ecosystem Repo Audit

Generated: 2026-04-24T21:41:13.515Z

## Executive Summary

- Repos found: 156
- Canonical candidates: 4
- Public authorities: 73
- Specialist apps: 7
- Parked/discarded: 3
- Unclassified donor candidates: 49

Root is the parent operator control plane. Mission Control is the company-specific operating backend/workspace inside Root. Public sites feed Root/Mission Control and must not become admin backends.

## Scanned Roots

- /Users/baileyeubanks/Desktop/Projects
- /Users/baileyeubanks/Downloads
- /Users/baileyeubanks/Documents/Codex

## Repo-By-Repo Findings

### Projects

- Intended role: AI/operator layer for drafts, triage, and auditable actions.
- Actual current state: ai-operator-layer (high)
- Framework: Next.js, Vite, Express, Firebase, Supabase
- Key routes: acs/acs-website/app/vite.config.js, astro-cleaning-onboarding/app/applet/update_skin.js, astro-cleaning-onboarding/app/applet/update_skin2.js, astrocleanings-admin/app/contracts/system.ts, astrocleanings-admin/app/lib/admin-session.ts, astrocleanings-admin/app/lib/astro-business.ts, astrocleanings-admin/app/lib/booking-bridge.ts, astrocleanings-admin/app/lib/commercial.ts
- Data connections: Supabase, Stripe, Google, Firebase, Twilio, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Treat as peripheral worker until Root can verify structured packets.
- Path: /Users/baileyeubanks/Desktop/Projects

### RTL

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: unknown
- Key routes: not detected
- Data connections: Google, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Desktop/Projects/Bankco - Tailwind CSS Admin Templates/RTL

### main_files

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: unknown
- Key routes: not detected
- Data connections: Google, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Desktop/Projects/Bankco - Tailwind CSS Admin Templates/main_files

### website-proxy-node

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: Express
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Desktop/Projects/Dify Command Center/integrations/website-proxy-node

### acs-website

- Intended role: Astro public conversion and quote-intake authority.
- Actual current state: public-site-authority (high)
- Framework: Vite, Express, Supabase, Stripe
- Key routes: app/src/App.jsx, app/src/components/AppShell.jsx, app/src/components/CompanyToggle.jsx, app/src/components/OfficeUI.jsx, app/src/components/OrbitSnapshot.jsx, app/src/components/ProtectedRoute.jsx, app/src/context/OfficeContext.jsx, app/src/lib/api.js
- Data connections: Supabase, Stripe, Google, Twilio, AI
- Broken/missing pieces: supabase_signal
- Recommended action: Keep public site separate; wire intake events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/acs/acs-website

### app

- Intended role: Astro public conversion and quote-intake authority.
- Actual current state: public-site-authority (high)
- Framework: Vite, React
- Key routes: src/pages/AgentsPage.jsx, src/pages/DashboardPage.jsx, src/pages/HealthPage.jsx, src/pages/InboxPage.jsx, src/pages/IssuesPage.jsx, src/pages/LandingPage.jsx, src/pages/LoginPage.jsx, src/pages/ProjectsPage.jsx
- Data connections: AI
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire intake events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/acs/acs-website/app

### monorepo-040a08a

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: Vite, Express, Supabase
- Key routes: apps/codeliver/app/global-error.tsx, apps/codeliver/app/layout.tsx, apps/codeliver/app/not-found.tsx, apps/coscript/app/global-error.tsx, apps/coscript/app/layout.tsx, apps/coscript/app/not-found.tsx, apps/home/app/ambient-video.tsx, apps/home/app/hero-video.tsx
- Data connections: Supabase, Google, AI
- Broken/missing pieces: supabase_signal
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/archive/2026-03-17-monorepo-home-recovery/monorepo-040a08a

### infra

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: Supabase
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Desktop/Projects/archive/2026-03-17-monorepo-home-recovery/monorepo-040a08a/infra

### monorepo-5a5c609

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: Vite, Express, Supabase
- Key routes: apps/codeliver/app/global-error.tsx, apps/codeliver/app/layout.tsx, apps/codeliver/app/not-found.tsx, apps/coscript/app/global-error.tsx, apps/coscript/app/layout.tsx, apps/coscript/app/not-found.tsx, apps/home/app/ambient-video.tsx, apps/home/app/hero-video.tsx
- Data connections: Supabase, Google, AI
- Broken/missing pieces: supabase_signal
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/archive/2026-03-17-monorepo-home-recovery/monorepo-5a5c609

### infra

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: Supabase
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Desktop/Projects/archive/2026-03-17-monorepo-home-recovery/monorepo-5a5c609/infra

### monorepo-7f98d9e

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: Vite, Express, Supabase
- Key routes: apps/codeliver/app/global-error.tsx, apps/codeliver/app/layout.tsx, apps/codeliver/app/not-found.tsx, apps/coscript/app/global-error.tsx, apps/coscript/app/layout.tsx, apps/coscript/app/not-found.tsx, apps/home/app/ambient-video.tsx, apps/home/app/hero-video.tsx
- Data connections: Supabase, Google, AI
- Broken/missing pieces: supabase_signal
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/archive/2026-03-17-monorepo-home-recovery/monorepo-7f98d9e

### infra

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: Supabase
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Desktop/Projects/archive/2026-03-17-monorepo-home-recovery/monorepo-7f98d9e/infra

### monorepo-9574129

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: Supabase
- Key routes: apps/home/app/ambient-video.tsx, apps/home/app/hero-video.tsx, apps/home/app/layout.tsx, apps/home/app/page.tsx, apps/home/app/rotating-gallery.tsx
- Data connections: Supabase, Google, AI
- Broken/missing pieces: supabase_signal
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/archive/2026-03-17-monorepo-home-recovery/monorepo-9574129

### infra

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: Supabase
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Desktop/Projects/archive/2026-03-17-monorepo-home-recovery/monorepo-9574129/infra

### monorepo-d26d217

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: Vite, Express, Supabase
- Key routes: apps/codeliver/app/global-error.tsx, apps/codeliver/app/layout.tsx, apps/codeliver/app/not-found.tsx, apps/coscript/app/global-error.tsx, apps/coscript/app/layout.tsx, apps/coscript/app/not-found.tsx, apps/home/app/ambient-video.tsx, apps/home/app/hero-section.tsx
- Data connections: Supabase, Google, AI
- Broken/missing pieces: supabase_signal
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/archive/2026-03-17-monorepo-home-recovery/monorepo-d26d217

### infra

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: Supabase
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Desktop/Projects/archive/2026-03-17-monorepo-home-recovery/monorepo-d26d217/infra

### monorepo-eda1440

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: Vite, Express, Supabase
- Key routes: apps/codeliver/app/global-error.tsx, apps/codeliver/app/layout.tsx, apps/codeliver/app/not-found.tsx, apps/coscript/app/global-error.tsx, apps/coscript/app/layout.tsx, apps/coscript/app/not-found.tsx, apps/home/app/ambient-video.tsx, apps/home/app/hero-video.tsx
- Data connections: Supabase, Google, AI
- Broken/missing pieces: supabase_signal
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/archive/2026-03-17-monorepo-home-recovery/monorepo-eda1440

### infra

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: Supabase
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Desktop/Projects/archive/2026-03-17-monorepo-home-recovery/monorepo-eda1440/infra

### 20260317-115203

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: Supabase
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Desktop/Projects/archive/repo-preservation/20260317-115203

### astro-cleaning-onboarding

- Intended role: Astro public conversion and quote-intake authority.
- Actual current state: public-site-authority (high)
- Framework: Vite, React, Express, Firebase, Supabase
- Key routes: app/applet/update_skin.js, app/applet/update_skin2.js
- Data connections: Supabase, Google, Firebase, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire intake events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/astro-cleaning-onboarding

### astrocleanings-admin

- Intended role: Astro public conversion and quote-intake authority.
- Actual current state: public-site-authority (high)
- Framework: unknown
- Key routes: app/api/bookings/route.ts, app/api/clients/route.ts, app/api/invoices/route.ts, app/api/quotes/route.ts, app/api/session/route.ts, app/contracts/system.ts, app/lib/admin-session.ts, app/lib/astro-business.ts
- Data connections: Supabase
- Broken/missing pieces: supabase_signal
- Recommended action: Keep public site separate; wire intake events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/astrocleanings-admin

### astrocleanings-site

- Intended role: Astro public conversion and quote-intake authority.
- Actual current state: public-site-authority (high)
- Framework: unknown
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire intake events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/astrocleanings-site

### brand

- Intended role: Content Co-op specialist production/review/delivery app.
- Actual current state: specialist-app (high)
- Framework: unknown
- Key routes: not detected
- Data connections: AI
- Broken/missing pieces: requires manual verification
- Recommended action: Integrate through project-context launch and rollup adapters; do not rebuild inside Root.
- Path: /Users/baileyeubanks/Desktop/Projects/brand

### business-core

- Intended role: AI/operator layer for drafts, triage, and auditable actions.
- Actual current state: ai-operator-layer (high)
- Framework: unknown
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Treat as peripheral worker until Root can verify structured packets.
- Path: /Users/baileyeubanks/Desktop/Projects/business-core

### agent-core

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: unknown
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Desktop/Projects/business-core/packages/agent-core

### billing-core

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: unknown
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Desktop/Projects/business-core/packages/billing-core

### documents-core

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: unknown
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Desktop/Projects/business-core/packages/documents-core

### identity-core

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: unknown
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Desktop/Projects/business-core/packages/identity-core

### ui-core

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: unknown
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Desktop/Projects/business-core/packages/ui-core

### ccnas-stack

- Intended role: Infrastructure/archive support, not business authority.
- Actual current state: infra-support (high)
- Framework: unknown
- Key routes: not detected
- Data connections: Supabase, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect for deploy/archive support only; keep out of Root product logic.
- Path: /Users/baileyeubanks/Desktop/Projects/ccnas-stack

### cc-events-worker

- Intended role: Infrastructure/archive support, not business authority.
- Actual current state: infra-support (high)
- Framework: Supabase
- Key routes: not detected
- Data connections: Supabase
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect for deploy/archive support only; keep out of Root product logic.
- Path: /Users/baileyeubanks/Desktop/Projects/ccnas-stack/scripts/cc-events-worker

### claude-code-commands-skills-agents

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: unknown
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Desktop/Projects/claude-code-commands-skills-agents

### codex-plugin-cc

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: unknown
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Desktop/Projects/codex-plugin-cc

### content-coop-admin

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: unknown
- Key routes: app/api/briefs/route.ts, app/api/invoices/route.ts, app/api/quotes/route.ts, app/api/session/route.ts, app/contracts/system.ts, app/lib/admin-session.ts, app/lib/brief-draft.ts, app/lib/commercial.ts
- Data connections: Supabase
- Broken/missing pieces: supabase_signal
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/content-coop-admin

### content-coop-site

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: unknown
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/content-coop-site

### contentco-op-brief-only

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: Vite, Express, Supabase, Stripe
- Key routes: apps/codeliver/app/global-error.tsx, apps/codeliver/app/layout.tsx, apps/codeliver/app/not-found.tsx, apps/coscript/app/global-error.tsx, apps/coscript/app/layout.tsx, apps/coscript/app/not-found.tsx, apps/home/app/ambient-video.tsx, apps/home/app/hero-copy-rotator.tsx
- Data connections: Supabase, Stripe, AI
- Broken/missing pieces: supabase_signal
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op-brief-only

### cocut

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: Vite, React, Supabase
- Key routes: not detected
- Data connections: Supabase, AI
- Broken/missing pieces: google_or_oauth_signal, supabase_signal
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op-brief-only/apps/cocut

### codeliver

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: Next.js, React, Supabase
- Key routes: app/(dashboard)/activity/page.tsx, app/(dashboard)/layout.tsx, app/(dashboard)/library/page.tsx, app/(dashboard)/page.tsx, app/(dashboard)/projects/page.tsx, app/api/activity/route.ts, app/api/assets/route.ts, app/api/folders/route.ts
- Data connections: Supabase, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op-brief-only/apps/codeliver

### coscript

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: Next.js, React, Supabase
- Key routes: app/(dashboard)/editor/page.tsx, app/(dashboard)/frameworks/page.tsx, app/(dashboard)/layout.tsx, app/(dashboard)/page.tsx, app/(dashboard)/research/page.tsx, app/(dashboard)/scripts/page.tsx, app/(dashboard)/vault/page.tsx, app/api/frameworks/route.ts
- Data connections: Supabase, AI
- Broken/missing pieces: google_or_oauth_signal, supabase_signal
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op-brief-only/apps/coscript

### home

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: Next.js, React, Express, Supabase, Stripe
- Key routes: app/ambient-video.tsx, app/api/briefs/route.ts, app/api/chat/assistant.ts, app/api/chat/domain-config.ts, app/api/chat/route.ts, app/api/dashboard/route.ts, app/api/health/route.ts, app/api/quotes/route.ts
- Data connections: Supabase, Stripe, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op-brief-only/apps/home

### infra

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: Supabase
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op-brief-only/infra

### api-client

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: unknown
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op-brief-only/packages/api-client

### brand

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: unknown
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op-brief-only/packages/brand

### identity-access

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: unknown
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op-brief-only/packages/identity-access

### pricing

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: unknown
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op-brief-only/packages/pricing

### types

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: unknown
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op-brief-only/packages/types

### ui

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: React
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op-brief-only/packages/ui

### media-worker

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: unknown
- Key routes: not detected
- Data connections: AI
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op-brief-only/services/media-worker

### orchestrator

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: unknown
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op-brief-only/services/orchestrator

### cocut

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: Vite, React, Supabase
- Key routes: not detected
- Data connections: Supabase, AI
- Broken/missing pieces: google_or_oauth_signal, supabase_signal
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/_archive/2026-03-17-legacy-standalone-repos/cocut

### codeliver

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: Next.js, React, Supabase
- Key routes: app/(dashboard)/activity/page.tsx, app/(dashboard)/layout.tsx, app/(dashboard)/library/page.tsx, app/(dashboard)/page.tsx, app/(dashboard)/projects/page.tsx, app/(dashboard)/reviews/page.tsx, app/(dashboard)/settings/page.tsx, app/(review)/layout.tsx
- Data connections: Supabase, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/_archive/2026-03-17-legacy-standalone-repos/codeliver

### coscript

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: Next.js, React, Supabase
- Key routes: app/(dashboard)/editor/page.tsx, app/(dashboard)/frameworks/page.tsx, app/(dashboard)/layout.tsx, app/(dashboard)/page.tsx, app/(dashboard)/research/page.tsx, app/(dashboard)/scripts/page.tsx, app/(dashboard)/vault/page.tsx, app/(dashboard)/wizard/page.tsx
- Data connections: Supabase, AI
- Broken/missing pieces: google_or_oauth_signal, supabase_signal
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/_archive/2026-03-17-legacy-standalone-repos/coscript

### home

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: Next.js, React, Express, Supabase, Stripe
- Key routes: app/ambient-video.tsx, app/api/briefs/route.ts, app/api/dashboard/route.ts, app/api/health/route.ts, app/api/quotes/route.ts, app/auth/callback/route.ts, app/book/head.tsx, app/book/page.tsx
- Data connections: Supabase, Stripe, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/_archive/2026-03-17-legacy-standalone-repos/home

### cocut

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: Vite, React, Supabase
- Key routes: not detected
- Data connections: Supabase, AI
- Broken/missing pieces: google_or_oauth_signal, supabase_signal
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/cocut

### codeliver

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: Next.js, React, Supabase
- Key routes: app/(dashboard)/activity/page.tsx, app/(dashboard)/layout.tsx, app/(dashboard)/library/page.tsx, app/(dashboard)/page.tsx, app/(dashboard)/projects/page.tsx, app/(dashboard)/reviews/page.tsx, app/(dashboard)/settings/page.tsx, app/(review)/layout.tsx
- Data connections: Supabase, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/codeliver

### api-client

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: unknown
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/codeliver/packages/api-client

### types

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: unknown
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/codeliver/packages/types

### coscript

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: Next.js, React, Supabase
- Key routes: app/(dashboard)/editor/page.tsx, app/(dashboard)/frameworks/page.tsx, app/(dashboard)/layout.tsx, app/(dashboard)/page.tsx, app/(dashboard)/research/page.tsx, app/(dashboard)/scripts/page.tsx, app/(dashboard)/vault/page.tsx, app/(dashboard)/wizard/page.tsx
- Data connections: Supabase, AI
- Broken/missing pieces: google_or_oauth_signal, supabase_signal
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/coscript

### api-client

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: unknown
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/coscript/packages/api-client

### types

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: unknown
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/coscript/packages/types

### home

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: Next.js, React, Express, Supabase, Stripe
- Key routes: app/ambient-video.tsx, app/api/briefs/route.ts, app/api/chat/assistant.ts, app/api/chat/domain-config.ts, app/api/chat/route.ts, app/api/dashboard/route.ts, app/api/health/route.ts, app/api/quotes/route.ts
- Data connections: Supabase, Stripe, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/home

### monorepo

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: Vite, Express, Supabase, Stripe
- Key routes: apps/codeliver/app/global-error.tsx, apps/codeliver/app/layout.tsx, apps/codeliver/app/not-found.tsx, apps/coscript/app/global-error.tsx, apps/coscript/app/layout.tsx, apps/coscript/app/not-found.tsx, apps/home/app/ambient-video.tsx, apps/home/app/hero-copy-rotator.tsx
- Data connections: Supabase, Stripe, AI
- Broken/missing pieces: supabase_signal
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/monorepo

### monorepo-publish

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: Vite, Express, Supabase, Stripe
- Key routes: apps/codeliver/app/global-error.tsx, apps/codeliver/app/layout.tsx, apps/codeliver/app/not-found.tsx, apps/coscript/app/global-error.tsx, apps/coscript/app/layout.tsx, apps/coscript/app/not-found.tsx, apps/home/app/ambient-video.tsx, apps/home/app/chat-widget.tsx
- Data connections: Supabase, Stripe, AI
- Broken/missing pieces: supabase_signal
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/monorepo-publish

### cocut

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: Vite, React, Supabase
- Key routes: not detected
- Data connections: Supabase, AI
- Broken/missing pieces: google_or_oauth_signal, supabase_signal
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/monorepo-publish/apps/cocut

### codeliver

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: Next.js, React, Supabase
- Key routes: app/(dashboard)/activity/page.tsx, app/(dashboard)/layout.tsx, app/(dashboard)/library/page.tsx, app/(dashboard)/page.tsx, app/(dashboard)/projects/page.tsx, app/api/activity/route.ts, app/api/assets/route.ts, app/api/folders/route.ts
- Data connections: Supabase, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/monorepo-publish/apps/codeliver

### coscript

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: Next.js, React, Supabase
- Key routes: app/(dashboard)/editor/page.tsx, app/(dashboard)/frameworks/page.tsx, app/(dashboard)/layout.tsx, app/(dashboard)/page.tsx, app/(dashboard)/research/page.tsx, app/(dashboard)/scripts/page.tsx, app/(dashboard)/vault/page.tsx, app/api/frameworks/route.ts
- Data connections: Supabase, AI
- Broken/missing pieces: google_or_oauth_signal, supabase_signal
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/monorepo-publish/apps/coscript

### home

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: Next.js, React, Express, Supabase, Stripe
- Key routes: app/ambient-video.tsx, app/api/briefs/route.ts, app/api/chat/route.ts, app/api/dashboard/route.ts, app/api/health/route.ts, app/api/quotes/route.ts, app/auth/callback/route.ts, app/book/head.tsx
- Data connections: Supabase, Stripe, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/monorepo-publish/apps/home

### infra

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: Supabase
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/monorepo-publish/infra

### api-client

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: unknown
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/monorepo-publish/packages/api-client

### brand

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: unknown
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/monorepo-publish/packages/brand

### identity-access

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: unknown
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/monorepo-publish/packages/identity-access

### pricing

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: unknown
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/monorepo-publish/packages/pricing

### types

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: unknown
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/monorepo-publish/packages/types

### ui

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: React
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/monorepo-publish/packages/ui

### media-worker

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: unknown
- Key routes: not detected
- Data connections: AI
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/monorepo-publish/services/media-worker

### orchestrator

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: unknown
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/monorepo-publish/services/orchestrator

### cocut

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: Vite, React, Supabase
- Key routes: not detected
- Data connections: Supabase, AI
- Broken/missing pieces: google_or_oauth_signal, supabase_signal
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/monorepo/apps/cocut

### codeliver

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: Next.js, React, Supabase
- Key routes: app/(dashboard)/activity/page.tsx, app/(dashboard)/layout.tsx, app/(dashboard)/library/page.tsx, app/(dashboard)/page.tsx, app/(dashboard)/projects/page.tsx, app/api/activity/route.ts, app/api/assets/route.ts, app/api/folders/route.ts
- Data connections: Supabase, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/monorepo/apps/codeliver

### coscript

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: Next.js, React, Supabase
- Key routes: app/(dashboard)/editor/page.tsx, app/(dashboard)/frameworks/page.tsx, app/(dashboard)/layout.tsx, app/(dashboard)/page.tsx, app/(dashboard)/research/page.tsx, app/(dashboard)/scripts/page.tsx, app/(dashboard)/vault/page.tsx, app/api/frameworks/route.ts
- Data connections: Supabase, AI
- Broken/missing pieces: google_or_oauth_signal, supabase_signal
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/monorepo/apps/coscript

### home

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: Next.js, React, Express, Supabase, Stripe
- Key routes: app/ambient-video.tsx, app/api/briefs/route.ts, app/api/chat/assistant.ts, app/api/chat/domain-config.ts, app/api/chat/route.ts, app/api/dashboard/route.ts, app/api/health/route.ts, app/api/quotes/route.ts
- Data connections: Supabase, Stripe, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/monorepo/apps/home

### infra

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: Supabase
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/monorepo/infra

### api-client

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: unknown
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/monorepo/packages/api-client

### brand

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: unknown
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/monorepo/packages/brand

### identity-access

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: unknown
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/monorepo/packages/identity-access

### pricing

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: unknown
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/monorepo/packages/pricing

### types

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: unknown
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/monorepo/packages/types

### ui

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: React
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/monorepo/packages/ui

### media-worker

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: unknown
- Key routes: not detected
- Data connections: AI
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/monorepo/services/media-worker

### orchestrator

- Intended role: Content Co-op public conversion and creative-brief authority.
- Actual current state: public-site-authority (high)
- Framework: unknown
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire brief events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/contentco-op/monorepo/services/orchestrator

### crater-master

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: Vite
- Key routes: not detected
- Data connections: Stripe, AI
- Broken/missing pieces: google_or_oauth_signal, stripe_signal
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Desktop/Projects/crater-master

### ignition

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: unknown
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Desktop/Projects/crater-master/vendor/facade/ignition

### dify

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: Vite, Express
- Key routes: web/app/(commonLayout)/layout.tsx, web/app/(commonLayout)/role-route-guard.spec.tsx, web/app/(commonLayout)/role-route-guard.tsx, web/app/(shareLayout)/layout.tsx, web/app/activate/activateForm.tsx, web/app/activate/page.tsx, web/app/components/app-initializer.tsx, web/app/components/browser-initializer.tsx
- Data connections: Supabase, Google, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Desktop/Projects/dify

### nodejs-client

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: unknown
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Desktop/Projects/dify/sdks/nodejs-client

### web

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: Next.js, Vite, React, Express
- Key routes: app/(commonLayout)/apps/page.tsx, app/(commonLayout)/datasets/layout.spec.tsx, app/(commonLayout)/datasets/layout.tsx, app/(commonLayout)/datasets/page.tsx, app/(commonLayout)/education-apply/page.tsx, app/(commonLayout)/explore/layout.tsx, app/(commonLayout)/layout.tsx, app/(commonLayout)/plugins/page.tsx
- Data connections: Google, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Desktop/Projects/dify/web

### i18n-config

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: Express
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Desktop/Projects/dify/web/i18n-config

### next

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: Express
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Desktop/Projects/dify/web/next

### dev-proxy

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: Express
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Desktop/Projects/dify/web/plugins/dev-proxy

### dramatron-app

- Intended role: Research/intelligence support lane.
- Actual current state: donor (medium)
- Framework: unknown
- Key routes: not detected
- Data connections: AI
- Broken/missing pieces: google_or_oauth_signal
- Recommended action: Extract useful pipelines only after core Root workflows are working.
- Path: /Users/baileyeubanks/Desktop/Projects/dramatron-app

### dramatron-ui

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: Next.js, React
- Key routes: src/app/layout.tsx, src/app/page.tsx
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Desktop/Projects/dramatron-ui

### field-mobile

- Intended role: Astro public conversion and quote-intake authority.
- Actual current state: public-site-authority (high)
- Framework: React, Supabase
- Key routes: not detected
- Data connections: Supabase
- Broken/missing pieces: contains_mock_or_placeholder_language, supabase_signal
- Recommended action: Keep public site separate; wire intake events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/field-mobile

### frappe_docker

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: unknown
- Key routes: not detected
- Data connections: AI
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Desktop/Projects/frappe_docker

### docs

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: unknown
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Desktop/Projects/frappe_docker/docs

### hermes-agent

- Intended role: AI/operator layer for drafts, triage, and auditable actions.
- Actual current state: ai-operator-layer (high)
- Framework: Vite
- Key routes: ui-tui/src/app/createGatewayEventHandler.ts, ui-tui/src/app/createSlashHandler.ts, ui-tui/src/app/delegationStore.ts, ui-tui/src/app/gatewayContext.tsx, ui-tui/src/app/inputSelectionStore.ts, ui-tui/src/app/interfaces.ts, ui-tui/src/app/overlayStore.ts, ui-tui/src/app/setupHandoff.ts
- Data connections: Google, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Treat as peripheral worker until Root can verify structured packets.
- Path: /Users/baileyeubanks/Desktop/Projects/hermes-agent

### whatsapp-bridge

- Intended role: AI/operator layer for drafts, triage, and auditable actions.
- Actual current state: ai-operator-layer (high)
- Framework: Express
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Treat as peripheral worker until Root can verify structured packets.
- Path: /Users/baileyeubanks/Desktop/Projects/hermes-agent/scripts/whatsapp-bridge

### ui-tui

- Intended role: AI/operator layer for drafts, triage, and auditable actions.
- Actual current state: ai-operator-layer (high)
- Framework: React
- Key routes: src/app/createGatewayEventHandler.ts, src/app/createSlashHandler.ts, src/app/delegationStore.ts, src/app/gatewayContext.tsx, src/app/inputSelectionStore.ts, src/app/interfaces.ts, src/app/overlayStore.ts, src/app/setupHandoff.ts
- Data connections: AI
- Broken/missing pieces: requires manual verification
- Recommended action: Treat as peripheral worker until Root can verify structured packets.
- Path: /Users/baileyeubanks/Desktop/Projects/hermes-agent/ui-tui

### hermes-ink

- Intended role: AI/operator layer for drafts, triage, and auditable actions.
- Actual current state: ai-operator-layer (high)
- Framework: React
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Treat as peripheral worker until Root can verify structured packets.
- Path: /Users/baileyeubanks/Desktop/Projects/hermes-agent/ui-tui/packages/hermes-ink

### web

- Intended role: AI/operator layer for drafts, triage, and auditable actions.
- Actual current state: ai-operator-layer (high)
- Framework: Vite, React
- Key routes: src/pages/AnalyticsPage.tsx, src/pages/ConfigPage.tsx, src/pages/CronPage.tsx, src/pages/EnvPage.tsx, src/pages/LogsPage.tsx, src/pages/SessionsPage.tsx, src/pages/SkillsPage.tsx, src/pages/StatusPage.tsx
- Data connections: AI
- Broken/missing pieces: requires manual verification
- Recommended action: Treat as peripheral worker until Root can verify structured packets.
- Path: /Users/baileyeubanks/Desktop/Projects/hermes-agent/web

### website

- Intended role: AI/operator layer for drafts, triage, and auditable actions.
- Actual current state: ai-operator-layer (high)
- Framework: React
- Key routes: src/pages/skills/index.tsx
- Data connections: Google, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Treat as peripheral worker until Root can verify structured packets.
- Path: /Users/baileyeubanks/Desktop/Projects/hermes-agent/website

### InvoiceShelf

- Intended role: Company-scoped execution layer candidate.
- Actual current state: parked (high)
- Framework: Vite
- Key routes: not detected
- Data connections: Stripe, AI
- Broken/missing pieces: google_or_oauth_signal, stripe_signal
- Recommended action: Keep optional until Root/Mission Control workflows prove need.
- Path: /Users/baileyeubanks/Desktop/Projects/output/google-hermes-paperclip-invoice-packet-2026-04-11/InvoiceShelf

### acs-website

- Intended role: Astro public conversion and quote-intake authority.
- Actual current state: public-site-authority (high)
- Framework: Supabase
- Key routes: app/src/lib/rootAdapters.js, app/src/pages/RootInvoicesPage.jsx
- Data connections: Stripe, AI
- Broken/missing pieces: google_or_oauth_signal
- Recommended action: Keep public site separate; wire intake events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/output/google-hermes-paperclip-invoice-packet-2026-04-11/acs/acs-website

### hermes-agent

- Intended role: Company-scoped execution layer candidate.
- Actual current state: parked (high)
- Framework: unknown
- Key routes: not detected
- Data connections: Google, AI
- Broken/missing pieces: google_or_oauth_signal
- Recommended action: Keep optional until Root/Mission Control workflows prove need.
- Path: /Users/baileyeubanks/Desktop/Projects/output/google-hermes-paperclip-invoice-packet-2026-04-11/hermes-agent

### website

- Intended role: Company-scoped execution layer candidate.
- Actual current state: parked (high)
- Framework: React
- Key routes: not detected
- Data connections: AI
- Broken/missing pieces: google_or_oauth_signal
- Recommended action: Keep optional until Root/Mission Control workflows prove need.
- Path: /Users/baileyeubanks/Desktop/Projects/output/google-hermes-paperclip-invoice-packet-2026-04-11/hermes-agent/website

### acs-website

- Intended role: Astro public conversion and quote-intake authority.
- Actual current state: public-site-authority (high)
- Framework: Supabase
- Key routes: not detected
- Data connections: Stripe, AI
- Broken/missing pieces: google_or_oauth_signal
- Recommended action: Keep public site separate; wire intake events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/output/google-quote-engine-packet-2026-04-11/acs/acs-website

### platform

- Intended role: AI/operator layer for drafts, triage, and auditable actions.
- Actual current state: ai-operator-layer (high)
- Framework: unknown
- Key routes: not detected
- Data connections: Supabase, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Treat as peripheral worker until Root can verify structured packets.
- Path: /Users/baileyeubanks/Desktop/Projects/platform

### research

- Intended role: AI/operator layer for drafts, triage, and auditable actions.
- Actual current state: ai-operator-layer (high)
- Framework: Next.js
- Key routes: not detected
- Data connections: Supabase, AI
- Broken/missing pieces: supabase_signal
- Recommended action: Treat as peripheral worker until Root can verify structured packets.
- Path: /Users/baileyeubanks/Desktop/Projects/research

### deer-flow

- Intended role: Research/intelligence support lane.
- Actual current state: donor (medium)
- Framework: Next.js
- Key routes: frontend/src/app/layout.tsx, frontend/src/app/page.tsx
- Data connections: AI
- Broken/missing pieces: contains_mock_or_placeholder_language
- Recommended action: Extract useful pipelines only after core Root workflows are working.
- Path: /Users/baileyeubanks/Desktop/Projects/research/deer-flow

### frontend

- Intended role: Research/intelligence support lane.
- Actual current state: donor (medium)
- Framework: Next.js, React, Express
- Key routes: src/app/layout.tsx, src/app/page.tsx, src/app/workspace/layout.tsx, src/app/workspace/page.tsx
- Data connections: AI
- Broken/missing pieces: contains_mock_or_placeholder_language
- Recommended action: Extract useful pipelines only after core Root workflows are working.
- Path: /Users/baileyeubanks/Desktop/Projects/research/deer-flow/frontend

### rapidaai-voice-ai

- Intended role: Research/intelligence support lane.
- Actual current state: donor (medium)
- Framework: unknown
- Key routes: ui/src/app/index.tsx
- Data connections: Google, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Extract useful pipelines only after core Root workflows are working.
- Path: /Users/baileyeubanks/Desktop/Projects/research/voice-ai/rapidaai-voice-ai

### ui

- Intended role: Research/intelligence support lane.
- Actual current state: donor (medium)
- Framework: React
- Key routes: src/app/index.tsx, src/app/routes/account.tsx, src/app/routes/auth.tsx, src/app/routes/connect-action.tsx, src/app/routes/connect-knowledge.tsx, src/app/routes/dashboard.tsx, src/app/routes/deployment.tsx, src/app/routes/index.tsx
- Data connections: Google, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Extract useful pipelines only after core Root workflows are working.
- Path: /Users/baileyeubanks/Desktop/Projects/research/voice-ai/rapidaai-voice-ai/ui

### root

- Intended role: Astro public conversion and quote-intake authority.
- Actual current state: public-site-authority (high)
- Framework: Next.js, React, Supabase, Stripe
- Key routes: app/(protected)/actions.ts, app/(protected)/approvals/page.tsx, app/(protected)/catalog/page.tsx, app/(protected)/ceo/page.tsx, app/(protected)/clients/page.tsx, app/(protected)/contacts/page.tsx, app/(protected)/dashboard/page.tsx, app/(protected)/dispatch/page.tsx
- Data connections: Supabase, Stripe, Google, AI
- Broken/missing pieces: contains_mock_or_placeholder_language, supabase_signal
- Recommended action: Keep public site separate; wire intake events into Root/Mission Control.
- Path: /Users/baileyeubanks/Desktop/Projects/root

### screenplay-formatter

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: Next.js, React
- Key routes: src/app/layout.tsx, src/app/page.tsx
- Data connections: AI
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Desktop/Projects/screenplay-formatter

### starc

- Intended role: Research/intelligence support lane.
- Actual current state: donor (medium)
- Framework: unknown
- Key routes: not detected
- Data connections: AI
- Broken/missing pieces: requires manual verification
- Recommended action: Extract useful pipelines only after core Root workflows are working.
- Path: /Users/baileyeubanks/Desktop/Projects/starc

### starc-formatter

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: Vite, React
- Key routes: not detected
- Data connections: AI
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Desktop/Projects/starc-formatter

### supabase

- Intended role: AI/operator layer for drafts, triage, and auditable actions.
- Actual current state: ai-operator-layer (high)
- Framework: Supabase
- Key routes: not detected
- Data connections: Supabase, Stripe, AI
- Broken/missing pieces: supabase_signal
- Recommended action: Treat as peripheral worker until Root can verify structured packets.
- Path: /Users/baileyeubanks/Desktop/Projects/supabase

### Admin

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: unknown
- Key routes: not detected
- Data connections: Google, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Desktop/Projects/vault_assets/Techmin_v1.0/Admin

### astro-cleaning-onboarding

- Intended role: Astro public conversion and quote-intake authority.
- Actual current state: public-site-authority (high)
- Framework: Vite, React, Express, Firebase, Supabase
- Key routes: not detected
- Data connections: Supabase, Google, Firebase, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Keep public site separate; wire intake events into Root/Mission Control.
- Path: /Users/baileyeubanks/Downloads/astro-cleaning-onboarding

### co-deliver

- Intended role: Content Co-op specialist production/review/delivery app.
- Actual current state: specialist-app (high)
- Framework: Vite, React, Express, Firebase
- Key routes: src/pages/BriefBuilder.tsx, src/pages/Dashboard.tsx, src/pages/Landing.tsx, src/pages/ProjectView.tsx, src/pages/ReviewPlayer.tsx
- Data connections: Google, Firebase, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Integrate through project-context launch and rollup adapters; do not rebuild inside Root.
- Path: /Users/baileyeubanks/Downloads/co-deliver

### co-deliver 2

- Intended role: Content Co-op specialist production/review/delivery app.
- Actual current state: specialist-app (high)
- Framework: Vite, React, Express, Firebase
- Key routes: src/pages/BriefBuilder.tsx, src/pages/Dashboard.tsx, src/pages/Landing.tsx, src/pages/ProjectView.tsx, src/pages/ReviewPlayer.tsx
- Data connections: Google, Firebase, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Integrate through project-context launch and rollup adapters; do not rebuild inside Root.
- Path: /Users/baileyeubanks/Downloads/co-deliver 2

### co-produce

- Intended role: Content Co-op specialist production/review/delivery app.
- Actual current state: specialist-app (high)
- Framework: Vite, React, Express, Firebase
- Key routes: not detected
- Data connections: Google, Firebase, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Integrate through project-context launch and rollup adapters; do not rebuild inside Root.
- Path: /Users/baileyeubanks/Downloads/co-produce

### co-produce 2

- Intended role: Content Co-op specialist production/review/delivery app.
- Actual current state: specialist-app (high)
- Framework: Vite, React, Express, Firebase
- Key routes: not detected
- Data connections: Google, Firebase, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Integrate through project-context launch and rollup adapters; do not rebuild inside Root.
- Path: /Users/baileyeubanks/Downloads/co-produce 2

### co-produce-2

- Intended role: Content Co-op specialist production/review/delivery app.
- Actual current state: specialist-app (high)
- Framework: Vite, React, Express, Firebase
- Key routes: app/applet/fix_fonts.ts
- Data connections: Google, Firebase, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Integrate through project-context launch and rollup adapters; do not rebuild inside Root.
- Path: /Users/baileyeubanks/Downloads/co-produce-2

### hermes-concierge

- Intended role: AI/operator layer for drafts, triage, and auditable actions.
- Actual current state: ai-operator-layer (high)
- Framework: Vite, React, Express, Supabase
- Key routes: not detected
- Data connections: Supabase, Google, Twilio, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Treat as peripheral worker until Root can verify structured packets.
- Path: /Users/baileyeubanks/Downloads/hermes-concierge

### listing-to-campaign-engine

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: Vite, React, Express
- Key routes: not detected
- Data connections: Google, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Downloads/listing-to-campaign-engine

### mission-control---acs-admin

- Intended role: Root/Mission Control shell or contract donor.
- Actual current state: root-candidate (high)
- Framework: Vite, React, Express
- Key routes: src/pages/Clients.tsx, src/pages/Dashboard.tsx, src/pages/Finance.tsx, src/pages/Login.tsx, src/pages/Quotes.tsx, src/pages/Requests.tsx, src/pages/Schedule.tsx, src/pages/Tasks.tsx
- Data connections: Google, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Compare against audit evidence before promoting as canonical Root.
- Path: /Users/baileyeubanks/Downloads/mission-control---acs-admin

### platform-relief

- Intended role: Separate Pro-Se public/business surface.
- Actual current state: public-site-authority (medium)
- Framework: Vite, React, Express, Firebase, Stripe
- Key routes: src/pages/AcknowledgementGate.tsx, src/pages/Dashboard.tsx, src/pages/IntakeWizard.tsx, src/pages/Landing.tsx, src/pages/Mission.tsx, src/pages/Payment.tsx, src/pages/Settings.tsx, src/pages/SpecViewer.tsx
- Data connections: Stripe, Google, Firebase, AI
- Broken/missing pieces: google_or_oauth_signal, stripe_signal
- Recommended action: Keep separate from ACS/CCO while capturing its boundaries in Root canon.
- Path: /Users/baileyeubanks/Downloads/platform-relief

### root

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: Vite, React, Express, Firebase, Supabase, Stripe
- Key routes: not detected
- Data connections: Supabase, Stripe, Google, Firebase, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Downloads/root

### root-2

- Intended role: Root/Mission Control shell or contract donor.
- Actual current state: root-candidate (high)
- Framework: Vite, React, Express, Firebase, Supabase, Stripe
- Key routes: not detected
- Data connections: Supabase, Stripe, Google, Firebase, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Compare against audit evidence before promoting as canonical Root.
- Path: /Users/baileyeubanks/Downloads/root-2

### root-os

- Intended role: Root/Mission Control shell or contract donor.
- Actual current state: root-candidate (high)
- Framework: Vite, React, Express, Firebase
- Key routes: src/pages/Approvals.tsx, src/pages/Contacts.tsx, src/pages/Dashboard.tsx, src/pages/Files.tsx, src/pages/Finance.tsx, src/pages/Inbox.tsx, src/pages/Jobs.tsx, src/pages/Scheduling.tsx
- Data connections: Supabase, Google, Firebase, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Compare against audit evidence before promoting as canonical Root.
- Path: /Users/baileyeubanks/Downloads/root-os

### root-os-_-mission-control

- Intended role: Root/Mission Control shell or contract donor.
- Actual current state: root-candidate (high)
- Framework: Vite, React, Express, Firebase, Supabase
- Key routes: src/pages/Approvals.tsx, src/pages/Audit.tsx, src/pages/Contacts.tsx, src/pages/Dashboard.tsx, src/pages/Files.tsx, src/pages/Finance.tsx, src/pages/Health.tsx, src/pages/Inbox.tsx
- Data connections: Supabase, Google, Firebase, Twilio, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Compare against audit evidence before promoting as canonical Root.
- Path: /Users/baileyeubanks/Downloads/root-os-_-mission-control

### smartinvoice

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: Vite, React, Express, Firebase, Supabase
- Key routes: not detected
- Data connections: Supabase, Google, Firebase, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Downloads/smartinvoice

### video-review-platform

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: Vite, React, Express
- Key routes: not detected
- Data connections: Google, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Downloads/video-review-platform

### video-review-platform-2

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: Vite, React, Express, Supabase
- Key routes: not detected
- Data connections: Supabase, Google, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Downloads/video-review-platform-2

### video-review-platform-3

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: Vite, React, Express, Supabase
- Key routes: not detected
- Data connections: Supabase, Google, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Downloads/video-review-platform-3

### video-review-platform-4

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: Vite, React, Express, Supabase
- Key routes: not detected
- Data connections: Supabase, Google, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Downloads/video-review-platform-4

### video-review-platform-5

- Intended role: Content Co-op specialist production/review/delivery app.
- Actual current state: specialist-app (high)
- Framework: Vite, React, Express, Supabase
- Key routes: not detected
- Data connections: Supabase, Google, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Integrate through project-context launch and rollup adapters; do not rebuild inside Root.
- Path: /Users/baileyeubanks/Downloads/video-review-platform-5

### zip

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: Vite, React, Express
- Key routes: not detected
- Data connections: Google, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Downloads/zip

### zip-2

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: Vite, React, Express
- Key routes: not detected
- Data connections: Google, AI
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Downloads/zip-2

### gemini-cli

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: Express
- Key routes: not detected
- Data connections: Google, AI
- Broken/missing pieces: google_or_oauth_signal
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Documents/Codex/2026-04-21-to-run-this-code-you-need/gemini-cli

### a2a-server

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: Express
- Key routes: not detected
- Data connections: Google, AI
- Broken/missing pieces: google_or_oauth_signal
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Documents/Codex/2026-04-21-to-run-this-code-you-need/gemini-cli/packages/a2a-server

### cli

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: React
- Key routes: not detected
- Data connections: Google, AI
- Broken/missing pieces: google_or_oauth_signal
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Documents/Codex/2026-04-21-to-run-this-code-you-need/gemini-cli/packages/cli

### core

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: Express
- Key routes: not detected
- Data connections: Google, AI
- Broken/missing pieces: google_or_oauth_signal
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Documents/Codex/2026-04-21-to-run-this-code-you-need/gemini-cli/packages/core

### devtools

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: React
- Key routes: not detected
- Data connections: AI
- Broken/missing pieces: google_or_oauth_signal
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Documents/Codex/2026-04-21-to-run-this-code-you-need/gemini-cli/packages/devtools

### sdk

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: unknown
- Key routes: not detected
- Data connections: Google
- Broken/missing pieces: google_or_oauth_signal
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Documents/Codex/2026-04-21-to-run-this-code-you-need/gemini-cli/packages/sdk

### test-utils

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: Express
- Key routes: not detected
- Data connections: Google
- Broken/missing pieces: google_or_oauth_signal
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Documents/Codex/2026-04-21-to-run-this-code-you-need/gemini-cli/packages/test-utils

### vscode-ide-companion

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: Express
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: google_or_oauth_signal
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Documents/Codex/2026-04-21-to-run-this-code-you-need/gemini-cli/packages/vscode-ide-companion

### get-ripgrep

- Intended role: Unclassified donor candidate.
- Actual current state: donor (low)
- Framework: unknown
- Key routes: not detected
- Data connections: not detected
- Broken/missing pieces: requires manual verification
- Recommended action: Inspect manually before promotion; keep off the critical path.
- Path: /Users/baileyeubanks/Documents/Codex/2026-04-21-to-run-this-code-you-need/gemini-cli/third_party/get-ripgrep

## Authority Map

### root-candidate

| Repo | Path | Confidence | Recommended action |
|---|---|---:|---|
| mission-control---acs-admin | /Users/baileyeubanks/Downloads/mission-control---acs-admin | high | Compare against audit evidence before promoting as canonical Root. |
| root-2 | /Users/baileyeubanks/Downloads/root-2 | high | Compare against audit evidence before promoting as canonical Root. |
| root-os | /Users/baileyeubanks/Downloads/root-os | high | Compare against audit evidence before promoting as canonical Root. |
| root-os-_-mission-control | /Users/baileyeubanks/Downloads/root-os-_-mission-control | high | Compare against audit evidence before promoting as canonical Root. |

### mission-control-module

No records.

### public-site-authority

| Repo | Path | Confidence | Recommended action |
|---|---|---:|---|
| acs-website | /Users/baileyeubanks/Desktop/Projects/acs/acs-website | high | Keep public site separate; wire intake events into Root/Mission Control. |
| app | /Users/baileyeubanks/Desktop/Projects/acs/acs-website/app | high | Keep public site separate; wire intake events into Root/Mission Control. |
| monorepo-040a08a | /Users/baileyeubanks/Desktop/Projects/archive/2026-03-17-monorepo-home-recovery/monorepo-040a08a | high | Keep public site separate; wire brief events into Root/Mission Control. |
| monorepo-5a5c609 | /Users/baileyeubanks/Desktop/Projects/archive/2026-03-17-monorepo-home-recovery/monorepo-5a5c609 | high | Keep public site separate; wire brief events into Root/Mission Control. |
| monorepo-7f98d9e | /Users/baileyeubanks/Desktop/Projects/archive/2026-03-17-monorepo-home-recovery/monorepo-7f98d9e | high | Keep public site separate; wire brief events into Root/Mission Control. |
| monorepo-9574129 | /Users/baileyeubanks/Desktop/Projects/archive/2026-03-17-monorepo-home-recovery/monorepo-9574129 | high | Keep public site separate; wire brief events into Root/Mission Control. |
| monorepo-d26d217 | /Users/baileyeubanks/Desktop/Projects/archive/2026-03-17-monorepo-home-recovery/monorepo-d26d217 | high | Keep public site separate; wire brief events into Root/Mission Control. |
| monorepo-eda1440 | /Users/baileyeubanks/Desktop/Projects/archive/2026-03-17-monorepo-home-recovery/monorepo-eda1440 | high | Keep public site separate; wire brief events into Root/Mission Control. |
| astro-cleaning-onboarding | /Users/baileyeubanks/Desktop/Projects/astro-cleaning-onboarding | high | Keep public site separate; wire intake events into Root/Mission Control. |
| astrocleanings-admin | /Users/baileyeubanks/Desktop/Projects/astrocleanings-admin | high | Keep public site separate; wire intake events into Root/Mission Control. |
| astrocleanings-site | /Users/baileyeubanks/Desktop/Projects/astrocleanings-site | high | Keep public site separate; wire intake events into Root/Mission Control. |
| content-coop-admin | /Users/baileyeubanks/Desktop/Projects/content-coop-admin | high | Keep public site separate; wire brief events into Root/Mission Control. |
| content-coop-site | /Users/baileyeubanks/Desktop/Projects/content-coop-site | high | Keep public site separate; wire brief events into Root/Mission Control. |
| contentco-op-brief-only | /Users/baileyeubanks/Desktop/Projects/contentco-op-brief-only | high | Keep public site separate; wire brief events into Root/Mission Control. |
| cocut | /Users/baileyeubanks/Desktop/Projects/contentco-op-brief-only/apps/cocut | high | Keep public site separate; wire brief events into Root/Mission Control. |
| codeliver | /Users/baileyeubanks/Desktop/Projects/contentco-op-brief-only/apps/codeliver | high | Keep public site separate; wire brief events into Root/Mission Control. |
| coscript | /Users/baileyeubanks/Desktop/Projects/contentco-op-brief-only/apps/coscript | high | Keep public site separate; wire brief events into Root/Mission Control. |
| home | /Users/baileyeubanks/Desktop/Projects/contentco-op-brief-only/apps/home | high | Keep public site separate; wire brief events into Root/Mission Control. |
| infra | /Users/baileyeubanks/Desktop/Projects/contentco-op-brief-only/infra | high | Keep public site separate; wire brief events into Root/Mission Control. |
| api-client | /Users/baileyeubanks/Desktop/Projects/contentco-op-brief-only/packages/api-client | high | Keep public site separate; wire brief events into Root/Mission Control. |
| brand | /Users/baileyeubanks/Desktop/Projects/contentco-op-brief-only/packages/brand | high | Keep public site separate; wire brief events into Root/Mission Control. |
| identity-access | /Users/baileyeubanks/Desktop/Projects/contentco-op-brief-only/packages/identity-access | high | Keep public site separate; wire brief events into Root/Mission Control. |
| pricing | /Users/baileyeubanks/Desktop/Projects/contentco-op-brief-only/packages/pricing | high | Keep public site separate; wire brief events into Root/Mission Control. |
| types | /Users/baileyeubanks/Desktop/Projects/contentco-op-brief-only/packages/types | high | Keep public site separate; wire brief events into Root/Mission Control. |
| ui | /Users/baileyeubanks/Desktop/Projects/contentco-op-brief-only/packages/ui | high | Keep public site separate; wire brief events into Root/Mission Control. |
| media-worker | /Users/baileyeubanks/Desktop/Projects/contentco-op-brief-only/services/media-worker | high | Keep public site separate; wire brief events into Root/Mission Control. |
| orchestrator | /Users/baileyeubanks/Desktop/Projects/contentco-op-brief-only/services/orchestrator | high | Keep public site separate; wire brief events into Root/Mission Control. |
| cocut | /Users/baileyeubanks/Desktop/Projects/contentco-op/_archive/2026-03-17-legacy-standalone-repos/cocut | high | Keep public site separate; wire brief events into Root/Mission Control. |
| codeliver | /Users/baileyeubanks/Desktop/Projects/contentco-op/_archive/2026-03-17-legacy-standalone-repos/codeliver | high | Keep public site separate; wire brief events into Root/Mission Control. |
| coscript | /Users/baileyeubanks/Desktop/Projects/contentco-op/_archive/2026-03-17-legacy-standalone-repos/coscript | high | Keep public site separate; wire brief events into Root/Mission Control. |
| home | /Users/baileyeubanks/Desktop/Projects/contentco-op/_archive/2026-03-17-legacy-standalone-repos/home | high | Keep public site separate; wire brief events into Root/Mission Control. |
| cocut | /Users/baileyeubanks/Desktop/Projects/contentco-op/cocut | high | Keep public site separate; wire brief events into Root/Mission Control. |
| codeliver | /Users/baileyeubanks/Desktop/Projects/contentco-op/codeliver | high | Keep public site separate; wire brief events into Root/Mission Control. |
| api-client | /Users/baileyeubanks/Desktop/Projects/contentco-op/codeliver/packages/api-client | high | Keep public site separate; wire brief events into Root/Mission Control. |
| types | /Users/baileyeubanks/Desktop/Projects/contentco-op/codeliver/packages/types | high | Keep public site separate; wire brief events into Root/Mission Control. |
| coscript | /Users/baileyeubanks/Desktop/Projects/contentco-op/coscript | high | Keep public site separate; wire brief events into Root/Mission Control. |
| api-client | /Users/baileyeubanks/Desktop/Projects/contentco-op/coscript/packages/api-client | high | Keep public site separate; wire brief events into Root/Mission Control. |
| types | /Users/baileyeubanks/Desktop/Projects/contentco-op/coscript/packages/types | high | Keep public site separate; wire brief events into Root/Mission Control. |
| home | /Users/baileyeubanks/Desktop/Projects/contentco-op/home | high | Keep public site separate; wire brief events into Root/Mission Control. |
| monorepo | /Users/baileyeubanks/Desktop/Projects/contentco-op/monorepo | high | Keep public site separate; wire brief events into Root/Mission Control. |

### intake-authority

No records.

### brand-authority

No records.

### specialist-app

| Repo | Path | Confidence | Recommended action |
|---|---|---:|---|
| brand | /Users/baileyeubanks/Desktop/Projects/brand | high | Integrate through project-context launch and rollup adapters; do not rebuild inside Root. |
| co-deliver | /Users/baileyeubanks/Downloads/co-deliver | high | Integrate through project-context launch and rollup adapters; do not rebuild inside Root. |
| co-deliver 2 | /Users/baileyeubanks/Downloads/co-deliver 2 | high | Integrate through project-context launch and rollup adapters; do not rebuild inside Root. |
| co-produce | /Users/baileyeubanks/Downloads/co-produce | high | Integrate through project-context launch and rollup adapters; do not rebuild inside Root. |
| co-produce 2 | /Users/baileyeubanks/Downloads/co-produce 2 | high | Integrate through project-context launch and rollup adapters; do not rebuild inside Root. |
| co-produce-2 | /Users/baileyeubanks/Downloads/co-produce-2 | high | Integrate through project-context launch and rollup adapters; do not rebuild inside Root. |
| video-review-platform-5 | /Users/baileyeubanks/Downloads/video-review-platform-5 | high | Integrate through project-context launch and rollup adapters; do not rebuild inside Root. |

### ai-operator-layer

| Repo | Path | Confidence | Recommended action |
|---|---|---:|---|
| Projects | /Users/baileyeubanks/Desktop/Projects | high | Treat as peripheral worker until Root can verify structured packets. |
| business-core | /Users/baileyeubanks/Desktop/Projects/business-core | high | Treat as peripheral worker until Root can verify structured packets. |
| hermes-agent | /Users/baileyeubanks/Desktop/Projects/hermes-agent | high | Treat as peripheral worker until Root can verify structured packets. |
| whatsapp-bridge | /Users/baileyeubanks/Desktop/Projects/hermes-agent/scripts/whatsapp-bridge | high | Treat as peripheral worker until Root can verify structured packets. |
| ui-tui | /Users/baileyeubanks/Desktop/Projects/hermes-agent/ui-tui | high | Treat as peripheral worker until Root can verify structured packets. |
| hermes-ink | /Users/baileyeubanks/Desktop/Projects/hermes-agent/ui-tui/packages/hermes-ink | high | Treat as peripheral worker until Root can verify structured packets. |
| web | /Users/baileyeubanks/Desktop/Projects/hermes-agent/web | high | Treat as peripheral worker until Root can verify structured packets. |
| website | /Users/baileyeubanks/Desktop/Projects/hermes-agent/website | high | Treat as peripheral worker until Root can verify structured packets. |
| platform | /Users/baileyeubanks/Desktop/Projects/platform | high | Treat as peripheral worker until Root can verify structured packets. |
| research | /Users/baileyeubanks/Desktop/Projects/research | high | Treat as peripheral worker until Root can verify structured packets. |
| supabase | /Users/baileyeubanks/Desktop/Projects/supabase | high | Treat as peripheral worker until Root can verify structured packets. |
| hermes-concierge | /Users/baileyeubanks/Downloads/hermes-concierge | high | Treat as peripheral worker until Root can verify structured packets. |

### infra-support

| Repo | Path | Confidence | Recommended action |
|---|---|---:|---|
| ccnas-stack | /Users/baileyeubanks/Desktop/Projects/ccnas-stack | high | Inspect for deploy/archive support only; keep out of Root product logic. |
| cc-events-worker | /Users/baileyeubanks/Desktop/Projects/ccnas-stack/scripts/cc-events-worker | high | Inspect for deploy/archive support only; keep out of Root product logic. |

### donor

| Repo | Path | Confidence | Recommended action |
|---|---|---:|---|
| RTL | /Users/baileyeubanks/Desktop/Projects/Bankco - Tailwind CSS Admin Templates/RTL | low | Inspect manually before promotion; keep off the critical path. |
| main_files | /Users/baileyeubanks/Desktop/Projects/Bankco - Tailwind CSS Admin Templates/main_files | low | Inspect manually before promotion; keep off the critical path. |
| website-proxy-node | /Users/baileyeubanks/Desktop/Projects/Dify Command Center/integrations/website-proxy-node | low | Inspect manually before promotion; keep off the critical path. |
| infra | /Users/baileyeubanks/Desktop/Projects/archive/2026-03-17-monorepo-home-recovery/monorepo-040a08a/infra | low | Inspect manually before promotion; keep off the critical path. |
| infra | /Users/baileyeubanks/Desktop/Projects/archive/2026-03-17-monorepo-home-recovery/monorepo-5a5c609/infra | low | Inspect manually before promotion; keep off the critical path. |
| infra | /Users/baileyeubanks/Desktop/Projects/archive/2026-03-17-monorepo-home-recovery/monorepo-7f98d9e/infra | low | Inspect manually before promotion; keep off the critical path. |
| infra | /Users/baileyeubanks/Desktop/Projects/archive/2026-03-17-monorepo-home-recovery/monorepo-9574129/infra | low | Inspect manually before promotion; keep off the critical path. |
| infra | /Users/baileyeubanks/Desktop/Projects/archive/2026-03-17-monorepo-home-recovery/monorepo-d26d217/infra | low | Inspect manually before promotion; keep off the critical path. |
| infra | /Users/baileyeubanks/Desktop/Projects/archive/2026-03-17-monorepo-home-recovery/monorepo-eda1440/infra | low | Inspect manually before promotion; keep off the critical path. |
| 20260317-115203 | /Users/baileyeubanks/Desktop/Projects/archive/repo-preservation/20260317-115203 | low | Inspect manually before promotion; keep off the critical path. |
| agent-core | /Users/baileyeubanks/Desktop/Projects/business-core/packages/agent-core | low | Inspect manually before promotion; keep off the critical path. |
| billing-core | /Users/baileyeubanks/Desktop/Projects/business-core/packages/billing-core | low | Inspect manually before promotion; keep off the critical path. |
| documents-core | /Users/baileyeubanks/Desktop/Projects/business-core/packages/documents-core | low | Inspect manually before promotion; keep off the critical path. |
| identity-core | /Users/baileyeubanks/Desktop/Projects/business-core/packages/identity-core | low | Inspect manually before promotion; keep off the critical path. |
| ui-core | /Users/baileyeubanks/Desktop/Projects/business-core/packages/ui-core | low | Inspect manually before promotion; keep off the critical path. |
| claude-code-commands-skills-agents | /Users/baileyeubanks/Desktop/Projects/claude-code-commands-skills-agents | low | Inspect manually before promotion; keep off the critical path. |
| codex-plugin-cc | /Users/baileyeubanks/Desktop/Projects/codex-plugin-cc | low | Inspect manually before promotion; keep off the critical path. |
| crater-master | /Users/baileyeubanks/Desktop/Projects/crater-master | low | Inspect manually before promotion; keep off the critical path. |
| ignition | /Users/baileyeubanks/Desktop/Projects/crater-master/vendor/facade/ignition | low | Inspect manually before promotion; keep off the critical path. |
| dify | /Users/baileyeubanks/Desktop/Projects/dify | low | Inspect manually before promotion; keep off the critical path. |
| nodejs-client | /Users/baileyeubanks/Desktop/Projects/dify/sdks/nodejs-client | low | Inspect manually before promotion; keep off the critical path. |
| web | /Users/baileyeubanks/Desktop/Projects/dify/web | low | Inspect manually before promotion; keep off the critical path. |
| i18n-config | /Users/baileyeubanks/Desktop/Projects/dify/web/i18n-config | low | Inspect manually before promotion; keep off the critical path. |
| next | /Users/baileyeubanks/Desktop/Projects/dify/web/next | low | Inspect manually before promotion; keep off the critical path. |
| dev-proxy | /Users/baileyeubanks/Desktop/Projects/dify/web/plugins/dev-proxy | low | Inspect manually before promotion; keep off the critical path. |
| dramatron-app | /Users/baileyeubanks/Desktop/Projects/dramatron-app | medium | Extract useful pipelines only after core Root workflows are working. |
| dramatron-ui | /Users/baileyeubanks/Desktop/Projects/dramatron-ui | low | Inspect manually before promotion; keep off the critical path. |
| frappe_docker | /Users/baileyeubanks/Desktop/Projects/frappe_docker | low | Inspect manually before promotion; keep off the critical path. |
| docs | /Users/baileyeubanks/Desktop/Projects/frappe_docker/docs | low | Inspect manually before promotion; keep off the critical path. |
| deer-flow | /Users/baileyeubanks/Desktop/Projects/research/deer-flow | medium | Extract useful pipelines only after core Root workflows are working. |
| frontend | /Users/baileyeubanks/Desktop/Projects/research/deer-flow/frontend | medium | Extract useful pipelines only after core Root workflows are working. |
| rapidaai-voice-ai | /Users/baileyeubanks/Desktop/Projects/research/voice-ai/rapidaai-voice-ai | medium | Extract useful pipelines only after core Root workflows are working. |
| ui | /Users/baileyeubanks/Desktop/Projects/research/voice-ai/rapidaai-voice-ai/ui | medium | Extract useful pipelines only after core Root workflows are working. |
| screenplay-formatter | /Users/baileyeubanks/Desktop/Projects/screenplay-formatter | low | Inspect manually before promotion; keep off the critical path. |
| starc | /Users/baileyeubanks/Desktop/Projects/starc | medium | Extract useful pipelines only after core Root workflows are working. |
| starc-formatter | /Users/baileyeubanks/Desktop/Projects/starc-formatter | low | Inspect manually before promotion; keep off the critical path. |
| Admin | /Users/baileyeubanks/Desktop/Projects/vault_assets/Techmin_v1.0/Admin | low | Inspect manually before promotion; keep off the critical path. |
| listing-to-campaign-engine | /Users/baileyeubanks/Downloads/listing-to-campaign-engine | low | Inspect manually before promotion; keep off the critical path. |
| root | /Users/baileyeubanks/Downloads/root | low | Inspect manually before promotion; keep off the critical path. |
| smartinvoice | /Users/baileyeubanks/Downloads/smartinvoice | low | Inspect manually before promotion; keep off the critical path. |

### parked

| Repo | Path | Confidence | Recommended action |
|---|---|---:|---|
| InvoiceShelf | /Users/baileyeubanks/Desktop/Projects/output/google-hermes-paperclip-invoice-packet-2026-04-11/InvoiceShelf | high | Keep optional until Root/Mission Control workflows prove need. |
| hermes-agent | /Users/baileyeubanks/Desktop/Projects/output/google-hermes-paperclip-invoice-packet-2026-04-11/hermes-agent | high | Keep optional until Root/Mission Control workflows prove need. |
| website | /Users/baileyeubanks/Desktop/Projects/output/google-hermes-paperclip-invoice-packet-2026-04-11/hermes-agent/website | high | Keep optional until Root/Mission Control workflows prove need. |

### discard

No records.

## Recommended Build Order

1. Promote one Root shell only after this audit is reviewed against live runtime proof.
2. Keep ACS and Content Co-op public sites as intake authorities.
3. Wire quote and creative-brief handoffs into Root/Mission Control before deeper UI expansion.
4. Keep Co-* apps as specialist launch surfaces with rollup adapters.
5. Keep Hermes/Blaze and Paperclip peripheral until packet/action reliability is proven.
