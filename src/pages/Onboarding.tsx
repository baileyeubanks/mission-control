import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BriefcaseBusiness, CheckCircle2, ExternalLink, ShieldCheck, UserPlus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRootBillingState } from "@/lib/root-billing-client";
import type { RootInvoiceRecord, RootQuoteRecord } from "@/lib/root-billing";

const surfaces = [
  {
    company: "ACS",
    persona: "Admin / operator",
    route: "/admin",
    owns: "Quote, booking, dispatch, crew, invoice, payment visibility.",
    status: "active shell",
  },
  {
    company: "ACS",
    persona: "Crew",
    route: "/crew",
    owns: "Route, access notes, checklist, proof capture, completion.",
    status: "seeded",
  },
  {
    company: "ACS",
    persona: "Client",
    route: "/client/acs",
    owns: "Quote approval, service status, invoice PDF, payment link.",
    status: "wired local",
  },
  {
    company: "CCO",
    persona: "Admin / producer",
    route: "/admin",
    owns: "Lead, brief, proposal, project, review, delivery, billing.",
    status: "active shell",
  },
  {
    company: "CCO",
    persona: "Contractor / editor",
    route: "/contractor",
    owns: "Assignments, scope, review links, upload gates, handoff.",
    status: "seeded",
  },
  {
    company: "CCO",
    persona: "Client",
    route: "/client/cco",
    owns: "Proposal approval, project timeline, review/delivery, invoice.",
    status: "wired local",
  },
];

export function Onboarding() {
  const [quotes, setQuotes] = useState<RootQuoteRecord[]>([]);
  const [invoices, setInvoices] = useState<RootInvoiceRecord[]>([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const state = await getRootBillingState();
      if (mounted) {
        setQuotes(state.quotes);
        setInvoices(state.invoices);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const acsQuote = quotes.find((quote) => quote.companyAccount === "astro-cleaning-services");
  const ccoProposal = quotes.find((quote) => quote.companyAccount === "content-co-op");
  const acsInvoice = invoices.find((invoice) => invoice.companyAccount === "astro-cleaning-services");

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-sm border border-white/5 bg-black/20 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              <h1 className="text-2xl font-display tracking-normal">Onboarding / Access</h1>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Role routing, portal links, and company-specific workspace setup.</p>
          </div>
          <Badge variant="outline" className="w-fit text-[9px] uppercase text-success">local access matrix</Badge>
        </div>
      </section>

      <div className="grid gap-3 xl:grid-cols-3">
        <Card className="glass border-white/5">
          <CardHeader className="py-4">
            <CardTitle className="text-sm">Demo Access Links</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 p-4 pt-0">
            <AccessLink label="ACS client portal" to={`/client/acs/${acsQuote?.id ?? "demo"}`} />
            <AccessLink label="CCO client portal" to={`/client/cco/${ccoProposal?.id ?? "demo"}`} />
            <AccessLink label="CCO contractor workspace" to="/contractor" />
            <AccessLink label="ACS crew workspace" to="/crew" />
            {acsInvoice && <AccessLink label="ACS invoice portal" to={`/client/acs/${acsInvoice.id}`} />}
          </CardContent>
        </Card>

        <Card className="glass border-white/5 xl:col-span-2">
          <CardHeader className="py-4">
            <CardTitle className="text-sm">Access Setup Rules</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 pt-0 md:grid-cols-3">
            <Rule icon={ShieldCheck} title="Auth routes identity" detail="Owner, operator, crew, contractor, and client land on different surfaces." />
            <Rule icon={Users} title="Company scoped" detail="ACS and CCO share infrastructure but not workflows or client language." />
            <Rule icon={BriefcaseBusiness} title="Portal links" detail="Clients should enter through secure quote, proposal, invoice, or review links." />
          </CardContent>
        </Card>
      </div>

      <Card className="glass border-white/5">
        <CardHeader className="py-4">
          <CardTitle className="text-sm">Surface Matrix</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 p-4 pt-0">
          {surfaces.map((surface) => (
            <div key={`${surface.company}-${surface.persona}`} className="grid gap-3 rounded-sm border border-white/5 bg-black/20 p-3 md:grid-cols-[80px_170px_minmax(0,1fr)_120px_90px] md:items-center">
              <p className="text-xs font-semibold">{surface.company}</p>
              <p className="text-sm">{surface.persona}</p>
              <p className="text-xs text-muted-foreground">{surface.owns}</p>
              <Badge variant="outline" className="w-fit text-[8px] uppercase text-warning">{surface.status}</Badge>
              <Link to={surface.route}>
                <Button size="sm" variant="outline" className="h-8 border-white/10 text-xs">
                  Open
                </Button>
              </Link>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function AccessLink({ label, to }: { label: string; to: string }) {
  return (
    <Link to={to}>
      <Button variant="outline" className="w-full justify-between border-white/10 text-xs">
        {label}
        <ExternalLink className="h-3.5 w-3.5" />
      </Button>
    </Link>
  );
}

function Rule({ icon: Icon, title, detail }: { icon: typeof CheckCircle2; title: string; detail: string }) {
  return (
    <div className="rounded-sm border border-white/5 bg-black/20 p-3">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

