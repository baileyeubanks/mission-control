export type RootRepoAuthorityClass =
  | "root-candidate"
  | "mission-control-module"
  | "public-site-authority"
  | "intake-authority"
  | "brand-authority"
  | "specialist-app"
  | "ai-operator-layer"
  | "infra-support"
  | "donor"
  | "parked"
  | "discard";

export type InteractionPriority = "P0" | "P1" | "P2" | "P3";

export type InteractionStatus = "wired" | "disabled" | "missing" | "fake" | "removed";

export interface RootEcosystemRepoRecord {
  id: string;
  name: string;
  path: string;
  authorityClass: RootRepoAuthorityClass;
  confidence: "high" | "medium" | "low";
  intendedRole: string;
  recommendedAction: string;
  packageName: string | null;
  framework: string[];
  packageManager: string | null;
  routeHints: string[];
  apiHints: string[];
  integrationSignals: string[];
  envSignals: string[];
  runtimeSignals: string[];
  flags: string[];
  evidence: string[];
}

export interface RootEcosystemAudit {
  data_source: "local_audit_artifact" | "missing_artifact";
  generated_at: string;
  scanned_roots: string[];
  summary: {
    repos_found: number;
    canonical_candidates: number;
    public_authorities: number;
    specialist_apps: number;
    parked_or_discarded: number;
    unclassified: number;
  };
  records: RootEcosystemRepoRecord[];
}

export interface RootAuthorityMap {
  data_source: "local_audit_artifact" | "missing_artifact";
  generated_at: string;
  canon: {
    root: string;
    missionControl: string;
    workspaceRule: string;
    publicSiteRule: string;
  };
  classes: Record<RootRepoAuthorityClass, RootEcosystemRepoRecord[]>;
}

export interface InteractionAuditRecord {
  id: string;
  file: string;
  route: string;
  component: string;
  visibleLabel: string;
  interactionType: string;
  currentBehavior: string;
  intendedBehavior: string;
  backendNeeded: string;
  dataModelNeeded: string;
  priority: InteractionPriority;
  status: InteractionStatus;
  line: number;
  evidence: string;
}

export interface InteractionWiringAudit {
  data_source: "local_audit_artifact" | "missing_artifact";
  generated_at: string;
  summary: {
    total_interactive_elements: number;
    dead_buttons: number;
    fake_submit_handlers: number;
    mock_only_screens: number;
    missing_api_routes: number;
    missing_database_writes: number;
    broken_navigation_links: number;
    forms_without_validation: number;
    forms_without_persistence: number;
    p0_breaks: number;
    p1_breaks: number;
  };
  records: InteractionAuditRecord[];
}

export interface RootAuditStatus {
  data_source: "local_audit_artifact" | "missing_artifact";
  generated_at: string;
  ecosystem: RootEcosystemAudit;
  interactions: InteractionWiringAudit;
}
