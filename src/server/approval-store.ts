import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ApprovalRequest, BusinessEvent } from "../lib/mission-control";
import { APPROVAL_REQUESTS } from "./mission-control-data";

const DEFAULT_STORE_DIR = path.resolve(process.cwd(), ".mission-control-recovery");
const DECISION_FILE = "mission-approval-decisions.json";

interface ApprovalDecision {
  id: string;
  status: "approved" | "rejected";
  decided_at: string;
  decided_by: string;
  note: string;
}

function getStoreDir(storeDir?: string): string {
  return path.resolve(storeDir || process.env.MISSION_CONTROL_STORE_DIR || DEFAULT_STORE_DIR);
}

function getStorePath(storeDir?: string): string {
  return path.join(getStoreDir(storeDir), DECISION_FILE);
}

function ensureStore(storeDir?: string): void {
  const dir = getStoreDir(storeDir);
  const file = getStorePath(storeDir);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  if (!existsSync(file)) {
    writeFileSync(file, "[]\n", "utf8");
  }
}

function readDecisions(storeDir?: string): ApprovalDecision[] {
  ensureStore(storeDir);
  try {
    const parsed = JSON.parse(readFileSync(getStorePath(storeDir), "utf8")) as ApprovalDecision[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to read Mission Control approval decisions:", error);
    return [];
  }
}

function writeDecisions(decisions: ApprovalDecision[], storeDir?: string): void {
  ensureStore(storeDir);
  writeFileSync(getStorePath(storeDir), `${JSON.stringify(decisions, null, 2)}\n`, "utf8");
}

export function listMissionApprovals(storeDir?: string): ApprovalRequest[] {
  const decisions = new Map(readDecisions(storeDir).map((decision) => [decision.id, decision]));
  return APPROVAL_REQUESTS.map((approval) => {
    const decision = decisions.get(approval.id);
    if (!decision) return approval;
    return {
      ...approval,
      status: decision.status,
      auditTrail: [
        ...approval.auditTrail,
        `${decision.status === "approved" ? "Approved" : "Rejected"} by ${decision.decided_by} at ${decision.decided_at}.`,
        decision.note,
      ].filter(Boolean),
    };
  });
}

export function decideMissionApproval(
  id: string,
  status: "approved" | "rejected",
  decidedBy = "local-operator",
  note = "Local recovery decision.",
  storeDir?: string,
): ApprovalRequest | null {
  const approval = APPROVAL_REQUESTS.find((item) => item.id === id);
  if (!approval) return null;

  const now = new Date().toISOString();
  const decisions = readDecisions(storeDir).filter((decision) => decision.id !== id);
  decisions.unshift({
    id,
    status,
    decided_at: now,
    decided_by: decidedBy,
    note,
  });
  writeDecisions(decisions, storeDir);

  return listMissionApprovals(storeDir).find((item) => item.id === id) || null;
}

export function missionApprovalEvents(storeDir?: string): BusinessEvent[] {
  return readDecisions(storeDir).map((decision) => {
    const approval = APPROVAL_REQUESTS.find((item) => item.id === decision.id);
    return {
      id: `event-${decision.id}-${decision.status}`,
      accountId: approval?.accountId || null,
      moduleId: approval?.moduleId || "runtime-fleet",
      eventType: `approval.${decision.status}`,
      title: `${decision.status === "approved" ? "Approved" : "Rejected"}: ${approval?.subject || decision.id}`,
      summary: decision.note || "Local recovery approval decision.",
      actor: decision.decided_by,
      occurredAt: decision.decided_at,
      sourceSystem: "local Mission Control approval store",
    };
  });
}
