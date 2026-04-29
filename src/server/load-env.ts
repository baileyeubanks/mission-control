import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

export function loadRuntimeEnv(cwd = process.cwd()): void {
  for (const filename of [".env.local", ".env"]) {
    const filePath = path.join(cwd, filename);
    if (!fs.existsSync(filePath)) continue;
    dotenv.config({ path: filePath, override: false });
  }
}
