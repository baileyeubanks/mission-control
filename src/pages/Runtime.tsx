import { useEffect, useState } from "react";
import { CheckCircle2, RefreshCcw, Server, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listPackets } from "@/lib/packet-client";
import { getMissionControlRuntimeProof, getMissionControlRuntimes } from "@/lib/mission-control-client";
import { type RuntimeProofRecord, type RuntimeSurface } from "@/lib/mission-control";
import { type Packet } from "@/lib/packets";

interface HealthPayload {
  status: "ok";
  services: {
    supabase: string;
    twilio: string;
    gemini: string;
    packets: string;
  };
}

function tone(status: string) {
  if (["canonical", "preserve", "enabled", "configured", "succeeded", "health_ok", "boots", "builds", "installs", "passed"].includes(status)) return "text-success border-success/20 bg-success/10";
  if (["extract", "queued", "running", "missing_config", "not_checked", "skipped"].includes(status)) return "text-warning border-warning/20 bg-warning/10";
  if (["blocked", "failed", "missing"].includes(status)) return "text-destructive border-destructive/20 bg-destructive/10";
  return "text-muted-foreground border-white/10 bg-white/5";
}

function humanLabel(value: string | null | undefined, fallback = "Not set") {
  if (!value) return fallback;
  return value
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function Runtime() {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [runtimes, setRuntimes] = useState<RuntimeSurface[]>([]);
  const [proof, setProof] = useState<RuntimeProofRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshRuntime = async () => {
    setLoading(true);
    try {
      const [healthResponse, packetData, runtimeData, proofData] = await Promise.all([
        fetch("/api/health"),
        listPackets({ limit: 8 }),
        getMissionControlRuntimes(),
        getMissionControlRuntimeProof(),
      ]);

      const payload = (await healthResponse.json()) as HealthPayload;
      setHealth(payload?.services ? payload : null);
      setPackets(packetData);
      setRuntimes(runtimeData);
      setProof(proofData.records);
    } catch (error) {
      console.error("Runtime refresh error:", error);
      setHealth(null);
      setPackets([]);
      setRuntimes([]);
      setProof([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshRuntime();
  }, []);

  const packetCounts = packets.reduce<Record<string, number>>((acc, packet) => {
    acc[packet.status] = (acc[packet.status] || 0) + 1;
    return acc;
  }, {});
  const proofCounts = proof.reduce<Record<string, number>>((acc, record) => {
    acc[record.proofStatus] = (acc[record.proofStatus] || 0) + 1;
    return acc;
  }, {});
  const proofByRuntime = new Map(proof.map((record) => [record.runtimeId, record]));
  const blockedProof = proof.filter((record) => record.proofStatus === "blocked" || record.blocker);

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-3 rounded-sm border border-white/5 bg-black/20 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-primary" />
            <h1 className="text-2xl font-display">Runtime proof</h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Local runtime evidence and blockers</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refreshRuntime()} className="w-fit font-mono text-[10px] uppercase">
          <RefreshCcw className={`mr-2 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </section>

      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: "Runtimes", value: runtimes.length, icon: Server },
          { label: "Packets", value: packets.length, icon: Workflow },
          { label: "Healthy", value: proofCounts.health_ok || 0, icon: CheckCircle2 },
          { label: "Blocked", value: blockedProof.length || packetCounts.failed || 0, icon: RefreshCcw },
        ].map((item) => (
          <Card key={item.label} className="glass border-white/5">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-3xl font-display">{item.value}</p>
              </div>
              <item.icon className="h-4 w-4 text-primary" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass border-white/5">
        <CardHeader className="py-4">
          <CardTitle className="text-sm">Fleet</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 p-4 pt-0">
          {runtimes.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">No runtime records found.</p>
          ) : (
            runtimes.map((runtime) => {
              const runtimeProof = proofByRuntime.get(runtime.id);
              const status = runtimeProof?.proofStatus || runtime.status;

              return (
                <div key={runtime.id} className="grid gap-3 rounded-sm border border-white/5 bg-black/20 p-3 md:grid-cols-[1fr_auto_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{runtime.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{runtimeProof?.blocker || runtime.path}</p>
                  </div>
                  <Badge variant="outline" className={`w-fit text-[10px] ${tone(status)}`}>
                    {humanLabel(status)}
                  </Badge>
                  <span className="text-right text-xs font-mono text-muted-foreground">{runtime.port ? `:${runtime.port}` : "Parked"}</span>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card className="glass border-white/5">
        <CardHeader className="py-4">
          <CardTitle className="text-sm">Local proof</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 pt-0 md:grid-cols-2">
          {proof.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground md:col-span-2">No local proof has been captured yet.</p>
          ) : (
            proof.map((record) => {
              const steps = [
                { label: "Install", status: record.install.status },
                { label: "Build", status: record.build.status },
                { label: "Boot", status: record.boot.status },
                { label: "Health", status: record.healthCheck.status },
              ];

              return (
                <div key={record.runtimeId} className="rounded-sm border border-white/5 bg-black/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{record.label}</p>
                      <p className="truncate text-xs text-muted-foreground">{record.blocker || record.path}</p>
                    </div>
                    <Badge variant="outline" className={`shrink-0 text-[10px] ${tone(record.proofStatus)}`}>
                      {humanLabel(record.proofStatus)}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-4">
                    {steps.map((step) => (
                      <div key={`${record.runtimeId}-${step.label}`} className={`rounded-sm border px-2 py-2 ${tone(step.status)}`}>
                        <p className="text-[10px] text-muted-foreground">{step.label}</p>
                        <p className="mt-1 text-xs font-medium">{humanLabel(step.status)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card className="glass border-white/5">
        <CardHeader className="py-4">
          <CardTitle className="text-sm">Services</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 p-4 pt-0 sm:grid-cols-4">
          {Object.entries(health?.services || {}).length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground sm:col-span-4">Health service data is unavailable.</p>
          ) : (
            Object.entries(health?.services || {}).map(([name, value]) => (
              <div key={name} className="rounded-sm border border-white/5 bg-black/20 p-3">
                <p className="text-xs text-muted-foreground">{humanLabel(name)}</p>
                <Badge variant="outline" className={`mt-2 text-[10px] ${tone(value)}`}>
                  {humanLabel(value)}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
