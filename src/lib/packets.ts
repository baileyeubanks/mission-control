export const PACKET_STATUSES = ["queued", "running", "succeeded", "failed", "cancelled"] as const;
export type PacketStatus = (typeof PACKET_STATUSES)[number];

export const PACKET_KINDS = [
  "intake_extract",
  "draft_job_update",
  "schedule_optimize",
  "thread_summarize",
  "thread_reply_draft",
  "brief_extract",
  "quote_extract",
  "quote_followup_draft",
  "proposal_draft",
  "project_status_summary",
  "dispatch_eta_draft",
  "crew_readiness_summary",
  "invoice_followup_draft",
  "review_comment_summary",
  "delivery_package_summary",
  "repo_triage",
  "runtime_repair_plan",
] as const;
export type PacketKind = (typeof PACKET_KINDS)[number];

export interface IntakeSuggestedItem {
  description: string;
  rate: number;
}

export interface IntakeExtractResult {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  projectScope?: string;
  businessScope?: "Astro Cleanings" | "Content Co-op" | null;
  suggestedItems?: IntakeSuggestedItem[];
}

export interface DraftJobUpdateResult {
  text: string;
}

export interface ScheduleOptimizeAssignment {
  crewId: string;
  jobIds: string[];
  reasoning: string;
}

export interface ScheduleOptimizeResult {
  assignments: ScheduleOptimizeAssignment[];
}

export interface ThreadSummarizeResult {
  summary: string;
}

export interface ThreadReplyDraftResult {
  text: string;
}

export interface AdvisoryPacketResult {
  summary: string;
  text?: string;
  actions?: string[];
  confidence?: "low" | "medium" | "high";
}

export type PacketResult =
  | IntakeExtractResult
  | DraftJobUpdateResult
  | ScheduleOptimizeResult
  | ThreadSummarizeResult
  | ThreadReplyDraftResult
  | AdvisoryPacketResult;

export interface Packet {
  id: string;
  kind: PacketKind;
  status: PacketStatus;
  source_surface: string;
  entity_type: string | null;
  entity_id: string | null;
  requested_by: string | null;
  input_json: Record<string, unknown>;
  output_json: Record<string, unknown> | null;
  error_json: Record<string, unknown> | null;
  idempotency_key: string;
  model: string | null;
  attempt_count: number;
  max_attempts: number;
  lease_owner: string | null;
  lease_expires_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PacketEvent {
  id: string;
  packet_id: string;
  event_type: string;
  payload_json: Record<string, unknown> | null;
  created_at: string;
}

export interface PacketCreateInput {
  kind: PacketKind;
  sourceSurface: string;
  entityType?: string | null;
  entityId?: string | null;
  requestedBy?: string | null;
  input: unknown;
  idempotencyKey: string;
}

export interface PacketListQuery {
  entityType?: string;
  entityId?: string;
  status?: PacketStatus;
  kind?: PacketKind;
  limit?: number;
}

export function isPacketStatus(value: unknown): value is PacketStatus {
  return typeof value === "string" && PACKET_STATUSES.includes(value as PacketStatus);
}

export function isPacketKind(value: unknown): value is PacketKind {
  return typeof value === "string" && PACKET_KINDS.includes(value as PacketKind);
}

function normalizeForStableStringify(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeForStableStringify);
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = normalizeForStableStringify((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }

  return value;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(normalizeForStableStringify(value));
}

export function simpleHash(input: string): string {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

export function createPacketIdempotencyKey(
  kind: PacketKind,
  entityType: string | null | undefined,
  entityId: string | null | undefined,
  input: unknown,
): string {
  return [kind, entityType || "none", entityId || "none", simpleHash(stableStringify(input))].join(":");
}

export function getPacketResultSummary(packet: Packet): string {
  if (packet.status === "failed") {
    return String(packet.error_json?.message || "Packet failed.");
  }

  if (!packet.output_json) {
    if (packet.status === "running") return "Packet is running.";
    if (packet.status === "queued") return "Packet is queued.";
    if (packet.status === "cancelled") return "Packet was cancelled.";
    return "No result available.";
  }

  switch (packet.kind) {
    case "thread_summarize":
      return String(packet.output_json.summary || "Summary ready.");
    case "thread_reply_draft":
    case "draft_job_update":
    case "quote_followup_draft":
    case "proposal_draft":
    case "dispatch_eta_draft":
    case "invoice_followup_draft":
      return String(packet.output_json.text || "Draft ready.");
    case "brief_extract":
    case "quote_extract":
    case "project_status_summary":
    case "crew_readiness_summary":
    case "review_comment_summary":
    case "delivery_package_summary":
    case "repo_triage":
    case "runtime_repair_plan":
      return String(packet.output_json.summary || packet.output_json.text || "Advisory packet completed.");
    case "schedule_optimize":
      return `${Array.isArray(packet.output_json.assignments) ? packet.output_json.assignments.length : 0} advisory assignment set(s).`;
    case "intake_extract":
      return String(packet.output_json.projectScope || packet.output_json.businessScope || "Structured intake extracted.");
    default:
      return "Packet completed.";
  }
}
