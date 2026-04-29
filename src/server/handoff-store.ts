import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { MissionHandoff, MissionHandoffStatus, MissionHandoffType, MissionTask } from "../lib/mission-control";
import type { CanonicalInboxThread, CanonicalJobRecord } from "../lib/canonical-types";

const DEFAULT_STORE_DIR = path.resolve(process.cwd(), ".mission-control-recovery");
const STORE_FILE = "mission-handoffs.json";

const SEED_HANDOFFS: MissionHandoff[] = [
  {
    id: "handoff-acs-quote-001",
    source: "astrocleanings.com quote engine",
    company_account: "astro-cleaning-services",
    handoff_type: "acs_quote_intake",
    source_entity_id: "acs-quote-local-001",
    contact: {
      name: "Maya Thompson",
      email: "maya@example.com",
      phone: "+15125550140",
      company: null,
    },
    summary: "Move-out clean request for a three-bedroom apartment with pet hair, fridge, and oven add-ons.",
    status: "new",
    next_action: "Review quote, confirm crew readiness, then create job candidate.",
    created_at: "2026-04-23T15:00:00.000Z",
    updated_at: "2026-04-23T15:00:00.000Z",
    data_source: "local_recovery_store",
    details: {
      property_type: "Apartment",
      service_address: "North Austin, TX",
      bedrooms: 3,
      bathrooms: 2,
      requested_window: "Tomorrow morning",
      estimated_total_cents: 38500,
      quote_sections: ["Base move-out clean", "Fridge", "Oven", "Pet hair"],
    },
    readiness: {
      status: "blocked",
      summary: "Deep-clean certified crew required before dispatch.",
      blockers: ["Crew readiness signal pending from ACS onboarding donor."],
    },
    converted_artifacts: {},
  },
  {
    id: "handoff-cco-brief-001",
    source: "contentco-op.com creative brief",
    company_account: "content-co-op",
    handoff_type: "cco_creative_brief",
    source_entity_id: "cco-brief-local-001",
    contact: {
      name: "Jordan Avery",
      email: "jordan@northstar.example",
      phone: null,
      company: "Northstar Logistics",
    },
    summary: "Creative brief for recruiting and sales positioning video with strategy, script, and delivery review needs.",
    status: "new",
    next_action: "Create project candidate, launch Co-Produce planning, then track Co-Deliver approval state.",
    created_at: "2026-04-23T15:05:00.000Z",
    updated_at: "2026-04-23T15:05:00.000Z",
    data_source: "local_recovery_store",
    details: {
      project_type: "Brand strategy video",
      desired_deliverables: ["Strategy brief", "Script", "Hero video", "Cutdowns"],
      timeline: "Two-week sprint",
      budget_signal: "Retainer candidate",
      launch_links: {
        co_produce: "/admin/files",
        co_deliver: "/admin/approvals",
      },
    },
    readiness: {
      status: "not_required",
      summary: "Specialized CCO apps remain launch surfaces; Mission Control owns project rollup.",
      blockers: [],
    },
    converted_artifacts: {},
  },
];

function getStoreDir(storeDir?: string): string {
  return path.resolve(storeDir || process.env.MISSION_CONTROL_STORE_DIR || DEFAULT_STORE_DIR);
}

function getStorePath(storeDir?: string): string {
  return path.join(getStoreDir(storeDir), STORE_FILE);
}

function ensureStore(storeDir?: string): void {
  const dir = getStoreDir(storeDir);
  const file = getStorePath(storeDir);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  if (!existsSync(file)) {
    writeFileSync(file, `${JSON.stringify(SEED_HANDOFFS, null, 2)}\n`, "utf8");
  }
}

function readHandoffs(storeDir?: string): MissionHandoff[] {
  ensureStore(storeDir);
  try {
    const parsed = JSON.parse(readFileSync(getStorePath(storeDir), "utf8")) as MissionHandoff[];
    return Array.isArray(parsed) ? parsed : SEED_HANDOFFS;
  } catch (error) {
    console.error("Failed to read Mission Control handoff store:", error);
    return SEED_HANDOFFS;
  }
}

function writeHandoffs(handoffs: MissionHandoff[], storeDir?: string): void {
  ensureStore(storeDir);
  writeFileSync(getStorePath(storeDir), `${JSON.stringify(handoffs, null, 2)}\n`, "utf8");
}

function sourceKindForHandoff(type: MissionHandoffType): CanonicalInboxThread["sourceKind"] {
  return type === "cco_creative_brief" ? "creative_brief" : "quote_event";
}

function labelForHandoff(type: MissionHandoffType): string {
  return type === "cco_creative_brief" ? "CCO_BRIEF" : "ACS_QUOTE";
}

export function listMissionHandoffs(storeDir?: string): MissionHandoff[] {
  return readHandoffs(storeDir).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getMissionHandoff(id: string, storeDir?: string): MissionHandoff | null {
  return readHandoffs(storeDir).find((handoff) => handoff.id === id) || null;
}

export function createMissionHandoff(input: Partial<MissionHandoff>, storeDir?: string): MissionHandoff {
  if (!input.company_account || !input.handoff_type || !input.source || !input.source_entity_id || !input.contact || !input.summary) {
    throw new Error("source, company_account, handoff_type, source_entity_id, contact, and summary are required.");
  }

  const now = new Date().toISOString();
  const handoff: MissionHandoff = {
    id: input.id || `handoff-${Date.now()}`,
    source: input.source,
    company_account: input.company_account,
    handoff_type: input.handoff_type,
    source_entity_id: input.source_entity_id,
    contact: input.contact,
    summary: input.summary,
    status: input.status || "new",
    next_action: input.next_action || "Review and convert when ready.",
    created_at: input.created_at || now,
    updated_at: now,
    data_source: "local_recovery_store",
    details: input.details || {},
    readiness: input.readiness || { status: "not_required", summary: "No readiness blocker recorded.", blockers: [] },
    converted_artifacts: input.converted_artifacts || {},
  };

  const handoffs = readHandoffs(storeDir);
  writeHandoffs([handoff, ...handoffs.filter((item) => item.id !== handoff.id)], storeDir);
  return handoff;
}

export function updateMissionHandoffStatus(id: string, status: MissionHandoffStatus, storeDir?: string): MissionHandoff | null {
  const handoffs = readHandoffs(storeDir);
  let updated: MissionHandoff | null = null;
  const next = handoffs.map((handoff) => {
    if (handoff.id !== id) return handoff;
    updated = {
      ...handoff,
      status,
      updated_at: new Date().toISOString(),
    };
    return updated;
  });
  if (updated) {
    writeHandoffs(next, storeDir);
  }
  return updated;
}

export function convertMissionHandoff(id: string, storeDir?: string): MissionHandoff | null {
  const handoffs = readHandoffs(storeDir);
  let converted: MissionHandoff | null = null;
  const next = handoffs.map((handoff) => {
    if (handoff.id !== id) return handoff;

    const isAcs = handoff.handoff_type === "acs_quote_intake";
    converted = {
      ...handoff,
      status: handoff.readiness.status === "blocked" ? "blocked" : "converted",
      next_action: isAcs
        ? "Job candidate created locally; resolve onboarding readiness before assignment."
        : "Project candidate created locally; launch Co-Produce planning and Co-Deliver approval rollup.",
      updated_at: new Date().toISOString(),
      converted_artifacts: {
        task_id: `task-${handoff.source_entity_id}`,
        ...(isAcs
          ? { job_candidate_id: `job-${handoff.source_entity_id}` }
          : {
              project_candidate_id: `project-${handoff.source_entity_id}`,
              approval_id: `approval-${handoff.source_entity_id}`,
            }),
      },
    };
    return converted;
  });
  if (converted) {
    writeHandoffs(next, storeDir);
  }
  return converted;
}

export function missionHandoffsToInboxThreads(handoffs: MissionHandoff[]): CanonicalInboxThread[] {
  return handoffs.map((handoff) => ({
    threadId: handoff.id,
    packetEntityId: handoff.id,
    sourceKind: sourceKindForHandoff(handoff.handoff_type),
    channel: handoff.source,
    title: `${labelForHandoff(handoff.handoff_type)} / ${handoff.contact.name}`,
    counterpart: handoff.contact.company || handoff.contact.name,
    preview: handoff.summary,
    latestAt: handoff.updated_at,
    outboundTarget: handoff.contact.phone,
    handoffId: handoff.id,
    handoffStatus: handoff.status,
    nextAction: handoff.next_action,
    dataSource: handoff.data_source,
    readiness: handoff.readiness,
    convertedArtifacts: handoff.converted_artifacts,
    messages: [
      {
        id: `${handoff.id}-summary`,
        sender: handoff.source,
        content: handoff.summary,
        createdAt: handoff.created_at,
        direction: "inbound",
      },
      {
        id: `${handoff.id}-next-action`,
        sender: "Mission Control",
        content: handoff.next_action,
        createdAt: handoff.updated_at,
        direction: "system",
      },
    ],
  }));
}

export function missionHandoffsToJobCandidates(handoffs: MissionHandoff[]): CanonicalJobRecord[] {
  return handoffs
    .filter((handoff) => handoff.handoff_type === "acs_quote_intake" && ["converted", "blocked"].includes(handoff.status))
    .map((handoff) => ({
      id: handoff.converted_artifacts.job_candidate_id || `candidate-${handoff.source_entity_id}`,
      title: `Quote handoff / ${handoff.contact.name}`,
      status: handoff.status === "converted" ? "quoted" : "lead",
      scheduledStart: null,
      scheduledEnd: null,
      accessNotes: typeof handoff.details.requested_window === "string" ? handoff.details.requested_window : handoff.readiness.summary,
      serviceAddress: typeof handoff.details.service_address === "string" ? handoff.details.service_address : null,
      clientName: handoff.contact.name,
      clientEmail: handoff.contact.email,
      clientPhone: handoff.contact.phone,
      businessUnit: "ACS",
      assignedTeam: handoff.readiness.status === "blocked" ? "blocked_by_readiness" : null,
      totalPrice: typeof handoff.details.estimated_total_cents === "number" ? handoff.details.estimated_total_cents : null,
    }));
}

export function missionHandoffsToTasks(handoffs: MissionHandoff[]): MissionTask[] {
  return handoffs
    .filter((handoff) => ["converted", "blocked"].includes(handoff.status))
    .map((handoff) => {
      const isAcs = handoff.handoff_type === "acs_quote_intake";
      return {
        id: handoff.converted_artifacts.task_id || `task-${handoff.source_entity_id}`,
        accountId: handoff.company_account,
        moduleId: isAcs ? "acs-ops" : "cco-ops",
        title: isAcs
          ? `Resolve ACS quote handoff for ${handoff.contact.name}`
          : `Start CCO project handoff for ${handoff.contact.company || handoff.contact.name}`,
        status: handoff.status === "blocked" ? "blocked" : "queued",
        priority: "high",
        dueState: "today",
        owner: "Mission Control",
        blocker: handoff.readiness.status === "blocked" ? handoff.readiness.summary : null,
        source: handoff.id,
      };
    });
}
