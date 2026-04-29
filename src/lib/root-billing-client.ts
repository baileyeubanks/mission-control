import type {
  RootBillingApiEnvelope,
  RootBillingState,
  RootInvoiceInput,
  RootInvoiceRecord,
  RootQuoteInput,
  RootQuoteRecord,
} from "./root-billing";

async function parseRootBilling<T>(response: Response, fallbackMessage: string): Promise<T> {
  const payload = (await response.json()) as RootBillingApiEnvelope<T>;
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error?.message || fallbackMessage);
  }
  if (payload.data === undefined) throw new Error(fallbackMessage);
  return payload.data;
}

export async function getRootBillingState(): Promise<RootBillingState> {
  return parseRootBilling<RootBillingState>(await fetch("/api/root/billing"), "Failed to load Root billing engine.");
}

export async function listRootQuotes(): Promise<RootQuoteRecord[]> {
  return parseRootBilling<RootQuoteRecord[]>(await fetch("/api/root/quotes"), "Failed to load quotes/proposals.");
}

export async function createRootQuoteDocument(input: RootQuoteInput): Promise<RootQuoteRecord> {
  return parseRootBilling<RootQuoteRecord>(
    await fetch("/api/root/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
    "Failed to create quote/proposal.",
  );
}

export async function updateRootQuoteDocument(id: string, input: RootQuoteInput): Promise<RootQuoteRecord> {
  return parseRootBilling<RootQuoteRecord>(
    await fetch(`/api/root/quotes/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
    "Failed to update quote/proposal.",
  );
}

export async function requestRootQuoteApproval(id: string): Promise<RootQuoteRecord> {
  return parseRootBilling<RootQuoteRecord>(
    await fetch(`/api/root/quotes/${encodeURIComponent(id)}/approval-request`, { method: "POST" }),
    "Failed to request quote approval.",
  );
}

export async function approveRootQuoteDocument(id: string): Promise<RootQuoteRecord> {
  return parseRootBilling<RootQuoteRecord>(
    await fetch(`/api/root/quotes/${encodeURIComponent(id)}/approve`, { method: "POST" }),
    "Failed to approve quote/proposal.",
  );
}

export async function exportRootQuotePdf(id: string): Promise<{ quote: RootQuoteRecord; artifact: unknown }> {
  return parseRootBilling<{ quote: RootQuoteRecord; artifact: unknown }>(
    await fetch(`/api/root/quotes/${encodeURIComponent(id)}/export-pdf`, { method: "POST" }),
    "Failed to export quote/proposal PDF.",
  );
}

export async function markRootQuoteSent(id: string, note: string): Promise<RootQuoteRecord> {
  return parseRootBilling<RootQuoteRecord>(
    await fetch(`/api/root/quotes/${encodeURIComponent(id)}/mark-sent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    }),
    "Failed to mark quote/proposal sent.",
  );
}

export async function clientApproveRootQuoteDocument(id: string): Promise<RootQuoteRecord> {
  return parseRootBilling<RootQuoteRecord>(
    await fetch(`/api/root/quotes/${encodeURIComponent(id)}/client-approve`, { method: "POST" }),
    "Failed to approve document.",
  );
}

export async function requestRootQuoteChanges(id: string, note: string): Promise<RootQuoteRecord> {
  return parseRootBilling<RootQuoteRecord>(
    await fetch(`/api/root/quotes/${encodeURIComponent(id)}/request-changes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    }),
    "Failed to request changes.",
  );
}

export async function convertRootQuoteToInvoice(id: string): Promise<{ quote: RootQuoteRecord; invoice: RootInvoiceRecord }> {
  return parseRootBilling<{ quote: RootQuoteRecord; invoice: RootInvoiceRecord }>(
    await fetch(`/api/root/quotes/${encodeURIComponent(id)}/convert-to-invoice`, { method: "POST" }),
    "Failed to convert quote/proposal to invoice.",
  );
}

export async function listRootInvoices(): Promise<RootInvoiceRecord[]> {
  return parseRootBilling<RootInvoiceRecord[]>(await fetch("/api/root/invoices"), "Failed to load invoices.");
}

export async function createRootInvoiceDocument(input: RootInvoiceInput): Promise<RootInvoiceRecord> {
  return parseRootBilling<RootInvoiceRecord>(
    await fetch("/api/root/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
    "Failed to create invoice.",
  );
}

export async function updateRootInvoiceDocument(id: string, input: RootInvoiceInput): Promise<RootInvoiceRecord> {
  return parseRootBilling<RootInvoiceRecord>(
    await fetch(`/api/root/invoices/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
    "Failed to update invoice.",
  );
}

export async function finalizeRootInvoiceArtifacts(id: string): Promise<{ invoice: RootInvoiceRecord; artifact: unknown }> {
  return parseRootBilling<{ invoice: RootInvoiceRecord; artifact: unknown }>(
    await fetch(`/api/root/invoices/${encodeURIComponent(id)}/finalize-artifacts`, { method: "POST" }),
    "Failed to finalize invoice artifacts.",
  );
}

export async function issueRootInvoiceDocument(id: string): Promise<RootInvoiceRecord> {
  return parseRootBilling<RootInvoiceRecord>(
    await fetch(`/api/root/invoices/${encodeURIComponent(id)}/issue`, { method: "POST" }),
    "Failed to issue invoice.",
  );
}

export async function recordRootInvoicePayment(id: string, amountCents: number, note: string): Promise<RootInvoiceRecord> {
  return parseRootBilling<RootInvoiceRecord>(
    await fetch(`/api/root/invoices/${encodeURIComponent(id)}/record-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountCents, note }),
    }),
    "Failed to record payment.",
  );
}

export async function createRootInvoiceReminderDraft(id: string): Promise<RootInvoiceRecord> {
  return parseRootBilling<RootInvoiceRecord>(
    await fetch(`/api/root/invoices/${encodeURIComponent(id)}/reminder-draft`, { method: "POST" }),
    "Failed to create invoice reminder draft.",
  );
}

export async function reviseRootInvoiceDocument(id: string): Promise<RootInvoiceRecord> {
  return parseRootBilling<RootInvoiceRecord>(
    await fetch(`/api/root/invoices/${encodeURIComponent(id)}/revise`, { method: "POST" }),
    "Failed to revise invoice.",
  );
}

export async function voidRootInvoiceDocument(id: string, reason: string): Promise<RootInvoiceRecord> {
  return parseRootBilling<RootInvoiceRecord>(
    await fetch(`/api/root/invoices/${encodeURIComponent(id)}/void`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    }),
    "Failed to void invoice.",
  );
}

export async function createStripePaymentLink(id: string): Promise<never> {
  return parseRootBilling<never>(
    await fetch(`/api/root/invoices/${encodeURIComponent(id)}/payment-link`, { method: "POST" }),
    "Stripe payment link is not available.",
  );
}
