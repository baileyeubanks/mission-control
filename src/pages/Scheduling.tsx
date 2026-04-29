import { useEffect, useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Database, Loader2, Sparkles, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/AuthProvider";
import { getCanonicalSchedule } from "@/lib/canonical-client";
import type { CanonicalCrewMember, CanonicalJobRecord } from "@/lib/canonical-types";
import { createPacketRequest, listPackets, newestPacketOfKind } from "@/lib/packet-client";
import { createPacketIdempotencyKey, getPacketResultSummary, type Packet } from "@/lib/packets";
import { isSupabaseConfigured } from "@/lib/supabase";

function packetTone(status?: Packet["status"]): string {
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

function humanLabel(value: string | null | undefined, fallback = "Not set") {
  if (!value) return fallback;
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function Scheduling() {
  const { isAuthReady, user } = useAuth();
  const [jobs, setJobs] = useState<CanonicalJobRecord[]>([]);
  const [crews, setCrews] = useState<CanonicalCrewMember[]>([]);
  const [schedulePackets, setSchedulePackets] = useState<Packet[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedule = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = await getCanonicalSchedule();
      setJobs(payload.jobs);
      setCrews(payload.crews);
    } catch (fetchError) {
      console.error("Error fetching schedule data:", fetchError);
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load scheduling data.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedulePackets = async () => {
    try {
      const packets = await listPackets({
        entityType: "schedule_board",
        entityId: "global",
        kind: "schedule_optimize",
        limit: 6,
      });
      setSchedulePackets(packets);
    } catch (packetError) {
      console.error("Error fetching schedule packets:", packetError);
      setSchedulePackets([]);
      setError(packetError instanceof Error ? packetError.message : "Packet service unavailable.");
    }
  };

  useEffect(() => {
    if (!isAuthReady || !user) return;
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    void fetchSchedule();
    void fetchSchedulePackets();

    const interval = setInterval(() => {
      void fetchSchedulePackets();
    }, 4000);

    return () => clearInterval(interval);
  }, [isAuthReady, user]);

  const backlogJobs = jobs.filter((job) => !job.scheduledStart && !["completed", "paid", "cancelled"].includes(job.status));
  const scheduledJobs = jobs.filter((job) => Boolean(job.scheduledStart));
  const readinessBlockedJobs = backlogJobs.filter((job) => job.assignedTeam === "blocked_by_readiness");
  const latestOptimizePacket = newestPacketOfKind(schedulePackets, "schedule_optimize");

  const handleOptimize = async () => {
    const relevantJobs = jobs.filter((job) => !["completed", "paid", "cancelled"].includes(job.status));
    if (relevantJobs.length === 0 || crews.length === 0) return;

    const input = {
      jobs: relevantJobs.map((job) => ({
        id: job.id,
        title: job.title,
        state: job.status,
        scheduledStart: job.scheduledStart,
        scheduledEnd: job.scheduledEnd,
        serviceAddress: job.serviceAddress || job.accessNotes,
      })),
      crews: crews.map((crew) => ({
        id: crew.id,
        name: crew.displayName,
        availability: "Current route allocation requires operator confirmation.",
      })),
    };

    setOptimizing(true);
    setError(null);

    try {
      await createPacketRequest({
        kind: "schedule_optimize",
        sourceSurface: "scheduling",
        entityType: "schedule_board",
        entityId: "global",
        requestedBy: user?.id || null,
        input,
        idempotencyKey: createPacketIdempotencyKey("schedule_optimize", "schedule_board", "global", input),
      });

      await fetchSchedulePackets();
    } catch (packetError) {
      console.error("Schedule optimize packet error:", packetError);
      setError(packetError instanceof Error ? packetError.message : "Failed to queue schedule optimization.");
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Database className="h-3 w-3 text-success" />
            Supabase dispatch record
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 border-white/10"
              aria-label="Previous week"
              disabled
              title="Calendar paging is disabled until date-window queries are connected."
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs min-w-[140px] text-center">April 2026</span>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 border-white/10"
              aria-label="Next week"
              disabled
              title="Calendar paging is disabled until date-window queries are connected."
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-9 font-mono uppercase text-[10px] border-white/10"
            aria-label="Go to today"
            disabled
            title="Today jump is disabled until schedule date-window state is wired."
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
            Today locked
          </Button>
          <Button
            size="sm"
            className="h-9 text-xs"
            onClick={() => void handleOptimize()}
            disabled={optimizing || jobs.length === 0 || crews.length === 0}
            aria-label="Queue_Optimize"
          >
            {optimizing ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-2 h-3.5 w-3.5" />}
            Optimize plan
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-sm border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs text-destructive">
          {error}
        </div>
      )}

      {latestOptimizePacket && (
        <Card className="glass border-white/5">
          <CardHeader className="border-b border-white/5 bg-black/20">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-xs font-medium text-muted-foreground">Optimization advisory</CardTitle>
              <Badge variant="outline" className={`text-[10px] ${packetTone(latestOptimizePacket.status)}`}>
                {humanLabel(latestOptimizePacket.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <p className="text-sm text-muted-foreground">{getPacketResultSummary(latestOptimizePacket)}</p>
            {Array.isArray(latestOptimizePacket.output_json?.assignments) && latestOptimizePacket.output_json.assignments.length > 0 && (
              <div className="grid gap-3 lg:grid-cols-2">
                {latestOptimizePacket.output_json.assignments.map((assignment, index) => (
                  <div key={`${assignment.crewId}-${index}`} className="rounded-sm border border-white/5 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-medium">
                        {crews.find((crew) => crew.id === assignment.crewId)?.displayName || assignment.crewId}
                      </p>
                      <Workflow className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">{assignment.reasoning}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {assignment.jobIds.map((jobId: string) => (
                        <span key={jobId} className="rounded-sm border border-white/10 px-2 py-1 text-[10px] text-muted-foreground">
                          {jobs.find((job) => job.id === jobId)?.title || jobId.slice(0, 8)}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="glass border-white/5">
          <CardHeader className="border-b border-white/5 bg-black/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground">Scheduled jobs</CardTitle>
              <Badge variant="outline" className="text-[10px]">{scheduledJobs.length} scheduled</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            {loading ? (
              <div className="py-16 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground/30" /></div>
            ) : scheduledJobs.length === 0 ? (
              <p className="py-12 text-center text-xs text-muted-foreground">No scheduled jobs</p>
            ) : (
              scheduledJobs.slice(0, 14).map((job) => (
                <div key={job.id} className="rounded-sm border border-white/5 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-display tracking-tight">{job.title}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {job.clientName || job.clientEmail || "Unassigned client"} • {humanLabel(job.status)}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{humanLabel(job.businessUnit, "Ops")}</Badge>
                  </div>
                  {job.scheduledStart && (
                    <p className="mt-3 text-[11px] text-muted-foreground">
                      {new Date(job.scheduledStart).toLocaleString()}
                    </p>
                  )}
                  {(job.serviceAddress || job.accessNotes) && (
                    <p className="mt-2 text-[11px] text-muted-foreground">{job.serviceAddress || job.accessNotes}</p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="glass border-white/5">
          <CardHeader className="border-b border-white/5 bg-black/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground">Dispatch readiness</CardTitle>
              <Badge variant="outline" className="text-[10px]">{readinessBlockedJobs.length} blockers</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 p-4">
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground">Readiness blockers</p>
              {readinessBlockedJobs.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">No unscheduled ACS readiness blockers.</p>
              ) : (
                readinessBlockedJobs.slice(0, 6).map((job) => (
                  <div key={job.id} className="rounded-sm border border-destructive/20 bg-destructive/10 px-3 py-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-display">{job.title}</p>
                        <p className="text-[11px] text-muted-foreground">{job.clientName || job.clientEmail || "Unassigned client"}</p>
                      </div>
                      <Badge variant="outline" className="border-destructive/20 text-[10px] text-destructive">
                        Crew readiness
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground">Crews</p>
              {crews.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">No canonical crew profiles are available yet.</p>
              ) : (
                crews.map((crew) => (
                  <div key={crew.id} className="rounded-sm border border-white/5 bg-black/20 px-3 py-2">
                    <p className="text-sm font-display">{crew.displayName}</p>
                    <p className="text-[11px] text-muted-foreground">{humanLabel(crew.role)}</p>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground">Unscheduled jobs</p>
              {backlogJobs.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">All active jobs currently have a scheduled window.</p>
              ) : (
                backlogJobs.slice(0, 8).map((job) => (
                  <div key={job.id} className="rounded-sm border border-white/5 bg-black/20 px-3 py-2">
                    <p className="text-sm font-display">{job.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <p className="text-[11px] text-muted-foreground">{job.clientName || job.clientEmail || "Unassigned client"}</p>
                      {job.assignedTeam === "blocked_by_readiness" && (
                        <span className="text-[10px] text-destructive">Readiness blocked</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
