import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CanonicalCrewMember,
  CanonicalInboxMessage,
  CanonicalInboxThread,
  CanonicalJobRecord,
  CanonicalSchedulePayload,
} from "../lib/canonical-types";

type AdminClient = SupabaseClient<any, "public", any>;

interface ContactRow {
  id: string;
  name: string | null;
  full_name: string | null;
  display_name: string | null;
  email: string | null;
  secondary_email: string | null;
  phone: string | null;
  secondary_phone: string | null;
  address: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  company: string | null;
}

interface ClientProfileRow {
  id: string;
  contact_id: string | null;
}

interface JobRow {
  id: string;
  contact_id: string | null;
  client_profile_id: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  status: string | null;
  notes: string | null;
  title: string | null;
  description: string | null;
  assigned_team: string | null;
  total_amount_cents: number | null;
  total_price: number | null;
  business_unit: string | null;
  created_at: string;
}

interface AiProfileRow {
  crew_member_id: string;
  display_name: string | null;
  role: string | null;
}

interface CreativeBriefRow {
  id: string;
  status: string | null;
  contact_name: string | null;
  contact_email: string | null;
  company: string | null;
  content_type: string | null;
  objective: string | null;
  key_messages: string | null;
  phone: string | null;
  created_at: string;
  structured_intake: Record<string, any> | null;
}

interface BriefMessageRow {
  id: string;
  brief_id: string;
  sender: string;
  body: string;
  created_at: string;
}

interface EventRow {
  id: string;
  type: string;
  payload: Record<string, any> | null;
  contact_id: string | null;
  created_at: string;
}

const NON_PRODUCTION_PATTERN =
  /(codex|dummy|example\.com|qa|smoke|probe|diagnostic|deploy|test|prodtest|alias check|verify|heartbeat)/i;

function firstText(...values: Array<unknown>): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function toLowerBlob(values: Array<unknown>): string {
  return values
    .map((value) => (typeof value === "string" ? value : value == null ? "" : JSON.stringify(value)))
    .join(" ")
    .toLowerCase();
}

function isLikelyNonProduction(values: Array<unknown>): boolean {
  return NON_PRODUCTION_PATTERN.test(toLowerBlob(values));
}

function summarizeText(value: string | null, maxLength = 180): string {
  if (!value) return "";
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trim()}…`;
}

function contactDisplayName(contact: ContactRow | null | undefined): string | null {
  return firstText(contact?.display_name, contact?.full_name, contact?.name, contact?.email, contact?.phone);
}

function contactEmail(contact: ContactRow | null | undefined): string | null {
  return firstText(contact?.email, contact?.secondary_email);
}

function contactPhone(contact: ContactRow | null | undefined): string | null {
  return firstText(contact?.phone, contact?.secondary_phone);
}

function contactAddress(contact: ContactRow | null | undefined): string | null {
  const direct = firstText(contact?.address);
  if (direct) return direct;

  const parts = [contact?.street_address, contact?.city, contact?.state, contact?.zip]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  return parts.length > 0 ? parts.join(", ") : null;
}

function parseCalendarImportedTitle(notes: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/Imported from Google Calendar(?::|\sevent )(.+)/i);
  if (!match?.[1]) return null;
  const candidate = match[1].split("\n")[0]?.trim() || null;
  return isOpaqueOperationalTitle(candidate) ? null : candidate;
}

function isOpaqueOperationalTitle(value: string | null): boolean {
  if (!value) return true;
  const title = value.trim();
  if (!title) return true;
  if (/^[a-z0-9]{12,}_[0-9]{8}t[0-9]{6}z$/i.test(title)) return true;
  if (!/\s/.test(title) && /[a-z]/i.test(title) && /\d/.test(title) && title.length >= 24) return true;
  return false;
}

function inferJobTitle(job: JobRow, contact: ContactRow | null | undefined): string {
  return (
    firstText(
      isOpaqueOperationalTitle(job.title) ? null : job.title,
      parseCalendarImportedTitle(job.notes),
      job.description,
      contactDisplayName(contact) ? `${contactDisplayName(contact)} Cleaning` : null,
    ) || `Job ${job.id.slice(0, 8)}`
  );
}

function inferJobPrice(job: JobRow): number | null {
  if (typeof job.total_amount_cents === "number") return job.total_amount_cents;
  if (typeof job.total_price === "number") return Math.round(job.total_price * 100);
  return null;
}

function extractQuotePayload(event: EventRow): Record<string, any> | null {
  const payload = event.payload || {};
  if (event.type === "quote_submitted") {
    return typeof payload.quote === "object" && payload.quote ? payload.quote : null;
  }
  const metadata = payload.metadata;
  if (metadata && typeof metadata === "object" && typeof metadata.quote === "object") {
    return metadata.quote as Record<string, any>;
  }
  return null;
}

function buildBriefSystemMessage(brief: CreativeBriefRow): CanonicalInboxMessage {
  const deliverables = Array.isArray(brief.structured_intake?.project?.deliverables)
    ? brief.structured_intake?.project?.deliverables.join(", ")
    : null;
  const lines = [
    `${firstText(brief.contact_name, brief.company, "New creative brief")} submitted a Content Co-op intake.`,
    firstText(brief.objective) ? `Objective: ${brief.objective}` : null,
    firstText(brief.content_type) ? `Format: ${brief.content_type}` : null,
    deliverables ? `Deliverables: ${deliverables}` : null,
    firstText(brief.key_messages) ? `Key messages: ${summarizeText(brief.key_messages, 220)}` : null,
  ].filter((line): line is string => Boolean(line));

  return {
    id: `brief-${brief.id}`,
    sender: "Intake System",
    content: lines.join("\n"),
    createdAt: brief.created_at,
    direction: "system",
  };
}

function buildBriefThread(brief: CreativeBriefRow, messages: BriefMessageRow[]): CanonicalInboxThread {
  const threadMessages: CanonicalInboxMessage[] = [
    buildBriefSystemMessage(brief),
    ...messages.map(
      (message): CanonicalInboxMessage => ({
        id: message.id,
        sender: message.sender === "client" ? firstText(brief.contact_name, "Client") || "Client" : "Team",
        content: message.body,
        createdAt: message.created_at,
        direction: message.sender === "client" ? "inbound" : "outbound",
      }),
    ),
  ];

  const latestMessage = threadMessages[threadMessages.length - 1] || threadMessages[0];
  return {
    threadId: `brief:${brief.id}`,
    packetEntityId: `brief:${brief.id}`,
    sourceKind: "creative_brief",
    channel: "website_form",
    title: firstText(brief.company, brief.content_type, "Creative brief") || "Creative brief",
    counterpart: firstText(brief.contact_name, brief.contact_email, brief.company, "Content Co-op intake") || "Content Co-op intake",
    preview: summarizeText(latestMessage?.content || brief.objective || brief.key_messages, 160),
    latestAt: latestMessage?.createdAt || brief.created_at,
    outboundTarget: brief.phone ? brief.phone.replace(/[^\d+]/g, "") : null,
    messages: threadMessages,
  };
}

function buildQuoteThread(event: EventRow, contact: ContactRow | null | undefined): CanonicalInboxThread | null {
  const quote = extractQuotePayload(event);
  const payload = event.payload || {};
  if (!quote) return null;

  const clientName = firstText(
    quote.client_name,
    payload.contact_name,
    contactDisplayName(contact),
    "Quote intake",
  );
  const location = firstText(quote.service_address, quote.address, payload.location, contactAddress(contact));
  const price =
    typeof quote.estimated_total === "number"
      ? `$${quote.estimated_total.toFixed(0)}`
      : typeof quote.estimated_amount === "number"
        ? `$${quote.estimated_amount.toFixed(0)}`
        : null;
  const bodyLines = [
    `${clientName} submitted an ACS quote request.`,
    firstText(quote.service_type) ? `Service: ${quote.service_type}` : null,
    location ? `Location: ${location}` : null,
    price ? `Estimated total: ${price}` : null,
    typeof payload.text === "string" && payload.text.trim() ? `Intake note: ${payload.text.trim()}` : null,
  ].filter((line): line is string => Boolean(line));

  return {
    threadId: `quote:${quote.id || event.id}`,
    packetEntityId: `quote:${quote.id || event.id}`,
    sourceKind: "quote_event",
    channel: firstText(payload.channel, "website_quote") || "website_quote",
    title: firstText(quote.quote_number, quote.service_type, "ACS quote intake") || "ACS quote intake",
    counterpart: clientName || "ACS quote intake",
    preview: summarizeText(bodyLines.join(" "), 160),
    latestAt: firstText(payload.received_at, event.created_at) || event.created_at,
    outboundTarget: firstText(quote.client_phone, contactPhone(contact)),
    messages: [
      {
        id: event.id,
        sender: clientName || "Quote intake",
        content: bodyLines.join("\n"),
        createdAt: firstText(payload.received_at, event.created_at) || event.created_at,
        direction: "inbound",
      },
    ],
  };
}

async function getContactMap(admin: AdminClient, ids: string[]): Promise<Map<string, ContactRow>> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await admin
    .from("contacts")
    .select("id,name,full_name,display_name,email,secondary_email,phone,secondary_phone,address,street_address,city,state,zip,company")
    .in("id", uniqueIds);
  if (error) {
    throw new Error(`Failed to load contacts: ${error.message}`);
  }

  return new Map(((data || []) as ContactRow[]).map((row) => [row.id, row]));
}

async function getClientProfileMap(admin: AdminClient, ids: string[]): Promise<Map<string, ClientProfileRow>> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await admin.from("client_profiles").select("id,contact_id").in("id", uniqueIds);
  if (error) {
    throw new Error(`Failed to load client profiles: ${error.message}`);
  }

  return new Map(((data || []) as ClientProfileRow[]).map((row) => [row.id, row]));
}

function filterProductionBriefs(briefs: CreativeBriefRow[]): CreativeBriefRow[] {
  const deduped = new Map<string, CreativeBriefRow>();
  for (const brief of briefs) {
    if (
      isLikelyNonProduction([
        brief.contact_name,
        brief.contact_email,
        brief.company,
        brief.content_type,
        brief.objective,
        brief.key_messages,
      ])
    ) {
      continue;
    }

    const signature = toLowerBlob([
      firstText(brief.contact_email, brief.contact_name),
      brief.company,
      firstText(brief.objective, brief.content_type),
    ]);

    const existing = deduped.get(signature);
    if (!existing || existing.created_at < brief.created_at) {
      deduped.set(signature, brief);
    }
  }

  return Array.from(deduped.values()).sort((left, right) => right.created_at.localeCompare(left.created_at));
}

function filterProductionQuoteEvents(events: EventRow[]): EventRow[] {
  const deduped = new Map<string, EventRow>();
  for (const event of events) {
    const quote = extractQuotePayload(event);
    const key =
      firstText(
        quote?.id,
        typeof event.payload?.external_thread_id === "string" ? event.payload.external_thread_id : null,
        event.id,
      ) || event.id;
    if (
      isLikelyNonProduction([
        event.payload,
        quote?.client_name,
        quote?.client_email,
        quote?.service_address,
      ])
    ) {
      continue;
    }

    const existing = deduped.get(key);
    if (!existing || existing.created_at < event.created_at) {
      deduped.set(key, event);
    }
  }

  return Array.from(deduped.values()).sort((left, right) => right.created_at.localeCompare(left.created_at));
}

export async function listCanonicalInboxThreads(admin: AdminClient, limit = 12): Promise<CanonicalInboxThread[]> {
  const [{ data: briefData, error: briefError }, { data: quoteEventData, error: quoteEventError }] = await Promise.all([
    admin
      .from("creative_briefs")
      .select("id,status,contact_name,contact_email,company,content_type,objective,key_messages,phone,created_at,structured_intake")
      .order("created_at", { ascending: false })
      .limit(60),
    admin
      .from("events")
      .select("id,type,payload,contact_id,created_at")
      .in("type", ["inbound_quote", "quote_submitted"])
      .order("created_at", { ascending: false })
      .limit(120),
  ]);

  if (briefError) {
    throw new Error(`Failed to load creative briefs: ${briefError.message}`);
  }
  if (quoteEventError) {
    throw new Error(`Failed to load intake events: ${quoteEventError.message}`);
  }

  const briefs = filterProductionBriefs((briefData || []) as CreativeBriefRow[]);
  const briefIds = briefs.map((brief) => brief.id);
  const { data: briefMessageData, error: briefMessageError } = briefIds.length
    ? await admin
        .from("brief_messages")
        .select("id,brief_id,sender,body,created_at")
        .in("brief_id", briefIds)
        .order("created_at", { ascending: true })
    : { data: [] as BriefMessageRow[], error: null as { message?: string } | null };

  if (briefMessageError) {
    throw new Error(`Failed to load brief messages: ${briefMessageError.message}`);
  }

  const briefMessagesById = new Map<string, BriefMessageRow[]>();
  for (const message of (briefMessageData || []) as BriefMessageRow[]) {
    const existing = briefMessagesById.get(message.brief_id) || [];
    existing.push(message);
    briefMessagesById.set(message.brief_id, existing);
  }

  const quoteEvents = filterProductionQuoteEvents((quoteEventData || []) as EventRow[]);
  const quoteContactMap = await getContactMap(
    admin,
    quoteEvents.map((event) => String(event.contact_id || extractQuotePayload(event)?.contact_id || "")),
  );

  const threads = [
    ...briefs.map((brief) => buildBriefThread(brief, briefMessagesById.get(brief.id) || [])),
    ...quoteEvents
      .map((event) =>
        buildQuoteThread(
          event,
          quoteContactMap.get(String(event.contact_id || extractQuotePayload(event)?.contact_id || "")),
        ),
      )
      .filter((thread): thread is CanonicalInboxThread => Boolean(thread)),
  ]
    .sort((left, right) => right.latestAt.localeCompare(left.latestAt))
    .slice(0, limit);

  return threads;
}

export async function listCanonicalJobs(admin: AdminClient, limit = 80): Promise<CanonicalJobRecord[]> {
  const { data, error } = await admin
    .from("jobs")
    .select("id,contact_id,client_profile_id,scheduled_start,scheduled_end,status,notes,title,description,assigned_team,total_amount_cents,total_price,business_unit,created_at")
    .order("scheduled_start", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load jobs: ${error.message}`);
  }

  const jobs = (data || []) as JobRow[];
  const clientProfiles = await getClientProfileMap(
    admin,
    jobs.map((job) => String(job.client_profile_id || "")),
  );
  const contacts = await getContactMap(
    admin,
    jobs.map((job) => {
      const clientProfile = job.client_profile_id ? clientProfiles.get(job.client_profile_id) : null;
      return String(job.contact_id || clientProfile?.contact_id || "");
    }),
  );

  return jobs
    .filter((job) => !isLikelyNonProduction([job.title, job.description, job.notes]))
    .map((job) => {
      const clientProfile = job.client_profile_id ? clientProfiles.get(job.client_profile_id) : null;
      const contact = contacts.get(String(job.contact_id || clientProfile?.contact_id || ""));
      return {
        id: job.id,
        title: inferJobTitle(job, contact),
        status: firstText(job.status, "scheduled") || "scheduled",
        scheduledStart: job.scheduled_start,
        scheduledEnd: job.scheduled_end,
        accessNotes: job.notes,
        serviceAddress: contactAddress(contact),
        clientName: contactDisplayName(contact),
        clientEmail: contactEmail(contact),
        clientPhone: contactPhone(contact),
        businessUnit: job.business_unit,
        assignedTeam: job.assigned_team,
        totalPrice: inferJobPrice(job),
      };
    });
}

export async function listCanonicalSchedule(admin: AdminClient): Promise<CanonicalSchedulePayload> {
  const [jobs, crewsResult] = await Promise.all([
    listCanonicalJobs(admin, 120),
    admin.from("ai_profiles").select("crew_member_id,display_name,role").eq("role", "crew").order("display_name", { ascending: true }),
  ]);

  if (crewsResult.error) {
    throw new Error(`Failed to load crews: ${crewsResult.error.message}`);
  }

  const crews = ((crewsResult.data || []) as AiProfileRow[]).map((row) => ({
    id: row.crew_member_id,
    displayName: firstText(row.display_name, row.crew_member_id) || row.crew_member_id,
    role: firstText(row.role, "crew") || "crew",
  })) satisfies CanonicalCrewMember[];

  return { jobs, crews };
}
