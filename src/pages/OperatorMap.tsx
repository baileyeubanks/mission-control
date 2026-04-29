import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Map, RefreshCcw, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMissionControlOperatorRegistry } from "@/lib/mission-control-client";

type LaneStatus = "healthy" | "degraded" | "broken" | "unknown";

interface OperatorLane {
  id: string;
  label: string;
  kind: string;
  status: LaneStatus;
  authority_status: string;
  runtime_host: string;
  data_authority: string;
  agent_owner: string;
  canonical_repo: string | null;
  reasons: string[];
  allowed_actions: string[];
  forbidden_actions: string[];
  recovery_actions: string[];
  next_safe_action: string;
}

interface OperatorReport {
  generated_at: string;
  mode: string;
  no_network: boolean;
  summary: {
    healthy: number;
    degraded: number;
    broken: number;
    unknown: number;
    total: number;
    text: string;
  };
  lanes: OperatorLane[];
}

interface OperatorRegistryPayload {
  report_status: "available" | "missing";
  report_path: string;
  registry_path: string;
  report: OperatorReport | null;
  registry_version: number | null;
  registry_lane_count: number;
}

function isOperatorRegistryPayload(value: unknown): value is OperatorRegistryPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<OperatorRegistryPayload>;
  return typeof payload.report_status === "string" && typeof payload.report_path === "string";
}

function tone(status: LaneStatus | string) {
  if (status === "healthy") return "border-success/20 bg-success/10 text-success";
  if (status === "degraded") return "border-warning/20 bg-warning/10 text-warning";
  if (status === "broken") return "border-destructive/20 bg-destructive/10 text-destructive";
  return "border-white/10 bg-white/5 text-muted-foreground";
}

function humanLabel(value: string | null | undefined, fallback = "Not set") {
  if (!value) return fallback;
  return value
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function OperatorMap() {
  const [payload, setPayload] = useState<OperatorRegistryPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await getMissionControlOperatorRegistry();
      setPayload(isOperatorRegistryPayload(data) ? data : null);
    } catch (error) {
      console.error("Operator registry fetch error:", error);
      setPayload(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const report = payload?.report || null;
  const lanes = report?.lanes || [];
  const priorityLanes = useMemo(
    () => lanes.filter((lane) => lane.status === "broken" || lane.status === "degraded").slice(0, 5),
    [lanes],
  );

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-3 rounded-sm border border-white/5 bg-black/20 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Map className="h-4 w-4 text-primary" />
            <h1 className="text-2xl font-display">Operator map</h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Read-only authority, health, and next-action map from the platform operator registry.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refresh()} className="w-fit font-mono text-[10px] uppercase">
          <RefreshCcw className={`mr-2 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </section>

      {!report ? (
        <Card className="glass border-white/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-warning">
              <ShieldAlert className="h-4 w-4" />
              <p className="text-sm font-medium">Operator report unavailable</p>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Run <span className="font-mono">npm run operator:registry</span> in <span className="font-mono">/Users/baileyeubanks/Desktop/Projects/platform</span>.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-5">
            {[
              { label: "Total", value: report.summary.total, status: "unknown" },
              { label: "Healthy", value: report.summary.healthy, status: "healthy" },
              { label: "Degraded", value: report.summary.degraded, status: "degraded" },
              { label: "Broken", value: report.summary.broken, status: "broken" },
              { label: "Unknown", value: report.summary.unknown, status: "unknown" },
            ].map((item) => (
              <Card key={item.label} className="glass border-white/5">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{item.label}</p>
                    <p className="mt-1 text-3xl font-display">{item.value}</p>
                  </div>
                  <span className={`h-2.5 w-2.5 rounded-full ${tone(item.status).split(" ").find((part) => part.startsWith("bg-")) || "bg-white/20"}`} />
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="glass border-white/5">
            <CardHeader className="py-4">
              <CardTitle className="text-sm">Priority lanes</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 p-4 pt-0">
              {priorityLanes.length === 0 ? (
                <div className="flex items-center gap-2 rounded-sm border border-success/20 bg-success/10 p-3 text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  <p className="text-sm">No degraded or broken lanes in the latest report.</p>
                </div>
              ) : (
                priorityLanes.map((lane) => (
                  <div key={lane.id} className="grid gap-3 rounded-sm border border-white/5 bg-black/20 p-3 lg:grid-cols-[180px_120px_1fr] lg:items-start">
                    <div>
                      <p className="text-sm font-medium">{lane.label}</p>
                      <p className="mt-1 text-[10px] font-mono uppercase text-muted-foreground">{lane.kind}</p>
                    </div>
                    <Badge variant="outline" className={`w-fit text-[10px] ${tone(lane.status)}`}>
                      {humanLabel(lane.status)}
                    </Badge>
                    <div>
                      <p className="text-xs text-muted-foreground">{lane.reasons[0] || "No blocker recorded."}</p>
                      <p className="mt-2 text-xs">{lane.next_safe_action}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="glass border-white/5">
            <CardHeader className="py-4">
              <CardTitle className="text-sm">All lanes</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-4 pt-0">
              {lanes.map((lane) => (
                <div key={lane.id} className="rounded-sm border border-white/5 bg-black/20 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{lane.label}</p>
                        <Badge variant="outline" className={`text-[10px] ${tone(lane.status)}`}>
                          {humanLabel(lane.status)}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{lane.authority_status}</p>
                    </div>
                    <p className="shrink-0 text-xs font-mono text-muted-foreground">{lane.runtime_host}</p>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-3">
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Authority</p>
                      <p className="mt-1 text-xs">{lane.data_authority}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Agent owner</p>
                      <p className="mt-1 text-xs">{lane.agent_owner}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Repo</p>
                      <p className="mt-1 truncate text-xs font-mono">{lane.canonical_repo || "not configured"}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-sm border border-white/5 bg-black/20 p-3">
                    <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                      <AlertTriangle className="h-3 w-3" />
                      Reasons
                    </div>
                    <ul className="mt-2 grid gap-1">
                      {(lane.reasons.length > 0 ? lane.reasons : ["No reasons recorded."]).map((reason) => (
                        <li key={reason} className="text-xs text-muted-foreground">{reason}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-3">
                    <ActionList title="Allowed" items={lane.allowed_actions} />
                    <ActionList title="Forbidden" items={lane.forbidden_actions} />
                    <ActionList title="Recovery" items={lane.recovery_actions} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="rounded-sm border border-white/5 bg-black/20 p-3 text-[11px] text-muted-foreground">
            Latest report: <span className="font-mono">{payload?.report_path}</span>. Generated{" "}
            <span className="font-mono">{report.generated_at}</span>. Network probes:{" "}
            <span className="font-mono">{report.no_network ? "skipped" : "enabled"}</span>.
          </div>
        </>
      )}
    </div>
  );
}

function ActionList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-sm border border-white/5 bg-black/20 p-3">
      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{title}</p>
      <ul className="mt-2 grid gap-1">
        {(items.length > 0 ? items : ["None recorded."]).slice(0, 5).map((item) => (
          <li key={item} className="text-[11px] text-muted-foreground">{item}</li>
        ))}
      </ul>
    </div>
  );
}
