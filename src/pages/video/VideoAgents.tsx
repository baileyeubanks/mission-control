/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aether Video OS — AI Agent Fleet
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  ClipboardList,
  Cpu,
  Loader2,
  MessageSquare,
  MonitorPlay,
  PenTool,
  RefreshCcw,
  Rocket,
  ScanLine,
  Send,
  Sparkles,
  Wand2,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listAgentTasks, dispatchAgentTask, listVideoProjects } from "@/lib/video-os-client";
import type { AgentTask, VideoProject, AgentRole } from "@/lib/video-os";

const agentConfig: { role: AgentRole; label: string; description: string; icon: React.ElementType }[] = [
  { role: "co_producer", label: "Co-Producer", description: "Planning, brief analysis, production setup", icon: ClipboardList },
  { role: "co_scripter", label: "Co-Scripter", description: "Research, hooks, script drafts", icon: PenTool },
  { role: "co_editor", label: "Co-Editor", description: "Auto-cut, captions, reframe, virality", icon: Wand2 },
  { role: "co_deliverer", label: "Co-Deliverer", description: "Publishing, scheduling, analytics", icon: Rocket },
  { role: "viral_analyst", label: "Viral Analyst", description: "Outlier detection, pattern scoring", icon: ScanLine },
  { role: "thumbnail_designer", label: "Thumbnail Designer", description: "High-contrast thumbnail concepts", icon: MonitorPlay },
];

const statusTone: Record<string, string> = {
  idle: "text-muted-foreground",
  running: "text-warning",
  completed: "text-success",
  failed: "text-destructive",
  cancelled: "text-muted-foreground",
};

export function VideoAgents() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<AgentRole | null>(null);
  const [prompt, setPrompt] = useState("");
  const [dispatching, setDispatching] = useState(false);
  const projectId = searchParams.get("projectId");

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [taskList, projectList] = await Promise.all([
        listAgentTasks(projectId || undefined),
        listVideoProjects(),
      ]);
      setTasks(taskList);
      setProjects(projectList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [projectId]);

  const handleDispatch = async () => {
    if (!projectId || !selectedRole || !prompt.trim()) {
      setError("Select a project, agent, and enter a prompt.");
      return;
    }
    setDispatching(true);
    try {
      await dispatchAgentTask({ projectId, agentRole: selectedRole, prompt: prompt.trim() });
      setPrompt("");
      setSelectedRole(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dispatch failed.");
    } finally {
      setDispatching(false);
    }
  };

  const grouped = tasks.reduce<Record<string, AgentTask[]>>((acc, task) => {
    acc[task.status] = acc[task.status] || [];
    acc[task.status].push(task);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 glass-panel p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-brand-accent-glow" />
            <h1 className="text-2xl font-display tracking-[0.06em]">Agent Fleet</h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">Dispatch AI co-producers, co-scripters, co-editors, and co-deliverers</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => void refresh()} title="Refresh" className="hover:bg-slate-100">
            <RefreshCcw className="h-4 w-4 text-slate-400" />
          </Button>
        </div>
      </section>

      {/* Dispatch Panel */}
      <Card className="glass border-slate-200">
        <CardHeader className="py-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Dispatch Agent
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Project</label>
              <select
                className="w-full rounded-sm border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-foreground outline-none"
                value={projectId || ""}
                onChange={(e) => setSearchParams(e.target.value ? { projectId: e.target.value } : {})}
              >
                <option value="">Select project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Agent</label>
              <div className="flex flex-wrap gap-2">
                {agentConfig.map((agent) => (
                  <button
                    key={agent.role}
                    type="button"
                    onClick={() => setSelectedRole(agent.role)}
                    className={`flex items-center gap-2 rounded-sm border px-3 py-2 text-xs transition-colors ${
                      selectedRole === agent.role
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-slate-200 bg-slate-100 text-muted-foreground hover:bg-white/5"
                    }`}
                  >
                    <agent.icon className="h-3.5 w-3.5" />
                    {agent.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Enter task prompt... e.g. 'Extract 5 viral clips with captions'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="flex-1 bg-slate-100 border-slate-200 text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleDispatch();
                }
              }}
            />
            <Button onClick={() => void handleDispatch()} disabled={dispatching || !projectId || !selectedRole || !prompt.trim()}>
              <Send className="mr-2 h-3.5 w-3.5" />
              {dispatching ? "Dispatching..." : "Dispatch"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Task History */}
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
        <div className="space-y-3">
          {["running", "completed", "failed", "idle"].map((status) => {
            const group = grouped[status] || [];
            if (group.length === 0) return null;
            return (
              <Card key={status} className="glass border-slate-200">
                <CardHeader className="py-4">
                  <div className="flex items-center gap-2">
                    {status === "running" && <Loader2 className="h-4 w-4 text-warning animate-spin" />}
                    {status === "completed" && <CheckCircle2 className="h-4 w-4 text-success" />}
                    {status === "failed" && <XCircle className="h-4 w-4 text-destructive" />}
                    {status === "idle" && <BrainCircuit className="h-4 w-4 text-muted-foreground" />}
                    <CardTitle className="text-sm capitalize">{status}</CardTitle>
                    <Badge variant="outline" className="ml-auto text-[8px] uppercase">
                      {group.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-2 p-4 pt-0 md:grid-cols-2">
                  {group.map((task) => (
                    <div key={task.id} className="rounded-sm border border-slate-200 bg-slate-100 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{task.prompt.slice(0, 80)}{task.prompt.length > 80 ? "..." : ""}</p>
                        <Badge variant="outline" className={`shrink-0 text-[8px] uppercase ${statusTone[task.status]}`}>
                          {task.status}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                        <span>{task.agentRole.replace(/_/g, "-")}</span>
                        <span>·</span>
                        <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                      </div>
                      {task.result && (
                        <p className="mt-2 text-xs text-muted-foreground border-t border-slate-200 pt-2">{task.result}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
          {tasks.length === 0 && (
            <div className="rounded-sm border border-slate-200 bg-slate-100 p-12 text-center">
              <Cpu className="mx-auto h-8 w-8 text-muted-foreground/30" />
              <p className="mt-3 text-sm text-muted-foreground">No agent tasks yet.</p>
              <p className="mt-1 text-xs text-muted-foreground">Select a project and agent, then dispatch a task.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
