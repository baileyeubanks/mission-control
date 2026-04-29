import type {
  ApprovalRequest,
  BusinessEvent,
  CompanyAccount,
  MissionControlBootstrap,
  MissionControlEnvelope,
  MissionAdapterGap,
  MissionHandoff,
  MissionIntegrationFlow,
  MissionModule,
  MissionOperatingDomain,
  MissionReadModelRecord,
  MissionTask,
  RuntimeProofEnvelope,
  RuntimeSurface,
} from "./mission-control";

async function parseJson<T>(response: Response, fallback: string): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || fallback);
  }
  return payload;
}

export async function getMissionControlBootstrap(): Promise<MissionControlBootstrap> {
  return parseJson<MissionControlBootstrap>(
    await fetch("/api/mission-control/bootstrap"),
    "Failed to load Mission Control bootstrap.",
  );
}

export async function getMissionControlAccounts(): Promise<CompanyAccount[]> {
  const payload = await parseJson<MissionControlEnvelope<CompanyAccount[]>>(
    await fetch("/api/mission-control/accounts"),
    "Failed to load Mission Control accounts.",
  );
  return Array.isArray(payload.data) ? payload.data : [];
}

export async function getMissionControlModules(): Promise<MissionModule[]> {
  const payload = await parseJson<MissionControlEnvelope<MissionModule[]>>(
    await fetch("/api/mission-control/modules"),
    "Failed to load Mission Control modules.",
  );
  return Array.isArray(payload.data) ? payload.data : [];
}

export async function getMissionControlTasks(): Promise<MissionTask[]> {
  const payload = await parseJson<MissionControlEnvelope<MissionTask[]>>(
    await fetch("/api/mission-control/tasks"),
    "Failed to load Mission Control tasks.",
  );
  return Array.isArray(payload.data) ? payload.data : [];
}

export async function getMissionControlApprovals(): Promise<ApprovalRequest[]> {
  const payload = await parseJson<MissionControlEnvelope<ApprovalRequest[]>>(
    await fetch("/api/mission-control/approvals"),
    "Failed to load Mission Control approvals.",
  );
  return Array.isArray(payload.data) ? payload.data : [];
}

export async function decideMissionControlApproval(
  approvalId: string,
  decision: "approved" | "rejected",
  note = "Local recovery operator decision.",
): Promise<ApprovalRequest> {
  const payload = await parseJson<{ ok: boolean; data?: ApprovalRequest; error?: { message?: string } }>(
    await fetch(`/api/mission-control/approvals/${encodeURIComponent(approvalId)}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, note }),
    }),
    "Failed to decide Mission Control approval.",
  );
  if (!payload.ok || !payload.data) {
    throw new Error(payload.error?.message || "Approval decision did not return a record.");
  }
  return payload.data;
}

export async function getMissionControlEvents(): Promise<BusinessEvent[]> {
  const payload = await parseJson<MissionControlEnvelope<BusinessEvent[]>>(
    await fetch("/api/mission-control/events"),
    "Failed to load Mission Control events.",
  );
  return Array.isArray(payload.data) ? payload.data : [];
}

export async function getMissionControlRuntimes(): Promise<RuntimeSurface[]> {
  const payload = await parseJson<MissionControlEnvelope<RuntimeSurface[]>>(
    await fetch("/api/mission-control/runtimes"),
    "Failed to load Mission Control runtimes.",
  );
  return Array.isArray(payload.data) ? payload.data : [];
}

export async function getMissionControlOperatingDomains(): Promise<MissionOperatingDomain[]> {
  const payload = await parseJson<MissionControlEnvelope<MissionOperatingDomain[]>>(
    await fetch("/api/mission-control/operating-domains"),
    "Failed to load Mission Control operating domains.",
  );
  return Array.isArray(payload.data) ? payload.data : [];
}

export async function getMissionControlIntegrationFlows(): Promise<MissionIntegrationFlow[]> {
  const payload = await parseJson<MissionControlEnvelope<MissionIntegrationFlow[]>>(
    await fetch("/api/mission-control/integration-flows"),
    "Failed to load Mission Control integration flows.",
  );
  return Array.isArray(payload.data) ? payload.data : [];
}

export async function getMissionControlAdapterGaps(): Promise<MissionAdapterGap[]> {
  const payload = await parseJson<MissionControlEnvelope<MissionAdapterGap[]>>(
    await fetch("/api/mission-control/adapter-gaps"),
    "Failed to load Mission Control adapter gaps.",
  );
  return Array.isArray(payload.data) ? payload.data : [];
}

export async function getMissionControlReadModels(domainId?: string): Promise<MissionReadModelRecord[]> {
  const query = domainId ? `?domain=${encodeURIComponent(domainId)}` : "";
  const payload = await parseJson<MissionControlEnvelope<MissionReadModelRecord[]>>(
    await fetch(`/api/mission-control/read-models${query}`),
    "Failed to load Mission Control read models.",
  );
  return Array.isArray(payload.data) ? payload.data : [];
}

export async function getMissionControlRuntimeProof(): Promise<RuntimeProofEnvelope> {
  return parseJson<RuntimeProofEnvelope>(
    await fetch("/api/mission-control/runtime-proof"),
    "Failed to load Mission Control runtime proof.",
  );
}

export async function getMissionControlOperatorRegistry(): Promise<unknown> {
  const payload = await parseJson<MissionControlEnvelope<unknown>>(
    await fetch("/api/mission-control/operator-registry"),
    "Failed to load Mission Control operator registry.",
  );
  return payload.data;
}

export async function getAcsQuoteHandoffV1(): Promise<unknown> {
  const payload = await parseJson<MissionControlEnvelope<unknown>>(
    await fetch("/api/mission-control/acs-quote-handoff-v1"),
    "Failed to load ACS quote handoff v1.",
  );
  return payload.data;
}

export async function listMissionHandoffs(): Promise<MissionHandoff[]> {
  const payload = await parseJson<{ handoffs: MissionHandoff[] }>(
    await fetch("/api/mission-control/handoffs"),
    "Failed to load Mission Control handoffs.",
  );
  return Array.isArray(payload.handoffs) ? payload.handoffs : [];
}

export async function createMissionControlHandoff(input: Partial<MissionHandoff>): Promise<MissionHandoff> {
  const payload = await parseJson<{ handoff: MissionHandoff }>(
    await fetch("/api/mission-control/handoffs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
    "Failed to create Mission Control handoff.",
  );
  return payload.handoff;
}

export async function convertMissionHandoff(handoffId: string): Promise<MissionHandoff> {
  const payload = await parseJson<{ handoff: MissionHandoff }>(
    await fetch(`/api/mission-control/handoffs/${encodeURIComponent(handoffId)}/convert`, { method: "POST" }),
    "Failed to convert Mission Control handoff.",
  );
  return payload.handoff;
}
