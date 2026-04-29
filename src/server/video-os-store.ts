/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aether Video OS — Local Recovery Store
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type {
  AgentTask,
  DeliveryPackage,
  TimelineComment,
  VideoAsset,
  VideoProject,
  ViralResearchResult,
} from "../lib/video-os";

const DEFAULT_STORE_DIR = path.resolve(process.cwd(), ".mission-control-recovery");
const PROJECTS_FILE = "video-projects.json";
const ASSETS_FILE = "video-assets.json";
const COMMENTS_FILE = "video-comments.json";
const AGENT_TASKS_FILE = "video-agent-tasks.json";
const RESEARCH_FILE = "video-research.json";
const DELIVERIES_FILE = "video-deliveries.json";

const SEED_PROJECTS: VideoProject[] = [
  {
    id: "video-proj-001",
    name: "Northstar Recruiting Hero",
    description: "Brand strategy video for recruiting and sales positioning.",
    status: "production",
    accountId: "content-co-op",
    createdBy: "operator",
    createdAt: "2026-04-20T10:00:00.000Z",
    updatedAt: "2026-04-28T14:30:00.000Z",
    thumbnailUrl: null,
    targetPlatforms: ["youtube", "linkedin", "instagram_reels"],
    tags: ["recruiting", "brand", "hero"],
    briefId: "cco-brief-local-001",
    scriptId: null,
  },
  {
    id: "video-proj-002",
    name: "ACS Testimonial Series",
    description: "Customer testimonial clips for social proof and ads.",
    status: "editing",
    accountId: "content-co-op",
    createdBy: "operator",
    createdAt: "2026-04-22T09:00:00.000Z",
    updatedAt: "2026-04-27T16:00:00.000Z",
    thumbnailUrl: null,
    targetPlatforms: ["tiktok", "instagram_reels", "facebook"],
    tags: ["testimonial", "social", "ads"],
    briefId: null,
    scriptId: null,
  },
  {
    id: "video-proj-003",
    name: "Viral Hook Experiment — Q2",
    description: "Sandcastles-style outlier analysis and hook testing.",
    status: "research",
    accountId: "content-co-op",
    createdBy: "operator",
    createdAt: "2026-04-28T08:00:00.000Z",
    updatedAt: "2026-04-28T08:00:00.000Z",
    thumbnailUrl: null,
    targetPlatforms: ["tiktok", "youtube", "x_twitter"],
    tags: ["viral", "experiment", "q2"],
    briefId: null,
    scriptId: null,
  },
];

const SEED_ASSETS: VideoAsset[] = [
  {
    id: "asset-001",
    projectId: "video-proj-001",
    name: "Interview A — CEO",
    type: "raw_footage",
    url: null,
    storagePath: null,
    durationSec: 847,
    transcript: null,
    metadata: { camera: "A7SIII", codec: "H.265" },
    createdAt: "2026-04-20T11:00:00.000Z",
    updatedAt: "2026-04-20T11:00:00.000Z",
    createdBy: "operator",
    version: 1,
    parentAssetId: null,
  },
  {
    id: "asset-002",
    projectId: "video-proj-001",
    name: "B-Roll — Office",
    type: "raw_footage",
    url: null,
    storagePath: null,
    durationSec: 320,
    transcript: null,
    metadata: { camera: "A7SIII", codec: "H.265" },
    createdAt: "2026-04-20T12:00:00.000Z",
    updatedAt: "2026-04-20T12:00:00.000Z",
    createdBy: "operator",
    version: 1,
    parentAssetId: null,
  },
  {
    id: "asset-003",
    projectId: "video-proj-002",
    name: "Testimonial — Maya T.",
    type: "clip",
    url: null,
    storagePath: null,
    durationSec: 45,
    transcript: "Astro Cleaning made our move-out stress free...",
    metadata: { viralityScore: 72, platform: "tiktok" },
    createdAt: "2026-04-22T10:00:00.000Z",
    updatedAt: "2026-04-27T16:00:00.000Z",
    createdBy: "operator",
    version: 2,
    parentAssetId: "asset-004",
  },
  {
    id: "asset-004",
    projectId: "video-proj-002",
    name: "Testimonial — Maya T. (raw)",
    type: "raw_footage",
    url: null,
    storagePath: null,
    durationSec: 180,
    transcript: null,
    metadata: {},
    createdAt: "2026-04-22T09:30:00.000Z",
    updatedAt: "2026-04-22T09:30:00.000Z",
    createdBy: "operator",
    version: 1,
    parentAssetId: null,
  },
];

const SEED_COMMENTS: TimelineComment[] = [
  {
    id: "comment-001",
    assetId: "asset-001",
    projectId: "video-proj-001",
    authorId: "operator",
    authorName: "Operator",
    timecodeSec: 124,
    text: "Great energy here. Use this as the opening hook.",
    resolved: false,
    replies: [],
    createdAt: "2026-04-21T10:00:00.000Z",
  },
];

const SEED_AGENT_TASKS: AgentTask[] = [
  {
    id: "agent-task-001",
    projectId: "video-proj-003",
    agentRole: "viral_analyst",
    prompt: "Analyze Q2 viral hooks in logistics/recruiting niche. Find 5 outliers with >1M views.",
    status: "completed",
    result: "Found 5 outliers. Top pattern: 'day in the life' + conflict in first 3 seconds.",
    artifacts: [],
    createdAt: "2026-04-28T08:05:00.000Z",
    completedAt: "2026-04-28T08:15:00.000Z",
  },
  {
    id: "agent-task-002",
    projectId: "video-proj-002",
    agentRole: "co_editor",
    prompt: "Auto-cut Maya testimonial into 3 TikTok-ready clips with captions.",
    status: "running",
    result: null,
    artifacts: [],
    createdAt: "2026-04-27T16:05:00.000Z",
    completedAt: null,
  },
];

const SEED_RESEARCH: ViralResearchResult[] = [
  {
    id: "research-001",
    projectId: "video-proj-003",
    niche: "logistics recruiting",
    outliers: [
      {
        title: "I quit my desk job for a warehouse gig — here's what happened",
        channel: "WorkReality",
        views: 3400000,
        uploadDate: "2026-03-15",
        whyItWorked: "Immediate conflict + transformation promise in first 3 seconds.",
        patternTags: ["conflict", "transformation", "day-in-life"],
      },
      {
        title: "This company hired 500 people in 30 days. Their secret?",
        channel: "HiringHacks",
        views: 1200000,
        uploadDate: "2026-04-01",
        whyItWorked: "Specific number + curiosity gap drives retention.",
        patternTags: ["specificity", "curiosity-gap", "social-proof"],
      },
    ],
    hooks: [
      "I thought logistics was boring until I saw the paycheck...",
      "This company hires faster than you can swipe right.",
      "Day 1 vs Day 30 in a warehouse. You won't believe the difference.",
    ],
    scriptDraft: null,
    createdAt: "2026-04-28T08:15:00.000Z",
  },
];

const SEED_DELIVERIES: DeliveryPackage[] = [
  {
    id: "delivery-001",
    projectId: "video-proj-002",
    assetId: "asset-003",
    platform: "tiktok",
    title: "Move-out made easy ✨",
    description: "Real customer. Real results. #cleaning #moving #austin",
    tags: ["cleaning", "moving", "austin", "testimonial"],
    scheduledAt: "2026-04-29T09:00:00.000Z",
    publishedAt: null,
    publishUrl: null,
    analytics: null,
    status: "scheduled",
  },
];

function loadStore<T>(storeDir: string, fileName: string, seed: T[]): T[] {
  const filePath = path.join(storeDir, fileName);
  if (existsSync(filePath)) {
    try {
      const raw = readFileSync(filePath, "utf-8");
      return JSON.parse(raw) as T[];
    } catch {
      return seed;
    }
  }
  return seed;
}

function saveStore<T>(storeDir: string, fileName: string, data: T[]): void {
  if (!existsSync(storeDir)) mkdirSync(storeDir, { recursive: true });
  writeFileSync(path.join(storeDir, fileName), JSON.stringify(data, null, 2), "utf-8");
}

export class VideoOSStore {
  private storeDir: string;
  private projects: VideoProject[];
  private assets: VideoAsset[];
  private comments: TimelineComment[];
  private agentTasks: AgentTask[];
  private research: ViralResearchResult[];
  private deliveries: DeliveryPackage[];

  constructor(storeDir = DEFAULT_STORE_DIR) {
    this.storeDir = storeDir;
    this.projects = loadStore(storeDir, PROJECTS_FILE, SEED_PROJECTS);
    this.assets = loadStore(storeDir, ASSETS_FILE, SEED_ASSETS);
    this.comments = loadStore(storeDir, COMMENTS_FILE, SEED_COMMENTS);
    this.agentTasks = loadStore(storeDir, AGENT_TASKS_FILE, SEED_AGENT_TASKS);
    this.research = loadStore(storeDir, RESEARCH_FILE, SEED_RESEARCH);
    this.deliveries = loadStore(storeDir, DELIVERIES_FILE, SEED_DELIVERIES);
  }

  private save() {
    saveStore(this.storeDir, PROJECTS_FILE, this.projects);
    saveStore(this.storeDir, ASSETS_FILE, this.assets);
    saveStore(this.storeDir, COMMENTS_FILE, this.comments);
    saveStore(this.storeDir, AGENT_TASKS_FILE, this.agentTasks);
    saveStore(this.storeDir, RESEARCH_FILE, this.research);
    saveStore(this.storeDir, DELIVERIES_FILE, this.deliveries);
  }

  // Projects
  listProjects(): VideoProject[] {
    return this.projects.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  }

  getProject(id: string): VideoProject | undefined {
    return this.projects.find((p) => p.id === id);
  }

  createProject(input: Partial<VideoProject>): VideoProject {
    const project: VideoProject = {
      id: input.id || `video-proj-${Date.now()}`,
      name: input.name || "Untitled Project",
      description: input.description || "",
      status: input.status || "ideation",
      accountId: input.accountId ?? "content-co-op",
      createdBy: input.createdBy || "operator",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      thumbnailUrl: input.thumbnailUrl ?? null,
      targetPlatforms: input.targetPlatforms ?? [],
      tags: input.tags ?? [],
      briefId: input.briefId ?? null,
      scriptId: input.scriptId ?? null,
    };
    this.projects.push(project);
    this.save();
    return project;
  }

  updateProject(id: string, input: Partial<VideoProject>): VideoProject | undefined {
    const idx = this.projects.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    this.projects[idx] = { ...this.projects[idx], ...input, updatedAt: new Date().toISOString() };
    this.save();
    return this.projects[idx];
  }

  // Assets
  listAssets(projectId?: string): VideoAsset[] {
    const assets = this.assets.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
    return projectId ? assets.filter((a) => a.projectId === projectId) : assets;
  }

  createAsset(input: Partial<VideoAsset>): VideoAsset {
    const asset: VideoAsset = {
      id: input.id || `asset-${Date.now()}`,
      projectId: input.projectId || "",
      name: input.name || "Untitled Asset",
      type: input.type || "raw_footage",
      url: input.url ?? null,
      storagePath: input.storagePath ?? null,
      durationSec: input.durationSec ?? null,
      transcript: input.transcript ?? null,
      metadata: input.metadata ?? {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: input.createdBy || "operator",
      version: input.version ?? 1,
      parentAssetId: input.parentAssetId ?? null,
    };
    this.assets.push(asset);
    this.save();
    return asset;
  }

  // Comments
  listComments(assetId?: string): TimelineComment[] {
    return assetId ? this.comments.filter((c) => c.assetId === assetId) : this.comments;
  }

  createComment(assetId: string, input: { timecodeSec: number; text: string; authorId?: string; authorName?: string }): TimelineComment {
    const comment: TimelineComment = {
      id: `comment-${Date.now()}`,
      assetId,
      projectId: this.assets.find((a) => a.id === assetId)?.projectId || "",
      authorId: input.authorId || "operator",
      authorName: input.authorName || "Operator",
      timecodeSec: input.timecodeSec,
      text: input.text,
      resolved: false,
      replies: [],
      createdAt: new Date().toISOString(),
    };
    this.comments.push(comment);
    this.save();
    return comment;
  }

  // Agent tasks
  listAgentTasks(projectId?: string): AgentTask[] {
    return projectId ? this.agentTasks.filter((t) => t.projectId === projectId) : this.agentTasks;
  }

  dispatchAgentTask(input: { projectId: string; agentRole: string; prompt: string }): AgentTask {
    const task: AgentTask = {
      id: `agent-task-${Date.now()}`,
      projectId: input.projectId,
      agentRole: input.agentRole as AgentTask["agentRole"],
      prompt: input.prompt,
      status: "running",
      result: null,
      artifacts: [],
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    this.agentTasks.push(task);
    this.save();
    return task;
  }

  // Research
  listResearch(projectId?: string): ViralResearchResult[] {
    return projectId ? this.research.filter((r) => r.projectId === projectId) : this.research;
  }

  createResearch(input: { projectId: string; niche: string }): ViralResearchResult {
    const research: ViralResearchResult = {
      id: `research-${Date.now()}`,
      projectId: input.projectId,
      niche: input.niche,
      outliers: [],
      hooks: [],
      scriptDraft: null,
      createdAt: new Date().toISOString(),
    };
    this.research.push(research);
    this.save();
    return research;
  }

  // Deliveries
  listDeliveries(projectId?: string): DeliveryPackage[] {
    return projectId ? this.deliveries.filter((d) => d.projectId === projectId) : this.deliveries;
  }

  createDelivery(input: Partial<DeliveryPackage>): DeliveryPackage {
    const delivery: DeliveryPackage = {
      id: input.id || `delivery-${Date.now()}`,
      projectId: input.projectId || "",
      assetId: input.assetId || "",
      platform: input.platform || "custom",
      title: input.title || "Untitled Delivery",
      description: input.description || "",
      tags: input.tags ?? [],
      scheduledAt: input.scheduledAt ?? null,
      publishedAt: input.publishedAt ?? null,
      publishUrl: input.publishUrl ?? null,
      analytics: input.analytics ?? null,
      status: input.status || "draft",
    };
    this.deliveries.push(delivery);
    this.save();
    return delivery;
  }

  // Bootstrap
  getBootstrap() {
    return {
      projects: this.listProjects(),
      recentAssets: this.listAssets().slice(0, 10),
      activeAgents: this.listAgentTasks().filter((t) => t.status === "running"),
      deliveries: this.listDeliveries(),
      research: this.listResearch(),
    };
  }
}

let defaultStore: VideoOSStore | null = null;
export function getVideoOSStore(): VideoOSStore {
  if (!defaultStore) defaultStore = new VideoOSStore();
  return defaultStore;
}
