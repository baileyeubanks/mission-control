/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aether Video OS — Shadow Intel Research Station
 * Viral analysis + competitor intelligence + Gemini video understanding.
 */

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  Crosshair,
  Eye,
  Flame,
  Globe,
  Lightbulb,
  Loader2,
  Radio,
  RefreshCcw,
  ScanEye,
  Sparkles,
  Target,
  UploadCloud,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listResearch, createResearch, listVideoProjects } from "@/lib/video-os-client";
import { generateIntelReport, analyzeCompetitorUrl, type VideoIntelReport } from "@/lib/gemini-video";
import type { ViralResearchResult, VideoProject } from "@/lib/video-os";

export function VideoResearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [research, setResearch] = useState<ViralResearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [niche, setNiche] = useState("");
  const [creating, setCreating] = useState(false);

  /* ---- Shadow Intel Upload State ---- */
  const [intelFile, setIntelFile] = useState<File | null>(null);
  const [intelReport, setIntelReport] = useState<VideoIntelReport | null>(null);
  const [intelLoading, setIntelLoading] = useState(false);
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [urlAnalysis, setUrlAnalysis] = useState<string | null>(null);
  const [analyzingUrl, setAnalyzingUrl] = useState(false);

  const intelInputRef = useRef<HTMLInputElement>(null);
  const selectedProjectId = searchParams.get("projectId");

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [researchList, projectList] = await Promise.all([
        listResearch(selectedProjectId || undefined),
        listVideoProjects(),
      ]);
      setResearch(researchList);
      setProjects(projectList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Shadow Intel systems offline.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [selectedProjectId]);

  const handleCreateResearch = async () => {
    if (!niche.trim()) return;
    const projectId = selectedProjectId || projects[0]?.id;
    if (!projectId) {
      setError("Select a mission first.");
      return;
    }
    setCreating(true);
    try {
      await createResearch({ projectId, niche: niche.trim() });
      setNiche("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Intel dispatch failed.");
    } finally {
      setCreating(false);
    }
  };

  const handleIntelUpload = async (file: File) => {
    setIntelFile(file);
    setIntelReport(null);
    setIntelLoading(true);
    try {
      const report = await generateIntelReport(file);
      setIntelReport(report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Shadow Intel extraction failed.");
    } finally {
      setIntelLoading(false);
    }
  };

  const handleUrlAnalyze = async () => {
    if (!competitorUrl.trim()) return;
    setAnalyzingUrl(true);
    setUrlAnalysis(null);
    try {
      const result = await analyzeCompetitorUrl(competitorUrl.trim());
      setUrlAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "URL recon failed.");
    } finally {
      setAnalyzingUrl(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="flex flex-col gap-4 glass-panel p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ScanEye className="h-5 w-5 text-brand-accent-glow" />
            <h1 className="text-2xl font-display tracking-[0.06em]">Shadow Intel</h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 font-mono uppercase tracking-widest">
            Competitor reconnaissance · Viral pattern extraction · Tactical analysis
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => void refresh()} className="hover:bg-slate-100">
            <RefreshCcw className="h-4 w-4 text-slate-400" />
          </Button>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.45fr]">
        {/* LEFT COLUMN */}
        <div className="space-y-4">
          {/* VIDEO UPLOAD — Shadow Intel */}
          <Card className="glass border-primary/10">
            <CardHeader className="py-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Crosshair className="h-4 w-4 text-primary" />
                Competitor Video Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <input
                ref={intelInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleIntelUpload(f);
                }}
              />
              <div
                onClick={() => intelInputRef.current?.click()}
                className="cursor-pointer rounded-sm border-2 border-dashed border-slate-200 bg-slate-100 p-6 text-center transition-colors hover:border-primary/30 hover:bg-white/5"
              >
                <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground/40" />
                <p className="mt-2 text-sm text-muted-foreground">Upload competitor video for AI analysis</p>
                <p className="mt-1 text-[10px] font-mono uppercase text-muted-foreground/60">
                  Gemini 1M token context · Up to 1 hour · Shot list + pacing + viral moments
                </p>
              </div>

              {intelLoading && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-xs font-mono text-muted-foreground">Extracting intelligence...</span>
                </div>
              )}

              {intelReport && (
                <div className="space-y-3 rounded-sm border border-primary/10 bg-primary/5 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <BrainCircuit className="h-4 w-4 text-primary" />
                      Intelligence Report
                    </h3>
                    <Badge variant="outline" className="text-[10px] uppercase text-primary border-primary/30">
                      Hook Score: {intelReport.hookScore}/100
                    </Badge>
                  </div>

                  {intelReport.shotList.length > 0 && (
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Shot List</p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {intelReport.shotList.slice(0, 6).map((shot, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="shrink-0 rounded-sm bg-slate-100 px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground">{Math.floor(shot.timeStart)}s</span>
                            <span className="truncate">{shot.type}: {shot.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {intelReport.viralMoments.length > 0 && (
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Viral Moments</p>
                      {intelReport.viralMoments.map((vm, i) => (
                        <div key={i} className="mb-1 rounded-sm border border-slate-200 bg-slate-100 p-2">
                          <div className="flex items-center gap-2">
                            <Flame className="h-3 w-3 text-warning" />
                            <span className="text-[10px] font-mono text-warning">{Math.floor(vm.timestamp)}s</span>
                            <span className="text-[10px] text-muted-foreground">{vm.pattern}</span>
                          </div>
                          <p className="mt-1 text-xs">{vm.description}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {intelReport.tacticalNotes.length > 0 && (
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Tactical Notes</p>
                      {intelReport.tacticalNotes.slice(0, 3).map((note, i) => (
                        <p key={i} className="text-xs text-muted-foreground">• {note}</p>
                      ))}
                    </div>
                  )}

                  <p className="text-[9px] font-mono text-muted-foreground/60">
                    Retention Prediction: {intelReport.retentionPrediction}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* URL Analyzer */}
          <Card className="glass border-slate-200">
            <CardHeader className="py-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Remote Reconnaissance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <div className="flex gap-2">
                <Input
                  placeholder="Paste YouTube, TikTok, or any video URL..."
                  value={competitorUrl}
                  onChange={(e) => setCompetitorUrl(e.target.value)}
                  className="flex-1 bg-slate-100 border-slate-200 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleUrlAnalyze();
                  }}
                />
                <Button size="sm" onClick={() => void handleUrlAnalyze()} disabled={analyzingUrl || !competitorUrl.trim()}>
                  {analyzingUrl ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Target className="h-3.5 w-3.5" />}
                </Button>
              </div>
              {urlAnalysis && (
                <div className="max-h-64 overflow-y-auto rounded-sm border border-slate-200 bg-slate-100 p-3 text-xs whitespace-pre-wrap text-muted-foreground">
                  {urlAnalysis}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Niche Research */}
          <Card className="glass border-slate-200">
            <CardHeader className="py-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Radio className="h-4 w-4 text-primary" />
                Niche Research
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Mission</label>
                  <select
                    className="w-full rounded-sm border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-foreground outline-none"
                    value={selectedProjectId || ""}
                    onChange={(e) => setSearchParams(e.target.value ? { projectId: e.target.value } : {})}
                  >
                    <option value="">All missions</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Niche / Keyword</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. logistics recruiting, cleaning hacks, saas demos"
                      value={niche}
                      onChange={(e) => setNiche(e.target.value)}
                      className="flex-1 bg-slate-100 border-slate-200 text-xs"
                    />
                    <Button onClick={() => void handleCreateResearch()} disabled={creating || !niche.trim()} size="sm">
                      <Sparkles className="mr-2 h-3.5 w-3.5" />
                      {creating ? "Running..." : "Research"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Existing Research */}
              <div className="space-y-2">
                {research.map((r) => (
                  <div key={r.id} className="rounded-sm border border-slate-200 bg-slate-100 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{r.niche}</p>
                        <p className="text-[10px] font-mono uppercase text-muted-foreground">
                          {r.outliers.length} outliers · {r.hooks.length} hooks
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-[8px] uppercase text-primary border-primary/30">
                        Complete
                      </Badge>
                    </div>
                    {r.hooks.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {r.hooks.slice(0, 3).map((hook, i) => (
                          <p key={i} className="text-xs text-muted-foreground">• {hook}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {research.length === 0 && (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    No research in archive. Run a niche scan to populate intelligence.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">
          <Card className="glass border-slate-200">
            <CardHeader className="py-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Intelligence Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <div className="flex items-center justify-between rounded-sm border border-slate-200 bg-slate-100 p-3">
                <span className="text-xs text-muted-foreground">Research Sessions</span>
                <span className="text-sm font-display">{research.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-sm border border-slate-200 bg-slate-100 p-3">
                <span className="text-xs text-muted-foreground">Outliers Found</span>
                <span className="text-sm font-display">{research.reduce((s, r) => s + r.outliers.length, 0)}</span>
              </div>
              <div className="flex items-center justify-between rounded-sm border border-slate-200 bg-slate-100 p-3">
                <span className="text-xs text-muted-foreground">Hooks Generated</span>
                <span className="text-sm font-display">{research.reduce((s, r) => s + r.hooks.length, 0)}</span>
              </div>
              <div className="flex items-center justify-between rounded-sm border border-slate-200 bg-slate-100 p-3">
                <span className="text-xs text-muted-foreground">Videos Analyzed</span>
                <span className="text-sm font-display">{intelReport ? 1 : 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-slate-200">
            <CardHeader className="py-4">
              <CardTitle className="text-sm">Pattern Database</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              {[
                "Conflict in first 3 seconds",
                "Specific numbers in titles",
                "Transformation promises",
                "Day-in-the-life + twist",
                "Direct address to camera",
                "Silent + sound design hit",
                "Text-on-screen pacing",
              ].map((tip) => (
                <div key={tip} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="h-1 w-1 rounded-full bg-primary" />
                  {tip}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="glass border-slate-200">
            <CardHeader className="py-4">
              <CardTitle className="text-sm">Gemini Specs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0 text-[10px] font-mono text-muted-foreground">
              <p>Max duration: 1 hour</p>
              <p>Max file size: 2GB</p>
              <p>Frame sampling: ~1 FPS</p>
              <p>Context window: 1M tokens</p>
              <p>Audio analysis: Enabled</p>
              <p>Timestamp accuracy: ±1s</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
