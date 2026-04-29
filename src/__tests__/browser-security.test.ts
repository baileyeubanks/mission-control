import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function walkFiles(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const fullPath = path.join(root, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      return walkFiles(fullPath);
    }

    return fullPath;
  });
}

describe("browser security posture", () => {
  it("does not expose browser-side Gemini imports or Vite model keys", () => {
    const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const source = walkFiles(srcRoot)
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) => !file.includes(`${path.sep}server${path.sep}`))
      .filter((file) => !file.includes(`${path.sep}__tests__${path.sep}`))
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");

    // Prevent shipping the old @google/generative-ai package in client bundles.
    // @google/genai (the new SDK) is allowed for client-side video analysis.
    expect(source).not.toContain("@google/generative-ai");
    // Prevent hardcoded API keys in source
    expect(source).not.toMatch(/sk-[a-zA-Z0-9]{20,}/);
    expect(source).not.toMatch(/gho_[a-zA-Z0-9]{20,}/);
  });
});
