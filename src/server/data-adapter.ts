/**
 * Data Store Adapter
 *
 * Routes persistence to either local JSON files (dev / Render free tier)
 * or Supabase (production with persistent storage).
 *
 * Usage: replace readState/writeState calls in stores with adapter.read/adapter.write.
 */
import fs from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let sharedClient: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (sharedClient) return sharedClient;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  sharedClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return sharedClient;
}

function recoveryDir(): string {
  return path.join(process.cwd(), ".mission-control-recovery");
}

function jsonPath(table: string): string {
  const dir = recoveryDir();
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${table}.json`);
}

function readJsonFile<T>(filePath: string): T {
  if (!fs.existsSync(filePath)) {
    const empty = {} as T;
    fs.writeFileSync(filePath, JSON.stringify(empty, null, 2) + "\n");
    return empty;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function writeJsonFile(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
}

/* ------------------------------------------------------------------ */
// Generic adapter interface

export interface DataAdapter<T extends Record<string, unknown>> {
  read(): Promise<T>;
  write(state: T): Promise<void>;
}

/* ------------------------------------------------------------------ */
// JSON file backend (default / fallback)

class JsonFileAdapter<T extends Record<string, unknown>> implements DataAdapter<T> {
  private filePath: string;
  private defaultState: T;

  constructor(table: string, defaultState: T) {
    this.filePath = jsonPath(table);
    this.defaultState = defaultState;
  }

  async read(): Promise<T> {
    const parsed = readJsonFile<Partial<T>>(this.filePath);
    // Merge with defaults so new fields don't break old files
    return { ...this.defaultState, ...parsed } as T;
  }

  async write(state: T): Promise<void> {
    writeJsonFile(this.filePath, state);
  }
}

/* ------------------------------------------------------------------ */
// Supabase backend (production)

interface SupabaseTableConfig {
  table: string;
  idColumn?: string;
}

class SupabaseAdapter<T extends Record<string, unknown>> implements DataAdapter<T> {
  private client: SupabaseClient;
  private config: SupabaseTableConfig;
  private defaultState: T;

  constructor(client: SupabaseClient, config: SupabaseTableConfig, defaultState: T) {
    this.client = client;
    this.config = config;
    this.defaultState = defaultState;
  }

  async read(): Promise<T> {
    const { data, error } = await this.client
      .from(this.config.table)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn(`[SupabaseAdapter] read error on ${this.config.table}:`, error.message);
      return this.defaultState;
    }

    // Map rows back to the JSON store shape
    const result = { ...this.defaultState } as Record<string, unknown>;
    for (const row of data ?? []) {
      for (const key of Object.keys(this.defaultState)) {
        if (row[key] !== undefined) {
          const arr = (result[key] as unknown[]) ?? [];
          if (Array.isArray(arr)) {
            arr.push(row[key]);
            result[key] = arr;
          }
        }
      }
    }
    return result as T;
  }

  async write(_state: T): Promise<void> {
    // Supabase adapter is write-through per-row; bulk write is a no-op
    // Individual stores call upsert/delete as needed
  }
}

/* ------------------------------------------------------------------ */
// Factory

export function createAdapter<T extends Record<string, unknown>>(
  table: string,
  defaultState: T,
  supabaseConfig?: SupabaseTableConfig,
): DataAdapter<T> {
  const client = getSupabase();
  if (client && supabaseConfig) {
    return new SupabaseAdapter(client, supabaseConfig, defaultState);
  }
  return new JsonFileAdapter(table, defaultState);
}

/* ------------------------------------------------------------------ */
// Helpers for individual record CRUD (used by stores that need row-level ops)

export async function sbUpsert(
  table: string,
  record: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabase();
  if (!client) return { ok: false, error: "Supabase not configured" };
  const { error } = await client.from(table).upsert(record, { onConflict: "id" });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function sbDelete(
  table: string,
  id: string,
  idColumn = "id",
): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabase();
  if (!client) return { ok: false, error: "Supabase not configured" };
  const { error } = await client.from(table).delete().eq(idColumn, id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function sbSelect<T>(
  table: string,
  match?: Record<string, unknown>,
): Promise<{ ok: boolean; data?: T[]; error?: string }> {
  const client = getSupabase();
  if (!client) return { ok: false, error: "Supabase not configured" };
  let query = client.from(table).select("*");
  if (match) {
    for (const [k, v] of Object.entries(match)) {
      query = query.eq(k, v);
    }
  }
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as T[] };
}

export async function sbSelectOne<T>(
  table: string,
  match: Record<string, unknown>,
): Promise<{ ok: boolean; data?: T; error?: string }> {
  const res = await sbSelect<T>(table, match);
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, data: res.data?.[0] };
}

export function isSupabaseConfigured(): boolean {
  return !!getSupabase();
}
