import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Tag,
  BarChart3,
  ChevronRight,
  Plus,
  FileText,
  PlaySquare,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/auth-fetch";

interface BriefSession {
  id: string;
  status: string;
  contact: {
    firstName: string;
    lastName?: string;
    company: string;
    role?: string;
    email: string;
    phone?: string;
  } | null;
  phases: Record<string, any>;
  intake?: Record<string, any>;
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
    creativeHookIdea?: string;
  } | null;
  estimate: {
    minimalCents: number;
    recommendedCents: number;
    premiumCents: number;
    confidence: string;
    explanation: string;
  } | null;
  zip2Estimate?: {
    lean?: { name: string; range: string; includes: string[]; bestFor: string; timeline: string };
    recommended?: { name: string; range: string; includes: string[]; bestFor: string; timeline: string };
    premium?: { name: string; range: string; includes: string[]; bestFor: string; timeline: string };
  };
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
    draft_started: "bg-slate-200 text-slate-600",
    contact_captured: "bg-blue-100 text-blue-700",
    discovery_in_progress: "bg-amber-100 text-amber-700",
    brief_submitted: "bg-emerald-100 text-emerald-700",
    ai_enriched: "bg-purple-100 text-purple-700",
    internal_review_required: "bg-orange-100 text-orange-700",
    proposal_draft_ready: "bg-cyan-100 text-cyan-700",
    proposal_sent: "bg-indigo-100 text-indigo-700",
    client_approved: "bg-green-100 text-green-700",
    checkout_pending: "bg-pink-100 text-pink-700",
    deposit_paid: "bg-teal-100 text-teal-700",
    project_opened: "bg-sky-100 text-sky-700",
    closed_lost: "bg-red-100 text-red-700",
  };
  return map[status] || "bg-slate-200 text-slate-600";
}

function complexityBand(score: number): { label: string; color: string } {
  if (score <= 25) return { label: "Simple", color: "text-emerald-600" };
  if (score <= 50) return { label: "Standard", color: "text-blue-600" };
  if (score <= 75) return { label: "Advanced", color: "text-amber-600" };
  return { label: "Enterprise", color: "text-red-600" };
}

// ─── List View ───

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
    return briefs.filter(
      (b) =>
        b.contact?.company.toLowerCase().includes(q) ||
        b.contact?.firstName.toLowerCase().includes(q) ||
        b.status.toLowerCase().includes(q) ||
        b.aiEnrichment?.projectType.toLowerCase().includes(q)
    );
  }, [briefs, filter]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-accent-glow" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display tracking-tight text-slate-900">Creative Brief Submissions</h1>
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
        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-accent-glow focus:outline-none"
      />

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-medium text-slate-500 text-xs uppercase tracking-wider">Client / Company</th>
              <th className="px-6 py-4 font-medium text-slate-500 text-xs uppercase tracking-wider">Type</th>
              <th className="px-6 py-4 font-medium text-slate-500 text-xs uppercase tracking-wider">Est. Range</th>
              <th className="px-6 py-4 font-medium text-slate-500 text-xs uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 font-medium text-slate-500 text-xs uppercase tracking-wider">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((brief) => (
              <tr
                key={brief.id}
                onClick={() => navigate(`/admin/briefs/${brief.id}`)}
                className="hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-900">
                    {brief.contact?.company || "Unknown Company"}
                  </div>
                  <div className="text-xs text-slate-400">
                    {brief.contact?.firstName} {brief.contact?.lastName} · {brief.contact?.email}
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {brief.intake?.projectType || brief.aiEnrichment?.projectType || brief.phases?.intent?.videoType || "Pending"}
                </td>
                <td className="px-6 py-4 font-mono text-slate-900">
                  {brief.zip2Estimate?.recommended?.range ||
                    (brief.estimate ? formatCents(brief.estimate.recommendedCents) : "–")}
                </td>
                <td className="px-6 py-4">
                  <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", statusBadge(brief.status))}>
                    {brief.status?.replace(/_/g, " ") || "draft"}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-400 text-xs">
                  {new Date(brief.updatedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                  No creative briefs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Detail View ───

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
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-accent-glow" />
      </div>
    );
  }

  if (!brief) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-slate-500">Brief not found.</p>
      </div>
    );
  }

  const ai = brief.aiEnrichment;
  const estimate = brief.estimate;
  const band = complexityBand(brief.complexityScore);
  const intake = brief.intake;

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/admin/briefs")}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to briefs
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display tracking-tight text-slate-900">
              {brief.contact?.company || "Unknown Company"} Project
            </h1>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", statusBadge(brief.status))}>
              {brief.status?.replace(/_/g, " ") || "draft"}
            </span>
          </div>
          <div className="flex gap-4 text-slate-500 text-sm mt-1">
            <span>
              By: {brief.contact?.firstName} {brief.contact?.lastName}
            </span>
            <span>Email: {brief.contact?.email}</span>
          </div>
        </div>
        <div className="flex gap-3 shrink-0">
          {brief.relatedQuoteId ? (
            <button
              onClick={() => navigate(`/admin/quotes`)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 transition-colors"
            >
              <FileText className="h-4 w-4" />
              View Quote
            </button>
          ) : (
            <button
              onClick={convertToProposal}
              disabled={converting || brief.status !== "brief_submitted"}
              className="flex items-center gap-2 rounded-lg bg-brand-accent-glow px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              {converting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Generate Quote
            </button>
          )}
        </div>
      </div>

      {generatedQuote && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Quote created.{" "}
          <button onClick={() => navigate(`/admin/quotes`)} className="underline font-medium">
            View in Quotes
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Enrichment */}
          {ai && (
            <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-6">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-purple-700">
                <Sparkles className="h-4 w-4" />
                AI Enrichment
              </h3>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Project Type</div>
                    <div className="font-medium text-slate-900">{ai.projectType}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Business Function</div>
                    <div className="font-medium text-slate-900">{ai.businessFunction}</div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Business Objective</div>
                  <div className="text-slate-700">{ai.businessObjective}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Audience</div>
                  <div className="text-slate-700">{ai.audience}</div>
                </div>
                {ai.creativeHookIdea && (
                  <div className="bg-gradient-to-r from-blue-50 to-white border border-blue-200 p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-blue-700 mb-2 flex items-center">
                      <PlaySquare className="w-4 h-4 mr-2" />
                      The &quot;Wow Factor&quot; Concept
                    </h4>
                    <p className="text-blue-900 text-sm leading-relaxed">{ai.creativeHookIdea}</p>
                  </div>
                )}
                {ai.detectedNeeds.length > 0 && (
                  <div>
                    <div className="text-xs text-slate-500 mb-2">Detected Needs</div>
                    <div className="flex flex-wrap gap-2">
                      {ai.detectedNeeds.map((need) => (
                        <span key={need} className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-xs text-slate-700">
                          {need}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Zip2 Intake Data */}
          {intake && Object.keys(intake).length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-medium mb-4 text-slate-900">Client Raw Intake</h3>
              <div className="space-y-3">
                {Object.entries(intake).map(([key, value]) => {
                  if (!value || (Array.isArray(value) && value.length === 0)) return null;
                  const displayVal = Array.isArray(value) ? value.join(", ") : String(value);
                  return (
                    <div key={key} className="flex gap-4">
                      <div className="w-40 shrink-0 text-xs font-mono text-slate-400 uppercase">{key}</div>
                      <div className="text-sm text-slate-700">{displayVal}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Legacy Phases (fallback) */}
          {!intake && brief.phases && Object.keys(brief.phases).length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-medium mb-4 text-slate-900">Legacy Phase Data</h3>
              <div className="space-y-4">
                {Object.entries(brief.phases).map(([phaseKey, phaseData]) => (
                  <div key={phaseKey}>
                    <div className="text-xs font-mono text-slate-400 uppercase mb-2">{phaseKey}</div>
                    <div className="space-y-1">
                      {Object.entries(phaseData as object).map(([k, v]) => (
                        <div key={k} className="flex gap-4 text-sm">
                          <span className="w-32 shrink-0 text-slate-500">{k}</span>
                          <span className="text-slate-700">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin Notes */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-medium mb-4 text-slate-900 flex items-center gap-2">
              <Tag className="h-4 w-4 text-slate-400" />
              Admin Notes
            </h3>
            <div className="space-y-3 mb-4">
              {brief.adminNotes.length === 0 && (
                <p className="text-sm text-slate-400 italic">No notes yet.</p>
              )}
              {brief.adminNotes.map((note) => (
                <div key={note.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                  <p className="text-slate-700">{note.text}</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {note.author} · {new Date(note.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addNote()}
                placeholder="Add a note..."
                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-accent-glow focus:outline-none"
              />
              <button
                onClick={addNote}
                className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Producer Notes */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2 text-slate-900">
              <span className="w-2 h-2 rounded-full bg-brand-accent-glow"></span>
              Producer Notes
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              {ai?.internalProducerNote || "No notes generated."}
            </p>
          </div>

          {/* Risk Flags */}
          {ai?.riskFlags && ai.riskFlags.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6">
              <h2 className="text-lg font-medium text-red-700 mb-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Risk Flags
              </h2>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-2">
                {ai.riskFlags.map((risk, idx) => (
                  <li key={idx}>{risk}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Scoring & Estimate */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-medium text-slate-900">Scoring & Estimate</h2>
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <span className="text-slate-500 text-sm">Complexity Band</span>
              <span className={cn("font-mono text-sm uppercase font-semibold", band.color)}>{band.label}</span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <span className="text-slate-500 text-sm">Proposal Readiness</span>
              <span className="font-mono text-sm">{brief.proposalReadiness}%</span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <span className="text-slate-500 text-sm">Budget Confidence</span>
              <span className="capitalize text-slate-900">{ai?.budgetConfidence || "–"}</span>
            </div>

            {/* Zip2 Estimate */}
            {brief.zip2Estimate && (
              <div>
                <h3 className="text-slate-500 text-sm mb-3">Generated Estimate Options</h3>
                <div className="space-y-2">
                  {brief.zip2Estimate.lean && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Lean</span>
                      <span className="font-mono text-slate-900">{brief.zip2Estimate.lean.range}</span>
                    </div>
                  )}
                  {brief.zip2Estimate.recommended && (
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-slate-900">Recommended</span>
                      <span className="font-mono text-brand-accent-glow">{brief.zip2Estimate.recommended.range}</span>
                    </div>
                  )}
                  {brief.zip2Estimate.premium && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Premium</span>
                      <span className="font-mono text-slate-900">{brief.zip2Estimate.premium.range}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Legacy Estimate */}
            {!brief.zip2Estimate && estimate && (
              <div>
                <h3 className="text-slate-500 text-sm mb-3">Estimate</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Minimal</span>
                    <span className="font-mono text-slate-900">{formatCents(estimate.minimalCents)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-slate-900">Recommended</span>
                    <span className="font-mono text-brand-accent-glow">{formatCents(estimate.recommendedCents)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Premium</span>
                    <span className="font-mono text-slate-900">{formatCents(estimate.premiumCents)}</span>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-400">Confidence: {estimate.confidence}</p>
              </div>
            )}
          </div>

          {/* Missing Info */}
          {ai?.missingFields && ai.missingFields.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-medium mb-4 text-slate-900">Missing Info</h2>
              <ul className="list-disc list-inside text-sm text-slate-500 space-y-1">
                {ai.missingFields.map((field, idx) => (
                  <li key={idx}>{field}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Proposal Options */}
          {brief.proposalOptions.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-medium mb-4 text-slate-900">Proposal Options</h2>
              <div className="space-y-3">
                {brief.proposalOptions.map((opt) => (
                  <div key={opt.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-slate-900">{opt.label}</span>
                      <span className="font-mono text-sm text-brand-accent-glow">{formatCents(opt.totalCents)}</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">{opt.description}</p>
                    <div className="text-xs text-slate-400">{opt.timelineDays} days · {opt.deliverables.length} deliverables</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
