/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { AuthProvider, useAuth } from "./components/AuthProvider";
import { Activity, Loader2, Shield, Sparkles } from "lucide-react";
import { Button } from "./components/ui/button";
import { isSupabaseConfigured } from "./lib/supabase";

// Lazy load Admin pages
const Dashboard = lazy(() => import("./pages/Dashboard").then(m => ({ default: m.Dashboard })));
const Contacts = lazy(() => import("./pages/Contacts").then(m => ({ default: m.Contacts })));
const Jobs = lazy(() => import("./pages/Jobs").then(m => ({ default: m.Jobs })));
const Scheduling = lazy(() => import("./pages/Scheduling").then(m => ({ default: m.Scheduling })));
const Inbox = lazy(() => import("./pages/Inbox").then(m => ({ default: m.Inbox })));
const Approvals = lazy(() => import("./pages/Approvals").then(m => ({ default: m.Approvals })));
const Finance = lazy(() => import("./pages/Finance").then(m => ({ default: m.Finance })));
const Files = lazy(() => import("./pages/Files").then(m => ({ default: m.Files })));
const Runtime = lazy(() => import("./pages/Runtime").then(m => ({ default: m.Runtime })));
const OperatorMap = lazy(() => import("./pages/OperatorMap").then(m => ({ default: m.OperatorMap })));
const AcsQuoteHandoff = lazy(() => import("./pages/AcsQuoteHandoff").then(m => ({ default: m.AcsQuoteHandoff })));
const Security = lazy(() => import("./pages/Security").then(m => ({ default: m.Security })));
const Health = lazy(() => import("./pages/Health").then(m => ({ default: m.Health })));
const Packets = lazy(() => import("./pages/Packets").then(m => ({ default: m.Packets })));
const OperatingDomain = lazy(() => import("./pages/OperatingDomain").then(m => ({ default: m.OperatingDomain })));
const Audit = lazy(() => import("./pages/Audit").then(m => ({ default: m.Audit })));
const CommercialDocuments = lazy(() => import("./pages/CommercialDocuments").then(m => ({ default: m.CommercialDocuments })));
const Pipeline = lazy(() => import("./pages/Pipeline").then(m => ({ default: m.Pipeline })));
const Onboarding = lazy(() => import("./pages/Onboarding").then(m => ({ default: m.Onboarding })));
const ContractorWorkspace = lazy(() => import("./pages/ContractorWorkspace").then(m => ({ default: m.ContractorWorkspace })));

// Aether Video OS pages
const VideoDashboard = lazy(() => import("./pages/video/VideoDashboard").then(m => ({ default: m.VideoDashboard })));
const VideoResearch = lazy(() => import("./pages/video/VideoResearch").then(m => ({ default: m.VideoResearch })));
const VideoEdit = lazy(() => import("./pages/video/VideoEdit").then(m => ({ default: m.VideoEdit })));
const VideoDeliver = lazy(() => import("./pages/video/VideoDeliver").then(m => ({ default: m.VideoDeliver })));
const VideoAgents = lazy(() => import("./pages/video/VideoAgents").then(m => ({ default: m.VideoAgents })));
const VideoRapidFire = lazy(() => import("./pages/video/VideoRapidFire").then(m => ({ default: m.VideoRapidFire })));

// Lazy load Crew & Client pages
const CrewApp = lazy(() => import("./pages/crew/CrewApp").then(m => ({ default: m.CrewApp })));
const ClientPortal = lazy(() => import("./pages/client/ClientPortal").then(m => ({ default: m.ClientPortal })));
const ClientPortalV2 = lazy(() => import("./pages/client/ClientPortalV2").then(m => ({ default: m.ClientPortalV2 })));
const ClientDocumentPortal = lazy(() => import("./pages/client/ClientDocumentPortal").then(m => ({ default: m.ClientDocumentPortal })));
const StripeCheckout = lazy(() => import("./pages/client/StripeCheckout").then(m => ({ default: m.StripeCheckout })));
const PublicQuoteEngine = lazy(() => import("./pages/PublicQuoteEngine").then(m => ({ default: m.PublicQuoteEngine })));
const Catalog = lazy(() => import("./pages/Catalog").then(m => ({ default: m.Catalog })));
const BankReconciliation = lazy(() => import("./pages/BankReconciliation").then(m => ({ default: m.BankReconciliation })));
const CreativeBriefIntake = lazy(() => import("./pages/CreativeBriefIntake").then(m => ({ default: m.CreativeBriefIntake })));
const BriefReview = lazy(() => import("./pages/BriefReview").then(m => ({ default: m.BriefReviewList })));
const BriefReviewDetail = lazy(() => import("./pages/BriefReview").then(m => ({ default: m.BriefReviewDetail })));

// Placeholder for parked direct routes
const Placeholder = ({ title }: { title: string }) => (
  <div className="flex flex-col gap-4">
    <h1 className="text-3xl font-display tracking-tighter">{title}</h1>
    <div className="glass border-white/5 p-12 flex items-center justify-center rounded-sm">
      <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Panel available by direct route</p>
    </div>
  </div>
);

const adminRoutes = [
  { path: "runtime", element: <Runtime /> },
  { path: "audit", element: <Audit /> },
  { path: "operator-map", element: <OperatorMap /> },
  { path: "packets", element: <Packets /> },
  { path: "hermes", element: <Placeholder title="Hermes Release Intake" /> },
  { path: "inbox", element: <Inbox /> },
  { path: "outbound", element: <Placeholder title="Outbound Communications" /> },
  { path: "contacts", element: <Contacts /> },
  { path: "acs-quote-handoff", element: <AcsQuoteHandoff /> },
  { path: "quotes", element: <CommercialDocuments mode="quotes" /> },
  { path: "invoices", element: <CommercialDocuments mode="invoices" /> },
  { path: "pipeline", element: <Pipeline /> },
  { path: "finance", element: <Finance /> },
  { path: "catalog", element: <Catalog /> },
  { path: "bank", element: <BankReconciliation /> },
  { path: "briefs", element: <BriefReview /> },
  { path: "onboarding", element: <Onboarding /> },
  { path: "dispatch", element: <OperatingDomain domainId="dispatch" /> },
  { path: "scheduling", element: <Scheduling /> },
  { path: "jobs", element: <Jobs /> },
  { path: "approvals", element: <Approvals /> },
  { path: "sync", element: <Placeholder title="Sync Center" /> },
  { path: "security", element: <Security /> },
  { path: "health", element: <Health /> },
  { path: "retire", element: <Placeholder title="Retire Zone" /> },
  { path: "files", element: <Files /> },
  { path: "video", element: <VideoDashboard /> },
  { path: "video/research", element: <VideoResearch /> },
  { path: "video/edit", element: <VideoEdit /> },
  { path: "video/deliver", element: <VideoDeliver /> },
  { path: "video/agents", element: <VideoAgents /> },
  { path: "video/rapid-fire", element: <VideoRapidFire /> },
];

const LoadingFallback = () => (
  <div className="flex h-full w-full items-center justify-center p-12">
    <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
  </div>
);

const localRecoveryHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

function shouldUseLocalRecoveryGateway() {
  if (!isSupabaseConfigured) return true;
  if (typeof window === "undefined") return false;
  return localRecoveryHosts.has(window.location.hostname);
}

function PublicGateway() {
  const { user, role, isAuthReady, signInWithGoogle } = useAuth();
  const useLocalRecoveryGateway = shouldUseLocalRecoveryGateway();

  const handleSignIn = () => {
    if (useLocalRecoveryGateway) return;
    void signInWithGoogle();
  };

  if (!isAuthReady) return <LoadingFallback />;
  if (user) return <Navigate to="/admin" replace />;

  return (
    <div className="min-h-screen bg-brand-base text-white">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(61,125,216,0.06)_0%,transparent_50%)]" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-8 px-6 py-12">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_0.9fr]">
          <section className="glass-panel relative overflow-hidden p-8 md:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(61,125,216,0.1)_0%,transparent_50%)]" />
            <div className="relative z-10 flex flex-col gap-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-brand-accent-glow/20 bg-brand-accent-glow/10 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.25em] text-brand-accent-glow">
                  <Sparkles className="h-3 w-3" />
                  Mission Control
                </div>
                <h1 className="max-w-3xl text-4xl font-display tracking-[0.12em] md:text-6xl">
                  Mission Control
                </h1>
                <p className="max-w-2xl text-sm text-white/40 md:text-base">
                  ACS Operations + CCO OS in one unified shell. Quotes, invoices, dispatch, video production, and crew management.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="glass-panel p-4">
                  <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-white/30">
                    <Shield className="h-3 w-3" />
                    Auth
                  </div>
                  <div className={`text-xs font-mono uppercase ${isSupabaseConfigured ? "text-success" : "text-warning"}`}>
                    {useLocalRecoveryGateway ? "Local recovery" : "Google auth"}
                  </div>
                </div>
                <div className="glass-panel p-4">
                  <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-white/30">
                    <Activity className="h-3 w-3" />
                    Runtime
                  </div>
                  <div className="text-xs font-mono uppercase text-success">Reachable</div>
                </div>
                <div className="glass-panel p-4">
                  <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-white/30">
                    <Shield className="h-3 w-3" />
                    Role
                  </div>
                  <div className="text-xs font-mono uppercase text-brand-accent-glow">{role || "Guest"}</div>
                </div>
              </div>
            </div>
          </section>

          <aside className="glass-panel p-8">
            <div className="flex h-full flex-col justify-between gap-8">
              <div className="space-y-4">
                <h2 className="text-2xl font-display tracking-[0.12em]">Access</h2>
                <p className="text-sm text-white/40">
                  Local recovery opens directly on this machine. Remote sign-in uses Google when configured.
                </p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={handleSignIn}
                  disabled={useLocalRecoveryGateway}
                  className="w-full btn-mission disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {useLocalRecoveryGateway ? "Local Recovery Active" : "Sign In With Google"}
                </button>
                <a href="/quote" className="block w-full text-center btn-outline text-sm">
                  Request a Quote (CCO)
                </a>
                <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-white/20">
                  Admin, crew, and protected panel routing remains unchanged.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// Role-based Route Guard
function RequireRole({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) {
  const { user, role, isAuthReady } = useAuth();
  
  if (!isAuthReady) return <LoadingFallback />;
  if (!user) return <Navigate to="/" replace />;
  if (!role || !allowedRoles.includes(role)) return <Navigate to="/unauthorized" replace />;
  
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public / Client Routes */}
            <Route path="/c/:token" element={<ClientDocumentPortal companyAccount="astro-cleaning-services" />} />
            <Route path="/client/acs/:token" element={<ClientDocumentPortal companyAccount="astro-cleaning-services" />} />
            <Route path="/client/cco/:token" element={<ClientPortalV2 />} />
            <Route path="/client/checkout/:invoiceId" element={<StripeCheckout />} />
            <Route path="/legacy-client/:token" element={<ClientPortal />} />
            <Route path="/quote" element={<PublicQuoteEngine />} />
            <Route path="/brief" element={<CreativeBriefIntake />} />
            <Route path="/unauthorized" element={<Placeholder title="Unauthorized Access" />} />

            {/* Crew Routes (Mobile First) */}
            <Route path="/crew/*" element={
              <RequireRole allowedRoles={['crew', 'admin', 'owner', 'operator']}>
                <CrewApp />
              </RequireRole>
            } />

            <Route path="/contractor/*" element={
              <RequireRole allowedRoles={['contractor', 'editor', 'producer', 'admin', 'owner', 'operator']}>
                <ContractorWorkspace />
              </RequireRole>
            } />

            {/* Admin Routes (Control Tower) */}
            <Route path="/admin" element={
              <RequireRole allowedRoles={['admin', 'owner', 'operator', 'producer']}>
                <Layout />
              </RequireRole>
            }>
              <Route index element={<Dashboard />} />
              {adminRoutes.map((route) => (
                <Route key={route.path} path={route.path} element={route.element} />
              ))}
              <Route path="briefs/:id" element={<BriefReviewDetail />} />
            </Route>

            {/* Mission Control gateway */}
            <Route path="/" element={<PublicGateway />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
