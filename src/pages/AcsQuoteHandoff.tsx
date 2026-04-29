import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardList, Database, FileText, RefreshCcw, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  AcsQuoteHandoffV1Contract,
  AcsQuoteHandoffV1Record,
  AstroAdminQuoteCreateBodyPreview,
} from "@/lib/acs-quote-handoff-contract";
import { getAcsQuoteHandoffV1 } from "@/lib/mission-control-client";

type GateStatus = "ready" | "partial" | "blocked";
type ProbeStatus = "present" | "missing";

interface HandoffProbe {
  label: string;
  path: string;
  status: ProbeStatus;
  role: "source" | "target" | "donor" | "shell";
}

interface HandoffGate {
  id: string;
  label: string;
  status: GateStatus;
  authority: string;
  evidence: HandoffProbe[];
  nextAction: string;
}

interface AcsQuoteHandoffPayload {
  status: string;
  generated_at: string;
  v1_decision: string;
  target_runtime: string;
  target_admin_repo: string;
  migration_source: string;
  donor_repos: string[];
  firebase_boundary: string;
  summary: {
    gates_total: number;
    gates_ready: number;
    gates_partial: number;
    gates_blocked: number;
    missing_count: number;
  };
  gates: HandoffGate[];
  contract: AcsQuoteHandoffV1Contract;
  adapter_proof: {
    status: string;
    source_contract: string;
    normalizer: string;
    output_schema: string;
    output_id: string;
  };
  sample_handoff: AcsQuoteHandoffV1Record;
  target_write_preview: {
    status: string;
    target_route: string;
    body: AstroAdminQuoteCreateBodyPreview;
  };
  implementation_order: string[];
  mutation_policy: string[];
  next_safe_action: string;
}

function isAcsQuoteHandoffPayload(value: unknown): value is AcsQuoteHandoffPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<AcsQuoteHandoffPayload>;
  return typeof payload.v1_decision === "string" && Array.isArray(payload.gates) && payload.contract?.schema === "acs.quote-handoff.v1";
}

function tone(status: GateStatus | ProbeStatus | string) {
  if (status === "ready" || status === "present") return "border-success/20 bg-success/10 text-success";
  if (status === "partial") return "border-warning/20 bg-warning/10 text-warning";
  return "border-destructive/20 bg-destructive/10 text-destructive";
}

function roleTone(role: HandoffProbe["role"]) {
  if (role === "source") return "border-primary/20 bg-primary/10 text-primary";
  if (role === "target") return "border-success/20 bg-success/10 text-success";
  if (role === "shell") return "border-warning/20 bg-warning/10 text-warning";
  return "border-white/10 bg-white/5 text-muted-foreground";
}

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function AcsQuoteHandoff() {
  const [payload, setPayload] = useState<AcsQuoteHandoffPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await getAcsQuoteHandoffV1();
      setPayload(isAcsQuoteHandoffPayload(data) ? data : null);
    } catch (error) {
      console.error("ACS quote handoff fetch error:", error);
      setPayload(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div className="min-w-0 space-y-5 overflow-hidden">
      <section className="flex min-w-0 flex-col gap-3 rounded-sm border border-white/5 bg-black/20 p-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h1 className="text-2xl font-display">ACS quote handoff v1</h1>
          </div>
          <p className="mt-2 max-w-4xl text-xs text-muted-foreground">
            Public quote intake to admin operator backend, with AI Studio and Firebase exports treated as donor evidence until promoted.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refresh()} className="w-fit font-mono text-[10px] uppercase">
          <RefreshCcw className={`mr-2 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </section>

      {!payload ? (
        <Card className="glass border-white/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-warning">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-sm font-medium">ACS quote handoff contract unavailable</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Metric label="Gates" value={String(payload.summary.gates_total)} />
            <Metric label="Ready" value={String(payload.summary.gates_ready)} status="ready" />
            <Metric label="Partial" value={String(payload.summary.gates_partial)} status="partial" />
            <Metric label="Blocked" value={String(payload.summary.gates_blocked)} status="blocked" />
            <Metric label="Missing" value={String(payload.summary.missing_count)} status={payload.summary.missing_count > 0 ? "blocked" : "ready"} />
          </div>

          <Card className="min-w-0 border-white/5 glass">
            <CardContent className="grid gap-4 p-5 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="min-w-0">
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">V1 decision</p>
                <p className="mt-2 break-words text-sm leading-6">{payload.v1_decision}</p>
                <p className="mt-4 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Next safe action</p>
                <p className="mt-2 break-words text-sm">{payload.next_safe_action}</p>
              </div>
              <div className="min-w-0 rounded-sm border border-white/5 bg-black/20 p-4">
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Storage boundary</p>
                <p className="mt-2 break-words text-xs text-muted-foreground">{payload.firebase_boundary}</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 xl:grid-cols-[0.9fr_1.1fr]">
            <ContractCard contract={payload.contract} adapterProof={payload.adapter_proof} />
            <SampleHandoffCard handoff={payload.sample_handoff} targetPreview={payload.target_write_preview} />
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            {payload.gates.map((gate) => (
              <Card key={gate.id} className="min-w-0 border-white/5 glass">
                <CardHeader className="flex flex-row items-start justify-between gap-3 py-4">
                  <div>
                    <CardTitle className="text-sm">{gate.label}</CardTitle>
                    <p className="mt-1 break-words text-xs text-muted-foreground">{gate.authority}</p>
                  </div>
                  <Badge variant="outline" className={`shrink-0 text-[10px] uppercase ${tone(gate.status)}`}>
                    {gate.status}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3 p-4 pt-0">
                  <div className="rounded-sm border border-white/5 bg-black/20 p-3">
                    <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                      <ArrowRight className="h-3 w-3" />
                      Next
                    </div>
                    <p className="mt-2 break-words text-xs">{gate.nextAction}</p>
                  </div>
                  <div className="grid gap-2">
                    {gate.evidence.map((item) => (
                      <div key={item.path} className="flex items-start justify-between gap-3 rounded-sm border border-white/5 bg-black/20 p-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-medium">{item.label}</p>
                            <Badge variant="outline" className={`text-[8px] uppercase ${roleTone(item.role)}`}>
                              {item.role}
                            </Badge>
                          </div>
                          <p className="mt-1 truncate text-[10px] font-mono text-muted-foreground">{item.path}</p>
                        </div>
                        <Badge variant="outline" className={`shrink-0 text-[8px] uppercase ${tone(item.status)}`}>
                          {item.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            <ListCard icon={<ShieldCheck className="h-4 w-4" />} title="Implementation order" items={payload.implementation_order} />
            <ListCard icon={<AlertTriangle className="h-4 w-4" />} title="Mutation policy" items={payload.mutation_policy} />
          </div>
        </>
      )}
    </div>
  );
}

function ContractCard({
  contract,
  adapterProof,
}: {
  contract: AcsQuoteHandoffV1Contract;
  adapterProof: AcsQuoteHandoffPayload["adapter_proof"];
}) {
  return (
    <Card className="min-w-0 border-white/5 glass">
      <CardHeader className="py-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ClipboardList className="h-4 w-4 text-primary" />
          Frozen payload contract
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0">
        <div className="grid gap-2 sm:grid-cols-2">
          <MiniFact label="Schema" value={contract.schema} />
          <MiniFact label="Status" value={contract.status} toneClass="text-success" />
          <MiniFact label="Canonical write" value={contract.canonicalWritePath} />
          <MiniFact label="Firebase" value={contract.firebaseRole} toneClass="text-warning" />
        </div>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Read-only adapter proof</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <MiniFact label="Source contract" value={adapterProof.source_contract} />
            <MiniFact label="Normalizer" value={adapterProof.normalizer} toneClass="text-success" />
          </div>
        </div>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Required fields</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {contract.requiredFields.map((field) => (
              <Badge key={field} variant="outline" className="border-white/10 bg-black/20 text-[9px] text-muted-foreground">
                {field}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Blocked until approval</p>
          <div className="mt-2 grid gap-2">
            {contract.blockedUntilApproved.map((action) => (
              <div key={action} className="flex items-center gap-2 rounded-sm border border-destructive/10 bg-destructive/5 p-2 text-xs text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                {action}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SampleHandoffCard({
  handoff,
  targetPreview,
}: {
  handoff: AcsQuoteHandoffV1Record;
  targetPreview: AcsQuoteHandoffPayload["target_write_preview"];
}) {
  return (
    <Card className="min-w-0 border-white/5 glass">
      <CardHeader className="py-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Database className="h-4 w-4 text-primary" />
          Local normalized handoff
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0">
        <div className="grid gap-2 md:grid-cols-3">
          <MiniFact label="Record" value={handoff.id} />
          <MiniFact label="Review" value={handoff.adminReview.status} toneClass="text-success" />
          <MiniFact label="Total" value={formatCents(handoff.estimate.totalCents)} toneClass="text-success" />
        </div>
        <div className="rounded-sm border border-white/5 bg-black/20 p-3">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Source to target</p>
          <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
            <p>
              <span className="text-foreground">Source:</span> {handoff.source.system} / {handoff.source.sourceEntityId}
            </p>
            <p>
              <span className="text-foreground">Target:</span> {handoff.backendTargets.astroAdminRoute}
            </p>
            <p>
              <span className="text-foreground">Canonical table:</span> {handoff.backendTargets.supabaseCanonicalTable}
            </p>
            <p>
              <span className="text-foreground">Firebase mirror:</span> {handoff.backendTargets.firebaseMirrorCollection}
            </p>
          </div>
        </div>
        <div className="grid gap-2">
          {handoff.estimate.lineItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-sm border border-white/5 bg-black/20 p-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{item.label}</p>
                <p className="text-[10px] font-mono uppercase text-muted-foreground">{item.source}</p>
              </div>
              <Badge variant="outline" className="border-success/20 bg-success/10 text-[10px] text-success">
                {formatCents(item.totalCents)}
              </Badge>
            </div>
          ))}
        </div>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Allowed admin actions</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {handoff.adminReview.allowedActions.map((action) => (
              <Badge key={action} variant="outline" className="border-success/20 bg-success/10 text-[9px] text-success">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                {action}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Astro admin write preview</p>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <MiniFact label="Status" value={targetPreview.status} toneClass="text-warning" />
            <MiniFact label="Route" value={targetPreview.target_route} />
            <MiniFact label="Items" value={String(targetPreview.body.items.length)} />
            <MiniFact label="Service type" value={targetPreview.body.service_type} />
            <MiniFact label="Estimated total" value={formatCents(Math.round(targetPreview.body.estimated_total * 100))} toneClass="text-success" />
            <MiniFact label="Payload source" value={targetPreview.body.payload.source} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniFact({ label, value, toneClass = "text-foreground" }: { label: string; value: string; toneClass?: string }) {
  return (
    <div className="min-w-0 rounded-sm border border-white/5 bg-black/20 p-3">
      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-1 truncate text-xs font-medium ${toneClass}`}>{value}</p>
    </div>
  );
}

function Metric({ label, value, status = "partial" }: { label: string; value: string; status?: GateStatus }) {
  return (
    <Card className="min-w-0 border-white/5 glass">
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-display">{value}</p>
        </div>
        <span className={`h-2.5 w-2.5 rounded-full ${status === "ready" ? "bg-success" : status === "partial" ? "bg-warning" : "bg-destructive"}`} />
      </CardContent>
    </Card>
  );
}

function ListCard({ icon, title, items }: { icon: ReactNode; title: string; items: string[] }) {
  return (
    <Card className="min-w-0 border-white/5 glass">
      <CardHeader className="py-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 p-4 pt-0">
        {items.map((item) => (
          <div key={item} className="rounded-sm border border-white/5 bg-black/20 p-3 text-xs text-muted-foreground">
            {item}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
