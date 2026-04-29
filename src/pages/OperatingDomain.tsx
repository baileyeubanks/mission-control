import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ExternalLink, Loader2, LockKeyhole, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createMissionControlHandoff,
  getMissionControlOperatingDomains,
  getMissionControlReadModels,
  listMissionHandoffs,
} from "@/lib/mission-control-client";
import type { MissionHandoff, MissionOperatingDomain, MissionReadModelRecord } from "@/lib/mission-control";

function tone(status: MissionOperatingDomain["status"]) {
  if (status === "contract-backed" || status === "active") return "text-success";
  if (status === "blocked") return "text-destructive";
  return "text-muted-foreground";
}

function recordTone(status: MissionReadModelRecord["status"]) {
  if (status === "read-only") return "text-success";
  if (status === "blocked") return "text-destructive";
  if (status === "adapter-needed") return "text-warning";
  return "text-muted-foreground";
}

export function OperatingDomain({ domainId }: { domainId: MissionOperatingDomain["id"] }) {
  const [domains, setDomains] = useState<MissionOperatingDomain[]>([]);
  const [readModels, setReadModels] = useState<MissionReadModelRecord[]>([]);
  const [handoffs, setHandoffs] = useState<MissionHandoff[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingQuote, setCreatingQuote] = useState(false);
  const [quoteFormOpen, setQuoteFormOpen] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    summary: "",
    estimate: "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadDomains() {
      setLoading(true);
      setError(null);
      try {
        const [domainPayload, readModelPayload] = await Promise.all([
          getMissionControlOperatingDomains(),
          getMissionControlReadModels(domainId),
        ]);
        const handoffPayload = domainId === "quotes" ? await listMissionHandoffs() : [];
        if (mounted) {
          setDomains(domainPayload);
          setReadModels(readModelPayload);
          setHandoffs(handoffPayload.filter((handoff) => handoff.handoff_type === "acs_quote_intake"));
        }
      } catch (loadError) {
        if (mounted) setError(loadError instanceof Error ? loadError.message : "Operating domain unavailable.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadDomains();
    return () => {
      mounted = false;
    };
  }, [domainId]);

  const domain = useMemo(() => domains.find((item) => item.id === domainId) || null, [domains, domainId]);

  const createQuoteHandoff = async () => {
    if (!quoteForm.name.trim() || !quoteForm.summary.trim()) {
      setError("Name and summary are required for a local quote handoff.");
      return;
    }

    setCreatingQuote(true);
    setError(null);
    try {
      const now = Date.now();
      const estimateCents = Number.parseFloat(quoteForm.estimate);
      const handoff = await createMissionControlHandoff({
        id: `handoff-acs-quote-${now}`,
        source: "Root local quote intake",
        company_account: "astro-cleaning-services",
        handoff_type: "acs_quote_intake",
        source_entity_id: `acs-quote-local-${now}`,
        contact: {
          name: quoteForm.name.trim(),
          email: quoteForm.email.trim() || null,
          phone: quoteForm.phone.trim() || null,
          company: null,
        },
        summary: quoteForm.summary.trim(),
        next_action: "Review quote details, confirm crew readiness, then create job candidate.",
        details: {
          service_address: quoteForm.address.trim() || null,
          estimated_total_cents: Number.isFinite(estimateCents) ? Math.round(estimateCents * 100) : null,
          intake_mode: "local_root_recovery",
        },
        readiness: {
          status: "blocked",
          summary: "Crew readiness must be confirmed before assignment.",
          blockers: ["ACS onboarding readiness adapter not yet promoted."],
        },
      });
      setHandoffs((current) => [handoff, ...current.filter((item) => item.id !== handoff.id)]);
      setQuoteForm({ name: "", email: "", phone: "", address: "", summary: "", estimate: "" });
      setQuoteFormOpen(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create quote handoff.");
    } finally {
      setCreatingQuote(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary/60" />
      </div>
    );
  }

  if (error || !domain) {
    return (
      <Card className="glass border-destructive/20">
        <CardContent className="flex items-center gap-3 p-5 text-sm">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          {error || "Operating domain not found."}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-sm border border-white/5 bg-black/20 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-display tracking-normal">{domain.title}</h1>
            <p className="mt-2 max-w-3xl text-xs text-muted-foreground">{domain.purpose}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={`w-fit text-[9px] uppercase ${tone(domain.status)}`}>
              {domain.status.replace(/-/g, " ")}
            </Badge>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-sm border border-destructive/20 bg-destructive/10 px-4 py-3 text-[10px] font-mono uppercase tracking-wider text-destructive">
          {error}
        </div>
      )}

      {domainId === "quotes" && quoteFormOpen && (
        <Card className="glass border-white/5">
          <CardHeader className="py-4">
            <CardTitle className="text-sm">Create Local ACS Quote Handoff</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 pt-0 lg:grid-cols-2">
            <Input placeholder="Client name" value={quoteForm.name} onChange={(event) => setQuoteForm((current) => ({ ...current, name: event.target.value }))} />
            <Input placeholder="Email" value={quoteForm.email} onChange={(event) => setQuoteForm((current) => ({ ...current, email: event.target.value }))} />
            <Input placeholder="Phone" value={quoteForm.phone} onChange={(event) => setQuoteForm((current) => ({ ...current, phone: event.target.value }))} />
            <Input placeholder="Service address" value={quoteForm.address} onChange={(event) => setQuoteForm((current) => ({ ...current, address: event.target.value }))} />
            <Input placeholder="Estimated total" value={quoteForm.estimate} onChange={(event) => setQuoteForm((current) => ({ ...current, estimate: event.target.value }))} />
            <Input placeholder="Quote summary" value={quoteForm.summary} onChange={(event) => setQuoteForm((current) => ({ ...current, summary: event.target.value }))} />
            <div className="flex gap-2 lg:col-span-2">
              <Button onClick={() => void createQuoteHandoff()} disabled={creatingQuote} className="h-9 text-xs">
                {creatingQuote ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-2 h-3.5 w-3.5" />}
                Create handoff
              </Button>
              <Button variant="outline" onClick={() => setQuoteFormOpen(false)} className="h-9 text-xs border-white/10">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {domainId === "quotes" && (
        <Card className="glass border-white/5">
          <CardHeader className="flex flex-col items-start gap-3 py-4">
            <CardTitle className="text-sm">Local Quote Handoffs</CardTitle>
            <Button
              size="sm"
              className="h-8 text-[10px] uppercase"
              onClick={() => setQuoteFormOpen((open) => !open)}
            >
              <Plus className="mr-2 h-3.5 w-3.5" />
              Local quote
            </Button>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 pt-0 xl:grid-cols-2">
            {handoffs.length === 0 ? (
              <div className="rounded-sm border border-white/5 bg-black/20 p-3 text-sm text-muted-foreground">
                No local quote handoffs yet. Create one here or connect the ACS public quote engine.
              </div>
            ) : (
              handoffs.map((handoff) => (
                <article key={handoff.id} className="rounded-sm border border-white/5 bg-black/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{handoff.contact.name}</p>
                      <p className="mt-1 text-[10px] uppercase text-muted-foreground">{handoff.source}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[8px] uppercase text-warning">
                      {handoff.status}
                    </Badge>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">{handoff.summary}</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-sm border border-white/5 bg-black/20 p-2">
                      <p className="text-[9px] uppercase text-muted-foreground">Address</p>
                      <p className="mt-1 truncate text-xs">{typeof handoff.details.service_address === "string" ? handoff.details.service_address : "Not set"}</p>
                    </div>
                    <div className="rounded-sm border border-white/5 bg-black/20 p-2">
                      <p className="text-[9px] uppercase text-muted-foreground">Next step</p>
                      <p className="mt-1 truncate text-xs">Open Inbox to convert</p>
                    </div>
                  </div>
                </article>
              ))
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="glass border-white/5">
          <CardHeader className="py-4">
            <CardTitle className="text-sm">Authority</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0">
            <div className="rounded-sm border border-white/5 bg-black/20 p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Owns</p>
              <p className="mt-2 text-sm">{domain.authority}</p>
            </div>
            <div className="rounded-sm border border-white/5 bg-black/20 p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Does not own</p>
              <p className="mt-2 text-sm">{domain.doesNotOwn}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-white/5">
          <CardHeader className="py-4">
            <CardTitle className="text-sm">Next Action</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0">
            <p className="rounded-sm border border-white/5 bg-black/20 p-3 text-sm">{domain.nextAction}</p>
            {domain.blocker && (
              <p className="rounded-sm border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                {domain.blocker}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="glass border-white/5">
        <CardHeader className="py-4">
          <CardTitle className="text-sm">Lifecycle</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 p-4 pt-0 md:grid-cols-3 xl:grid-cols-4">
          {domain.lifecycle.map((stage) => (
            <div key={stage} className="rounded-sm border border-white/5 bg-black/20 p-3">
              <p className="text-sm font-medium">{stage}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="glass border-white/5">
        <CardHeader className="py-4">
          <CardTitle className="text-sm">Read Models</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 pt-0 xl:grid-cols-2">
          {readModels.length === 0 ? (
            <div className="rounded-sm border border-white/5 bg-black/20 p-3 text-sm text-muted-foreground">
              No read model records are wired for this domain yet.
            </div>
          ) : (
            readModels.map((record) => (
              <article key={record.id} className="rounded-sm border border-white/5 bg-black/20 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{record.title}</p>
                    <p className="mt-1 text-[10px] uppercase text-muted-foreground">{record.lifecycleStage}</p>
                  </div>
                  <Badge variant="outline" className={`shrink-0 text-[8px] uppercase ${recordTone(record.status)}`}>
                    {record.status.replace(/-/g, " ")}
                  </Badge>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-sm border border-white/5 bg-black/20 p-2">
                    <p className="text-[9px] uppercase text-muted-foreground">Owner</p>
                    <p className="mt-1 truncate text-xs">{record.owner}</p>
                  </div>
                  <div className="rounded-sm border border-white/5 bg-black/20 p-2">
                    <p className="text-[9px] uppercase text-muted-foreground">Source</p>
                    <p className="mt-1 truncate text-xs">{record.sourceSystem}</p>
                  </div>
                  <div className="rounded-sm border border-white/5 bg-black/20 p-2">
                    <p className="text-[9px] uppercase text-muted-foreground">Amount</p>
                    <p className="mt-1 truncate text-xs">{record.amountLabel || "N/A"}</p>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 lg:grid-cols-2">
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Facts</p>
                    <div className="mt-2 space-y-1">
                      {record.facts.slice(0, 3).map((fact) => (
                        <p key={fact} className="rounded-sm border border-white/5 bg-black/20 p-2 text-xs text-muted-foreground">
                          {fact}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-[10px] uppercase text-muted-foreground">
                      <LockKeyhole className="h-3 w-3" />
                      Mutation gates
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {record.mutationGates.map((gate) => (
                        <Badge key={gate} variant="outline" className="text-[8px] uppercase text-muted-foreground">
                          {gate}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <p className="mt-3 rounded-sm border border-white/5 bg-black/20 p-2 text-xs text-muted-foreground">
                  {record.nextAction}
                </p>
                {record.blocker && (
                  <p className="mt-2 rounded-sm border border-warning/20 bg-warning/10 p-2 text-xs text-warning">{record.blocker}</p>
                )}
              </article>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="glass border-white/5">
        <CardHeader className="py-4">
          <CardTitle className="text-sm">Source Authority</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-4 pt-0">
          {domain.sourceDocs.map((source) => (
            <div key={source} className="flex items-center justify-between gap-3 rounded-sm border border-white/5 bg-black/20 p-3">
              <p className="min-w-0 truncate text-xs text-muted-foreground">{source}</p>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-primary" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
