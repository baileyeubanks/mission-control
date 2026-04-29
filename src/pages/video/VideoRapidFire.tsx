/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aether Video OS — RAPID FIRE
 * One upload. One click. Full tactical package.
 * The ultimate hacker workaround: one person + AI = entire production team.
 */

import { useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bomb,
  CheckCircle2,
  ChevronRight,
  Copy,
  Crosshair,
  Download,
  Flame,
  Image as ImageIcon,
  Loader2,
  MonitorPlay,
  Music,
  Rocket,
  Sparkles,
  Timer,
  UploadCloud,
  Wand2,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  isPhantomCutterSupported,
  loadPhantomCutter,
  extractThumbnails,
  trimClip,
  getVideoInfo,
} from "@/lib/ffmpeg-processor";
import { generateIntelReport, generateBattlePlan, type VideoIntelReport } from "@/lib/gemini-video";

interface PhaseState {
  status: "idle" | "running" | "done" | "error";
  message: string;
}

interface RapidResult {
  thumbnails: { url: string; time: number }[];
  clips: { url: string; start: number; end: number; label: string }[];
  intel: VideoIntelReport | null;
  battlePlan: string;
}

export function VideoRapidFire() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<{ duration: number; width: number; height: number } | null>(null);
  const [running, setRunning] = useState(false);
  const [phases, setPhases] = useState<Record<string, PhaseState>>({
    recon: { status: "idle", message: "Extract metadata & thumbnails" },
    intel: { status: "idle", message: "AI analysis of full video" },
    cut: { status: "idle", message: "Auto-extract viral clips" },
    plan: { status: "idle", message: "Generate battle plan" },
  });
  const [results, setResults] = useState<RapidResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const updatePhase = (key: string, state: PhaseState) => {
    setPhases((prev) => ({ ...prev, [key]: state }));
  };

  const handleFile = async (f: File) => {
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setResults(null);
    setError(null);
    try {
      const info = await getVideoInfo(f);
      setVideoInfo(info);
    } catch {
      // ignore
    }
  };

  const runRapidFire = async () => {
    if (!file) return;
    setRunning(true);
    setError(null);
    setResults(null);

    const newResults: RapidResult = { thumbnails: [], clips: [], intel: null, battlePlan: "" };

    try {
      /* ---- PHASE 1: RECON ---- */
      updatePhase("recon", { status: "running", message: "Extracting metadata..." });
      const info = await getVideoInfo(file);
      setVideoInfo(info);

      const thumbMarks = [
        1,
        Math.floor(info.duration / 4),
        Math.floor(info.duration / 2),
        Math.floor((info.duration * 3) / 4),
        Math.max(1, info.duration - 2),
      ];
      const thumbs = await extractThumbnails(file, thumbMarks);
      newResults.thumbnails = thumbs.map((blob, i) => ({
        url: URL.createObjectURL(blob),
        time: thumbMarks[i],
      }));
      updatePhase("recon", { status: "done", message: `${thumbs.length} thumbnails extracted` });

      /* ---- PHASE 2: INTEL ---- */
      updatePhase("intel", { status: "running", message: "Gemini analyzing video..." });
      const intel = await generateIntelReport(file);
      newResults.intel = intel;
      updatePhase("intel", { status: "done", message: `Hook score: ${intel.hookScore}/100` });

      /* ---- PHASE 3: CUT ---- */
      updatePhase("cut", { status: "running", message: "Auto-cutting viral moments..." });
      const clipPromises = intel.viralMoments.slice(0, 3).map(async (vm, i) => {
        const start = Math.max(0, vm.timestamp - 2);
        const end = Math.min(info.duration, vm.timestamp + 8);
        const blob = await trimClip(file, start, end, { outputFormat: "mp4" });
        return {
          url: URL.createObjectURL(blob),
          start,
          end,
          label: vm.pattern || `Clip ${i + 1}`,
        };
      });
      newResults.clips = await Promise.all(clipPromises);
      updatePhase("cut", { status: "done", message: `${newResults.clips.length} clips generated` });

      /* ---- PHASE 4: BATTLE PLAN ---- */
      updatePhase("plan", { status: "running", message: "Strategizing..." });
      const plan = await generateBattlePlan(
        `Video project: ${file.name}. Duration: ${info.duration}s. Resolution: ${info.width}x${info.height}.`,
        `Niche: viral content. Patterns detected: ${intel.viralMoments.map((v) => v.pattern).join(", ")}.`,
        intel
      );
      newResults.battlePlan = plan;
      updatePhase("plan", { status: "done", message: "Battle plan complete" });

      setResults(newResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rapid Fire malfunction. Check systems.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="flex flex-col gap-4 glass-panel p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Bomb className="h-5 w-5 text-brand-accent-glow" />
            <h1 className="text-2xl font-display tracking-[0.06em]">Rapid Fire</h1>
          </div>
          <p className="mt-1 text-xs text-white/40 font-mono uppercase tracking-widest">
            One upload. One click. Full tactical package.
          </p>
        </div>
        <Badge variant="outline" className="text-[8px] uppercase border-brand-accent-glow/30 text-brand-accent-glow">
          <Zap className="mr-1 h-3 w-3" />
          {isPhantomCutterSupported() ? "Phantom Online" : "Fallback Mode"}
        </Badge>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.42fr]">
        {/* LEFT */}
        <div className="space-y-4">
          {/* Upload */}
          <Card className="glass border-primary/10">
            <CardContent className="p-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />

              {!file ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer rounded-sm border-2 border-dashed border-white/10 bg-black/20 p-10 text-center transition-colors hover:border-primary/30 hover:bg-white/5"
                >
                  <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground/40" />
                  <p className="mt-3 text-sm text-muted-foreground">Drop mission footage or click to arm</p>
                  <p className="mt-1 text-[10px] font-mono uppercase text-muted-foreground/60">
                    Max 2GB · Up to 1 hour · All processing client-side where possible
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {previewUrl && (
                    <div className="relative rounded-sm overflow-hidden border border-white/5">
                      <video src={previewUrl} className="w-full max-h-48 object-contain bg-black/40" controls />
                    </div>
                  )}
                  {videoInfo && (
                    <div className="flex items-center gap-3 text-[10px] font-mono uppercase text-muted-foreground">
                      <span>{videoInfo.width}x{videoInfo.height}</span>
                      <span>·</span>
                      <span>{Math.floor(videoInfo.duration)}s</span>
                      <span className="ml-auto truncate max-w-[250px]">{file.name}</span>
                    </div>
                  )}
                  <Button
                    onClick={() => void runRapidFire()}
                    disabled={running}
                    className="w-full font-mono text-xs uppercase tracking-widest"
                  >
                    {running ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Executing...
                      </>
                    ) : (
                      <>
                        <Rocket className="mr-2 h-4 w-4" />
                        Execute Rapid Fire
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Phase Tracker */}
          {file && (
            <Card className="glass border-white/5">
              <CardHeader className="py-4">
                <CardTitle className="text-sm">Phase Tracker</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-4 pt-0">
                {Object.entries(phases).map(([key, phase]) => (
                  <div
                    key={key}
                    className={`flex items-center justify-between rounded-sm border px-3 py-2 transition-colors ${
                      phase.status === "done"
                        ? "border-success/20 bg-success/5"
                        : phase.status === "running"
                        ? "border-warning/20 bg-warning/5"
                        : phase.status === "error"
                        ? "border-destructive/20 bg-destructive/5"
                        : "border-white/5 bg-black/20"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {phase.status === "done" && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                      {phase.status === "running" && <Loader2 className="h-3.5 w-3.5 animate-spin text-warning" />}
                      {phase.status === "error" && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                      {phase.status === "idle" && <div className="h-3.5 w-3.5 rounded-full border border-white/20" />}
                      <span className={`text-xs capitalize ${phase.status === "done" ? "text-success" : phase.status === "running" ? "text-warning" : "text-muted-foreground"}`}>
                        {key}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">{phase.message}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {results && (
            <>
              {/* Thumbnails */}
              {results.thumbnails.length > 0 && (
                <Card className="glass border-white/5">
                  <CardHeader className="py-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-primary" />
                      Thumbnails
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-5 gap-2 p-4 pt-0">
                    {results.thumbnails.map((t, i) => (
                      <div key={i} className="relative rounded-sm overflow-hidden border border-white/5">
                        <img src={t.url} alt="" className="w-full h-16 object-cover" />
                        <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-[9px] font-mono text-center py-0.5">
                          {t.time}s
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Clips */}
              {results.clips.length > 0 && (
                <Card className="glass border-white/5">
                  <CardHeader className="py-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MonitorPlay className="h-4 w-4 text-primary" />
                      Viral Clips
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-2 p-4 pt-0 sm:grid-cols-2">
                    {results.clips.map((c, i) => (
                      <div key={i} className="rounded-sm border border-white/5 bg-black/20 overflow-hidden">
                        <video src={c.url} className="w-full h-24 object-cover" controls />
                        <div className="p-2">
                          <p className="text-[10px] font-mono uppercase text-primary">{c.label}</p>
                          <p className="text-[9px] font-mono text-muted-foreground">
                            {Math.floor(c.start)}s - {Math.floor(c.end)}s
                          </p>
                          <a href={c.url} download={`clip_${i + 1}.mp4`} className="mt-1 inline-flex items-center gap-1 text-[10px] font-mono text-primary hover:underline">
                            <Download className="h-3 w-3" />
                            Download
                          </a>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Battle Plan */}
              {results.battlePlan && (
                <Card className="glass border-primary/10">
                  <CardHeader className="py-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Crosshair className="h-4 w-4 text-primary" />
                      Battle Plan
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="max-h-96 overflow-y-auto rounded-sm border border-white/5 bg-black/20 p-4 text-xs whitespace-pre-wrap text-muted-foreground">
                      {results.battlePlan}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        navigator.clipboard.writeText(results.battlePlan);
                      }}
                    >
                      <Copy className="mr-2 h-3.5 w-3.5" />
                      Copy to Clipboard
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {error && (
            <Card className="glass border-destructive/20">
              <CardContent className="flex items-center gap-3 p-5">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <span className="text-sm">{error}</span>
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT — Intel Summary */}
        <div className="space-y-4">
          {results?.intel && (
            <Card className="glass border-primary/10">
              <CardHeader className="py-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Intel Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4 pt-0">
                <div className="flex items-center justify-between rounded-sm border border-white/5 bg-black/20 p-3">
                  <span className="text-xs text-muted-foreground">Hook Score</span>
                  <span className={`text-sm font-display ${results.intel.hookScore >= 70 ? "text-success" : results.intel.hookScore >= 40 ? "text-warning" : "text-destructive"}`}>
                    {results.intel.hookScore}/100
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-sm border border-white/5 bg-black/20 p-3">
                  <span className="text-xs text-muted-foreground">Shots Detected</span>
                  <span className="text-sm font-display">{results.intel.shotList.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-sm border border-white/5 bg-black/20 p-3">
                  <span className="text-xs text-muted-foreground">Viral Moments</span>
                  <span className="text-sm font-display">{results.intel.viralMoments.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-sm border border-white/5 bg-black/20 p-3">
                  <span className="text-xs text-muted-foreground">Text Patterns</span>
                  <span className="text-sm font-display">{results.intel.textPatterns.length}</span>
                </div>

                {results.intel.colorPalette.length > 0 && (
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Color Palette</p>
                    <div className="flex gap-1">
                      {results.intel.colorPalette.slice(0, 6).map((c, i) => (
                        <div key={i} className="h-6 w-6 rounded-sm border border-white/10" style={{ backgroundColor: c }} title={c} />
                      ))}
                    </div>
                  </div>
                )}

                {results.intel.viralMoments.length > 0 && (
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Top Moments</p>
                    {results.intel.viralMoments.slice(0, 3).map((vm, i) => (
                      <div key={i} className="mb-1 flex items-start gap-2 text-xs">
                        <Flame className="h-3 w-3 text-warning shrink-0 mt-0.5" />
                        <span>{Math.floor(vm.timestamp)}s — {vm.pattern}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="glass border-white/5">
            <CardHeader className="py-4">
              <CardTitle className="text-sm">What Rapid Fire Does</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              {[
                { icon: ImageIcon, label: "Extracts 5 key thumbnails" },
                { icon: Sparkles, label: "Runs Gemini AI video analysis" },
                { icon: MonitorPlay, label: "Auto-cuts 3 viral clips" },
                { icon: Crosshair, label: "Generates battle plan" },
                { icon: Download, label: "Everything downloadable" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <item.icon className="h-3.5 w-3.5 text-primary" />
                  {item.label}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
