import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Filter, Download, Database, FileText, Eye, X, Loader2, CheckCircle2, RotateCcw, Trash2, Mail, Send, CreditCard, ChevronRight, AlertCircle } from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";
import { useAuth } from "@/components/AuthProvider";

interface Quote {
  id: string;
  documentNumber: string;
  client_name: string;
  title: string;
  amount: number;
  status: string;
  type: string;
  expiry: string | null;
  scopeSummary?: string;
  deliverables?: string[];
  lineItems?: Array<{
    name: string;
    description: string;
    quantity: number;
    unitPriceCents: number;
    taxable: boolean;
  }>;
  subtotalCents?: number;
  totalCents?: number;
  depositCents?: number;
  taxCents?: number;
  discountCents?: number;
  terms?: string;
  approvalStatus?: string;
  rawStatus?: string;
  reference?: string | null;
  projectTimeline?: string | null;
  servicePeriod?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  clientCompany?: string | null;
  clientAddress?: string | null;
  createdAt?: string;
}

interface LineItemForm {
  name: string;
  description: string;
  quantity: string;
  unitPrice: string;
  taxable: boolean;
}

function mapRootQuoteToUI(q: Record<string, unknown>): Quote {
  const client = (q.client as Record<string, unknown>) || {};
  const totalCents = typeof q.totalCents === "number" ? q.totalCents : 0;
  const rawStatus = String(q.status || "draft");

  const statusMap: Record<string, string> = {
    draft: "Draft",
    needs_review: "Review",
    ready_to_send: "Ready",
    sent: "Sent",
    accepted: "Accepted",
    changes_requested: "Changes",
    declined: "Declined",
    expired: "Expired",
    invoiced: "Invoiced",
    archived: "Archived",
  };

  return {
    id: String(q.id || ""),
    documentNumber: String(q.documentNumber || ""),
    client_name: String(client.name || "Unknown"),
    title: String(q.title || ""),
    amount: totalCents / 100,
    status: statusMap[rawStatus] || rawStatus,
    type: String(q.kind || "quote"),
    expiry: q.expirationDate ? String(q.expirationDate) : null,
    scopeSummary: q.scopeSummary ? String(q.scopeSummary) : undefined,
    deliverables: Array.isArray(q.deliverables) ? q.deliverables.map(String) : undefined,
    lineItems: Array.isArray(q.lineItems)
      ? q.lineItems.map((li: unknown) => {
          const item = li as Record<string, unknown>;
          return {
            name: String(item.name || ""),
            description: String(item.description || ""),
            quantity: typeof item.quantity === "number" ? item.quantity : 0,
            unitPriceCents: typeof item.unitPriceCents === "number" ? item.unitPriceCents : 0,
            taxable: Boolean(item.taxable),
          };
        })
      : undefined,
    subtotalCents: typeof q.subtotalCents === "number" ? q.subtotalCents : undefined,
    totalCents: typeof q.totalCents === "number" ? q.totalCents : undefined,
    depositCents: typeof q.depositCents === "number" ? q.depositCents : undefined,
    taxCents: typeof q.taxCents === "number" ? q.taxCents : undefined,
    discountCents: typeof q.discountCents === "number" ? q.discountCents : undefined,
    terms: q.terms ? String(q.terms) : undefined,
    approvalStatus: q.approvalStatus ? String(q.approvalStatus) : undefined,
    rawStatus,
    reference: q.reference ? String(q.reference) : null,
    projectTimeline: q.projectTimeline ? String(q.projectTimeline) : null,
    servicePeriod: q.servicePeriod ? String(q.servicePeriod) : null,
    clientEmail: client.email ? String(client.email) : null,
    clientPhone: client.phone ? String(client.phone) : null,
    clientCompany: client.company ? String(client.company) : null,
    clientAddress: client.address ? String(client.address) : null,
    createdAt: q.createdAt ? String(q.createdAt) : undefined,
  };
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function todayInputValue() {
  return new Date().toISOString().split("T")[0];
}

export function Quotes() {
  const { isAuthReady, user } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [detailQuote, setDetailQuote] = useState<Quote | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const [form, setForm] = useState({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    clientCompany: "",
    clientAddress: "",
    title: "",
    reference: "",
    scopeSummary: "",
    projectTimeline: "",
    servicePeriod: "",
    kind: "quote" as "quote" | "proposal",
    deliverables: "",
    depositPercent: "50",
    taxCents: "",
    discountCents: "",
    terms: "",
    expirationDate: "",
  });

  const [lineItems, setLineItems] = useState<LineItemForm[]>([
    { name: "", description: "", quantity: "1", unitPrice: "", taxable: false },
  ]);

  async function fetchQuotes() {
    setLoading(true);
    try {
      const res = await authFetch("/api/root/quotes?account=content_coop");
      const json = await res.json();
      if (json.ok && Array.isArray(json.data)) {
        setQuotes(json.data.map(mapRootQuoteToUI));
      } else {
        setQuotes([]);
      }
    } catch (error) {
      console.error("Error fetching quotes:", error);
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAuthReady || !user) return;
    fetchQuotes();
  }, [isAuthReady, user]);

  const filteredQuotes = quotes.filter(
    (q) =>
      q.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.documentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.title || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totals = useMemo(() => {
    const active = quotes.filter((q) => q.rawStatus !== "invoiced" && q.rawStatus !== "declined" && q.rawStatus !== "expired" && q.rawStatus !== "archived").length;
    const pending = quotes.filter((q) => q.rawStatus === "needs_review").length;
    const closed = quotes.filter((q) => q.rawStatus === "accepted" || q.rawStatus === "invoiced").length;
    const activeValue = quotes
      .filter((q) => q.rawStatus !== "invoiced" && q.rawStatus !== "declined" && q.rawStatus !== "expired" && q.rawStatus !== "archived")
      .reduce((sum, q) => sum + q.amount, 0);
    return { active, pending, closed, activeValue };
  }, [quotes]);

  const formTotals = useMemo(() => {
    const subtotal = lineItems.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      return sum + qty * price;
    }, 0);
    const tax = (parseFloat(form.taxCents) || 0) / 100;
    const discount = (parseFloat(form.discountCents) || 0) / 100;
    const depositPct = (parseFloat(form.depositPercent) || 0) / 100;
    const total = Math.max(subtotal + tax - discount, 0);
    const depositTotal = total * depositPct;
    return { subtotal, total, depositTotal };
  }, [lineItems, form.taxCents, form.discountCents, form.depositPercent]);

  function addLineItem() {
    setLineItems((prev) => [...prev, { name: "", description: "", quantity: "1", unitPrice: "", taxable: false }]);
  }
  function removeLineItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }
  function updateLineItem(index: number, field: keyof LineItemForm, value: string | boolean) {
    setLineItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  async function createQuote(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientName || !form.title || lineItems.length === 0 || !lineItems[0].name) return;
    setCreating(true);
    try {
      const bodyItems = lineItems
        .filter((item) => item.name.trim())
        .map((item) => ({
          name: item.name,
          description: item.description,
          quantity: parseFloat(item.quantity) || 1,
          unitPriceCents: Math.round((parseFloat(item.unitPrice) || 0) * 100),
          taxable: item.taxable,
        }));

      const totalCents = Math.round(formTotals.total * 100);
      const depositCents = Math.round(totalCents * ((parseFloat(form.depositPercent) || 0) / 100));

      const res = await authFetch("/api/root/quotes", {
        method: "POST",
        body: JSON.stringify({
          kind: form.kind,
          companyAccount: "content_coop",
          client: {
            name: form.clientName,
            email: form.clientEmail || null,
            phone: form.clientPhone || null,
            company: form.clientCompany || null,
            address: form.clientAddress || null,
          },
          title: form.title,
          reference: form.reference || null,
          scopeSummary: form.scopeSummary || "",
          projectTimeline: form.projectTimeline || null,
          servicePeriod: form.servicePeriod || null,
          deliverables: form.deliverables
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          lineItems: bodyItems,
          depositCents,
          taxCents: parseInt(form.taxCents || "0", 10) || 0,
          discountCents: parseInt(form.discountCents || "0", 10) || 0,
          terms: form.terms || "",
          expirationDate: form.expirationDate || null,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        resetForm();
        setShowForm(false);
        await fetchQuotes();
      } else {
        alert("Failed to create quote: " + (json.error?.message || "Unknown error"));
      }
    } catch (err) {
      alert("Failed to create quote.");
    } finally {
      setCreating(false);
    }
  }

  function resetForm() {
    setForm({
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      clientCompany: "",
      clientAddress: "",
      title: "",
      reference: "",
      scopeSummary: "",
      projectTimeline: "",
      servicePeriod: "",
      kind: "quote",
      deliverables: "",
      depositPercent: "50",
      taxCents: "",
      discountCents: "",
      terms: "",
      expirationDate: "",
    });
    setLineItems([{ name: "", description: "", quantity: "1", unitPrice: "", taxable: false }]);
  }

  async function runAction(id: string, action: string, method: string = "POST", body?: unknown) {
    setActionLoading(action);
    try {
      const opts: RequestInit = { method };
      if (body) opts.body = JSON.stringify(body);
      const res = await authFetch(`/api/root/quotes/${id}/${action}`, opts);
      const json = await res.json();
      if (json.ok) {
        await fetchQuotes();
        if (detailQuote?.id === id) {
          const refreshed = await authFetch(`/api/root/quotes/${id}`);
          const rjson = await refreshed.json();
          if (rjson.ok) setDetailQuote(mapRootQuoteToUI(rjson.data));
        }
      } else {
        alert(`Action failed: ${json.error?.message || json.error?.code || "Unknown"}`);
      }
    } catch (err) {
      alert("Action failed.");
    } finally {
      setActionLoading(null);
    }
  }

  async function previewPdf(id: string) {
    setActionLoading("pdf");
    try {
      const res = await authFetch(`/api/root/quotes/${id}/pdf`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (err) {
      alert("Failed to load PDF preview.");
    } finally {
      setActionLoading(null);
    }
  }

  async function exportPdf(id: string, documentNumber: string) {
    setActionLoading("export-pdf");
    try {
      const res = await authFetch(`/api/root/quotes/${id}/pdf`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${documentNumber || id}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to export PDF.");
    } finally {
      setActionLoading(null);
    }
  }

  const exportQuotes = () => {
    const payload = JSON.stringify(
      {
        data_source: "root_billing_quote_authority",
        generated_at: new Date().toISOString(),
        quotes: filteredQuotes,
      },
      null,
      2
    );
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mission-control-quotes-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Quote &amp; Proposal Workspace</h1>
          <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground uppercase">
            <Database className="h-3 w-3 text-success" />
            Authority: Root_Document_Engine
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 font-mono uppercase text-[10px] border-slate-200" onClick={exportQuotes}>
            <Download className="mr-2 h-3.5 w-3.5" />
            Export
          </Button>
          <Button size="sm" className="h-9 font-mono uppercase text-[10px] tracking-wider" onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            Add Quote
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">New Quote / Proposal</h3>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowForm(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <form onSubmit={createQuote} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-muted-foreground">Client Name *</label>
                <Input placeholder="Tyler Day" value={form.clientName} onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-muted-foreground">Email</label>
                <Input placeholder="tyler@mdg.agency" type="email" value={form.clientEmail} onChange={(e) => setForm((f) => ({ ...f, clientEmail: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-muted-foreground">Phone</label>
                <Input placeholder="(501) 351-5927" value={form.clientPhone} onChange={(e) => setForm((f) => ({ ...f, clientPhone: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-muted-foreground">Company</label>
                <Input placeholder="MDG, A Freeman Company" value={form.clientCompany} onChange={(e) => setForm((f) => ({ ...f, clientCompany: e.target.value }))} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] font-mono uppercase text-muted-foreground">Address</label>
                <Input placeholder="322 Wilcrest Dr, Houston, TX 77042" value={form.clientAddress} onChange={(e) => setForm((f) => ({ ...f, clientAddress: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-muted-foreground">Title *</label>
                <Input placeholder="Car Wash Show 2026" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-muted-foreground">Reference</label>
                <Input placeholder="Project name or PO #" value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-muted-foreground">Type</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={form.kind}
                  onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as "quote" | "proposal" }))}
                >
                  <option value="quote">Quote</option>
                  <option value="proposal">Proposal</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-muted-foreground">Expiry Date</label>
                <Input type="date" value={form.expirationDate} onChange={(e) => setForm((f) => ({ ...f, expirationDate: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-muted-foreground">Scope Summary</label>
                <textarea
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Brief description of scope..."
                  value={form.scopeSummary}
                  onChange={(e) => setForm((f) => ({ ...f, scopeSummary: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-muted-foreground">Deliverables (comma-separated)</label>
                <textarea
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Video deliverable, photo deliverable, raw footage..."
                  value={form.deliverables}
                  onChange={(e) => setForm((f) => ({ ...f, deliverables: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-muted-foreground">Project Timeline</label>
                <Input placeholder="e.g. 2 weeks" value={form.projectTimeline} onChange={(e) => setForm((f) => ({ ...f, projectTimeline: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-muted-foreground">Service Period</label>
                <Input placeholder="e.g. Q2 2026" value={form.servicePeriod} onChange={(e) => setForm((f) => ({ ...f, servicePeriod: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono uppercase text-muted-foreground">Line Items</label>
                <Button type="button" variant="outline" size="sm" className="h-7 text-[10px]" onClick={addLineItem}>
                  <Plus className="mr-1 h-3 w-3" /> Add line
                </Button>
              </div>
              {lineItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end p-3 rounded-md bg-slate-50 border border-slate-200">
                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-[9px] font-mono uppercase text-muted-foreground">Name *</label>
                    <Input placeholder="Video Production" className="h-8 text-xs" value={item.name} onChange={(e) => updateLineItem(idx, "name", e.target.value)} required />
                  </div>
                  <div className="sm:col-span-4 space-y-1">
                    <label className="text-[9px] font-mono uppercase text-muted-foreground">Description</label>
                    <Input placeholder="3.5 days on-site capture" className="h-8 text-xs" value={item.description} onChange={(e) => updateLineItem(idx, "description", e.target.value)} />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[9px] font-mono uppercase text-muted-foreground">Qty</label>
                    <Input type="number" min="1" className="h-8 text-xs" value={item.quantity} onChange={(e) => updateLineItem(idx, "quantity", e.target.value)} />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[9px] font-mono uppercase text-muted-foreground">Unit Price ($)</label>
                    <Input type="number" step="0.01" min="0" className="h-8 text-xs" value={item.unitPrice} onChange={(e) => updateLineItem(idx, "unitPrice", e.target.value)} />
                  </div>
                  <div className="sm:col-span-1">
                    {lineItems.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeLineItem(idx)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-muted-foreground">Deposit %</label>
                <Input type="number" min="0" max="100" value={form.depositPercent} onChange={(e) => setForm((f) => ({ ...f, depositPercent: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-muted-foreground">Tax ($)</label>
                <Input type="number" step="0.01" min="0" value={form.taxCents} onChange={(e) => setForm((f) => ({ ...f, taxCents: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-muted-foreground">Discount ($)</label>
                <Input type="number" step="0.01" min="0" value={form.discountCents} onChange={(e) => setForm((f) => ({ ...f, discountCents: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-muted-foreground">Terms</label>
                <textarea
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Payment terms, cancellation policy..."
                  value={form.terms}
                  onChange={(e) => setForm((f) => ({ ...f, terms: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex flex-col justify-end">
              <div className="text-right space-y-1">
                <div className="text-[10px] font-mono text-muted-foreground uppercase">Subtotal: {formatCurrency(formTotals.subtotal)}</div>
                <div className="text-[10px] font-mono text-muted-foreground uppercase">Deposit ({form.depositPercent}%): {formatCurrency(formTotals.depositTotal)}</div>
                <div className="text-sm font-mono font-bold">Total: {formatCurrency(formTotals.total)}</div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={creating}>
                {creating ? "Saving..." : "Save Quote"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Active_Quotes</CardTitle>
            <FileText className="h-3.5 w-3.5 text-primary/50" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold">{totals.active}</div>
            <p className="text-[10px] font-mono text-muted-foreground mt-1 uppercase">Value: {formatCurrency(totals.activeValue)}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Pending_Approval</CardTitle>
            <AlertCircle className="h-3.5 w-3.5 text-warning/50" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-warning">{totals.pending}</div>
            <p className="text-[10px] font-mono text-muted-foreground mt-1 uppercase">Awaiting_Operator_Review</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Accepted_Closed</CardTitle>
            <CheckCircle2 className="h-3.5 w-3.5 text-success/50" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-success">{totals.closed}</div>
            <p className="text-[10px] font-mono text-muted-foreground mt-1 uppercase">Converted_or_Accepted</p>
          </CardContent>
        </Card>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center gap-4 bg-slate-100">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="SEARCH_BY_CLIENT_OR_ID..."
              className="pl-10 bg-slate-100 border-slate-200 font-mono text-[10px] uppercase tracking-wider h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" className="h-9 font-mono uppercase text-[10px] border-slate-200" disabled title="Advanced filters are not wired yet. Search is active.">
            <Filter className="mr-2 h-3.5 w-3.5" />
            Search only
          </Button>
        </div>
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-slate-100 sticky top-0 z-10">
              <TableRow className="hover:bg-transparent border-slate-200">
                <TableHead className="w-[120px] font-mono text-[10px] uppercase tracking-widest">Document_#</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Client_Entity</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Title</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Amount</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Status</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Type</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Expiry</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground font-mono text-xs uppercase tracking-widest">
                    Initialising_Quote_Stream...
                  </TableCell>
                </TableRow>
              ) : filteredQuotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground font-mono text-xs uppercase tracking-widest">
                    No_Records_Found
                  </TableCell>
                </TableRow>
              ) : (
                filteredQuotes.map((q) => (
                  <TableRow key={q.id} className="group hover:bg-slate-50 border-slate-200 transition-colors cursor-pointer" onClick={() => setDetailQuote(q)}>
                    <TableCell className="font-mono text-[10px] text-muted-foreground/60">{q.documentNumber || q.id.slice(0, 8)}</TableCell>
                    <TableCell className="font-medium text-sm">{q.client_name}</TableCell>
                    <TableCell className="text-sm">{q.title}</TableCell>
                    <TableCell className="font-mono text-sm">{formatCurrency(q.amount)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[9px] uppercase tracking-tighter bg-white/5 border-white/10 ${
                          q.status === "Accepted"
                            ? "text-success border-success/20"
                            : q.status === "Invoiced"
                            ? "text-success border-success/20"
                            : q.status === "Review"
                            ? "text-warning border-warning/20"
                            : q.status === "Ready"
                            ? "text-blue-400 border-blue-400/20"
                            : q.status === "Sent"
                            ? "text-primary border-primary/20"
                            : q.status === "Changes"
                            ? "text-orange-400 border-orange-400/20"
                            : q.status === "Declined" || q.status === "Expired"
                            ? "text-destructive border-destructive/20"
                            : "text-muted-foreground"
                        }`}
                      >
                        {q.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground uppercase">{q.type}</TableCell>
                    <TableCell className="text-[10px] font-mono text-muted-foreground uppercase">
                      {q.expiry ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(q.expiry)) : "-"}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setDetailQuote(q); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={!!detailQuote} onOpenChange={() => { setDetailQuote(null); setPdfUrl(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">Quote Detail</DialogTitle>
          </DialogHeader>
          {detailQuote && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-mono font-bold">{detailQuote.documentNumber || detailQuote.id}</div>
                  {detailQuote.reference && <div className="text-xs text-muted-foreground">Ref: {detailQuote.reference}</div>}
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] uppercase ${
                    detailQuote.status === "Accepted"
                      ? "text-success border-success/20"
                      : detailQuote.status === "Invoiced"
                      ? "text-success border-success/20"
                      : detailQuote.status === "Review"
                      ? "text-warning border-warning/20"
                      : detailQuote.status === "Ready"
                      ? "text-blue-400 border-blue-400/20"
                      : detailQuote.status === "Sent"
                      ? "text-primary border-primary/20"
                      : detailQuote.status === "Changes"
                      ? "text-orange-400 border-orange-400/20"
                      : detailQuote.status === "Declined" || detailQuote.status === "Expired"
                      ? "text-destructive border-destructive/20"
                      : "text-muted-foreground"
                  }`}
                >
                  {detailQuote.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="text-[10px] font-mono uppercase text-muted-foreground">Client</div>
                  <div className="font-medium">{detailQuote.client_name}</div>
                  {detailQuote.clientEmail && <div className="text-xs text-muted-foreground">{detailQuote.clientEmail}</div>}
                  {detailQuote.clientPhone && <div className="text-xs text-muted-foreground">{detailQuote.clientPhone}</div>}
                  {detailQuote.clientCompany && <div className="text-xs text-muted-foreground">{detailQuote.clientCompany}</div>}
                  {detailQuote.clientAddress && <div className="text-xs text-muted-foreground">{detailQuote.clientAddress}</div>}
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-mono uppercase text-muted-foreground">Amount</div>
                  <div className="font-mono font-bold">{formatCurrency(detailQuote.amount)}</div>
                  {detailQuote.subtotalCents !== undefined && (
                    <div className="text-[10px] font-mono text-muted-foreground">Subtotal: {formatCurrency(detailQuote.subtotalCents / 100)}</div>
                  )}
                  {detailQuote.depositCents !== undefined && detailQuote.depositCents > 0 && (
                    <div className="text-[10px] font-mono text-muted-foreground">Deposit: {formatCurrency(detailQuote.depositCents / 100)}</div>
                  )}
                  {detailQuote.taxCents !== undefined && detailQuote.taxCents > 0 && (
                    <div className="text-[10px] font-mono text-muted-foreground">Tax: {formatCurrency(detailQuote.taxCents / 100)}</div>
                  )}
                  {detailQuote.discountCents !== undefined && detailQuote.discountCents > 0 && (
                    <div className="text-[10px] font-mono text-muted-foreground">Discount: {formatCurrency(detailQuote.discountCents / 100)}</div>
                  )}
                </div>
                {detailQuote.expiry && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-mono uppercase text-muted-foreground">Expiry Date</div>
                    <div>{new Date(detailQuote.expiry).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
                  </div>
                )}
                <div className="space-y-1">
                  <div className="text-[10px] font-mono uppercase text-muted-foreground">Type</div>
                  <div className="capitalize">{detailQuote.type}</div>
                </div>
                {detailQuote.approvalStatus && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-mono uppercase text-muted-foreground">Approval Status</div>
                    <div className="capitalize">{detailQuote.approvalStatus.replace(/_/g, " ")}</div>
                  </div>
                )}
                {detailQuote.projectTimeline && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-mono uppercase text-muted-foreground">Timeline</div>
                    <div>{detailQuote.projectTimeline}</div>
                  </div>
                )}
                {detailQuote.servicePeriod && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-mono uppercase text-muted-foreground">Service Period</div>
                    <div>{detailQuote.servicePeriod}</div>
                  </div>
                )}
              </div>

              {detailQuote.scopeSummary && (
                <div className="p-3 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-700">
                  <div className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Scope Summary</div>
                  {detailQuote.scopeSummary}
                </div>
              )}

              {detailQuote.deliverables && detailQuote.deliverables.length > 0 && (
                <div className="p-3 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-700">
                  <div className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Deliverables</div>
                  <ul className="list-disc list-inside space-y-0.5">
                    {detailQuote.deliverables.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}

              {detailQuote.lineItems && detailQuote.lineItems.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-mono uppercase text-muted-foreground">Line Items</div>
                  <div className="rounded-md border border-slate-200 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow className="hover:bg-transparent border-slate-200">
                          <TableHead className="font-mono text-[10px] uppercase">Item</TableHead>
                          <TableHead className="font-mono text-[10px] uppercase">Description</TableHead>
                          <TableHead className="font-mono text-[10px] uppercase text-right">Qty</TableHead>
                          <TableHead className="font-mono text-[10px] uppercase text-right">Unit Price</TableHead>
                          <TableHead className="font-mono text-[10px] uppercase text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailQuote.lineItems.map((li, i) => (
                          <TableRow key={i} className="border-slate-200">
                            <TableCell className="text-xs font-medium">{li.name}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{li.description}</TableCell>
                            <TableCell className="text-xs font-mono text-right">{li.quantity}</TableCell>
                            <TableCell className="text-xs font-mono text-right">{formatCurrency(li.unitPriceCents / 100)}</TableCell>
                            <TableCell className="text-xs font-mono text-right">{formatCurrency((li.quantity * li.unitPriceCents) / 100)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {detailQuote.terms && (
                <div className="p-3 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-700">
                  <div className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Terms</div>
                  {detailQuote.terms}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="text-xs" onClick={() => previewPdf(detailQuote.id)} disabled={actionLoading === "pdf"}>
                  <FileText className="mr-1.5 h-3.5 w-3.5" />
                  {actionLoading === "pdf" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : "Preview PDF"}
                </Button>
                <Button size="sm" variant="outline" className="text-xs" onClick={() => exportPdf(detailQuote.id, detailQuote.documentNumber)} disabled={actionLoading === "export-pdf"}>
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  {actionLoading === "export-pdf" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : "Export PDF"}
                </Button>
                {detailQuote.rawStatus === "draft" && (
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => runAction(detailQuote.id, "approval-request")} disabled={!!actionLoading}>
                    <Mail className="mr-1.5 h-3.5 w-3.5" />
                    {actionLoading === "approval-request" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : "Request Approval"}
                  </Button>
                )}
                {detailQuote.rawStatus === "needs_review" && (
                  <Button size="sm" className="text-xs" onClick={() => runAction(detailQuote.id, "approve")} disabled={!!actionLoading}>
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    {actionLoading === "approve" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : "Approve"}
                  </Button>
                )}
                {detailQuote.rawStatus === "ready_to_send" && (
                  <>
                    <Button size="sm" className="text-xs" onClick={() => runAction(detailQuote.id, "mark-sent")} disabled={!!actionLoading}>
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                      {actionLoading === "mark-sent" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : "Mark Sent"}
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => runAction(detailQuote.id, "convert-to-invoice")} disabled={!!actionLoading}>
                      <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                      {actionLoading === "convert-to-invoice" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : "Convert to Invoice"}
                    </Button>
                  </>
                )}
                {detailQuote.rawStatus === "sent" && (
                  <>
                    <Button size="sm" className="text-xs" onClick={() => runAction(detailQuote.id, "client-approve")} disabled={!!actionLoading}>
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      {actionLoading === "client-approve" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : "Client Approve"}
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => runAction(detailQuote.id, "request-changes")} disabled={!!actionLoading}>
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                      {actionLoading === "request-changes" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : "Request Changes"}
                    </Button>
                  </>
                )}

              </div>

              {pdfUrl && (
                <div className="rounded-md border border-slate-200 overflow-hidden">
                  <iframe src={pdfUrl} className="w-full h-[500px]" title="Quote PDF Preview" />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
