/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aether Video OS — Type Definitions
 * Co-Produce · Co-Script · Co-Cut · Co-Deliver
 */

export type VideoProjectStatus =
  | "ideation"
  | "research"
  | "scripting"
  | "production"
  | "editing"
  | "review"
  | "delivering"
  | "published"
  | "archived";

export type VideoAssetType =
  | "raw_footage"
  | "clip"
  | "script"
  | "storyboard"
  | "audio"
  | "graphic"
  | "caption"
  | "export"
  | "thumbnail";

export type VideoPlatform =
  | "youtube"
  | "tiktok"
  | "instagram_reels"
  | "instagram_feed"
  | "x_twitter"
  | "linkedin"
  | "facebook"
  | "wistia"
  | "custom";

export type AgentRole =
  | "co_producer"
  | "co_scripter"
  | "co_editor"
  | "co_deliverer"
  | "viral_analyst"
  | "thumbnail_designer";

export type AgentTaskStatus = "idle" | "running" | "completed" | "failed" | "cancelled";

export interface VideoProject {
  id: string;
  name: string;
  description: string;
  status: VideoProjectStatus;
  accountId: "content-co-op" | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  thumbnailUrl: string | null;
  targetPlatforms: VideoPlatform[];
  tags: string[];
  briefId: string | null;
  scriptId: string | null;
}

export interface VideoAsset {
  id: string;
  projectId: string;
  name: string;
  type: VideoAssetType;
  url: string | null;
  storagePath: string | null;
  durationSec: number | null;
  transcript: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  version: number;
  parentAssetId: string | null;
}

export interface TimelineComment {
  id: string;
  assetId: string;
  projectId: string;
  authorId: string;
  authorName: string;
  timecodeSec: number;
  text: string;
  resolved: boolean;
  replies: TimelineReply[];
  createdAt: string;
}

export interface TimelineReply {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface AgentTask {
  id: string;
  projectId: string;
  agentRole: AgentRole;
  prompt: string;
  status: AgentTaskStatus;
  result: string | null;
  artifacts: VideoAsset[];
  createdAt: string;
  completedAt: string | null;
}

export interface ViralResearchResult {
  id: string;
  projectId: string;
  niche: string;
  outliers: ViralOutlier[];
  hooks: string[];
  scriptDraft: string | null;
  createdAt: string;
}

export interface ViralOutlier {
  title: string;
  channel: string;
  views: number;
  uploadDate: string;
  whyItWorked: string;
  patternTags: string[];
}

export interface DeliveryPackage {
  id: string;
  projectId: string;
  assetId: string;
  platform: VideoPlatform;
  title: string;
  description: string;
  tags: string[];
  scheduledAt: string | null;
  publishedAt: string | null;
  publishUrl: string | null;
  analytics: PlatformAnalytics | null;
  status: "draft" | "scheduled" | "published" | "failed";
}

export interface PlatformAnalytics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  watchTimeSec: number;
  ctrPercent: number;
  collectedAt: string;
}

export interface VideoOSBootstrap {
  projects: VideoProject[];
  recentAssets: VideoAsset[];
  activeAgents: AgentTask[];
  deliveries: DeliveryPackage[];
  research: ViralResearchResult[];
}

export interface VideoProjectEnvelope<T = unknown> {
  data: T;
  meta: {
    projectId?: string;
    timestamp: string;
  };
}
