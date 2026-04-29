import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileCheck2,
  FolderOpen,
  Loader2,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  User,
  Workflow,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/AuthProvider";
import { getCanonicalInbox } from "@/lib/canonical-client";
import type { CanonicalInboxMessage, CanonicalInboxThread } from "@/lib/canonical-types";
import { convertMissionHandoff } from "@/lib/mission-control-client";
import { createPacketRequest, isPacketActive, listPackets, newestPacketOfKind } from "@/lib/packet-client";
import { createPacketIdempotencyKey, getPacketResultSummary, type Packet, type PacketKind } from "@/lib/packets";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { authFetch } from "@/lib/auth-fetch";

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

function humanizeToken(value?: string): string {
  if (!value) return "";
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      if (lower === "acs" || lower === "cco") return lower.toUpperCase();
      return `${lower.slice(0, 1).toUpperCase()}${lower.slice(1)}`;
    })
    .join(" ");
}

function threadSourceLabel(sourceKind: CanonicalInboxThread["sourceKind"]): string {
  return sourceKind === "creative_brief" ? "CCO brief" : "ACS quote";
}

function handoffStatusLabel(status?: CanonicalInboxThread["handoffStatus"]): string {
  switch (status) {
    case "triaged":
      return "Triaged";
    case "converted":
      return "Converted";
    case "blocked":
      return "Blocked";
    case "new":
    default:
      return "New";
  }
}

function handoffStatusTone(status?: CanonicalInboxThread["handoffStatus"]): string {
  switch (status) {
    case "converted":
      return "border-success/20 bg-success/10 text-success";
    case "blocked":
      return "border-destructive/20 bg-destructive/10 text-destructive";
    case "triaged":
      return "border-primary/20 bg-primary/10 text-primary";
    case "new":
    default:
      return "border-warning/20 bg-warning/10 text-warning";
  }
}

function readinessLabel(status?: CanonicalInboxThread["readiness"]["status"]): string {
  switch (status) {
    case "eligible":
      return "Ready";
    case "blocked":
      return "Blocked";
    case "not_required":
      return "Not required";
    default:
      return "Unscored";
  }
}

function readinessTone(status?: CanonicalInboxThread["readiness"]["status"]): string {
  switch (status) {
    case "eligible":
    case "not_required":
      return "border-success/20 bg-success/10 text-success";
    case "blocked":
      return "border-destructive/20 bg-destructive/10 text-destructive";
    default:
      return "border-white/10 bg-white/5 text-muted-foreground";
  }
}

function dataSourceLabel(dataSource?: string): string {
  if (!dataSource || dataSource === "local_recovery_store") return "Local recovery";
  return humanizeToken(dataSource);
}

const artifactLabels: Record<keyof NonNullable<CanonicalInboxThread["convertedArtifacts"]>, string> = {
  task_id: "Task",
  job_candidate_id: "Job candidate",
  project_candidate_id: "Project candidate",
  approval_id: "Approval",
};

function convertedArtifactEntries(convertedArtifacts?: CanonicalInboxThread["convertedArtifacts"]): Array<{ label: string; value: string }> {
  if (!convertedArtifacts) return [];

  return (Object.entries(artifactLabels) as Array<[keyof typeof artifactLabels, string]>)
    .map(([key, label]) => {
      const value = convertedArtifacts[key];
      return value ? { label, value } : null;
    })
    .filter((entry): entry is { label: string; value: string } => Boolean(entry));
}

export function Inbox() {
  const { isAuthReady, user } = useAuth();
  const [threads, setThreads] = useState<CanonicalInboxThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [threadPackets, setThreadPackets] = useState<Packet[]>([]);
  const [draft, setDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [packetsLoading, setPacketsLoading] = useState(true);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [packetAction, setPacketAction] = useState<PacketKind | null>(null);
  const [handoffAction, setHandoffAction] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeThread = threads.find((thread) => thread.threadId === activeThreadId) || null;
  const messages = activeThread?.messages || [];

  const fetchThreads = async () => {
    setLoading(true);
    try {
      const nextThreads = await getCanonicalInbox();
      setThreads(nextThreads);
      setActiveThreadId((current) => (current && nextThreads.some((thread) => thread.threadId === current) ? current : nextThreads[0]?.threadId || null));
    } catch (fetchError) {
      console.error("Error fetching canonical inbox:", fetchError);
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load inbox threads.");
    } finally {
      setLoading(false);
    }
  };

  const fetchThreadPackets = async (thread: CanonicalInboxThread) => {
    setPacketsLoading(true);
    try {
      const data = await listPackets({
        entityType: "thread",
        entityId: thread.packetEntityId,
        limit: 12,
      });
      setThreadPackets(data);
    } catch (packetError) {
      console.error("Error fetching thread packets:", packetError);
      setThreadPackets([]);
      setError(packetError instanceof Error ? packetError.message : "Packet service unavailable.");
    } finally {
      setPacketsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthReady || !user) return;
    void fetchThreads();
  }, [isAuthReady, user]);

  useEffect(() => {
    if (!activeThread) {
      setThreadPackets([]);
      setPacketsLoading(false);
      return;
    }

    setError(null);
    void fetchThreadPackets(activeThread);

    const interval = setInterval(() => {
      void fetchThreadPackets(activeThread);
    }, 4000);

    return () => clearInterval(interval);
  }, [activeThread]);

  const visibleThreads = threads.filter((thread) => {
    if (!searchQuery.trim()) return true;
    const haystack = [thread.title, thread.counterpart, thread.preview, ...thread.messages.map((message) => message.content)]
      .join(" ")
      .toLowerCase();
    return haystack.includes(searchQuery.trim().toLowerCase());
  });

  const packetInputMessages = messages.map((message) => ({
    sender: message.sender,
    content: message.content,
  }));

  const latestSummaryPacket = newestPacketOfKind(threadPackets, "thread_summarize");
  const latestDraftPacket = newestPacketOfKind(threadPackets, "thread_reply_draft");
  const latestIntakePacket = newestPacketOfKind(threadPackets, "intake_extract");
  const summaryText = typeof latestSummaryPacket?.output_json?.summary === "string" ? latestSummaryPacket.output_json.summary : "";
  const draftPacketText = typeof latestDraftPacket?.output_json?.text === "string" ? latestDraftPacket.output_json.text : "";
  const intakeOutput = latestIntakePacket?.output_json;
  const handoffArtifacts = convertedArtifactEntries(activeThread?.convertedArtifacts);

  const queuePacket = async (kind: PacketKind) => {
    if (!activeThread || packetInputMessages.length === 0) return;

    let input: unknown;
    switch (kind) {
      case "thread_summarize":
        input = { messages: packetInputMessages };
        break;
      case "thread_reply_draft":
        input = {
          messages: packetInputMessages,
          tone: activeThread.sourceKind === "creative_brief" ? "Consultative, direct, scope-aware" : "Professional, concise, approval-aware",
        };
        break;
      case "intake_extract":
        input = {
          text: messages.map((message) => `${message.sender}: ${message.content}`).join("\n"),
          channel: activeThread.channel,
        };
        break;
      default:
        return;
    }

    setPacketAction(kind);
    setError(null);

    try {
      await createPacketRequest({
        kind,
        sourceSurface: "inbox",
        entityType: "thread",
        entityId: activeThread.packetEntityId,
        requestedBy: user?.id || null,
        input,
        idempotencyKey: createPacketIdempotencyKey(kind, "thread", activeThread.packetEntityId, input),
      });

      await fetchThreadPackets(activeThread);
    } catch (packetError) {
      console.error("Packet create error:", packetError);
      setError(packetError instanceof Error ? packetError.message : "Failed to queue packet.");
    } finally {
      setPacketAction(null);
    }
  };

  const handleTransmit = async () => {
    if (!draft.trim() || !activeThread) return;
    if (!activeThread.outboundTarget) {
      setError("No verified outbound phone is attached to this thread.");
      return;
    }

    setIsTransmitting(true);
    setError(null);

    try {
      const response = await authFetch("/api/twilio/send", {
        method: "POST",
        body: JSON.stringify({ to: activeThread.outboundTarget, message: draft.trim() }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Outbound send failed.");
      }

      const outboundMessage: CanonicalInboxMessage = {
        id: `local-${Date.now()}`,
        sender: "Operator",
        content: draft.trim(),
        createdAt: new Date().toISOString(),
        direction: "outbound",
      };

      setThreads((current) =>
        current.map((thread) =>
          thread.threadId === activeThread.threadId
            ? {
                ...thread,
                preview: summarizeOutboundPreview(outboundMessage.content),
                latestAt: outboundMessage.createdAt,
                messages: [...thread.messages, outboundMessage],
              }
            : thread,
        ),
      );
      setDraft("");
    } catch (transmitError) {
      console.error("Transmission error:", transmitError);
      setError(transmitError instanceof Error ? transmitError.message : "Transmission failed.");
    } finally {
      setIsTransmitting(false);
    }
  };

  const handleConvertHandoff = async () => {
    if (!activeThread?.handoffId) return;
    setHandoffAction(true);
    setError(null);
    try {
      await convertMissionHandoff(activeThread.handoffId);
      await fetchThreads();
    } catch (convertError) {
      console.error("Handoff conversion error:", convertError);
      setError(convertError instanceof Error ? convertError.message : "Failed to convert handoff.");
    } finally {
      setHandoffAction(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
          <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground uppercase">
            <Database className="h-3 w-3 text-success" />
            Supabase intake
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-primary/10 border border-primary/20 text-primary text-[10px] font-mono uppercase">
          <Workflow className="h-3 w-3" />
          {packetsLoading ? "Packets syncing" : "Packets live"}
        </div>
      </div>

      {error && (
        <div className="rounded-sm border border-destructive/20 bg-destructive/10 px-4 py-3 text-[10px] font-mono uppercase tracking-wider text-destructive">
          {error}
        </div>
      )}

      <Card className="flex flex-1 flex-col overflow-hidden glass border-white/5 md:flex-row">
        <div className="flex max-h-80 w-full flex-col border-b border-white/5 bg-black/20 md:max-h-none md:w-80 md:border-b-0 md:border-r">
          <div className="p-4 border-b border-white/5 bg-black/40">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search intake"
                className="pl-10 bg-black/20 border-white/5 font-mono text-[10px] uppercase tracking-wider h-9"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="p-12 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/20" />
              </div>
            ) : visibleThreads.length === 0 ? (
              <div className="p-12 text-center text-[10px] font-mono text-muted-foreground uppercase tracking-widest">No threads found</div>
            ) : (
              visibleThreads.map((thread) => (
                <div
                  key={thread.threadId}
                  className={`p-4 border-b border-white/5 cursor-pointer transition-colors group ${
                    activeThread?.threadId === thread.threadId ? "bg-white/5 border-l-2 border-l-primary" : "hover:bg-white/5"
                  }`}
                  onClick={() => setActiveThreadId(thread.threadId)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                      {thread.counterpart}
                    </span>
                    <span className="text-[9px] text-muted-foreground/60 font-mono">
                      {new Date(thread.latestAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-xs truncate font-display tracking-tight text-foreground">{thread.preview}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[8px] font-mono uppercase text-muted-foreground/40 px-1 py-0.5 border border-white/5 rounded-sm">
                      {threadSourceLabel(thread.sourceKind)}
                    </span>
                    <span className="text-[8px] font-mono uppercase text-muted-foreground/40 px-1 py-0.5 border border-white/5 rounded-sm">
                      {thread.channel}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col bg-black/10">
          {activeThread ? (
            <>
              <div className="flex flex-col gap-3 border-b border-white/5 bg-black/40 p-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="h-10 w-10 rounded-sm bg-primary/10 flex items-center justify-center border border-primary/20">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-display font-bold uppercase tracking-tight">{activeThread.title}</h2>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase">
                      {activeThread.counterpart} • {activeThread.channel}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 font-mono text-[9px] uppercase border-white/10"
                    onClick={() => void queuePacket("thread_summarize")}
                    disabled={packetAction === "thread_summarize" || messages.length === 0}
                  >
                    {packetAction === "thread_summarize" ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Sparkles className="h-3 w-3 mr-2 text-primary" />}
                    Summarize
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 font-mono text-[9px] uppercase border-white/10"
                    onClick={() => void queuePacket("intake_extract")}
                    disabled={packetAction === "intake_extract" || messages.length === 0}
                  >
                    {packetAction === "intake_extract" ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Workflow className="h-3 w-3 mr-2 text-primary" />}
                    Extract details
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="More actions"
                    disabled
                    title="More actions are hidden until the thread action menu is wired."
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 space-y-6 overflow-auto p-4 md:p-6">
                {!isSupabaseConfigured && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-sm bg-destructive/10 border border-destructive/20 text-destructive text-[10px] font-mono uppercase">
                    <ShieldAlert className="h-3 w-3" />
                    Supabase unavailable
                  </div>
                )}

                {activeThread.handoffId && (
                  <div className="rounded-sm border border-white/5 bg-black/20 p-4">
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.8fr)_minmax(220px,0.8fr)]">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-display font-semibold tracking-tight">
                            {threadSourceLabel(activeThread.sourceKind)} handoff
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[8px] font-mono uppercase ${handoffStatusTone(activeThread.handoffStatus)}`}
                          >
                            {handoffStatusLabel(activeThread.handoffStatus)}
                          </Badge>
                          <Badge variant="outline" className="text-[8px] font-mono uppercase border-white/10 bg-white/5 text-muted-foreground">
                            {dataSourceLabel(activeThread.dataSource)}
                          </Badge>
                        </div>
                        {activeThread.nextAction && (
                          <p className="mt-3 max-w-2xl text-sm leading-relaxed">
                            {activeThread.nextAction}
                          </p>
                        )}
                      </div>

                      <div className={`rounded-sm border p-3 ${readinessTone(activeThread.readiness?.status)}`}>
                        <div className="flex items-start gap-2">
                          {activeThread.readiness?.status === "blocked" ? (
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                          ) : (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-[10px] font-mono uppercase tracking-wider">
                              Readiness: {readinessLabel(activeThread.readiness?.status)}
                            </p>
                            {activeThread.readiness?.summary && (
                              <p className="mt-1 text-xs leading-relaxed text-foreground/80">
                                {activeThread.readiness.summary}
                              </p>
                            )}
                          </div>
                        </div>
                        {activeThread.readiness?.blockers && activeThread.readiness.blockers.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {activeThread.readiness.blockers.slice(0, 2).map((blocker) => (
                              <span key={blocker} className="rounded-sm border border-destructive/20 bg-destructive/10 px-2 py-1 text-[9px] font-mono uppercase text-destructive">
                                {blocker}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="rounded-sm border border-white/5 bg-black/20 p-3">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Artifacts</p>
                        {handoffArtifacts.length > 0 ? (
                          <div className="mt-2 space-y-1.5">
                            {handoffArtifacts.map((artifact) => (
                              <div key={`${artifact.label}:${artifact.value}`} className="flex items-center justify-between gap-3 rounded-sm border border-success/10 bg-success/5 px-2 py-1.5">
                                <span className="text-[9px] font-mono uppercase text-success">{artifact.label}</span>
                                <span className="truncate text-[10px] font-mono text-success/90">{artifact.value}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-muted-foreground">No local artifacts yet</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {activeThread.sourceKind === "creative_brief" ? (
                        <>
                          <a className="inline-flex h-8 items-center rounded-md border border-white/10 px-3 text-[9px] font-mono uppercase hover:bg-white/5" href="/admin/files">
                            <FolderOpen className="mr-2 h-3 w-3 text-primary" />
                            Open files
                          </a>
                          <a className="inline-flex h-8 items-center rounded-md border border-white/10 px-3 text-[9px] font-mono uppercase hover:bg-white/5" href="/admin/approvals">
                            <FileCheck2 className="mr-2 h-3 w-3 text-primary" />
                            Open approvals
                          </a>
                        </>
                      ) : (
                        <a className="inline-flex h-8 items-center rounded-md border border-white/10 px-3 text-[9px] font-mono uppercase hover:bg-white/5" href="/admin/jobs">
                          <BriefcaseBusiness className="mr-2 h-3 w-3 text-primary" />
                          Open jobs
                        </a>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 border-white/10 font-mono text-[9px] uppercase"
                        onClick={() => void handleConvertHandoff()}
                        disabled={handoffAction || activeThread.handoffStatus === "converted"}
                      >
                        {handoffAction ? (
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        ) : activeThread.handoffStatus === "converted" ? (
                          <CheckCircle2 className="mr-2 h-3 w-3 text-success" />
                        ) : (
                          <ClipboardCheck className="mr-2 h-3 w-3 text-primary" />
                        )}
                        {activeThread.handoffStatus === "converted"
                          ? "Converted"
                          : activeThread.sourceKind === "creative_brief"
                            ? "Create project candidate"
                            : "Create job candidate"}
                      </Button>
                    </div>
                  </div>
                )}

                {(latestSummaryPacket || latestDraftPacket || latestIntakePacket) && (
                  <div className="grid gap-4 xl:grid-cols-3">
                    {latestSummaryPacket && (
                      <div className="rounded-sm border border-primary/20 bg-primary/5 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">Thread summary</p>
                          <Badge variant="outline" className={`text-[8px] uppercase tracking-tighter ${packetTone(latestSummaryPacket.status)}`}>
                            {latestSummaryPacket.status}
                          </Badge>
                        </div>
                        <p className="mt-3 text-sm font-display leading-relaxed">
                          {summaryText || getPacketResultSummary(latestSummaryPacket)}
                        </p>
                      </div>
                    )}

                    {latestDraftPacket && (
                      <div className="rounded-sm border border-white/10 bg-black/20 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[10px] font-mono font-bold uppercase tracking-widest">Reply draft</p>
                          <Badge variant="outline" className={`text-[8px] uppercase tracking-tighter ${packetTone(latestDraftPacket.status)}`}>
                            {latestDraftPacket.status}
                          </Badge>
                        </div>
                        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                          {draftPacketText || getPacketResultSummary(latestDraftPacket)}
                        </p>
                        {draftPacketText && latestDraftPacket.status === "succeeded" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3 h-8 font-mono text-[9px] uppercase border-white/10"
                            onClick={() => setDraft(draftPacketText)}
                          >
                            Use draft
                          </Button>
                        )}
                      </div>
                    )}

                    {latestIntakePacket && (
                      <div className="rounded-sm border border-white/10 bg-black/20 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[10px] font-mono font-bold uppercase tracking-widest">Intake extract</p>
                          <Badge variant="outline" className={`text-[8px] uppercase tracking-tighter ${packetTone(latestIntakePacket.status)}`}>
                            {latestIntakePacket.status}
                          </Badge>
                        </div>
                        {latestIntakePacket.status === "succeeded" && intakeOutput ? (
                          <div className="mt-3 space-y-2 text-[11px]">
                            {typeof intakeOutput.businessScope === "string" && (
                              <p className="font-mono uppercase text-primary">{intakeOutput.businessScope}</p>
                            )}
                            {typeof intakeOutput.projectScope === "string" && <p>{intakeOutput.projectScope}</p>}
                            <div className="flex flex-wrap gap-2 text-[9px] font-mono uppercase text-muted-foreground">
                              {typeof intakeOutput.name === "string" && <span>{intakeOutput.name}</span>}
                              {typeof intakeOutput.email === "string" && <span>{intakeOutput.email}</span>}
                              {typeof intakeOutput.phone === "string" && <span>{intakeOutput.phone}</span>}
                            </div>
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-muted-foreground">{getPacketResultSummary(latestIntakePacket)}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {messages.map((message) => {
                  const isOutgoing = message.direction === "outbound";
                  const isSystem = message.direction === "system";
                  return (
                    <div key={message.id} className={`flex flex-col gap-1 max-w-[90%] ${isOutgoing ? "ml-auto items-end" : ""}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
                          {message.sender}
                        </span>
                        <span className="text-[9px] text-muted-foreground/60 font-mono">
                          {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div
                        className={`rounded-sm p-4 text-sm font-display leading-relaxed border ${
                          isSystem
                            ? "bg-warning/5 border-warning/10 text-warning/90 italic"
                            : isOutgoing
                              ? "bg-primary/10 border-primary/20"
                              : "bg-white/5 border-white/5"
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-white/5 bg-black/40 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0 h-10 w-10 border-white/10"
                    disabled
                    title="Attachments are disabled until the file/artifact backend is connected."
                    aria-label="Attach file"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 bg-black/20 border border-white/5 rounded-sm focus-within:border-primary/50 transition-colors">
                    <textarea
                      className="w-full min-h-[100px] max-h-[300px] p-4 text-sm bg-transparent resize-none focus:outline-none font-display leading-relaxed"
                      placeholder="Write a reply or internal note"
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                    />
                    <div className="flex flex-col gap-3 border-t border-white/5 bg-black/20 p-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 font-mono text-[9px] uppercase hover:bg-white/5"
                          onClick={handleTransmit}
                          disabled={!draft.trim() || !activeThread?.outboundTarget}
                          title="Send reply via Twilio SMS"
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Reply
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 font-mono text-[9px] uppercase text-warning hover:bg-warning/10"
                          onClick={async () => {
                            if (!draft.trim() || !activeThread) return;
                            try {
                              await supabase.from("events").insert({
                                type: "internal_note",
                                source: "inbox",
                                payload: { thread_id: activeThread.threadId, note: draft.trim() },
                              });
                              setDraft("");
                            } catch (e) {
                              console.error("Note save failed:", e);
                            }
                          }}
                          disabled={!draft.trim()}
                          title="Save internal note"
                        >
                          Note
                        </Button>
                        <div className="w-px h-4 bg-white/10 my-auto mx-1" />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 font-mono text-[9px] uppercase text-primary hover:bg-primary/10"
                          onClick={() => void queuePacket("thread_reply_draft")}
                          disabled={packetAction === "thread_reply_draft" || messages.length === 0}
                        >
                          {packetAction === "thread_reply_draft" || isPacketActive(latestDraftPacket?.status || "cancelled") ? (
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                          ) : (
                            <Sparkles className="h-3 w-3 mr-2" />
                          )}
                          Draft reply
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        className="h-8 font-mono text-[9px] uppercase tracking-widest"
                        onClick={handleTransmit}
                        disabled={!draft.trim() || !activeThread?.outboundTarget || isTransmitting}
                        title={!activeThread?.outboundTarget ? "No phone number attached to thread" : "Send via Twilio SMS"}
                      >
                        {isTransmitting ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Send className="h-3 w-3 mr-2" />}
                        Send
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-12 text-center">
              <div className="space-y-2 opacity-20">
                <MessageSquare className="h-12 w-12 mx-auto" />
                <p className="text-xs font-mono uppercase tracking-widest">Select a thread</p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function summarizeOutboundPreview(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length <= 160 ? normalized : `${normalized.slice(0, 159).trim()}…`;
}
