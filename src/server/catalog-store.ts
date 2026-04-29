import fs from "node:fs";
import path from "node:path";
import type { CompanyAccountId } from "../lib/mission-control";

export interface CatalogItem {
  id: string;
  companyAccount: CompanyAccountId;
  name: string;
  description: string;
  category: string;
  unitPriceCents: number;
  unitType: string;
  taxable: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CatalogState {
  items: CatalogItem[];
}

const DEFAULT_ITEMS: CatalogItem[] = [
  {
    id: "cat-acs-1",
    companyAccount: "astro-cleaning-services",
    name: "Standard House Cleaning",
    description: "General cleaning for homes up to 2,500 sq ft. Includes dusting, vacuuming, mopping, bathroom sanitization.",
    category: "Residential",
    unitPriceCents: 18000,
    unitType: "visit",
    taxable: true,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cat-acs-2",
    companyAccount: "astro-cleaning-services",
    name: "Deep Clean",
    description: "Intensive deep cleaning including baseboards, inside appliances, window tracks, and detailed bathroom scrub.",
    category: "Residential",
    unitPriceCents: 35000,
    unitType: "visit",
    taxable: true,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cat-acs-3",
    companyAccount: "astro-cleaning-services",
    name: "Move-In/Move-Out Clean",
    description: "Comprehensive cleaning for empty properties. Includes cabinet interiors, closet shelves, and garage sweep.",
    category: "Specialty",
    unitPriceCents: 45000,
    unitType: "visit",
    taxable: true,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cat-acs-4",
    companyAccount: "astro-cleaning-services",
    name: "Commercial Office Cleaning",
    description: "Regular office cleaning after hours. Trash, restrooms, common areas, kitchenette.",
    category: "Commercial",
    unitPriceCents: 25000,
    unitType: "visit",
    taxable: true,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cat-cco-1",
    companyAccount: "content-co-op",
    name: "Brand Video Production",
    description: "Full-service brand video including pre-production, 1-day shoot, and post-production editing.",
    category: "Video Production",
    unitPriceCents: 350000,
    unitType: "project",
    taxable: true,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cat-cco-2",
    companyAccount: "content-co-op",
    name: "Social Media Content Package",
    description: "10 short-form videos optimized for TikTok, Reels, and Shorts. Includes scripting and editing.",
    category: "Content",
    unitPriceCents: 150000,
    unitType: "package",
    taxable: true,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cat-cco-3",
    companyAccount: "content-co-op",
    name: "Documentary Production",
    description: "Long-form documentary production with multiple shoot days, interviews, and cinematic editing.",
    category: "Video Production",
    unitPriceCents: 850000,
    unitType: "project",
    taxable: true,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cat-cco-4",
    companyAccount: "content-co-op",
    name: "Video Editing (Hourly)",
    description: "Professional video editing and color grading. Raw footage to final deliverable.",
    category: "Post-Production",
    unitPriceCents: 12500,
    unitType: "hour",
    taxable: true,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function catalogFile(storeDir?: string): string {
  const dir = storeDir ?? path.resolve(process.cwd(), ".data");
  return path.join(dir, "catalog.json");
}

function readState(storeDir?: string): CatalogState {
  const file = catalogFile(storeDir);
  if (!fs.existsSync(file)) return { items: [...DEFAULT_ITEMS] };
  try {
    const raw = fs.readFileSync(file, "utf-8");
    return JSON.parse(raw) as CatalogState;
  } catch {
    return { items: [...DEFAULT_ITEMS] };
  }
}

function writeState(state: CatalogState, storeDir?: string): void {
  const file = catalogFile(storeDir);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state, null, 2));
}

function stableId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36).slice(-4)}`;
}

export function listCatalogItems(account?: CompanyAccountId, storeDir?: string): CatalogItem[] {
  const state = readState(storeDir);
  if (account) return state.items.filter((i) => i.companyAccount === account);
  return state.items;
}

export function getCatalogItem(id: string, storeDir?: string): CatalogItem | null {
  return readState(storeDir).items.find((i) => i.id === id) ?? null;
}

export function createCatalogItem(input: Omit<CatalogItem, "id" | "createdAt" | "updatedAt">, storeDir?: string): CatalogItem {
  const state = readState(storeDir);
  const item: CatalogItem = {
    ...input,
    id: stableId("cat"),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  state.items.unshift(item);
  writeState(state, storeDir);
  return item;
}

export function updateCatalogItem(id: string, input: Partial<Omit<CatalogItem, "id" | "createdAt" | "updatedAt">>, storeDir?: string): CatalogItem {
  const state = readState(storeDir);
  const idx = state.items.findIndex((i) => i.id === id);
  if (idx === -1) throw new Error("Catalog item not found");
  state.items[idx] = { ...state.items[idx], ...input, updatedAt: new Date().toISOString() };
  writeState(state, storeDir);
  return state.items[idx];
}

export function deleteCatalogItem(id: string, storeDir?: string): void {
  const state = readState(storeDir);
  state.items = state.items.filter((i) => i.id !== id);
  writeState(state, storeDir);
}
