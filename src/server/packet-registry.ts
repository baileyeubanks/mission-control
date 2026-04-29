import { Type } from "@google/genai";
import type {
  PacketKind,
  AdvisoryPacketResult,
  DraftJobUpdateResult,
  IntakeExtractResult,
  ScheduleOptimizeResult,
  ThreadReplyDraftResult,
  ThreadSummarizeResult,
} from "../lib/packets";

type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

export interface ThreadMessageInput {
  sender?: string;
  content: string;
}

export interface IntakeExtractInput {
  text: string;
  channel?: string;
}

export interface DraftJobUpdateInput {
  jobDetails: Record<string, unknown>;
  notes?: string;
}

export interface ScheduleJobInput {
  id: string;
  title: string;
  state?: string;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  serviceAddress?: string | null;
}

export interface ScheduleCrewInput {
  id: string;
  name: string;
  availability?: string;
}

export interface ScheduleOptimizeInput {
  jobs: ScheduleJobInput[];
  crews: ScheduleCrewInput[];
}

export interface ThreadSummarizeInput {
  messages: ThreadMessageInput[];
}

export interface ThreadReplyDraftInput {
  messages: ThreadMessageInput[];
  tone?: string;
}

export interface AdvisoryPacketInput {
  text?: string;
  messages?: ThreadMessageInput[];
  context?: Record<string, unknown>;
}

export interface PacketInputMap {
  intake_extract: IntakeExtractInput;
  draft_job_update: DraftJobUpdateInput;
  schedule_optimize: ScheduleOptimizeInput;
  thread_summarize: ThreadSummarizeInput;
  thread_reply_draft: ThreadReplyDraftInput;
  brief_extract: AdvisoryPacketInput;
  quote_extract: AdvisoryPacketInput;
  quote_followup_draft: AdvisoryPacketInput;
  proposal_draft: AdvisoryPacketInput;
  project_status_summary: AdvisoryPacketInput;
  dispatch_eta_draft: AdvisoryPacketInput;
  crew_readiness_summary: AdvisoryPacketInput;
  invoice_followup_draft: AdvisoryPacketInput;
  review_comment_summary: AdvisoryPacketInput;
  delivery_package_summary: AdvisoryPacketInput;
  repo_triage: AdvisoryPacketInput;
  runtime_repair_plan: AdvisoryPacketInput;
}

export interface PacketOutputMap {
  intake_extract: IntakeExtractResult;
  draft_job_update: DraftJobUpdateResult;
  schedule_optimize: ScheduleOptimizeResult;
  thread_summarize: ThreadSummarizeResult;
  thread_reply_draft: ThreadReplyDraftResult;
  brief_extract: AdvisoryPacketResult;
  quote_extract: AdvisoryPacketResult;
  quote_followup_draft: AdvisoryPacketResult;
  proposal_draft: AdvisoryPacketResult;
  project_status_summary: AdvisoryPacketResult;
  dispatch_eta_draft: AdvisoryPacketResult;
  crew_readiness_summary: AdvisoryPacketResult;
  invoice_followup_draft: AdvisoryPacketResult;
  review_comment_summary: AdvisoryPacketResult;
  delivery_package_summary: AdvisoryPacketResult;
  repo_triage: AdvisoryPacketResult;
  runtime_repair_plan: AdvisoryPacketResult;
}

export interface PacketHandlerDefinition<K extends PacketKind> {
  kind: K;
  model: string;
  outputMode: "text" | "json";
  responseSchema?: unknown;
  validateInput(input: unknown): ValidationResult<PacketInputMap[K]>;
  buildPrompt(input: PacketInputMap[K]): string;
  normalizeOutput(raw: unknown): PacketOutputMap[K];
  fallbackOutput(input: PacketInputMap[K]): PacketOutputMap[K];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function validateMessages(input: unknown): ValidationResult<ThreadMessageInput[]> {
  if (!Array.isArray(input) || input.length === 0) {
    return { ok: false, error: "messages must be a non-empty array." };
  }

  const messages: ThreadMessageInput[] = [];
  for (const item of input) {
    if (!isRecord(item) || typeof item.content !== "string" || !item.content.trim()) {
      return { ok: false, error: "each message must include non-empty content." };
    }

    messages.push({
      sender: toOptionalString(item.sender),
      content: item.content.trim(),
    });
  }

  return { ok: true, value: messages };
}

function normalizeTextResult(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

function cleanSnippet(value: string, maxLength = 140): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function inferBusinessScope(text: string): "Astro Cleanings" | "Content Co-op" | null {
  const normalized = text.toLowerCase();
  const astroSignals = ["clean", "cleaning", "bathroom", "kitchen", "move out", "move-out", "office clean", "house clean"];
  const contentSignals = ["video", "edit", "editing", "reel", "shoot", "podcast", "content", "campaign", "brand", "script"];

  const astroScore = astroSignals.filter((signal) => normalized.includes(signal)).length;
  const contentScore = contentSignals.filter((signal) => normalized.includes(signal)).length;

  if (astroScore === contentScore) return astroScore === 0 ? null : astroScore >= contentScore ? "Astro Cleanings" : "Content Co-op";
  return astroScore > contentScore ? "Astro Cleanings" : "Content Co-op";
}

function extractName(text: string): string | undefined {
  const patterns = [
    /\b(?:my name is|this is|i am|i'm)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
    /\bname:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return undefined;
}

function extractEmail(text: string): string | undefined {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
}

function extractPhone(text: string): string | undefined {
  return text.match(/(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/)?.[0];
}

function extractAddress(text: string): string | undefined {
  return text.match(/\b\d{2,6}\s+[A-Za-z0-9.\- ]+\s(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Court|Ct)\b/i)?.[0];
}

function inferSuggestedItems(text: string): Array<{ description: string; rate: number }> {
  const normalized = text.toLowerCase();
  const items: Array<{ description: string; rate: number }> = [];

  if (normalized.includes("move out") || normalized.includes("move-out")) {
    items.push({ description: "Move-out cleaning", rate: 320 });
  } else if (normalized.includes("deep clean")) {
    items.push({ description: "Deep cleaning", rate: 240 });
  } else if (normalized.includes("clean")) {
    items.push({ description: "Standard cleaning", rate: 180 });
  }

  if (normalized.includes("video") || normalized.includes("shoot")) {
    items.push({ description: "Production shoot day", rate: 950 });
  }

  if (normalized.includes("edit") || normalized.includes("reel") || normalized.includes("clip")) {
    items.push({ description: "Editing and short-form deliverables", rate: 650 });
  }

  return items.slice(0, 3);
}

function inferProjectScope(text: string): string {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => cleanSnippet(sentence, 180))
    .filter(Boolean);

  return sentences[0] || cleanSnippet(text, 180) || "Operator review required.";
}

function latestMessage(messages: ThreadMessageInput[]): ThreadMessageInput {
  return messages[messages.length - 1] || { content: "" };
}

function summarizeThreadLocally(messages: ThreadMessageInput[]): string {
  const latest = latestMessage(messages).content;
  const normalized = latest.toLowerCase();
  const snippet = cleanSnippet(latest, 110);

  if (normalized.includes("resched")) return `Customer wants to reschedule and is focused on: ${snippet}`;
  if (normalized.includes("quote") || normalized.includes("price") || normalized.includes("estimate")) {
    return `Customer is asking for pricing clarity around: ${snippet}`;
  }
  if (normalized.includes("available") || normalized.includes("tomorrow") || normalized.includes("when")) {
    return `Customer is asking about timing or availability for: ${snippet}`;
  }

  return `Latest thread focus: ${snippet}`;
}

function draftReplyLocally(messages: ThreadMessageInput[], tone?: string): string {
  const latest = latestMessage(messages).content;
  const normalized = latest.toLowerCase();
  const prefix = tone?.toLowerCase().includes("professional") ? "Thanks for the note." : "Thanks for reaching out.";

  if (normalized.includes("resched")) {
    return `${prefix} We can look at moving this to a better window. I’m reviewing the schedule now and will confirm the next available option shortly.`;
  }
  if (normalized.includes("quote") || normalized.includes("price") || normalized.includes("estimate")) {
    return `${prefix} I’m reviewing the scope now and will send the clearest next-step pricing update shortly.`;
  }
  if (normalized.includes("available") || normalized.includes("tomorrow") || normalized.includes("when")) {
    return `${prefix} I’m checking the current schedule and will confirm the best available time window shortly.`;
  }

  return `${prefix} I’m reviewing the details now and will follow up with the next step shortly.`;
}

function draftJobUpdateLocally(input: DraftJobUpdateInput): string {
  const title = typeof input.jobDetails.title === "string" ? input.jobDetails.title : "your job";
  const state = typeof input.jobDetails.state === "string" ? input.jobDetails.state : "in review";
  const scheduledStart = typeof input.jobDetails.scheduledStart === "string" ? input.jobDetails.scheduledStart : null;
  const formattedStart = scheduledStart ? new Date(scheduledStart).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : null;

  if (state === "scheduled" && formattedStart) {
    return `Your ${title} is still on track for ${formattedStart}. I’ll confirm any final arrival details as we get closer.`;
  }
  if (state === "in_progress") {
    return `Your ${title} is currently underway. I’ll send the next update as soon as the crew clears the next checkpoint.`;
  }
  if (state === "quoted") {
    return `Your ${title} estimate is ready for review. I’m here if you want me to clarify scope, timing, or next steps.`;
  }

  return `I’m reviewing the current status of ${title} and will send a precise update shortly.`;
}

function optimizeScheduleLocally(input: ScheduleOptimizeInput): ScheduleOptimizeResult {
  const sortedJobs = [...input.jobs].sort((left, right) => {
    const leftValue = left.scheduledStart || left.title;
    const rightValue = right.scheduledStart || right.title;
    return leftValue.localeCompare(rightValue);
  });

  if (input.crews.length === 0) {
    return { assignments: [] };
  }

  const assignments = input.crews.map((crew, index) => ({
    crewId: crew.id,
    jobIds: sortedJobs.filter((_, jobIndex) => jobIndex % input.crews.length === index).map((job) => job.id),
    reasoning: crew.availability
      ? `Balanced against current workload. ${crew.availability}.`
      : "Balanced by current job order and available crew capacity.",
  })).filter((assignment) => assignment.jobIds.length > 0);

  return { assignments };
}

type AdvisoryPacketKind =
  | "brief_extract"
  | "quote_extract"
  | "quote_followup_draft"
  | "proposal_draft"
  | "project_status_summary"
  | "dispatch_eta_draft"
  | "crew_readiness_summary"
  | "invoice_followup_draft"
  | "review_comment_summary"
  | "delivery_package_summary"
  | "repo_triage"
  | "runtime_repair_plan";

const ADVISORY_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    text: { type: Type.STRING },
    actions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    confidence: { type: Type.STRING, enum: ["low", "medium", "high"] },
  },
};

function validateAdvisoryInput(input: unknown): ValidationResult<AdvisoryPacketInput> {
  if (!isRecord(input)) {
    return { ok: false, error: "input must be an object." };
  }

  const text = toOptionalString(input.text);
  const messages = input.messages === undefined ? undefined : validateMessages(input.messages);
  if (messages && messages.ok === false) {
    return { ok: false, error: messages.error };
  }
  const validatedMessages = messages?.ok ? messages.value : undefined;

  const context = isRecord(input.context) ? input.context : undefined;
  if (!text && (!validatedMessages || validatedMessages.length === 0) && !context) {
    return { ok: false, error: "input.text, input.messages, or input.context is required." };
  }

  return {
    ok: true,
    value: {
      text,
      messages: validatedMessages,
      context,
    },
  };
}

function advisorySourceText(input: AdvisoryPacketInput): string {
  const messageText = input.messages?.map((message) => `${message.sender || "Unknown"}: ${message.content}`).join("\n");
  const contextText = input.context ? JSON.stringify(input.context).slice(0, 1600) : "";
  return [input.text, messageText, contextText].filter(Boolean).join("\n\n");
}

function normalizeAdvisoryOutput(raw: unknown): AdvisoryPacketResult {
  if (isRecord(raw)) {
    const actions = Array.isArray(raw.actions)
      ? raw.actions.filter((action): action is string => typeof action === "string" && Boolean(action.trim())).map((action) => action.trim()).slice(0, 5)
      : [];
    const confidence = raw.confidence === "low" || raw.confidence === "medium" || raw.confidence === "high" ? raw.confidence : "medium";

    return {
      summary: toOptionalString(raw.summary) || toOptionalString(raw.text) || "Operator review required.",
      text: toOptionalString(raw.text),
      actions,
      confidence,
    };
  }

  const text = normalizeTextResult(raw);
  return {
    summary: text || "Operator review required.",
    text,
    actions: [],
    confidence: "low",
  };
}

function fallbackAdvisoryOutput(input: AdvisoryPacketInput, purpose: string): AdvisoryPacketResult {
  const source = advisorySourceText(input);
  const snippet = cleanSnippet(source, 180);
  const normalized = source.toLowerCase();
  const actions: string[] = [];

  if (normalized.includes("approve") || normalized.includes("review")) actions.push("Route to approval queue.");
  if (normalized.includes("quote") || normalized.includes("price")) actions.push("Confirm quote scope and pricing before sending.");
  if (normalized.includes("schedule") || normalized.includes("dispatch")) actions.push("Check schedule and assignment before customer update.");
  if (normalized.includes("invoice") || normalized.includes("payment")) actions.push("Verify invoice/payment state before follow-up.");
  if (actions.length === 0) actions.push("Keep as operator-reviewed advisory output.");

  return {
    summary: `${purpose}: ${snippet || "No source text provided beyond structured context."}`,
    text: snippet,
    actions,
    confidence: snippet ? "medium" : "low",
  };
}

function createAdvisoryDefinition<K extends AdvisoryPacketKind>(kind: K, purpose: string): PacketHandlerDefinition<K> {
  return {
    kind,
    model: "gemini-2.5-flash",
    outputMode: "json",
    responseSchema: ADVISORY_RESPONSE_SCHEMA,
    validateInput(input) {
      return validateAdvisoryInput(input) as ValidationResult<PacketInputMap[K]>;
    },
    buildPrompt(input) {
      return [
        `Mission Control packet: ${kind}.`,
        purpose,
        "Return a short summary, optional draft text, 1-5 concrete operator actions, and confidence.",
        "Do not claim to mutate production systems. Mark uncertain items for operator review.",
        advisorySourceText(input as AdvisoryPacketInput),
      ].filter(Boolean).join("\n\n");
    },
    normalizeOutput(raw) {
      return normalizeAdvisoryOutput(raw) as PacketOutputMap[K];
    },
    fallbackOutput(input) {
      return fallbackAdvisoryOutput(input as AdvisoryPacketInput, purpose) as PacketOutputMap[K];
    },
  };
}

export const PACKET_REGISTRY: { [K in PacketKind]: PacketHandlerDefinition<K> } = {
  intake_extract: {
    kind: "intake_extract",
    model: "gemini-2.5-flash",
    outputMode: "json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        email: { type: Type.STRING },
        phone: { type: Type.STRING },
        address: { type: Type.STRING },
        projectScope: { type: Type.STRING },
        businessScope: { type: Type.STRING, enum: ["Astro Cleanings", "Content Co-op"] },
        suggestedItems: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              rate: { type: Type.NUMBER },
            },
          },
        },
      },
    },
    validateInput(input) {
      if (!isRecord(input) || typeof input.text !== "string" || !input.text.trim()) {
        return { ok: false, error: "input.text is required." };
      }

      return {
        ok: true,
        value: {
          text: input.text.trim(),
          channel: toOptionalString(input.channel),
        },
      };
    },
    buildPrompt(input) {
      return [
        "Extract structured intake data from the following customer message.",
        "Return likely contact information, project scope, business scope, and suggested line items.",
        "Do not invent certainty. Leave fields blank when not present.",
        input.channel ? `Channel: ${input.channel}` : "",
        "",
        "Message:",
        input.text,
      ]
        .filter(Boolean)
        .join("\n");
    },
    normalizeOutput(raw) {
      const value = isRecord(raw) ? raw : {};
      const suggestedItems = Array.isArray(value.suggestedItems)
        ? value.suggestedItems
            .filter(isRecord)
            .map((item) => ({
              description: typeof item.description === "string" ? item.description : "",
              rate: typeof item.rate === "number" ? item.rate : 0,
            }))
            .filter((item) => item.description)
        : [];

      return {
        name: toOptionalString(value.name),
        email: toOptionalString(value.email),
        phone: toOptionalString(value.phone),
        address: toOptionalString(value.address),
        projectScope: toOptionalString(value.projectScope),
        businessScope:
          value.businessScope === "Astro Cleanings" || value.businessScope === "Content Co-op"
            ? value.businessScope
            : null,
        suggestedItems,
      };
    },
    fallbackOutput(input) {
      return {
        name: extractName(input.text),
        email: extractEmail(input.text),
        phone: extractPhone(input.text),
        address: extractAddress(input.text),
        projectScope: inferProjectScope(input.text),
        businessScope: inferBusinessScope(input.text),
        suggestedItems: inferSuggestedItems(input.text),
      };
    },
  },
  draft_job_update: {
    kind: "draft_job_update",
    model: "gemini-2.5-flash",
    outputMode: "text",
    validateInput(input) {
      if (!isRecord(input) || !isRecord(input.jobDetails)) {
        return { ok: false, error: "input.jobDetails is required." };
      }

      return {
        ok: true,
        value: {
          jobDetails: input.jobDetails,
          notes: toOptionalString(input.notes),
        },
      };
    },
    buildPrompt(input) {
      return [
        "Draft a concise, professional customer update for this job.",
        "This draft is advisory only. Keep it short and SMS-friendly.",
        "",
        `Job: ${JSON.stringify(input.jobDetails)}`,
        input.notes ? `Notes: ${input.notes}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    },
    normalizeOutput(raw) {
      return {
        text: normalizeTextResult(raw),
      };
    },
    fallbackOutput(input) {
      return {
        text: draftJobUpdateLocally(input),
      };
    },
  },
  schedule_optimize: {
    kind: "schedule_optimize",
    model: "gemini-2.5-flash",
    outputMode: "json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        assignments: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              crewId: { type: Type.STRING },
              jobIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              reasoning: { type: Type.STRING },
            },
          },
        },
      },
    },
    validateInput(input) {
      if (!isRecord(input) || !Array.isArray(input.jobs) || !Array.isArray(input.crews)) {
        return { ok: false, error: "input.jobs and input.crews are required arrays." };
      }

      const jobs: ScheduleJobInput[] = [];
      for (const job of input.jobs) {
        if (!isRecord(job) || typeof job.id !== "string" || typeof job.title !== "string") {
          return { ok: false, error: "each job must include id and title." };
        }

        jobs.push({
          id: job.id,
          title: job.title,
          state: toOptionalString(job.state),
          scheduledStart: toOptionalString(job.scheduledStart) || null,
          scheduledEnd: toOptionalString(job.scheduledEnd) || null,
          serviceAddress: toOptionalString(job.serviceAddress) || null,
        });
      }

      const crews: ScheduleCrewInput[] = [];
      for (const crew of input.crews) {
        if (!isRecord(crew) || typeof crew.id !== "string" || typeof crew.name !== "string") {
          return { ok: false, error: "each crew must include id and name." };
        }

        crews.push({
          id: crew.id,
          name: crew.name,
          availability: toOptionalString(crew.availability),
        });
      }

      return {
        ok: true,
        value: { jobs, crews },
      };
    },
    buildPrompt(input) {
      return [
        "You are an expert dispatcher producing advisory crew assignments.",
        "Given crews and jobs, propose the most reasonable assignment order.",
        "Prefer minimizing travel, grouping geography, and preserving obvious schedule coherence.",
        "Do not assign nonexistent crew or job ids.",
        "",
        `Crews: ${JSON.stringify(input.crews)}`,
        `Jobs: ${JSON.stringify(input.jobs)}`,
      ].join("\n");
    },
    normalizeOutput(raw) {
      const value = isRecord(raw) ? raw : {};
      const assignments = Array.isArray(value.assignments)
        ? value.assignments
            .filter(isRecord)
            .map((assignment) => ({
              crewId: typeof assignment.crewId === "string" ? assignment.crewId : "",
              jobIds: Array.isArray(assignment.jobIds)
                ? assignment.jobIds.filter((jobId): jobId is string => typeof jobId === "string")
                : [],
              reasoning: typeof assignment.reasoning === "string" ? assignment.reasoning : "",
            }))
            .filter((assignment) => assignment.crewId)
        : [];

      return { assignments };
    },
    fallbackOutput(input) {
      return optimizeScheduleLocally(input);
    },
  },
  thread_summarize: {
    kind: "thread_summarize",
    model: "gemini-2.5-flash",
    outputMode: "text",
    validateInput(input) {
      if (!isRecord(input)) {
        return { ok: false, error: "input.messages is required." };
      }

      const messages = validateMessages(input.messages);
      if (messages.ok === false) return { ok: false, error: messages.error };

      return { ok: true, value: { messages: messages.value } };
    },
    buildPrompt(input) {
      const transcript = input.messages.map((message) => `${message.sender || "Unknown"}: ${message.content}`).join("\n");
      return [
        "Summarize this customer thread for an operator in one short sentence.",
        "Be concrete, not poetic.",
        "",
        transcript,
      ].join("\n");
    },
    normalizeOutput(raw) {
      return {
        summary: normalizeTextResult(raw),
      };
    },
    fallbackOutput(input) {
      return {
        summary: summarizeThreadLocally(input.messages),
      };
    },
  },
  thread_reply_draft: {
    kind: "thread_reply_draft",
    model: "gemini-2.5-flash",
    outputMode: "text",
    validateInput(input) {
      if (!isRecord(input)) {
        return { ok: false, error: "input.messages is required." };
      }

      const messages = validateMessages(input.messages);
      if (messages.ok === false) return { ok: false, error: messages.error };

      return {
        ok: true,
        value: {
          messages: messages.value,
          tone: toOptionalString(input.tone),
        },
      };
    },
    buildPrompt(input) {
      const transcript = input.messages.map((message) => `${message.sender || "Unknown"}: ${message.content}`).join("\n");

      return [
        "Draft a concise, professional reply to the latest customer message.",
        "The draft is advisory only and should not promise unconfirmed actions.",
        input.tone ? `Tone: ${input.tone}` : "",
        "",
        transcript,
      ]
        .filter(Boolean)
        .join("\n");
    },
    normalizeOutput(raw) {
      return {
        text: normalizeTextResult(raw),
      };
    },
    fallbackOutput(input) {
      return {
        text: draftReplyLocally(input.messages, input.tone),
      };
    },
  },
  brief_extract: createAdvisoryDefinition(
    "brief_extract",
    "Extract creative brief intelligence into project scope, deliverables, constraints, and next operator actions.",
  ),
  quote_extract: createAdvisoryDefinition(
    "quote_extract",
    "Extract quote intelligence into customer, property or project scope, pricing signals, and follow-up risks.",
  ),
  quote_followup_draft: createAdvisoryDefinition(
    "quote_followup_draft",
    "Draft quote follow-up text that is clear, premium, and does not promise unverified availability.",
  ),
  proposal_draft: createAdvisoryDefinition(
    "proposal_draft",
    "Draft proposal structure and operator notes for Content Co-op opportunities.",
  ),
  project_status_summary: createAdvisoryDefinition(
    "project_status_summary",
    "Summarize project state, blockers, approvals, deliverables, and next actions.",
  ),
  dispatch_eta_draft: createAdvisoryDefinition(
    "dispatch_eta_draft",
    "Draft dispatch or ETA communication after checking for scheduling uncertainty.",
  ),
  crew_readiness_summary: createAdvisoryDefinition(
    "crew_readiness_summary",
    "Summarize crew readiness, missing training, certification blockers, and eligibility concerns.",
  ),
  invoice_followup_draft: createAdvisoryDefinition(
    "invoice_followup_draft",
    "Draft invoice or payment follow-up that preserves relationship quality and audit clarity.",
  ),
  review_comment_summary: createAdvisoryDefinition(
    "review_comment_summary",
    "Summarize review comments into revision themes, approval risks, and next editorial actions.",
  ),
  delivery_package_summary: createAdvisoryDefinition(
    "delivery_package_summary",
    "Summarize final delivery package state, missing assets, approvals, and handoff notes.",
  ),
  repo_triage: createAdvisoryDefinition(
    "repo_triage",
    "Triage repository state into authority role, blockers, risks, and next implementation action.",
  ),
  runtime_repair_plan: createAdvisoryDefinition(
    "runtime_repair_plan",
    "Produce a bounded runtime repair plan with ports, health checks, blockers, and no deployment assumptions.",
  ),
};
