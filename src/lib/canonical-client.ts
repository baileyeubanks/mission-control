import type { CanonicalInboxThread, CanonicalJobRecord, CanonicalSchedulePayload } from "./canonical-types";

async function parseJson<T>(response: Response, fallback: string): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || fallback);
  }
  return payload;
}

export async function getCanonicalInbox(): Promise<CanonicalInboxThread[]> {
  const payload = await parseJson<{ threads: CanonicalInboxThread[] }>(await fetch("/api/mission-control/inbox"), "Failed to fetch inbox.");
  return Array.isArray(payload.threads) ? payload.threads : [];
}

export async function getCanonicalSchedule(): Promise<CanonicalSchedulePayload> {
  const payload = await parseJson<CanonicalSchedulePayload>(await fetch("/api/canonical/schedule"), "Failed to fetch scheduling data.");
  return {
    jobs: Array.isArray(payload.jobs) ? payload.jobs : [],
    crews: Array.isArray(payload.crews) ? payload.crews : [],
  };
}

export async function getCanonicalJobs(): Promise<CanonicalJobRecord[]> {
  const payload = await parseJson<{ jobs: CanonicalJobRecord[] }>(await fetch("/api/canonical/jobs"), "Failed to fetch jobs.");
  return Array.isArray(payload.jobs) ? payload.jobs : [];
}

export async function getOperatorRole(userId: string): Promise<string | null> {
  const params = new URLSearchParams({ userId });
  const payload = await parseJson<{ role?: string | null }>(await fetch(`/api/auth/role?${params.toString()}`), "Failed to fetch operator role.");
  return typeof payload.role === "string" ? payload.role : null;
}
