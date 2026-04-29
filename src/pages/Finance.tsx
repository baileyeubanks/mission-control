import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Download, Database, TrendingUp, AlertCircle, CheckCircle2, X } from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";
import { useAuth } from "@/components/AuthProvider";

interface Invoice {
  id: string;
  client_name: string;
  amount: number;
  status: string;
  issue_date?: string;
  due_date?: string;
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
  };
}

export function Finance() {
  const { isAuthReady, user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ clientName: "", title: "", amount: "" });

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
    inv.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalOutstanding = invoices
    .filter(inv => inv.status !== "Paid" && inv.status !== "Voided")
    .reduce((sum, inv) => sum + inv.amount, 0);

  const totalOverdue = invoices
    .filter(inv => inv.status === "Overdue")
    .reduce((sum, inv) => sum + inv.amount, 0);

  const totalCollected = invoices
    .filter(inv => inv.status === "Paid")
    .reduce((sum, inv) => sum + inv.amount, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const exportInvoices = () => {
    const payload = JSON.stringify(
      {
        data_source: "root_billing_invoice_authority",
        generated_at: new Date().toISOString(),
        invoices: filteredInvoices,
      },
      null,
      2,
    );
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
          <Button
            variant="outline"
            size="sm"
            className="h-9 font-mono uppercase text-[10px] border-slate-200"
            aria-label="Export financial data"
            onClick={exportInvoices}
          >
            <Download className="mr-2 h-3.5 w-3.5" />
            Export
          </Button>
          <Button
            size="sm"
            className="h-9 font-mono uppercase text-[10px] tracking-wider"
            onClick={() => setShowForm(true)}
          >
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
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!form.clientName || !form.title || !form.amount) return;
            setCreating(true);
            try {
              const res = await authFetch("/api/root/invoices", {
                method: "POST",
                body: JSON.stringify({
                  companyAccount: "content_coop",
                  client: { name: form.clientName },
                  title: form.title,
                  lineItems: [{ name: form.title, description: form.title, quantity: 1, unitPriceCents: Math.round(parseFloat(form.amount) * 100) }],
                }),
              });
              const json = await res.json();
              if (json.ok) {
                setForm({ clientName: "", title: "", amount: "" });
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
          }} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input placeholder="Client name *" value={form.clientName} onChange={(e) => setForm(f => ({ ...f, clientName: e.target.value }))} required />
            <Input placeholder="Invoice title *" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} required />
            <Input placeholder="Amount (USD) *" type="number" step="0.01" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} required />
            <div className="sm:col-span-3 flex justify-end gap-2">
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
            <div className="text-2xl font-mono font-bold">{formatCurrency(totalOutstanding)}</div>
            <p className="text-[10px] font-mono text-muted-foreground mt-1 uppercase">Across {invoices.filter(i => i.status !== "Paid" && i.status !== "Voided").length} Active_Invoices</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Overdue_Risk</CardTitle>
            <AlertCircle className="h-3.5 w-3.5 text-destructive/50" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-destructive">{formatCurrency(totalOverdue)}</div>
            <p className="text-[10px] font-mono text-muted-foreground mt-1 uppercase">{invoices.filter(i => i.status === "Overdue").length} Critical_Delays</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Collected_30D</CardTitle>
            <CheckCircle2 className="h-3.5 w-3.5 text-success/50" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-success">{formatCurrency(totalCollected)}</div>
            <p className="text-[10px] font-mono text-muted-foreground mt-1 uppercase">Operational_Liquidity_Stable</p>
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
              aria-label="Search invoices"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-9 font-mono uppercase text-[10px] border-slate-200"
            aria-label="Filter invoices"
            disabled
            title="Advanced invoice filters are not wired yet. Search is active."
          >
            <Filter className="mr-2 h-3.5 w-3.5" />
            Search only
          </Button>
        </div>
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-slate-100 sticky top-0 z-10">
              <TableRow className="hover:bg-transparent border-slate-200">
                <TableHead className="w-[140px] font-mono text-[10px] uppercase tracking-widest">Invoice_ID</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Client_Entity</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Amount</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Status</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Issue_Date</TableHead>
                <TableHead className="text-right font-mono text-[10px] uppercase tracking-widest">Due_Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground font-mono text-xs uppercase tracking-widest">Initialising_Financial_Stream...</TableCell>
                </TableRow>
              ) : filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground font-mono text-xs uppercase tracking-widest">No_Records_Found</TableCell>
                </TableRow>
              ) : filteredInvoices.map((inv) => (
                <TableRow key={inv.id} className="group hover:bg-slate-50 border-slate-200 transition-colors">
                  <TableCell className="font-mono text-[10px] text-muted-foreground/60">{inv.id}</TableCell>
                  <TableCell className="font-medium text-sm">{inv.client_name}</TableCell>
                  <TableCell className="font-mono text-sm">{formatCurrency(inv.amount)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[9px] uppercase tracking-tighter bg-white/5 border-white/10 ${
                      inv.status === "Paid" ? "text-success border-success/20" :
                      inv.status === "Overdue" ? "text-destructive border-destructive/20" :
                      inv.status === "Sent" ? "text-primary border-primary/20" :
                      inv.status === "Ready" ? "text-blue-400 border-blue-400/20" :
                      "text-muted-foreground"
                    }`}>
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[10px] font-mono text-muted-foreground uppercase">
                    {inv.issue_date ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(inv.issue_date)) : '-'}
                  </TableCell>
                  <TableCell className="text-right text-[10px] font-mono text-muted-foreground uppercase">
                    {inv.due_date ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(inv.due_date)) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
