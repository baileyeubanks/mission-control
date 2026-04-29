import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Activity, Cpu, HardDrive, Wifi, RefreshCw, Database } from "lucide-react";
import { Button } from "@/components/ui/button";

type HealthStatus = "Online" | "Offline";

type ServiceStatus = {
  twilio: string;
  supabase: string;
  gemini: string;
  packets: string;
};

interface SystemMetrics {
  cpu_load_percent: number;
  memory_used_gb: string;
  memory_total_gb: string;
  memory_used_percent: number;
  platform: string;
  node_version: string;
}

interface HealthPayload {
  status: "ok";
  timestamp: string;
  uptime_seconds: number;
  memory_mb: number;
  system: SystemMetrics;
  services: ServiceStatus;
  probes?: {
    supabase_latency_ms: number | null;
  };
}

function humanLabel(value: string | null | undefined, fallback = "Not set") {
  if (!value) return fallback;
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function Health() {
  const [uptime, setUptime] = useState(0);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [health, setHealth] = useState<HealthPayload | null>(null);

  const fetchHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await fetch("/api/health");
      const payload = (await res.json()) as HealthPayload;
      if (payload?.services) {
        setHealth(payload);
        if (typeof payload.uptime_seconds === "number") {
          setUptime(payload.uptime_seconds);
        }
      }
    } catch (error) {
      console.error("Health fetch error:", error);
      setHealth(null);
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setUptime(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    fetchHealth();
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const metrics = health?.system ? [
    { label: "CPU load", value: `${health.system.cpu_load_percent}%`, status: health.system.cpu_load_percent < 80 ? "optimal" : "warning", icon: Cpu },
    { label: "Memory use", value: `${health.system.memory_used_gb} / ${health.system.memory_total_gb} GB`, status: health.system.memory_used_percent < 85 ? "optimal" : "warning", icon: HardDrive },
    { label: "Network latency", value: health.probes?.supabase_latency_ms ? `${health.probes.supabase_latency_ms}ms` : "N/A", status: health.probes?.supabase_latency_ms && health.probes.supabase_latency_ms < 500 ? "optimal" : "warning", icon: Wifi },
    {
      label: "Packet runtime",
      value: health?.services.packets === "enabled" ? "Active" : "Missing",
      status: health?.services.packets === "enabled" ? "optimal" : "warning",
      icon: Database,
    },
  ] : [];
  const degradedServices = Object.entries(health?.services || {}).filter(([, status]) => status !== "configured" && status !== "enabled");
  const repairState = degradedServices.length === 0 ? "clear" : "degraded";

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Health</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Activity className="h-3 w-3 text-success" />
            Runtime stable
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Session uptime</p>
            <p className="text-sm font-mono font-bold">{formatUptime(uptime)}</p>
          </div>
          <Button size="sm" className="h-9 text-xs" onClick={fetchHealth} disabled={loadingHealth} aria-label="Reboot_Subsystems">
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Refresh health
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label} className="glass border-slate-200">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">{m.label}</CardTitle>
              <m.icon className="h-3.5 w-3.5 text-primary/50" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-mono font-bold">{m.value}</div>
              <div className="mt-2 flex items-center gap-1.5">
                <div className={`h-1.5 w-1.5 rounded-full ${m.status === "optimal" ? "bg-success" : "bg-warning"} animate-pulse`} />
                <span className={`text-[10px] ${m.status === "optimal" ? "text-success" : "text-warning"}`}>
                  {m.status === "optimal" ? "Operational" : "Needs setup"}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 flex-1 min-h-0">
        <Card className="flex flex-col glass border-slate-200 overflow-hidden">
          <CardHeader className="py-4 border-b border-slate-200 bg-slate-100">
            <CardTitle className="text-xs font-medium text-muted-foreground">Services</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {[
              { name: "Hermes context", status: "Offline", load: "Peripheral" },
              { name: "Mission Control shell", status: "Online", load: "Local recovery" },
              { name: "Supabase bridge", status: (health?.services.supabase === "configured" ? "Online" : "Offline") as HealthStatus, load: health?.services.supabase === "configured" ? "Nominal" : "Missing config" },
              { name: "Gemini AI", status: (health?.services.gemini === "configured" ? "Online" : "Offline") as HealthStatus, load: health?.services.gemini === "configured" ? "Idle" : "Missing config" },
              { name: "Packet runtime", status: (health?.services.packets === "enabled" ? "Online" : "Offline") as HealthStatus, load: health?.services.packets === "enabled" ? "Queue aware" : "Missing config" },
              { name: "Auth governance", status: "Online", load: "Nominal" },
            ].map((s) => (
              <div key={s.name} className="flex items-center justify-between p-3 border border-slate-200 rounded-sm bg-white/5">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-[11px] text-muted-foreground">State: {s.load}</p>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    s.status === "Online" ? "bg-success/10 border-success/20 text-success" : "bg-destructive/10 border-destructive/20 text-destructive"
                  }`}
                >
                  {s.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="flex flex-col glass border-slate-200 overflow-hidden">
          <CardHeader className="py-4 border-b border-slate-200 bg-slate-100">
            <CardTitle className="text-xs font-medium text-muted-foreground">Repair queue</CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex flex-col items-center justify-center flex-1 text-center space-y-4">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${repairState === "clear" ? "bg-success/10" : "bg-warning/10"}`}>
              <Zap className={`h-6 w-6 ${repairState === "clear" ? "text-success" : "text-warning"}`} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-display tracking-tight">
                {repairState === "clear" ? "No repair actions" : "Degraded mode"}
              </p>
              <p className="text-xs text-muted-foreground">
                {repairState === "clear" ? "All critical services configured" : degradedServices.map(([name]) => humanLabel(name)).join(", ")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
