import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type {
  InteractionWiringAudit,
  RootAuditStatus,
  RootAuthorityMap,
  RootEcosystemAudit,
  RootRepoAuthorityClass,
} from "../lib/root-audit";

const AUDIT_DIR = path.resolve(process.cwd(), ".mission-control-audit");
const ECOSYSTEM_FILE = path.join(AUDIT_DIR, "root-ecosystem-repo-index.json");
const AUTHORITY_FILE = path.join(AUDIT_DIR, "root-ecosystem-authority-map.json");
const INTERACTION_FILE = path.join(AUDIT_DIR, "interaction-wiring-inventory.json");

const EMPTY_CLASSES: Record<RootRepoAuthorityClass, []> = {
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
};

function readJson<T>(filePath: string): T | null {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as T;
  } catch (error) {
    console.error(`Failed to read audit artifact ${filePath}:`, error);
    return null;
  }
}

function missingEcosystemAudit(): RootEcosystemAudit {
  return {
    data_source: "missing_artifact",
    generated_at: new Date().toISOString(),
    scanned_roots: [],
    summary: {
      repos_found: 0,
      canonical_candidates: 0,
      public_authorities: 0,
      specialist_apps: 0,
      parked_or_discarded: 0,
      unclassified: 0,
    },
    records: [],
  };
}

function missingInteractionAudit(): InteractionWiringAudit {
  return {
    data_source: "missing_artifact",
    generated_at: new Date().toISOString(),
    summary: {
      total_interactive_elements: 0,
      dead_buttons: 0,
      fake_submit_handlers: 0,
      mock_only_screens: 0,
      missing_api_routes: 0,
      missing_database_writes: 0,
      broken_navigation_links: 0,
      forms_without_validation: 0,
      forms_without_persistence: 0,
      p0_breaks: 0,
      p1_breaks: 0,
    },
    records: [],
  };
}

export function getRootEcosystemAudit(): RootEcosystemAudit {
  return readJson<RootEcosystemAudit>(ECOSYSTEM_FILE) || missingEcosystemAudit();
}

export function getRootAuthorityMap(): RootAuthorityMap {
  return (
    readJson<RootAuthorityMap>(AUTHORITY_FILE) || {
      data_source: "missing_artifact",
      generated_at: new Date().toISOString(),
      canon: {
        root: "Root is the parent operator control plane; run scripts/audit-root-ecosystem.ts to refresh evidence.",
        missionControl: "Mission Control is the company-specific backend/workspace inside Root.",
        workspaceRule: "Astro and Content Co-op remain separate company workspaces with shared infrastructure.",
        publicSiteRule: "Public sites feed Root/Mission Control; they are not admin backends.",
      },
      classes: EMPTY_CLASSES,
    }
  );
}

export function getInteractionWiringAudit(): InteractionWiringAudit {
  return readJson<InteractionWiringAudit>(INTERACTION_FILE) || missingInteractionAudit();
}

export function getRootAuditStatus(): RootAuditStatus {
  const ecosystem = getRootEcosystemAudit();
  const interactions = getInteractionWiringAudit();
  return {
    data_source: ecosystem.data_source === "local_audit_artifact" || interactions.data_source === "local_audit_artifact"
      ? "local_audit_artifact"
      : "missing_artifact",
    generated_at: new Date().toISOString(),
    ecosystem,
    interactions,
  };
}
