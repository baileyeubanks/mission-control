/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aether Video OS — Frontend API Client
 */

import type {
  AgentTask,
  DeliveryPackage,
  TimelineComment,
  VideoAsset,
  VideoOSBootstrap,
  VideoProject,
  VideoProjectEnvelope,
  ViralResearchResult,
} from "./video-os";

async function parseJson<T>(response: Response, fallback: string): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || fallback);
  }
  return payload;
}

export async function getVideoOSBootstrap(): Promise<VideoOSBootstrap> {
  return parseJson<VideoOSBootstrap>(
    await fetch("/api/video-os/bootstrap"),
    "Failed to load Video OS bootstrap.",
  );
}

export async function listVideoProjects(): Promise<VideoProject[]> {
  const payload = await parseJson<VideoProjectEnvelope<VideoProject[]>>(
    await fetch("/api/video-os/projects"),
    "Failed to load video projects.",
  );
  return Array.isArray(payload.data) ? payload.data : [];
}

export async function getVideoProject(projectId: string): Promise<VideoProject> {
  const payload = await parseJson<VideoProjectEnvelope<VideoProject>>(
    await fetch(`/api/video-os/projects/${encodeURIComponent(projectId)}`),
    "Failed to load video project.",
  );
  return payload.data;
}

export async function createVideoProject(input: Partial<VideoProject>): Promise<VideoProject> {
  const payload = await parseJson<VideoProjectEnvelope<VideoProject>>(
    await fetch("/api/video-os/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
    "Failed to create video project.",
  );
  return payload.data;
}

export async function updateVideoProject(
  projectId: string,
  input: Partial<VideoProject>,
): Promise<VideoProject> {
  const payload = await parseJson<VideoProjectEnvelope<VideoProject>>(
    await fetch(`/api/video-os/projects/${encodeURIComponent(projectId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
    "Failed to update video project.",
  );
  return payload.data;
}

export async function listVideoAssets(projectId: string): Promise<VideoAsset[]> {
  const payload = await parseJson<VideoProjectEnvelope<VideoAsset[]>>(
    await fetch(`/api/video-os/projects/${encodeURIComponent(projectId)}/assets`),
    "Failed to load video assets.",
  );
  return Array.isArray(payload.data) ? payload.data : [];
}

export async function createVideoAsset(input: Partial<VideoAsset>): Promise<VideoAsset> {
  const payload = await parseJson<VideoProjectEnvelope<VideoAsset>>(
    await fetch("/api/video-os/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
    "Failed to create video asset.",
  );
  return payload.data;
}

export async function listTimelineComments(assetId: string): Promise<TimelineComment[]> {
  const payload = await parseJson<VideoProjectEnvelope<TimelineComment[]>>(
    await fetch(`/api/video-os/assets/${encodeURIComponent(assetId)}/comments`),
    "Failed to load timeline comments.",
  );
  return Array.isArray(payload.data) ? payload.data : [];
}

export async function createTimelineComment(
  assetId: string,
  input: { timecodeSec: number; text: string },
): Promise<TimelineComment> {
  const payload = await parseJson<VideoProjectEnvelope<TimelineComment>>(
    await fetch(`/api/video-os/assets/${encodeURIComponent(assetId)}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
    "Failed to create timeline comment.",
  );
  return payload.data;
}

export async function listAgentTasks(projectId?: string): Promise<AgentTask[]> {
  const url = projectId
    ? `/api/video-os/agents?projectId=${encodeURIComponent(projectId)}`
    : "/api/video-os/agents";
  const payload = await parseJson<VideoProjectEnvelope<AgentTask[]>>(
    await fetch(url),
    "Failed to load agent tasks.",
  );
  return Array.isArray(payload.data) ? payload.data : [];
}

export async function dispatchAgentTask(input: {
  projectId: string;
  agentRole: string;
  prompt: string;
}): Promise<AgentTask> {
  const payload = await parseJson<VideoProjectEnvelope<AgentTask>>(
    await fetch("/api/video-os/agents/dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
    "Failed to dispatch agent task.",
  );
  return payload.data;
}

export async function listResearch(projectId?: string): Promise<ViralResearchResult[]> {
  const url = projectId
    ? `/api/video-os/research?projectId=${encodeURIComponent(projectId)}`
    : "/api/video-os/research";
  const payload = await parseJson<VideoProjectEnvelope<ViralResearchResult[]>>(
    await fetch(url),
    "Failed to load research results.",
  );
  return Array.isArray(payload.data) ? payload.data : [];
}

export async function createResearch(input: {
  projectId: string;
  niche: string;
}): Promise<ViralResearchResult> {
  const payload = await parseJson<VideoProjectEnvelope<ViralResearchResult>>(
    await fetch("/api/video-os/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
    "Failed to create research session.",
  );
  return payload.data;
}

export async function listDeliveries(projectId?: string): Promise<DeliveryPackage[]> {
  const url = projectId
    ? `/api/video-os/deliveries?projectId=${encodeURIComponent(projectId)}`
    : "/api/video-os/deliveries";
  const payload = await parseJson<VideoProjectEnvelope<DeliveryPackage[]>>(
    await fetch(url),
    "Failed to load delivery packages.",
  );
  return Array.isArray(payload.data) ? payload.data : [];
}

export async function createDelivery(input: Partial<DeliveryPackage>): Promise<DeliveryPackage> {
  const payload = await parseJson<VideoProjectEnvelope<DeliveryPackage>>(
    await fetch("/api/video-os/deliveries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
    "Failed to create delivery package.",
  );
  return payload.data;
}
