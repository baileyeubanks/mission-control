import { existsSync, writeFileSync } from "node:fs";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { RUNTIME_SURFACES } from "../src/server/mission-control-data";
import type { RuntimeProofEnvelope, RuntimeProofRecord, RuntimeProofStep } from "../src/lib/mission-control";

const execFileAsync = promisify(execFile);
const runBuilds = process.env.PROVE_RUNTIME_BUILDS === "1";
const checkedAt = new Date().toISOString();
const proofPath = path.resolve(process.cwd(), "mission-control-runtime-proof.json");

function step(status: RuntimeProofStep["status"], detail: string, command?: string): RuntimeProofStep {
  return { status, detail, ...(command ? { command } : {}), checkedAt };
}

async function isPortListening(port: number | null): Promise<boolean> {
  if (!port) return false;
  try {
    await execFileAsync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN"]);
    return true;
  } catch {
    return false;
  }
}

async function runBuild(runtimePath: string): Promise<RuntimeProofStep> {
  if (!runBuilds) {
    return step("skipped", "Build execution skipped; set PROVE_RUNTIME_BUILDS=1 to run builds.", "npm run build");
  }
  try {
    await execFileAsync("npm", ["run", "build"], { cwd: runtimePath, timeout: 120_000 });
    return step("passed", "Production build passed.", "npm run build");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return step("failed", message.slice(0, 600), "npm run build");
  }
}

async function runHealth(url: string | null, listening: boolean): Promise<RuntimeProofStep> {
  if (!url) return step("skipped", "No health URL is registered.");
  if (!listening) return step("blocked", "Runtime is not listening, so health check was not attempted.", `GET ${url}`);

  try {
    const response = await fetch(url);
    return response.ok
      ? step("passed", `Health returned HTTP ${response.status}.`, `GET ${url}`)
      : step("failed", `Health returned HTTP ${response.status}.`, `GET ${url}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return step("failed", message.slice(0, 600), `GET ${url}`);
  }
}

function proofStatus(record: Pick<RuntimeProofRecord, "install" | "build" | "boot" | "healthCheck">): RuntimeProofRecord["proofStatus"] {
  if ([record.install, record.build, record.boot, record.healthCheck].some((item) => item.status === "failed" || item.status === "blocked")) {
    return "blocked";
  }
  if (record.healthCheck.status === "passed") return "health_ok";
  if (record.boot.status === "passed") return "boots";
  if (record.build.status === "passed" || record.build.status === "skipped") return "builds";
  if (record.install.status === "passed") return "installs";
  return "not_checked";
}

function blockerFor(record: Pick<RuntimeProofRecord, "install" | "build" | "boot" | "healthCheck">): string | null {
  return [record.install, record.build, record.boot, record.healthCheck].find((item) => item.status === "failed" || item.status === "blocked")?.detail || null;
}

async function proveRuntime(runtime: (typeof RUNTIME_SURFACES)[number]): Promise<RuntimeProofRecord> {
  const runtimeExists = existsSync(runtime.path);
  const packageExists = runtimeExists && existsSync(path.join(runtime.path, "package.json"));
  const nodeModulesExists = runtimeExists && existsSync(path.join(runtime.path, "node_modules"));
  const listening = await isPortListening(runtime.port);

  const install = !runtimeExists
    ? step("failed", "Runtime path is missing.")
    : !packageExists
      ? step("failed", "package.json is missing.")
      : nodeModulesExists
        ? step("passed", "node_modules present.")
        : step("blocked", "node_modules missing; dependency install approval required before build/boot proof.", "npm install");

  const build = install.status === "passed" ? await runBuild(runtime.path) : step("blocked", "Build blocked until dependencies are installed.", "npm run build");
  const boot = listening
    ? step("passed", `Port ${runtime.port} is listening.`, runtime.command || undefined)
    : build.status === "failed" || install.status !== "passed"
      ? step("blocked", "Boot proof blocked by install/build state.", runtime.command || undefined)
      : step("not_checked", "Runtime is not currently listening; boot command not launched by proof script.", runtime.command || undefined);
  const healthCheck = await runHealth(runtime.health, listening);

  const partial = { install, build, boot, healthCheck };
  return {
    runtimeId: runtime.id,
    label: runtime.label,
    port: runtime.port,
    path: runtime.path,
    command: runtime.command,
    health: runtime.health,
    proofStatus: proofStatus(partial),
    blocker: blockerFor(partial),
    lastCheckedAt: checkedAt,
    ...partial,
  };
}

const records = [];
for (const runtime of RUNTIME_SURFACES) {
  records.push(await proveRuntime(runtime));
}

const envelope: RuntimeProofEnvelope = {
  data_source: "local_recovery_store",
  generated_at: checkedAt,
  records,
};

writeFileSync(proofPath, `${JSON.stringify(envelope, null, 2)}\n`, "utf8");
console.log(`wrote ${proofPath}`);
for (const record of records) {
  console.log(`${record.proofStatus.padEnd(10)} ${String(record.port || "-").padEnd(5)} ${record.runtimeId} ${record.blocker || ""}`);
}
