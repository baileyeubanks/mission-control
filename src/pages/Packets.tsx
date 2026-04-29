import { useEffect, useState } from "react";
import { Activity, RefreshCcw, RotateCcw, Square, Workflow } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cancelPacketRequest, listPackets, retryPacketRequest } from "@/lib/packet-client";
import { type Packet, getPacketResultSummary } from "@/lib/packets";

function statusTone(status: Packet["status"]): string {
  switch (status) {
    case "succeeded":
      return "bg-success/10 border-success/20 text-success";
    case "failed":
      return "bg-destructive/10 border-destructive/20 text-destructive";
    case "running":
      return "bg-primary/10 border-primary/20 text-primary";
    case "queued":
      return "bg-warning/10 border-warning/20 text-warning";
    default:
      return "bg-muted/10 border-white/10 text-muted-foreground";
  }
}

export function Packets() {
  const [packets, setPackets] = useState<Packet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const refreshPackets = async () => {
    setError(null);
    try {
      const data = await listPackets({ limit: 25 });
      setPackets(data);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load packet queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshPackets();
    const interval = setInterval(() => {
      void refreshPackets();
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleRetry = async (packetId: string) => {
    setActingOn(packetId);
    try {
      await retryPacketRequest(packetId);
      await refreshPackets();
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : "Retry failed.");
    } finally {
      setActingOn(null);
    }
  };

  const handleCancel = async (packetId: string) => {
    setActingOn(packetId);
    try {
      await cancelPacketRequest(packetId);
      await refreshPackets();
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Cancel failed.");
    } finally {
      setActingOn(null);
    }
  };

  const counts = packets.reduce<Record<string, number>>((acc, packet) => {
    acc[packet.status] = (acc[packet.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Packet Factory</h1>
          <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground uppercase">
            <Workflow className="h-3 w-3 text-primary" />
            Authority: Packet_Runtime
          </div>
        </div>
        <Button variant="outline" size="sm" className="h-9 font-mono uppercase text-[10px] border-white/10" onClick={() => void refreshPackets()}>
          <RefreshCcw className="mr-2 h-3.5 w-3.5" />
          Refresh_Queue
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Queued", value: counts.queued || 0, tone: "text-warning" },
          { label: "Running", value: counts.running || 0, tone: "text-primary" },
          { label: "Succeeded", value: counts.succeeded || 0, tone: "text-success" },
          { label: "Failed", value: counts.failed || 0, tone: "text-destructive" },
        ].map((item) => (
          <Card key={item.label} className="glass border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">{item.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-display tracking-tighter ${item.tone}`}>{item.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="flex-1 glass border-white/5 overflow-hidden">
        <CardHeader className="border-b border-white/5 bg-black/20">
          <CardTitle className="text-xs font-display tracking-widest text-muted-foreground">Queue Ledger</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && (
            <div className="border-b border-destructive/20 bg-destructive/10 px-4 py-3 text-[10px] font-mono uppercase text-destructive">
              {error}
            </div>
          )}

          {loading ? (
            <div className="p-12 text-center text-xs font-mono text-muted-foreground uppercase tracking-widest">Loading_Packets...</div>
          ) : packets.length === 0 ? (
            <div className="p-12 text-center text-xs font-mono text-muted-foreground uppercase tracking-widest">Queue_Empty</div>
          ) : (
            <div className="divide-y divide-white/5">
              {packets.map((packet) => (
                <div key={packet.id} className="grid gap-3 px-4 py-4 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.9fr_auto] md:items-center">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold uppercase">{packet.kind}</span>
                      <Badge variant="outline" className={`text-[8px] uppercase tracking-tighter ${statusTone(packet.status)}`}>
                        {packet.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {packet.source_surface} • {packet.entity_type || "entity"}:{packet.entity_id || "none"}
                    </p>
                    <p className="text-sm font-display leading-relaxed">{getPacketResultSummary(packet)}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[9px] font-mono text-muted-foreground uppercase">Requested_By</p>
                    <p className="text-xs font-mono uppercase">{packet.requested_by || "SYSTEM"}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[9px] font-mono text-muted-foreground uppercase">Attempts</p>
                    <p className="text-xs font-mono uppercase">
                      {packet.attempt_count} / {packet.max_attempts}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[9px] font-mono text-muted-foreground uppercase">Lifecycle</p>
                    <p className="text-xs font-mono uppercase">
                      {packet.started_at ? new Date(packet.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "WAITING"}
                      {" → "}
                      {packet.completed_at ? new Date(packet.completed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "OPEN"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 md:justify-end">
                    {packet.status === "failed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 font-mono text-[9px] uppercase border-white/10"
                        onClick={() => void handleRetry(packet.id)}
                        disabled={actingOn === packet.id}
                      >
                        <RotateCcw className="mr-2 h-3 w-3" />
                        Retry
                      </Button>
                    )}
                    {(packet.status === "queued" || packet.status === "running") && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 font-mono text-[9px] uppercase border-white/10 text-destructive"
                        onClick={() => void handleCancel(packet.id)}
                        disabled={actingOn === packet.id}
                      >
                        <Square className="mr-2 h-3 w-3" />
                        Cancel
                      </Button>
                    )}
                    <Activity className="hidden md:block h-3.5 w-3.5 text-muted-foreground/30" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
