export type DataSource = "supabase" | "local_recovery_store" | "static_recovery_contract" | "mixed" | "live_probe";

export type CompanyAccountId = "astro-cleaning-services" | "content-co-op";

export type AuthorityClass =
  | "canonical-shell"
  | "live-public-authority"
  | "contract-authority"
  | "business-model-donor"
  | "module-demo-donor"
  | "specialized-app-authority"
  | "backend-donor"
  | "supporting-subsystem"
  | "parked"
  | "discard";

export type MissionModuleId =
  | "acs-ops"
  | "cco-ops"
  | "acs-onboarding"
  | "co-produce"
  | "co-cut"
  | "co-deliver"
  | "acs-brand-central"
  | "cco-brand-central"
  | "ai-packets"
  | "runtime-fleet"
  | "aether-video-os";

export type MissionModuleStatus = "active" | "extracting" | "parked" | "external-authority";
export type MissionTaskStatus = "queued" | "in-progress" | "blocked" | "done";
export type MissionPriority = "critical" | "high" | "normal" | "low";
export type ApprovalStatus = "requested" | "approved" | "rejected" | "not-required";
export type RuntimeStatus = "canonical" | "extract" | "preserve" | "parked" | "blocked";
export type RuntimeProofStatus = "not_checked" | "missing" | "installs" | "builds" | "boots" | "health_ok" | "blocked";
export type RuntimeProofStepStatus = "not_checked" | "skipped" | "passed" | "failed" | "blocked";
export type MissionHandoffType = "acs_quote_intake" | "cco_creative_brief";
export type MissionHandoffStatus = "new" | "triaged" | "converted" | "blocked";

export interface CompanyAccount {
  id: CompanyAccountId;
  label: string;
  shortLabel: string;
  domain: string;
  status: "canonical-account";
  sourceOfTruth: string;
  moduleIds: MissionModuleId[];
  purpose: string;
}

export interface MissionModule {
  id: MissionModuleId;
  accountId: CompanyAccountId | null;
  label: string;
  category: "operations" | "intelligence" | "delivery" | "support" | "system";
  status: MissionModuleStatus;
  authority: AuthorityClass;
  launchPath: string;
  runtimeId: string | null;
  description: string;
  dependencies: string[];
}

export interface MissionTask {
  id: string;
  accountId: CompanyAccountId | null;
  moduleId: MissionModuleId;
  title: string;
  status: MissionTaskStatus;
  priority: MissionPriority;
  dueState: "now" | "today" | "this-week" | "later";
  owner: string;
  blocker: string | null;
  source: string;
}

export interface ApprovalRequest {
  id: string;
  accountId: CompanyAccountId | null;
  moduleId: MissionModuleId;
  subject: string;
  requester: string;
  approver: string;
  status: ApprovalStatus;
  auditTrail: string[];
}

export interface RuntimeSurface {
  id: string;
  label: string;
  port: number | null;
  path: string;
  authorityClass: AuthorityClass;
  status: RuntimeStatus;
  command: string | null;
  health: string | null;
  notes: string;
  sharedPortGroup: string | null;
}

export interface RuntimeProofStep {
  status: RuntimeProofStepStatus;
  detail: string;
  command?: string;
  checkedAt: string;
}

export interface RuntimeProofRecord {
  runtimeId: string;
  label: string;
  port: number | null;
  path: string;
  command: string | null;
  health: string | null;
  proofStatus: RuntimeProofStatus;
  blocker: string | null;
  lastCheckedAt: string;
  install: RuntimeProofStep;
  build: RuntimeProofStep;
  boot: RuntimeProofStep;
  healthCheck: RuntimeProofStep;
}

export interface RuntimeProofEnvelope {
  data_source: DataSource;
  generated_at: string;
  records: RuntimeProofRecord[];
}

export interface MissionHandoffContact {
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
}

export interface MissionHandoff {
  id: string;
  source: string;
  company_account: CompanyAccountId;
  handoff_type: MissionHandoffType;
  source_entity_id: string;
  contact: MissionHandoffContact;
  summary: string;
  status: MissionHandoffStatus;
  next_action: string;
  created_at: string;
  updated_at: string;
  data_source: DataSource;
  details: Record<string, unknown>;
  readiness: {
    status: "eligible" | "blocked" | "not_required";
    summary: string;
    blockers: string[];
  };
  converted_artifacts: {
    task_id?: string;
    job_candidate_id?: string;
    project_candidate_id?: string;
    approval_id?: string;
  };
}

export interface MissionHandoffEnvelope {
  data_source: DataSource;
  generated_at: string;
  handoffs: MissionHandoff[];
}

export interface BusinessEvent {
  id: string;
  accountId: CompanyAccountId | null;
  moduleId: MissionModuleId;
  eventType: string;
  title: string;
  summary: string;
  actor: string;
  occurredAt: string;
  sourceSystem: string;
}

export type RolloutPacketStatus = "active" | "queued" | "blocked" | "parked" | "done";

export interface RolloutWorkPacket {
  id: string;
  title: string;
  status: RolloutPacketStatus;
  owner: string;
  nextAction: string;
  blocker: string | null;
}

export interface RolloutSignal {
  id: string;
  label: string;
  source: string;
  status: "parked" | "ready" | "adopted";
  whenToUse: string;
}

export interface MissionRollout {
  id: string;
  title: string;
  status: RolloutPacketStatus;
  centerOfGravity: string;
  summary: string;
  workPackets: RolloutWorkPacket[];
  signals: RolloutSignal[];
  acceptance: string[];
  freeze: string[];
}

export interface MissionValueLoop {
  id: string;
  accountId: CompanyAccountId | null;
  title: string;
  status: "active" | "queued" | "blocked";
  metric: string;
  proof: string;
  nextAction: string;
  route: string;
}

export interface MissionAgentLane {
  id: string;
  title: string;
  status: "active" | "queued" | "blocked" | "parked";
  authority: string;
  guardrail: string;
  nextAction: string;
  route: string;
}

export interface MissionOperatingDomain {
  id: "quotes" | "invoices" | "dispatch" | "finance";
  title: string;
  route: string;
  status: "active" | "contract-backed" | "ledger" | "blocked";
  purpose: string;
  authority: string;
  doesNotOwn: string;
  lifecycle: string[];
  sourceDocs: string[];
  nextAction: string;
  blocker: string | null;
}

export interface MissionIntegrationFlow {
  id: string;
  accountId: CompanyAccountId | "pro-se-info";
  title: string;
  status: "real-flow" | "partially-wired" | "separate-business" | "gap";
  sourceSurface: string;
  adminSurface: string;
  contractAuthority: string;
  actualStages: string[];
  producerFiles: string[];
  consumerFiles: string[];
  missingAdapter: string | null;
  nextAction: string;
  route: string;
}

export interface MissionAdapterGap {
  id: string;
  accountId: CompanyAccountId | "pro-se-info" | null;
  title: string;
  status: "missing" | "read-only-next" | "blocked" | "parked";
  sourceFlowId: string | null;
  affectedRoutes: string[];
  requiredReadModel: string[];
  requiredMutationGate: string[];
  proofFiles: string[];
  nextAction: string;
  blocker: string | null;
}

export interface MissionReadModelRecord {
  id: string;
  accountId: CompanyAccountId | "pro-se-info" | null;
  domainId: MissionOperatingDomain["id"] | "project";
  title: string;
  entityKind: "quote" | "invoice" | "dispatch_snapshot" | "project" | "approval" | "brand_boundary";
  lifecycleStage: string;
  status: "read-only" | "blocked" | "adapter-needed" | "parked";
  sourceFlowId: string | null;
  sourceSystem: string;
  dataSource: DataSource;
  owner: string;
  route: string;
  amountLabel: string | null;
  facts: string[];
  mutationGates: string[];
  nextAction: string;
  blocker: string | null;
}

export interface ServicePosture {
  supabase: "configured" | "missing_config";
  twilio: "configured" | "missing_config";
  gemini: "configured" | "missing_config";
  packets: "enabled" | "missing_config";
  hermes: "peripheral";
  paperclip: "optional";
}

export interface MissionControlBootstrap {
  data_source: DataSource;
  generated_at: string;
  product: {
    name: "Mission Control";
    canonicalShellPath: string;
    rootStatus: "legacy-donor-contract-label";
    deploymentStatus: "local-recovery-only";
  };
  services: ServicePosture;
  accounts: CompanyAccount[];
  modules: MissionModule[];
  tasks: MissionTask[];
  approvals: ApprovalRequest[];
  events: BusinessEvent[];
  runtimes: RuntimeSurface[];
  rollout: MissionRollout;
  rollouts: MissionRollout[];
  valueLoops: MissionValueLoop[];
  agentLanes: MissionAgentLane[];
  operatingDomains: MissionOperatingDomain[];
  integrationFlows: MissionIntegrationFlow[];
  adapterGaps: MissionAdapterGap[];
  readModels: MissionReadModelRecord[];
}

export interface MissionControlEnvelope<T> {
  data_source: DataSource;
  generated_at: string;
  data: T;
}
