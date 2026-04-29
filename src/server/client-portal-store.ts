import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

interface PortalToken {
  email: string;
  createdAt: string;
  expiresAt: string;
}

interface PortalTokenStore {
  tokens: Record<string, PortalToken>;
}

function storeDir(recoveryStoreDir?: string): string {
  return recoveryStoreDir ?? path.join(process.cwd(), ".mission-control-recovery");
}

function tokenStorePath(recoveryStoreDir?: string): string {
  return path.join(storeDir(recoveryStoreDir), "client-portal-tokens.json");
}

function readStore(recoveryStoreDir?: string): PortalTokenStore {
  const filePath = tokenStorePath(recoveryStoreDir);
  if (!fs.existsSync(filePath)) {
    return { tokens: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as PortalTokenStore;
  } catch {
    return { tokens: {} };
  }
}

function writeStore(store: PortalTokenStore, recoveryStoreDir?: string): void {
  fs.mkdirSync(storeDir(recoveryStoreDir), { recursive: true });
  fs.writeFileSync(tokenStorePath(recoveryStoreDir), `${JSON.stringify(store, null, 2)}\n`);
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function cleanupExpired(store: PortalTokenStore): void {
  const now = Date.now();
  for (const [token, data] of Object.entries(store.tokens)) {
    if (new Date(data.expiresAt).getTime() < now) {
      delete store.tokens[token];
    }
  }
}

export function createClientPortalToken(
  email: string,
  recoveryStoreDir?: string,
): { token: string; url: string; expiresAt: string } {
  const store = readStore(recoveryStoreDir);
  cleanupExpired(store);

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  store.tokens[token] = {
    email: email.toLowerCase().trim(),
    createdAt: new Date().toISOString(),
    expiresAt,
  };

  writeStore(store, recoveryStoreDir);

  return {
    token,
    url: `/client/cco/${token}`,
    expiresAt,
  };
}

export function verifyClientPortalToken(
  token: string,
  recoveryStoreDir?: string,
): { valid: boolean; email?: string; error?: string } {
  const store = readStore(recoveryStoreDir);
  cleanupExpired(store);

  const record = store.tokens[token];
  if (!record) {
    return { valid: false, error: "Invalid or expired token." };
  }

  if (new Date(record.expiresAt).getTime() < Date.now()) {
    delete store.tokens[token];
    writeStore(store, recoveryStoreDir);
    return { valid: false, error: "Token expired." };
  }

  return { valid: true, email: record.email };
}

export function revokeClientPortalToken(token: string, recoveryStoreDir?: string): boolean {
  const store = readStore(recoveryStoreDir);
  if (store.tokens[token]) {
    delete store.tokens[token];
    writeStore(store, recoveryStoreDir);
    return true;
  }
  return false;
}
