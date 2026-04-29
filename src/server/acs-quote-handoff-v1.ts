import { existsSync } from "node:fs";
import {
  acsQuoteHandoffV1Contract,
  sampleAcsPublicQuoteSource,
  sampleAcsQuoteHandoffV1,
  sampleAstroAdminQuoteCreateBody,
} from "../lib/acs-quote-handoff-contract";

type ProbeStatus = "present" | "missing";
type GateStatus = "ready" | "partial" | "blocked";

interface HandoffProbe {
  label: string;
  path: string;
  status: ProbeStatus;
  role: "source" | "target" | "donor" | "shell";
}

interface HandoffGate {
  id: string;
  label: string;
  status: GateStatus;
  authority: string;
  evidence: HandoffProbe[];
  nextAction: string;
}

const probes = {
  acsPublicRuntime: [
    probe("ACS public server", "/Users/baileyeubanks/Desktop/Projects/acs/acs-website/server.js", "source"),
    probe("ACS public quote wizard", "/Users/baileyeubanks/Desktop/Projects/acs/acs-website/index.html", "source"),
    probe("ACS quote API bridge", "/Users/baileyeubanks/Desktop/Projects/acs/acs-website/api/functions/adminQuotes.js", "source"),
    probe("ACS legacy quote office page", "/Users/baileyeubanks/Desktop/Projects/acs/acs-website/app/src/pages/RootQuotesPage.jsx", "source"),
    probe("ACS Firestore indexes", "/Users/baileyeubanks/Desktop/Projects/acs/acs-website/firestore.indexes.json", "source"),
  ],
  astroAdminTarget: [
    probe("Astro admin quotes route", "/Users/baileyeubanks/Desktop/Projects/astrocleanings-admin/app/api/quotes/route.ts", "target"),
    probe("Astro admin quote mutation route", "/Users/baileyeubanks/Desktop/Projects/astrocleanings-admin/app/api/quotes/[id]/route.ts", "target"),
    probe("Astro quote bridge", "/Users/baileyeubanks/Desktop/Projects/astrocleanings-admin/app/lib/quote-bridge.ts", "target"),
    probe("Astro admin preview runtime", "/Users/baileyeubanks/Desktop/Projects/astrocleanings-admin/ops/preview-runtime.ts", "target"),
    probe("Astro admin operator preview", "/Users/baileyeubanks/Desktop/Projects/astrocleanings-admin/preview/app.js", "target"),
  ],
  aiStudioAdminDonor: [
    probe("AI Studio ACS admin server", "/Users/baileyeubanks/Downloads/mission-control---acs-admin/server.ts", "donor"),
    probe("AI Studio requests queue", "/Users/baileyeubanks/Downloads/mission-control---acs-admin/src/pages/Requests.tsx", "donor"),
    probe("AI Studio quote management", "/Users/baileyeubanks/Downloads/mission-control---acs-admin/src/pages/Quotes.tsx", "donor"),
    probe("AI Studio admin types", "/Users/baileyeubanks/Downloads/mission-control---acs-admin/src/types.ts", "donor"),
  ],
  smartInvoiceDonor: [
    probe("SmartInvoice quote form", "/Users/baileyeubanks/Downloads/smartinvoice/src/components/QuoteForm.tsx", "donor"),
    probe("SmartInvoice quote list", "/Users/baileyeubanks/Downloads/smartinvoice/src/components/QuoteList.tsx", "donor"),
    probe("SmartInvoice Firebase blueprint", "/Users/baileyeubanks/Downloads/smartinvoice/firebase-blueprint.json", "donor"),
    probe("SmartInvoice Supabase client", "/Users/baileyeubanks/Downloads/smartinvoice/src/lib/supabase.ts", "donor"),
  ],
  firebaseDonor: [
    probe("Root OS Firebase client", "/Users/baileyeubanks/Downloads/root-os/src/firebase.ts", "donor"),
    probe("Root OS Firestore rules", "/Users/baileyeubanks/Downloads/root-os/firestore.rules", "donor"),
    probe("Root quote Firestore service", "/Users/baileyeubanks/Downloads/root/src/services/quoteService.ts", "donor"),
    probe("Root canon", "/Users/baileyeubanks/Downloads/root/docs/CANON.md", "donor"),
  ],
  missionControlShell: [
    probe("Mission handoff store", "/Users/baileyeubanks/Downloads/root-os-_-mission-control/src/server/handoff-store.ts", "shell"),
    probe("Mission commercial documents page", "/Users/baileyeubanks/Downloads/root-os-_-mission-control/src/pages/CommercialDocuments.tsx", "shell"),
    probe("Mission billing store", "/Users/baileyeubanks/Downloads/root-os-_-mission-control/src/server/root-billing-store.ts", "shell"),
  ],
};

function probe(label: string, path: string, role: HandoffProbe["role"]): HandoffProbe {
  return {
    label,
    path,
    role,
    status: existsSync(path) ? "present" : "missing",
  };
}

function gateStatus(evidence: HandoffProbe[]): GateStatus {
  const present = evidence.filter((item) => item.status === "present").length;
  if (present === evidence.length) return "ready";
  if (present > 0) return "partial";
  return "blocked";
}

function gate(id: string, label: string, authority: string, evidence: HandoffProbe[], nextAction: string): HandoffGate {
  return {
    id,
    label,
    status: gateStatus(evidence),
    authority,
    evidence,
    nextAction,
  };
}

export function getAcsQuoteHandoffV1Payload() {
  const gates = [
    gate(
      "public-intake-source",
      "Public quote intake source exists",
      "Legacy ACS public runtime is current source/migration donor until astrocleanings-site fully owns quote intake.",
      probes.acsPublicRuntime,
      "Normalize public quote submissions into one operator handoff payload.",
    ),
    gate(
      "admin-target",
      "Astro admin target has quote routes and bridge code",
      "astrocleanings-admin is the reset target for internal quote review and mutation.",
      probes.astroAdminTarget,
      "Wire admin routes to the normalized handoff payload and keep writes approval-bound.",
    ),
    gate(
      "ai-studio-admin-donor",
      "AI Studio ACS admin donor is available",
      "Downloads/mission-control---acs-admin is a UI and interaction donor, not production authority.",
      probes.aiStudioAdminDonor,
      "Lift the request queue and quote detail interaction patterns into the target admin surface.",
    ),
    gate(
      "quote-invoice-donor",
      "SmartInvoice donor has quote/invoice mechanics",
      "Downloads/smartinvoice is a quote/invoice behavior donor; company authority stays in Astro admin and shared contracts.",
      probes.smartInvoiceDonor,
      "Extract numbering, line items, conversion, and client join behavior into business-core or Astro admin adapters.",
    ),
    gate(
      "firebase-donor",
      "Firebase/Firestore donor patterns exist",
      "Downloads/root-os and Downloads/root show Firebase patterns; Supabase remains canonical shared state unless Firebase is explicitly selected for this slice.",
      probes.firebaseDonor,
      "Decide Firebase mirror versus Supabase canonical write path before enabling live mutation.",
    ),
    gate(
      "mission-shell-proof",
      "Mission Control can display and convert local handoffs",
      "Mission Control owns the read-only v1 proof surface and local recovery handoff store.",
      probes.missionControlShell,
      "Expose quote handoff readiness and keep conversion local until backend writes are certified.",
    ),
  ];

  const missing = gates.flatMap((item) => item.evidence.filter((probeItem) => probeItem.status === "missing"));
  const ready = gates.filter((item) => item.status === "ready").length;

  return {
    status: missing.length === 0 ? "ready_to_wire" : "needs_reconciliation",
    generated_at: new Date().toISOString(),
    v1_decision:
      "Build one ACS quote-to-admin handoff slice first: public quote intake becomes a normalized handoff, Mission Control proves it, Astro admin owns review/mutation, and AI Studio/Firebase apps are donors until promoted.",
    target_runtime: "/Users/baileyeubanks/Downloads/root-os-_-mission-control",
    target_admin_repo: "/Users/baileyeubanks/Desktop/Projects/astrocleanings-admin",
    migration_source: "/Users/baileyeubanks/Desktop/Projects/acs/acs-website",
    donor_repos: [
      "/Users/baileyeubanks/Downloads/mission-control---acs-admin",
      "/Users/baileyeubanks/Downloads/smartinvoice",
      "/Users/baileyeubanks/Downloads/root-os",
      "/Users/baileyeubanks/Downloads/root",
    ],
    firebase_boundary:
      "Firestore/Firebase is currently donor and mirror-pattern evidence. Supabase remains durable structured authority until a Firebase write path is explicitly promoted and tested.",
    summary: {
      gates_total: gates.length,
      gates_ready: ready,
      gates_partial: gates.filter((item) => item.status === "partial").length,
      gates_blocked: gates.filter((item) => item.status === "blocked").length,
      missing_count: missing.length,
    },
    gates,
    contract: acsQuoteHandoffV1Contract,
    adapter_proof: {
      status: "read_only_mapping_ready",
      source_contract: "acs-website/api/functions/submitQuote.js quotePayload",
      normalizer: "normalizeAcsPublicQuoteToHandoffV1",
      input_sample: sampleAcsPublicQuoteSource,
      output_schema: sampleAcsQuoteHandoffV1.schema,
      output_id: sampleAcsQuoteHandoffV1.id,
    },
    sample_handoff: sampleAcsQuoteHandoffV1,
    target_write_preview: {
      status: "prepared_not_submitted",
      target_route: sampleAcsQuoteHandoffV1.backendTargets.astroAdminRoute,
      body: sampleAstroAdminQuoteCreateBody,
    },
    implementation_order: [
      "Use the frozen acs.quote-handoff.v1 payload for the first read-only adapter.",
      "Add a read-only adapter from the live ACS quote source into Mission Control.",
      "Render the handoff queue and readiness in Mission Control.",
      "Move the operator review interaction into astrocleanings-admin.",
      "Certify the storage boundary: Supabase canonical first, Firebase mirror only if explicitly promoted.",
      "Only then add approved write actions for quote approve, client-ready, booking hold, and invoice conversion.",
    ],
    mutation_policy: [
      "No customer writes in v1 without an explicit approval route.",
      "No production publish from donor repos.",
      "No Firebase schema promotion until rules, auth, service account, and parity checks pass.",
      "No quote-to-invoice conversion without operator approval and audit trail.",
    ],
    next_safe_action:
      "Wire the read-only adapter from the ACS public quote source into this acs.quote-handoff.v1 contract, then render the queue in astrocleanings-admin.",
  };
}
