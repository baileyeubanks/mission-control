import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Filter, LayoutGrid, List, Database, Loader2, Sparkles, Workflow } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getCanonicalJobs } from "@/lib/canonical-client";
import type { CanonicalJobRecord } from "@/lib/canonical-types";
import { createPacketRequest, listPackets, newestPacketOfKind } from "@/lib/packet-client";
import { createPacketIdempotencyKey, getPacketResultSummary, type Packet } from "@/lib/packets";

function humanLabel(value: string | null | undefined, fallback = "Not set") {
  if (!value) return fallback;
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function Jobs() {
  const { isAuthReady, user } = useAuth();
  const [jobs, setJobs] = useState<CanonicalJobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobPackets, setJobPackets] = useState<Packet[]>([]);
  const [isDraftingUpdate, setIsDraftingUpdate] = useState(false);
  const [packetError, setPacketError] = useState<string | null>(null);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await getCanonicalJobs();
      setJobs(data);
      setSelectedJobId((current) => current || data[0]?.id || null);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      setPacketError(error instanceof Error ? error.message : "Failed to load jobs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthReady || !user) return;
    void fetchJobs();
  }, [isAuthReady, user]);

  useEffect(() => {
    if (!selectedJobId) {
      setJobPackets([]);
      return;
    }

    const fetchJobPackets = async () => {
      try {
        const packets = await listPackets({
          entityType: "job",
          entityId: selectedJobId,
          kind: "draft_job_update",
          limit: 5,
        });
        setJobPackets(packets);
      } catch (error) {
        console.error("Error fetching job packets:", error);
        setJobPackets([]);
        setPacketError(error instanceof Error ? error.message : "Failed to load job packets.");
      }
    };

    void fetchJobPackets();
    const interval = setInterval(() => {
      void fetchJobPackets();
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedJobId]);

  const filteredJobs = jobs.filter((job) => {
    const haystack = [job.title, job.id, job.clientName, job.clientEmail, job.serviceAddress, job.accessNotes].join(" ").toLowerCase();
    return haystack.includes(searchQuery.toLowerCase());
  });
  const selectedJob = jobs.find((job) => job.id === selectedJobId) || null;
  const latestDraftPacket = newestPacketOfKind(jobPackets, "draft_job_update");
  const scheduledJobs = jobs.filter((job) => Boolean(job.scheduledStart));
  const readinessBlockedJobs = jobs.filter((job) => job.assignedTeam === "blocked_by_readiness");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "lead": return "bg-primary";
      case "quoted": return "bg-warning";
      case "scheduled": return "bg-success";
      case "in_progress": return "bg-blue-500";
      case "completed": return "bg-success shadow-[0_0_8px_rgba(34,197,94,0.4)]";
      case "invoiced": return "bg-destructive";
      case "paid": return "bg-success";
      default: return "bg-muted";
    }
  };

  const handleDraftUpdate = async () => {
    if (!selectedJob) return;

    const input = {
      jobDetails: {
        id: selectedJob.id,
        title: selectedJob.title,
        state: selectedJob.status,
        scheduledStart: selectedJob.scheduledStart || null,
        priceCents: selectedJob.totalPrice || null,
        client: selectedJob.clientName || selectedJob.clientEmail || "Unassigned",
        serviceAddress: selectedJob.serviceAddress || null,
      },
      notes: "Advisory draft only. Do not promise unconfirmed timing or billing changes.",
    };

    setIsDraftingUpdate(true);
    setPacketError(null);

    try {
      await createPacketRequest({
        kind: "draft_job_update",
        sourceSurface: "jobs",
        entityType: "job",
        entityId: selectedJob.id,
        requestedBy: user?.id || null,
        input,
        idempotencyKey: createPacketIdempotencyKey("draft_job_update", "job", selectedJob.id, input),
      });

      const packets = await listPackets({
        entityType: "job",
        entityId: selectedJob.id,
        kind: "draft_job_update",
        limit: 5,
      });
      setJobPackets(packets);
    } catch (error) {
      console.error("Error creating job update packet:", error);
      setPacketError(error instanceof Error ? error.message : "Failed to queue job update draft.");
    } finally {
      setIsDraftingUpdate(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Jobs</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Database className="h-3 w-3 text-success" />
            Supabase job record
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-white/5 rounded-sm p-1 bg-black/20">
            <Button variant="ghost" size="sm" className="h-7 px-2 bg-white/5" aria-label="List view" title="List view is active." disabled><List className="h-3.5 w-3.5" /></Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground"
              aria-label="Grid view"
              disabled
              title="Grid view is disabled until job cards have a real detail action."
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button
            size="sm"
            className="h-9 text-xs"
            disabled
            aria-label="Controlled_Intake_Only"
            title="Manual job seeding is disabled. Use canonical intake and quote conversion only."
          >
            Intake locked
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          { label: "Jobs", value: jobs.length, detail: loading ? "Loading" : "Canonical records" },
          { label: "Scheduled", value: scheduledJobs.length, detail: "Have a service window" },
          { label: "Readiness blocked", value: readinessBlockedJobs.length, detail: "Needs ACS crew readiness" },
        ].map((item) => (
          <Card key={item.label} className="glass border-white/5 p-4">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <p className="text-2xl font-display">{item.value}</p>
              <p className="text-right text-[11px] text-muted-foreground">{item.detail}</p>
            </div>
          </Card>
        ))}
      </div>

      {selectedJob && (
        <Card className="glass border-white/5 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Workflow className="h-4 w-4 text-primary" />
                <p className="text-xs font-medium text-muted-foreground">Selected job</p>
              </div>
              <div>
                <p className="text-lg font-display tracking-tight">{selectedJob.title}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedJob.clientName || selectedJob.clientEmail || "Unassigned client"} • {humanLabel(selectedJob.status)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-sm border border-white/10 bg-black/20 px-2 py-1 text-[11px] text-muted-foreground">
                    {selectedJob.scheduledStart ? new Date(selectedJob.scheduledStart).toLocaleString() : "Needs scheduling"}
                  </span>
                  <span className="rounded-sm border border-white/10 bg-black/20 px-2 py-1 text-[11px] text-muted-foreground">
                    {typeof selectedJob.totalPrice === "number" ? `$${(selectedJob.totalPrice / 100).toFixed(2)}` : "No price yet"}
                  </span>
                  {selectedJob.assignedTeam === "blocked_by_readiness" && (
                    <span className="rounded-sm border border-destructive/20 bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
                      Readiness blocked
                    </span>
                  )}
                </div>
                {(selectedJob.serviceAddress || selectedJob.accessNotes) && (
                  <p className="mt-3 text-sm text-muted-foreground">{selectedJob.serviceAddress || selectedJob.accessNotes}</p>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-3 lg:items-end">
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs border-white/10"
                onClick={() => void handleDraftUpdate()}
                disabled={isDraftingUpdate}
                aria-label="Queue_Update_Draft"
              >
                {isDraftingUpdate ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-2 h-3.5 w-3.5" />}
                Draft update
              </Button>
              {latestDraftPacket && (
                <div className="max-w-xl rounded-sm border border-white/5 bg-black/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium">Latest draft</p>
                    <Badge variant="outline" className="text-[10px]">
                      {humanLabel(latestDraftPacket.status)}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{getPacketResultSummary(latestDraftPacket)}</p>
                </div>
              )}
              {packetError && (
                <p className="text-xs text-destructive">{packetError}</p>
              )}
            </div>
          </div>
        </Card>
      )}

      <Card className="glass border-white/5">
        <div className="p-4 border-b border-white/5 bg-black/20">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <SearchInput value={searchQuery} onChange={setSearchQuery} />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9 font-mono uppercase text-[10px] border-white/10"
              disabled
              title="Advanced job filters are not wired yet. Search is active."
            >
              <Filter className="mr-2 h-3.5 w-3.5" />
              Search only
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Job</TableHead>
              <TableHead className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Client</TableHead>
              <TableHead className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Status</TableHead>
              <TableHead className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Schedule</TableHead>
              <TableHead className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableCell colSpan={5} className="py-16 text-center">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground/30" />
                </TableCell>
              </TableRow>
            ) : filteredJobs.length === 0 ? (
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableCell colSpan={5} className="py-16 text-center text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  No jobs found
                </TableCell>
              </TableRow>
            ) : (
              filteredJobs.map((job) => (
                <TableRow
                  key={job.id}
                  className={`border-white/5 cursor-pointer ${selectedJobId === job.id ? "bg-white/5" : "hover:bg-white/5"}`}
                  onClick={() => setSelectedJobId(job.id)}
                >
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-display">{job.title}</p>
                      <p className="text-[10px] font-mono uppercase text-muted-foreground">{job.id.slice(0, 8)}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p>{job.clientName || "Unassigned"}</p>
                      <p className="text-[10px] font-mono uppercase text-muted-foreground">{job.clientEmail || job.clientPhone || "No verified channel"}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${getStatusColor(job.status)}`} />
                        <span className="text-[10px] font-mono uppercase">{humanLabel(job.status)}</span>
                      </div>
                      {job.assignedTeam === "blocked_by_readiness" && (
                        <span className="text-[10px] text-destructive">Readiness blocked</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-[11px] text-muted-foreground">
                    {job.scheduledStart ? new Date(job.scheduledStart).toLocaleString() : "Pending operator scheduling"}
                  </TableCell>
                  <TableCell className="text-[11px] text-muted-foreground">
                    {typeof job.totalPrice === "number" ? `$${(job.totalPrice / 100).toFixed(2)}` : "TBD"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function SearchInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Input
      placeholder="Search jobs"
      className="bg-black/20 border-white/5 text-xs h-9"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
