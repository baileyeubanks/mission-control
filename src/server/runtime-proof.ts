import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import net from "node:net";
import type { RuntimeProofEnvelope, RuntimeProofRecord, RuntimeSurface } from "../lib/mission-control";
import { RUNTIME_SURFACES } from "./mission-control-data";

function probePort(port: number | null): Promise<boolean> {
  if (port == null) return Promise.resolve(false);
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(800);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, "127.0.0.1");
  });
}

const RUNTIME_PROOF_FILE = path.resolve(process.cwd(), "mission-control-runtime-proof.json");

function nowStep(detail: string): RuntimeProofRecord["install"] {
  return {
    status: "not_checked",
    detail,
    checkedAt: new Date().toISOString(),
  };
}

async function fallbackRecord(runtime: RuntimeSurface): Promise<RuntimeProofRecord> {
  const missingPath = !existsSync(runtime.path);
  const nodeModulesMissing = !missingPath && !existsSync(path.join(runtime.path, "node_modules"));
  const portOpen = await probePort(runtime.port);

  const blocker = missingPath
    ? "Runtime path is missing."
    : nodeModulesMissing
      ? "Dependencies are not installed; install approval is required before build/boot proof."
      : null;

  return {
    runtimeId: runtime.id,
    label: runtime.label,
    port: runtime.port,
    path: runtime.path,
    command: runtime.command,
    health: runtime.health,
    proofStatus: blocker ? "blocked" : portOpen ? "health_ok" : "not_checked",
    blocker,
    lastCheckedAt: new Date().toISOString(),
    install: {
      status: nodeModulesMissing ? "blocked" : missingPath ? "failed" : "passed",
      detail: nodeModulesMissing ? "node_modules missing." : missingPath ? "path missing." : "Path exists.",
      checkedAt: new Date().toISOString(),
    },
    build: nowStep("Build check not run yet."),
    boot: {
      status: portOpen ? "passed" : "not_checked",
      detail: portOpen ? `Listening on port ${runtime.port}.` : `Port ${runtime.port ?? "n/a"} not reachable.`,
      checkedAt: new Date().toISOString(),
    },
    healthCheck: {
      status: portOpen ? "passed" : "not_checked",
      detail: portOpen ? `Port ${runtime.port} is open.` : "Health check not run yet.",
      checkedAt: new Date().toISOString(),
    },
  };
}

function isRuntimeProofEnvelope(value: unknown): value is RuntimeProofEnvelope {
  return Boolean(
    value &&
      typeof value === "object" &&
      Array.isArray((value as RuntimeProofEnvelope).records) &&
      typeof (value as RuntimeProofEnvelope).generated_at === "string",
  );
}

export async function getRuntimeProof(): Promise<RuntimeProofEnvelope> {
  let persisted: RuntimeProofEnvelope | null = null;
  if (existsSync(RUNTIME_PROOF_FILE)) {
    try {
      const parsed = JSON.parse(readFileSync(RUNTIME_PROOF_FILE, "utf8")) as unknown;
      if (isRuntimeProofEnvelope(parsed)) {
        persisted = parsed;
      }
    } catch (error) {
      console.error("Failed to read runtime proof artifact:", error);
    }
  }

  const liveRecords = await Promise.all(RUNTIME_SURFACES.map(fallbackRecord));

  if (!persisted) {
    return {
      data_source: "live_probe",
      generated_at: new Date().toISOString(),
      records: liveRecords,
    };
  }

  // Merge persisted data with live port probes
  const mergedRecords = persisted.records.map((persistedRecord) => {
    const live = liveRecords.find((r) => r.runtimeId === persistedRecord.runtimeId);
    if (!live) return persistedRecord;
    return {
      ...persistedRecord,
      proofStatus: live.boot.status === "passed" ? "health_ok" : persistedRecord.proofStatus,
      boot: live.boot.status === "passed" ? live.boot : persistedRecord.boot,
      healthCheck: live.healthCheck.status === "passed" ? live.healthCheck : persistedRecord.healthCheck,
      lastCheckedAt: new Date().toISOString(),
    };
  });

  return {
    data_source: "mixed",
    generated_at: new Date().toISOString(),
    records: mergedRecords,
  };
}
