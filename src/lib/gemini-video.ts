/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shadow Intel — Gemini Video Analysis Engine
 * Hacker workaround: Uses Gemini's 1M token video understanding
 * to analyze competitor videos and generate tactical intelligence.
 */

import { GoogleGenAI } from "@google/genai";

const apiKey =
  import.meta.env.VITE_GEMINI_API_KEY ||
  import.meta.env.GEMINI_API_KEY ||
  "";

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export interface VideoIntelReport {
  shotList: ShotItem[];
  pacingAnalysis: PacingSegment[];
  viralMoments: ViralMoment[];
  textPatterns: TextPattern[];
  colorPalette: string[];
  audioNotes: string[];
  hookScore: number;
  retentionPrediction: string;
  tacticalNotes: string[];
}

export interface ShotItem {
  timeStart: number;
  timeEnd: number;
  type: string;
  description: string;
  duration: number;
}

export interface PacingSegment {
  timeStart: number;
  timeEnd: number;
  pace: "slow" | "medium" | "fast" | "chaotic";
  note: string;
}

export interface ViralMoment {
  timestamp: number;
  description: string;
  whyItWorks: string;
  pattern: string;
}

export interface TextPattern {
  timestamp: number;
  text: string;
  style: string;
  purpose: string;
}

function getModel() {
  if (!ai) throw new Error("Gemini API key not configured. Set VITE_GEMINI_API_KEY.");
  return ai.models;
}

export async function analyzeVideoFile(
  videoFile: File,
  prompt = "Analyze this video in detail."
): Promise<string> {
  const models = getModel();
  const buffer = await videoFile.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  const mime = videoFile.type || "video/mp4";

  const result = await models.generateContent({
    model: "gemini-2.5-flash-preview-05-20",
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mime,
              data: base64,
            },
          },
        ],
      },
    ],
  });

  return result.text || "No analysis returned.";
}

export async function generateIntelReport(videoFile: File): Promise<VideoIntelReport> {
  const models = getModel();
  const buffer = await videoFile.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  const mime = videoFile.type || "video/mp4";

  const systemPrompt = `You are a tactical video intelligence analyst. Analyze the provided video and output a structured JSON report with these exact fields:

{
  "shotList": [{"timeStart": number, "timeEnd": number, "type": string, "description": string, "duration": number}],
  "pacingAnalysis": [{"timeStart": number, "timeEnd": number, "pace": "slow|medium|fast|chaotic", "note": string}],
  "viralMoments": [{"timestamp": number, "description": string, "whyItWorks": string, "pattern": string}],
  "textPatterns": [{"timestamp": number, "text": string, "style": string, "purpose": string}],
  "colorPalette": [string],
  "audioNotes": [string],
  "hookScore": number (0-100),
  "retentionPrediction": string,
  "tacticalNotes": [string]
}

Be precise with timestamps in seconds. Identify 5-10 shots, 3-5 pacing segments, 2-4 viral moments, and all visible text patterns. Rate the hook strength objectively.`;

  const result = await models.generateContent({
    model: "gemini-2.5-flash-preview-05-20",
    contents: [
      {
        role: "user",
        parts: [
          { text: systemPrompt },
          {
            inlineData: {
              mimeType: mime,
              data: base64,
            },
          },
        ],
      },
    ],
  });

  const text = result.text || "{}";
  // Extract JSON from markdown code block if present
  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;

  try {
    const parsed = JSON.parse(jsonStr) as VideoIntelReport;
    return parsed;
  } catch {
    // Fallback: return partial report with raw text
    return {
      shotList: [],
      pacingAnalysis: [],
      viralMoments: [{ timestamp: 0, description: "Raw analysis", whyItWorks: text.slice(0, 200), pattern: "unknown" }],
      textPatterns: [],
      colorPalette: ["#000000"],
      audioNotes: [],
      hookScore: 50,
      retentionPrediction: "Unable to parse structured report.",
      tacticalNotes: [text.slice(0, 500)],
    };
  }
}

export async function generateBattlePlan(
  brief: string,
  research: string,
  competitorIntel?: VideoIntelReport
): Promise<string> {
  const models = getModel();

  const prompt = `You are a video production strategist. Create a tactical battle plan for the following video project.

PROJECT BRIEF:
${brief}

VIRAL RESEARCH:
${research}

${competitorIntel ? `COMPETITOR INTELLIGENCE:
Hook Score: ${competitorIntel.hookScore}/100
Key Patterns: ${competitorIntel.viralMoments.map((v) => v.pattern).join(", ")}
Tactical Notes: ${competitorIntel.tacticalNotes.join("\n")}` : ""}

Generate a concise battle plan with:
1. HOOK STRATEGY (first 3 seconds)
2. PACING MAP (act-by-act timing)
3. SHOT PRIORITIES (must-have vs nice-to-have)
4. PLATFORM ADAPTATIONS (TikTok vs YouTube vs LinkedIn)
5. RISK FACTORS (what could fail and how to mitigate)
6. SUCCESS METRICS (what does victory look like)`;

  const result = await models.generateContent({
    model: "gemini-2.5-flash-preview-05-20",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  return result.text || "No battle plan generated.";
}

export async function analyzeCompetitorUrl(videoUrl: string): Promise<string> {
  const models = getModel();

  const prompt = `Analyze the video at this URL: ${videoUrl}

If you cannot access URLs directly, state that limitation. Otherwise provide:
1. Shot breakdown with timestamps
2. Hook analysis (first 5 seconds)
3. Text-on-screen patterns
4. Pacing notes
5. What makes this video effective or ineffective
6. Tactical recommendations for someone creating a competing video`;

  const result = await models.generateContent({
    model: "gemini-2.5-flash-preview-05-20",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  return result.text || "Unable to analyze URL. Download the video and upload it directly.";
}
