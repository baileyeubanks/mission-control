import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, CalendarClock, CheckCircle2, CreditCard, Download, FileText, Loader2, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { clientApproveRootQuoteDocument, getRootBillingState, requestRootQuoteChanges } from "@/lib/root-billing-client";
import { formatCents, type RootInvoiceRecord, type RootQuoteRecord } from "@/lib/root-billing";
import type { CompanyAccountId } from "@/lib/mission-control";

interface ClientDocumentPortalProps {
  companyAccount: CompanyAccountId;
}

function companyLabel(companyAccount: CompanyAccountId) {
  return companyAccount === "astro-cleaning-services" ? "Astro Cleaning Services" : "Content Co-op";
}

function language(companyAccount: CompanyAccountId) {
  return companyAccount === "astro-cleaning-services"
    ? {
        portal: "Client Portal",
        primary: "Quote, booking, service, invoice.",
        stages: ["Request", "Quote", "Booking", "Service", "Invoice", "Paid"],
        next: "Approve the quote or request changes. Payment links stay locked until Stripe is connected.",
      }
    : {
        portal: "Client Review Portal",
        primary: "Proposal, project, review, delivery.",
        stages: ["Brief", "Proposal", "Project", "Review", "Delivery", "Invoice"],
        next: "Approve the proposal or request changes. Review links attach after Co-Deliver is promoted.",
      };
}

function findPortalDocument(
  companyAccount: CompanyAccountId,
  token: string | undefined,
  quotes: RootQuoteRecord[],
  invoices: RootInvoiceRecord[],
) {
  const scopedQuotes = quotes.filter((quote) => quote.companyAccount === companyAccount);
  const scopedInvoices = invoices.filter((invoice) => invoice.companyAccount === companyAccount);
  const normalizedToken = token?.trim();
  const quote = scopedQuotes.find((item) => item.id === normalizedToken || item.documentNumber === normalizedToken) ?? scopedQuotes[0] ?? null;
  const invoice = scopedInvoices.find((item) => item.id === normalizedToken || item.invoiceNumber === normalizedToken) ?? scopedInvoices[0] ?? null;
  return { quote, invoice };
}

function statusTone(status: string) {
  if (["accepted", "approved", "paid", "issued"].includes(status)) return "text-success";
  if (["changes_requested", "overdue", "void"].includes(status)) return "text-destructive";
  return "text-warning";
}

export function ClientDocumentPortal({ companyAccount }: ClientDocumentPortalProps) {
  const { token } = useParams();
  const [quotes, setQuotes] = useState<RootQuoteRecord[]>([]);
  const [invoices, setInvoices] = useState<RootInvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [changeNote, setChangeNote] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const state = await getRootBillingState();
      setQuotes(state.quotes);
      setInvoices(state.invoices);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Client portal unavailable.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [companyAccount, token]);

  const portalLanguage = language(companyAccount);
  const { quote, invoice } = useMemo(() => findPortalDocument(companyAccount, token, quotes, invoices), [companyAccount, token, quotes, invoices]);
  const canApprove = quote && quote.status !== "invoiced" && quote.status !== "accepted" && quote.status !== "archived";

  const approve = async () => {
    if (!quote) return;
    setError(null);
    setNotice(null);
    try {
      const nextQuote = await clientApproveRootQuoteDocument(quote.id);
      setQuotes((current) => [nextQuote, ...current.filter((item) => item.id !== nextQuote.id)]);
      setNotice(`${nextQuote.documentNumber} approved.`);
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : "Approval failed.");
    }
  };

  const requestChanges = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!quote) return;
    setError(null);
    setNotice(null);
    try {
      const nextQuote = await requestRootQuoteChanges(quote.id, changeNote || "Client requested changes.");
      setQuotes((current) => [nextQuote, ...current.filter((item) => item.id !== nextQuote.id)]);
      setChangeNote("");
      setNotice("Change request recorded.");
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : "Change request failed.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !quote && !invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <Card className="glass max-w-md border-destructive/20">
          <CardContent className="flex gap-3 p-5 text-sm text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {error}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 md:py-10">
        <header className="flex flex-col gap-3 rounded-sm border border-white/5 bg-black/20 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-primary">{companyLabel(companyAccount)}</p>
            <h1 className="mt-1 text-2xl font-display tracking-normal">{portalLanguage.portal}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{portalLanguage.primary}</p>
          </div>
          <Badge variant="outline" className="w-fit text-[9px] uppercase text-success">
            secure local preview
          </Badge>
        </header>

        {(error || notice) && (
          <div className={`rounded-sm border px-3 py-2 text-xs ${error ? "border-destructive/20 bg-destructive/10 text-destructive" : "border-success/20 bg-success/10 text-success"}`}>
            {error || notice}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(420px,1.15fr)]">
          <section className="space-y-4">
            <Card className="glass border-white/5">
              <CardHeader className="py-4">
                <CardTitle className="text-sm">{quote?.kind === "proposal" ? "Proposal" : "Quote"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4 pt-0">
                {quote ? (
                  <>
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground">{quote.documentNumber}</p>
                      <h2 className="mt-1 text-xl font-semibold">{quote.title}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{quote.scopeSummary}</p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Metric label="Total" value={formatCents(quote.totalCents)} />
                      <Metric label="Status" value={quote.status.replace(/_/g, " ")} tone={statusTone(quote.status)} />
                      <Metric label="Version" value={`v${quote.documentVersion}`} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a href={`/api/root/quotes/${quote.id}/pdf`} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline" className="border-white/10 text-xs">
                          <Download className="mr-2 h-3.5 w-3.5" />
                          PDF
                        </Button>
                      </a>
                      <Button size="sm" disabled={!canApprove} onClick={() => void approve()} className="text-xs">
                        <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                        Approve
                      </Button>
                    </div>
                    <form className="grid gap-2 rounded-sm border border-white/5 bg-black/20 p-3" onSubmit={(event) => void requestChanges(event)}>
                      <label className="text-[9px] uppercase text-muted-foreground" htmlFor="change-note">Request changes</label>
                      <textarea
                        id="change-note"
                        value={changeNote}
                        onChange={(event) => setChangeNote(event.target.value)}
                        placeholder="Describe the change needed"
                        className="min-h-20 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                      />
                      <Button size="sm" variant="outline" disabled={!quote || quote.status === "invoiced"} className="w-fit border-white/10 text-xs">
                        <MessageSquare className="mr-2 h-3.5 w-3.5" />
                        Submit request
                      </Button>
                    </form>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No client-facing quote/proposal is available yet.</p>
                )}
              </CardContent>
            </Card>

            <Card className="glass border-white/5">
              <CardHeader className="py-4">
                <CardTitle className="text-sm">Invoice</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4 pt-0">
                {invoice ? (
                  <>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Metric label="Number" value={invoice.invoiceNumber} />
                      <Metric label="Total" value={formatCents(invoice.totalCents)} />
                      <Metric label="Payment" value={invoice.paymentStatus.replace(/_/g, " ")} tone={statusTone(invoice.paymentStatus)} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a href={`/api/root/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline" className="border-white/10 text-xs">
                          <Download className="mr-2 h-3.5 w-3.5" />
                          Invoice PDF
                        </Button>
                      </a>
                      <Button size="sm" disabled title="Stripe payment links are not connected in this local recovery shell." className="text-xs">
                        <CreditCard className="mr-2 h-3.5 w-3.5" />
                        Payment locked
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Invoice appears after quote/proposal conversion.</p>
                )}
              </CardContent>
            </Card>

            <Card className="glass border-white/5">
              <CardContent className="grid gap-3 p-4">
                {portalLanguage.stages.map((stage) => (
                  <div key={stage} className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-sm">{stage}</span>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">{portalLanguage.next}</p>
              </CardContent>
            </Card>
          </section>

          <Card className="glass border-white/5">
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <CardTitle className="text-sm">Document Preview</CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="p-3 pt-0">
              {quote?.previewHtml ? (
                <iframe title="Client document preview" srcDoc={quote.previewHtml} className="h-[720px] w-full rounded-sm border border-white/10 bg-white" />
              ) : invoice?.previewHtml ? (
                <iframe title="Client invoice preview" srcDoc={invoice.previewHtml} className="h-[720px] w-full rounded-sm border border-white/10 bg-white" />
              ) : (
                <div className="flex h-[480px] items-center justify-center rounded-sm border border-white/5 bg-black/20 text-sm text-muted-foreground">
                  No preview available.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 py-4 text-[10px] uppercase text-muted-foreground">
          <span>Mission Control secure portal</span>
          <Link to="/admin/onboarding" className="text-primary">Access matrix</Link>
        </footer>
      </main>
    </div>
  );
}

function Metric({ label, value, tone = "" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-sm border border-white/5 bg-black/20 p-3">
      <p className="text-[9px] uppercase text-muted-foreground">{label}</p>
      <p className={`mt-1 break-words text-sm font-medium ${tone}`}>{value}</p>
    </div>
  );
}

