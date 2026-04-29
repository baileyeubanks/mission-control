import { useEffect, useMemo, useState } from "react";
import { Upload, Search, CheckCircle2, Circle, Link2, FileText, ArrowUpRight, ArrowDownRight, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BankTransaction {
  id: string;
  companyAccount: string;
  date: string;
  description: string;
  amountCents: number;
  type: "credit" | "debit";
  status: "unmatched" | "matched" | "reconciled";
  matchedInvoiceId: string | null;
  matchedInvoiceNumber: string | null;
  statementId: string;
}

interface BankStatement {
  id: string;
  companyAccount: string;
  fileName: string;
  uploadDate: string;
  transactionCount: number;
  totalCreditsCents: number;
  totalDebitsCents: number;
}

interface BankStats {
  totalTransactions: number;
  unmatchedCount: number;
  matchedCount: number;
  reconciledCount: number;
  totalCreditsCents: number;
  totalDebitsCents: number;
}

interface InvoiceOption {
  id: string;
  invoiceNumber: string;
  clientName: string;
  totalCents: number;
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

const COMPANY_OPTIONS = [
  { value: "", label: "All Companies" },
  { value: "astro-cleaning-services", label: "Astro Cleaning Services" },
  { value: "content-co-op", label: "Content Co-op" },
];

export function BankReconciliation() {
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [statements, setStatements] = useState<BankStatement[]>([]);
  const [stats, setStats] = useState<BankStats | null>(null);
  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | BankTransaction["status"]>("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [uploadCompany, setUploadCompany] = useState("astro-cleaning-services");
  const [matchTxn, setMatchTxn] = useState<BankTransaction | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");

  useEffect(() => {
    fetchData();
  }, [accountFilter, statusFilter]);

  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (accountFilter) params.set("account", accountFilter);
      if (statusFilter) params.set("status", statusFilter);

      const [txnRes, stmtRes, statsRes, invRes] = await Promise.all([
        fetch(`/api/bank/transactions?${params}`),
        fetch(`/api/bank/statements?${new URLSearchParams(accountFilter ? { account: accountFilter } : {})}`),
        fetch(`/api/bank/stats?${new URLSearchParams(accountFilter ? { account: accountFilter } : {})}`),
        fetch(`/api/root/invoices?${new URLSearchParams(accountFilter ? { account: accountFilter } : {})}`),
      ]);

      const txnJson = await txnRes.json();
      const stmtJson = await stmtRes.json();
      const statsJson = await statsRes.json();
      const invJson = await invRes.json();

      setTransactions(txnJson.data || []);
      setStatements(stmtJson.data || []);
      setStats(statsJson.data || null);
      setInvoices((invJson.data || []).map((inv: { id: string; invoiceNumber: string; client: { name: string }; totalCents: number }) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.client?.name || "",
        totalCents: inv.totalCents,
      })));
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (!search) return transactions;
    const q = search.toLowerCase();
    return transactions.filter((t) =>
      t.description.toLowerCase().includes(q) ||
      t.matchedInvoiceNumber?.toLowerCase().includes(q)
    );
  }, [transactions, search]);

  async function handleUpload() {
    if (!csvText.trim()) return;
    setUploading(true);
    try {
      const res = await fetch("/api/bank/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText, companyAccount: uploadCompany, fileName: "upload.csv" }),
      });
      if (res.ok) {
        setCsvText("");
        fetchData();
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleMatch() {
    if (!matchTxn || !selectedInvoiceId) return;
    const invoice = invoices.find((i) => i.id === selectedInvoiceId);
    if (!invoice) return;
    const res = await fetch(`/api/bank/transactions/${matchTxn.id}/match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber }),
    });
    if (res.ok) {
      setMatchTxn(null);
      setSelectedInvoiceId("");
      fetchData();
    }
  }

  async function handleReconcile(txnId: string) {
    const res = await fetch(`/api/bank/transactions/${txnId}/reconcile`, { method: "POST" });
    if (res.ok) fetchData();
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Bank Reconciliation</h1>
            <p className="mt-1 text-sm text-zinc-400">Match bank transactions to invoices and reconcile payments.</p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {[
              { label: "Transactions", value: stats.totalTransactions, icon: BarChart3, color: "text-zinc-300" },
              { label: "Unmatched", value: stats.unmatchedCount, icon: Circle, color: "text-amber-500" },
              { label: "Matched", value: stats.matchedCount, icon: Link2, color: "text-blue-400" },
              { label: "Reconciled", value: stats.reconciledCount, icon: CheckCircle2, color: "text-emerald-500" },
              { label: "Credits", value: formatCents(stats.totalCreditsCents), icon: ArrowUpRight, color: "text-emerald-400" },
              { label: "Debits", value: formatCents(stats.totalDebitsCents), icon: ArrowDownRight, color: "text-red-400" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
                <div className="flex items-center gap-2">
                  <stat.icon className={cn("h-3.5 w-3.5", stat.color)} />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">{stat.label}</span>
                </div>
                <div className="mt-1 text-lg font-semibold text-white">{stat.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Upload */}
        <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <h3 className="mb-3 text-sm font-semibold text-white">Upload Statement (CSV)</h3>
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={uploadCompany}
              onChange={(e) => setUploadCompany(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
            >
              <option value="astro-cleaning-services">Astro Cleaning Services</option>
              <option value="content-co-op">Content Co-op</option>
            </select>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={`Date,Description,Amount\n2024-01-15,Client Payment ABC,1500.00\n2024-01-16,Vendor Expense,-250.00`}
              rows={3}
              className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-700 focus:border-emerald-500 focus:outline-none"
            />
            <button
              onClick={handleUpload}
              disabled={uploading || !csvText.trim()}
              className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transactions..."
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
          >
            {COMPANY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as BankTransaction["status"] | "")}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="unmatched">Unmatched</option>
            <option value="matched">Matched</option>
            <option value="reconciled">Reconciled</option>
          </select>
        </div>

        {/* Match Modal */}
        {matchTxn && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
            <h3 className="mb-3 text-sm font-semibold text-amber-400">Match Transaction to Invoice</h3>
            <p className="mb-3 text-xs text-zinc-400">
              {matchTxn.description} — {formatCents(matchTxn.amountCents)} ({matchTxn.type})
            </p>
            <div className="flex gap-2">
              <select
                value={selectedInvoiceId}
                onChange={(e) => setSelectedInvoiceId(e.target.value)}
                className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">Select invoice...</option>
                {invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} — {inv.clientName} ({formatCents(inv.totalCents)})
                  </option>
                ))}
              </select>
              <button onClick={handleMatch} disabled={!selectedInvoiceId} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50">
                Match
              </button>
              <button onClick={() => setMatchTxn(null)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Transactions Table */}
        {loading ? (
          <div className="py-20 text-center text-sm text-zinc-500">Loading transactions...</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-sm text-zinc-500">No transactions found.</div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/60">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Invoice</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filtered.map((txn) => (
                  <tr key={txn.id} className="hover:bg-zinc-900/30 transition-colors">
                    <td className="px-4 py-3 text-zinc-300">{txn.date}</td>
                    <td className="px-4 py-3 text-zinc-200">{txn.description}</td>
                    <td className={cn("px-4 py-3 text-right font-medium", txn.type === "credit" ? "text-emerald-400" : "text-red-400")}>
                      {txn.type === "credit" ? "+" : "-"}{formatCents(txn.amountCents)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                        txn.status === "reconciled" ? "bg-emerald-500/10 text-emerald-400" :
                        txn.status === "matched" ? "bg-blue-500/10 text-blue-400" :
                        "bg-amber-500/10 text-amber-400"
                      )}>
                        {txn.status === "reconciled" ? <CheckCircle2 className="h-3 w-3" /> :
                         txn.status === "matched" ? <Link2 className="h-3 w-3" /> :
                         <Circle className="h-3 w-3" />}
                        {txn.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {txn.matchedInvoiceNumber ? (
                        <span className="flex items-center gap-1 text-xs text-zinc-300">
                          <FileText className="h-3 w-3 text-zinc-500" />
                          {txn.matchedInvoiceNumber}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {txn.status === "unmatched" && (
                          <button
                            onClick={() => { setMatchTxn(txn); setSelectedInvoiceId(""); }}
                            className="rounded px-2 py-1 text-xs font-medium text-amber-400 hover:bg-amber-950/30 transition-colors"
                          >
                            Match
                          </button>
                        )}
                        {txn.status === "matched" && (
                          <button
                            onClick={() => handleReconcile(txn.id)}
                            className="rounded px-2 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-950/30 transition-colors"
                          >
                            Reconcile
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Statements */}
        {statements.length > 0 && (
          <div className="mt-8">
            <h3 className="mb-3 text-sm font-semibold text-white">Uploaded Statements</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {statements.map((stmt) => (
                <div key={stmt.id} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-300">{stmt.fileName}</span>
                    <span className="text-[10px] text-zinc-500">{new Date(stmt.uploadDate).toLocaleDateString()}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-[10px] text-zinc-500">
                    <span>{stmt.transactionCount} txns</span>
                    <span className="text-emerald-500">+{formatCents(stmt.totalCreditsCents)}</span>
                    <span className="text-red-500">-{formatCents(stmt.totalDebitsCents)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
