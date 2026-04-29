import fs from "node:fs";
import path from "node:path";
import type { PacketModelClient } from "./model-client";
import { sbSelect, sbUpsert } from "./data-adapter";

export type BriefStatus =
  | "draft_started"
  | "contact_captured"
  | "discovery_in_progress"
  | "brief_submitted"
  | "ai_enriched"
  | "internal_review_required"
  | "proposal_draft_ready"
  | "proposal_sent"
  | "client_approved"
  | "checkout_pending"
  | "deposit_paid"
  | "project_opened"
  | "closed_lost";

export type ProjectType =
  | "brand_film"
  | "executive_message"
  | "technical_explainer"
  | "training_video"
  | "safety_video"
  | "event_video"
  | "product_service_promo"
  | "social_content_package"
  | "motion_graphics_animation"
  | "internal_communications"
  | "recruiting_employer_brand"
  | "unknown";

export type BusinessFunction =
  | "sales"
  | "brand"
  | "training"
  | "safety"
  | "recruiting"
  | "internal_comms"
  | "executive_visibility"
  | "event_support"
  | "customer_education"
  | "investor_stakeholder_comms";

export type BudgetRange =
  | "recommend"
  | "under_5k"
  | "5k_10k"
  | "10k_25k"
  | "25k_50k"
  | "50k_plus"
  | "not_sure";

export interface BriefContact {
  firstName: string;
  lastName?: string;
  company: string;
  role?: string;
  email: string;
  phone?: string;
}

export interface BriefPhaseIntent {
  videoType: string;
  description: string;
  businessProblem: string;
  whyNow: string;
  desiredOutcome: string;
}

export interface BriefPhaseAudience {
  primaryAudience: string;
  internalExternal: string;
  knowledgeLevel: string;
  coreMessage: string;
  desiredResponse: string;
}

export interface BriefPhaseDeliverables {
  mainVideoLength: string;
  numberOfVideos: number;
  cutdowns: boolean;
  socialVersions: boolean;
  captions: boolean;
  motionGraphics: boolean;
  animation: boolean;
  voiceover: boolean;
  interviews: boolean;
  bRoll: boolean;
  photography: boolean;
}

export interface BriefPhaseProduction {
  locations: string;
  filmingDays: number;
  interviewSubjects: number;
  travelRequired: boolean;
  facilityAccess: boolean;
  safetyRequirements: boolean;
  deadline: string;
}

export interface BriefPhaseCreative {
  tone: string;
  visualStyle: string;
  referenceVideos: string;
  brandGuidelines: string;
  wordsToAvoid: string;
}

export interface BriefPhaseBudget {
  budgetRange: BudgetRange;
  decisionMaker: string;
  approvalProcess: string;
  timelineToApprove: string;
}

export interface BriefPhases {
  intent?: BriefPhaseIntent;
  audience?: BriefPhaseAudience;
  deliverables?: BriefPhaseDeliverables;
  production?: BriefPhaseProduction;
  creative?: BriefPhaseCreative;
  budget?: BriefPhaseBudget;
}

export interface AIEnrichment {
  projectType: ProjectType;
  businessFunction: BusinessFunction;
  businessObjective: string;
  audience: string;
  detectedNeeds: string[];
  missingFields: string[];
  nextBestQuestion: string;
  complexityScore: number;
  budgetConfidence: "low" | "medium" | "high";
  riskFlags: string[];
  internalProducerNote: string;
  suggestedPackage: "minimal" | "recommended" | "premium";
}

export interface ScopeEstimate {
  minimalCents: number;
  recommendedCents: number;
  premiumCents: number;
  confidence: "low" | "medium" | "high";
  explanation: string;
}

export interface ProposalOption {
  id: string;
  label: string;
  description: string;
  totalCents: number;
  deliverables: string[];
  timelineDays: number;
}

export interface AdminNote {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

export interface IntakeData {
  projectType?: string;
  projectContext?: string;
  businessGoals?: string[];
  businessGoalContext?: string;
  audienceTypes?: string[];
  audienceKnowledgeLevel?: string;
  desiredAudienceResponse?: string[];
  coreMessageContext?: string;
  deliverables?: string[];
  mainVideoLength?: string;
  usageChannels?: string[];
  productionNeeds?: string[];
  filmingLocationType?: string;
  expectedShootDays?: string;
  onCameraPeopleCount?: string;
  creativeStyle?: string[];
  motionGraphicsLevel?: string;
  referenceLinks?: string;
  uploadedFiles?: string[];
  timeline?: string;
  budgetComfort?: string;
  dynamicQuestionAnswer?: string;
}

export interface Zip2Estimate {
  lean?: { name: string; range: string; includes: string[]; bestFor: string; timeline: string };
  recommended?: { name: string; range: string; includes: string[]; bestFor: string; timeline: string };
  premium?: { name: string; range: string; includes: string[]; bestFor: string; timeline: string };
  estimateConfidence?: string;
  assumptions?: string[];
}

export interface AddonItem {
  id: string;
  name: string;
  cost: number;
  selected: boolean;
}

export interface CreativeBriefSession {
  id: string;
  businessUnit: "content_coop";
  status: BriefStatus;
  contact: BriefContact | null;
  phases: BriefPhases;
  intake?: IntakeData;
  aiEnrichment: AIEnrichment | null;
  estimate: ScopeEstimate | null;
  zip2Estimate?: Zip2Estimate;
  proposalOptions: ProposalOption[];
  complexityScore: number;
  proposalReadiness: number;
  adminNotes: AdminNote[];
  addons?: AddonItem[];
  source: "website" | "internal" | "admin" | "referral";
  relatedQuoteId: string | null;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BriefState {
  sessions: CreativeBriefSession[];
}

function briefFile(storeDir?: string): string {
  const dir = storeDir ?? path.resolve(process.cwd(), ".data");
  return path.join(dir, "creative-briefs.json");
}

let briefsHydrated = false;

async function hydrateBriefsFromSupabase(storeDir?: string): Promise<void> {
  if (briefsHydrated) return;
  const file = briefFile(storeDir);
  const hasLocalData = fs.existsSync(file) && JSON.parse(fs.readFileSync(file, "utf-8")).sessions?.length > 0;
  if (!hasLocalData) {
    const res = await sbSelect<{ data: unknown }>("creative_briefs");
    if (res.ok && res.data && res.data.length > 0) {
      const state: BriefState = {
        sessions: res.data.map((r) => r.data) as CreativeBriefSession[],
      };
      writeState(state, storeDir);
    }
  }
  briefsHydrated = true;
}

function readState(storeDir?: string): BriefState {
  const file = briefFile(storeDir);
  if (!fs.existsSync(file)) return { sessions: [] };
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as BriefState;
  } catch {
    return { sessions: [] };
  }
}

function syncBriefToSupabase(b: CreativeBriefSession): void {
  sbUpsert("creative_briefs", {
    id: b.id,
    company_account_id: "content-co-op",
    user_id: b.userId,
    data: b as unknown as Record<string, unknown>,
    created_at: b.createdAt,
    updated_at: b.updatedAt,
  }).catch(() => { /* silent */ });
}

function writeState(state: BriefState, storeDir?: string): void {
  const file = briefFile(storeDir);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state, null, 2));
  for (const b of state.sessions) syncBriefToSupabase(b);
}

function stableId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36).slice(-4)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function listBriefSessions(storeDir?: string, filterUserId?: string): CreativeBriefSession[] {
  const sessions = readState(storeDir).sessions;
  if (filterUserId) {
    return sessions.filter((s) => s.userId === filterUserId);
  }
  return sessions;
}

export function getBriefSession(id: string, storeDir?: string): CreativeBriefSession | null {
  return readState(storeDir).sessions.find((s) => s.id === id) ?? null;
}

export function createBriefSession(source: CreativeBriefSession["source"] = "website", userId?: string | null, storeDir?: string): CreativeBriefSession {
  const state = readState(storeDir);
  const session: CreativeBriefSession = {
    id: stableId("brief"),
    businessUnit: "content_coop",
    status: "draft_started",
    contact: null,
    phases: {},
    aiEnrichment: null,
    estimate: null,
    proposalOptions: [],
    complexityScore: 0,
    proposalReadiness: 0,
    adminNotes: [],
    source,
    relatedQuoteId: null,
    userId: userId ?? null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  state.sessions.unshift(session);
  writeState(state, storeDir);
  return session;
}

export function updateBriefSession(id: string, updates: Partial<Omit<CreativeBriefSession, "id" | "createdAt">>, storeDir?: string): CreativeBriefSession {
  const state = readState(storeDir);
  const idx = state.sessions.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error("Brief session not found");
  state.sessions[idx] = { ...state.sessions[idx], ...updates, updatedAt: nowIso() };
  writeState(state, storeDir);
  return state.sessions[idx];
}

export function updateBriefPhase(id: string, phase: keyof BriefPhases, data: BriefPhases[keyof BriefPhases], storeDir?: string): CreativeBriefSession {
  const state = readState(storeDir);
  const idx = state.sessions.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error("Brief session not found");
  state.sessions[idx].phases[phase] = data as never;
  state.sessions[idx].updatedAt = nowIso();

  // Auto-advance status
  if (phase === "intent" && state.sessions[idx].status === "draft_started") {
    state.sessions[idx].status = "discovery_in_progress";
  }

  writeState(state, storeDir);
  return state.sessions[idx];
}

export function submitBrief(id: string, storeDir?: string): CreativeBriefSession {
  const state = readState(storeDir);
  const idx = state.sessions.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error("Brief session not found");
  state.sessions[idx].status = "brief_submitted";
  state.sessions[idx].updatedAt = nowIso();
  writeState(state, storeDir);
  return state.sessions[idx];
}

export function addAdminNote(id: string, text: string, author: string, storeDir?: string): CreativeBriefSession {
  const state = readState(storeDir);
  const idx = state.sessions.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error("Brief session not found");
  state.sessions[idx].adminNotes.unshift({ id: stableId("note"), text, author, createdAt: nowIso() });
  state.sessions[idx].updatedAt = nowIso();
  writeState(state, storeDir);
  return state.sessions[idx];
}

export function convertBriefToProposalReady(id: string, storeDir?: string): CreativeBriefSession {
  const state = readState(storeDir);
  const idx = state.sessions.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error("Brief session not found");
  state.sessions[idx].status = "proposal_draft_ready";
  state.sessions[idx].updatedAt = nowIso();
  writeState(state, storeDir);
  return state.sessions[idx];
}

export function setBriefRelatedQuote(id: string, quoteId: string, storeDir?: string): CreativeBriefSession {
  const state = readState(storeDir);
  const idx = state.sessions.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error("Brief session not found");
  state.sessions[idx].relatedQuoteId = quoteId;
  state.sessions[idx].updatedAt = nowIso();
  writeState(state, storeDir);
  return state.sessions[idx];
}

// ─── Deterministic Complexity Scorer ───

function computeComplexityScore(phases: BriefPhases): number {
  let score = 0;
  const d = phases.deliverables;
  const p = phases.production;

  if (d) {
    score += Math.min(d.numberOfVideos * 5, 20);
    if (d.cutdowns) score += 5;
    if (d.socialVersions) score += 5;
    if (d.motionGraphics) score += 8;
    if (d.animation) score += 12;
    if (d.voiceover) score += 3;
    if (d.interviews) score += 5;
    if (d.photography) score += 5;
    if (d.captions) score += 2;
  }

  if (p) {
    score += Math.min(p.filmingDays * 4, 20);
    score += Math.min(p.interviewSubjects * 2, 10);
    if (p.travelRequired) score += 8;
    if (p.safetyRequirements) score += 5;
    if (p.facilityAccess) score += 3;
  }

  // Budget tier adds weight
  const b = phases.budget?.budgetRange;
  if (b === "50k_plus") score += 15;
  else if (b === "25k_50k") score += 10;
  else if (b === "10k_25k") score += 5;

  return Math.min(Math.round(score), 100);
}

function computeProposalReadiness(phases: BriefPhases, ai: AIEnrichment | null): number {
  let filled = 0;
  let total = 6;
  if (phases.intent) filled++;
  if (phases.audience) filled++;
  if (phases.deliverables) filled++;
  if (phases.production) filled++;
  if (phases.creative) filled++;
  if (phases.budget) filled++;

  let score = Math.round((filled / total) * 60);
  if (ai) {
    if (ai.complexityScore > 0) score += 10;
    if (ai.detectedNeeds.length > 0) score += 10;
    if (ai.missingFields.length < 3) score += 10;
    else if (ai.missingFields.length < 6) score += 5;
  }
  return Math.min(score, 100);
}

// ─── Budget Estimation ───

function estimateScope(phases: BriefPhases, ai: AIEnrichment | null): ScopeEstimate {
  const d = phases.deliverables;
  const p = phases.production;

  let base = 5000;
  if (d) {
    base += d.numberOfVideos * 3000;
    if (d.motionGraphics) base += 4000;
    if (d.animation) base += 8000;
    if (d.voiceover) base += 800;
    if (d.cutdowns) base += 1500;
    if (d.socialVersions) base += 2000;
    if (d.captions) base += 500;
    if (d.photography) base += 1500;
  }
  if (p) {
    base += p.filmingDays * 2500;
    base += p.interviewSubjects * 500;
    if (p.travelRequired) base += 3000;
    if (p.safetyRequirements) base += 1500;
  }

  const complexity = ai?.complexityScore ?? computeComplexityScore(phases);
  if (complexity > 75) base *= 1.5;
  else if (complexity > 50) base *= 1.2;

  const minimal = Math.round(base * 0.7);
  const recommended = Math.round(base);
  const premium = Math.round(base * 1.5);

  // Round to nearest 500
  const round500 = (n: number) => Math.round(n / 500) * 500;

  const confidence = ai?.budgetConfidence ?? (phases.budget ? "medium" : "low");

  return {
    minimalCents: round500(minimal) * 100,
    recommendedCents: round500(recommended) * 100,
    premiumCents: round500(premium) * 100,
    confidence,
    explanation: `Based on ${d?.numberOfVideos ?? 1} video(s), ${p?.filmingDays ?? 0} shoot day(s), complexity score ${complexity}.`,
  };
}

function buildProposalOptions(phases: BriefPhases, estimate: ScopeEstimate): ProposalOption[] {
  const d = phases.deliverables;
  const deliverables: string[] = [];
  if (d) {
    deliverables.push(`${d.numberOfVideos} main video(s)`);
    if (d.cutdowns) deliverables.push("Platform cutdowns");
    if (d.socialVersions) deliverables.push("Social versions");
    if (d.motionGraphics) deliverables.push("Motion graphics");
    if (d.animation) deliverables.push("Animation");
    if (d.voiceover) deliverables.push("Professional voiceover");
    if (d.captions) deliverables.push("Captions/subtitles");
    if (d.photography) deliverables.push("Photography");
  }

  return [
    {
      id: stableId("opt"),
      label: "Essential",
      description: "Covers core deliverables with efficient production.",
      totalCents: estimate.minimalCents,
      deliverables: deliverables.slice(0, 3),
      timelineDays: 14,
    },
    {
      id: stableId("opt"),
      label: "Recommended",
      description: "Balanced scope with polish and flexibility.",
      totalCents: estimate.recommendedCents,
      deliverables: deliverables.slice(0, Math.min(deliverables.length, 5)),
      timelineDays: 21,
    },
    {
      id: stableId("opt"),
      label: "Premium",
      description: "Full creative treatment with maximum production value.",
      totalCents: estimate.premiumCents,
      deliverables,
      timelineDays: 35,
    },
  ];
}

// ─── AI Enrichment ───

const ENRICHMENT_SCHEMA = {
  type: "object" as const,
  properties: {
    projectType: { type: "string", enum: ["brand_film", "executive_message", "technical_explainer", "training_video", "safety_video", "event_video", "product_service_promo", "social_content_package", "motion_graphics_animation", "internal_communications", "recruiting_employer_brand", "unknown"] },
    businessFunction: { type: "string", enum: ["sales", "brand", "training", "safety", "recruiting", "internal_comms", "executive_visibility", "event_support", "customer_education", "investor_stakeholder_comms"] },
    businessObjective: { type: "string" },
    audience: { type: "string" },
    detectedNeeds: { type: "array", items: { type: "string" } },
    missingFields: { type: "array", items: { type: "string" } },
    nextBestQuestion: { type: "string" },
    complexityScore: { type: "integer", minimum: 0, maximum: 100 },
    budgetConfidence: { type: "string", enum: ["low", "medium", "high"] },
    riskFlags: { type: "array", items: { type: "string" } },
    internalProducerNote: { type: "string" },
    suggestedPackage: { type: "string", enum: ["minimal", "recommended", "premium"] },
  },
  required: ["projectType", "businessFunction", "businessObjective", "audience", "detectedNeeds", "missingFields", "nextBestQuestion", "complexityScore", "budgetConfidence", "riskFlags", "internalProducerNote", "suggestedPackage"],
};

export async function enrichBriefWithAI(id: string, modelClient: PacketModelClient, storeDir?: string): Promise<CreativeBriefSession> {
  const session = getBriefSession(id, storeDir);
  if (!session) throw new Error("Brief session not found");

  const prompt = buildEnrichmentPrompt(session);

  const result = await modelClient.generateJson({
    model: "gemini-2.0-flash",
    prompt,
    responseSchema: ENRICHMENT_SCHEMA,
  });

  const ai = result as AIEnrichment;
  const complexityScore = computeComplexityScore(session.phases);
  const estimate = estimateScope(session.phases, ai);
  const proposalOptions = buildProposalOptions(session.phases, estimate);
  const proposalReadiness = computeProposalReadiness(session.phases, ai);

  return updateBriefSession(id, {
    aiEnrichment: ai,
    complexityScore,
    estimate,
    proposalOptions,
    proposalReadiness,
    status: "ai_enriched",
  }, storeDir);
}

function buildEnrichmentPrompt(session: CreativeBriefSession): string {
  const p = session.phases;
  return `You are an executive producer at Content Co-op, a premium video production company in Houston, Texas. Analyze this client creative brief intake and produce structured intelligence.

CONTENT CO-OP CONTEXT:
- We produce corporate brand films, executive messaging, technical explainers, training videos, safety content, product promos, event videos, motion graphics, animation, and social content.
- Our clients are corporate, industrial, energy, technical, executive, and B2B.
- We translate complicated business ideas into clear cinematic visual stories.

CLIENT INTAKE DATA:
Contact: ${session.contact ? `${session.contact.firstName} ${session.contact.lastName ?? ""} at ${session.contact.company}` : "Not yet captured"}

Project Intent:
${p.intent ? `- Video type: ${p.intent.videoType}\n- Description: ${p.intent.description}\n- Business problem: ${p.intent.businessProblem}\n- Why now: ${p.intent.whyNow}\n- Desired outcome: ${p.intent.desiredOutcome}` : "Not yet provided"}

Audience:
${p.audience ? `- Primary audience: ${p.audience.primaryAudience}\n- Internal/external: ${p.audience.internalExternal}\n- Knowledge level: ${p.audience.knowledgeLevel}\n- Core message: ${p.audience.coreMessage}\n- Desired response: ${p.audience.desiredResponse}` : "Not yet provided"}

Deliverables:
${p.deliverables ? `- Videos: ${p.deliverables.numberOfVideos}, length: ${p.deliverables.mainVideoLength}\n- Cutdowns: ${p.deliverables.cutdowns}, Social: ${p.deliverables.socialVersions}, Captions: ${p.deliverables.captions}\n- Motion graphics: ${p.deliverables.motionGraphics}, Animation: ${p.deliverables.animation}\n- Voiceover: ${p.deliverables.voiceover}, Interviews: ${p.deliverables.interviews}, B-roll: ${p.deliverables.bRoll}, Photography: ${p.deliverables.photography}` : "Not yet provided"}

Production:
${p.production ? `- Locations: ${p.production.locations}\n- Filming days: ${p.production.filmingDays}\n- Interview subjects: ${p.production.interviewSubjects}\n- Travel: ${p.production.travelRequired}, Facility access: ${p.production.facilityAccess}\n- Safety requirements: ${p.production.safetyRequirements}, Deadline: ${p.production.deadline}` : "Not yet provided"}

Creative:
${p.creative ? `- Tone: ${p.creative.tone}\n- Visual style: ${p.creative.visualStyle}\n- Reference videos: ${p.creative.referenceVideos}\n- Brand guidelines: ${p.creative.brandGuidelines}\n- Words to avoid: ${p.creative.wordsToAvoid}` : "Not yet provided"}

Budget:
${p.budget ? `- Budget range: ${p.budget.budgetRange}\n- Decision maker: ${p.budget.decisionMaker}\n- Approval process: ${p.budget.approvalProcess}` : "Not yet provided"}

TASK:
1. Classify the project type and business function.
2. Summarize the business objective and audience.
3. Detect production needs based on the description.
4. Identify missing information that would be needed for a proposal.
5. Suggest the single best next question to ask the client.
6. Score complexity 0-100 based on deliverables, production, and creative needs.
7. Assess budget confidence (low/medium/high).
8. Flag any risks (timeline, approvals, scope creep, etc.).
9. Write an internal producer note for Bailey.
10. Suggest package tier (minimal/recommended/premium).

Be honest. If data is missing, say so. Do not invent details.`;
}
