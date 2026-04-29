/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aether Video OS — WAR ROOM
 * Tactical command center for video producers.
 * No generic dashboards. This is mission control for content warfare.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Binary,
  Bomb,
  BrainCircuit,
  ChevronRight,
  Crosshair,
  Download,
  Eye,
  Film,
  Fingerprint,
  Flame,
  Ghost,
  Globe,
  Loader2,
  Lock,
  MessageSquare,
  MonitorPlay,
  Play,
  Radio,
  RefreshCcw,
  Rocket,
  ScanEye,
  Scissors,
  ShieldAlert,
  Sparkles,
  Swords,
  Target,
  Terminal,
  Timer,
  Trash2,
  UploadCloud,
  Waves,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getVideoOSBootstrap, createVideoProject, listVideoProjects } from "@/lib/video-os-client";
import { generateIntelReport, analyzeCompetitorUrl, type VideoIntelReport } from "@/lib/gemini-video";
import {
  isPhantomCutterSupported,
  loadPhantomCutter,
  extractThumbnails,
  trimClip,
  getVideoInfo,
  type ProcessingProgress,
} from "@/lib/ffmpeg-processor";
import type { VideoOSBootstrap, VideoProject } from "@/lib/video-os";

/* ------------------------------------------------------------------ */
/*  WAR ROOM                                                          */
/* ------------------------------------------------------------------ */

export function VideoDashboard() {
  const navigate = useNavigate();
  const [bootstrap, setBootstrap] = useState<VideoOSBootstrap | null>(null);
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ---- Phantom Cutter State ---- */
  const [cutterReady, setCutterReady] = useState(false);
  const [cutterLoading, setCutterLoading] = useState(false);
  const [processingFile, setProcessingFile] = useState<File | null>(null);
  const [processMode, setProcessMode] = useState<"thumb" | "clip" | "gif" | "intel" | null>(null);
  const [processProgress, setProcessProgress] = useState<ProcessingProgress>({ ratio: 0 });
  const [processResult, setProcessResult] = useState<{ url: string; type: string; name: string }[]>([]);
  const [videoInfo, setVideoInfo] = useState<{ duration: number; width: number; height: number; fps: number } | null>(null);
  const [intelReport, setIntelReport] = useState<VideoIntelReport | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  /* ---- Shadow Intel URL State ---- */
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [urlAnalysis, setUrlAnalysis] = useState<string | null>(null);
  const [analyzingUrl, setAnalyzingUrl] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [payload, projectList] = await Promise.all([
        getVideoOSBootstrap(),
        listVideoProjects(),
      ]);
      setBootstrap(payload);
      setProjects(projectList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "War Room systems offline.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /* ---- Init Phantom Cutter ---- */
  useEffect(() => {
    if (!isPhantomCutterSupported()) return;
    let cancelled = false;
    setCutterLoading(true);
    loadPhantomCutter({
      onLog: (msg) => {
        if (msg.includes("wasm") || msg.includes("load")) {
          // silent
        }
      },
      onProgress: ({ ratio }) => {
        if (!cancelled) setProcessProgress({ ratio });
      },
    })
      .then(() => {
        if (!cancelled) {
          setCutterReady(true);
          setCutterLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setCutterLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---- File Upload Handler ---- */
  const handleFileSelect = async (file: File, mode: "thumb" | "clip" | "gif" | "intel") => {
    setProcessingFile(file);
    setProcessMode(mode);
    setProcessResult([]);
    setIntelReport(null);
    setVideoInfo(null);
    setIsProcessing(true);
    setProcessProgress({ ratio: 0 });

    try {
      const info = await getVideoInfo(file, {
        onProgress: (p) => setProcessProgress(p),
      });
      setVideoInfo(info);

      if (mode === "thumb") {
        const marks = [1, Math.floor(info.duration / 3), Math.floor(info.duration / 2), Math.floor((info.duration * 2) / 3), Math.max(1, info.duration - 2)];
        const thumbs = await extractThumbnails(file, marks, {
          onProgress: (p) => setProcessProgress(p),
        });
        setProcessResult(
          thumbs.map((blob, i) => ({
            url: URL.createObjectURL(blob),
            type: "image/jpeg",
            name: `thumb_${marks[i]}s.jpg`,
          }))
        );
      } else if (mode === "clip" || mode === "gif") {
        const duration = Math.min(15, info.duration);
        const blob = await trimClip(file, 0, duration, {
          outputFormat: mode === "gif" ? "gif" : "mp4",
          onProgress: (p) => setProcessProgress(p),
        });
        setProcessResult([
          {
            url: URL.createObjectURL(blob),
            type: mode === "gif" ? "image/gif" : "video/mp4",
            name: `extract_${Date.now()}.${mode === "gif" ? "gif" : "mp4"}`,
          },
        ]);
      } else if (mode === "intel") {
        const report = await generateIntelReport(file);
        setIntelReport(report);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompetitorAnalyze = async () => {
    if (!competitorUrl.trim()) return;
    setAnalyzingUrl(true);
    setUrlAnalysis(null);
    try {
      const result = await analyzeCompetitorUrl(competitorUrl.trim());
      setUrlAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Intel gathering failed.");
    } finally {
      setAnalyzingUrl(false);
    }
  };

  const activeAgents = bootstrap?.activeAgents ?? [];
  const deliveries = bootstrap?.deliveries ?? [];

  if (loading && !bootstrap) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary/60" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="flex flex-col gap-4 glass-panel p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Crosshair className="h-5 w-5 text-brand-accent-glow" />
            <h1 className="text-2xl font-display tracking-[0.06em]">War Room</h1>
          </div>
          <p className="mt-1 text-xs text-white/40 font-mono uppercase tracking-widest">
            Tactical Video Operations Center
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[8px] uppercase border-brand-accent-glow/30 text-brand-accent-glow">
            <Zap className="mr-1 h-3 w-3" />
            {cutterReady ? "Phantom Cutter Online" : "Phantom Cutter Offline"}
          </Badge>
          <Button variant="ghost" size="icon" onClick={() => void refresh()} title="Refresh" className="hover:bg-white/[0.04]">
            <RefreshCcw className="h-4 w-4 text-white/30" />
          </Button>
        </div>
      </section>

      {/* Quick Strike Grid */}
      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: "Shadow Intel", path: "/admin/video/research", icon: ScanEye, detail: "Competitor analysis & viral research" },
          { label: "Phantom Cutter", path: "/admin/video/edit", icon: Scissors, detail: "Client-side processing arsenal" },
          { label: "Dead Drop", path: "/admin/video/deliver", icon: Ghost, detail: "Secure publish & track" },
          { label: "Agent Fleet", path: "/admin/video/agents", icon: BrainCircuit, detail: "AI operatives on standby" },
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

      <div className="grid gap-5 xl:grid-cols-[1fr_0.42fr]">
        {/* LEFT COLUMN */}
        <div className="space-y-5">
          {/* PHANTOM CUTTER — Drop Zone */}
          <Card className="glass border-primary/10">
            <CardHeader className="py-4">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Scissors className="h-4 w-4 text-primary" />
                  Phantom Cutter
                  {cutterLoading && <Loader2 className="ml-2 h-3 w-3 animate-spin text-primary" />}
                </CardTitle>
                {!cutterReady && (
                  <Badge variant="outline" className="text-[8px] uppercase text-warning border-warning/30">
                    <ShieldAlert className="mr-1 h-3 w-3" />
                    Needs SAB
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file, processMode || "thumb");
                }}
              />

              {/* Mode Selector */}
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "thumb" as const, label: "Thumbnails", icon: Eye },
                  { id: "clip" as const, label: "Clip Extract", icon: Film },
                  { id: "gif" as const, label: "GIF Gen", icon: Flame },
                  { id: "intel" as const, label: "AI Intel", icon: BrainCircuit },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setProcessMode(m.id)}
                    className={`flex items-center gap-2 rounded-sm border px-3 py-2 text-xs transition-colors ${
                      processMode === m.id
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-white/5 bg-black/20 text-muted-foreground hover:bg-white/5"
                    }`}
                  >
                    <m.icon className="h-3.5 w-3.5" />
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer rounded-sm border-2 border-dashed border-white/10 bg-black/20 p-8 text-center transition-colors hover:border-primary/30 hover:bg-white/5"
              >
                <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">
                  {processMode ? `Drop video for ${processMode}` : "Select a mode above, then click to upload"}
                </p>
                <p className="mt-1 text-[10px] font-mono uppercase text-muted-foreground/60">
                  {cutterReady ? "Client-side processing — zero upload" : "Server fallback required"}
                </p>
              </div>

              {/* Progress */}
              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase text-muted-foreground">
                    <span>Processing</span>
                    <span>{Math.round(processProgress.ratio * 100)}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-black/40">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${processProgress.ratio * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Video Info */}
              {videoInfo && (
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Duration", value: `${Math.floor(videoInfo.duration)}s` },
                    { label: "Resolution", value: `${videoInfo.width}x${videoInfo.height}` },
                    { label: "FPS", value: String(videoInfo.fps) },
                  ].map((i) => (
                    <div key={i.label} className="rounded-sm border border-white/5 bg-black/20 p-2 text-center">
                      <p className="text-[9px] font-mono uppercase text-muted-foreground">{i.label}</p>
                      <p className="text-sm font-display">{i.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Results */}
              {processResult.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-3">
                  {processResult.map((r, i) => (
                    <div key={i} className="relative rounded-sm border border-white/5 bg-black/20 overflow-hidden">
                      {r.type.startsWith("video") ? (
                        <video src={r.url} className="w-full h-24 object-cover" controls />
                      ) : (
                        <img src={r.url} alt={r.name} className="w-full h-24 object-cover" />
                      )}
                      <div className="p-2">
                        <p className="text-[9px] font-mono truncate">{r.name}</p>
                        <a
                          href={r.url}
                          download={r.name}
                          className="mt-1 inline-flex items-center gap-1 text-[10px] font-mono text-primary hover:underline"
                        >
                          <Download className="h-3 w-3" />
                          Download
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Intel Report */}
              {intelReport && <IntelReportCard report={intelReport} />}
            </CardContent>
          </Card>

          {/* Projects */}
          <Card className="glass border-white/5">
            <CardHeader className="py-4">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Swords className="h-4 w-4 text-primary" />
                  Active Missions
                </CardTitle>
                <Badge variant="outline" className="text-[9px] uppercase text-muted-foreground">
                  {projects.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-2 p-4 pt-0 md:grid-cols-2">
              {projects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => navigate(`/admin/video/edit?projectId=${p.id}`)}
                  className="flex flex-col gap-2 rounded-sm border border-white/5 bg-black/20 p-3 text-left transition-colors hover:border-primary/30 hover:bg-white/5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <Badge variant="outline" className="shrink-0 text-[8px] uppercase">
                      {p.status}
                    </Badge>
                  </div>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{p.description}</p>
                  <div className="flex items-center gap-1.5">
                    {p.tags.slice(0, 3).map((t) => (
                      <span key={t} className="rounded-sm bg-black/30 px-1.5 py-0.5 text-[9px] font-mono uppercase text-muted-foreground">
                        {t}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
              {projects.length === 0 && (
                <div className="col-span-full rounded-sm border border-white/5 bg-black/20 p-6 text-center text-xs text-muted-foreground">
                  No active missions. Create one in the field.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN — Intel & Comms */}
        <div className="space-y-5">
          {/* Competitor URL Analyzer */}
          <Card className="glass border-white/5">
            <CardHeader className="py-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Shadow Intel — URL
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste competitor video URL..."
                  value={competitorUrl}
                  onChange={(e) => setCompetitorUrl(e.target.value)}
                  className="flex-1 rounded-sm border border-white/10 bg-black/30 px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleCompetitorAnalyze();
                  }}
                />
                <Button size="sm" onClick={() => void handleCompetitorAnalyze()} disabled={analyzingUrl || !competitorUrl.trim()}>
                  {analyzingUrl ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Target className="h-3.5 w-3.5" />}
                </Button>
              </div>
              {urlAnalysis && (
                <div className="max-h-64 overflow-y-auto rounded-sm border border-white/5 bg-black/20 p-3 text-xs whitespace-pre-wrap text-muted-foreground">
                  {urlAnalysis}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Agents */}
          <Card className="glass border-white/5">
            <CardHeader className="py-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Radio className="h-4 w-4 text-primary" />
                Field Operatives
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              {activeAgents.length > 0 ? (
                activeAgents.map((a) => (
                  <div key={a.id} className="flex items-start justify-between gap-2 rounded-sm border border-white/5 bg-black/20 p-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{a.prompt.slice(0, 50)}...</p>
                      <p className="mt-0.5 text-[9px] font-mono uppercase text-muted-foreground">{a.agentRole.replace(/_/g, "-")}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[8px] uppercase text-warning border-warning/30">
                      <Waves className="mr-1 h-3 w-3" />
                      Active
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">All operatives idle.</p>
              )}
            </CardContent>
          </Card>

          {/* Deliveries */}
          <Card className="glass border-white/5">
            <CardHeader className="py-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Rocket className="h-4 w-4 text-primary" />
                Dead Drops
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              {deliveries.length > 0 ? (
                deliveries.map((d) => (
                  <div key={d.id} className="flex items-start justify-between gap-2 rounded-sm border border-white/5 bg-black/20 p-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{d.title}</p>
                      <p className="mt-0.5 text-[9px] font-mono uppercase text-muted-foreground">{d.platform.replace(/_/g, " ")}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-[8px] uppercase ${
                        d.status === "published" ? "text-success border-success/30" : d.status === "scheduled" ? "text-warning border-warning/30" : "text-muted-foreground"
                      }`}
                    >
                      {d.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">No packages deployed.</p>
              )}
            </CardContent>
          </Card>

          {/* Status Board */}
          <Card className="glass border-white/5">
            <CardHeader className="py-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Terminal className="h-4 w-4 text-primary" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              <StatusRow label="Phantom Cutter" active={cutterReady} />
              <StatusRow label="Shadow Intel (Gemini)" active={!!(import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY)} />
              <StatusRow label="Dead Drop Network" active={true} />
              <StatusRow label="Field Operatives" active={activeAgents.length > 0} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SUB-COMPONENTS                                                    */
/* ------------------------------------------------------------------ */

function StatusRow({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-sm border border-white/5 bg-black/20 px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <div className={`h-1.5 w-1.5 rounded-full ${active ? "bg-success animate-pulse" : "bg-destructive"}`} />
        <span className={`text-[10px] font-mono uppercase ${active ? "text-success" : "text-destructive"}`}>
          {active ? "Online" : "Offline"}
        </span>
      </div>
    </div>
  );
}

function IntelReportCard({ report }: { report: VideoIntelReport }) {
  return (
    <div className="space-y-3 rounded-sm border border-primary/10 bg-primary/5 p-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <ScanEye className="h-4 w-4 text-primary" />
          Shadow Intel Report
        </h3>
        <Badge variant="outline" className="text-[10px] uppercase text-primary border-primary/30">
          Hook Score: {report.hookScore}/100
        </Badge>
      </div>

      {/* Shot List */}
      {report.shotList.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Shot List</p>
          <div className="space-y-1">
            {report.shotList.slice(0, 5).map((shot, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="shrink-0 rounded-sm bg-black/30 px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground">
                  {Math.floor(shot.timeStart)}s
                </span>
                <span className="truncate">
                  {shot.type}: {shot.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Viral Moments */}
      {report.viralMoments.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Viral Moments</p>
          {report.viralMoments.map((vm, i) => (
            <div key={i} className="rounded-sm border border-white/5 bg-black/20 p-2">
              <div className="flex items-center gap-2">
                <Flame className="h-3 w-3 text-warning" />
                <span className="text-[10px] font-mono text-warning">{Math.floor(vm.timestamp)}s</span>
              </div>
              <p className="mt-1 text-xs">{vm.description}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Pattern: {vm.pattern}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tactical Notes */}
      {report.tacticalNotes.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Tactical Notes</p>
          {report.tacticalNotes.slice(0, 3).map((note, i) => (
            <p key={i} className="text-xs text-muted-foreground">
              • {note}
            </p>
          ))}
        </div>
      )}

      <p className="text-[9px] font-mono text-muted-foreground/60">
        Retention Prediction: {report.retentionPrediction}
      </p>
    </div>
  );
}
