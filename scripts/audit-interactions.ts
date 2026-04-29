import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { InteractionAuditRecord, InteractionPriority, InteractionStatus, InteractionWiringAudit } from "../src/lib/root-audit";

const repoRoot = process.cwd();
const srcRoot = path.join(repoRoot, "src");
const artifactDir = path.join(repoRoot, ".mission-control-audit");
const ignored = new Set(["node_modules", "dist", "build", "coverage", ".git"]);

function walkFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(current: string): void {
    for (const entry of readdirSync(current)) {
      if (ignored.has(entry) || entry.startsWith(".")) continue;
      const next = path.join(current, entry);
      const stats = statSync(next);
      if (stats.isDirectory()) {
        walk(next);
      } else if (
        /\.(tsx|ts|jsx|js)$/.test(entry)
        && !entry.includes(".test.")
        && !next.includes(`${path.sep}components${path.sep}ui${path.sep}`)
      ) {
        files.push(next);
      }
    }
  }

  walk(dir);
  return files.sort();
}

function routeForFile(relativePath: string): string {
  if (relativePath.includes("Dashboard")) return "/admin";
  if (relativePath.includes("Inbox")) return "/admin/inbox";
  if (relativePath.includes("Contacts")) return "/admin/contacts";
  if (relativePath.includes("Finance")) return "/admin/finance";
  if (relativePath.includes("Jobs")) return "/admin/jobs";
  if (relativePath.includes("Scheduling")) return "/admin/scheduling";
  if (relativePath.includes("Approvals")) return "/admin/approvals";
  if (relativePath.includes("Runtime")) return "/admin/runtime";
  if (relativePath.includes("Health")) return "/admin/health";
  if (relativePath.includes("Packets")) return "/admin/packets";
  if (relativePath.includes("Files")) return "/admin/files";
  if (relativePath.includes("Security")) return "/admin/security";
  if (relativePath.includes("OperatingDomain")) return "/admin/:domain";
  if (relativePath.includes("ClientPortal")) return "/c/:token";
  if (relativePath.includes("CrewApp")) return "/crew";
  return relativePath.includes("layout") ? "layout" : "unknown";
}

function componentForFile(relativePath: string): string {
  return path.basename(relativePath).replace(/\.(tsx|ts|jsx|js)$/, "");
}

function extractLabel(line: string): string {
  const aria = line.match(/aria-label=["'`]([^"'`]+)["'`]/);
  if (aria) return aria[1];
  const title = line.match(/title=["'`]([^"'`]+)["'`]/);
  if (title) return title[1];
  const text = line.replace(/<[^>]+>/g, " ").replace(/[{}()]/g, " ").replace(/\s+/g, " ").trim();
  return text.slice(0, 80) || "unlabeled interaction";
}

function priorityFor(relativePath: string, line: string): InteractionPriority {
  const haystack = `${relativePath} ${line}`.toLowerCase();
  if (/(quote|booking|invoice|payment|approval|handoff|convert|send|transmit|job|project|brief)/.test(haystack)) return "P0";
  if (/(contact|filter|export|search|file|schedule|dispatch|health|runtime|packet)/.test(haystack)) return "P1";
  if (/(bell|view|layout|tab|menu|more|grid|list)/.test(haystack)) return "P2";
  return "P3";
}

function statusFor(line: string, nextLines: string): InteractionStatus {
  const combined = `${line}\n${nextLines}`;
  if (/disabled(=|[\s>])/.test(combined) || /aria-disabled/.test(combined)) return "disabled";
  if (/href=["']#["']|href=["']["']/.test(combined)) return "missing";
  if (/console\.log\(|alert\(|Coming soon|Not implemented|TODO wire|placeholder handler/i.test(combined)) return "fake";
  if (/onClick=|to=|href=|onSubmit=|router\.push|navigate\(|fetch\(|createPacketRequest|convertMissionHandoff|set[A-Z]/.test(combined)) return "wired";
  return "missing";
}

function interactionTypeFor(line: string): string {
  if (/<form|onSubmit=/.test(line)) return "form";
  if (/<a\s|href=/.test(line)) return "link";
  if (/<Button|<button/.test(line)) return "button";
  if (/MenuItem|Dropdown/.test(line)) return "menu";
  if (/Tabs|Tab/.test(line)) return "tab";
  if (/onClick=/.test(line)) return "click-target";
  return "interaction";
}

function intendedFor(priority: InteractionPriority, status: InteractionStatus, label: string): string {
  if (status === "disabled") return "Keep disabled until the required backend/data contract exists; visible reason must be present.";
  if (priority === "P0") return `Wire ${label} to a validated backend action with persistence, event logging, and company scope.`;
  if (priority === "P1") return `Wire ${label} to a real route, filter, export, or API action.`;
  return `Keep ${label} only if it has a visible effect or honest disabled state.`;
}

function backendFor(priority: InteractionPriority, line: string): string {
  const lower = line.toLowerCase();
  if (priority !== "P0" && priority !== "P1") return "none unless promoted";
  if (lower.includes("approve") || lower.includes("reject")) return "/api/mission-control/approvals/:id/decision";
  if (lower.includes("handoff") || lower.includes("convert")) return "/api/mission-control/handoffs";
  if (lower.includes("invoice") || lower.includes("payment")) return "Supabase invoice/payment read model plus Stripe authority";
  if (lower.includes("quote")) return "/api/mission-control/handoffs or future /api/astro/quotes";
  if (lower.includes("send") || lower.includes("reply")) return "/api/twilio/send or communications draft endpoint";
  return "route-local handler or Mission Control API";
}

function dataModelFor(line: string): string {
  const lower = line.toLowerCase();
  if (lower.includes("approve") || lower.includes("reject")) return "ApprovalRequest + BusinessEvent";
  if (lower.includes("invoice") || lower.includes("payment")) return "Invoice + Payment + BusinessEvent";
  if (lower.includes("quote") || lower.includes("handoff")) return "MissionHandoff + MissionTask + CanonicalJobRecord";
  if (lower.includes("contact")) return "Contact";
  if (lower.includes("project") || lower.includes("brief")) return "MissionHandoff + project candidate";
  if (lower.includes("packet") || lower.includes("ai")) return "AgentPacket";
  return "none";
}

const records: InteractionAuditRecord[] = [];

for (const file of walkFiles(srcRoot)) {
  const relativePath = path.relative(repoRoot, file);
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, index) => {
    if (!/(<Button|<button|<a\s|href=|onClick=|onSubmit=|MenuItem|Dropdown|Tabs|router\.push|navigate\()/.test(line)) return;
    const blockEnd = lines.findIndex((candidate, candidateIndex) => candidateIndex > index && /<\/Button>|<\/button>|<\/a>|\/>/.test(candidate));
    const endIndex = blockEnd > index ? Math.min(blockEnd + 1, index + 16) : index + 12;
    const nextLines = lines.slice(index + 1, endIndex).join("\n");
    const status = statusFor(line, nextLines);
    const priority = priorityFor(relativePath, line);
    const label = extractLabel(`${line}\n${nextLines}`);
    records.push({
      id: `${relativePath}:${index + 1}`,
      file: relativePath,
      route: routeForFile(relativePath),
      component: componentForFile(relativePath),
      visibleLabel: label,
      interactionType: interactionTypeFor(line),
      currentBehavior: status === "wired" ? "handler or navigation detected" : status === "disabled" ? "disabled" : status === "fake" ? "fake or placeholder behavior detected" : "no real behavior detected",
      intendedBehavior: intendedFor(priority, status, label),
      backendNeeded: backendFor(priority, line),
      dataModelNeeded: dataModelFor(line),
      priority,
      status,
      line: index + 1,
      evidence: line.trim().slice(0, 180),
    });
  });
}

const audit: InteractionWiringAudit = {
  data_source: "local_audit_artifact",
  generated_at: new Date().toISOString(),
  summary: {
    total_interactive_elements: records.length,
    dead_buttons: records.filter((record) => record.interactionType === "button" && record.status === "missing").length,
    fake_submit_handlers: records.filter((record) => record.status === "fake" && /submit|form/i.test(record.visibleLabel)).length,
    mock_only_screens: records.filter((record) => /mock|placeholder/i.test(record.evidence)).length,
    missing_api_routes: records.filter((record) => record.priority === "P0" && record.status === "missing").length,
    missing_database_writes: records.filter((record) => record.priority === "P0" && record.status !== "wired" && record.status !== "disabled").length,
    broken_navigation_links: records.filter((record) => /href=["']#["']|href=["']["']/.test(record.evidence)).length,
    forms_without_validation: records.filter((record) => record.interactionType === "form" && record.status !== "wired").length,
    forms_without_persistence: records.filter((record) => record.interactionType === "form" && record.status !== "wired").length,
    p0_breaks: records.filter((record) => record.priority === "P0" && record.status !== "wired" && record.status !== "disabled").length,
    p1_breaks: records.filter((record) => record.priority === "P1" && record.status !== "wired" && record.status !== "disabled").length,
  },
  records,
};

function section(title: string, predicate: (record: InteractionAuditRecord) => boolean): string {
  const rows = records
    .filter(predicate)
    .slice(0, 80)
    .map((record) => `| ${record.priority} | ${record.status} | ${record.route} | ${record.file}:${record.line} | ${record.visibleLabel.replace(/\|/g, "/")} | ${record.intendedBehavior.replace(/\|/g, "/")} |`)
    .join("\n");
  return `## ${title}\n\n${rows ? `| Priority | Status | Route | File | Label | Required behavior |\n|---|---|---|---|---|---|\n${rows}` : "No records."}`;
}

const markdown = `# Interaction Wiring Audit

Generated: ${audit.generated_at}

## Summary

- Total interactive elements found: ${audit.summary.total_interactive_elements}
- Dead buttons: ${audit.summary.dead_buttons}
- Fake submit handlers: ${audit.summary.fake_submit_handlers}
- Mock-only screens: ${audit.summary.mock_only_screens}
- Missing API routes: ${audit.summary.missing_api_routes}
- Missing database writes: ${audit.summary.missing_database_writes}
- Broken navigation links: ${audit.summary.broken_navigation_links}
- Forms without validation: ${audit.summary.forms_without_validation}
- Forms without persistence: ${audit.summary.forms_without_persistence}
- P0 breaks: ${audit.summary.p0_breaks}
- P1 breaks: ${audit.summary.p1_breaks}

${section("P0 Core Flow Breaks", (record) => record.priority === "P0" && record.status !== "wired" && record.status !== "disabled")}

${section("P1 Important Breaks", (record) => record.priority === "P1" && record.status !== "wired" && record.status !== "disabled")}

${section("Route-by-Route Interaction Inventory", () => true)}

## Recommended Wiring Order

1. Wire or disable P0 approval, quote, booking, invoice, payment, send, and handoff actions.
2. Wire P1 filter/export/view controls or hide them until useful.
3. Keep AI actions packetized and drafts-only unless an approval gate exists.
4. Rerun this audit after every wiring pass.
`;

mkdirSync(artifactDir, { recursive: true });
writeFileSync(path.join(artifactDir, "interaction-wiring-inventory.json"), `${JSON.stringify(audit, null, 2)}\n`);
writeFileSync(path.join(repoRoot, "interaction-wiring-inventory.json"), `${JSON.stringify(audit, null, 2)}\n`);
writeFileSync(path.join(repoRoot, "INTERACTION_WIRING_AUDIT.md"), markdown);

console.log(`Interaction wiring audit complete: ${records.length} interactions scanned.`);
