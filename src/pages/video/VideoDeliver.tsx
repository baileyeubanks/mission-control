/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aether Video OS — Co-Deliver Publishing Hub
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clapperboard,
  ExternalLink,
  Globe,
  Instagram,
  LayoutGrid,
  Linkedin,
  Loader2,
  MonitorPlay,
  Plus,
  RefreshCcw,
  Rocket,
  Send,
  Twitter,
  Video,
  Youtube,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listDeliveries, createDelivery, listVideoProjects, listVideoAssets } from "@/lib/video-os-client";
import type { DeliveryPackage, VideoProject, VideoAsset, VideoPlatform } from "@/lib/video-os";

const platformIcons: Record<VideoPlatform, React.ElementType> = {
  youtube: Youtube,
  tiktok: Video,
  instagram_reels: Instagram,
  instagram_feed: Instagram,
  x_twitter: Twitter,
  linkedin: Linkedin,
  facebook: Globe,
  wistia: MonitorPlay,
  custom: LayoutGrid,
};

const platformLabels: Record<VideoPlatform, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram_reels: "Instagram Reels",
  instagram_feed: "Instagram Feed",
  x_twitter: "X / Twitter",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  wistia: "Wistia",
  custom: "Custom",
};

export function VideoDeliver() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [assets, setAssets] = useState<VideoAsset[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const projectId = searchParams.get("projectId");

  // Form state
  const [formPlatform, setFormPlatform] = useState<VideoPlatform>("youtube");
  const [formAssetId, setFormAssetId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formScheduled, setFormScheduled] = useState("");

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [deliveryList, projectList] = await Promise.all([
        listDeliveries(projectId || undefined),
        listVideoProjects(),
      ]);
      setDeliveries(deliveryList);
      setProjects(projectList);
      if (projectId) {
        const assetList = await listVideoAssets(projectId);
        setAssets(assetList);
      } else {
        setAssets([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load deliveries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [projectId]);

  const handleCreate = async () => {
    if (!projectId || !formAssetId || !formTitle) {
      setError("Project, asset, and title are required.");
      return;
    }
    setCreating(true);
    try {
      await createDelivery({
        projectId,
        assetId: formAssetId,
        platform: formPlatform,
        title: formTitle,
        description: formDesc,
        tags: formTags.split(",").map((t) => t.trim()).filter(Boolean),
        scheduledAt: formScheduled ? new Date(formScheduled).toISOString() : null,
        status: formScheduled ? "scheduled" : "draft",
      });
      setShowForm(false);
      setFormTitle("");
      setFormDesc("");
      setFormTags("");
      setFormScheduled("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create delivery.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 glass-panel p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-brand-accent-glow" />
            <h1 className="text-2xl font-display tracking-[0.06em]">Co-Deliver</h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">Multi-platform publishing · Scheduling · Analytics rollup</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("http://127.0.0.1:4304", "_blank")}
            className="font-mono text-[10px] uppercase tracking-widest border-slate-200 hover:bg-slate-100"
          >
            <ExternalLink className="mr-2 h-3.5 w-3.5" />
            Open Co-Deliver
          </Button>
          <Button variant="ghost" size="icon" onClick={() => void refresh()} title="Refresh" className="hover:bg-slate-100">
            <RefreshCcw className="h-4 w-4 text-slate-400" />
          </Button>
        </div>
      </section>

      {/* Project Selector */}
      <Card className="glass border-slate-200">
        <CardContent className="flex items-center gap-3 p-4">
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Project</span>
          <select
            className="flex-1 rounded-sm border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50"
            value={projectId || ""}
            onChange={(e) => setSearchParams(e.target.value ? { projectId: e.target.value } : {})}
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <Button size="sm" onClick={() => setShowForm(!showForm)} disabled={!projectId}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            New Package
          </Button>
        </CardContent>
      </Card>

      {/* Create Form */}
      {showForm && projectId && (
        <Card className="glass border-primary/20">
          <CardHeader className="py-4">
            <CardTitle className="text-sm">New Delivery Package</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 pt-0 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Platform</label>
              <select
                className="w-full rounded-sm border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-foreground outline-none"
                value={formPlatform}
                onChange={(e) => setFormPlatform(e.target.value as VideoPlatform)}
              >
                {Object.entries(platformLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Asset</label>
              <select
                className="w-full rounded-sm border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-foreground outline-none"
                value={formAssetId}
                onChange={(e) => setFormAssetId(e.target.value)}
              >
                <option value="">Select asset...</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Title</label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="bg-slate-100 border-slate-200 text-xs" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Description</label>
              <Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className="bg-slate-100 border-slate-200 text-xs" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Tags (comma separated)</label>
              <Input value={formTags} onChange={(e) => setFormTags(e.target.value)} className="bg-slate-100 border-slate-200 text-xs" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Schedule (optional)</label>
              <Input
                type="datetime-local"
                value={formScheduled}
                onChange={(e) => setFormScheduled(e.target.value)}
                className="bg-slate-100 border-slate-200 text-xs"
              />
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <Button size="sm" onClick={() => void handleCreate()} disabled={creating}>
                <Send className="mr-2 h-3.5 w-3.5" />
                {creating ? "Creating..." : "Create Package"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary/60" />
        </div>
      ) : error ? (
        <Card className="glass border-destructive/20">
          <CardContent className="flex items-center gap-3 p-5">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="text-sm">{error}</span>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1fr_0.4fr]">
          <div className="space-y-3">
            {deliveries.map((d) => {
              const Icon = platformIcons[d.platform];
              return (
                <Card key={d.id} className="glass border-slate-200">
                  <CardContent className="flex items-start justify-between gap-4 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-slate-200 bg-slate-100">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{d.title}</p>
                        <p className="mt-0.5 text-[10px] font-mono uppercase text-muted-foreground">
                          {platformLabels[d.platform]} · {d.status}
                        </p>
                        {d.scheduledAt && (
                          <p className="mt-1 text-[10px] font-mono text-warning">
                            <CalendarClock className="inline h-3 w-3 mr-1" />
                            {new Date(d.scheduledAt).toLocaleString()}
                          </p>
                        )}
                        {d.publishUrl && (
                          <a
                            href={d.publishUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-[10px] font-mono text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View Live
                          </a>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-[8px] uppercase ${
                        d.status === "published"
                          ? "text-success border-success/30"
                          : d.status === "scheduled"
                          ? "text-warning border-warning/30"
                          : "text-muted-foreground"
                      }`}
                    >
                      {d.status}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
            {deliveries.length === 0 && (
              <div className="rounded-sm border border-slate-200 bg-slate-100 p-12 text-center">
                <Rocket className="mx-auto h-8 w-8 text-muted-foreground/30" />
                <p className="mt-3 text-sm text-muted-foreground">No delivery packages yet.</p>
                <p className="mt-1 text-xs text-muted-foreground">Select a project and create a package to publish.</p>
              </div>
            )}
          </div>

          {/* Analytics Sidebar */}
          <div className="space-y-3">
            <Card className="glass border-slate-200">
              <CardHeader className="py-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4 pt-0">
                {deliveries.some((d) => d.analytics) ? (
                  deliveries
                    .filter((d) => d.analytics)
                    .map((d) => (
                      <div key={d.id} className="rounded-sm border border-slate-200 bg-slate-100 p-3">
                        <p className="text-xs font-medium">{d.title}</p>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] font-mono text-muted-foreground">
                          <span>Views: {d.analytics?.views}</span>
                          <span>Likes: {d.analytics?.likes}</span>
                          <span>Comments: {d.analytics?.comments}</span>
                          <span>CTR: {d.analytics?.ctrPercent}%</span>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">No analytics collected yet.</p>
                    <p className="mt-1 text-[9px] font-mono uppercase text-muted-foreground">Publish to start tracking.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
