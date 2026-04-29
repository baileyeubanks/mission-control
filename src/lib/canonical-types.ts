export type CanonicalThreadSource = "creative_brief" | "quote_event";

export interface CanonicalInboxMessage {
  id: string;
  sender: string;
  content: string;
  createdAt: string;
  direction: "inbound" | "outbound" | "system";
}

export interface CanonicalInboxThread {
  threadId: string;
  packetEntityId: string;
  sourceKind: CanonicalThreadSource;
  channel: string;
  title: string;
  counterpart: string;
  preview: string;
  latestAt: string;
  outboundTarget: string | null;
  handoffId?: string;
  handoffStatus?: "new" | "triaged" | "converted" | "blocked";
  nextAction?: string;
  dataSource?: string;
  readiness?: {
    status: "eligible" | "blocked" | "not_required";
    summary: string;
    blockers: string[];
  };
  convertedArtifacts?: {
    task_id?: string;
    job_candidate_id?: string;
    project_candidate_id?: string;
    approval_id?: string;
  };
  messages: CanonicalInboxMessage[];
}

export interface CanonicalCrewMember {
  id: string;
  displayName: string;
  role: string;
}

export interface CanonicalJobRecord {
  id: string;
  title: string;
  status: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  accessNotes: string | null;
  serviceAddress: string | null;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  businessUnit: string | null;
  assignedTeam: string | null;
  totalPrice: number | null;
}

export interface CanonicalSchedulePayload {
  jobs: CanonicalJobRecord[];
  crews: CanonicalCrewMember[];
}
