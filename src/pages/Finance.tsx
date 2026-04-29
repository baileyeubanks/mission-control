import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Download, Database, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

interface Invoice {
  id: string;
  client_name: string;
  amount: number;
  status: string;
  issue_date?: string;
  due_date?: string;
}

export function Finance() {
  const { isAuthReady, user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isAuthReady || !user) return;

    async function fetchInvoices() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setInvoices(data || []);
      } catch (error) {
        console.error("Error fetching invoices from Supabase:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchInvoices();
  }, [isAuthReady, user]);

  const filteredInvoices = invoices.filter(inv => 
    inv.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalOutstanding = invoices
    .filter(inv => inv.status !== "Paid")
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
        data_source: "supabase_invoice_read_model",
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
            Authority: Supabase_Truth
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 font-mono uppercase text-[10px] border-white/10"
            aria-label="Export financial data"
            onClick={exportInvoices}
          >
            <Download className="mr-2 h-3.5 w-3.5" />
            Export
          </Button>
          <Button
            size="sm"
            className="h-9 font-mono uppercase text-[10px] tracking-wider"
            disabled
            title="Invoice creation is locked until the Stripe-backed write path is connected."
          >
            <Plus className="mr-2 h-3.5 w-3.5" />
            Invoice locked
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass border-white/5">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Outstanding_Balance</CardTitle>
            <TrendingUp className="h-3.5 w-3.5 text-primary/50" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold">{formatCurrency(totalOutstanding)}</div>
            <p className="text-[10px] font-mono text-muted-foreground mt-1 uppercase">Across {invoices.filter(i => i.status !== "Paid").length} Active_Invoices</p>
          </CardContent>
        </Card>
        <Card className="glass border-white/5">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Overdue_Risk</CardTitle>
            <AlertCircle className="h-3.5 w-3.5 text-destructive/50" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-destructive">{formatCurrency(totalOverdue)}</div>
            <p className="text-[10px] font-mono text-muted-foreground mt-1 uppercase">{invoices.filter(i => i.status === "Overdue").length} Critical_Delays</p>
          </CardContent>
        </Card>
        <Card className="glass border-white/5">
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

      <Card className="flex-1 flex flex-col overflow-hidden glass border-white/5">
        <div className="p-4 border-b border-white/5 flex items-center gap-4 bg-black/20">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input 
              placeholder="SEARCH_BY_CLIENT_OR_ID..." 
              className="pl-10 bg-black/20 border-white/5 font-mono text-[10px] uppercase tracking-wider h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search invoices"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-9 font-mono uppercase text-[10px] border-white/10"
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
            <TableHeader className="bg-black/40 sticky top-0 z-10">
              <TableRow className="hover:bg-transparent border-white/5">
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
                <TableRow key={inv.id} className="group hover:bg-white/5 border-white/5 transition-colors">
                  <TableCell className="font-mono text-[10px] text-muted-foreground/60">{inv.id}</TableCell>
                  <TableCell className="font-medium text-sm">{inv.client_name}</TableCell>
                  <TableCell className="font-mono text-sm">{formatCurrency(inv.amount)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`h-1.5 w-1.5 rounded-full ${
                        inv.status === "Paid" ? "bg-success" : 
                        inv.status === "Overdue" ? "bg-destructive" : 
                        inv.status === "Sent" ? "bg-primary" : "bg-muted"
                      }`} />
                      <span className="text-[10px] font-mono uppercase tracking-wider">{inv.status}</span>
                    </div>
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
