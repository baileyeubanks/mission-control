import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, FileSearch, Loader2, Route, ShieldCheck, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRootAuditStatus } from "@/lib/root-audit-client";
import type { InteractionAuditRecord, RootAuditStatus } from "@/lib/root-audit";

function statusTone(status: string) {
  if (status === "wired") return "border-success/20 bg-success/10 text-success";
  if (status === "disabled") return "border-warning/20 bg-warning/10 text-warning";
  if (status === "fake" || status === "missing") return "border-destructive/20 bg-destructive/10 text-destructive";
  return "border-white/10 bg-white/5 text-muted-foreground";
}

function classTone(value: string) {
  if (value === "root-candidate") return "border-primary/20 bg-primary/10 text-primary";
  if (value.includes("authority")) return "border-success/20 bg-success/10 text-success";
  if (value === "parked" || value === "discard") return "border-warning/20 bg-warning/10 text-warning";
  return "border-white/10 bg-white/5 text-muted-foreground";
}

export function Audit() {
  const [audit, setAudit] = useState<RootAuditStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadAudit() {
      setLoading(true);
      setError(null);
      try {
        const payload = await getRootAuditStatus();
        if (mounted) setAudit(payload);
      } catch (loadError) {
        if (mounted) setError(loadError instanceof Error ? loadError.message : "Audit status unavailable.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadAudit();
    return () => {
      mounted = false;
    };
  }, []);

  const topInteractionBreaks = useMemo<InteractionAuditRecord[]>(() => {
    if (!audit) return [];
    return audit.interactions.records
      .filter((record) => (record.priority === "P0" || record.priority === "P1") && record.status !== "wired" && record.status !== "disabled")
      .slice(0, 10);
  }, [audit]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary/60" />
      </div>
    );
  }

  if (error || !audit) {
    return (
      <Card className="glass border-destructive/20">
        <CardContent className="flex items-center gap-3 p-5 text-sm">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          {error || "Audit status not found."}
        </CardContent>
      </Card>
    );
  }

  const ecosystem = audit.ecosystem;
  const interactions = audit.interactions;

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-sm border border-white/5 bg-black/20 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-display tracking-normal">Root Audit</h1>
            <p className="mt-2 max-w-3xl text-xs text-muted-foreground">
              Repo authority, canon lock, and interaction wiring evidence. Refresh with npm run audit:root.
            </p>
          </div>
          <Badge variant="outline" className={`w-fit text-[9px] uppercase ${audit.data_source === "local_audit_artifact" ? "text-success" : "text-warning"}`}>
            {audit.data_source.replace(/_/g, " ")}
          </Badge>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Repos found", value: ecosystem.summary.repos_found, icon: FileSearch },
          { label: "Root candidates", value: ecosystem.summary.canonical_candidates, icon: ShieldCheck },
          { label: "P0 breaks", value: interactions.summary.p0_breaks, icon: AlertTriangle },
          { label: "P1 breaks", value: interactions.summary.p1_breaks, icon: Workflow },
        ].map((item) => (
          <Card key={item.label} className="glass border-white/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{item.label}</CardTitle>
              <item.icon className="h-3.5 w-3.5 text-primary/50" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-mono font-bold">{item.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass border-white/5">
        <CardHeader className="py-4">
          <CardTitle className="text-sm">Canon Lock</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 pt-0 lg:grid-cols-2">
          {[
            ["Root", "Master operator control plane and system brain."],
            ["Mission Control", "Company-specific operating backend/workspace launched inside Root."],
            ["Company scope", "Astro and Content Co-op are separated workspaces with shared infrastructure."],
            ["Public sites", "Conversion/intake authorities that feed Root; not admin backends."],
          ].map(([label, value]) => (
            <div key={label} className="rounded-sm border border-white/5 bg-black/20 p-3">
              <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
              <p className="mt-2 text-sm">{value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="glass border-white/5">
          <CardHeader className="py-4">
            <CardTitle className="text-sm">Repo Authority Sample</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0">
            {ecosystem.records.slice(0, 12).map((record) => (
              <div key={record.id} className="rounded-sm border border-white/5 bg-black/20 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{record.name}</p>
                    <p className="mt-1 truncate text-[10px] text-muted-foreground">{record.path}</p>
                  </div>
                  <Badge variant="outline" className={`shrink-0 text-[8px] uppercase ${classTone(record.authorityClass)}`}>
                    {record.authorityClass.replace(/-/g, " ")}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{record.recommendedAction}</p>
              </div>
            ))}
            {ecosystem.records.length === 0 && (
              <p className="rounded-sm border border-warning/20 bg-warning/10 p-3 text-xs text-warning">
                No repo audit artifact yet. Run npm run audit:repos.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="glass border-white/5">
          <CardHeader className="py-4">
            <CardTitle className="text-sm">Highest Risk Interaction Breaks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0">
            {topInteractionBreaks.map((record) => (
              <div key={record.id} className="rounded-sm border border-white/5 bg-black/20 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-[8px] uppercase text-primary">{record.priority}</Badge>
                  <Badge variant="outline" className={`text-[8px] uppercase ${statusTone(record.status)}`}>{record.status}</Badge>
                  <span className="text-[10px] text-muted-foreground">{record.route}</span>
                </div>
                <p className="mt-2 text-sm">{record.visibleLabel}</p>
                <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Route className="h-3 w-3" />
                  {record.file}:{record.line}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{record.intendedBehavior}</p>
              </div>
            ))}
            {topInteractionBreaks.length === 0 && (
              <p className="rounded-sm border border-success/20 bg-success/10 p-3 text-xs text-success">
                No P0/P1 missing or fake interactions in the latest artifact.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
