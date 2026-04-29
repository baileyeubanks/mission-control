import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock,
  DollarSign,
  ExternalLink,
  Filter,
  Loader2,
  RefreshCcw,
  Rocket,
  Send,
  Target,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RootQuoteRecord, RootInvoiceRecord } from "@/lib/root-billing";

interface PipelineCard {
  id: string;
  type: "quote";
  title: string;
  clientName: string;
  clientEmail: string | null;
  valueCents: number;
  status: string;
  approvalStatus: string;
  source: string;
  documentNumber: string;
  createdAt: string;
  updatedAt: string;
  relatedInvoiceId: string | null;
  invoiceStatus?: string;
  daysInStage: number;
}

type PipelineColumnId =
  | "intake"
  | "drafting"
  | "review"
  | "sent"
  | "won"
  | "in_production"
  | "done"
  | "lost";

interface ColumnConfig {
  id: PipelineColumnId;
  label: string;
  icon: React.ElementType;
  tone: string;
}

const COLUMNS: ColumnConfig[] = [
  { id: "intake", label: "Intake", icon: Rocket, tone: "text-brand-accent-glow border-brand-accent-glow/30" },
  { id: "drafting", label: "Drafting", icon: Briefcase, tone: "text-warning border-warning/30" },
  { id: "review", label: "Review", icon: Clock, tone: "text-warning border-warning/30" },
  { id: "sent", label: "Sent", icon: Send, tone: "text-primary border-primary/30" },
  { id: "won", label: "Won", icon: CheckCircle2, tone: "text-success border-success/30" },
  { id: "in_production", label: "In Production", icon: Target, tone: "text-brand-accent-glow border-brand-accent-glow/30" },
  { id: "done", label: "Done", icon: CheckCircle2, tone: "text-success border-success/30" },
  { id: "lost", label: "Lost", icon: XCircle, tone: "text-destructive border-destructive/30" },
];

const PRODUCTION_KEY = "cco-pipeline-production-ids";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function daysSince(iso: string): number {
  const diff = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

function getProductionIds(): Set<string> {
  try {
    const raw = localStorage.getItem(PRODUCTION_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function setProductionIds(ids: Set<string>) {
  localStorage.setItem(PRODUCTION_KEY, JSON.stringify([...ids]));
}

function classifyQuote(
  quote: RootQuoteRecord,
  productionIds: Set<string>
): PipelineColumnId {
  if (quote.status === "declined" || quote.status === "expired" || quote.status === "archived") return "lost";
  if (quote.status === "invoiced") return "done";
  if (quote.status === "ready_to_invoice") return "won";
  if (quote.status === "accepted") {
    if (productionIds.has(quote.id)) return "in_production";
    return "won";
  }
  if (quote.status === "sent" || quote.status === "ready_to_send") return "sent";
  if (quote.approvalStatus === "requested") return "review";
  if (quote.status === "draft") {
    if (quote.source === "public_intake") return "intake";
    return "drafting";
  }
  if (quote.source === "public_intake") return "intake";
  return "drafting";
}

export function Pipeline() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<RootQuoteRecord[]>([]);
  const [invoices, setInvoices] = useState<RootInvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productionIds, setProductionIdsState] = useState<Set<string>>(getProductionIds);
  const [selectedCard, setSelectedCard] = useState<PipelineCard | null>(null);
  const [filter, setFilter] = useState("");

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [quotesRes, invoicesRes] = await Promise.all([
        fetch("/api/root/quotes?account=content-co-op"),
        fetch("/api/root/invoices?account=content-co-op"),
      ]);
      const quotesPayload = await quotesRes.json();
      const invoicesPayload = await invoicesRes.json();
      setQuotes(Array.isArray(quotesPayload.data) ? quotesPayload.data : []);
      setInvoices(Array.isArray(invoicesPayload.data) ? invoicesPayload.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pipeline load failed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const invoiceMap = useMemo(() => {
    const map = new Map<string, RootInvoiceRecord>();
    for (const inv of invoices) {
      map.set(inv.id, inv);
    }
    return map;
  }, [invoices]);

  const cards: PipelineCard[] = useMemo(() => {
    return quotes.map((q) => {
      const col = classifyQuote(q, productionIds);
      const relatedInvoice = q.relatedInvoiceId ? invoiceMap.get(q.relatedInvoiceId) : undefined;
      return {
        id: q.id,
        type: "quote",
        title: q.title,
        clientName: q.client.name,
        clientEmail: q.client.email,
        valueCents: q.totalCents,
        status: q.status,
        approvalStatus: q.approvalStatus,
        source: q.source,
        documentNumber: q.documentNumber,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
        relatedInvoiceId: q.relatedInvoiceId,
        invoiceStatus: relatedInvoice?.paymentStatus || relatedInvoice?.issueStatus,
        daysInStage: daysSince(q.updatedAt),
      };
    });
  }, [quotes, productionIds, invoiceMap]);

  const filteredCards = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return cards;
    return cards.filter(
      (c) =>
        c.clientName.toLowerCase().includes(term) ||
        c.title.toLowerCase().includes(term) ||
        c.documentNumber.toLowerCase().includes(term)
    );
  }, [cards, filter]);

  const grouped = useMemo(() => {
    const groups: Record<PipelineColumnId, PipelineCard[]> = {
      intake: [],
      drafting: [],
      review: [],
      sent: [],
      won: [],
      in_production: [],
      done: [],
      lost: [],
    };
    for (const card of filteredCards) {
      const col = classifyQuote(
        quotes.find((q) => q.id === card.id)!,
        productionIds
      );
      groups[col].push(card);
    }
    for (const col of Object.keys(groups) as PipelineColumnId[]) {
      groups[col].sort((a, b) => b.valueCents - a.valueCents);
    }
    return groups;
  }, [filteredCards, quotes, productionIds]);

  const stats = useMemo(() => {
    const active = cards.filter((c) => c.status !== "declined" && c.status !== "expired" && c.status !== "archived");
    const totalValue = active.reduce((s, c) => s + c.valueCents, 0);
    const wonValue = cards.filter((c) => c.status === "accepted" || c.status === "ready_to_invoice" || c.status === "invoiced").reduce((s, c) => s + c.valueCents, 0);
    const doneValue = cards.filter((c) => c.status === "invoiced" || c.invoiceStatus === "paid").reduce((s, c) => s + c.valueCents, 0);
    const winRate = cards.length > 0 ? Math.round((cards.filter((c) => c.status === "accepted" || c.status === "ready_to_invoice" || c.status === "invoiced").length / cards.filter((c) => c.status !== "draft" && c.status !== "needs_review").length) * 100) : 0;
    return { totalValue, wonValue, doneValue, winRate, dealCount: active.length };
  }, [cards]);

  const moveToProduction = (id: string) => {
    const next = new Set(productionIds);
    next.add(id);
    setProductionIdsState(next);
    setProductionIds(next);
  };

  const removeFromProduction = (id: string) => {
    const next = new Set(productionIds);
    next.delete(id);
    setProductionIdsState(next);
    setProductionIds(next);
  };

  const selectedQuote = selectedCard ? quotes.find((q) => q.id === selectedCard.id) : null;

  return (
    <div className="space-y-5 h-full flex flex-col">
      {/* Header */}
      <section className="p-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-brand-accent-glow" />
            <h1 className="text-2xl font-display tracking-[0.06em]">Pipeline</h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 font-mono uppercase tracking-widest">
            Quote-to-project funnel · CCO sales velocity
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter deals..."
              className="h-9 rounded-md border border-slate-200 bg-slate-100 pl-9 pr-3 text-xs text-slate-900 outline-none focus:border-brand-accent-glow/50 placeholder:text-slate-400 w-48"
            />
          </div>
          <Button variant="ghost" size="icon" onClick={() => void refresh()} className="hover:bg-slate-100">
            <RefreshCcw className="h-4 w-4 text-slate-400" />
          </Button>
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5 shrink-0">
        {[
          { label: "Pipeline", value: formatCents(stats.totalValue), icon: DollarSign },
          { label: "Won", value: formatCents(stats.wonValue), icon: CheckCircle2 },
          { label: "Collected", value: formatCents(stats.doneValue), icon: DollarSign },
          { label: "Active Deals", value: String(stats.dealCount), icon: Briefcase },
          { label: "Win Rate", value: `${stats.winRate}%`, icon: TrendingUp },
        ].map((s) => (
          <div key={s.label} className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400">{s.label}</p>
              <p className="mt-1 text-xl font-display">{s.value}</p>
            </div>
            <s.icon className="h-4 w-4 text-brand-accent-glow" />
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs text-destructive shrink-0">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Kanban */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-accent-glow/60" />
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-x-auto scrollbar-thin">
          <div className="flex gap-3 h-full min-w-max md:min-w-0 flex-nowrap">
            {COLUMNS.map((col) => {
              const items = grouped[col.id];
              const colValue = items.reduce((s, c) => s + c.valueCents, 0);
              return (
                <div key={col.id} className="flex w-72 md:w-64 flex-col gap-2 shrink-0">
                  {/* Column Header */}
                  <div className="flex items-center justify-between p-2.5">
                    <div className="flex items-center gap-2">
                      <col.icon className={`h-3.5 w-3.5 ${col.tone.split(" ")[0]}`} />
                      <span className="text-xs font-medium text-slate-700">{col.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-400">{formatCents(colValue)}</span>
                      <Badge variant="outline" className={`text-[8px] uppercase ${col.tone}`}>
                        {items.length}
                      </Badge>
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 space-y-2 overflow-y-auto scrollbar-thin pr-1">
                    {items.map((card) => (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => setSelectedCard(card)}
                        className="w-full p-3 text-left transition-colors hover:border-slate-200 hover:bg-slate-100"
                      >
                        <p className="text-xs font-medium text-slate-800 truncate">{card.title}</p>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">{card.clientName}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm font-display text-brand-accent-glow">{formatCents(card.valueCents)}</span>
                          <span className="text-[9px] font-mono text-slate-400">{card.daysInStage}d</span>
                        </div>
                        {card.invoiceStatus && (
                          <Badge variant="outline" className="mt-2 text-[7px] uppercase text-success border-success/20">
                            {card.invoiceStatus.replace(/_/g, " ")}
                          </Badge>
                        )}
                      </button>
                    ))}
                    {items.length === 0 && (
                      <div className="p-3 text-center">
                        <p className="text-[10px] font-mono text-slate-400 uppercase">Empty</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {selectedCard && selectedQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display tracking-[0.06em]">Deal Detail</h2>
              <Button variant="ghost" size="icon" onClick={() => setSelectedCard(null)} className="hover:bg-slate-100">
                <XCircle className="h-4 w-4 text-slate-400" />
              </Button>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-mono uppercase text-slate-400">{selectedQuote.documentNumber}</p>
              <p className="text-lg font-medium">{selectedQuote.title}</p>
              <p className="text-sm text-slate-500">{selectedQuote.client.name} · {selectedQuote.client.email}</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 text-center">
                <p className="text-[9px] font-mono uppercase text-slate-400">Value</p>
                <p className="text-sm font-display text-brand-accent-glow">{formatCents(selectedQuote.totalCents)}</p>
              </div>
              <div className="p-2.5 text-center">
                <p className="text-[9px] font-mono uppercase text-slate-400">Status</p>
                <p className="text-sm font-display">{selectedQuote.status.replace(/_/g, " ")}</p>
              </div>
              <div className="p-2.5 text-center">
                <p className="text-[9px] font-mono uppercase text-slate-400">Age</p>
                <p className="text-sm font-display">{daysSince(selectedQuote.createdAt)}d</p>
              </div>
            </div>

            <p className="text-xs text-slate-500">{selectedQuote.scopeSummary}</p>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" onClick={() => navigate(`/admin/quotes`)} className="btn-mission text-sm">
                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                Open in Quotes
              </Button>

              {(selectedQuote.status === "accepted" || selectedQuote.status === "ready_to_invoice") && (
                <>
                  {!productionIds.has(selectedQuote.id) ? (
                    <Button size="sm" variant="outline" onClick={() => moveToProduction(selectedQuote.id)} className="border-slate-200 text-xs hover:bg-slate-100">
                      <Target className="mr-2 h-3.5 w-3.5" />
                      Mark In Production
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => removeFromProduction(selectedQuote.id)} className="border-slate-200 text-xs hover:bg-slate-100">
                      <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                      Production Complete
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
