import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { RootAuthorityMap, RootEcosystemAudit, RootEcosystemRepoRecord, RootRepoAuthorityClass } from "../src/lib/root-audit";

const repoRoot = process.cwd();
const artifactDir = path.join(repoRoot, ".mission-control-audit");
const ignored = new Set([
  ".git",
  ".next",
  ".nuxt",
  ".output",
  ".turbo",
  ".vercel",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "target",
  "tmp",
]);

const scanRoots = [
  path.join(os.homedir(), "Desktop", "Projects"),
  path.join(os.homedir(), "Downloads"),
  path.join(os.homedir(), "Documents", "Codex"),
].filter((root) => existsSync(root));

function safeRead(filePath: string): string {
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function safeJson(filePath: string): Record<string, unknown> {
  const text = safeRead(filePath);
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function normalizeId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function walkCandidates(root: string, maxDepth = 4): string[] {
  const found = new Set<string>();

  function walk(dir: string, depth: number): void {
    if (depth > maxDepth) return;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }

    const hasPackage = entries.includes("package.json");
    const hasGit = entries.includes(".git");
    const hasSupabase = entries.includes("supabase");
    const hasKnownConfig = entries.some((entry) =>
      ["vite.config.ts", "vite.config.js", "next.config.js", "next.config.mjs", "firebase.json", "server.ts", "server.js"].includes(entry),
    );
    if (hasPackage || hasGit || hasSupabase || hasKnownConfig) {
      found.add(dir);
    }

    for (const entry of entries) {
      if (ignored.has(entry) || entry.startsWith(".")) continue;
      const next = path.join(dir, entry);
      let stats;
      try {
        stats = statSync(next);
      } catch {
        continue;
      }
      if (stats.isDirectory()) walk(next, depth + 1);
    }
  }

  walk(root, 0);
  return [...found].sort();
}

function listFiles(dir: string, maxDepth = 3): string[] {
  const files: string[] = [];

  function walk(current: string, depth: number): void {
    if (depth > maxDepth) return;
    let entries: string[];
    try {
      entries = readdirSync(current);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (ignored.has(entry) || entry.startsWith(".")) continue;
      const next = path.join(current, entry);
      let stats;
      try {
        stats = statSync(next);
      } catch {
        continue;
      }
      if (stats.isDirectory()) {
        walk(next, depth + 1);
      } else {
        files.push(next);
      }
    }
  }

  walk(dir, 0);
  return files;
}

function detectFramework(packageJson: Record<string, unknown>, files: string[]): string[] {
  const deps = {
    ...(typeof packageJson.dependencies === "object" && packageJson.dependencies ? packageJson.dependencies : {}),
    ...(typeof packageJson.devDependencies === "object" && packageJson.devDependencies ? packageJson.devDependencies : {}),
  } as Record<string, unknown>;
  const frameworks = new Set<string>();
  if (deps.next || files.some((file) => file.endsWith("next.config.js") || file.endsWith("next.config.mjs"))) frameworks.add("Next.js");
  if (deps.vite || files.some((file) => file.endsWith("vite.config.ts") || file.endsWith("vite.config.js"))) frameworks.add("Vite");
  if (deps.react) frameworks.add("React");
  if (deps.express || files.some((file) => file.endsWith("server.ts") || file.endsWith("server.js"))) frameworks.add("Express");
  if (deps.firebase || files.some((file) => file.endsWith("firebase.json") || file.endsWith("firestore.rules"))) frameworks.add("Firebase");
  if (deps["@supabase/supabase-js"] || files.some((file) => file.includes(`${path.sep}supabase${path.sep}`))) frameworks.add("Supabase");
  if (deps.stripe) frameworks.add("Stripe");
  return [...frameworks];
}

function classify(repoPath: string, packageName: string | null, evidenceText: string): Pick<RootEcosystemRepoRecord, "authorityClass" | "confidence" | "intendedRole" | "recommendedAction" | "flags"> {
  const haystack = `${repoPath} ${packageName || ""} ${evidenceText}`.toLowerCase();
  const flags: string[] = [];
  if (haystack.includes("mock") || haystack.includes("placeholder")) flags.push("contains_mock_or_placeholder_language");
  if (haystack.includes("oauth") || haystack.includes("google")) flags.push("google_or_oauth_signal");
  if (haystack.includes("stripe")) flags.push("stripe_signal");
  if (haystack.includes("supabase")) flags.push("supabase_signal");

  if (haystack.includes("acs-website") || haystack.includes("astrocleanings") || haystack.includes("astro-cleaning")) {
    return { authorityClass: "public-site-authority", confidence: "high", intendedRole: "Astro public conversion and quote-intake authority.", recommendedAction: "Keep public site separate; wire intake events into Root/Mission Control.", flags };
  }
  if (haystack.includes("contentco-op") || haystack.includes("content-co-op")) {
    return { authorityClass: "public-site-authority", confidence: "high", intendedRole: "Content Co-op public conversion and creative-brief authority.", recommendedAction: "Keep public site separate; wire brief events into Root/Mission Control.", flags };
  }
  if (haystack.includes("ccnas")) {
    return { authorityClass: "infra-support", confidence: "high", intendedRole: "Infrastructure/archive support, not business authority.", recommendedAction: "Inspect for deploy/archive support only; keep out of Root product logic.", flags };
  }
  if (haystack.includes("paperclip")) {
    return { authorityClass: "parked", confidence: "high", intendedRole: "Company-scoped execution layer candidate.", recommendedAction: "Keep optional until Root/Mission Control workflows prove need.", flags };
  }
  if (haystack.includes("hermes") || haystack.includes("blaze")) {
    return { authorityClass: "ai-operator-layer", confidence: "high", intendedRole: "AI/operator layer for drafts, triage, and auditable actions.", recommendedAction: "Treat as peripheral worker until Root can verify structured packets.", flags };
  }
  if (haystack.includes("brand-central") || /\/brand($|\/)/.test(haystack) || haystack.includes("brandcenter")) {
    return { authorityClass: "brand-authority", confidence: "high", intendedRole: "Brand/design support surface.", recommendedAction: "Preserve as brand authority; do not make it operational core.", flags };
  }
  if (haystack.includes("co-script") || haystack.includes("coscript") || haystack.includes("co-produce") || haystack.includes("co-cut") || haystack.includes("cocut") || haystack.includes("co-edit") || haystack.includes("co-deliver") || haystack.includes("codeliver")) {
    return { authorityClass: "specialist-app", confidence: "high", intendedRole: "Content Co-op specialist production/review/delivery app.", recommendedAction: "Integrate through project-context launch and rollup adapters; do not rebuild inside Root.", flags };
  }
  if (haystack.includes("pro-se") || haystack.includes("prose.info") || haystack.includes("pro-se.info")) {
    return { authorityClass: "public-site-authority", confidence: "medium", intendedRole: "Separate Pro-Se public/business surface.", recommendedAction: "Keep separate from ACS/CCO while capturing its boundaries in Root canon.", flags };
  }
  if (haystack.includes("field-mobile")) {
    return { authorityClass: "mission-control-module", confidence: "high", intendedRole: "ACS crew field execution app.", recommendedAction: "Treat downstream from ACS Mission Control dispatch and jobs.", flags };
  }
  if (haystack.includes("root-platform") || haystack.includes("/root/") || haystack.includes("root-os") || haystack.includes("mission-control")) {
    return { authorityClass: "root-candidate", confidence: "high", intendedRole: "Root/Mission Control shell or contract donor.", recommendedAction: "Compare against audit evidence before promoting as canonical Root.", flags };
  }
  if (haystack.includes("research")) {
    return { authorityClass: "donor", confidence: "medium", intendedRole: "Research/intelligence support lane.", recommendedAction: "Extract useful pipelines only after core Root workflows are working.", flags };
  }
  return { authorityClass: "donor", confidence: "low", intendedRole: "Unclassified donor candidate.", recommendedAction: "Inspect manually before promotion; keep off the critical path.", flags };
}

function detectRouteHints(files: string[], repoPath: string): string[] {
  return files
    .filter((file) => /(^|\/)(app|pages|routes|src\/pages|src\/app)(\/|$)/.test(path.relative(repoPath, file)))
    .filter((file) => /\.(tsx|ts|jsx|js)$/.test(file))
    .slice(0, 20)
    .map((file) => path.relative(repoPath, file));
}

function detectApiHints(files: string[], repoPath: string): string[] {
  return files
    .filter((file) => /api|server|route\.(ts|js)|functions/.test(path.relative(repoPath, file)))
    .filter((file) => /\.(tsx|ts|jsx|js|mjs|cjs)$/.test(file))
    .slice(0, 20)
    .map((file) => path.relative(repoPath, file));
}

function detectEnvSignals(files: string[], repoPath: string): string[] {
  return files
    .filter((file) => path.basename(file).startsWith(".env") || path.basename(file).includes("env"))
    .slice(0, 12)
    .map((file) => path.relative(repoPath, file));
}

function detectIntegrationSignals(files: string[], packageJson: Record<string, unknown>): string[] {
  const deps = JSON.stringify({
    dependencies: packageJson.dependencies || {},
    devDependencies: packageJson.devDependencies || {},
  }).toLowerCase();
  const textSignals = files.map((file) => path.basename(file).toLowerCase()).join(" ");
  const signals = new Set<string>();
  if (deps.includes("supabase") || textSignals.includes("supabase")) signals.add("Supabase");
  if (deps.includes("stripe") || textSignals.includes("stripe")) signals.add("Stripe");
  if (deps.includes("google") || textSignals.includes("google")) signals.add("Google");
  if (deps.includes("firebase") || textSignals.includes("firebase")) signals.add("Firebase");
  if (deps.includes("twilio") || textSignals.includes("twilio")) signals.add("Twilio");
  if (deps.includes("openai") || deps.includes("genai") || textSignals.includes("ai")) signals.add("AI");
  return [...signals];
}

function auditRepo(repoPath: string): RootEcosystemRepoRecord {
  const files = listFiles(repoPath);
  const packageJsonPath = path.join(repoPath, "package.json");
  const packageJson = safeJson(packageJsonPath);
  const packageName = typeof packageJson.name === "string" ? packageJson.name : null;
  const readme = safeRead(path.join(repoPath, "README.md")).slice(0, 5000);
  const metadata = safeRead(path.join(repoPath, "metadata.json")).slice(0, 5000);
  const classification = classify(repoPath, packageName, `${readme}\n${metadata}`);
  const packageManager = existsSync(path.join(repoPath, "pnpm-lock.yaml"))
    ? "pnpm"
    : existsSync(path.join(repoPath, "yarn.lock"))
      ? "yarn"
      : existsSync(path.join(repoPath, "package-lock.json"))
        ? "npm"
        : null;
  const runtimeSignals = ["server.ts", "server.js", "vite.config.ts", "next.config.js", "firebase.json"]
    .filter((file) => existsSync(path.join(repoPath, file)));

  return {
    id: normalizeId(path.relative(os.homedir(), repoPath) || path.basename(repoPath)),
    name: path.basename(repoPath),
    path: repoPath,
    ...classification,
    packageName,
    framework: detectFramework(packageJson, files),
    packageManager,
    routeHints: detectRouteHints(files, repoPath),
    apiHints: detectApiHints(files, repoPath),
    integrationSignals: detectIntegrationSignals(files, packageJson),
    envSignals: detectEnvSignals(files, repoPath),
    runtimeSignals,
    evidence: [
      packageName ? `package:${packageName}` : "package:missing",
      ...runtimeSignals.map((signal) => `runtime:${signal}`),
      ...detectIntegrationSignals(files, packageJson).map((signal) => `integration:${signal}`),
    ],
  };
}

function buildMarkdown(audit: RootEcosystemAudit, authorityMap: RootAuthorityMap): string {
  const byClass = Object.entries(authorityMap.classes)
    .map(([authorityClass, records]) => {
      const rows = records
        .slice(0, 40)
        .map((record) => `| ${record.name} | ${record.path} | ${record.confidence} | ${record.recommendedAction.replace(/\|/g, "/")} |`)
        .join("\n");
      return `### ${authorityClass}\n\n${rows ? `| Repo | Path | Confidence | Recommended action |\n|---|---|---:|---|\n${rows}` : "No records."}`;
    })
    .join("\n\n");

  return `# Root Ecosystem Repo Audit

Generated: ${audit.generated_at}

## Executive Summary

- Repos found: ${audit.summary.repos_found}
- Canonical candidates: ${audit.summary.canonical_candidates}
- Public authorities: ${audit.summary.public_authorities}
- Specialist apps: ${audit.summary.specialist_apps}
- Parked/discarded: ${audit.summary.parked_or_discarded}
- Unclassified donor candidates: ${audit.summary.unclassified}

Root is the parent operator control plane. Mission Control is the company-specific operating backend/workspace inside Root. Public sites feed Root/Mission Control and must not become admin backends.

## Scanned Roots

${audit.scanned_roots.map((root) => `- ${root}`).join("\n")}

## Repo-By-Repo Findings

${audit.records
  .map(
    (record) => `### ${record.name}

- Intended role: ${record.intendedRole}
- Actual current state: ${record.authorityClass} (${record.confidence})
- Framework: ${record.framework.join(", ") || "unknown"}
- Key routes: ${record.routeHints.slice(0, 8).join(", ") || "not detected"}
- Data connections: ${record.integrationSignals.join(", ") || "not detected"}
- Broken/missing pieces: ${record.flags.join(", ") || "requires manual verification"}
- Recommended action: ${record.recommendedAction}
- Path: ${record.path}`,
  )
  .join("\n\n")}

## Authority Map

${byClass}

## Recommended Build Order

1. Promote one Root shell only after this audit is reviewed against live runtime proof.
2. Keep ACS and Content Co-op public sites as intake authorities.
3. Wire quote and creative-brief handoffs into Root/Mission Control before deeper UI expansion.
4. Keep Co-* apps as specialist launch surfaces with rollup adapters.
5. Keep Hermes/Blaze and Paperclip peripheral until packet/action reliability is proven.
`;
}

const candidates = scanRoots.flatMap((root) => walkCandidates(root));
const records = candidates.map(auditRepo);
const classes = records.reduce((acc, record) => {
  acc[record.authorityClass].push(record);
  return acc;
}, {
  "root-candidate": [],
  "mission-control-module": [],
  "public-site-authority": [],
  "intake-authority": [],
  "brand-authority": [],
  "specialist-app": [],
  "ai-operator-layer": [],
  "infra-support": [],
  donor: [],
  parked: [],
  discard: [],
} as RootAuthorityMap["classes"]);

const audit: RootEcosystemAudit = {
  data_source: "local_audit_artifact",
  generated_at: new Date().toISOString(),
  scanned_roots: scanRoots,
  summary: {
    repos_found: records.length,
    canonical_candidates: records.filter((record) => record.authorityClass === "root-candidate").length,
    public_authorities: records.filter((record) => record.authorityClass === "public-site-authority" || record.authorityClass === "intake-authority").length,
    specialist_apps: records.filter((record) => record.authorityClass === "specialist-app").length,
    parked_or_discarded: records.filter((record) => record.authorityClass === "parked" || record.authorityClass === "discard").length,
    unclassified: records.filter((record) => record.authorityClass === "donor" && record.confidence === "low").length,
  },
  records,
};

const authorityMap: RootAuthorityMap = {
  data_source: "local_audit_artifact",
  generated_at: audit.generated_at,
  canon: {
    root: "Root is the master operator control plane and system brain.",
    missionControl: "Mission Control is the company-specific operating backend/workspace launched inside Root.",
    workspaceRule: "Astro Cleaning Services and Content Co-op use separate scoped workspaces and workflows.",
    publicSiteRule: "Public websites are conversion/intake authorities that feed Root; they are not admin backends.",
  },
  classes,
};

mkdirSync(artifactDir, { recursive: true });
writeFileSync(path.join(artifactDir, "root-ecosystem-repo-index.json"), `${JSON.stringify(audit, null, 2)}\n`);
writeFileSync(path.join(artifactDir, "root-ecosystem-authority-map.json"), `${JSON.stringify(authorityMap, null, 2)}\n`);
writeFileSync(path.join(repoRoot, "root-ecosystem-repo-index.json"), `${JSON.stringify(audit, null, 2)}\n`);
writeFileSync(path.join(repoRoot, "root-ecosystem-authority-map.json"), `${JSON.stringify(authorityMap, null, 2)}\n`);
writeFileSync(path.join(repoRoot, "ROOT_ECOSYSTEM_REPO_AUDIT.md"), buildMarkdown(audit, authorityMap));

console.log(`Root ecosystem audit complete: ${records.length} candidate repos scanned.`);
