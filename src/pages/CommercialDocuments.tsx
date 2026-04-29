import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Wand2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  approveRootQuoteDocument,
  convertRootQuoteToInvoice,
  createRootInvoiceDocument,
  createRootInvoiceReminderDraft,
  createRootQuoteDocument,
  exportRootQuotePdf,
  finalizeRootInvoiceArtifacts,
  getRootBillingState,
  issueRootInvoiceDocument,
  markRootQuoteSent,
  recordRootInvoicePayment,
  requestRootQuoteApproval,
  reviseRootInvoiceDocument,
  updateRootInvoiceDocument,
  updateRootQuoteDocument,
  voidRootInvoiceDocument,
} from "@/lib/root-billing-client";
import { formatCents, type RootBillingState, type RootInvoiceRecord, type RootQuoteRecord } from "@/lib/root-billing";
import type { CompanyAccountId } from "@/lib/mission-control";

type CommercialMode = "quotes" | "invoices";

interface CommercialDocumentsProps {
  mode: CommercialMode;
}

interface LineItemDraft {
  id?: string;
  name: string;
  description: string;
  quantity: string;
  unitPrice: string;
  category: string;
}

interface DocumentDraft {
  kind: "quote" | "proposal";
  companyAccount: CompanyAccountId;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientCompany: string;
  clientAddress: string;
  source: "public_intake" | "manual" | "creative_brief" | "booking" | "project" | "local_recovery";
  title: string;
  scopeSummary: string;
  servicePeriod: string;
  projectTimeline: string;
  deliverables: string;
  discount: string;
  tax: string;
  deposit: string;
  dueDate: string;
  terms: string;
  internalNotes: string;
  clientNotes: string;
  lineItems: LineItemDraft[];
}

const emptyLineItem: LineItemDraft = {
  name: "",
  description: "",
  quantity: "1",
  unitPrice: "",
  category: "service",
};

function emptyDraft(companyAccount: CompanyAccountId = "astro-cleaning-services"): DocumentDraft {
  return {
    kind: companyAccount === "content-co-op" ? "proposal" : "quote",
    companyAccount,
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    clientCompany: "",
    clientAddress: "",
    source: "manual",
    title: "",
    scopeSummary: "",
    servicePeriod: "",
    projectTimeline: "",
    deliverables: "",
    discount: "0",
    tax: "0",
    deposit: "0",
    dueDate: "",
    terms: "",
    internalNotes: "",
    clientNotes: "",
    lineItems: [{ ...emptyLineItem }],
  };
}

function cents(value: string): number {
  const parsed = Number.parseFloat(value || "0");
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed * 100));
}

function dollars(centsValue: number): string {
  return (centsValue / 100).toFixed(2);
}

function quoteToDraft(quote: RootQuoteRecord): DocumentDraft {
  return {
    kind: quote.kind,
    companyAccount: quote.companyAccount,
    clientName: quote.client.name,
    clientEmail: quote.client.email ?? "",
    clientPhone: quote.client.phone ?? "",
    clientCompany: quote.client.company ?? "",
    clientAddress: quote.client.address ?? "",
    source: quote.source,
    title: quote.title,
    scopeSummary: quote.scopeSummary,
    servicePeriod: quote.servicePeriod ?? "",
    projectTimeline: quote.projectTimeline ?? "",
    deliverables: quote.deliverables.join("\n"),
    discount: dollars(quote.discountCents),
    tax: dollars(quote.taxCents),
    deposit: dollars(quote.depositCents),
    dueDate: "",
    terms: quote.terms,
    internalNotes: quote.internalNotes,
    clientNotes: quote.clientNotes,
    lineItems: quote.lineItems.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      quantity: String(item.quantity),
      unitPrice: dollars(item.unitPriceCents),
      category: item.category,
    })),
  };
}

function invoiceToDraft(invoice: RootInvoiceRecord): DocumentDraft {
  return {
    kind: invoice.companyAccount === "content-co-op" ? "proposal" : "quote",
    companyAccount: invoice.companyAccount,
    clientName: invoice.client.name,
    clientEmail: invoice.client.email ?? "",
    clientPhone: invoice.client.phone ?? "",
    clientCompany: invoice.client.company ?? "",
    clientAddress: invoice.client.address ?? "",
    source: invoice.source,
    title: invoice.title,
    scopeSummary: "",
    servicePeriod: "",
    projectTimeline: "",
    deliverables: "",
    discount: dollars(invoice.discountCents),
    tax: dollars(invoice.taxCents),
    deposit: dollars(invoice.depositAppliedCents),
    dueDate: invoice.dueDate ?? "",
    terms: "",
    internalNotes: "",
    clientNotes: "",
    lineItems: invoice.lineItems.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      quantity: String(item.quantity),
      unitPrice: dollars(item.unitPriceCents),
      category: item.category,
    })),
  };
}

function draftToQuoteInput(draft: DocumentDraft) {
  return {
    kind: draft.kind,
    companyAccount: draft.companyAccount,
    client: {
      name: draft.clientName,
      email: draft.clientEmail,
      phone: draft.clientPhone,
      company: draft.clientCompany,
      address: draft.clientAddress,
    },
    source: draft.source,
    title: draft.title,
    scopeSummary: draft.scopeSummary,
    servicePeriod: draft.servicePeriod || null,
    projectTimeline: draft.projectTimeline || null,
    deliverables: draft.deliverables.split("\n").map((item) => item.trim()).filter(Boolean),
    lineItems: draft.lineItems.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      quantity: Number(item.quantity || 1),
      unitPriceCents: cents(item.unitPrice),
      taxable: false,
      category: item.category,
    })),
    discountCents: cents(draft.discount),
    taxCents: cents(draft.tax),
    depositCents: cents(draft.deposit),
    terms: draft.terms,
    internalNotes: draft.internalNotes,
    clientNotes: draft.clientNotes,
  };
}

function draftToInvoiceInput(draft: DocumentDraft) {
  return {
    companyAccount: draft.companyAccount,
    client: {
      name: draft.clientName,
      email: draft.clientEmail,
      phone: draft.clientPhone,
      company: draft.clientCompany,
      address: draft.clientAddress,
    },
    source: draft.source,
    title: draft.title,
    lineItems: draft.lineItems.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      quantity: Number(item.quantity || 1),
      unitPriceCents: cents(item.unitPrice),
      taxable: false,
      category: item.category,
    })),
    discountCents: cents(draft.discount),
    taxCents: cents(draft.tax),
    depositAppliedCents: cents(draft.deposit),
    dueDate: draft.dueDate || null,
  };
}

function companyName(account: CompanyAccountId): string {
  return account === "astro-cleaning-services" ? "Astro" : "Content Co-op";
}

function statusClass(status: string): string {
  if (["paid", "issued", "approved", "ready_to_send", "approved_to_issue"].includes(status)) return "text-success";
  if (["overdue", "voided", "void", "declined", "rejected", "changes_requested"].includes(status)) return "text-destructive";
  if (["draft", "unissued", "needs_review"].includes(status)) return "text-warning";
  return "text-muted-foreground";
}

function canIssue(invoice: RootInvoiceRecord): boolean {
  return invoice.issueStatus === "approved_to_issue" && invoice.artifacts.some((artifact) => artifact.artifactType === "pdf");
}

function hasPdfArtifact(document: RootQuoteRecord | RootInvoiceRecord): boolean {
  return document.artifacts.some((artifact) => artifact.artifactType === "pdf");
}

function stageStatus(active: boolean, complete: boolean, blocked = false): "active" | "complete" | "blocked" | "idle" {
  if (blocked) return "blocked";
  if (complete) return "complete";
  if (active) return "active";
  return "idle";
}

function quoteStages(quote: RootQuoteRecord) {
  return [
    { label: "Draft", status: stageStatus(quote.status === "draft", quote.documentVersion > 0) },
    { label: "Review", status: stageStatus(quote.approvalStatus === "requested", quote.approvalStatus === "approved") },
    { label: "PDF", status: stageStatus(false, hasPdfArtifact(quote)) },
    { label: "Sent", status: stageStatus(quote.status === "ready_to_send", ["sent", "accepted", "invoiced"].includes(quote.status)) },
    { label: "Invoice", status: stageStatus(false, quote.status === "invoiced", quote.status === "declined" || quote.status === "archived") },
  ];
}

function invoiceStages(invoice: RootInvoiceRecord) {
  return [
    { label: "Draft", status: stageStatus(invoice.issueStatus === "draft", invoice.documentVersion > 0) },
    { label: "PDF", status: stageStatus(false, hasPdfArtifact(invoice)) },
    { label: "Issue", status: stageStatus(invoice.issueStatus === "approved_to_issue", invoice.issueStatus === "issued", invoice.issueStatus === "voided") },
    { label: "Pay", status: stageStatus(invoice.issueStatus === "issued", invoice.paymentStatus === "paid", invoice.paymentStatus === "void") },
    { label: "Close", status: stageStatus(false, invoice.paymentStatus === "paid" || invoice.paymentStatus === "void") },
  ];
}

type PrimaryActionId =
  | "request_review"
  | "approve"
  | "export_pdf"
  | "mark_sent"
  | "convert"
  | "finalize_pdf"
  | "issue_invoice"
  | "record_payment"
  | "none";

interface NextAction {
  id: PrimaryActionId;
  label: string;
  detail: string;
}

function quoteNextAction(quote: RootQuoteRecord): NextAction {
  if (quote.approvalStatus === "not_required" || quote.status === "draft") return { id: "request_review", label: "Request review", detail: "Lock the draft for operator approval before sending or converting." };
  if (quote.approvalStatus === "requested") return { id: "approve", label: "Approve for send", detail: "Approve the offer after scope, pricing, terms, and PDF preview look right." };
  if (!hasPdfArtifact(quote)) return { id: "export_pdf", label: "Export PDF", detail: "Create the customer-facing artifact before send-state or invoice conversion." };
  if (quote.status === "ready_to_send") return { id: "mark_sent", label: "Mark sent", detail: "Only mark sent after a real send or explicit manual operator note." };
  if (quote.status !== "invoiced") return { id: "convert", label: "Convert to invoice", detail: "Move from negotiable offer to billing authority." };
  return { id: "none", label: "Invoice created", detail: "The quote is closed as invoice lineage." };
}

function invoiceNextAction(invoice: RootInvoiceRecord): NextAction {
  if (!hasPdfArtifact(invoice)) return { id: "finalize_pdf", label: "Finalize PDF", detail: "Final artifact is required before the invoice can be issued." };
  if (invoice.issueStatus !== "issued" && invoice.issueStatus !== "voided") return { id: "issue_invoice", label: "Issue invoice", detail: "Issue only after the final artifact exists." };
  if (invoice.paymentStatus !== "paid" && invoice.paymentStatus !== "void") return { id: "record_payment", label: "Record payment", detail: "Payment state must come from Stripe or an explicit verified manual record." };
  return { id: "none", label: "Closed", detail: "Billing is no longer in active collection." };
}

export function CommercialDocuments({ mode }: CommercialDocumentsProps) {
  const [state, setState] = useState<RootBillingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DocumentDraft>(() => emptyDraft());
  const [paymentAmount, setPaymentAmount] = useState("");
  const [queueQuery, setQueueQuery] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const payload = await getRootBillingState();
      setState(payload);
      setSelectedQuoteId((current) => current ?? payload.quotes[0]?.id ?? null);
      setSelectedInvoiceId((current) => current ?? payload.invoices[0]?.id ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Document engine unavailable.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const quotes = state?.quotes ?? [];
  const invoices = state?.invoices ?? [];
  const selectedQuote = useMemo(
    () => quotes.find((quote) => quote.id === selectedQuoteId) ?? quotes[0] ?? null,
    [quotes, selectedQuoteId],
  );
  const selectedInvoice = useMemo(
    () => invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? invoices[0] ?? null,
    [invoices, selectedInvoiceId],
  );
  const selectedDocument = mode === "quotes" ? selectedQuote : selectedInvoice;
  const filteredQuotes = useMemo(() => {
    const term = queueQuery.trim().toLowerCase();
    if (!term) return quotes;
    return quotes.filter((quote) => [
      quote.documentNumber,
      quote.client.name,
      quote.title,
      quote.status,
      quote.approvalStatus,
      companyName(quote.companyAccount),
    ].some((value) => String(value).toLowerCase().includes(term)));
  }, [queueQuery, quotes]);
  const filteredInvoices = useMemo(() => {
    const term = queueQuery.trim().toLowerCase();
    if (!term) return invoices;
    return invoices.filter((invoice) => [
      invoice.invoiceNumber,
      invoice.client.name,
      invoice.title,
      invoice.issueStatus,
      invoice.paymentStatus,
      companyName(invoice.companyAccount),
    ].some((value) => String(value).toLowerCase().includes(term)));
  }, [queueQuery, invoices]);

  const replaceQuote = (quote: RootQuoteRecord) => {
    setState((current) => current ? { ...current, quotes: [quote, ...current.quotes.filter((item) => item.id !== quote.id)] } : current);
    setSelectedQuoteId(quote.id);
  };

  const replaceInvoice = (invoice: RootInvoiceRecord) => {
    setState((current) => current ? { ...current, invoices: [invoice, ...current.invoices.filter((item) => item.id !== invoice.id)] } : current);
    setSelectedInvoiceId(invoice.id);
  };

  const runAction = async (label: string, action: () => Promise<void>) => {
    setBusy(label);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  };

  const openNewBuilder = () => {
    setEditingId(null);
    setDraft(emptyDraft(mode === "quotes" ? "astro-cleaning-services" : "content-co-op"));
    setBuilderOpen(true);
  };

  const openEditBuilder = () => {
    if (mode === "quotes" && selectedQuote) {
      setEditingId(selectedQuote.id);
      setDraft(quoteToDraft(selectedQuote));
      setBuilderOpen(true);
    }
    if (mode === "invoices" && selectedInvoice) {
      setEditingId(selectedInvoice.id);
      setDraft(invoiceToDraft(selectedInvoice));
      setBuilderOpen(true);
    }
  };

  const runQuoteNextAction = async (quote: RootQuoteRecord) => {
    const next = quoteNextAction(quote);
    await runAction(next.id, async () => {
      if (next.id === "request_review") {
        replaceQuote(await requestRootQuoteApproval(quote.id));
        return;
      }
      if (next.id === "approve") {
        replaceQuote(await approveRootQuoteDocument(quote.id));
        return;
      }
      if (next.id === "export_pdf") {
        const result = await exportRootQuotePdf(quote.id);
        replaceQuote(result.quote);
        window.open(`/api/root/quotes/${quote.id}/pdf`, "_blank", "noopener,noreferrer");
        setNotice("PDF artifact created.");
        return;
      }
      if (next.id === "mark_sent") {
        replaceQuote(await markRootQuoteSent(quote.id, "Manually marked sent from Root commercial workspace."));
        return;
      }
      if (next.id === "convert") {
        const result = await convertRootQuoteToInvoice(quote.id);
        replaceQuote(result.quote);
        replaceInvoice(result.invoice);
        setNotice(`${result.invoice.invoiceNumber} created.`);
      }
    });
  };

  const runInvoiceNextAction = async (invoice: RootInvoiceRecord) => {
    const next = invoiceNextAction(invoice);
    await runAction(next.id, async () => {
      if (next.id === "finalize_pdf") {
        const result = await finalizeRootInvoiceArtifacts(invoice.id);
        replaceInvoice(result.invoice);
        window.open(`/api/root/invoices/${invoice.id}/pdf`, "_blank", "noopener,noreferrer");
        setNotice("Final PDF artifact created.");
        return;
      }
      if (next.id === "issue_invoice") {
        replaceInvoice(await issueRootInvoiceDocument(invoice.id));
        return;
      }
      if (next.id === "record_payment") {
        const paidInvoice = await recordRootInvoicePayment(invoice.id, cents(paymentAmount), "Verified manual payment entered by operator.");
        replaceInvoice(paidInvoice);
        setPaymentAmount("");
      }
    });
  };

  const submitBuilder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAction("saving", async () => {
      if (mode === "quotes") {
        const quote = editingId
          ? await updateRootQuoteDocument(editingId, draftToQuoteInput(draft))
          : await createRootQuoteDocument(draftToQuoteInput(draft));
        replaceQuote(quote);
        setNotice(`${quote.documentNumber} saved.`);
      } else {
        const invoice = editingId
          ? await updateRootInvoiceDocument(editingId, draftToInvoiceInput(draft))
          : await createRootInvoiceDocument(draftToInvoiceInput(draft));
        replaceInvoice(invoice);
        setNotice(`${invoice.invoiceNumber} saved.`);
      }
      setBuilderOpen(false);
      setEditingId(null);
    });
  };

  const updateLineItem = (index: number, patch: Partial<LineItemDraft>) => {
    setDraft((current) => ({
      ...current,
      lineItems: current.lineItems.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }));
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary/60" />
      </div>
    );
  }

  const title = mode === "quotes" ? "Quotes" : "Invoices";
  const subtitle = mode === "quotes"
    ? "Pick one offer, check the next gate, then move it forward."
    : "Pick one invoice, check issue/payment state, then move it forward.";

  return (
    <div className="flex flex-col gap-4 bg-slate-50 text-slate-900 min-h-screen">
      <section className="p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-brand-accent-glow" />
              <h1 className="text-2xl font-display tracking-[0.06em]">{title}</h1>
            </div>
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={openNewBuilder} className="h-8 text-xs btn-mission">
              <Plus className="mr-2 h-3.5 w-3.5" />
              {mode === "quotes" ? "New quote" : "New invoice"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => void load()} className="h-8 border-slate-200 text-xs hover:bg-slate-100">
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </div>
      </section>

      {error && (
        <div className="flex items-center gap-2 rounded-sm border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      {notice && (
        <div className="flex items-center gap-2 rounded-sm border border-success/20 bg-success/10 px-3 py-2 text-xs text-success">
          <CheckCircle2 className="h-4 w-4" />
          {notice}
        </div>
      )}

      {builderOpen && (
        <Card className="border-slate-200">
          <CardHeader className="py-4">
            <CardTitle className="text-sm">{editingId ? "Edit document" : "Build document"}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <form className="grid gap-3" onSubmit={(event) => void submitBuilder(event)}>
              <div className="grid gap-3 lg:grid-cols-4">
                {mode === "quotes" && (
                  <select
                    value={draft.kind}
                    onChange={(event) => setDraft((current) => ({ ...current, kind: event.target.value as DocumentDraft["kind"] }))}
                    className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    <option value="quote">Quote</option>
                    <option value="proposal">Proposal</option>
                  </select>
                )}
                <select
                  value={draft.companyAccount}
                  onChange={(event) => setDraft((current) => ({ ...current, companyAccount: event.target.value as CompanyAccountId }))}
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="astro-cleaning-services">Astro Cleaning Services</option>
                  <option value="content-co-op">Content Co-op</option>
                </select>
                <select
                  value={draft.source}
                  onChange={(event) => setDraft((current) => ({ ...current, source: event.target.value as DocumentDraft["source"] }))}
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="manual">Manual</option>
                  <option value="public_intake">Public intake</option>
                  <option value="creative_brief">Creative brief</option>
                  <option value="booking">Booking</option>
                  <option value="project">Project</option>
                </select>
                {mode === "invoices" && (
                  <Input type="date" value={draft.dueDate} onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))} />
                )}
              </div>

              <div className="grid gap-3 lg:grid-cols-3">
                <Input placeholder="Client name" value={draft.clientName} onChange={(event) => setDraft((current) => ({ ...current, clientName: event.target.value }))} required />
                <Input placeholder="Client email" value={draft.clientEmail} onChange={(event) => setDraft((current) => ({ ...current, clientEmail: event.target.value }))} />
                <Input placeholder="Client phone" value={draft.clientPhone} onChange={(event) => setDraft((current) => ({ ...current, clientPhone: event.target.value }))} />
                <Input placeholder="Client company" value={draft.clientCompany} onChange={(event) => setDraft((current) => ({ ...current, clientCompany: event.target.value }))} />
                <Input className="lg:col-span-2" placeholder="Client address" value={draft.clientAddress} onChange={(event) => setDraft((current) => ({ ...current, clientAddress: event.target.value }))} />
              </div>

              <Input placeholder={mode === "quotes" ? "Scope title" : "Invoice title"} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} required />
              {mode === "quotes" && (
                <textarea
                  placeholder="Scope summary"
                  value={draft.scopeSummary}
                  onChange={(event) => setDraft((current) => ({ ...current, scopeSummary: event.target.value }))}
                  className="min-h-20 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  required
                />
              )}

              <div className="grid gap-2">
                {draft.lineItems.map((item, index) => (
                  <div key={`${item.id ?? "line"}-${index}`} className="grid gap-2 rounded-sm border border-slate-200 bg-slate-100 p-2 lg:grid-cols-[1.2fr_1.5fr_0.45fr_0.65fr_0.7fr_auto]">
                    <Input placeholder="Item" value={item.name} onChange={(event) => updateLineItem(index, { name: event.target.value })} required />
                    <Input placeholder="Description" value={item.description} onChange={(event) => updateLineItem(index, { description: event.target.value })} />
                    <Input placeholder="Qty" value={item.quantity} onChange={(event) => updateLineItem(index, { quantity: event.target.value })} required />
                    <Input placeholder="Price" value={item.unitPrice} onChange={(event) => updateLineItem(index, { unitPrice: event.target.value })} required />
                    <Input placeholder="Category" value={item.category} onChange={(event) => updateLineItem(index, { category: event.target.value })} />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={draft.lineItems.length === 1}
                      onClick={() => setDraft((current) => ({ ...current, lineItems: current.lineItems.filter((_, itemIndex) => itemIndex !== index) }))}
                      className="h-9 border-slate-200 text-xs"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setDraft((current) => ({ ...current, lineItems: [...current.lineItems, { ...emptyLineItem }] }))}
                  className="w-fit border-slate-200 text-xs"
                >
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Line item
                </Button>
              </div>

              <div className="grid gap-3 lg:grid-cols-3">
                <Input placeholder="Discount" value={draft.discount} onChange={(event) => setDraft((current) => ({ ...current, discount: event.target.value }))} />
                <Input placeholder="Tax / fees" value={draft.tax} onChange={(event) => setDraft((current) => ({ ...current, tax: event.target.value }))} />
                <Input placeholder={mode === "quotes" ? "Deposit" : "Deposit applied"} value={draft.deposit} onChange={(event) => setDraft((current) => ({ ...current, deposit: event.target.value }))} />
              </div>

              {mode === "quotes" && (
                <div className="grid gap-3 lg:grid-cols-2">
                  <Input placeholder="Service period / schedule" value={draft.servicePeriod} onChange={(event) => setDraft((current) => ({ ...current, servicePeriod: event.target.value }))} />
                  <Input placeholder="Project timeline" value={draft.projectTimeline} onChange={(event) => setDraft((current) => ({ ...current, projectTimeline: event.target.value }))} />
                  <textarea
                    placeholder="Deliverables, one per line"
                    value={draft.deliverables}
                    onChange={(event) => setDraft((current) => ({ ...current, deliverables: event.target.value }))}
                    className="min-h-20 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  />
                  <textarea
                    placeholder="Terms"
                    value={draft.terms}
                    onChange={(event) => setDraft((current) => ({ ...current, terms: event.target.value }))}
                    className="min-h-20 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                    required
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={busy === "saving"} className="h-9 text-xs">
                  {busy === "saving" ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="mr-2 h-3.5 w-3.5" />}
                  Save
                </Button>
                <Button type="button" variant="outline" onClick={() => setBuilderOpen(false)} className="h-9 border-slate-200 text-xs">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="min-w-0 border-slate-200 ">
          <CardHeader className="space-y-3 py-4">
            <CardTitle className="text-sm">{mode === "quotes" ? "Quote queue" : "Invoice queue"}</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={queueQuery}
                onChange={(event) => setQueueQuery(event.target.value)}
                placeholder={mode === "quotes" ? "Search quotes" : "Search invoices"}
                className="h-8 border-slate-200 bg-slate-100 pl-9 text-xs"
              />
            </div>
          </CardHeader>
          <CardContent className="grid gap-2 p-3 pt-0">
            {(mode === "quotes" ? filteredQuotes : filteredInvoices).length === 0 ? (
              <div className="rounded-sm border border-slate-200 bg-slate-100 p-4 text-sm text-muted-foreground">
                {queueQuery ? "No matching records." : mode === "quotes" ? "No quotes yet." : "No invoices yet."}
              </div>
            ) : mode === "quotes" ? (
              filteredQuotes.map((quote) => (
                <button
                  key={quote.id}
                  type="button"
                  onClick={() => setSelectedQuoteId(quote.id)}
                  className={`rounded-sm border p-3 text-left transition ${selectedQuote?.id === quote.id ? "border-primary/40 bg-primary/10" : "border-slate-200 bg-white hover:border-slate-300"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{quote.client.name}</p>
                      <p className="mt-1 text-[10px] uppercase text-muted-foreground">{quote.documentNumber} · {companyName(quote.companyAccount)}</p>
                    </div>
                    <p className="text-sm font-semibold">{formatCents(quote.totalCents)}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline" className={`text-[8px] uppercase ${statusClass(quote.status)}`}>{quote.status.replace(/_/g, " ")}</Badge>
                    <Badge variant="outline" className={`text-[8px] uppercase ${statusClass(quote.approvalStatus)}`}>{quote.approvalStatus.replace(/_/g, " ")}</Badge>
                  </div>
                </button>
              ))
            ) : (
              filteredInvoices.map((invoice) => (
                <button
                  key={invoice.id}
                  type="button"
                  onClick={() => setSelectedInvoiceId(invoice.id)}
                  className={`rounded-sm border p-3 text-left transition ${selectedInvoice?.id === invoice.id ? "border-primary/40 bg-primary/10" : "border-slate-200 bg-white hover:border-slate-300"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{invoice.client.name}</p>
                      <p className="mt-1 text-[10px] uppercase text-muted-foreground">{invoice.invoiceNumber} · {companyName(invoice.companyAccount)}</p>
                    </div>
                    <p className="text-sm font-semibold">{formatCents(invoice.totalCents)}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline" className={`text-[8px] uppercase ${statusClass(invoice.issueStatus)}`}>{invoice.issueStatus.replace(/_/g, " ")}</Badge>
                    <Badge variant="outline" className={`text-[8px] uppercase ${statusClass(invoice.paymentStatus)}`}>{invoice.paymentStatus.replace(/_/g, " ")}</Badge>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(360px,0.82fr)_minmax(440px,1.18fr)]">
          <Card className="min-w-0 border-slate-200">
            <CardHeader className="py-4">
              <CardTitle className="text-sm">Detail</CardTitle>
            </CardHeader>
            <CardContent className="min-w-0 space-y-4 p-4 pt-0">
              {!selectedDocument ? (
                <p className="text-sm text-muted-foreground">Select or create a document.</p>
              ) : mode === "quotes" && selectedQuote ? (
                <>
	                  <div className="space-y-1">
	                    <p className="text-[10px] uppercase text-muted-foreground">{selectedQuote.documentNumber}</p>
	                    <h2 className="max-w-[36ch] break-words text-xl font-semibold leading-tight tracking-normal">{selectedQuote.title}</h2>
	                    <p className="text-sm text-muted-foreground">{selectedQuote.scopeSummary}</p>
	                  </div>
	                  <WorkflowRail stages={quoteStages(selectedQuote)} />
	                  <NextActionPanel
	                    action={quoteNextAction(selectedQuote)}
	                    documentNumber={selectedQuote.documentNumber}
	                    busy={busy}
	                    onRun={() => void runQuoteNextAction(selectedQuote)}
	                  />
	                  <div className="grid gap-2 xl:grid-cols-3">
	                    <Metric label="Client" value={selectedQuote.client.name} />
	                    <Metric label="Total" value={formatCents(selectedQuote.totalCents)} />
	                    <Metric label="Version" value={`v${selectedQuote.documentVersion}`} />
	                  </div>
	                  <SecondaryActions title="Other actions">
	                    <Button size="sm" variant="outline" onClick={openEditBuilder} className="border-slate-200 text-xs">Edit</Button>
	                    {quoteNextAction(selectedQuote).id !== "export_pdf" && (
	                      <Button size="sm" variant="outline" onClick={() => void runAction("export_pdf", async () => {
	                        const result = await exportRootQuotePdf(selectedQuote.id);
	                        replaceQuote(result.quote);
	                        window.open(`/api/root/quotes/${selectedQuote.id}/pdf`, "_blank", "noopener,noreferrer");
	                        setNotice("PDF artifact created.");
	                      })} className="border-slate-200 text-xs">
	                        <Download className="mr-2 h-3.5 w-3.5" />
	                        PDF
	                      </Button>
	                    )}
	                    {selectedQuote.approvalStatus === "approved" && selectedQuote.status !== "invoiced" && quoteNextAction(selectedQuote).id !== "convert" && (
	                      <Button
	                        size="sm"
	                        variant="outline"
	                        onClick={() => void runAction("convert", async () => {
	                          const result = await convertRootQuoteToInvoice(selectedQuote.id);
	                          replaceQuote(result.quote);
	                          replaceInvoice(result.invoice);
	                          setNotice(`${result.invoice.invoiceNumber} created.`);
	                        })}
	                        className="border-slate-200 text-xs"
	                      >
	                        Convert
	                      </Button>
	                    )}
	                  </SecondaryActions>
                  <History entries={selectedQuote.history.map((entry) => `${entry.createdAt} · ${entry.summary}`)} />
                </>
              ) : selectedInvoice ? (
                <>
	                  <div className="space-y-1">
	                    <p className="text-[10px] uppercase text-muted-foreground">{selectedInvoice.invoiceNumber}</p>
	                    <h2 className="max-w-[36ch] break-words text-xl font-semibold leading-tight tracking-normal">{selectedInvoice.title}</h2>
	                    <p className="text-sm text-muted-foreground">{selectedInvoice.client.name} · {companyName(selectedInvoice.companyAccount)}</p>
	                  </div>
	                  <WorkflowRail stages={invoiceStages(selectedInvoice)} />
	                  <NextActionPanel
	                    action={invoiceNextAction(selectedInvoice)}
	                    documentNumber={selectedInvoice.invoiceNumber}
	                    busy={busy}
	                    disabled={
	                      (invoiceNextAction(selectedInvoice).id === "issue_invoice" && !canIssue(selectedInvoice))
	                      || (invoiceNextAction(selectedInvoice).id === "record_payment" && !paymentAmount.trim())
	                    }
	                    disabledReason={invoiceNextAction(selectedInvoice).id === "record_payment" ? "Enter a verified payment amount below." : "Finalize PDF before issue."}
	                    onRun={() => void runInvoiceNextAction(selectedInvoice)}
	                  />
	                  <div className="grid gap-2 xl:grid-cols-3">
	                    <Metric label="Total" value={formatCents(selectedInvoice.totalCents)} />
                    <Metric label="Paid" value={formatCents(selectedInvoice.amountPaidCents)} />
                    <Metric label="Due" value={selectedInvoice.dueDate ?? "Not set"} />
                  </div>
                  <SecondaryActions title="Other actions">
                    <Button size="sm" variant="outline" onClick={openEditBuilder} disabled={selectedInvoice.issueStatus === "issued" || selectedInvoice.issueStatus === "voided"} className="border-slate-200 text-xs">Edit draft</Button>
                    {invoiceNextAction(selectedInvoice).id !== "finalize_pdf" && (
                      <Button size="sm" variant="outline" onClick={() => void runAction("finalize_pdf", async () => {
                      const result = await finalizeRootInvoiceArtifacts(selectedInvoice.id);
                      replaceInvoice(result.invoice);
                      window.open(`/api/root/invoices/${selectedInvoice.id}/pdf`, "_blank", "noopener,noreferrer");
                      setNotice("Final PDF artifact created.");
                    })} className="border-slate-200 text-xs">
                      <Download className="mr-2 h-3.5 w-3.5" />
                      PDF
                    </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => void runAction("reminder", async () => replaceInvoice(await createRootInvoiceReminderDraft(selectedInvoice.id)))} className="border-slate-200 text-xs">
                      Reminder
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void runAction("revising", async () => replaceInvoice(await reviseRootInvoiceDocument(selectedInvoice.id)))} className="border-slate-200 text-xs">
                      Revise
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void runAction("voiding", async () => replaceInvoice(await voidRootInvoiceDocument(selectedInvoice.id, "Voided from Root commercial workspace.")))} className="border-slate-200 text-xs">
                      Void
                    </Button>
                  </SecondaryActions>
                  {invoiceNextAction(selectedInvoice).id === "record_payment" && (
                  <div className="grid gap-2 rounded-sm border border-slate-200 bg-slate-100 p-3 sm:grid-cols-[1fr_auto]">
                    <Input placeholder="Manual payment" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} />
                    <Button
                      size="sm"
                      disabled={selectedInvoice.issueStatus !== "issued" || selectedInvoice.paymentStatus === "paid" || selectedInvoice.paymentStatus === "void"}
                      title={selectedInvoice.issueStatus !== "issued" ? "Issue invoice before recording payment." : selectedInvoice.paymentStatus === "paid" ? "Invoice is already paid." : undefined}
                      onClick={() => void runAction("payment", async () => {
                        const invoice = await recordRootInvoicePayment(selectedInvoice.id, cents(paymentAmount), "Verified manual payment entered by operator.");
                        replaceInvoice(invoice);
                        setPaymentAmount("");
                      })}
                      className="h-9 text-xs"
                    >
                      Record payment
                    </Button>
                  </div>
                  )}
                  <History entries={selectedInvoice.history.map((entry) => `${entry.createdAt} · ${entry.summary}`)} />
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card className="min-w-0 border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <CardTitle className="text-sm">Preview</CardTitle>
              <Badge variant="outline" className="text-[8px] uppercase text-muted-foreground">
                {selectedDocument?.dataSource ?? "no data"}
              </Badge>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              {selectedDocument?.previewHtml ? (
                <iframe
                  title="Document preview"
                  srcDoc={selectedDocument.previewHtml}
                  className="h-[680px] w-full rounded-sm border border-slate-200 bg-white"
                />
              ) : (
                <div className="flex h-[400px] items-center justify-center rounded-sm border border-slate-200 bg-slate-100 text-sm text-muted-foreground">
                  No preview available.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-slate-200 bg-slate-100 p-3">
      <p className="text-[9px] uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-medium">{value}</p>
    </div>
  );
}

function WorkflowRail({ stages }: { stages: Array<{ label: string; status: "active" | "complete" | "blocked" | "idle" }> }) {
  return (
    <div className="grid grid-cols-5 gap-1 rounded-sm border border-slate-200 bg-slate-100 p-2">
      {stages.map((stage) => (
        <div key={stage.label} className="min-w-0 text-center">
          <div
            className={`mx-auto h-2 w-full rounded-full ${
              stage.status === "complete"
                ? "bg-success"
                : stage.status === "active"
                  ? "bg-primary"
                  : stage.status === "blocked"
                    ? "bg-destructive"
                    : "bg-white/10"
            }`}
          />
          <p className={`mt-2 truncate text-[9px] uppercase ${stage.status === "idle" ? "text-muted-foreground" : "text-slate-900"}`}>{stage.label}</p>
        </div>
      ))}
    </div>
  );
}

function NextActionPanel({
  action,
  documentNumber,
  busy,
  disabled = false,
  disabledReason,
  onRun,
}: {
  action: NextAction;
  documentNumber: string;
  busy: string | null;
  disabled?: boolean;
  disabledReason?: string;
  onRun?: () => void;
}) {
  const actionRunning = busy === action.id;
  const hasPrimaryAction = action.id !== "none" && Boolean(onRun);

  return (
    <div className="rounded-sm border border-primary/10 bg-primary/10 p-3">
      <div className="grid gap-3">
        <div>
          <p className="text-[10px] uppercase text-primary">Next action</p>
          <p className="mt-1 text-lg font-semibold">{action.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{action.detail}</p>
        </div>
        {hasPrimaryAction ? (
          <Button
            size="sm"
            disabled={Boolean(busy) || disabled}
            title={disabled ? disabledReason : undefined}
            onClick={onRun}
            className="h-9 w-full justify-center text-xs sm:w-fit"
          >
            {actionRunning ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <PrimaryActionIcon actionId={action.id} />}
            {action.label}
          </Button>
        ) : (
          <Badge variant="outline" className="w-fit text-[8px] uppercase text-primary">
            {documentNumber}
          </Badge>
        )}
      </div>
    </div>
  );
}

function PrimaryActionIcon({ actionId }: { actionId: PrimaryActionId }) {
  if (actionId === "export_pdf" || actionId === "finalize_pdf") return <Download className="mr-2 h-3.5 w-3.5" />;
  if (actionId === "mark_sent" || actionId === "issue_invoice") return <Send className="mr-2 h-3.5 w-3.5" />;
  if (actionId === "convert" || actionId === "record_payment") return <Wand2 className="mr-2 h-3.5 w-3.5" />;
  return <ShieldCheck className="mr-2 h-3.5 w-3.5" />;
}

function SecondaryActions({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-sm border border-slate-200 bg-slate-100 p-3">
      <p className="text-[9px] uppercase text-muted-foreground">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function History({ entries }: { entries: string[] }) {
  return (
    <div className="rounded-sm border border-slate-200 bg-slate-100 p-3">
      <p className="text-[9px] uppercase text-muted-foreground">History</p>
      <div className="mt-2 grid max-h-48 gap-2 overflow-auto text-xs text-muted-foreground">
        {entries.slice(0, 8).map((entry) => (
          <p key={entry}>{entry}</p>
        ))}
      </div>
    </div>
  );
}
