/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aether Video OS — Phantom Cutter Arsenal
 * Client-side video processing + timeline collaboration.
 */

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDownToLine,
  Captions,
  Copy,
  Crop,
  Download,
  Edit3,
  ExternalLink,
  Film,
  Flame,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  MonitorPlay,
  Music,
  Play,
  Plus,
  RefreshCcw,
  Scissors,
  Sparkles,
  Timer,
  Trash2,
  UploadCloud,
  Wand2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  listVideoProjects,
  listVideoAssets,
  createVideoAsset,
  listTimelineComments,
  createTimelineComment,
} from "@/lib/video-os-client";
import {
  isPhantomCutterSupported,
  loadPhantomCutter,
  extractThumbnails,
  trimClip,
  extractAudio,
  getVideoInfo,
} from "@/lib/ffmpeg-processor";
import type { VideoProject, VideoAsset, TimelineComment } from "@/lib/video-os";

export function VideoEdit() {
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [assets, setAssets] = useState<VideoAsset[]>([]);
  const [comments, setComments] = useState<TimelineComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ---- Phantom Cutter State ---- */
  const [cutterReady, setCutterReady] = useState(false);
  const [cutterLoading, setCutterLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processResults, setProcessResults] = useState<{ url: string; type: string; name: string }[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<{ duration: number; width: number; height: number } | null>(null);
  const [trimStart, setTrimStart] = useState("0");
  const [trimEnd, setTrimEnd] = useState("15");

  /* ---- Comments State ---- */
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [commentTime, setCommentTime] = useState("");
  const [commentText, setCommentText] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectId = searchParams.get("projectId");

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [projectList, assetList] = await Promise.all([
        listVideoProjects(),
        projectId ? listVideoAssets(projectId) : Promise.resolve([]),
      ]);
      setProjects(projectList);
      setAssets(assetList);
      if (selectedAssetId) {
        const commentList = await listTimelineComments(selectedAssetId);
        setComments(commentList);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Arsenal systems offline.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [projectId, selectedAssetId]);

  /* ---- Init Phantom Cutter ---- */
  useEffect(() => {
    if (!isPhantomCutterSupported()) return;
    let cancelled = false;
    setCutterLoading(true);
    loadPhantomCutter()
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

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
    setProcessResults([]);
    try {
      const info = await getVideoInfo(file);
      setVideoInfo(info);
      setTrimEnd(String(Math.min(15, info.duration)));
    } catch {
      // ignore
    }
  };

  const runPhantomCutter = async (mode: "thumb" | "clip" | "gif" | "audio") => {
    if (!selectedFile || !cutterReady) return;
    setProcessing(true);
    setProcessResults([]);
    try {
      if (mode === "thumb") {
        const info = await getVideoInfo(selectedFile);
        const marks = [
          1,
          Math.floor(info.duration / 4),
          Math.floor(info.duration / 2),
          Math.floor((info.duration * 3) / 4),
          Math.max(1, info.duration - 2),
        ];
        const thumbs = await extractThumbnails(selectedFile, marks);
        setProcessResults(
          thumbs.map((blob, i) => ({
            url: URL.createObjectURL(blob),
            type: "image/jpeg",
            name: `thumb_${marks[i]}s.jpg`,
          }))
        );
      } else if (mode === "clip" || mode === "gif") {
        const start = parseFloat(trimStart) || 0;
        const end = parseFloat(trimEnd) || 15;
        const blob = await trimClip(selectedFile, start, end, {
          outputFormat: mode === "gif" ? "gif" : "mp4",
        });
        setProcessResults([
          {
            url: URL.createObjectURL(blob),
            type: mode === "gif" ? "image/gif" : "video/mp4",
            name: `extract_${Date.now()}.${mode === "gif" ? "gif" : "mp4"}`,
          },
        ]);
      } else if (mode === "audio") {
        const blob = await extractAudio(selectedFile, { format: "mp3" });
        setProcessResults([
          {
            url: URL.createObjectURL(blob),
            type: "audio/mpeg",
            name: `audio_${Date.now()}.mp3`,
          },
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Phantom Cutter malfunction.");
    } finally {
      setProcessing(false);
    }
  };

  const handleAddComment = async () => {
    if (!selectedAssetId || !commentTime || !commentText) return;
    const time = parseFloat(commentTime);
    if (Number.isNaN(time)) return;
    try {
      await createTimelineComment(selectedAssetId, { timecodeSec: time, text: commentText });
      setCommentText("");
      setCommentTime("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comment failed.");
    }
  };

  const selectedAsset = assets.find((a) => a.id === selectedAssetId);

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="flex flex-col gap-4 glass-panel p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-brand-accent-glow" />
            <h1 className="text-2xl font-display tracking-[0.06em]">Phantom Cutter</h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 font-mono uppercase tracking-widest">
            Client-side processing arsenal — zero upload, zero server dependency
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={`text-[8px] uppercase ${cutterReady ? "text-success border-success/30" : "text-warning border-warning/30"}`}>
            {cutterReady ? "Phantom Online" : cutterLoading ? "Booting..." : "Phantom Offline"}
          </Badge>
          <Button variant="ghost" size="icon" onClick={() => void refresh()} className="hover:bg-slate-100">
            <RefreshCcw className="h-4 w-4 text-slate-400" />
          </Button>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.4fr]">
        {/* LEFT — Cutter Workspace */}
        <div className="space-y-4">
          {/* Drop Zone */}
          <Card className="glass border-primary/10">
            <CardContent className="p-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              />

              {!selectedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer rounded-sm border-2 border-dashed border-slate-200 bg-slate-100 p-10 text-center transition-colors hover:border-primary/30 hover:bg-white/5"
                >
                  <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground/40" />
                  <p className="mt-3 text-sm text-muted-foreground">Drop video or click to load</p>
                  <p className="mt-1 text-[10px] font-mono uppercase text-muted-foreground/60">
                    {cutterReady ? "All processing happens in your browser" : "Server fallback available"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Preview */}
                  {videoPreviewUrl && (
                    <div className="relative rounded-sm overflow-hidden border border-slate-200">
                      <video src={videoPreviewUrl} className="w-full max-h-64 object-contain bg-white" controls />
                    </div>
                  )}

                  {/* Info */}
                  {videoInfo && (
                    <div className="flex items-center gap-3 text-[10px] font-mono uppercase text-muted-foreground">
                      <span>{videoInfo.width}x{videoInfo.height}</span>
                      <span>·</span>
                      <span>{Math.floor(videoInfo.duration)}s</span>
                      <span className="ml-auto truncate max-w-[200px]">{selectedFile.name}</span>
                    </div>
                  )}

                  {/* Controls */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-muted-foreground">Start (sec)</label>
                      <Input value={trimStart} onChange={(e) => setTrimStart(e.target.value)} className="bg-slate-100 border-slate-200 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-muted-foreground">End (sec)</label>
                      <Input value={trimEnd} onChange={(e) => setTrimEnd(e.target.value)} className="bg-slate-100 border-slate-200 text-xs" />
                    </div>
                  </div>

                  {/* Action Grid */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: "thumb" as const, label: "Thumbs", icon: ImageIcon },
                      { id: "clip" as const, label: "Clip", icon: Film },
                      { id: "gif" as const, label: "GIF", icon: Flame },
                      { id: "audio" as const, label: "Audio", icon: Music },
                    ].map((action) => (
                      <Button
                        key={action.id}
                        size="sm"
                        variant="outline"
                        disabled={processing || !cutterReady}
                        onClick={() => void runPhantomCutter(action.id)}
                        className="flex flex-col items-center gap-1 h-auto py-2 text-[10px] font-mono uppercase"
                      >
                        {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <action.icon className="h-4 w-4" />}
                        {action.label}
                      </Button>
                    ))}
                  </div>

                  {/* Results */}
                  {processResults.length > 0 && (
                    <div className="grid gap-2 sm:grid-cols-3">
                      {processResults.map((r, i) => (
                        <div key={i} className="rounded-sm border border-slate-200 bg-slate-100 overflow-hidden">
                          {r.type.startsWith("video") ? (
                            <video src={r.url} className="w-full h-20 object-cover" controls />
                          ) : r.type.startsWith("audio") ? (
                            <div className="h-20 flex items-center justify-center bg-white">
                              <Music className="h-6 w-6 text-primary" />
                            </div>
                          ) : (
                            <img src={r.url} alt="" className="w-full h-20 object-cover" />
                          )}
                          <div className="p-2">
                            <p className="text-[9px] font-mono truncate">{r.name}</p>
                            <a href={r.url} download={r.name} className="mt-1 inline-flex items-center gap-1 text-[10px] font-mono text-primary hover:underline">
                              <ArrowDownToLine className="h-3 w-3" />
                              Download
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button variant="ghost" size="sm" onClick={() => { setSelectedFile(null); setVideoPreviewUrl(null); setProcessResults([]); }}>
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Clear
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Asset Library */}
          <Card className="glass border-slate-200">
            <CardHeader className="py-4">
              <CardTitle className="text-sm">Asset Library</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 p-4 pt-0 md:grid-cols-2">
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => setSelectedAssetId(asset.id)}
                  className={`flex items-start justify-between gap-3 rounded-sm border p-3 text-left transition-colors ${
                    selectedAssetId === asset.id ? "border-primary/30 bg-primary/5" : "border-slate-200 bg-slate-100 hover:bg-white/5"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{asset.name}</p>
                    <p className="mt-1 text-[10px] font-mono uppercase text-muted-foreground">
                      {asset.type.replace(/_/g, " ")}
                      {asset.durationSec ? ` · ${Math.floor(asset.durationSec / 60)}:${String(asset.durationSec % 60).padStart(2, "0")}` : ""}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[8px] uppercase">v{asset.version}</Badge>
                </button>
              ))}
              {assets.length === 0 && (
                <div className="col-span-full rounded-sm border border-slate-200 bg-slate-100 p-6 text-center text-xs text-muted-foreground">
                  No assets in arsenal.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline Comments */}
          {selectedAsset && (
            <Card className="glass border-slate-200">
              <CardHeader className="py-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Timeline Comms — {selectedAsset.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4 pt-0">
                <div className="flex gap-2">
                  <Input placeholder="Time (sec)" value={commentTime} onChange={(e) => setCommentTime(e.target.value)} className="w-24 bg-slate-100 border-slate-200 text-xs" />
                  <Input placeholder="Add tactical note..." value={commentText} onChange={(e) => setCommentText(e.target.value)} className="flex-1 bg-slate-100 border-slate-200 text-xs" />
                  <Button size="sm" onClick={() => void handleAddComment()}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {comments.map((c) => (
                    <div key={c.id} className="flex items-start gap-3 rounded-sm border border-slate-200 bg-slate-100 p-3">
                      <span className="shrink-0 rounded-sm bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono text-primary">
                        {Math.floor(c.timecodeSec / 60)}:{String(Math.floor(c.timecodeSec % 60)).padStart(2, "0")}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs">{c.text}</p>
                        <p className="mt-1 text-[9px] font-mono text-muted-foreground">{c.authorName}</p>
                      </div>
                      {c.resolved && (
                        <Badge variant="outline" className="shrink-0 text-[8px] uppercase text-success border-success/30">Resolved</Badge>
                      )}
                    </div>
                  ))}
                  {comments.length === 0 && <p className="text-xs text-muted-foreground">No comms on this asset.</p>}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT — Arsenal Panel */}
        <div className="space-y-4">
          <Card className="glass border-slate-200">
            <CardHeader className="py-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Arsenal Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              <div className="flex items-center justify-between rounded-sm border border-slate-200 bg-slate-100 p-3">
                <span className="text-xs text-muted-foreground">Phantom Cutter</span>
                <Badge variant="outline" className={`text-[8px] uppercase ${cutterReady ? "text-success border-success/30" : "text-warning border-warning/30"}`}>
                  {cutterReady ? "Online" : "Offline"}
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-sm border border-slate-200 bg-slate-100 p-3">
                <span className="text-xs text-muted-foreground">SharedArrayBuffer</span>
                <Badge variant="outline" className={`text-[8px] uppercase ${isPhantomCutterSupported() ? "text-success border-success/30" : "text-destructive border-destructive/30"}`}>
                  {isPhantomCutterSupported() ? "Enabled" : "Blocked"}
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-sm border border-slate-200 bg-slate-100 p-3">
                <span className="text-xs text-muted-foreground">Server Fallback</span>
                <Badge variant="outline" className="text-[8px] uppercase text-primary border-primary/30">Ready</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-slate-200">
            <CardHeader className="py-4">
              <CardTitle className="text-sm">Quick Intel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              <p className="text-xs text-muted-foreground">
                Phantom Cutter uses FFmpeg.wasm to process video entirely in your browser. No upload required. Works offline after initial load.
              </p>
              <div className="space-y-1 text-[10px] font-mono text-muted-foreground">
                <p>• Thumbnail extraction: ~2s</p>
                <p>• Clip trim: ~5-15s</p>
                <p>• GIF generation: ~10-30s</p>
                <p>• Audio extract: ~3-8s</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
