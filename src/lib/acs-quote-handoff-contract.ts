export type AcsQuoteHandoffSchema = "acs.quote-handoff.v1";
export type AcsQuoteHandoffReviewStatus =
  | "captured"
  | "ready_for_operator_review"
  | "needs_customer_follow_up"
  | "approved_for_quote"
  | "converted_to_invoice"
  | "blocked";

export interface AcsQuoteHandoffLineItem {
  id: string;
  label: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  source: "public_intake" | "operator" | "pricing_rule" | "donor_import";
}

export interface AcsQuoteHandoffV1Record {
  schema: AcsQuoteHandoffSchema;
  id: string;
  companyAccount: "astro-cleaning-services";
  source: {
    system: "acs-public-runtime" | "mission-control-local" | "astrocleanings-admin";
    sourceEntityId: string;
    sourcePath: string;
    capturedAt: string;
    sourceConfidence: "live" | "seed" | "donor";
  };
  customer: {
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
  };
  serviceLocation: {
    addressLine1: string | null;
    city: string | null;
    region: string | null;
    postalCode: string | null;
    accessNotes: string | null;
  };
  serviceRequest: {
    serviceType: "residential_cleaning" | "commercial_cleaning" | "move_in_move_out" | "post_construction" | "other";
    propertyType: "home" | "apartment" | "office" | "retail" | "other" | null;
    frequency: "one_time" | "weekly" | "biweekly" | "monthly" | "unknown";
    bedrooms: number | null;
    bathrooms: number | null;
    squareFeet: number | null;
    requestedAddOns: string[];
    notes: string;
  };
  scheduling: {
    preferredDate: string | null;
    preferredWindow: string | null;
    timezone: "America/Chicago";
    urgency: "standard" | "soon" | "urgent";
  };
  estimate: {
    currency: "USD";
    lineItems: AcsQuoteHandoffLineItem[];
    discountCents: number;
    taxCents: number;
    depositCents: number;
    subtotalCents: number;
    totalCents: number;
    assumptions: string[];
  };
  adminReview: {
    status: AcsQuoteHandoffReviewStatus;
    assignedQueue: "astro-admin-quotes";
    allowedActions: Array<"approve_quote" | "request_customer_info" | "hold_booking_slot" | "convert_to_invoice">;
    blockedActions: Array<"customer_write" | "firebase_write" | "invoice_conversion" | "production_publish">;
    auditRequired: true;
  };
  backendTargets: {
    missionControlReadModel: "/api/mission-control/acs-quote-handoff-v1";
    astroAdminRoute: "/api/quotes";
    supabaseCanonicalTable: "acs_quote_handoffs";
    firebaseMirrorCollection: "disabled_until_promoted";
  };
}

export interface AcsQuoteHandoffV1Contract {
  schema: AcsQuoteHandoffSchema;
  version: 1;
  status: "frozen_for_read_only_v1";
  canonicalWritePath: "supabase_first";
  firebaseRole: "donor_or_mirror_only_until_promoted";
  targetQueue: "astro-admin-quotes";
  requiredFields: string[];
  readOnlyProofs: string[];
  allowedAdminActions: AcsQuoteHandoffV1Record["adminReview"]["allowedActions"];
  blockedUntilApproved: AcsQuoteHandoffV1Record["adminReview"]["blockedActions"];
}

export interface AcsPublicQuoteSourceRecord {
  id?: string;
  quote_number?: string | null;
  client_name?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  service_address?: string | null;
  service_type?: string | null;
  square_footage?: number | string | null;
  bedrooms?: number | string | null;
  bathrooms?: number | string | null;
  frequency?: string | null;
  addons?: unknown;
  estimated_total?: number | string | null;
  deposit_amount_cents?: number | string | null;
  notes?: string | null;
  date_requested?: string | null;
  created_at?: string | null;
  payload?: {
    intake?: Record<string, unknown>;
    pricing?: Record<string, unknown>;
    items?: Array<Record<string, unknown>>;
    handoff?: Record<string, unknown>;
  } | null;
}

export interface AstroAdminQuoteCreateBodyPreview {
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  service_address: string | null;
  service_type: string;
  status: "new";
  internal_status: "pending_internal";
  client_status: "not_sent";
  square_footage: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  frequency: string | null;
  estimated_total: number;
  deposit_amount_cents: number;
  notes: string | null;
  items: Array<{
    name: string;
    description: string | null;
    quantity: number;
    unit_price: number;
    sort_order: number;
  }>;
  payload: {
    source: "acs.quote-handoff.v1";
    source_handoff_id: string;
    source_entity_id: string;
    backend_targets: AcsQuoteHandoffV1Record["backendTargets"];
    review: AcsQuoteHandoffV1Record["adminReview"];
  };
}

interface NormalizeOptions {
  id?: string;
  sourcePath?: string;
  sourceConfidence?: AcsQuoteHandoffV1Record["source"]["sourceConfidence"];
}

export const acsQuoteHandoffV1Contract: AcsQuoteHandoffV1Contract = {
  schema: "acs.quote-handoff.v1",
  version: 1,
  status: "frozen_for_read_only_v1",
  canonicalWritePath: "supabase_first",
  firebaseRole: "donor_or_mirror_only_until_promoted",
  targetQueue: "astro-admin-quotes",
  requiredFields: [
    "id",
    "source.sourceEntityId",
    "source.capturedAt",
    "customer.name",
    "serviceRequest.serviceType",
    "estimate.lineItems",
    "estimate.totalCents",
    "adminReview.status",
    "backendTargets.astroAdminRoute",
  ],
  readOnlyProofs: [
    "Mission Control renders the normalized record without writing customer data.",
    "Astro admin route exists before mutation wiring.",
    "Firebase remains disabled until rules, auth, and parity checks are certified.",
  ],
  allowedAdminActions: ["approve_quote", "request_customer_info", "hold_booking_slot", "convert_to_invoice"],
  blockedUntilApproved: ["customer_write", "firebase_write", "invoice_conversion", "production_publish"],
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string | null {
  const next = String(value ?? "").trim();
  return next || null;
}

function asNumber(value: unknown): number | null {
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
}

function dollarsToCents(value: unknown): number {
  const numeric = asNumber(value) ?? 0;
  return Math.round(numeric * 100);
}

function centsToDollars(cents: number): number {
  return Math.round((Number(cents || 0) / 100) * 100) / 100;
}

function normalizeFrequency(value: unknown): AcsQuoteHandoffV1Record["serviceRequest"]["frequency"] {
  const next = String(value ?? "").toLowerCase();
  if (next === "once" || next === "one-time" || next === "one_time") return "one_time";
  if (next === "weekly") return "weekly";
  if (next === "biweekly" || next === "bi-weekly") return "biweekly";
  if (next === "monthly") return "monthly";
  return "unknown";
}

function normalizeServiceType(value: unknown): AcsQuoteHandoffV1Record["serviceRequest"]["serviceType"] {
  const next = String(value ?? "").toLowerCase();
  if (next === "move-in" || next === "move-out" || next === "move_in" || next === "move_out") return "move_in_move_out";
  if (next === "post-construction" || next === "post_construction") return "post_construction";
  if (next === "commercial" || next === "office") return "commercial_cleaning";
  if (next === "standard" || next === "deep" || next === "routine" || next === "whiteglove") return "residential_cleaning";
  return "other";
}

function adminFrequency(value: AcsQuoteHandoffV1Record["serviceRequest"]["frequency"]): string | null {
  if (value === "one_time") return "one-time";
  if (value === "unknown") return null;
  return value;
}

function adminServiceType(value: AcsQuoteHandoffV1Record["serviceRequest"]["serviceType"]): string {
  if (value === "move_in_move_out") return "move-out";
  if (value === "post_construction") return "post-construction";
  if (value === "commercial_cleaning") return "standard";
  if (value === "residential_cleaning") return "standard";
  return "standard";
}

function sourceAddOns(source: AcsPublicQuoteSourceRecord): string[] {
  const pricing = asRecord(source.payload?.pricing);
  const raw = Array.isArray(source.addons)
    ? source.addons
    : Array.isArray(pricing.addons)
      ? pricing.addons
      : [];
  return raw.map((item) => String(item).trim()).filter(Boolean);
}

function normalizeLineItems(source: AcsPublicQuoteSourceRecord): AcsQuoteHandoffLineItem[] {
  const sourceItems = Array.isArray(source.payload?.items) ? source.payload.items : [];
  const items = sourceItems
    .map((item, index): AcsQuoteHandoffLineItem | null => {
      const label = asString(item.name) || asString(item.description);
      if (!label) return null;
      const quantity = asNumber(item.quantity) ?? 1;
      const unitPriceCents = dollarsToCents(item.unit_price);
      const totalCents = dollarsToCents(item.subtotal ?? (quantity * (asNumber(item.unit_price) ?? 0)));
      const metadata = asRecord(item.metadata);
      return {
        id: `line-${index + 1}`,
        label,
        quantity,
        unitPriceCents,
        totalCents,
        source: metadata.source === "acs_quote_engine_v4" ? "pricing_rule" : "public_intake",
      };
    })
    .filter((item): item is AcsQuoteHandoffLineItem => Boolean(item));

  if (items.length) return items;

  return [
    {
      id: "line-estimated-service",
      label: "Estimated ACS service",
      quantity: 1,
      unitPriceCents: dollarsToCents(source.estimated_total),
      totalCents: dollarsToCents(source.estimated_total),
      source: "public_intake",
    },
  ];
}

export function normalizeAcsPublicQuoteToHandoffV1(
  source: AcsPublicQuoteSourceRecord,
  options: NormalizeOptions = {},
): AcsQuoteHandoffV1Record {
  const intake = asRecord(source.payload?.intake);
  const pricing = asRecord(source.payload?.pricing);
  const lineItems = normalizeLineItems(source);
  const subtotalCents = lineItems.reduce((sum, item) => sum + item.totalCents, 0);
  const totalCents = dollarsToCents(source.estimated_total ?? pricing.estimated_total);
  const capturedAt = asString(source.created_at) || asString(intake.submitted_at) || "2026-04-28T08:00:00.000Z";
  const sourceEntityId = source.id || asString(source.quote_number) || "public-quote-demo-001";

  return {
    schema: "acs.quote-handoff.v1",
    id: options.id || `acs-handoff-${sourceEntityId}`,
    companyAccount: "astro-cleaning-services",
    source: {
      system: "acs-public-runtime",
      sourceEntityId,
      sourcePath: options.sourcePath || "/Users/baileyeubanks/Desktop/Projects/acs/acs-website",
      capturedAt,
      sourceConfidence: options.sourceConfidence || "live",
    },
    customer: {
      name: asString(source.client_name) || asString(intake.name) || "Unknown quote customer",
      email: asString(source.client_email) || asString(intake.email),
      phone: asString(source.client_phone) || asString(intake.phone),
      company: null,
    },
    serviceLocation: {
      addressLine1: asString(intake.street_address) || asString(source.service_address),
      city: asString(intake.city),
      region: asString(intake.state),
      postalCode: asString(intake.zip),
      accessNotes: null,
    },
    serviceRequest: {
      serviceType: normalizeServiceType(source.service_type),
      propertyType: "home",
      frequency: normalizeFrequency(source.frequency ?? pricing.frequency),
      bedrooms: asNumber(source.bedrooms),
      bathrooms: asNumber(source.bathrooms),
      squareFeet: asNumber(source.square_footage ?? pricing.square_footage),
      requestedAddOns: sourceAddOns(source),
      notes: asString(source.notes) || asString(intake.notes) || "",
    },
    scheduling: {
      preferredDate: asString(source.date_requested),
      preferredWindow: null,
      timezone: "America/Chicago",
      urgency: source.date_requested ? "soon" : "standard",
    },
    estimate: {
      currency: "USD",
      lineItems,
      discountCents: 0,
      taxCents: 0,
      depositCents: asNumber(source.deposit_amount_cents) ?? 0,
      subtotalCents,
      totalCents: totalCents || subtotalCents,
      assumptions: ["Public quote totals remain read-only until an operator approves the admin write path."],
    },
    adminReview: {
      status: "ready_for_operator_review",
      assignedQueue: "astro-admin-quotes",
      allowedActions: acsQuoteHandoffV1Contract.allowedAdminActions,
      blockedActions: acsQuoteHandoffV1Contract.blockedUntilApproved,
      auditRequired: true,
    },
    backendTargets: {
      missionControlReadModel: "/api/mission-control/acs-quote-handoff-v1",
      astroAdminRoute: "/api/quotes",
      supabaseCanonicalTable: "acs_quote_handoffs",
      firebaseMirrorCollection: "disabled_until_promoted",
    },
  };
}

export function buildAstroAdminQuoteCreateBodyFromHandoffV1(
  handoff: AcsQuoteHandoffV1Record,
): AstroAdminQuoteCreateBodyPreview {
  const serviceAddress = [
    handoff.serviceLocation.addressLine1,
    handoff.serviceLocation.city,
    handoff.serviceLocation.region,
    handoff.serviceLocation.postalCode,
  ]
    .filter(Boolean)
    .join(", ") || null;

  return {
    client_name: handoff.customer.name,
    client_email: handoff.customer.email,
    client_phone: handoff.customer.phone,
    service_address: serviceAddress,
    service_type: adminServiceType(handoff.serviceRequest.serviceType),
    status: "new",
    internal_status: "pending_internal",
    client_status: "not_sent",
    square_footage: handoff.serviceRequest.squareFeet,
    bedrooms: handoff.serviceRequest.bedrooms,
    bathrooms: handoff.serviceRequest.bathrooms,
    frequency: adminFrequency(handoff.serviceRequest.frequency),
    estimated_total: centsToDollars(handoff.estimate.totalCents),
    deposit_amount_cents: handoff.estimate.depositCents,
    notes: handoff.serviceRequest.notes || null,
    items: handoff.estimate.lineItems.map((item, index) => ({
      name: item.label,
      description: null,
      quantity: item.quantity,
      unit_price: centsToDollars(item.unitPriceCents),
      sort_order: index + 1,
    })),
    payload: {
      source: "acs.quote-handoff.v1",
      source_handoff_id: handoff.id,
      source_entity_id: handoff.source.sourceEntityId,
      backend_targets: handoff.backendTargets,
      review: handoff.adminReview,
    },
  };
}

export const sampleAcsPublicQuoteSource: AcsPublicQuoteSourceRecord = {
  id: "public-quote-demo-001",
  quote_number: "ACS-DEMO-001",
  client_name: "Demo Customer",
  client_email: "demo@example.com",
  client_phone: "555-0100",
  service_address: "100 Demo St, Austin, TX, 78701",
  service_type: "standard",
  square_footage: 1800,
  bedrooms: 3,
  bathrooms: 2,
  frequency: "once",
  addons: ["inside oven", "baseboards"],
  estimated_total: 280,
  deposit_amount_cents: 0,
  notes: "Customer requested quote review before booking hold.",
  date_requested: "2026-05-01",
  created_at: "2026-04-28T08:00:00.000Z",
  payload: {
    intake: {
      source: "website",
      submitted_at: "2026-04-28T08:00:00.000Z",
      name: "Demo Customer",
      email: "demo@example.com",
      phone: "555-0100",
      street_address: "100 Demo St",
      city: "Austin",
      state: "TX",
      zip: "78701",
      notes: "Customer requested quote review before booking hold.",
    },
    pricing: {
      estimated_total: 280,
      square_footage: 1800,
      frequency: "once",
      addons: ["inside oven", "baseboards"],
    },
    items: [
      {
        name: "Standard residential cleaning",
        quantity: 1,
        unit_price: 225,
        subtotal: 225,
        metadata: { source: "acs_quote_engine_v4" },
      },
      {
        name: "Selected add-ons",
        quantity: 1,
        unit_price: 55,
        subtotal: 55,
        metadata: { source: "acs_quote_engine_v4" },
      },
    ],
    handoff: {
      lifecycle: "pending_admin_review",
    },
  },
};

export const sampleAcsQuoteHandoffV1: AcsQuoteHandoffV1Record = normalizeAcsPublicQuoteToHandoffV1(
  sampleAcsPublicQuoteSource,
  {
    id: "acs-handoff-local-001",
    sourceConfidence: "seed",
  },
);

export const sampleAstroAdminQuoteCreateBody: AstroAdminQuoteCreateBodyPreview =
  buildAstroAdminQuoteCreateBodyFromHandoffV1(sampleAcsQuoteHandoffV1);
