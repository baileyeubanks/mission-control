# Firebase Switch-Over Analysis

## Executive Summary

**Recommendation: Do NOT switch to Firebase.**

Supabase is already working, synced, and deployed. Switching to Firebase would be a 2–3 week rewrite with zero functional gain and several regressions.

---

## 🔍 Firebase Project Health (astrobot-487905)

| Check | Status | Detail |
|---|---|---|
| **Firestore (default)** | ❌ MISSING | 404 — never created |
| **Firestore (named)** | ⚠️ EXISTS | `ai-studio-fa89ed7c-...` but needs auth |
| **Firebase Hosting** | ❓ Unknown | Needs CLI login to check |
| **Cloud Functions** | ❓ Unknown | Needs CLI login to check |
| **Firebase Auth** | ❓ Unknown | Needs CLI login to check |
| **Firebase CLI login** | ❌ EXPIRED | All tokens revoked, clients deleted |

**Critical Issue:** The default Firestore database does not exist. Before any Firebase operations, you must create it at:
https://console.firebase.google.com/project/astrobot-487905/firestore

---

## 📊 Data Model Comparison

### Current Supabase Schema (14 tables, ✅ Working)

| Table | Purpose | Records |
|---|---|---|
| `profiles` | User accounts (extends Supabase Auth) | ✅ |
| `jobs` | Work orders / state machine | ✅ |
| `messages` | Unified inbox | ✅ |
| `proofs` | Photos / signatures | ✅ |
| `system_logs` | Operational audit trail | ✅ |
| `packets` | AI job queue | ✅ |
| `packet_events` | Queue audit trail | ✅ |
| `root_quotes` | Billing quotes (new system) | ✅ Live sync verified |
| `root_invoices` | Billing invoices (new system) | ✅ |
| `root_billing_events` | Billing audit trail | ✅ |
| `bank_statements` | CSV uploads | ✅ |
| `bank_transactions` | Reconciliation | ✅ |
| `catalog_items` | Service catalog | ✅ |
| `creative_briefs` | Creative briefs + AI enrichment | ✅ (legacy schema upgraded) |

### Firebase Blueprint (8 entities, ⚠️ Outdated)

| Collection | Purpose | Gap |
|---|---|---|
| `users` | Operator accounts | Missing role-based access |
| `contacts` | B2B/B2C contacts | ✅ Basic match |
| `jobs` | Work orders | Missing state machine enums |
| `invoices` | Financial invoices | **Missing the entire new billing system** |
| `threads` | Communication | ✅ Basic match |
| `messages` | Messages in threads | ✅ Basic match |
| `approvals` | Approval requests | **Missing root billing approvals** |
| `files` | Documents | Missing PDF artifacts |

**Missing from Firebase blueprint:**
- Root billing quotes & invoices (the new document engine)
- Bank reconciliation (statements, transactions, matching)
- Service catalog (8 items across 2 companies)
- Creative briefs (9-step intake, AI enrichment, complexity scoring)
- Packet factory queue (AI job orchestration)
- System logs (operational audit trail)

---

## ⚖️ Technical Comparison

| Factor | Supabase (Current) | Firebase (Proposed) |
|---|---|---|
| **Schema** | Relational SQL + JSONB | NoSQL document store |
| **Migrations** | ✅ Versioned SQL files | ❌ None — manual schema drift |
| **Auth** | ✅ Working with RLS | Would need full rebuild |
| **Real-time** | ✅ Supabase Realtime | ✅ Firebase Realtime / Firestore |
| **Offline** | ❌ No | ✅ Firestore offline cache |
| **Complex queries** | ✅ SQL joins, aggregations | ❌ Limited — requires denormalization |
| **Local dev** | ✅ `supabase start` (Docker) | ⚠️ Emulators available |
| **PDF/Stripe** | Server-side Express | Same — not DB-related |
| **Current data** | ✅ Live sync verified | ❌ Default DB missing |
| **Migration effort** | None | **2–3 weeks** |

---

## 💰 Cost Projection (Monthly)

### Supabase (Current)
- **Free tier:** 500MB database, 2GB bandwidth
- **Pro ($25/mo):** 8GB database, 250GB bandwidth
- Your current usage: well within free tier

### Firebase (Switch-over)
- **Firestore:** $0.06/100k reads, $0.18/100k writes, $0.02/100k deletes
- **Firebase Auth:** Free for < 50k users/month
- **Hosting:** $0.15/GB outbound
- **Storage:** $0.026/GB
- **Estimated for your workload:** $10–30/mo depending on reads/writes

**Winner: Tie.** Both are cheap at your scale.

---

## 🎯 When Firebase Makes Sense

Switch to Firebase ONLY if you build:

1. **Native crew mobile apps** (iOS/Android)
   - Firestore offline sync for field work
   - Firebase Storage for photo/video upload
   - FCM push notifications for job alerts

2. **Real-time dispatch dashboard**
   - Live GPS tracking of crews
   - Real-time job status updates
   - Firebase Realtime Database for sub-second sync

3. **Client portal mobile app**
   - Offline-first brief submission
   - Push notifications for quote approval

---

## 🛠️ If You Still Want to Switch

### Phase 1: Firebase Setup (1 day)
```bash
# 1. Login
firebase login

# 2. Link project
firebase use astrobot-487905

# 3. Create default Firestore DB
# Go to: https://console.firebase.google.com/project/astrobot-487905/firestore

# 4. Update render.yaml with Firebase env vars
#    - FIREBASE_PROJECT_ID
#    - FIREBASE_CLIENT_EMAIL
#    - FIREBASE_PRIVATE_KEY
```

### Phase 2: Rewrite Data Layer (1–2 weeks)
- Replace `data-adapter.ts` with Firebase Admin SDK
- Rewrite ALL store files to use Firestore transactions
- Handle denormalization (e.g., invoice totals, stats)
- Rebuild auth from Supabase Auth → Firebase Auth

### Phase 3: Migrate Data (2–3 days)
```bash
# Export from Supabase
# Transform to Firestore collections
# Handle subcollections (messages in threads, payments in invoices)
# Validate data integrity
```

### Phase 4: Testing (3–5 days)
- PDF generation (unchanged)
- Stripe webhooks (unchanged)
- Bank reconciliation (test CSV upload)
- Creative brief flow (test 9-step intake)

**Total: 2–3 weeks of focused work.**

---

## ✅ Recommended Path Forward

**Keep Supabase.** It's working. It's synced. It's deployed.

Use Firebase **selectively** for specific features:

| Feature | Database | Why |
|---|---|---|
| Billing, Bank, Catalog, Briefs | **Supabase** | Relational, SQL, already working |
| Crew mobile app | **Firebase** | Offline sync, push notifications |
| Video asset storage | **Firebase Storage** | Cheaper than Supabase for large files |
| Real-time dispatch | **Firebase RTDB** | Sub-second sync for GPS tracking |

---

## 🚀 Immediate Next Steps

1. **Deploy to Render** (click the Blueprint link in README)
2. **Set Supabase env vars** in Render dashboard
3. **Add custom domain** DNS record
4. **Monitor** — data syncs automatically

If you need Firebase later for a mobile app, add it as a **secondary database** — don't migrate your core ERP.
