import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Loader2,
  Mail,
  MessageSquare,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  ArrowRight,
  Download,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RootQuoteRecord, RootInvoiceRecord } from "@/lib/root-billing";

interface ClientDocument {
  quotes: RootQuoteRecord[];
  invoices: RootInvoiceRecord[];
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function quoteStatusTone(status: string) {
  if (["accepted", "ready_to_invoice", "invoiced"].includes(status)) return "text-success border-success/30";
  if (["declined", "expired", "archived"].includes(status)) return "text-destructive border-destructive/30";
  if (["sent", "ready_to_send"].includes(status)) return "text-primary border-primary/30";
  return "text-warning border-warning/30";
}

function invoiceStatusTone(status: string) {
  if (status === "paid") return "text-success border-success/30";
  if (status === "overdue" || status === "voided") return "text-destructive border-destructive/30";
  if (status === "issued") return "text-primary border-primary/30";
  return "text-warning border-warning/30";
}

export function ClientPortalV2() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ClientDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [changeNote, setChangeNote] = useState("");
  const [showChangeForm, setShowChangeForm] = useState<string | null>(null);
  const [clientEmail, setClientEmail] = useState("");

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const verifyRes = await fetch(`/api/client-portal/verify?token=${encodeURIComponent(token)}`);
      const verifyJson = await verifyRes.json();
      if (!verifyJson.ok) {
        setError(verifyJson.error || "Invalid or expired portal link.");
        setLoading(false);
        return;
      }
      const email = verifyJson.email;
      setClientEmail(email);

      const [quotesRes, invoicesRes] = await Promise.all([
        fetch(`/api/root/quotes?clientEmail=${encodeURIComponent(email)}`),
        fetch(`/api/root/invoices?clientEmail=${encodeURIComponent(email)}`),
      ]);
      const quotesPayload = await quotesRes.json();
      const invoicesPayload = await invoicesRes.json();
      setData({
        quotes: quotesPayload.data ?? [],
        invoices: invoicesPayload.data ?? [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [token]);

  const handleApprove = async (quoteId: string) => {
    setActiveAction(`approve:${quoteId}`);
    try {
      const res = await fetch(`/api/root/quotes/${encodeURIComponent(quoteId)}/client-approve`, { method: "POST" });
      if (!res.ok) throw new Error("Approval failed.");
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed.");
    } finally {
      setActiveAction(null);
    }
  };

  const handleRequestChanges = async (quoteId: string) => {
    if (!changeNote.trim()) return;
    setActiveAction(`changes:${quoteId}`);
    try {
      const res = await fetch(`/api/root/quotes/${encodeURIComponent(quoteId)}/request-changes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: changeNote.trim() }),
      });
      if (!res.ok) throw new Error("Request failed.");
      setChangeNote("");
      setShowChangeForm(null);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setActiveAction(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-brand-base">
        <Loader2 className="h-8 w-8 animate-spin text-brand-accent-glow" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-brand-base p-6">
        <div className="glass-panel p-8 max-w-sm text-center border-destructive/20">
          <AlertTriangle className="mx-auto h-8 w-8 text-destructive mb-3" />
          <h1 className="text-xl font-display text-destructive mb-2">LOAD_ERROR</h1>
          <p className="text-sm text-white/40">{error}</p>
        </div>
      </div>
    );
  }

  const quotes = data?.quotes ?? [];
  const invoices = data?.invoices ?? [];
  const pendingQuotes = quotes.filter((q) => q.status === "sent" || q.status === "ready_to_send");
  const clientName = quotes[0]?.client.name ?? invoices[0]?.client.name ?? "Client";

  return (
    <div className="min-h-screen bg-brand-base text-white font-sans">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(61,125,216,0.04)_0%,transparent_50%)]" />

      <div className="relative z-10 mx-auto max-w-3xl px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-brand-accent-glow/10 border border-brand-accent-glow/20 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-brand-accent-glow" />
            </div>
            <div>
              <h1 className="text-xl font-display tracking-[0.08em]">CLIENT PORTAL</h1>
              <p className="text-[9px] font-mono text-white/30 uppercase tracking-[0.3em]">Content Co-op</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[9px] font-mono uppercase border-white/10 text-white/40">
            <Mail className="mr-1.5 h-3 w-3" />
            {clientEmail}
          </Badge>
        </div>

        {/* Welcome */}
        <div className="glass-panel p-5 mb-6">
          <p className="text-sm text-white/60">
            Welcome back, <span className="text-white font-medium">{clientName}</span>. Here's everything we've sent you.
          </p>
        </div>

        {/* Pending Actions */}
        {pendingQuotes.length > 0 && (
          <div className="mb-6 space-y-3">
            <span className="label-nav">Pending Approval</span>
            {pendingQuotes.map((quote) => (
              <Card key={quote.id} className="glass border-primary/20">
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      {quote.title}
                    </CardTitle>
                    <Badge variant="outline" className={`text-[8px] uppercase ${quoteStatusTone(quote.status)}`}>
                      {quote.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="text-[10px] font-mono text-white/30 uppercase mt-1">{quote.documentNumber}</p>
                </CardHeader>
                <CardContent className="space-y-4 p-4 pt-0">
                  <p className="text-sm text-white/50">{quote.scopeSummary}</p>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-md border border-white/5 bg-black/20 p-2.5 text-center">
                      <p className="text-[9px] font-mono uppercase text-white/30">Subtotal</p>
                      <p className="text-sm font-display">{formatCents(quote.subtotalCents)}</p>
                    </div>
                    <div className="rounded-md border border-white/5 bg-black/20 p-2.5 text-center">
                      <p className="text-[9px] font-mono uppercase text-white/30">Total</p>
                      <p className="text-sm font-display text-primary">{formatCents(quote.totalCents)}</p>
                    </div>
                    <div className="rounded-md border border-white/5 bg-black/20 p-2.5 text-center">
                      <p className="text-[9px] font-mono uppercase text-white/30">Deposit</p>
                      <p className="text-sm font-display">{formatCents(quote.depositCents)}</p>
                    </div>
                  </div>

                  {quote.artifacts.some((a) => a.artifactType === "pdf") && (
                    <a
                      href={`/api/root/quotes/${quote.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] font-mono text-primary hover:underline"
                    >
                      <Download className="h-3 w-3" />
                      Download PDF
                    </a>
                  )}

                  {showChangeForm === quote.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={changeNote}
                        onChange={(e) => setChangeNote(e.target.value)}
                        placeholder="What would you like changed?"
                        rows={3}
                        className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-primary/50 resize-none placeholder:text-white/20"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setShowChangeForm(null); setChangeNote(""); }}
                          className="border-white/10 text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          disabled={!changeNote.trim() || activeAction === `changes:${quote.id}`}
                          onClick={() => void handleRequestChanges(quote.id)}
                          className="text-xs"
                        >
                          {activeAction === `changes:${quote.id}` ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <MessageSquare className="h-3 w-3 mr-1" />}
                          Send Feedback
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowChangeForm(quote.id)}
                        disabled={Boolean(activeAction)}
                        className="flex-1 border-white/10 text-xs"
                      >
                        <MessageSquare className="mr-1.5 h-3 w-3" />
                        Request Changes
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => void handleApprove(quote.id)}
                        disabled={activeAction === `approve:${quote.id}`}
                        className="flex-1 bg-success/20 text-success border border-success/30 hover:bg-success/30 text-xs"
                      >
                        {activeAction === `approve:${quote.id}` ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                        Approve
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* All Quotes */}
        {quotes.length > 0 && (
          <div className="mb-6 space-y-3">
            <span className="label-nav">All Quotes & Proposals</span>
            {quotes.map((quote) => (
              <div key={quote.id} className="glass-panel p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{quote.title}</p>
                  <p className="text-[10px] font-mono text-white/30 mt-0.5">{quote.documentNumber} · {new Date(quote.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-display">{formatCents(quote.totalCents)}</span>
                  <Badge variant="outline" className={`text-[8px] uppercase ${quoteStatusTone(quote.status)}`}>
                    {quote.status.replace(/_/g, " ")}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Invoices */}
        {invoices.length > 0 && (
          <div className="mb-6 space-y-3">
            <span className="label-nav">Invoices</span>
            {invoices.map((invoice) => (
              <div key={invoice.id} className="glass-panel p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{invoice.title}</p>
                  <p className="text-[10px] font-mono text-white/30 mt-0.5">{invoice.invoiceNumber} · Due: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "TBD"}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-display">{formatCents(invoice.totalCents)}</span>
                  <Badge variant="outline" className={`text-[8px] uppercase ${invoiceStatusTone(invoice.paymentStatus)}`}>
                    {invoice.paymentStatus.replace(/_/g, " ")}
                  </Badge>
                  {invoice.issueStatus === "issued" && invoice.paymentStatus !== "paid" && (
                    <Button
                      size="sm"
                      className="h-7 gap-1 text-[10px] bg-emerald-600 hover:bg-emerald-500"
                      onClick={() => navigate(`/client/checkout/${invoice.id}`)}
                    >
                      <CreditCard className="h-3 w-3" />
                      Pay
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {quotes.length === 0 && invoices.length === 0 && (
          <div className="glass-panel p-12 text-center">
            <FileText className="mx-auto h-8 w-8 text-white/10 mb-3" />
            <p className="text-sm text-white/30">No documents found for this email.</p>
            <p className="text-[10px] font-mono text-white/20 mt-1">Check back after your first quote is sent.</p>
          </div>
        )}

        <footer className="text-center pt-8 pb-4">
          <p className="text-[9px] font-mono text-white/15 uppercase tracking-[0.3em]">
            Powered by Mission Control · Content Co-op
          </p>
        </footer>
      </div>
    </div>
  );
}
