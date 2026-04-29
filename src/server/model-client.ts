import { execFile, spawnSync } from "node:child_process";
import { promisify } from "node:util";
import { GoogleGenAI } from "@google/genai";

const execFileAsync = promisify(execFile);

export interface TextModelRequest {
  model: string;
  prompt: string;
}

export interface JsonModelRequest extends TextModelRequest {
  responseSchema: unknown;
}

export interface PacketModelClient {
  generateText(request: TextModelRequest): Promise<string>;
  generateJson(request: JsonModelRequest): Promise<unknown>;
}

function readResponseText(response: { text?: string | (() => string) }): string {
  if (typeof response.text === "function") {
    return response.text();
  }

  return typeof response.text === "string" ? response.text : "";
}

export class UnavailablePacketModelClient implements PacketModelClient {
  constructor(private readonly reason: string) {}

  async generateText(): Promise<string> {
    throw new Error(this.reason);
  }

  async generateJson(): Promise<unknown> {
    throw new Error(this.reason);
  }
}

export class GeminiPacketModelClient implements PacketModelClient {
  private readonly client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async generateText(request: TextModelRequest): Promise<string> {
    const response = await this.client.models.generateContent({
      model: request.model,
      contents: request.prompt,
    });

    return readResponseText(response).trim();
  }

  async generateJson(request: JsonModelRequest): Promise<unknown> {
    const response = await this.client.models.generateContent({
      model: request.model,
      contents: request.prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: request.responseSchema,
      },
    });

    const payload = readResponseText(response);
    if (!payload) {
      return {};
    }

    return JSON.parse(payload);
  }
}

export class GeminiCliPacketModelClient implements PacketModelClient {
  private readonly geminiPath: string;

  constructor(geminiPath: string = "gemini") {
    this.geminiPath = geminiPath;
  }

  private async run(model: string, prompt: string): Promise<string> {
    const { stdout } = await execFileAsync(
      this.geminiPath,
      [
        "-p",
        prompt,
        "-o",
        "json",
        "--approval-mode",
        "plan",
        "--model",
        model,
      ],
      { timeout: 60_000, maxBuffer: 10 * 1024 * 1024 }
    );

    const parsed = JSON.parse(stdout);
    if (typeof parsed.response === "string") {
      return parsed.response.trim();
    }
    return "";
  }

  async generateText(request: TextModelRequest): Promise<string> {
    return this.run(request.model, request.prompt);
  }

  async generateJson(request: JsonModelRequest): Promise<unknown> {
    const jsonPrompt = `${request.prompt}\n\nReturn your response as a JSON object.`;
    const text = await this.run(request.model, jsonPrompt);
    if (!text) {
      return {};
    }
    // Strip markdown fences that the CLI model sometimes wraps JSON in
    const cleaned = text
      .replace(/^```json\s*/, "")
      .replace(/\s*```$/, "")
      .trim();
    return JSON.parse(cleaned);
  }
}

export function isGeminiCliAvailable(): boolean {
  try {
    const result = spawnSync("gemini", ["--version"], { encoding: "utf8", timeout: 5_000 });
    return result.status === 0;
  } catch {
    return false;
  }
}

export function getModelClientFromEnv(): PacketModelClient {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (apiKey) {
    return new GeminiPacketModelClient(apiKey);
  }

  if (isGeminiCliAvailable()) {
    return new GeminiCliPacketModelClient();
  }

  return new UnavailablePacketModelClient("Missing GEMINI_API_KEY and gemini CLI not found.");
}
