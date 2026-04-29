import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Filter, Download, Database, TrendingUp, AlertCircle, CheckCircle2, X, Eye, FileText, CreditCard, RotateCcw, Trash2, Loader2, ChevronRight, Mail, Phone, Building2, MapPin, CalendarDays } from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";
import { useAuth } from "@/components/AuthProvider";

interface Invoice {
  id: string;
  client_name: string;
  amount: number;
  status: string;
  issue_date?: string;
  due_date?: string;
  invoiceNumber?: string;
  invoiceType?: string;
  reference?: string | null;
  notes?: string | null;
  issueStatus?: string;
  paymentStatus?: string;
  amountPaidCents?: number;
  totalCents?: number;
  dueDate?: string | null;
}

interface LineItemForm {
  name: string;
  description: string;
  quantity: string;
  unitPrice: string;
  taxable: boolean;
}

function mapRootInvoiceToUI(inv: Record<string, unknown>): Invoice {
  const client = (inv.client as Record<string, unknown>) || {};
  const totalCents = typeof inv.totalCents === "number" ? inv.totalCents : 0;
  const paymentStatus = String(inv.paymentStatus || "");
  const issueStatus = String(inv.issueStatus || "");

  let status = "Draft";
  if (paymentStatus === "paid") status = "Paid";
  else if (paymentStatus === "overdue") status = "Overdue";
  else if (paymentStatus === "void") status = "Voided";
  else if (issueStatus === "issued" && (paymentStatus === "unpaid" || paymentStatus === "partially_paid")) status = "Sent";
  else if (issueStatus === "approved_to_issue") status = "Ready";

  return {
    id: String(inv.id || ""),
    client_name: String(client.name || "Unknown"),
    amount: totalCents / 100,
    status,
    issue_date: inv.createdAt ? String(inv.createdAt) : undefined,
    due_date: inv.dueDate ? String(inv.dueDate) : undefined,
    invoiceNumber: String(inv.invoiceNumber || ""),
    invoiceType: String(inv.invoiceType || "full"),
    reference: inv.reference ? String(inv.reference) : null,
    notes: inv.notes ? String(inv.notes) : null,
    issueStatus,
    paymentStatus,
    amountPaidCents: typeof inv.amountPaidCents === "number" ? inv.amountPaidCents : 0,
    totalCents: typeof inv.totalCents === "number" ? inv.totalCents : 0,
    dueDate: inv.dueDate ? String(inv.dueDate) : null,
  };
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function todayInputValue() {
  return new Date().toISOString().split('T')[0];
}

export function Finance() {
  const { isAuthReady, user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const [form, setForm] = useState({
    clientName: "", clientEmail: "", clientPhone: "", clientCompany: "", clientAddress: "",
    title: "", reference: "", dueDate: "", invoiceType: "full" as "full" | "deposit" | "balance",
    depositPercent: "50", notes: "",
  });
  const [lineItems, setLineItems] = useState<LineItemForm[]>([
    { name: "", description: "", quantity: "1", unitPrice: "", taxable: false },
  ]);

  async function fetchInvoices() {
    setLoading(true);
    try {
      const res = await authFetch("/api/root/invoices?account=content_coop");
      const json = await res.json();
      if (json.ok && Array.isArray(json.data)) {
        setInvoices(json.data.map(mapRootInvoiceToUI));
      } else {
        setInvoices([]);
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAuthReady || !user) return;
    fetchInvoices();
  }, [isAuthReady, user]);

  const filteredInvoices = invoices.filter(inv =>
    inv.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (inv.invoiceNumber || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (inv.reference || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totals = useMemo(() => {
    const outstanding = invoices.filter(inv => inv.status !== "Paid" && inv.status !== "Voided").reduce((sum, inv) => sum + inv.amount, 0);
    const overdue = invoices.filter(inv => inv.status === "Overdue").reduce((sum, inv) => sum + inv.amount, 0);
    const collected = invoices.filter(inv => inv.status === "Paid").reduce((sum, inv) => sum + inv.amount, 0);
    return { outstanding, overdue, collected };
  }, [invoices]);

  const formTotals = useMemo(() => {
    const subtotal = lineItems.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      return sum + qty * price;
    }, 0);
    const depositPct = form.invoiceType === "deposit" ? (parseFloat(form.depositPercent) || 0) / 100 : 1;
    const total = subtotal * depositPct;
    return { subtotal, total };
  }, [lineItems, form.invoiceType, form.depositPercent]);

  function addLineItem() {
    setLineItems(prev => [...prev, { name: "", description: "", quantity: "1", unitPrice: "", taxable: false }]);
  }
  function removeLineItem(index: number) {
    setLineItems(prev => prev.filter((_, i) => i !== index));
  }
  function updateLineItem(index: number, field: keyof LineItemForm, value: string | boolean) {
    setLineItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }

  async function createInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientName || !form.title || lineItems.length === 0 || !lineItems[0].name) return;
    setCreating(true);
    try {
      const bodyItems = lineItems
        .filter(item => item.name.trim())
        .map(item => ({
          name: item.name,
          description: item.description,
          quantity: parseFloat(item.quantity) || 1,
          unitPriceCents: Math.round((parseFloat(item.unitPrice) || 0) * 100),
          taxable: item.taxable,
        }));

      const depositAppliedCents = form.invoiceType === "deposit"
        ? Math.round(formTotals.subtotal * 100) - Math.round(formTotals.total * 100)
        : 0;

      const res = await authFetch("/api/root/invoices", {
        method: "POST",
        body: JSON.stringify({
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
          dueDate: form.dueDate || null,
          invoiceType: form.invoiceType,
          notes: form.notes || null,
          lineItems: bodyItems,
          depositAppliedCents,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        resetForm();
        setShowForm(false);
        await fetchInvoices();
      } else {
        alert("Failed to create invoice: " + (json.error?.message || "Unknown error"));
      }
    } catch (err) {
      alert("Failed to create invoice.");
    } finally {
      setCreating(false);
    }
  }

  function resetForm() {
    setForm({ clientName: "", clientEmail: "", clientPhone: "", clientCompany: "", clientAddress: "", title: "", reference: "", dueDate: "", invoiceType: "full", depositPercent: "50", notes: "" });
    setLineItems([{ name: "", description: "", quantity: "1", unitPrice: "", taxable: false }]);
  }

  async function runAction(id: string, action: string, method: string = "POST", body?: unknown) {
    setActionLoading(action);
    try {
      const opts: RequestInit = { method };
      if (body) opts.body = JSON.stringify(body);
      const res = await authFetch(`/api/root/invoices/${id}/${action}`, opts);
      const json = await res.json();
      if (json.ok) {
        await fetchInvoices();
        if (detailInvoice?.id === id) {
          const refreshed = await authFetch(`/api/root/invoices/${id}`);
          const rjson = await refreshed.json();
          if (rjson.ok) setDetailInvoice(mapRootInvoiceToUI(rjson.data));
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
      const res = await authFetch(`/api/root/invoices/${id}/pdf`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (err) {
      alert("Failed to load PDF preview.");
    } finally {
      setActionLoading(null);
    }
  }

  const exportInvoices = () => {
    const payload = JSON.stringify({ data_source: "root_billing_invoice_authority", generated_at: new Date().toISOString(), invoices: filteredInvoices }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mission-control-finance-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Finance Visibility</h1>
          <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground uppercase">
            <Database className="h-3 w-3 text-success" />
            Authority: Root_Document_Engine
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 font-mono uppercase text-[10px] border-slate-200" onClick={exportInvoices}>
            <Download className="mr-2 h-3.5 w-3.5" />
            Export
          </Button>
          <Button size="sm" className="h-9 font-mono uppercase text-[10px] tracking-wider" onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            Add Invoice
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">New Invoice</h3>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowForm(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <form onSubmit={createInvoice} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-muted-foreground">Client Name *</label>
                <Input placeholder="Tyler Day" value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-muted-foreground">Email</label>
                <Input placeholder="tyler@mdg.agency" type="email" value={form.clientEmail} onChange={e => setForm(f => ({ ...f, clientEmail: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-muted-foreground">Phone</label>
                <Input placeholder="(501) 351-5927" value={form.clientPhone} onChange={e => setForm(f => ({ ...f, clientPhone: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-muted-foreground">Company</label>
                <Input placeholder="MDG, A Freeman Company" value={form.clientCompany} onChange={e => setForm(f => ({ ...f, clientCompany: e.target.value }))} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] font-mono uppercase text-muted-foreground">Address</label>
                <Input placeholder="322 Wilcrest Dr, Houston, TX 77042" value={form.clientAddress} onChange={e => setForm(f => ({ ...f, clientAddress: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-muted-foreground">Invoice Title *</label>
                <Input placeholder="Car Wash Show 2026" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-muted-foreground">Reference</label>
                <Input placeholder="Project name or PO #" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-muted-foreground">Due Date</label>
                <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-muted-foreground">Invoice Type</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={form.invoiceType}
                  onChange={e => setForm(f => ({ ...f, invoiceType: e.target.value as "full" | "deposit" | "balance" }))}
                >
                  <option value="full">Full Invoice</option>
                  <option value="deposit">Deposit Invoice</option>
                  <option value="balance">Balance Invoice</option>
                </select>
              </div>
            </div>

            {form.invoiceType === "deposit" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-muted-foreground">Deposit %</label>
                  <Input type="number" min="1" max="100" value={form.depositPercent} onChange={e => setForm(f => ({ ...f, depositPercent: e.target.value }))} />
                </div>
              </div>
            )}

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
                    <Input placeholder="Video Production" className="h-8 text-xs" value={item.name} onChange={e => updateLineItem(idx, "name", e.target.value)} required />
                  </div>
                  <div className="sm:col-span-4 space-y-1">
                    <label className="text-[9px] font-mono uppercase text-muted-foreground">Description</label>
                    <Input placeholder="3.5 days on-site capture" className="h-8 text-xs" value={item.description} onChange={e => updateLineItem(idx, "description", e.target.value)} />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[9px] font-mono uppercase text-muted-foreground">Qty</label>
                    <Input type="number" min="1" className="h-8 text-xs" value={item.quantity} onChange={e => updateLineItem(idx, "quantity", e.target.value)} />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[9px] font-mono uppercase text-muted-foreground">Unit Price ($)</label>
                    <Input type="number" step="0.01" min="0" className="h-8 text-xs" value={item.unitPrice} onChange={e => updateLineItem(idx, "unitPrice", e.target.value)} />
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-muted-foreground">Notes / Terms</label>
                <textarea
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Custom terms, deposit notes, cancellation policy..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <div className="flex flex-col justify-end">
                <div className="text-right space-y-1">
                  <div className="text-[10px] font-mono text-muted-foreground uppercase">Subtotal: {formatCurrency(formTotals.subtotal)}</div>
                  {form.invoiceType === "deposit" && (
                    <div className="text-[10px] font-mono text-muted-foreground uppercase">Deposit ({form.depositPercent}%): {formatCurrency(formTotals.total)}</div>
                  )}
                  <div className="text-sm font-mono font-bold">Invoice Total: {formatCurrency(formTotals.total)}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={creating}>{creating ? "Saving..." : "Save Invoice"}</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Outstanding_Balance</CardTitle>
            <TrendingUp className="h-3.5 w-3.5 text-primary/50" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold">{formatCurrency(totals.outstanding)}</div>
            <p className="text-[10px] font-mono text-muted-foreground mt-1 uppercase">Across {invoices.filter(i => i.status !== "Paid" && i.status !== "Voided").length} Active_Invoices</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Overdue_Risk</CardTitle>
            <AlertCircle className="h-3.5 w-3.5 text-destructive/50" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-destructive">{formatCurrency(totals.overdue)}</div>
            <p className="text-[10px] font-mono text-muted-foreground mt-1 uppercase">{invoices.filter(i => i.status === "Overdue").length} Critical_Delays</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Collected_30D</CardTitle>
            <CheckCircle2 className="h-3.5 w-3.5 text-success/50" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-success">{formatCurrency(totals.collected)}</div>
            <p className="text-[10px] font-mono text-muted-foreground mt-1 uppercase">Operational_Liquidity_Stable</p>
          </CardContent>
        </Card>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center gap-4 bg-slate-100">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="SEARCH_BY_CLIENT_OR_ID..." className="pl-10 bg-slate-100 border-slate-200 font-mono text-[10px] uppercase tracking-wider h-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" className="h-9 font-mono uppercase text-[10px] border-slate-200" disabled title="Advanced invoice filters are not wired yet. Search is active.">
            <Filter className="mr-2 h-3.5 w-3.5" />
            Search only
          </Button>
        </div>
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-slate-100 sticky top-0 z-10">
              <TableRow className="hover:bg-transparent border-slate-200">
                <TableHead className="w-[120px] font-mono text-[10px] uppercase tracking-widest">Invoice_ID</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Client_Entity</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Amount</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Status</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Type</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Issue_Date</TableHead>
                <TableHead className="text-right font-mono text-[10px] uppercase tracking-widest">Due_Date</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground font-mono text-xs uppercase tracking-widest">Initialising_Financial_Stream...</TableCell></TableRow>
              ) : filteredInvoices.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground font-mono text-xs uppercase tracking-widest">No_Records_Found</TableCell></TableRow>
              ) : filteredInvoices.map((inv) => (
                <TableRow key={inv.id} className="group hover:bg-slate-50 border-slate-200 transition-colors cursor-pointer" onClick={() => setDetailInvoice(inv)}>
                  <TableCell className="font-mono text-[10px] text-muted-foreground/60">{inv.invoiceNumber || inv.id.slice(0, 8)}</TableCell>
                  <TableCell className="font-medium text-sm">{inv.client_name}</TableCell>
                  <TableCell className="font-mono text-sm">{formatCurrency(inv.amount)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[9px] uppercase tracking-tighter bg-white/5 border-white/10 ${
                      inv.status === "Paid" ? "text-success border-success/20" :
                      inv.status === "Overdue" ? "text-destructive border-destructive/20" :
                      inv.status === "Sent" ? "text-primary border-primary/20" :
                      inv.status === "Ready" ? "text-blue-400 border-blue-400/20" :
                      "text-muted-foreground"
                    }`}>{inv.status}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-[10px] text-muted-foreground uppercase">{inv.invoiceType}</TableCell>
                  <TableCell className="text-[10px] font-mono text-muted-foreground uppercase">{inv.issue_date ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(inv.issue_date)) : '-'}</TableCell>
                  <TableCell className="text-right text-[10px] font-mono text-muted-foreground uppercase">{inv.due_date ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(inv.due_date)) : '-'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); setDetailInvoice(inv); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={!!detailInvoice} onOpenChange={() => { setDetailInvoice(null); setPdfUrl(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">Invoice Detail</DialogTitle>
          </DialogHeader>
          {detailInvoice && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-mono font-bold">{detailInvoice.invoiceNumber || detailInvoice.id}</div>
                  {detailInvoice.reference && <div className="text-xs text-muted-foreground">Ref: {detailInvoice.reference}</div>}
                </div>
                <Badge variant="outline" className={`text-[10px] uppercase ${
                  detailInvoice.status === "Paid" ? "text-success border-success/20" :
                  detailInvoice.status === "Overdue" ? "text-destructive border-destructive/20" :
                  detailInvoice.status === "Sent" ? "text-primary border-primary/20" :
                  detailInvoice.status === "Ready" ? "text-blue-400 border-blue-400/20" :
                  "text-muted-foreground"
                }`}>{detailInvoice.status}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="text-[10px] font-mono uppercase text-muted-foreground">Client</div>
                  <div className="font-medium">{detailInvoice.client_name}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-mono uppercase text-muted-foreground">Amount</div>
                  <div className="font-mono font-bold">{formatCurrency(detailInvoice.amount)}</div>
                </div>
                {detailInvoice.dueDate && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-mono uppercase text-muted-foreground">Due Date</div>
                    <div>{new Date(detailInvoice.dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                  </div>
                )}
                <div className="space-y-1">
                  <div className="text-[10px] font-mono uppercase text-muted-foreground">Type</div>
                  <div className="capitalize">{detailInvoice.invoiceType}</div>
                </div>
                {detailInvoice.amountPaidCents !== undefined && detailInvoice.amountPaidCents > 0 && (
                  <>
                    <div className="space-y-1">
                      <div className="text-[10px] font-mono uppercase text-muted-foreground">Amount Paid</div>
                      <div className="font-mono text-success">{formatCurrency(detailInvoice.amountPaidCents / 100)}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-mono uppercase text-muted-foreground">Balance Due</div>
                      <div className="font-mono text-destructive">{formatCurrency(Math.max((detailInvoice.totalCents || 0) - detailInvoice.amountPaidCents, 0) / 100)}</div>
                    </div>
                  </>
                )}
              </div>

              {detailInvoice.notes && (
                <div className="p-3 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-700">
                  <div className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Notes</div>
                  {detailInvoice.notes}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="text-xs" onClick={() => previewPdf(detailInvoice.id)} disabled={actionLoading === "pdf"}>
                  <FileText className="mr-1.5 h-3.5 w-3.5" />
                  {actionLoading === "pdf" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : "Preview PDF"}
                </Button>
                {detailInvoice.issueStatus === "draft" && (
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => runAction(detailInvoice.id, "finalize-artifacts")} disabled={!!actionLoading}>
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    {actionLoading === "finalize-artifacts" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : "Finalize"}
                  </Button>
                )}
                {detailInvoice.issueStatus === "approved_to_issue" && (
                  <Button size="sm" className="text-xs" onClick={() => runAction(detailInvoice.id, "issue")} disabled={!!actionLoading}>
                    <Mail className="mr-1.5 h-3.5 w-3.5" />
                    {actionLoading === "issue" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : "Issue"}
                  </Button>
                )}
                {detailInvoice.issueStatus === "issued" && detailInvoice.paymentStatus !== "paid" && (
                  <>
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => runAction(detailInvoice.id, "payment-link")} disabled={!!actionLoading}>
                      <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                      {actionLoading === "payment-link" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : "Stripe Link"}
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => {
                      const amount = prompt("Payment amount in dollars:");
                      if (amount) runAction(detailInvoice.id, "record-payment", "POST", { amountCents: Math.round(parseFloat(amount) * 100), note: "Manual payment entry" });
                    }} disabled={!!actionLoading}>
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      {actionLoading === "record-payment" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : "Record Payment"}
                    </Button>
                  </>
                )}
                {(detailInvoice.issueStatus === "issued" || detailInvoice.issueStatus === "approved_to_issue") && detailInvoice.paymentStatus !== "paid" && (
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => runAction(detailInvoice.id, "revise")} disabled={!!actionLoading}>
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    {actionLoading === "revise" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : "Revise"}
                  </Button>
                )}
                {detailInvoice.issueStatus !== "voided" && detailInvoice.paymentStatus !== "paid" && (
                  <Button size="sm" variant="outline" className="text-xs text-destructive border-destructive/20 hover:bg-destructive/10" onClick={() => {
                    if (confirm("Void this invoice? This cannot be undone.")) {
                      runAction(detailInvoice.id, "void", "POST", { reason: "Operator voided invoice." });
                    }
                  }} disabled={!!actionLoading}>
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    {actionLoading === "void" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : "Void"}
                  </Button>
                )}
              </div>

              {pdfUrl && (
                <div className="rounded-md border border-slate-200 overflow-hidden">
                  <iframe src={pdfUrl} className="w-full h-[500px]" title="Invoice PDF Preview" />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
