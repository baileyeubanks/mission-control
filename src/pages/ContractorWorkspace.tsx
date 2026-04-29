import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, Clapperboard, Download, FileVideo, Loader2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRootBillingState } from "@/lib/root-billing-client";
import { formatCents, type RootQuoteRecord } from "@/lib/root-billing";

export function ContractorWorkspace() {
  const [proposals, setProposals] = useState<RootQuoteRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const state = await getRootBillingState();
        if (mounted) setProposals(state.quotes.filter((quote) => quote.companyAccount === "content-co-op"));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const activeProposal = useMemo(() => proposals[0] ?? null, [proposals]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 md:py-10">
        <header className="rounded-sm border border-slate-200 bg-slate-100 p-4">
          <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-primary">Content Co-op</p>
          <h1 className="mt-1 text-2xl font-display tracking-normal">Contractor Workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">Assigned production work, review status, deliverables, and handoff gates.</p>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)]">
          <Card className="glass border-slate-200">
            <CardHeader className="py-4">
              <CardTitle className="text-sm">Assignments</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-4 pt-0">
              {activeProposal ? (
                <article className="rounded-sm border border-primary/30 bg-primary/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground">{activeProposal.documentNumber}</p>
                      <h2 className="mt-1 text-xl font-semibold">{activeProposal.title}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{activeProposal.scopeSummary}</p>
                    </div>
                    <Badge variant="outline" className="text-[9px] uppercase text-warning">{activeProposal.status.replace(/_/g, " ")}</Badge>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <Metric label="Budget" value={formatCents(activeProposal.totalCents)} />
                    <Metric label="Timeline" value={activeProposal.projectTimeline ?? "TBD"} />
                    <Metric label="Version" value={`v${activeProposal.documentVersion}`} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a href={`/api/root/quotes/${activeProposal.id}/pdf`} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline" className="border-slate-200 text-xs">
                        <Download className="mr-2 h-3.5 w-3.5" />
                        Scope PDF
                      </Button>
                    </a>
                    <Button size="sm" disabled title="Asset uploads require promoted media storage." className="text-xs">
                      <Upload className="mr-2 h-3.5 w-3.5" />
                      Upload locked
                    </Button>
                  </div>
                </article>
              ) : (
                <div className="rounded-sm border border-slate-200 bg-slate-100 p-4 text-sm text-muted-foreground">
                  No CCO assignments are staged yet.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <Card className="glass border-slate-200">
              <CardHeader className="py-4">
                <CardTitle className="text-sm">Production Gates</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 p-4 pt-0">
                {[
                  ["Brief locked", "Client input is captured before production starts.", CheckCircle2],
                  ["Script / scope", "Scope PDF is the current contractor source.", Clapperboard],
                  ["Review link", "Co-Deliver link attaches after app promotion.", FileVideo],
                  ["Due date", "Timeline rolls up to Mission Control tasks.", CalendarClock],
                ].map(([title, detail, Icon]) => (
                  <div key={title as string} className="flex gap-3 rounded-sm border border-slate-200 bg-slate-100 p-3">
                    <Icon className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{title as string}</p>
                      <p className="text-xs text-muted-foreground">{detail as string}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="glass border-slate-200">
              <CardContent className="p-4 text-xs text-muted-foreground">
                Contractor workspace is intentionally focused: assigned work, current scope, review links, upload gates, and handoff status. It should not expose Root admin controls.
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
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

