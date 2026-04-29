import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Film,
  MessageSquare,
  Users,
  Package,
  Camera,
  Palette,
  DollarSign,
  Send,
  Sparkles,
  Clock,
  MapPin,
  Calendar,
  Briefcase,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const VIDEO_TYPES = [
  { id: "brand_film", label: "Brand Film", icon: Film },
  { id: "executive_message", label: "Executive Message", icon: MessageSquare },
  { id: "technical_explainer", label: "Technical Explainer", icon: Sparkles },
  { id: "training_video", label: "Training Video", icon: Users },
  { id: "product_service_promo", label: "Product / Service Promo", icon: Package },
  { id: "event_video", label: "Event Video", icon: Calendar },
  { id: "social_content_package", label: "Social Content Package", icon: Briefcase },
  { id: "motion_graphics_animation", label: "Motion Graphics / Animation", icon: Palette },
  { id: "unknown", label: "Not Sure Yet", icon: ChevronRight },
];

export const BUDGET_OPTIONS = [
  { value: "recommend", label: "Recommend the best-fit scope" },
  { value: "under_5k", label: "Under $5,000" },
  { value: "5k_10k", label: "$5,000 – $10,000" },
  { value: "10k_25k", label: "$10,000 – $25,000" },
  { value: "25k_50k", label: "$25,000 – $50,000" },
  { value: "50k_plus", label: "$50,000+" },
  { value: "not_sure", label: "Not sure yet" },
];

const TONE_OPTIONS = ["Cinematic", "Executive", "Technical", "Emotional", "Instructional", "Campaign-driven", "Conversational"];
const STYLE_OPTIONS = ["Polished corporate", "Documentary", "Minimalist", "High-energy", "Intimate interview", "Visual metaphor", " archival/historical"];

interface FormState {
  videoType: string;
  description: string;
  firstName: string;
  lastName: string;
  company: string;
  role: string;
  email: string;
  phone: string;
  businessProblem: string;
  whyNow: string;
  desiredOutcome: string;
  primaryAudience: string;
  internalExternal: string;
  knowledgeLevel: string;
  coreMessage: string;
  desiredResponse: string;
  mainVideoLength: string;
  numberOfVideos: number;
  cutdowns: boolean;
  socialVersions: boolean;
  captions: boolean;
  motionGraphics: boolean;
  animation: boolean;
  voiceover: boolean;
  interviews: boolean;
  bRoll: boolean;
  photography: boolean;
  locations: string;
  filmingDays: number;
  interviewSubjects: number;
  travelRequired: boolean;
  facilityAccess: boolean;
  safetyRequirements: boolean;
  deadline: string;
  tone: string;
  visualStyle: string;
  referenceVideos: string;
  brandGuidelines: string;
  wordsToAvoid: string;
  budgetRange: string;
  decisionMaker: string;
  approvalProcess: string;
  timelineToApprove: string;
}

const DEFAULT_FORM: FormState = {
  videoType: "", description: "",
  firstName: "", lastName: "", company: "", role: "", email: "", phone: "",
  businessProblem: "", whyNow: "", desiredOutcome: "",
  primaryAudience: "", internalExternal: "", knowledgeLevel: "", coreMessage: "", desiredResponse: "",
  mainVideoLength: "", numberOfVideos: 1, cutdowns: false, socialVersions: false, captions: false, motionGraphics: false, animation: false, voiceover: false, interviews: false, bRoll: false, photography: false,
  locations: "", filmingDays: 1, interviewSubjects: 0, travelRequired: false, facilityAccess: false, safetyRequirements: false, deadline: "",
  tone: "", visualStyle: "", referenceVideos: "", brandGuidelines: "", wordsToAvoid: "",
  budgetRange: "", decisionMaker: "", approvalProcess: "", timelineToApprove: "",
};

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

export function CreativeBriefIntake() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [briefData, setBriefData] = useState<any>(null);
  const [direction, setDirection] = useState(1);

  const totalSteps = 9;

  // Create session on mount
  useEffect(() => {
    fetch("/api/creative-briefs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source: "website" }) })
      .then((r) => r.json())
      .then((json) => { if (json.ok) setSessionId(json.data.id); });
  }, []);

  async function savePhase(phaseKey: string, phaseData: object) {
    if (!sessionId) return;
    setSaving(true);
    try {
      await fetch(`/api/creative-briefs/${sessionId}/phase/${phaseKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(phaseData),
      });
    } finally {
      setSaving(false);
    }
  }

  async function saveContact() {
    if (!sessionId) return;
    setSaving(true);
    try {
      await fetch(`/api/creative-briefs/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact: {
            firstName: form.firstName,
            lastName: form.lastName,
            company: form.company,
            role: form.role,
            email: form.email,
            phone: form.phone,
          },
        }),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (!sessionId) return;
    setSaving(true);
    try {
      await fetch(`/api/creative-briefs/${sessionId}/submit`, { method: "POST" });
      // Trigger AI enrichment
      await fetch(`/api/creative-briefs/${sessionId}/enrich`, { method: "POST" });
      const res = await fetch(`/api/creative-briefs/${sessionId}`);
      const json = await res.json();
      if (json.ok) {
        setBriefData(json.data);
        setSubmitted(true);
      }
    } finally {
      setSaving(false);
    }
  }

  function nextStep() {
    setDirection(1);
    const next = step + 1;
    if (step === 0) savePhase("intent", { videoType: form.videoType, description: form.description, businessProblem: form.businessProblem, whyNow: form.whyNow, desiredOutcome: form.desiredOutcome });
    if (step === 1) saveContact();
    if (step === 2) savePhase("audience", { primaryAudience: form.primaryAudience, internalExternal: form.internalExternal, knowledgeLevel: form.knowledgeLevel, coreMessage: form.coreMessage, desiredResponse: form.desiredResponse });
    if (step === 3) savePhase("deliverables", { mainVideoLength: form.mainVideoLength, numberOfVideos: form.numberOfVideos, cutdowns: form.cutdowns, socialVersions: form.socialVersions, captions: form.captions, motionGraphics: form.motionGraphics, animation: form.animation, voiceover: form.voiceover, interviews: form.interviews, bRoll: form.bRoll, photography: form.photography });
    if (step === 4) savePhase("production", { locations: form.locations, filmingDays: form.filmingDays, interviewSubjects: form.interviewSubjects, travelRequired: form.travelRequired, facilityAccess: form.facilityAccess, safetyRequirements: form.safetyRequirements, deadline: form.deadline });
    if (step === 5) savePhase("creative", { tone: form.tone, visualStyle: form.visualStyle, referenceVideos: form.referenceVideos, brandGuidelines: form.brandGuidelines, wordsToAvoid: form.wordsToAvoid });
    if (step === 6) savePhase("budget", { budgetRange: form.budgetRange, decisionMaker: form.decisionMaker, approvalProcess: form.approvalProcess, timelineToApprove: form.timelineToApprove });
    setStep(next);
  }

  function prevStep() {
    setDirection(-1);
    setStep((s) => Math.max(0, s - 1));
  }

  const progress = ((step + 1) / totalSteps) * 100;

  const canProceed = useMemo(() => {
    if (step === 0) return form.videoType && form.description.trim().length > 10;
    if (step === 1) return form.firstName && form.company && form.email.includes("@");
    if (step === 2) return form.businessProblem.trim().length > 5 && form.desiredOutcome.trim().length > 5;
    if (step === 3) return form.primaryAudience.trim().length > 3 && form.coreMessage.trim().length > 5;
    if (step === 4) return form.mainVideoLength && form.numberOfVideos > 0;
    if (step === 5) return form.locations.trim().length > 2 && form.deadline;
    if (step === 6) return form.tone && form.visualStyle;
    if (step === 7) return form.budgetRange;
    return true;
  }, [step, form]);

  if (submitted && briefData) {
    return <SubmittedView brief={briefData} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Top bar */}
      <div className="border-b border-white/5 bg-black/20 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Film className="h-5 w-5 text-emerald-400" />
          <span className="text-sm font-semibold tracking-wide text-white">Content Co-op</span>
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider hidden sm:inline">Creative Brief</span>
        </div>
        <div className="flex items-center gap-3">
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />}
          <span className="text-[10px] font-mono text-zinc-500">{step + 1} / {totalSteps}</span>
        </div>
      </div>

      {/* Progress */}
      <div className="h-0.5 bg-zinc-900">
        <motion.div className="h-full bg-emerald-500" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-xl">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              initial={{ opacity: 0, x: direction > 0 ? 40 : -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -40 : 40 }}
              transition={{ duration: 0.3 }}
            >
              {step === 0 && <StepIntent form={form} setForm={setForm} />}
              {step === 1 && <StepContact form={form} setForm={setForm} />}
              {step === 2 && <StepBusiness form={form} setForm={setForm} />}
              {step === 3 && <StepAudience form={form} setForm={setForm} />}
              {step === 4 && <StepDeliverables form={form} setForm={setForm} />}
              {step === 5 && <StepProduction form={form} setForm={setForm} />}
              {step === 6 && <StepCreative form={form} setForm={setForm} />}
              {step === 7 && <StepBudget form={form} setForm={setForm} />}
              {step === 8 && <StepReview form={form} onSubmit={handleSubmit} saving={saving} />}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={prevStep}
              disabled={step === 0}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            {step < 8 ? (
              <button
                onClick={nextStep}
                disabled={!canProceed || saving}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40 transition-colors"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Steps ───

function StepIntent({ form, setForm }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">What kind of video are you thinking about?</h2>
        <p className="mt-1 text-sm text-zinc-400">We&apos;ll help shape it into a clear production brief.</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {VIDEO_TYPES.map((vt) => (
          <button
            key={vt.id}
            onClick={() => setForm((f) => ({ ...f, videoType: vt.id }))}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center transition-all",
              form.videoType === vt.id
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
            )}
          >
            <vt.icon className="h-5 w-5" />
            <span className="text-xs font-medium">{vt.label}</span>
          </button>
        ))}
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-300">Describe your project in a sentence or two</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          rows={3}
          placeholder="We need a video that..."
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">What prompted this project?</label>
          <input
            value={form.whyNow}
            onChange={(e) => setForm((f) => ({ ...f, whyNow: e.target.value }))}
            placeholder="New product launch, leadership change, etc."
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">What problem should this solve?</label>
          <input
            value={form.businessProblem}
            onChange={(e) => setForm((f) => ({ ...f, businessProblem: e.target.value }))}
            placeholder="Customers don't understand our new service..."
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}

function StepContact({ form, setForm }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-white">Who should we send the brief to?</h2>
        <p className="mt-1 text-sm text-zinc-400">We&apos;ll send a summary once your project is shaped.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">First name *</label>
          <input
            value={form.firstName}
            onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">Last name</label>
          <input
            value={form.lastName}
            onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">Company *</label>
          <input
            value={form.company}
            onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">Role / Title</label>
          <input
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">Email *</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">Phone</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}

function StepBusiness({ form, setForm }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-white">What would make this a win?</h2>
        <p className="mt-1 text-sm text-zinc-400">Start with the business goal. What needs to change after this video exists?</p>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">Business problem</label>
        <textarea
          value={form.businessProblem}
          onChange={(e) => setForm((f) => ({ ...f, businessProblem: e.target.value }))}
          rows={3}
          placeholder="We need stakeholders to approve the new initiative..."
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">Desired outcome</label>
        <textarea
          value={form.desiredOutcome}
          onChange={(e) => setForm((f) => ({ ...f, desiredOutcome: e.target.value }))}
          rows={3}
          placeholder="After watching, the audience should understand X and feel Y..."
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
        />
      </div>
    </div>
  );
}

function StepAudience({ form, setForm }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-white">Who needs to see this?</h2>
        <p className="mt-1 text-sm text-zinc-400">Who needs to understand, believe, or act on this message?</p>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">Primary audience</label>
        <input
          value={form.primaryAudience}
          onChange={(e) => setForm((f) => ({ ...f, primaryAudience: e.target.value }))}
          placeholder="Senior executives, field technicians, new hires..."
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">Internal or external?</label>
          <select
            value={form.internalExternal}
            onChange={(e) => setForm((f) => ({ ...f, internalExternal: e.target.value }))}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">Select...</option>
            <option value="internal">Internal only</option>
            <option value="external">External / public</option>
            <option value="both">Both</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">Audience knowledge level</label>
          <select
            value={form.knowledgeLevel}
            onChange={(e) => setForm((f) => ({ ...f, knowledgeLevel: e.target.value }))}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">Select...</option>
            <option value="expert">Expert — they know the subject</option>
            <option value="familiar">Familiar — some background</option>
            <option value="novice">Novice — needs explanation</option>
            <option value="mixed">Mixed audience</option>
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">Core message</label>
        <input
          value={form.coreMessage}
          onChange={(e) => setForm((f) => ({ ...f, coreMessage: e.target.value }))}
          placeholder="The single most important thing they should remember..."
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">Desired response</label>
        <input
          value={form.desiredResponse}
          onChange={(e) => setForm((f) => ({ ...f, desiredResponse: e.target.value }))}
          placeholder="Feel informed, take action, approve budget, share internally..."
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
        />
      </div>
    </div>
  );
}

function StepDeliverables({ form, setForm }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> }) {
  const toggles = [
    { key: "cutdowns" as const, label: "Platform cutdowns" },
    { key: "socialVersions" as const, label: "Social versions" },
    { key: "captions" as const, label: "Captions / subtitles" },
    { key: "motionGraphics" as const, label: "Motion graphics" },
    { key: "animation" as const, label: "Animation" },
    { key: "voiceover" as const, label: "Professional voiceover" },
    { key: "interviews" as const, label: "On-camera interviews" },
    { key: "bRoll" as const, label: "B-roll footage" },
    { key: "photography" as const, label: "Photography" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-white">What do you need produced?</h2>
        <p className="mt-1 text-sm text-zinc-400">One strong video, or a package of related assets?</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">Number of videos</label>
          <input
            type="number"
            min={1}
            value={form.numberOfVideos}
            onChange={(e) => setForm((f) => ({ ...f, numberOfVideos: Math.max(1, parseInt(e.target.value) || 1) }))}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">Main video length</label>
          <select
            value={form.mainVideoLength}
            onChange={(e) => setForm((f) => ({ ...f, mainVideoLength: e.target.value }))}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">Select...</option>
            <option value="30s">~30 seconds</option>
            <option value="60s">~1 minute</option>
            <option value="2min">~2 minutes</option>
            <option value="3_5min">3–5 minutes</option>
            <option value="5_10min">5–10 minutes</option>
            <option value="10min_plus">10+ minutes</option>
            <option value="variable">Variable / not sure</option>
          </select>
        </div>
      </div>
      <div>
        <label className="mb-2 block text-xs font-medium text-zinc-400">Deliverables</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {toggles.map((t) => (
            <button
              key={t.key}
              onClick={() => setForm((f) => ({ ...f, [t.key]: !f[t.key] } as FormState))}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-xs transition-all",
                form[t.key]
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700"
              )}
            >
              <div className={cn("h-3.5 w-3.5 rounded-sm border", form[t.key] ? "border-emerald-500 bg-emerald-500" : "border-zinc-600")}>
                {form[t.key] && <CheckCircle2 className="h-3.5 w-3.5 text-black" />}
              </div>
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepProduction({ form, setForm }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-white">Production reality</h2>
        <p className="mt-1 text-sm text-zinc-400">Where, when, and what resources are involved?</p>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">Filming location(s)</label>
        <input
          value={form.locations}
          onChange={(e) => setForm((f) => ({ ...f, locations: e.target.value }))}
          placeholder="Houston office, client site, studio..."
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">Filming days</label>
          <input
            type="number"
            min={0}
            value={form.filmingDays}
            onChange={(e) => setForm((f) => ({ ...f, filmingDays: Math.max(0, parseInt(e.target.value) || 0) }))}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">Interview subjects</label>
          <input
            type="number"
            min={0}
            value={form.interviewSubjects}
            onChange={(e) => setForm((f) => ({ ...f, interviewSubjects: Math.max(0, parseInt(e.target.value) || 0) }))}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">Deadline</label>
          <input
            type="date"
            value={form.deadline}
            onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { key: "travelRequired" as const, label: "Travel required", icon: MapPin },
          { key: "facilityAccess" as const, label: "Facility access needed", icon: Camera },
          { key: "safetyRequirements" as const, label: "Safety requirements", icon: CheckCircle2 },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setForm((f) => ({ ...f, [item.key]: !f[item.key] } as FormState))}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-xs transition-all",
              form[item.key]
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700"
            )}
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepCreative({ form, setForm }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-white">Creative direction</h2>
        <p className="mt-1 text-sm text-zinc-400">What should this feel like?</p>
      </div>
      <div>
        <label className="mb-2 block text-xs font-medium text-zinc-400">Tone</label>
        <div className="flex flex-wrap gap-2">
          {TONE_OPTIONS.map((t) => (
            <button
              key={t}
              onClick={() => setForm((f) => ({ ...f, tone: t }))}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition-all",
                form.tone === t
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-2 block text-xs font-medium text-zinc-400">Visual style</label>
        <div className="flex flex-wrap gap-2">
          {STYLE_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setForm((f) => ({ ...f, visualStyle: s }))}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition-all",
                form.visualStyle === s
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">Reference videos (URLs or descriptions)</label>
        <textarea
          value={form.referenceVideos}
          onChange={(e) => setForm((f) => ({ ...f, referenceVideos: e.target.value }))}
          rows={2}
          placeholder="Links or descriptions of videos that feel close to what you want..."
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">Words or topics to avoid</label>
        <input
          value={form.wordsToAvoid}
          onChange={(e) => setForm((f) => ({ ...f, wordsToAvoid: e.target.value }))}
          placeholder="Jargon, competitor names, sensitive terms..."
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
        />
      </div>
    </div>
  );
}

function StepBudget({ form, setForm }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-white">Budget & approvals</h2>
        <p className="mt-1 text-sm text-zinc-400">Help us understand the buying reality.</p>
      </div>
      <div>
        <label className="mb-2 block text-xs font-medium text-zinc-400">Do you have a budget range in mind?</label>
        <div className="grid gap-2 sm:grid-cols-2">
          {BUDGET_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setForm((f) => ({ ...f, budgetRange: opt.value }))}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-left text-xs transition-all",
                form.budgetRange === opt.value
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">Who is the decision maker?</label>
        <input
          value={form.decisionMaker}
          onChange={(e) => setForm((f) => ({ ...f, decisionMaker: e.target.value }))}
          placeholder="CEO, VP of Marketing, committee..."
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">Approval process</label>
        <textarea
          value={form.approvalProcess}
          onChange={(e) => setForm((f) => ({ ...f, approvalProcess: e.target.value }))}
          rows={2}
          placeholder="Single approver, legal review, brand committee..."
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
        />
      </div>
    </div>
  );
}

function StepReview({ form, onSubmit, saving }: { form: FormState; onSubmit: () => void; saving: boolean }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">Review your brief</h2>
        <p className="mt-1 text-sm text-zinc-400">Submit this for internal review and we&apos;ll shape a proposal.</p>
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
        <ReviewRow label="Project" value={`${VIDEO_TYPES.find((v) => v.id === form.videoType)?.label ?? form.videoType} — ${form.description.slice(0, 80)}${form.description.length > 80 ? "..." : ""}`} />
        <ReviewRow label="Contact" value={`${form.firstName} ${form.lastName} — ${form.company} — ${form.email}`} />
        <ReviewRow label="Audience" value={`${form.primaryAudience} (${form.internalExternal})`} />
        <ReviewRow label="Deliverables" value={`${form.numberOfVideos} video(s), ${form.mainVideoLength}`} />
        <ReviewRow label="Production" value={`${form.filmingDays} day(s), ${form.locations}`} />
        <ReviewRow label="Creative" value={`${form.tone} / ${form.visualStyle}`} />
        <ReviewRow label="Budget" value={BUDGET_OPTIONS.find((b) => b.value === form.budgetRange)?.label ?? form.budgetRange} />
      </div>
      <button
        onClick={onSubmit}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {saving ? "Processing..." : "Submit Brief for Review"}
      </button>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3">
      <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 w-24 shrink-0">{label}</span>
      <span className="text-sm text-zinc-200">{value || "—"}</span>
    </div>
  );
}

function SubmittedView({ brief }: { brief: any }) {
  const estimate = brief.estimate;
  const ai = brief.aiEnrichment;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg"
      >
        <div className="text-center mb-8">
          <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-semibold text-white">Brief submitted</h1>
          <p className="mt-2 text-sm text-zinc-400">
            We&apos;ve shaped your project into a working production brief. Our team will review and follow up within one business day.
          </p>
        </div>

        {estimate && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 mb-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-3">Estimated Investment</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Essential</span>
                <span className="text-zinc-200">{formatCents(estimate.minimalCents)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Recommended</span>
                <span className="text-emerald-400 font-medium">{formatCents(estimate.recommendedCents)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Premium</span>
                <span className="text-zinc-200">{formatCents(estimate.premiumCents)}</span>
              </div>
            </div>
            <p className="mt-3 text-[10px] text-zinc-500">{estimate.explanation} Confidence: {estimate.confidence}.</p>
          </div>
        )}

        {ai && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
            <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-2">What happens next</h3>
            <ul className="space-y-1.5 text-sm text-zinc-300">
              <li className="flex items-start gap-2">
                <Clock className="h-3.5 w-3.5 text-zinc-500 mt-0.5 shrink-0" />
                Internal review of your brief
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="h-3.5 w-3.5 text-zinc-500 mt-0.5 shrink-0" />
                Proposal scoped to your needs
              </li>
              <li className="flex items-start gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-zinc-500 mt-0.5 shrink-0" />
                Strategy call to align on scope
              </li>
            </ul>
          </div>
        )}
      </motion.div>
    </div>
  );
}
