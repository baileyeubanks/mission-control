import type { InteractionWiringAudit, RootAuditStatus, RootAuthorityMap, RootEcosystemAudit } from "./root-audit";

async function parseJson<T>(response: Response, fallback: string): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || fallback);
  }
  return payload;
}

export async function getRootAuditStatus(): Promise<RootAuditStatus> {
  return parseJson<RootAuditStatus>(await fetch("/api/root-audit/status"), "Failed to load Root audit status.");
}

export async function getRootEcosystemAudit(): Promise<RootEcosystemAudit> {
  return parseJson<RootEcosystemAudit>(await fetch("/api/root-audit/ecosystem"), "Failed to load Root ecosystem audit.");
}

export async function getRootAuthorityMap(): Promise<RootAuthorityMap> {
  return parseJson<RootAuthorityMap>(await fetch("/api/root-audit/authority-map"), "Failed to load Root authority map.");
}

export async function getInteractionWiringAudit(): Promise<InteractionWiringAudit> {
  return parseJson<InteractionWiringAudit>(
    await fetch("/api/root-audit/interactions"),
    "Failed to load interaction wiring audit.",
  );
}
