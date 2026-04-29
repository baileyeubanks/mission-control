import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Briefcase, CheckCircle2, ExternalLink, Inbox, Loader2, PlugZap, RefreshCcw, Rocket, Server, Workflow } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMissionControlBootstrap } from "@/lib/mission-control-client";
import type { CompanyAccountId, MissionControlBootstrap } from "@/lib/mission-control";
import type { RootQuoteRecord } from "@/lib/root-billing";

const DEFAULT_ACCOUNT_ID: CompanyAccountId = "astro-cleaning-services";
const ACCOUNT_IDS = new Set<CompanyAccountId>(["astro-cleaning-services", "content-co-op"]);

function parseAccountSearch(search: string): CompanyAccountId {
  const accountId = new URLSearchParams(search).get("account");
  return ACCOUNT_IDS.has(accountId as CompanyAccountId) ? (accountId as CompanyAccountId) : DEFAULT_ACCOUNT_ID;
}

function tone(status: string) {
  if (["done", "active", "canonical", "configured", "enabled"].includes(status)) return "text-success";
  if (["blocked", "missing", "missing_config"].includes(status)) return "text-destructive";
  if (["in-progress", "extracting", "extract", "requested", "read-only-next"].includes(status)) return "text-warning";
  return "text-muted-foreground";
}

export function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [bootstrap, setBootstrap] = useState<MissionControlBootstrap | null>(null);
  const [health, setHealth] = useState<{ services: Record<string, string>; probes?: { supabase_latency_ms?: number | null } } | null>(null);
  const [publicQuotes, setPublicQuotes] = useState<RootQuoteRecord[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<CompanyAccountId>(() => parseAccountSearch(location.search));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [payload, healthPayload, quotesPayload] = await Promise.all([
        getMissionControlBootstrap(),
        fetch("/api/health").then((r) => r.json()).catch(() => null),
        fetch("/api/root/quotes?account=content-co-op").then((r) => r.json()).catch(() => null),
      ]);
      setBootstrap(payload);
      setHealth(healthPayload);
      const quotes = Array.isArray(quotesPayload?.data) ? quotesPayload.data as RootQuoteRecord[] : [];
      setPublicQuotes(quotes.filter((q) => q.source === "public_intake"));
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Bootstrap failed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    setSelectedAccount(parseAccountSearch(location.search));
  }, [location.search]);

  const selectAccount = (accountId: CompanyAccountId) => {
    setSelectedAccount(accountId);
    navigate(`/admin?account=${accountId}`);
  };

  const launchModule = (launchPath: string) => {
    navigate(launchPath);
  };

  const account = useMemo(
    () => bootstrap?.accounts.find((item) => item.id === selectedAccount) || bootstrap?.accounts[0] || null,
    [bootstrap, selectedAccount],
  );

  const modules = useMemo(
    () => bootstrap?.modules.filter((item) => item.accountId === null || item.accountId === account?.id) || [],
    [bootstrap, account],
  );
  const tasks = useMemo(
    () => bootstrap?.tasks.filter((item) => item.accountId === null || item.accountId === account?.id) || [],
    [bootstrap, account],
  );
  const approvals = useMemo(
    () => bootstrap?.approvals.filter((item) => item.accountId === null || item.accountId === account?.id) || [],
    [bootstrap, account],
  );
  const valueLoops = useMemo(
    () => bootstrap?.valueLoops?.filter((item) => item.accountId === null || item.accountId === account?.id) || [],
    [bootstrap, account],
  );
  const agentLanes = bootstrap?.agentLanes || [];
  const integrationFlows = bootstrap?.integrationFlows || [];
  const adapterGaps = bootstrap?.adapterGaps || [];

  if (loading && !bootstrap) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary/60" />
      </div>
    );
  }

  if (error || !bootstrap || !account) {
    return (
      <Card className="glass border-destructive/20">
        <CardContent className="flex items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="text-sm">{error || "Mission Control unavailable."}</span>
          </div>
          <Button size="sm" onClick={() => void refresh()}>
            <RefreshCcw className="mr-2 h-3.5 w-3.5" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    { label: "Modules", value: modules.length, icon: Workflow },
    { label: "Open", value: tasks.filter((task) => task.status !== "done").length, icon: AlertTriangle },
    { label: "Approvals", value: approvals.length, icon: CheckCircle2 },
    { label: "Runtimes", value: bootstrap.runtimes.length, icon: Server },
  ];
  const rolloutHistoryCount = bootstrap.rollouts?.length || 1;

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 glass-panel p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display tracking-[0.06em]">Mission Control</h1>
          </div>
          <p className="mt-1 text-xs text-white/40">{account.label}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {bootstrap.accounts.map((item) => (
            <Button
              key={item.id}
              variant={item.id === account.id ? "default" : "outline"}
              size="sm"
              onClick={() => selectAccount(item.id)}
              className={`font-mono text-[10px] uppercase tracking-widest ${item.id === account.id ? "" : "border-white/10 hover:bg-white/[0.04]"}`}
            >
              {item.shortLabel}
            </Button>
          ))}
          <Button variant="ghost" size="icon" onClick={() => void refresh()} title="Refresh" className="hover:bg-white/[0.04]">
            <RefreshCcw className="h-4 w-4 text-white/30" />
          </Button>
        </div>
      </section>

      <Card className="glass border-white/5">
        <CardHeader className="py-4">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm">System Readiness</CardTitle>
            <Badge variant="outline" className={`text-[9px] uppercase ${bootstrap.services.gemini === "configured" ? "text-success" : "text-warning"}`}>
              {bootstrap.services.gemini === "configured" ? "All green" : "Needs config"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2 p-4 pt-0 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(bootstrap.services).map(([name, value]) => {
            const liveValue = health?.services?.[name] ?? value;
            const isReachable = liveValue === "reachable" || liveValue === "enabled";
            const isMissing = liveValue === "missing_config";
            const showLatency = name === "supabase" && health?.probes?.supabase_latency_ms != null;
            return (
              <div key={name} className="flex items-center justify-between glass-panel p-3">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-white/30">{name}</p>
                  <p className={`mt-1 text-[10px] font-mono uppercase tracking-widest ${tone(liveValue)}`}>
                    {String(liveValue).replace(/_/g, " ")}
                    {showLatency && ` · ${health.probes.supabase_latency_ms}ms`}
                  </p>
                </div>
                {isMissing && (
                  <Badge variant="outline" className="text-[8px] uppercase text-destructive border-destructive/30">
                    Needs {name === "gemini" ? "GEMINI_API_KEY" : name === "supabase" ? "SUPABASE_URL + KEY" : name === "twilio" ? "TWILIO_*" : "CONFIG"}
                  </Badge>
                )}
                {isReachable && (
                  <Badge variant="outline" className="text-[8px] uppercase text-success border-success/30">
                    Live
                  </Badge>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="glass border-white/5">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{metric.label}</p>
                <p className="mt-1 text-3xl font-display">{metric.value}</p>
              </div>
              <metric.icon className="h-4 w-4 text-primary" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          { label: "Review intake", path: "/admin/inbox", icon: Inbox, detail: "ACS quotes and CCO briefs" },
          { label: "Open jobs", path: "/admin/jobs", icon: Briefcase, detail: "Crew readiness and candidates" },
          { label: "Check fleet", path: "/admin/runtime", icon: Server, detail: "Local app proof" },
        ].map((action) => (
          <button
            key={action.path}
            type="button"
            onClick={() => navigate(action.path)}
            className="flex items-center justify-between gap-3 glass-panel p-4 text-left transition-colors hover:border-white/10 hover:bg-white/[0.04]"
          >
            <div>
              <p className="text-sm font-medium text-white/80">{action.label}</p>
              <p className="mt-1 text-xs text-white/30">{action.detail}</p>
            </div>
            <action.icon className="h-4 w-4 text-brand-accent-glow" />
          </button>
        ))}
      </div>

      {selectedAccount === "content-co-op" && (
        <Card className="glass border-white/5">
          <CardHeader className="py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Rocket className="h-4 w-4 text-brand-accent-glow" />
                Public Intake
              </CardTitle>
              <Badge variant="outline" className="text-[9px] uppercase text-brand-accent-glow border-brand-accent-glow/30">
                {publicQuotes.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0">
            {publicQuotes.length === 0 ? (
              <div className="glass-panel p-4 text-center">
                <p className="text-xs text-white/30">No public quotes yet.</p>
                <p className="text-[10px] font-mono text-white/20 mt-1">Share /quote to start receiving intake.</p>
              </div>
            ) : (
              publicQuotes.slice(0, 5).map((quote) => (
                <button
                  key={quote.id}
                  type="button"
                  onClick={() => navigate("/admin/quotes")}
                  className="w-full flex items-center justify-between gap-3 glass-panel p-3 text-left transition-colors hover:border-white/10 hover:bg-white/[0.04]"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white/80 truncate">{quote.title}</p>
                    <p className="text-[10px] font-mono text-white/30 mt-0.5">{quote.client.name} · {quote.documentNumber}</p>
                  </div>
                  <Badge variant="outline" className={`shrink-0 text-[8px] uppercase ${tone(quote.status)}`}>
                    {quote.status.replace(/_/g, " ")}
                  </Badge>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {valueLoops.length > 0 && (
        <Card className="glass border-white/5">
          <CardHeader className="py-4">
            <CardTitle className="text-sm">Value Loops</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 p-4 pt-0 md:grid-cols-2 xl:grid-cols-4">
            {valueLoops.map((loop) => (
              <button
                key={loop.id}
                type="button"
                onClick={() => navigate(loop.route)}
                className="rounded-sm border border-white/5 bg-black/20 p-3 text-left transition-colors hover:border-primary/30 hover:bg-white/5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{loop.title}</p>
                    <p className="mt-1 text-[10px] uppercase text-muted-foreground">{loop.metric}</p>
                  </div>
                  <Badge variant="outline" className={`shrink-0 text-[8px] uppercase ${tone(loop.status)}`}>
                    {loop.status}
                  </Badge>
                </div>
                <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{loop.nextAction}</p>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {agentLanes.length > 0 && (
        <Card className="glass border-white/5">
          <CardHeader className="py-4">
            <CardTitle className="text-sm">Agent Lanes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 p-4 pt-0 md:grid-cols-2 xl:grid-cols-4">
            {agentLanes.map((lane) => (
              <button
                key={lane.id}
                type="button"
                onClick={() => navigate(lane.route)}
                className="rounded-sm border border-white/5 bg-black/20 p-3 text-left transition-colors hover:border-primary/30 hover:bg-white/5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{lane.title}</p>
                    <p className="mt-1 line-clamp-1 text-[10px] uppercase text-muted-foreground">{lane.authority}</p>
                  </div>
                  <Badge variant="outline" className={`shrink-0 text-[8px] uppercase ${tone(lane.status)}`}>
                    {lane.status}
                  </Badge>
                </div>
                <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{lane.guardrail}</p>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {integrationFlows.length > 0 && (
        <Card className="glass border-white/5">
          <CardHeader className="py-4">
            <CardTitle className="text-sm">Integration Flows</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 p-4 pt-0 md:grid-cols-2">
            {integrationFlows.slice(0, 4).map((flow) => (
              <button
                key={flow.id}
                type="button"
                onClick={() => navigate(flow.route)}
                className="rounded-sm border border-white/5 bg-black/20 p-3 text-left transition-colors hover:border-primary/30 hover:bg-white/5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{flow.title}</p>
                    <p className="mt-1 line-clamp-1 text-[10px] uppercase text-muted-foreground">{flow.sourceSurface}</p>
                  </div>
                  <Badge variant="outline" className={`shrink-0 text-[8px] uppercase ${tone(flow.status)}`}>
                    {flow.status}
                  </Badge>
                </div>
                <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{flow.nextAction}</p>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {adapterGaps.length > 0 && (
        <Card className="glass border-white/5">
          <CardHeader className="py-4">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm">Adapter Gaps</CardTitle>
              <PlugZap className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="grid gap-2 p-4 pt-0 md:grid-cols-2 xl:grid-cols-3">
            {adapterGaps.slice(0, 6).map((gap) => (
              <button
                key={gap.id}
                type="button"
                onClick={() => navigate(gap.affectedRoutes[0] || "/admin")}
                className="rounded-sm border border-white/5 bg-black/20 p-3 text-left transition-colors hover:border-primary/30 hover:bg-white/5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{gap.title}</p>
                    <p className="mt-1 text-[10px] uppercase text-muted-foreground">{gap.affectedRoutes.slice(0, 2).join(" / ")}</p>
                  </div>
                  <Badge variant="outline" className={`shrink-0 text-[8px] uppercase ${tone(gap.status)}`}>
                    {gap.status.replace(/-/g, " ")}
                  </Badge>
                </div>
                <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{gap.nextAction}</p>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {bootstrap.rollout && (
        <Card className="glass border-white/5">
          <CardHeader className="py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="mb-1 text-[10px] uppercase text-muted-foreground">Active plan</p>
                <CardTitle className="text-sm">{bootstrap.rollout.title}</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">{bootstrap.rollout.centerOfGravity}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={`w-fit text-[9px] uppercase ${tone(bootstrap.rollout.status)}`}>
                  {bootstrap.rollout.status}
                </Badge>
                <Badge variant="outline" className="w-fit text-[9px] uppercase text-muted-foreground">
                  {rolloutHistoryCount} plans
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 p-4 pt-0 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="grid gap-2 sm:grid-cols-2">
              {bootstrap.rollout.workPackets.slice(0, 4).map((packet) => (
                <div key={packet.id} className="rounded-sm border border-white/5 bg-black/20 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{packet.title}</p>
                    <Badge variant="outline" className={`shrink-0 text-[8px] uppercase ${tone(packet.status)}`}>
                      {packet.status}
                    </Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{packet.nextAction}</p>
                </div>
              ))}
            </div>
            <div className="rounded-sm border border-white/5 bg-black/20 p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Parked signal</p>
              {bootstrap.rollout.signals.slice(0, 1).map((signal) => (
                <div key={signal.id} className="mt-2">
                  <a
                    href={signal.source}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    {signal.label}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <p className="mt-2 text-xs text-muted-foreground">{signal.whenToUse}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
        <Card className="glass border-white/5">
          <CardHeader className="py-4">
            <CardTitle className="text-sm">Modules</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 p-4 pt-0 md:grid-cols-2">
            {modules.map((module) => (
              <div key={module.id} className="flex items-center justify-between gap-3 rounded-sm border border-white/5 bg-black/20 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{module.label}</p>
                <p className={`text-[10px] uppercase ${tone(module.status)}`}>{module.status.replace(/-/g, " ")}</p>
              </div>
                <Button variant="ghost" size="icon" onClick={() => launchModule(module.launchPath)} title={`Open ${module.label}`}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass border-white/5">
          <CardHeader className="py-4">
            <CardTitle className="text-sm">Work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-3 rounded-sm border border-white/5 bg-black/20 p-3">
                <p className="truncate text-sm">{task.title}</p>
                <Badge variant="outline" className={`shrink-0 text-[9px] uppercase ${tone(task.status)}`}>
                  {task.status.replace(/-/g, " ")}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>


    </div>
  );
}
