/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phantom Cutter — FFmpeg.wasm Client-Side Video Processor
 * Hacker workaround: processes video in-browser without upload.
 * Falls back to server-side for large files or incompatible browsers.
 */

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

export interface ProcessingProgress {
  ratio: number;
  time?: number;
}

export interface ProcessorOptions {
  onProgress?: (progress: ProcessingProgress) => void;
  onLog?: (log: string) => void;
}

function checkSharedArrayBuffer(): boolean {
  try {
    return typeof SharedArrayBuffer !== "undefined";
  } catch {
    return false;
  }
}

export function isPhantomCutterSupported(): boolean {
  return checkSharedArrayBuffer();
}

export async function loadPhantomCutter(options?: ProcessorOptions): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (loadPromise) return loadPromise;

  if (!isPhantomCutterSupported()) {
    throw new Error(
      "Phantom Cutter requires SharedArrayBuffer. " +
        "Ensure COOP/COEP headers are set, or use server-side fallback."
    );
  }

  loadPromise = (async () => {
    const ffmpeg = new FFmpeg();
    if (options?.onLog) {
      ffmpeg.on("log", ({ message }) => options.onLog!(message));
    }
    if (options?.onProgress) {
      ffmpeg.on("progress", ({ progress, time }) => {
        options.onProgress!({ ratio: Math.min(progress, 1), time });
      });
    }
    await ffmpeg.load({
      coreURL: "/ffmpeg-core/ffmpeg-core.js",
      wasmURL: "/ffmpeg-core/ffmpeg-core.wasm",
    });
    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  return loadPromise;
}

export async function extractThumbnail(
  videoFile: File,
  timeSec: number,
  opts?: ProcessorOptions
): Promise<Blob> {
  const ffmpeg = await loadPhantomCutter(opts);
  const inputName = "input" + getExt(videoFile.name);
  const outputName = `thumb_${Date.now()}.jpg`;

  await ffmpeg.writeFile(inputName, await fetchFile(videoFile));
  await ffmpeg.exec([
    "-i", inputName,
    "-ss", String(timeSec),
    "-frames:v", "1",
    "-q:v", "2",
    outputName,
  ]);

  const data = await ffmpeg.readFile(outputName);
  await cleanup(ffmpeg, [inputName, outputName]);

  return new Blob([data], { type: "image/jpeg" });
}

export async function extractThumbnails(
  videoFile: File,
  marksSec: number[],
  opts?: ProcessorOptions
): Promise<Blob[]> {
  const ffmpeg = await loadPhantomCutter(opts);
  const inputName = "input" + getExt(videoFile.name);
  await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

  const outputNames = marksSec.map((_, i) => `thumb_${i}.jpg`);
  for (let i = 0; i < marksSec.length; i++) {
    await ffmpeg.exec([
      "-i", inputName,
      "-ss", String(marksSec[i]),
      "-frames:v", "1",
      "-q:v", "2",
      outputNames[i],
    ]);
  }

  const blobs: Blob[] = [];
  for (const name of outputNames) {
    const data = await ffmpeg.readFile(name);
    blobs.push(new Blob([data], { type: "image/jpeg" }));
  }

  await cleanup(ffmpeg, [inputName, ...outputNames]);
  return blobs;
}

export async function trimClip(
  videoFile: File,
  startSec: number,
  endSec: number,
  opts?: ProcessorOptions & { outputFormat?: "mp4" | "webm" | "gif" }
): Promise<Blob> {
  const ffmpeg = await loadPhantomCutter(opts);
  const inputName = "input" + getExt(videoFile.name);
  const ext = opts?.outputFormat || "mp4";
  const outputName = `clip_${Date.now()}.${ext}`;
  const duration = endSec - startSec;

  await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

  if (ext === "gif") {
    await ffmpeg.exec([
      "-i", inputName,
      "-ss", String(startSec),
      "-t", String(duration),
      "-vf", "fps=10,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer",
      "-loop", "0",
      outputName,
    ]);
  } else {
    await ffmpeg.exec([
      "-i", inputName,
      "-ss", String(startSec),
      "-t", String(duration),
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-crf", "23",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "-an",
      outputName,
    ]);
  }

  const data = await ffmpeg.readFile(outputName);
  await cleanup(ffmpeg, [inputName, outputName]);

  return new Blob([data], { type: ext === "gif" ? "image/gif" : `video/${ext}` });
}

export async function extractAudio(
  videoFile: File,
  opts?: ProcessorOptions & { format?: "mp3" | "wav" | "aac" }
): Promise<Blob> {
  const ffmpeg = await loadPhantomCutter(opts);
  const inputName = "input" + getExt(videoFile.name);
  const fmt = opts?.format || "mp3";
  const outputName = `audio_${Date.now()}.${fmt}`;

  await ffmpeg.writeFile(inputName, await fetchFile(videoFile));
  await ffmpeg.exec([
    "-i", inputName,
    "-vn",
    "-ar", "44100",
    "-ac", "2",
    "-b:a", "192k",
    outputName,
  ]);

  const data = await ffmpeg.readFile(outputName);
  await cleanup(ffmpeg, [inputName, outputName]);

  const mime: Record<string, string> = { mp3: "audio/mpeg", wav: "audio/wav", aac: "audio/aac" };
  return new Blob([data], { type: mime[fmt] || "audio/mpeg" });
}

export async function getVideoInfo(
  videoFile: File,
  opts?: ProcessorOptions
): Promise<{ duration: number; width: number; height: number; fps: number; bitrate: number }> {
  const ffmpeg = await loadPhantomCutter(opts);
  const inputName = "input" + getExt(videoFile.name);
  await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

  let output = "";
  ffmpeg.on("log", ({ message }) => {
    output += message + "\n";
  });

  await ffmpeg.exec(["-i", inputName, "-f", "null", "-"]);
  await cleanup(ffmpeg, [inputName]);

  const durationMatch = output.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
  const duration = durationMatch
    ? parseInt(durationMatch[1]) * 3600 + parseInt(durationMatch[2]) * 60 + parseFloat(durationMatch[3])
    : 0;

  const streamMatch = output.match(/Stream.*Video:.* (\d+)x(\d+).*?(\d+(?:\.\d+)?) fps/);
  const width = streamMatch ? parseInt(streamMatch[1]) : 0;
  const height = streamMatch ? parseInt(streamMatch[2]) : 0;
  const fps = streamMatch ? parseFloat(streamMatch[3]) : 0;

  const bitrateMatch = output.match(/bitrate: (\d+) kb\/s/);
  const bitrate = bitrateMatch ? parseInt(bitrateMatch[1]) : 0;

  return { duration, width, height, fps, bitrate };
}

export async function batchGenerateClips(
  videoFile: File,
  clips: { start: number; end: number; label: string }[],
  opts?: ProcessorOptions
): Promise<{ label: string; blob: Blob }[]> {
  const results: { label: string; blob: Blob }[] = [];
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    opts?.onProgress?.({ ratio: i / clips.length });
    const blob = await trimClip(videoFile, clip.start, clip.end, { ...opts, outputFormat: "mp4" });
    results.push({ label: clip.label, blob });
  }
  opts?.onProgress?.({ ratio: 1 });
  return results;
}

function getExt(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > -1 ? name.slice(dot) : ".mp4";
}

async function cleanup(ffmpeg: FFmpeg, files: string[]) {
  for (const f of files) {
    try {
      await ffmpeg.deleteFile(f);
    } catch {
      // ignore
    }
  }
}
