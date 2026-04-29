import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MessageSquare,
  TrendingUp,
  Film,
  Users,
  Package,
  Camera,
  Palette,
  DollarSign,
  Send,
  Loader2,
  Tag,
  BarChart3,
  ChevronRight,
  Plus,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/auth-fetch";
import { VIDEO_TYPES, BUDGET_OPTIONS } from "./CreativeBriefIntake";

interface BriefSession {
  id: string;
  status: string;
  contact: { firstName: string; lastName?: string; company: string; role?: string; email: string; phone?: string } | null;
  phases: Record<string, any>;
  aiEnrichment: {
    projectType: string;
    businessFunction: string;
    businessObjective: string;
    audience: string;
    detectedNeeds: string[];
    missingFields: string[];
    nextBestQuestion: string;
    complexityScore: number;
    budgetConfidence: string;
    riskFlags: string[];
    internalProducerNote: string;
    suggestedPackage: string;
  } | null;
  estimate: { minimalCents: number; recommendedCents: number; premiumCents: number; confidence: string; explanation: string } | null;
  proposalOptions: { id: string; label: string; description: string; totalCents: number; deliverables: string[]; timelineDays: number }[];
  complexityScore: number;
  proposalReadiness: number;
  adminNotes: { id: string; text: string; author: string; createdAt: string }[];
  relatedQuoteId: string | null;
  createdAt: string;
  updatedAt: string;
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    draft_started: "bg-slate-200 text-slate-500",
    contact_captured: "bg-blue-900/30 text-blue-400",
    discovery_in_progress: "bg-amber-900/30 text-amber-400",
    brief_submitted: "bg-emerald-900/30 text-emerald-400",
    ai_enriched: "bg-purple-900/30 text-purple-400",
    internal_review_required: "bg-orange-900/30 text-orange-400",
    proposal_draft_ready: "bg-cyan-900/30 text-cyan-400",
    proposal_sent: "bg-indigo-900/30 text-indigo-400",
    client_approved: "bg-green-900/30 text-green-400",
    closed_lost: "bg-red-900/30 text-red-400",
  };
  return map[status] || "bg-slate-200 text-slate-500";
}

function complexityBand(score: number): { label: string; color: string } {
  if (score <= 25) return { label: "Simple", color: "text-emerald-400" };
  if (score <= 50) return { label: "Standard", color: "text-blue-400" };
  if (score <= 75) return { label: "Advanced", color: "text-amber-400" };
  return { label: "Enterprise", color: "text-red-400" };
}

export function BriefReviewList() {
  const navigate = useNavigate();
  const [briefs, setBriefs] = useState<BriefSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetchBriefs();
  }, []);

  async function fetchBriefs() {
    setLoading(true);
    try {
      const res = await authFetch("/api/creative-briefs");
      const json = await res.json();
      setBriefs(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (!filter) return briefs;
    const q = filter.toLowerCase();
    return briefs.filter((b) =>
      b.contact?.company.toLowerCase().includes(q) ||
      b.contact?.firstName.toLowerCase().includes(q) ||
      b.status.toLowerCase().includes(q) ||
      b.aiEnrichment?.projectType.toLowerCase().includes(q)
    );
  }, [briefs, filter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Creative Briefs</h1>
            <p className="mt-1 text-sm text-slate-500">Review, score, and convert intake submissions.</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <BarChart3 className="h-4 w-4" />
            {briefs.length} total
          </div>
        </div>

        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search by company, name, status..."
          className="mb-4 w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:outline-none"
        />

        <div className="space-y-2">
          {filtered.map((brief) => {
            const band = complexityBand(brief.complexityScore);
            return (
              <button
                key={brief.id}
                onClick={() => navigate(`/admin/briefs/${brief.id}`)}
                className="w-full text-left rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">{brief.contact?.company || "Unknown company"}</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium uppercase", statusBadge(brief.status))}>
                        {brief.status?.replace(/_/g, " ") || "draft"}
                      </span>
                      {brief.aiEnrichment && (
                        <span className="flex items-center gap-1 text-[10px] text-purple-700">
                          <Sparkles className="h-3 w-3" />
                          AI enriched
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {brief.contact?.firstName} {brief.contact?.lastName} · {brief.contact?.email} · {new Date(brief.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className={cn("text-xs font-semibold", band.color)}>{band.label}</div>
                      <div className="text-[10px] text-slate-400">Complexity {brief.complexityScore}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-slate-400">No briefs found.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export function BriefReviewDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [brief, setBrief] = useState<BriefSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState("");
  const [converting, setConverting] = useState(false);
  const [generatedQuote, setGeneratedQuote] = useState<{ id: string } | null>(null);

  useEffect(() => {
    if (id) fetchBrief();
  }, [id]);

  async function fetchBrief() {
    setLoading(true);
    try {
      const res = await authFetch(`/api/creative-briefs/${id}`);
      const json = await res.json();
      if (json.ok) setBrief(json.data);
    } finally {
      setLoading(false);
    }
  }

  async function addNote() {
    if (!id || !noteText.trim()) return;
    await authFetch(`/api/creative-briefs/${id}/admin-note`, {
      method: "POST",
      body: JSON.stringify({ text: noteText }),
    });
    setNoteText("");
    fetchBrief();
  }

  async function convertToProposal() {
    if (!id) return;
    setConverting(true);
    try {
      const res = await authFetch(`/api/creative-briefs/${id}/generate-quote`, { method: "POST" });
      const json = await res.json();
      if (json.ok) {
        setGeneratedQuote(json.data);
        fetchBrief();
      }
    } finally {
      setConverting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!brief) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center">
        <p className="text-slate-500">Brief not found.</p>
      </div>
    );
  }

  const ai = brief.aiEnrichment;
  const estimate = brief.estimate;
  const band = complexityBand(brief.complexityScore);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6">
      <div className="mx-auto max-w-4xl">
        <button onClick={() => navigate("/admin/briefs")} className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to briefs
        </button>

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-slate-900">{brief.contact?.company || "Unknown"}</h1>
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium uppercase", statusBadge(brief.status))}>
                {brief.status?.replace(/_/g, " ") || "draft"}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {brief.contact?.firstName} {brief.contact?.lastName} · {brief.contact?.email} · {brief.contact?.phone}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className={cn("text-sm font-bold", band.color)}>{band.label}</div>
            <div className="text-[10px] text-slate-400">Score {brief.complexityScore} · Readiness {brief.proposalReadiness}%</div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Enrichment */}
            {ai && (
              <div className="rounded-xl border border-purple-500/20 bg-purple-950/10 p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-purple-300">
                  <Sparkles className="h-4 w-4" />
                  AI Enrichment
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <InfoRow label="Project Type" value={ai.projectType?.replace(/_/g, " ") || "—"} />
                    <InfoRow label="Business Function" value={ai.businessFunction?.replace(/_/g, " ") || "—"} />
                  </div>
                  <InfoRow label="Business Objective" value={ai.businessObjective} />
                  <InfoRow label="Audience" value={ai.audience} />
                  <div>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Detected Needs</span>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {ai.detectedNeeds.map((n) => (
                        <span key={n} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{n}</span>
                      ))}
                    </div>
                  </div>
                  {ai.riskFlags.length > 0 && (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-950/10 p-3">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 mb-1">
                        <AlertTriangle className="h-3 w-3" />
                        Risk Flags
                      </div>
                      <ul className="space-y-0.5 text-xs text-slate-600">
                        {ai.riskFlags.map((r) => <li key={r}>• {r}</li>)}
                      </ul>
                    </div>
                  )}
                  {ai.missingFields.length > 0 && (
                    <div>
                      <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Missing Info</span>
                      <p className="text-xs text-slate-500">{ai.missingFields.join(", ")}</p>
                    </div>
                  )}
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Producer Note</span>
                    <p className="mt-1 text-xs text-slate-600 italic">{ai.internalProducerNote}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Phases */}
            {brief.phases.intent && (
              <PhaseCard icon={Film} title="Project Intent">
                <InfoRow label="Type" value={VIDEO_TYPES.find((v) => v.id === brief.phases.intent.videoType)?.label || brief.phases.intent.videoType} />
                <InfoRow label="Description" value={brief.phases.intent.description} />
                <InfoRow label="Problem" value={brief.phases.intent.businessProblem} />
                <InfoRow label="Outcome" value={brief.phases.intent.desiredOutcome} />
              </PhaseCard>
            )}
            {brief.phases.audience && (
              <PhaseCard icon={Users} title="Audience & Message">
                <InfoRow label="Primary" value={brief.phases.audience.primaryAudience} />
                <InfoRow label="Internal/External" value={brief.phases.audience.internalExternal} />
                <InfoRow label="Knowledge" value={brief.phases.audience.knowledgeLevel} />
                <InfoRow label="Core Message" value={brief.phases.audience.coreMessage} />
                <InfoRow label="Desired Response" value={brief.phases.audience.desiredResponse} />
              </PhaseCard>
            )}
            {brief.phases.deliverables && (
              <PhaseCard icon={Package} title="Deliverables">
                <InfoRow label="Videos" value={`${brief.phases.deliverables.numberOfVideos} x ${brief.phases.deliverables.mainVideoLength}`} />
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {[
                    brief.phases.deliverables.cutdowns && "Cutdowns",
                    brief.phases.deliverables.socialVersions && "Social",
                    brief.phases.deliverables.captions && "Captions",
                    brief.phases.deliverables.motionGraphics && "Motion Graphics",
                    brief.phases.deliverables.animation && "Animation",
                    brief.phases.deliverables.voiceover && "Voiceover",
                    brief.phases.deliverables.interviews && "Interviews",
                    brief.phases.deliverables.bRoll && "B-roll",
                    brief.phases.deliverables.photography && "Photography",
                  ].filter(Boolean).map((tag) => (
                    <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{tag}</span>
                  ))}
                </div>
              </PhaseCard>
            )}
            {brief.phases.production && (
              <PhaseCard icon={Camera} title="Production">
                <InfoRow label="Locations" value={brief.phases.production.locations} />
                <InfoRow label="Filming Days" value={String(brief.phases.production.filmingDays)} />
                <InfoRow label="Subjects" value={String(brief.phases.production.interviewSubjects)} />
                <InfoRow label="Deadline" value={brief.phases.production.deadline} />
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {[
                    brief.phases.production.travelRequired && "Travel",
                    brief.phases.production.facilityAccess && "Facility Access",
                    brief.phases.production.safetyRequirements && "Safety",
                  ].filter(Boolean).map((tag) => (
                    <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{tag}</span>
                  ))}
                </div>
              </PhaseCard>
            )}
            {brief.phases.creative && (
              <PhaseCard icon={Palette} title="Creative Direction">
                <InfoRow label="Tone" value={brief.phases.creative.tone} />
                <InfoRow label="Visual Style" value={brief.phases.creative.visualStyle} />
                <InfoRow label="References" value={brief.phases.creative.referenceVideos} />
                <InfoRow label="Words to Avoid" value={brief.phases.creative.wordsToAvoid} />
              </PhaseCard>
            )}
            {brief.phases.budget && (
              <PhaseCard icon={DollarSign} title="Budget & Approvals">
                <InfoRow label="Budget" value={BUDGET_OPTIONS.find((b) => b.value === brief.phases.budget.budgetRange)?.label || brief.phases.budget.budgetRange} />
                <InfoRow label="Decision Maker" value={brief.phases.budget.decisionMaker} />
                <InfoRow label="Approval Process" value={brief.phases.budget.approvalProcess} />
              </PhaseCard>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Estimate */}
            {estimate && (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-400">Estimate</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Essential</span>
                    <span className="text-slate-800">{formatCents(estimate.minimalCents)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Recommended</span>
                    <span className="text-emerald-700 font-medium">{formatCents(estimate.recommendedCents)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Premium</span>
                    <span className="text-slate-800">{formatCents(estimate.premiumCents)}</span>
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-slate-400">{estimate.explanation}</p>
              </div>
            )}

            {/* Actions */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">Actions</h3>
              {!brief.relatedQuoteId && (
                <button
                  onClick={convertToProposal}
                  disabled={converting}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                >
                  {converting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                  {converting ? "Creating..." : "Convert to Proposal"}
                </button>
              )}
              {brief.relatedQuoteId && (
                <button
                  onClick={() => navigate(`/quotes?id=${brief.relatedQuoteId}`)}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-emerald-500/30 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  View Proposal
                </button>
              )}
            </div>

            {/* Admin Notes */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-400">Admin Notes</h3>
              <div className="space-y-2 mb-3">
                {brief.adminNotes.map((note) => (
                  <div key={note.id} className="rounded-lg bg-slate-100 p-2.5">
                    <p className="text-xs text-slate-600">{note.text}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{note.author} · {new Date(note.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
                {brief.adminNotes.length === 0 && <p className="text-xs text-slate-400 italic">No notes yet.</p>}
              </div>
              <div className="flex gap-2">
                <input
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add a note..."
                  className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:outline-none"
                  onKeyDown={(e) => e.key === "Enter" && addNote()}
                />
                <button onClick={addNote} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-zinc-700 transition-colors">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PhaseCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Icon className="h-4 w-4 text-slate-400" />
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-3">
      <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 w-28 shrink-0">{label}</span>
      <span className="text-xs text-slate-600">{value}</span>
    </div>
  );
}
