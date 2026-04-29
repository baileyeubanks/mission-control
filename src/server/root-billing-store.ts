import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import type { CompanyAccountId } from "../lib/mission-control";
import { sbSelect, sbSelectOne, sbUpsert, sbDelete } from "./data-adapter";
import {
  calculateDocumentTotal,
  formatCents,
  type RootBillingContact,
  type RootBillingDataSource,
  type RootBillingEvent,
  type RootBillingState,
  type RootCommercialSource,
  type RootDocumentArtifact,
  type RootDocumentHistoryEntry,
  type RootInvoiceInput,
  type RootInvoiceRecord,
  type RootLineItem,
  type RootPaymentLinkRecord,
  type RootPaymentRecord,
  type RootQuoteInput,
  type RootQuoteRecord,
} from "../lib/root-billing";

interface PersistedRootBillingState {
  quotes: RootQuoteRecord[];
  invoices: RootInvoiceRecord[];
  events: RootBillingEvent[];
}

export class RootBillingError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode = 400,
    public details?: unknown,
  ) {
    super(message);
  }
}

function recoveryDir(recoveryStoreDir?: string): string {
  return recoveryStoreDir ?? path.join(process.cwd(), ".mission-control-recovery");
}

function storePath(recoveryStoreDir?: string): string {
  return path.join(recoveryDir(recoveryStoreDir), "root-billing-documents.json");
}

function nowIso(): string {
  return new Date().toISOString();
}

function stableId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function ensureStoreFile(recoveryStoreDir?: string): void {
  const dir = recoveryDir(recoveryStoreDir);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = storePath(recoveryStoreDir);
  if (!fs.existsSync(filePath)) {
    writeState(seedState(), recoveryStoreDir);
  }
}

let supabaseHydrated = false;

async function hydrateFromSupabase(recoveryStoreDir?: string): Promise<void> {
  if (supabaseHydrated) return;
  const quotesRes = await sbSelect<{ data: unknown }>("root_quotes");
  const invoicesRes = await sbSelect<{ data: unknown }>("root_invoices");
  const eventsRes = await sbSelect<{ data: unknown }>("root_billing_events");
  if (quotesRes.ok && invoicesRes.ok && eventsRes.ok) {
    const state: PersistedRootBillingState = {
      quotes: (quotesRes.data?.map((r) => r.data) as RootQuoteRecord[]) ?? [],
      invoices: (invoicesRes.data?.map((r) => r.data) as RootInvoiceRecord[]) ?? [],
      events: (eventsRes.data?.map((r) => r.data) as RootBillingEvent[]) ?? [],
    };
    writeState(state, recoveryStoreDir);
  }
  supabaseHydrated = true;
}

function readState(recoveryStoreDir?: string): PersistedRootBillingState {
  // Hydrate from Supabase on first read (async fire-and-forget)
  if (!supabaseHydrated) {
    hydrateFromSupabase(recoveryStoreDir).catch(() => { /* silent fail, use JSON */ });
  }

  ensureStoreFile(recoveryStoreDir);
  const parsed = JSON.parse(fs.readFileSync(storePath(recoveryStoreDir), "utf8")) as Partial<PersistedRootBillingState>;
  return {
    quotes: Array.isArray(parsed.quotes) ? parsed.quotes : [],
    invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
    events: Array.isArray(parsed.events) ? parsed.events : [],
  };
}

function writeState(state: PersistedRootBillingState, recoveryStoreDir?: string): void {
  fs.mkdirSync(recoveryDir(recoveryStoreDir), { recursive: true });
  fs.writeFileSync(storePath(recoveryStoreDir), `${JSON.stringify(state, null, 2)}\n`);
  // Fire-and-forget sync to Supabase
  for (const q of state.quotes) syncQuoteToSupabase(q);
  for (const inv of state.invoices) syncInvoiceToSupabase(inv);
  for (const e of state.events) syncEventToSupabase(e);
}

function syncQuoteToSupabase(q: RootQuoteRecord): void {
  sbUpsert("root_quotes", {
    id: q.id,
    company_account_id: q.companyAccount,
    data: q as unknown as Record<string, unknown>,
    created_at: q.createdAt,
    updated_at: q.updatedAt,
  }).catch(() => { /* silent */ });
}
function syncInvoiceToSupabase(inv: RootInvoiceRecord): void {
  sbUpsert("root_invoices", {
    id: inv.id,
    company_account_id: inv.companyAccount,
    data: inv as unknown as Record<string, unknown>,
    created_at: inv.createdAt,
    updated_at: inv.updatedAt,
  }).catch(() => { /* silent */ });
}
function syncEventToSupabase(e: RootBillingEvent): void {
  sbUpsert("root_billing_events", {
    id: e.id,
    company_account_id: e.companyAccount,
    entity_type: e.entityType,
    entity_id: e.entityId,
    data: e as unknown as Record<string, unknown>,
    created_at: e.createdAt,
  }).catch(() => { /* silent */ });
}

function history(eventType: string, summary: string, actor = "local-operator", metadata?: Record<string, unknown>): RootDocumentHistoryEntry {
  return {
    id: stableId("history"),
    eventType,
    summary,
    actor,
    createdAt: nowIso(),
    metadata,
  };
}

function eventFor(
  eventType: string,
  companyAccount: CompanyAccountId,
  entityType: "quote" | "proposal" | "invoice",
  entityId: string,
  summary: string,
): RootBillingEvent {
  return {
    id: stableId("event"),
    eventType,
    companyAccount,
    entityType,
    entityId,
    summary,
    createdAt: nowIso(),
    dataSource: "local_recovery_store",
  };
}

function assertCompany(value: unknown): CompanyAccountId {
  if (value === "astro-cleaning-services" || value === "content-co-op") return value;
  throw new RootBillingError("INVALID_COMPANY", "companyAccount must be Astro Cleaning Services or Content Co-op.");
}

function normalizeSource(value: unknown): RootCommercialSource {
  const allowed: RootCommercialSource[] = ["public_intake", "manual", "creative_brief", "booking", "project", "local_recovery"];
  if (typeof value === "string" && allowed.includes(value as RootCommercialSource)) return value as RootCommercialSource;
  return "manual";
}

function normalizeCents(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.round(numeric));
}

function normalizeContact(input: Partial<RootBillingContact> | undefined): RootBillingContact {
  const name = input?.name?.trim();
  if (!name) throw new RootBillingError("CLIENT_NAME_REQUIRED", "Client name is required.");
  return {
    name,
    email: input?.email?.trim() || null,
    phone: input?.phone?.trim() || null,
    company: input?.company?.trim() || null,
    address: input?.address?.trim() || null,
  };
}

function normalizeLineItems(input: Partial<RootLineItem>[] | undefined): RootLineItem[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new RootBillingError("LINE_ITEM_REQUIRED", "At least one line item is required.");
  }

  return input.map((item, index) => {
    const name = item.name?.trim();
    if (!name) throw new RootBillingError("LINE_ITEM_NAME_REQUIRED", `Line item ${index + 1} needs a name.`);
    const quantity = Number(item.quantity ?? 1);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new RootBillingError("LINE_ITEM_QUANTITY_INVALID", `Line item ${index + 1} needs a positive quantity.`);
    }
    const unitPriceCents = normalizeCents(item.unitPriceCents);
    return {
      id: item.id?.trim() || stableId("line"),
      name,
      description: item.description?.trim() || "",
      quantity,
      unitPriceCents,
      taxable: Boolean(item.taxable),
      category: item.category?.trim() || "service",
      metadata: item.metadata && typeof item.metadata === "object" ? item.metadata : {},
    };
  });
}

function nextDocumentNumber(
  state: PersistedRootBillingState,
  companyAccount: CompanyAccountId,
  kind: "quote" | "proposal" | "invoice",
): string {
  const year = new Date().getFullYear();
  const prefix = kind === "invoice"
    ? "INV"
    : companyAccount === "astro-cleaning-services"
      ? "ACS-Q"
      : kind === "proposal"
        ? "CCO-P"
        : "CCO-Q";
  const existing = kind === "invoice"
    ? state.invoices.map((invoice) => invoice.invoiceNumber)
    : state.quotes.map((quote) => quote.documentNumber);
  const next = existing.filter((number) => number.startsWith(`${prefix}-${year}-`)).length + 1;
  return `${prefix}-${year}-${String(next).padStart(3, "0")}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function companyLabel(account: CompanyAccountId): string {
  return account === "astro-cleaning-services" ? "Astro Cleaning Services" : "Content Co-op";
}

function renderLineItemRows(lineItems: RootLineItem[]): string {
  return lineItems
    .map(
      (item) => `<tr>
        <td>${escapeHtml(item.name)}<div>${escapeHtml(item.description)}</div></td>
        <td>${item.quantity}</td>
        <td>${formatCents(item.unitPriceCents)}</td>
        <td>${formatCents(Math.round(item.quantity * item.unitPriceCents))}</td>
      </tr>`,
    )
    .join("");
}

function renderLineItemRowsPro(lineItems: RootLineItem[]): string {
  return lineItems
    .map(
      (item) => `<tr>
        <td><strong>${escapeHtml(item.name)}</strong><div class="item-desc">${escapeHtml(item.description)}</div></td>
        <td>${escapeHtml(item.category)}</td>
        <td class="td-right">${item.quantity}</td>
        <td class="td-right">${formatCents(item.unitPriceCents)}</td>
        <td class="td-right">${formatCents(Math.round(item.quantity * item.unitPriceCents))}</td>
      </tr>`,
    )
    .join("");
}

function renderDocumentHtml(document: RootQuoteRecord | RootInvoiceRecord): string {
  const isInvoice = document.kind === "invoice";
  const title = isInvoice ? "Invoice" : document.kind === "proposal" ? "Proposal" : "Quote";
  const number = isInvoice ? document.invoiceNumber : document.documentNumber;
  const statusLabel = isInvoice ? `${document.issueStatus} / ${document.paymentStatus}` : `${document.status} / ${document.approvalStatus}`;
  const notes = isInvoice ? "Payment status is projected from verified local/manual records unless Stripe is connected." : document.clientNotes;
  const depositLine = isInvoice
    ? `<div><span>Deposit applied</span><strong>${formatCents(document.depositAppliedCents)}</strong></div>`
    : `<div><span>Deposit</span><strong>${formatCents(document.depositCents)}</strong></div>`;
  const company = companyLabel(document.companyAccount);
  const statusColor = document.kind === "invoice"
    ? (document.paymentStatus === "paid" ? "#10b981"
      : document.issueStatus === "approved_to_issue" ? "#3b82f6"
      : document.issueStatus === "voided" ? "#ef4444"
      : "#f59e0b")
    : (document.status === "accepted" || document.status === "invoiced" ? "#10b981"
      : document.status === "sent" || document.status === "ready_to_send" ? "#3b82f6"
      : document.status === "declined" || document.status === "expired" ? "#ef4444"
      : "#f59e0b");

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #18181b; margin: 0; background: #fafafa; -webkit-font-smoothing: antialiased; }
        .doc { max-width: 800px; margin: 0 auto; padding: 48px; background: #fff; min-height: 100vh; box-shadow: 0 0 0 1px #e4e4e7; }
        .topbar { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 40px; }
        .brand { font-size: 13px; font-weight: 600; color: #18181b; letter-spacing: 0.02em; }
        .brand-sub { font-size: 11px; color: #a1a1aa; margin-top: 2px; }
        .doc-type { text-align: right; }
        .doc-type-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #71717a; }
        .doc-number { font-size: 22px; font-weight: 700; color: #18181b; margin-top: 4px; }
        .status-pill { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 6px; color: #fff; background: ${statusColor}; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; }
        .block-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #a1a1aa; margin-bottom: 8px; }
        .block-value { font-size: 13px; color: #27272a; line-height: 1.6; }
        .block-value strong { color: #18181b; font-weight: 600; }
        .scope { background: #fafafa; border-radius: 8px; padding: 16px; margin-bottom: 32px; }
        .scope-title { font-size: 13px; font-weight: 600; color: #18181b; margin-bottom: 6px; }
        .scope-body { font-size: 12px; color: #52525b; line-height: 1.6; }
        table { border-collapse: collapse; width: 100%; margin-top: 4px; }
        th { text-align: left; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #a1a1aa; border-bottom: 1.5px solid #e4e4e7; padding: 10px 8px; }
        td { border-bottom: 1px solid #f4f4f5; padding: 12px 8px; vertical-align: top; font-size: 12px; color: #27272a; }
        td .item-desc { color: #71717a; font-size: 11px; margin-top: 3px; line-height: 1.4; }
        .td-right { text-align: right; }
        .totals-wrap { display: flex; justify-content: flex-end; margin-top: 24px; }
        .totals { width: 280px; }
        .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px; color: #52525b; }
        .totals-row.grand { border-top: 1.5px solid #18181b; margin-top: 6px; padding-top: 10px; font-size: 15px; font-weight: 700; color: #18181b; }
        footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e4e4e7; }
        .footer-title { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #a1a1aa; margin-bottom: 6px; }
        .footer-body { font-size: 11px; color: #52525b; line-height: 1.6; }
        .pay-box { background: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; padding: 14px; margin-top: 16px; }
        .pay-box-title { font-size: 11px; font-weight: 600; color: #18181b; margin-bottom: 4px; }
        .pay-box-body { font-size: 11px; color: #71717a; }
      </style>
    </head>
    <body>
      <main class="doc">
        <div class="topbar">
          <div>
            <div class="brand">${escapeHtml(company)}</div>
            <div class="brand-sub">${escapeHtml(document.companyAccount === "content-co-op" ? "Creative Production" : "Premium Cleaning Services")}</div>
          </div>
          <div class="doc-type">
            <div class="doc-type-label">${escapeHtml(title)}</div>
            <div class="doc-number">${escapeHtml(number)}</div>
            <div class="status-pill">${escapeHtml(statusLabel.replace(/_/g, " "))}</div>
          </div>
        </div>

        <div class="grid-2">
          <div>
            <div class="block-label">Bill To</div>
            <div class="block-value">
              <strong>${escapeHtml(document.client.name)}</strong><br />
              ${document.client.company ? escapeHtml(document.client.company) + "<br />" : ""}
              ${document.client.email ? escapeHtml(document.client.email) + "<br />" : ""}
              ${document.client.address ? escapeHtml(document.client.address) + "<br />" : ""}
              ${document.client.phone ? escapeHtml(document.client.phone) : ""}
            </div>
          </div>
          <div>
            <div class="block-label">Document Details</div>
            <div class="block-value">
              Date: ${new Date(document.createdAt).toLocaleDateString()}<br />
              ${!isInvoice && document.expirationDate ? `Valid until: ${new Date(document.expirationDate).toLocaleDateString()}<br />` : ""}
              ${isInvoice && document.dueDate ? `Due date: ${new Date(document.dueDate).toLocaleDateString()}<br />` : ""}
              Version: ${document.documentVersion}
            </div>
          </div>
        </div>

        ${!isInvoice && document.scopeSummary ? `
        <div class="scope">
          <div class="scope-title">${escapeHtml(document.title)}</div>
          <div class="scope-body">${escapeHtml(document.scopeSummary)}</div>
        </div>
        ` : ""}

        ${isInvoice ? `<div class="scope-title" style="margin-bottom:16px;font-size:14px;">${escapeHtml(document.title)}</div>` : ""}

        <table>
          <thead>
            <tr>
              <th style="width:50%">Description</th>
              <th style="width:15%">Category</th>
              <th class="td-right" style="width:10%">Qty</th>
              <th class="td-right" style="width:12%">Rate</th>
              <th class="td-right" style="width:13%">Amount</th>
            </tr>
          </thead>
          <tbody>${renderLineItemRowsPro(document.lineItems)}</tbody>
        </table>

        <div class="totals-wrap">
          <div class="totals">
            <div class="totals-row"><span>Subtotal</span><span>${formatCents(document.subtotalCents)}</span></div>
            <div class="totals-row"><span>Discount</span><span>${formatCents(document.discountCents)}</span></div>
            <div class="totals-row"><span>Tax / fees</span><span>${formatCents(document.taxCents)}</span></div>
            ${depositLine}
            <div class="totals-row grand"><span>Total</span><span>${formatCents(document.totalCents)}</span></div>
          </div>
        </div>

        <footer>
          <div class="footer-title">Terms & Conditions</div>
          <div class="footer-body">${escapeHtml(isInvoice ? `Payment is due by ${document.dueDate ?? "the date specified above"}. Late payments subject to 1.5% monthly service charge.` : document.terms)}</div>
          ${notes ? `<div class="footer-body" style="margin-top:8px;color:#a1a1aa;">${escapeHtml(notes)}</div>` : ""}
          <div class="pay-box">
            <div class="pay-box-title">How to Pay</div>
            <div class="pay-box-body">Online payment available via secure checkout. Bank transfer details provided on request. Questions? Reply to this document or contact your account manager.</div>
          </div>
        </footer>
      </main>
    </body>
  </html>`;
}

const CHROME_PATH = process.env.CHROME_PATH || (process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : undefined);

async function createPdfBuffer(html: string): Promise<Buffer> {
  let executablePath: string | undefined = CHROME_PATH;
  if (!executablePath) {
    try {
      executablePath = await chromium.executablePath();
    } catch {
      throw new RootBillingError("CHROME_NOT_FOUND", "Chrome/Chromium not found. Set CHROME_PATH env var or install @sparticuz/chromium.", 500);
    }
  }
  let browser;
  try {
    const isSparticuz = !CHROME_PATH;
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: isSparticuz ? chromium.args : ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.goto("about:blank", { waitUntil: "networkidle0" });
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return Buffer.from(pdf);
  } finally {
    if (browser) await browser.close();
  }
}

function addArtifact(
  document: RootQuoteRecord | RootInvoiceRecord,
  artifactType: RootDocumentArtifact["artifactType"],
  label: string,
  url: string | null,
  metadata: Record<string, unknown> = {},
): RootDocumentArtifact {
  const artifact: RootDocumentArtifact = {
    id: stableId("artifact"),
    artifactType,
    label,
    url,
    documentVersion: document.documentVersion,
    createdAt: nowIso(),
    dataSource: "local_recovery_store",
    metadata,
  };
  document.artifacts = [artifact, ...document.artifacts];
  return artifact;
}

function applyQuoteComputedFields(quote: RootQuoteRecord): RootQuoteRecord {
  const totals = calculateDocumentTotal({
    lineItems: quote.lineItems,
    discountCents: quote.discountCents,
    taxCents: quote.taxCents,
    depositCents: quote.depositCents,
  });
  quote.subtotalCents = totals.subtotalCents;
  quote.totalCents = totals.totalCents;
  quote.previewHtml = renderDocumentHtml(quote);
  quote.updatedAt = nowIso();
  return quote;
}

function applyInvoiceComputedFields(invoice: RootInvoiceRecord): RootInvoiceRecord {
  const totals = calculateDocumentTotal({
    lineItems: invoice.lineItems,
    discountCents: invoice.discountCents,
    taxCents: invoice.taxCents,
    depositAppliedCents: invoice.depositAppliedCents,
  });
  invoice.subtotalCents = totals.subtotalCents;
  invoice.totalCents = totals.totalCents;
  invoice.paymentStatus = derivePaymentStatus(invoice);
  invoice.previewHtml = renderDocumentHtml(invoice);
  invoice.updatedAt = nowIso();
  return invoice;
}

function derivePaymentStatus(invoice: RootInvoiceRecord): RootInvoiceRecord["paymentStatus"] {
  if (invoice.issueStatus === "voided") return "void";
  if (invoice.issueStatus !== "issued") return "unissued";
  if (invoice.amountPaidCents >= invoice.totalCents && invoice.totalCents > 0) return "paid";
  if (invoice.amountPaidCents > 0) return "partially_paid";
  if (invoice.dueDate && new Date(`${invoice.dueDate}T23:59:59.999Z`).getTime() < Date.now()) return "overdue";
  return "unpaid";
}

function seedState(): PersistedRootBillingState {
  const createdAt = nowIso();
  const acsQuote: RootQuoteRecord = {
    id: "quote-acs-local-001",
    kind: "quote",
    documentNumber: `ACS-Q-${new Date().getFullYear()}-001`,
    companyAccount: "astro-cleaning-services",
    client: {
      name: "River Oaks Residence",
      email: "sarah@example.com",
      phone: "(713) 555-0148",
      company: null,
      address: "River Oaks, Houston, TX",
    },
    source: "local_recovery",
    sourceEntityId: "handoff-acs-quote-001",
    title: "Recurring deep clean and first-service reset",
    scopeSummary: "Initial deep clean followed by recurring weekly maintenance.",
    servicePeriod: "First visit plus weekly recurring service",
    projectTimeline: null,
    deliverables: ["Deep clean", "Recurring service plan", "Service notes"],
    lineItems: [
      {
        id: "line-acs-deep-clean",
        name: "Initial deep clean",
        description: "Kitchen, bathrooms, floors, dusting, high-touch reset.",
        quantity: 1,
        unitPriceCents: 42000,
        taxable: false,
        category: "cleaning",
      },
      {
        id: "line-acs-recurring",
        name: "Weekly maintenance",
        description: "Recurring weekly service estimate.",
        quantity: 1,
        unitPriceCents: 18500,
        taxable: false,
        category: "recurring",
      },
    ],
    discountCents: 0,
    taxCents: 0,
    depositCents: 0,
    subtotalCents: 60500,
    totalCents: 60500,
    terms: "Quote expires in 14 days. Booking requires confirmed schedule and crew readiness.",
    expirationDate: null,
    internalNotes: "Seeded from local recovery store. Verify property details before send.",
    clientNotes: "Final timing depends on schedule confirmation.",
    status: "draft",
    approvalStatus: "not_required",
    documentVersion: 1,
    previewHtml: "",
    artifacts: [],
    history: [history("quote.created", "Local ACS quote seed created.", "system")],
    relatedInvoiceId: null,
    createdAt,
    updatedAt: createdAt,
    dataSource: "local_recovery_store",
  };
  applyQuoteComputedFields(acsQuote);

  const ccoProposal: RootQuoteRecord = {
    id: "proposal-cco-local-001",
    kind: "proposal",
    documentNumber: `CCO-P-${new Date().getFullYear()}-001`,
    companyAccount: "content-co-op",
    client: {
      name: "Founder's Office",
      email: "founder@example.com",
      phone: null,
      company: "Signal Studio",
      address: null,
    },
    source: "creative_brief",
    sourceEntityId: "brief-cco-local-001",
    title: "Founder video sprint",
    scopeSummary: "Strategy, script, production planning, edit review, and delivery package.",
    servicePeriod: null,
    projectTimeline: "Two-week sprint after brief acceptance.",
    deliverables: ["Creative strategy", "Script", "Production plan", "Final delivery package"],
    lineItems: [
      {
        id: "line-cco-strategy",
        name: "Creative strategy + script",
        description: "Brief enrichment, concept, script, and production outline.",
        quantity: 1,
        unitPriceCents: 180000,
        taxable: false,
        category: "strategy",
      },
      {
        id: "line-cco-edit",
        name: "Editorial package",
        description: "Edit, review, revisions, and delivery handoff.",
        quantity: 1,
        unitPriceCents: 260000,
        taxable: false,
        category: "post-production",
      },
    ],
    discountCents: 0,
    taxCents: 0,
    depositCents: 220000,
    subtotalCents: 440000,
    totalCents: 220000,
    terms: "50% deposit to start. Balance due before final deliverable release.",
    expirationDate: null,
    internalNotes: "Seeded from CCO creative brief workflow.",
    clientNotes: "Proposal includes one consolidated revision cycle.",
    status: "draft",
    approvalStatus: "not_required",
    documentVersion: 1,
    previewHtml: "",
    artifacts: [],
    history: [history("proposal.created", "Local Content Co-op proposal seed created.", "system")],
    relatedInvoiceId: null,
    createdAt,
    updatedAt: createdAt,
    dataSource: "local_recovery_store",
  };
  applyQuoteComputedFields(ccoProposal);

  return {
    quotes: [acsQuote, ccoProposal],
    invoices: [],
    events: [
      eventFor("quote.created", "astro-cleaning-services", "quote", acsQuote.id, "ACS quote seed is available."),
      eventFor("proposal.created", "content-co-op", "proposal", ccoProposal.id, "CCO proposal seed is available."),
    ],
  };
}

export function listRootBillingDocuments(recoveryStoreDir?: string): RootBillingState {
  const state = readState(recoveryStoreDir);
  return {
    dataSource: "local_recovery_store",
    generatedAt: nowIso(),
    quotes: state.quotes,
    invoices: state.invoices,
    events: state.events,
  };
}

export function getRootQuote(id: string, recoveryStoreDir?: string): RootQuoteRecord | null {
  return readState(recoveryStoreDir).quotes.find((quote) => quote.id === id) ?? null;
}

export function getRootInvoice(id: string, recoveryStoreDir?: string): RootInvoiceRecord | null {
  return readState(recoveryStoreDir).invoices.find((invoice) => invoice.id === id) ?? null;
}

export function createRootQuote(input: RootQuoteInput, recoveryStoreDir?: string): RootQuoteRecord {
  const state = readState(recoveryStoreDir);
  const companyAccount = assertCompany(input.companyAccount);
  const kind = input.kind === "proposal" ? "proposal" : "quote";
  const lineItems = normalizeLineItems(input.lineItems);
  const createdAt = nowIso();
  const quote: RootQuoteRecord = {
    id: stableId(kind),
    kind,
    documentNumber: nextDocumentNumber(state, companyAccount, kind),
    companyAccount,
    client: normalizeContact(input.client),
    source: normalizeSource(input.source),
    sourceEntityId: input.sourceEntityId?.trim() || null,
    title: input.title?.trim() || (kind === "proposal" ? "New proposal" : "New quote"),
    scopeSummary: input.scopeSummary?.trim() || "Scope pending operator refinement.",
    servicePeriod: input.servicePeriod?.trim() || null,
    projectTimeline: input.projectTimeline?.trim() || null,
    deliverables: Array.isArray(input.deliverables) ? input.deliverables.map((item) => item.trim()).filter(Boolean) : [],
    lineItems,
    discountCents: normalizeCents(input.discountCents),
    taxCents: normalizeCents(input.taxCents),
    depositCents: normalizeCents(input.depositCents),
    subtotalCents: 0,
    totalCents: 0,
    terms: input.terms?.trim() || "Draft terms pending approval.",
    expirationDate: input.expirationDate?.trim() || null,
    internalNotes: input.internalNotes?.trim() || "",
    clientNotes: input.clientNotes?.trim() || "",
    status: "draft",
    approvalStatus: "not_required",
    documentVersion: 1,
    previewHtml: "",
    artifacts: [],
    history: [history(`${kind}.created`, `${kind === "proposal" ? "Proposal" : "Quote"} created in Root document engine.`)],
    relatedInvoiceId: null,
    createdAt,
    updatedAt: createdAt,
    dataSource: "local_recovery_store",
  };
  applyQuoteComputedFields(quote);
  state.quotes.unshift(quote);
  state.events.unshift(eventFor(`${kind}.created`, quote.companyAccount, kind, quote.id, `${quote.documentNumber} created.`));
  writeState(state, recoveryStoreDir);
  return quote;
}

export function updateRootQuote(id: string, input: RootQuoteInput, recoveryStoreDir?: string): RootQuoteRecord {
  const state = readState(recoveryStoreDir);
  const quote = state.quotes.find((candidate) => candidate.id === id);
  if (!quote) throw new RootBillingError("QUOTE_NOT_FOUND", "Quote or proposal not found.", 404);
  if (quote.status === "invoiced" || quote.status === "archived") {
    throw new RootBillingError("QUOTE_LOCKED", "Invoiced or archived documents cannot be edited.", 409);
  }
  if (input.client) quote.client = normalizeContact({ ...quote.client, ...input.client });
  if (input.companyAccount) quote.companyAccount = assertCompany(input.companyAccount);
  if (input.title !== undefined) quote.title = input.title.trim();
  if (input.scopeSummary !== undefined) quote.scopeSummary = input.scopeSummary.trim();
  if (input.servicePeriod !== undefined) quote.servicePeriod = input.servicePeriod?.trim() || null;
  if (input.projectTimeline !== undefined) quote.projectTimeline = input.projectTimeline?.trim() || null;
  if (input.deliverables !== undefined) quote.deliverables = input.deliverables.map((item) => item.trim()).filter(Boolean);
  if (input.lineItems !== undefined) quote.lineItems = normalizeLineItems(input.lineItems);
  if (input.discountCents !== undefined) quote.discountCents = normalizeCents(input.discountCents);
  if (input.taxCents !== undefined) quote.taxCents = normalizeCents(input.taxCents);
  if (input.depositCents !== undefined) quote.depositCents = normalizeCents(input.depositCents);
  if (input.terms !== undefined) quote.terms = input.terms.trim();
  if (input.expirationDate !== undefined) quote.expirationDate = input.expirationDate?.trim() || null;
  if (input.internalNotes !== undefined) quote.internalNotes = input.internalNotes.trim();
  if (input.clientNotes !== undefined) quote.clientNotes = input.clientNotes.trim();
  quote.documentVersion += 1;
  quote.status = "draft";
  quote.approvalStatus = "not_required";
  quote.history.unshift(history(`${quote.kind}.updated`, `${quote.documentNumber} revised to version ${quote.documentVersion}.`));
  applyQuoteComputedFields(quote);
  state.events.unshift(eventFor(`${quote.kind}.updated`, quote.companyAccount, quote.kind, quote.id, `${quote.documentNumber} revised.`));
  writeState(state, recoveryStoreDir);
  return quote;
}

export function requestRootQuoteApproval(id: string, recoveryStoreDir?: string): RootQuoteRecord {
  const state = readState(recoveryStoreDir);
  const quote = state.quotes.find((candidate) => candidate.id === id);
  if (!quote) throw new RootBillingError("QUOTE_NOT_FOUND", "Quote or proposal not found.", 404);
  quote.status = "needs_review";
  quote.approvalStatus = "requested";
  quote.history.unshift(history(`${quote.kind}.approval_requested`, `${quote.documentNumber} is waiting for operator approval.`));
  applyQuoteComputedFields(quote);
  state.events.unshift(eventFor(`${quote.kind}.approval_requested`, quote.companyAccount, quote.kind, quote.id, `${quote.documentNumber} needs approval.`));
  writeState(state, recoveryStoreDir);
  return quote;
}

export function approveRootQuote(id: string, recoveryStoreDir?: string): RootQuoteRecord {
  const state = readState(recoveryStoreDir);
  const quote = state.quotes.find((candidate) => candidate.id === id);
  if (!quote) throw new RootBillingError("QUOTE_NOT_FOUND", "Quote or proposal not found.", 404);
  quote.status = "ready_to_send";
  quote.approvalStatus = "approved";
  quote.history.unshift(history(`${quote.kind}.approved`, `${quote.documentNumber} approved for send/conversion.`));
  applyQuoteComputedFields(quote);
  state.events.unshift(eventFor(`${quote.kind}.approved`, quote.companyAccount, quote.kind, quote.id, `${quote.documentNumber} approved.`));
  writeState(state, recoveryStoreDir);
  return quote;
}

export function markRootQuoteSent(id: string, note: string | undefined, recoveryStoreDir?: string): RootQuoteRecord {
  const state = readState(recoveryStoreDir);
  const quote = state.quotes.find((candidate) => candidate.id === id);
  if (!quote) throw new RootBillingError("QUOTE_NOT_FOUND", "Quote or proposal not found.", 404);
  if (quote.approvalStatus !== "approved") {
    throw new RootBillingError("QUOTE_NOT_APPROVED", "Only approved quotes/proposals can be marked sent.", 409);
  }
  quote.status = "sent";
  quote.history.unshift(history(`${quote.kind}.sent_marked`, note?.trim() || "Manually marked as sent. External send not automated."));
  applyQuoteComputedFields(quote);
  state.events.unshift(eventFor(`${quote.kind}.sent_marked`, quote.companyAccount, quote.kind, quote.id, `${quote.documentNumber} manually marked sent.`));
  writeState(state, recoveryStoreDir);
  return quote;
}

export function clientApproveRootQuote(id: string, recoveryStoreDir?: string): RootQuoteRecord {
  const state = readState(recoveryStoreDir);
  const quote = state.quotes.find((candidate) => candidate.id === id);
  if (!quote) throw new RootBillingError("QUOTE_NOT_FOUND", "Quote or proposal not found.", 404);
  if (quote.status === "invoiced" || quote.status === "archived") {
    throw new RootBillingError("QUOTE_CLIENT_ACTION_LOCKED", "This document is already closed to client approval.", 409);
  }
  quote.status = "accepted";
  quote.approvalStatus = "approved";
  quote.history.unshift(history(`${quote.kind}.client_approved`, `${quote.documentNumber} approved through local client portal.`, "client-portal"));
  applyQuoteComputedFields(quote);
  state.events.unshift(eventFor(`${quote.kind}.client_approved`, quote.companyAccount, quote.kind, quote.id, `${quote.documentNumber} approved by client portal.`));
  writeState(state, recoveryStoreDir);
  return quote;
}

export function requestRootQuoteChanges(id: string, note: string | undefined, recoveryStoreDir?: string): RootQuoteRecord {
  const state = readState(recoveryStoreDir);
  const quote = state.quotes.find((candidate) => candidate.id === id);
  if (!quote) throw new RootBillingError("QUOTE_NOT_FOUND", "Quote or proposal not found.", 404);
  if (quote.status === "invoiced" || quote.status === "archived") {
    throw new RootBillingError("QUOTE_CLIENT_ACTION_LOCKED", "This document is already closed to change requests.", 409);
  }
  quote.status = "changes_requested";
  quote.approvalStatus = "requested";
  quote.history.unshift(history(`${quote.kind}.changes_requested`, note?.trim() || "Client requested changes through local portal.", "client-portal"));
  applyQuoteComputedFields(quote);
  state.events.unshift(eventFor(`${quote.kind}.changes_requested`, quote.companyAccount, quote.kind, quote.id, `${quote.documentNumber} has a client change request.`));
  writeState(state, recoveryStoreDir);
  return quote;
}

export async function exportRootQuotePdf(id: string, recoveryStoreDir?: string): Promise<{ quote: RootQuoteRecord; pdf: Buffer; artifact: RootDocumentArtifact }> {
  const state = readState(recoveryStoreDir);
  const quote = state.quotes.find((candidate) => candidate.id === id);
  if (!quote) throw new RootBillingError("QUOTE_NOT_FOUND", "Quote or proposal not found.", 404);
  const pdf = await createPdfBuffer(renderDocumentHtml(quote));
  const artifact = addArtifact(quote, "pdf", `${quote.documentNumber} v${quote.documentVersion} PDF`, `/api/root/quotes/${quote.id}/pdf`, {
    byte_length: pdf.byteLength,
    finality: quote.approvalStatus === "approved" ? "approved_artifact" : "draft_artifact",
  });
  quote.history.unshift(history(`${quote.kind}.pdf_exported`, `${quote.documentNumber} PDF artifact generated.`));
  applyQuoteComputedFields(quote);
  state.events.unshift(eventFor(`${quote.kind}.pdf_exported`, quote.companyAccount, quote.kind, quote.id, `${quote.documentNumber} PDF exported.`));
  writeState(state, recoveryStoreDir);
  return { quote, pdf, artifact };
}

export async function getRootQuotePdf(id: string, recoveryStoreDir?: string): Promise<{ quote: RootQuoteRecord; pdf: Buffer }> {
  const quote = getRootQuote(id, recoveryStoreDir);
  if (!quote) throw new RootBillingError("QUOTE_NOT_FOUND", "Quote or proposal not found.", 404);
  return { quote, pdf: await createPdfBuffer(renderDocumentHtml(quote)) };
}

export function convertRootQuoteToInvoice(id: string, recoveryStoreDir?: string): { quote: RootQuoteRecord; invoice: RootInvoiceRecord } {
  const state = readState(recoveryStoreDir);
  const quote = state.quotes.find((candidate) => candidate.id === id);
  if (!quote) throw new RootBillingError("QUOTE_NOT_FOUND", "Quote or proposal not found.", 404);
  if (quote.relatedInvoiceId) {
    const existing = state.invoices.find((invoice) => invoice.id === quote.relatedInvoiceId);
    if (existing) return { quote, invoice: existing };
  }
  if (quote.approvalStatus !== "approved") {
    throw new RootBillingError("QUOTE_NOT_APPROVED", "Approve the quote/proposal before converting it to an invoice.", 409);
  }
  const createdAt = nowIso();
  const invoice: RootInvoiceRecord = {
    id: stableId("invoice"),
    kind: "invoice",
    invoiceNumber: nextDocumentNumber(state, quote.companyAccount, "invoice"),
    companyAccount: quote.companyAccount,
    client: quote.client,
    source: quote.source,
    quoteId: quote.id,
    projectId: quote.companyAccount === "content-co-op" ? quote.sourceEntityId : null,
    jobId: quote.companyAccount === "astro-cleaning-services" ? quote.sourceEntityId : null,
    title: quote.title,
    lineItems: quote.lineItems,
    discountCents: quote.discountCents,
    taxCents: quote.taxCents,
    depositAppliedCents: quote.depositCents,
    subtotalCents: 0,
    totalCents: 0,
    amountPaidCents: 0,
    dueDate: null,
    issueStatus: "draft",
    paymentStatus: "unissued",
    documentVersion: 1,
    previewHtml: "",
    artifacts: [],
    paymentLinks: [],
    payments: [],
    reminders: [],
    history: [history("invoice.created_from_quote", `${quote.documentNumber} converted into invoice authority.`, "local-operator", { quoteId: quote.id })],
    createdAt,
    updatedAt: createdAt,
    dataSource: "local_recovery_store",
  };
  applyInvoiceComputedFields(invoice);
  quote.status = "invoiced";
  quote.relatedInvoiceId = invoice.id;
  quote.history.unshift(history(`${quote.kind}.converted_to_invoice`, `${quote.documentNumber} converted to ${invoice.invoiceNumber}.`));
  applyQuoteComputedFields(quote);
  state.invoices.unshift(invoice);
  state.events.unshift(eventFor("invoice.created_from_quote", invoice.companyAccount, "invoice", invoice.id, `${invoice.invoiceNumber} created from ${quote.documentNumber}.`));
  state.events.unshift(eventFor(`${quote.kind}.converted_to_invoice`, quote.companyAccount, quote.kind, quote.id, `${quote.documentNumber} converted to invoice.`));
  writeState(state, recoveryStoreDir);
  return { quote, invoice };
}

export function createRootInvoice(input: RootInvoiceInput, recoveryStoreDir?: string): RootInvoiceRecord {
  const state = readState(recoveryStoreDir);
  const companyAccount = assertCompany(input.companyAccount);
  const createdAt = nowIso();
  const invoice: RootInvoiceRecord = {
    id: stableId("invoice"),
    kind: "invoice",
    invoiceNumber: nextDocumentNumber(state, companyAccount, "invoice"),
    companyAccount,
    client: normalizeContact(input.client),
    source: normalizeSource(input.source),
    quoteId: input.quoteId?.trim() || null,
    projectId: input.projectId?.trim() || null,
    jobId: input.jobId?.trim() || null,
    title: input.title?.trim() || "New invoice",
    lineItems: normalizeLineItems(input.lineItems),
    discountCents: normalizeCents(input.discountCents),
    taxCents: normalizeCents(input.taxCents),
    depositAppliedCents: normalizeCents(input.depositAppliedCents),
    subtotalCents: 0,
    totalCents: 0,
    amountPaidCents: 0,
    dueDate: input.dueDate?.trim() || null,
    issueStatus: "draft",
    paymentStatus: "unissued",
    documentVersion: 1,
    previewHtml: "",
    artifacts: [],
    paymentLinks: [],
    payments: [],
    reminders: [],
    history: [history("invoice.created", "Standalone invoice created in Root document engine.")],
    createdAt,
    updatedAt: createdAt,
    dataSource: "local_recovery_store",
  };
  applyInvoiceComputedFields(invoice);
  state.invoices.unshift(invoice);
  state.events.unshift(eventFor("invoice.created", invoice.companyAccount, "invoice", invoice.id, `${invoice.invoiceNumber} created.`));
  writeState(state, recoveryStoreDir);
  return invoice;
}

export function updateRootInvoice(id: string, input: RootInvoiceInput, recoveryStoreDir?: string): RootInvoiceRecord {
  const state = readState(recoveryStoreDir);
  const invoice = state.invoices.find((candidate) => candidate.id === id);
  if (!invoice) throw new RootBillingError("INVOICE_NOT_FOUND", "Invoice not found.", 404);
  if (invoice.issueStatus === "issued" || invoice.issueStatus === "voided") {
    throw new RootBillingError("INVOICE_LOCKED", "Issued or voided invoices require revise/void actions instead of direct edit.", 409);
  }
  if (input.client) invoice.client = normalizeContact({ ...invoice.client, ...input.client });
  if (input.companyAccount) invoice.companyAccount = assertCompany(input.companyAccount);
  if (input.title !== undefined) invoice.title = input.title.trim();
  if (input.lineItems !== undefined) invoice.lineItems = normalizeLineItems(input.lineItems);
  if (input.discountCents !== undefined) invoice.discountCents = normalizeCents(input.discountCents);
  if (input.taxCents !== undefined) invoice.taxCents = normalizeCents(input.taxCents);
  if (input.depositAppliedCents !== undefined) invoice.depositAppliedCents = normalizeCents(input.depositAppliedCents);
  if (input.dueDate !== undefined) invoice.dueDate = input.dueDate?.trim() || null;
  invoice.documentVersion += 1;
  invoice.history.unshift(history("invoice.updated", `${invoice.invoiceNumber} revised to version ${invoice.documentVersion}.`));
  applyInvoiceComputedFields(invoice);
  state.events.unshift(eventFor("invoice.updated", invoice.companyAccount, "invoice", invoice.id, `${invoice.invoiceNumber} revised.`));
  writeState(state, recoveryStoreDir);
  return invoice;
}

export async function finalizeRootInvoiceArtifacts(id: string, recoveryStoreDir?: string): Promise<{ invoice: RootInvoiceRecord; pdf: Buffer; artifact: RootDocumentArtifact }> {
  const state = readState(recoveryStoreDir);
  const invoice = state.invoices.find((candidate) => candidate.id === id);
  if (!invoice) throw new RootBillingError("INVOICE_NOT_FOUND", "Invoice not found.", 404);
  if (invoice.issueStatus === "voided") throw new RootBillingError("INVOICE_VOIDED", "Voided invoices cannot be finalized.", 409);
  const pdf = await createPdfBuffer(renderDocumentHtml(invoice));
  const artifact = addArtifact(invoice, "pdf", `${invoice.invoiceNumber} final PDF v${invoice.documentVersion}`, `/api/root/invoices/${invoice.id}/pdf`, {
    byte_length: pdf.byteLength,
    finality: "final_invoice_artifact",
  });
  invoice.issueStatus = "approved_to_issue";
  invoice.history.unshift(history("invoice.finalized", `${invoice.invoiceNumber} final PDF artifact generated.`));
  applyInvoiceComputedFields(invoice);
  state.events.unshift(eventFor("invoice.finalized", invoice.companyAccount, "invoice", invoice.id, `${invoice.invoiceNumber} finalized.`));
  writeState(state, recoveryStoreDir);
  return { invoice, pdf, artifact };
}

export function issueRootInvoice(id: string, recoveryStoreDir?: string): RootInvoiceRecord {
  const state = readState(recoveryStoreDir);
  const invoice = state.invoices.find((candidate) => candidate.id === id);
  if (!invoice) throw new RootBillingError("INVOICE_NOT_FOUND", "Invoice not found.", 404);
  const hasFinalPdf = invoice.artifacts.some((artifact) => artifact.artifactType === "pdf" && artifact.metadata.finality === "final_invoice_artifact");
  if (invoice.issueStatus !== "approved_to_issue" || !hasFinalPdf) {
    throw new RootBillingError("INVOICE_ARTIFACT_REQUIRED", "Finalize invoice PDF artifacts before issuing.", 409);
  }
  invoice.issueStatus = "issued";
  invoice.history.unshift(history("invoice.issued", `${invoice.invoiceNumber} issued after final artifact check.`));
  applyInvoiceComputedFields(invoice);
  state.events.unshift(eventFor("invoice.issued", invoice.companyAccount, "invoice", invoice.id, `${invoice.invoiceNumber} issued.`));
  writeState(state, recoveryStoreDir);
  return invoice;
}

export async function getRootInvoicePdf(id: string, recoveryStoreDir?: string): Promise<{ invoice: RootInvoiceRecord; pdf: Buffer }> {
  const invoice = getRootInvoice(id, recoveryStoreDir);
  if (!invoice) throw new RootBillingError("INVOICE_NOT_FOUND", "Invoice not found.", 404);
  return { invoice, pdf: await createPdfBuffer(renderDocumentHtml(invoice)) };
}

export function recordRootInvoicePayment(
  id: string,
  amountCents: number,
  note: string | undefined,
  recoveryStoreDir?: string,
): RootInvoiceRecord {
  const state = readState(recoveryStoreDir);
  const invoice = state.invoices.find((candidate) => candidate.id === id);
  if (!invoice) throw new RootBillingError("INVOICE_NOT_FOUND", "Invoice not found.", 404);
  if (invoice.issueStatus !== "issued") {
    throw new RootBillingError("INVOICE_NOT_ISSUED", "Only issued invoices can record payment.", 409);
  }
  const payment: RootPaymentRecord = {
    id: stableId("payment"),
    amountCents: normalizeCents(amountCents),
    provider: "manual_verified",
    reference: null,
    note: note?.trim() || "Manual verified payment entry.",
    createdAt: nowIso(),
  };
  invoice.payments.unshift(payment);
  invoice.amountPaidCents = invoice.payments.reduce((total, item) => total + item.amountCents, 0);
  invoice.history.unshift(history("invoice.payment_recorded", `${formatCents(payment.amountCents)} manually recorded.`, "local-operator", {
    provider: payment.provider,
  }));
  applyInvoiceComputedFields(invoice);
  state.events.unshift(eventFor("invoice.payment_recorded", invoice.companyAccount, "invoice", invoice.id, `${invoice.invoiceNumber} payment recorded.`));
  writeState(state, recoveryStoreDir);
  return invoice;
}

export function createRootInvoiceReminderDraft(id: string, recoveryStoreDir?: string): RootInvoiceRecord {
  const state = readState(recoveryStoreDir);
  const invoice = state.invoices.find((candidate) => candidate.id === id);
  if (!invoice) throw new RootBillingError("INVOICE_NOT_FOUND", "Invoice not found.", 404);
  const artifact = addArtifact(invoice, "reminder_draft", `${invoice.invoiceNumber} reminder draft`, null, {
    body: `Draft reminder: ${invoice.invoiceNumber} for ${invoice.client.name} is ${invoice.paymentStatus}. Total due ${formatCents(Math.max(invoice.totalCents - invoice.amountPaidCents, 0))}.`,
  });
  invoice.reminders.unshift(artifact);
  invoice.history.unshift(history("invoice.reminder_draft_created", `${invoice.invoiceNumber} reminder draft created. No message was sent.`));
  applyInvoiceComputedFields(invoice);
  state.events.unshift(eventFor("invoice.reminder_draft_created", invoice.companyAccount, "invoice", invoice.id, `${invoice.invoiceNumber} reminder draft created.`));
  writeState(state, recoveryStoreDir);
  return invoice;
}

export function reviseRootInvoice(id: string, recoveryStoreDir?: string): RootInvoiceRecord {
  const state = readState(recoveryStoreDir);
  const invoice = state.invoices.find((candidate) => candidate.id === id);
  if (!invoice) throw new RootBillingError("INVOICE_NOT_FOUND", "Invoice not found.", 404);
  if (invoice.issueStatus === "voided" || invoice.paymentStatus === "paid") {
    throw new RootBillingError("INVOICE_REVISION_BLOCKED", "Paid or voided invoices cannot be revised in place.", 409);
  }
  invoice.documentVersion += 1;
  invoice.issueStatus = "draft";
  invoice.history.unshift(history("invoice.revised", `${invoice.invoiceNumber} moved back to draft as version ${invoice.documentVersion}.`));
  applyInvoiceComputedFields(invoice);
  state.events.unshift(eventFor("invoice.revised", invoice.companyAccount, "invoice", invoice.id, `${invoice.invoiceNumber} revised.`));
  writeState(state, recoveryStoreDir);
  return invoice;
}

export function voidRootInvoice(id: string, reason: string | undefined, recoveryStoreDir?: string): RootInvoiceRecord {
  const state = readState(recoveryStoreDir);
  const invoice = state.invoices.find((candidate) => candidate.id === id);
  if (!invoice) throw new RootBillingError("INVOICE_NOT_FOUND", "Invoice not found.", 404);
  invoice.issueStatus = "voided";
  invoice.paymentStatus = "void";
  invoice.history.unshift(history("invoice.voided", reason?.trim() || `${invoice.invoiceNumber} voided by operator.`));
  applyInvoiceComputedFields(invoice);
  state.events.unshift(eventFor("invoice.voided", invoice.companyAccount, "invoice", invoice.id, `${invoice.invoiceNumber} voided.`));
  writeState(state, recoveryStoreDir);
  return invoice;
}

export async function createRootInvoicePaymentLink(id: string, recoveryStoreDir?: string): Promise<{ invoice: RootInvoiceRecord; link: RootPaymentLinkRecord }> {
  const { createStripePaymentLink } = await import("./stripe-service");
  const state = readState(recoveryStoreDir);
  const invoice = state.invoices.find((candidate) => candidate.id === id);
  if (!invoice) throw new RootBillingError("INVOICE_NOT_FOUND", "Invoice not found.", 404);
  if (invoice.issueStatus !== "issued") {
    throw new RootBillingError("INVOICE_NOT_ISSUED", "Only issued invoices can generate payment links.", 409);
  }
  const result = await createStripePaymentLink(invoice.id, invoice.totalCents, invoice.title);
  const link: RootPaymentLinkRecord = {
    id: result.id,
    provider: "stripe",
    url: result.url,
    status: "created",
    createdAt: nowIso(),
  };
  invoice.paymentLinks.unshift(link);
  invoice.history.unshift(history("invoice.payment_link_created", `Stripe payment link created: ${result.url}`, "local-operator", { linkId: link.id }));
  applyInvoiceComputedFields(invoice);
  state.events.unshift(eventFor("invoice.payment_link_created", invoice.companyAccount, "invoice", invoice.id, `${invoice.invoiceNumber} payment link created.`));
  writeState(state, recoveryStoreDir);
  return { invoice, link };
}
