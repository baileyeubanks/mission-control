import type { CompanyAccountId, DataSource } from "./mission-control";

export type RootBillingDataSource = Extract<DataSource, "supabase" | "local_recovery_store" | "mixed">;
export type RootDocumentKind = "quote" | "proposal" | "invoice";
export type RootQuoteStatus =
  | "draft"
  | "needs_review"
  | "ready_to_send"
  | "sent"
  | "accepted"
  | "changes_requested"
  | "declined"
  | "expired"
  | "ready_to_invoice"
  | "invoiced"
  | "archived";
export type RootApprovalStatus = "not_required" | "requested" | "approved" | "rejected";
export type RootInvoiceIssueStatus = "draft" | "approved_to_issue" | "issued" | "voided" | "archived";
export type RootInvoicePaymentStatus = "unissued" | "unpaid" | "partially_paid" | "paid" | "overdue" | "void";
export type RootCommercialSource = "public_intake" | "manual" | "creative_brief" | "booking" | "project" | "local_recovery";

export interface RootBillingContact {
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: string | null;
}

export interface RootLineItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  taxable: boolean;
  category: string;
  metadata?: Record<string, unknown>;
}

export interface RootDocumentArtifact {
  id: string;
  artifactType: "preview_html" | "pdf" | "manifest" | "payment_link" | "reminder_draft";
  label: string;
  url: string | null;
  documentVersion: number;
  createdAt: string;
  dataSource: RootBillingDataSource;
  metadata: Record<string, unknown>;
}

export interface RootDocumentHistoryEntry {
  id: string;
  eventType: string;
  summary: string;
  actor: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface RootQuoteRecord {
  id: string;
  kind: "quote" | "proposal";
  documentNumber: string;
  companyAccount: CompanyAccountId;
  client: RootBillingContact;
  source: RootCommercialSource;
  sourceEntityId: string | null;
  title: string;
  scopeSummary: string;
  servicePeriod: string | null;
  projectTimeline: string | null;
  deliverables: string[];
  lineItems: RootLineItem[];
  discountCents: number;
  taxCents: number;
  depositCents: number;
  subtotalCents: number;
  totalCents: number;
  terms: string;
  expirationDate: string | null;
  internalNotes: string;
  clientNotes: string;
  status: RootQuoteStatus;
  approvalStatus: RootApprovalStatus;
  documentVersion: number;
  previewHtml: string;
  artifacts: RootDocumentArtifact[];
  history: RootDocumentHistoryEntry[];
  relatedInvoiceId: string | null;
  createdAt: string;
  updatedAt: string;
  dataSource: RootBillingDataSource;
}

export interface RootPaymentLinkRecord {
  id: string;
  provider: "stripe";
  url: string;
  status: "created" | "disabled" | "expired";
  createdAt: string;
}

export interface RootPaymentRecord {
  id: string;
  amountCents: number;
  provider: "stripe" | "manual_verified";
  reference: string | null;
  note: string;
  createdAt: string;
}

export interface RootInvoiceRecord {
  id: string;
  kind: "invoice";
  invoiceNumber: string;
  companyAccount: CompanyAccountId;
  client: RootBillingContact;
  source: RootCommercialSource;
  quoteId: string | null;
  projectId: string | null;
  jobId: string | null;
  title: string;
  lineItems: RootLineItem[];
  discountCents: number;
  taxCents: number;
  depositAppliedCents: number;
  subtotalCents: number;
  totalCents: number;
  amountPaidCents: number;
  dueDate: string | null;
  issueStatus: RootInvoiceIssueStatus;
  paymentStatus: RootInvoicePaymentStatus;
  documentVersion: number;
  previewHtml: string;
  artifacts: RootDocumentArtifact[];
  paymentLinks: RootPaymentLinkRecord[];
  payments: RootPaymentRecord[];
  reminders: RootDocumentArtifact[];
  history: RootDocumentHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  dataSource: RootBillingDataSource;
}

export interface RootBillingEvent {
  id: string;
  eventType: string;
  companyAccount: CompanyAccountId;
  entityType: "quote" | "proposal" | "invoice";
  entityId: string;
  summary: string;
  createdAt: string;
  dataSource: RootBillingDataSource;
}

export interface RootBillingState {
  dataSource: RootBillingDataSource;
  generatedAt: string;
  quotes: RootQuoteRecord[];
  invoices: RootInvoiceRecord[];
  events: RootBillingEvent[];
}

export interface RootBillingApiEnvelope<T> {
  ok: boolean;
  data?: T;
  data_source?: RootBillingDataSource;
  generated_at?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface RootQuoteInput {
  kind?: "quote" | "proposal";
  companyAccount?: CompanyAccountId;
  client?: Partial<RootBillingContact>;
  source?: RootCommercialSource;
  sourceEntityId?: string | null;
  title?: string;
  scopeSummary?: string;
  servicePeriod?: string | null;
  projectTimeline?: string | null;
  deliverables?: string[];
  lineItems?: Partial<RootLineItem>[];
  discountCents?: number;
  taxCents?: number;
  depositCents?: number;
  terms?: string;
  expirationDate?: string | null;
  internalNotes?: string;
  clientNotes?: string;
}

export interface RootInvoiceInput {
  companyAccount?: CompanyAccountId;
  client?: Partial<RootBillingContact>;
  source?: RootCommercialSource;
  quoteId?: string | null;
  projectId?: string | null;
  jobId?: string | null;
  title?: string;
  lineItems?: Partial<RootLineItem>[];
  discountCents?: number;
  taxCents?: number;
  depositAppliedCents?: number;
  dueDate?: string | null;
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format((Number.isFinite(cents) ? cents : 0) / 100);
}

export function calculateSubtotalCents(lineItems: RootLineItem[]): number {
  return lineItems.reduce((total, item) => total + Math.round(item.quantity * item.unitPriceCents), 0);
}

export function calculateDocumentTotal(input: {
  lineItems: RootLineItem[];
  discountCents: number;
  taxCents: number;
  depositCents?: number;
  depositAppliedCents?: number;
}): { subtotalCents: number; totalCents: number } {
  const subtotalCents = calculateSubtotalCents(input.lineItems);
  const totalCents = Math.max(
    0,
    subtotalCents - input.discountCents + input.taxCents - (input.depositCents ?? input.depositAppliedCents ?? 0),
  );
  return { subtotalCents, totalCents };
}
