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

    expect(source).not.toContain("@google/generative-ai");
    expect(source).not.toContain("VITE_GEMINI_API_KEY");
  });
});
