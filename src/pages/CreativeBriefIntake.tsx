import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { authFetch } from "@/lib/auth-fetch";
import { cn } from "@/lib/utils";
import { generateDeterministicEstimate } from "@/lib/brief-pricing";
import type { IntakeData } from "@/server/creative-brief-store";
import {
  PROJECT_TYPES,
  BUSINESS_GOALS,
  AUDIENCE_TYPES,
  AUDIENCE_KNOWLEDGE,
  DESIRED_RESPONSES,
  DELIVERABLES,
  VIDEO_LENGTHS,
  USAGE_CHANNELS,
  PRODUCTION_NEEDS,
  LOCATIONS,
  SHOOT_DAYS,
  ON_CAMERA_PEOPLE,
  CREATIVE_STYLES,
  MOTION_GRAPHICS,
  TIMELINES,
  BUDGET_COMFORTS,
} from "@/lib/brief-constants";
import {
  Check,
  ChevronRight,
  Loader2,
  ArrowLeft,
  Film,
  Sparkles,
  HardHat,
  PlaySquare,
  X,
} from "lucide-react";

interface ContactInfo {
  firstName: string;
  lastName: string;
  company: string;
  role: string;
  email: string;
  phone: string;
}

function mapIntakeToPhases(intake: IntakeData, contact: ContactInfo) {
  return {
    intent: {
      videoType: intake.projectType || "",
      description: intake.projectContext || "",
      businessProblem: (intake.businessGoals || []).join(", "),
      whyNow: intake.businessGoalContext || "",
      desiredOutcome: "",
    },
    audience: {
      primaryAudience: (intake.audienceTypes || []).join(", "),
      internalExternal: "",
      knowledgeLevel: intake.audienceKnowledgeLevel || "",
      coreMessage: intake.coreMessageContext || "",
      desiredResponse: (intake.desiredAudienceResponse || []).join(", "),
    },
    deliverables: {
      mainVideoLength: intake.mainVideoLength || "",
      numberOfVideos: intake.deliverables?.includes("Multiple videos") ? 3 : 1,
      cutdowns: intake.deliverables?.includes("Short social cutdowns") || false,
      socialVersions: intake.deliverables?.includes("LinkedIn versions") || false,
      captions: intake.deliverables?.includes("Captions/subtitles") || false,
      motionGraphics:
        intake.motionGraphicsLevel === "Moderate graphics" ||
        intake.motionGraphicsLevel === "Heavy graphics",
      animation: intake.motionGraphicsLevel === "Full animation",
      voiceover: intake.productionNeeds?.includes("Voiceover only") || false,
      interviews: intake.productionNeeds?.includes("Interviews") || false,
      bRoll: intake.productionNeeds?.includes("Existing footage/assets") || false,
      photography: intake.deliverables?.includes("Photography") || false,
    },
    production: {
      locations: intake.filmingLocationType || "",
      filmingDays:
        intake.expectedShootDays === "Half day"
          ? 0.5
          : intake.expectedShootDays === "1 day"
          ? 1
          : intake.expectedShootDays === "2 days"
          ? 2
          : intake.expectedShootDays === "3+ days"
          ? 3
          : 1,
      interviewSubjects: parseInt(intake.onCameraPeopleCount || "0") || 0,
      travelRequired: false,
      facilityAccess: false,
      safetyRequirements: false,
      deadline: intake.timeline || "",
    },
    creative: {
      tone: (intake.creativeStyle || []).join(", "),
      visualStyle: (intake.creativeStyle || []).join(", "),
      referenceVideos: intake.referenceLinks || "",
      brandGuidelines: "",
      wordsToAvoid: "",
    },
    budget: {
      budgetRange: (intake.budgetComfort || "not_sure") as any,
      decisionMaker: "",
      approvalProcess: "",
      timelineToApprove: intake.timeline || "",
    },
  };
}

// ─── UI Components ───

function MultiSelectCards({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (s: string[]) => void;
}) {
  const toggle = (val: string) => {
    if (selected.includes(val)) onChange(selected.filter((x) => x !== val));
    else onChange([...selected, val]);
  };
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => toggle(opt)}
          className={cn(
            "p-4 rounded-lg border text-left transition-all text-sm font-medium h-full",
            selected.includes(opt)
              ? "bg-brand-accent-glow/10 border-brand-accent-glow text-brand-accent-glow"
              : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function SingleSelectChips({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string;
  onChange: (s: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={cn(
            "px-4 py-2 rounded-full border text-sm transition-all font-medium",
            selected === opt
              ? "bg-brand-accent-glow/10 border-brand-accent-glow text-brand-accent-glow"
              : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function Dropdown({
  options,
  selected,
  onChange,
  placeholder = "Select an option...",
}: {
  options: string[];
  selected: string | undefined;
  onChange: (s: string) => void;
  placeholder?: string;
}) {
  return (
    <select
      value={selected || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-white border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-brand-accent-glow appearance-none cursor-pointer"
    >
      <option value="" disabled className="text-slate-400">
        {placeholder}
      </option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

function BudgetSelect({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string | undefined;
  onChange: (s: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {options.map((bc) => (
        <button
          key={bc}
          onClick={() => onChange(bc)}
          className={cn(
            "p-4 rounded-lg border text-left transition-all text-sm font-medium",
            selected === bc
              ? "bg-brand-accent-glow/10 border-brand-accent-glow text-brand-accent-glow"
              : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
          )}
        >
          {bc}
        </button>
      ))}
    </div>
  );
}

// ─── Main Component ───

export function CreativeBriefIntake() {
  const [step, setStep] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [contact, setContact] = useState<ContactInfo>({
    firstName: "",
    lastName: "",
    company: "",
    role: "",
    email: "",
    phone: "",
  });
  const [intake, setIntake] = useState<IntakeData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [briefSummary, setBriefSummary] = useState<any>(null);
  const [estimate, setEstimate] = useState<any>(null);
  const [direction, setDirection] = useState(1);
  const [addons, setAddons] = useState([
    { id: "photography", name: "Add Photography Package", cost: 1500, selected: false },
    { id: "social", name: "Add Social Cutdowns", cost: 2500, selected: false },
  ]);

  // Create session on mount
  useEffect(() => {
    authFetch("/api/creative-briefs", {
      method: "POST",
      body: JSON.stringify({ source: "website" }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) setSessionId(json.data.id);
      });
  }, []);

  const updateIntake = (key: keyof IntakeData, value: any) => {
    setIntake((prev) => ({ ...prev, [key]: value }));
  };

  const syncToBackend = async (updates: any) => {
    if (!sessionId) return;
    await authFetch(`/api/creative-briefs/${sessionId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  };

  const handleNextStep = async () => {
    setIsSubmitting(true);
    try {
      if (step === 0) {
        await syncToBackend({
          contact,
          intake,
          status: "contact_captured",
        });
        setStep(1);
      } else if (step === 8) {
        // Finalize brief
        const currentIntake = { ...intake };
        const est = generateDeterministicEstimate(currentIntake);
        setEstimate(est);
        await syncToBackend({
          intake: currentIntake,
          zip2Estimate: est,
          addons,
          status: "brief_submitted",
        });
        // Also populate phases for server-side enrichment compatibility
        const phases = mapIntakeToPhases(currentIntake, contact);
        await authFetch(`/api/creative-briefs/${sessionId}/phase/intent`, {
          method: "PATCH",
          body: JSON.stringify(phases.intent),
        });
        await authFetch(`/api/creative-briefs/${sessionId}/phase/audience`, {
          method: "PATCH",
          body: JSON.stringify(phases.audience),
        });
        await authFetch(`/api/creative-briefs/${sessionId}/phase/deliverables`, {
          method: "PATCH",
          body: JSON.stringify(phases.deliverables),
        });
        await authFetch(`/api/creative-briefs/${sessionId}/phase/production`, {
          method: "PATCH",
          body: JSON.stringify(phases.production),
        });
        await authFetch(`/api/creative-briefs/${sessionId}/phase/creative`, {
          method: "PATCH",
          body: JSON.stringify(phases.creative),
        });
        await authFetch(`/api/creative-briefs/${sessionId}/phase/budget`, {
          method: "PATCH",
          body: JSON.stringify(phases.budget),
        });
        // Trigger AI enrichment
        try {
          setIsEnriching(true);
          await authFetch(`/api/creative-briefs/${sessionId}/enrich`, { method: "POST" });
          const res = await authFetch(`/api/creative-briefs/${sessionId}`);
          const json = await res.json();
          if (json.ok && json.data.aiEnrichment) {
            setBriefSummary(json.data.aiEnrichment);
          }
        } catch (e) {
          console.error("Enrichment failed:", e);
        } finally {
          setIsEnriching(false);
        }
        setStep(9);
      } else {
        await syncToBackend({ intake, contact });
        setStep((s) => s + 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(0, s - 1));
  };

  const totalSteps = 10;
  const progress = ((step + 1) / totalSteps) * 100;

  const canProceed = useMemo(() => {
    if (step === 0) return contact.firstName && contact.email && contact.company;
    if (step === 1) return !!intake.projectType;
    if (step === 2) return !!(intake.businessGoals?.length);
    if (step === 3) return !!(intake.audienceTypes?.length) && !!intake.audienceKnowledgeLevel;
    if (step === 4) return !!(intake.desiredAudienceResponse?.length);
    if (step === 5) return !!(intake.deliverables?.length) && !!intake.mainVideoLength;
    if (step === 6) return !!(intake.productionNeeds?.length);
    if (step === 7) return !!(intake.creativeStyle?.length) && !!intake.motionGraphicsLevel;
    if (step === 8) return !!intake.timeline && !!intake.budgetComfort;
    return true;
  }, [step, contact, intake]);

  const calculateAdjustedRange = (rangeText: string) => {
    const totalAddons = addons.filter((a) => a.selected).reduce((acc, a) => acc + a.cost, 0);
    if (!totalAddons) return rangeText;
    const matches = rangeText.match(/\$([0-9,]+)/g);
    if (matches && matches.length === 2) {
      const min = parseInt(matches[0].replace(/[^0-9]/g, "")) + totalAddons;
      const max = parseInt(matches[1].replace(/[^0-9]/g, "")) + totalAddons;
      return "$" + min.toLocaleString() + " – $" + max.toLocaleString();
    }
    return rangeText + " (+$" + totalAddons.toLocaleString() + " add-ons)";
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top bar */}
      <div className="border-b border-slate-200 bg-white/70 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Film className="h-5 w-5 text-brand-accent-glow" />
          <span className="text-sm font-semibold tracking-wide text-slate-900">Content Co-op</span>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider hidden sm:inline">
            Creative Brief
          </span>
        </div>
        <div className="flex items-center gap-3">
          {(isSubmitting || isEnriching) && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />}
          <span className="text-[10px] font-mono text-slate-500">
            {step + 1} / {totalSteps}
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="h-0.5 bg-slate-200">
        <motion.div
          className="h-full bg-brand-accent-glow"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-3xl">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              initial={{ opacity: 0, x: direction > 0 ? 40 : -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -40 : 40 }}
              transition={{ duration: 0.3 }}
            >
              {step === 0 && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-3xl sm:text-4xl font-display tracking-tight mb-4">
                      Let&apos;s get the basics first so we can save your brief as we shape it.
                    </h2>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-500">First Name</label>
                        <input
                          autoFocus
                          value={contact.firstName}
                          onChange={(e) => setContact({ ...contact, firstName: e.target.value })}
                          placeholder="Jane"
                          className="w-full bg-white border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-brand-accent-glow"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-500">Last Name (Optional)</label>
                        <input
                          value={contact.lastName}
                          onChange={(e) => setContact({ ...contact, lastName: e.target.value })}
                          placeholder="Doe"
                          className="w-full bg-white border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-brand-accent-glow"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-500">Company Name</label>
                        <input
                          value={contact.company}
                          onChange={(e) => setContact({ ...contact, company: e.target.value })}
                          placeholder="Acme Corp"
                          className="w-full bg-white border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-brand-accent-glow"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-500">Role / Title (Optional)</label>
                        <input
                          value={contact.role}
                          onChange={(e) => setContact({ ...contact, role: e.target.value })}
                          placeholder="VP of Marketing"
                          className="w-full bg-white border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-brand-accent-glow"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-500">Work Email</label>
                        <input
                          type="email"
                          value={contact.email}
                          onChange={(e) => setContact({ ...contact, email: e.target.value })}
                          placeholder="jane@acme.com"
                          className="w-full bg-white border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-brand-accent-glow"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-500">Phone</label>
                        <input
                          type="tel"
                          value={contact.phone}
                          onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                          placeholder="(555) 123-4567"
                          className="w-full bg-white border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-brand-accent-glow"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-3xl sm:text-4xl font-display tracking-tight mb-4">
                      What are you trying to create?
                    </h2>
                    <p className="text-slate-500 text-lg">Select the closest match.</p>
                  </div>
                  <SingleSelectChips
                    options={PROJECT_TYPES}
                    selected={intake.projectType || ""}
                    onChange={(v) => updateIntake("projectType", v)}
                  />
                  <div className="pt-4">
                    <label className="text-sm font-medium text-slate-500 mb-2 block">
                      Describe it in one sentence, if helpful. (Optional)
                    </label>
                    <textarea
                      placeholder="e.g. A 2-minute overview of our new subsea robotics platform..."
                      value={intake.projectContext || ""}
                      onChange={(e) => updateIntake("projectContext", e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-brand-accent-glow min-h-[80px] resize-none"
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-3xl sm:text-4xl font-display tracking-tight mb-4">
                      What should this video help accomplish?
                    </h2>
                    <p className="text-slate-500 text-lg">Select all that apply.</p>
                  </div>
                  <MultiSelectCards
                    options={BUSINESS_GOALS}
                    selected={intake.businessGoals || []}
                    onChange={(v) => updateIntake("businessGoals", v)}
                  />
                  <div className="pt-4">
                    <label className="text-sm font-medium text-slate-500 mb-2 block">
                      Anything specific driving this project right now? (Optional)
                    </label>
                    <input
                      placeholder="e.g. We have a major trade show in October..."
                      value={intake.businessGoalContext || ""}
                      onChange={(e) => updateIntake("businessGoalContext", e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-brand-accent-glow"
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-3xl sm:text-4xl font-display tracking-tight mb-4">
                      Who needs to watch this?
                    </h2>
                  </div>
                  <MultiSelectCards
                    options={AUDIENCE_TYPES}
                    selected={intake.audienceTypes || []}
                    onChange={(v) => updateIntake("audienceTypes", v)}
                  />
                  <div className="pt-6">
                    <label className="text-sm font-medium text-slate-900 mb-3 block">
                      How familiar is this audience with the topic?
                    </label>
                    <Dropdown
                      options={AUDIENCE_KNOWLEDGE}
                      selected={intake.audienceKnowledgeLevel}
                      onChange={(v) => updateIntake("audienceKnowledgeLevel", v)}
                    />
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-3xl sm:text-4xl font-display tracking-tight mb-4">
                      What should the audience remember or feel?
                    </h2>
                  </div>
                  <MultiSelectCards
                    options={DESIRED_RESPONSES}
                    selected={intake.desiredAudienceResponse || []}
                    onChange={(v) => updateIntake("desiredAudienceResponse", v)}
                  />
                  <div className="pt-6">
                    <label className="text-sm font-medium text-slate-900 mb-3 block">
                      Is there one key message we should not miss? (Optional)
                    </label>
                    <input
                      value={intake.coreMessageContext || ""}
                      onChange={(e) => updateIntake("coreMessageContext", e.target.value)}
                      placeholder="e.g. Safety is a mindset, not a checklist."
                      className="w-full bg-white border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-brand-accent-glow"
                    />
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-3xl sm:text-4xl font-display tracking-tight mb-4">
                      What do you think you need delivered?
                    </h2>
                  </div>
                  <MultiSelectCards
                    options={DELIVERABLES}
                    selected={intake.deliverables || []}
                    onChange={(v) => updateIntake("deliverables", v)}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6">
                    <div>
                      <label className="text-sm font-medium text-slate-900 mb-3 block">
                        Approximate main video length?
                      </label>
                      <Dropdown
                        options={VIDEO_LENGTHS}
                        selected={intake.mainVideoLength}
                        onChange={(v) => updateIntake("mainVideoLength", v)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-900 mb-3 block">
                        Where will this be used?
                      </label>
                      <Dropdown
                        options={USAGE_CHANNELS}
                        selected={intake.usageChannels?.[0]}
                        onChange={(v) => updateIntake("usageChannels", [v])}
                        placeholder="Primary usage channel..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 6 && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-3xl sm:text-4xl font-display tracking-tight mb-4">
                      What will likely need to be filmed or created?
                    </h2>
                  </div>
                  <MultiSelectCards
                    options={PRODUCTION_NEEDS}
                    selected={intake.productionNeeds || []}
                    onChange={(v) => updateIntake("productionNeeds", v)}
                  />
                  <div className="space-y-6 pt-6">
                    <div>
                      <label className="text-sm font-medium text-slate-900 mb-3 block">
                        Where would filming happen?
                      </label>
                      <SingleSelectChips
                        options={LOCATIONS}
                        selected={intake.filmingLocationType || ""}
                        onChange={(v) => updateIntake("filmingLocationType", v)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-900 mb-3 block">
                        How many filming days do you expect?
                      </label>
                      <SingleSelectChips
                        options={SHOOT_DAYS}
                        selected={intake.expectedShootDays || ""}
                        onChange={(v) => updateIntake("expectedShootDays", v)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-900 mb-3 block">
                        How many people may appear on camera?
                      </label>
                      <SingleSelectChips
                        options={ON_CAMERA_PEOPLE}
                        selected={intake.onCameraPeopleCount || ""}
                        onChange={(v) => updateIntake("onCameraPeopleCount", v)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 7 && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-3xl sm:text-4xl font-display tracking-tight mb-4">
                      How should this feel?
                    </h2>
                  </div>
                  <MultiSelectCards
                    options={CREATIVE_STYLES}
                    selected={intake.creativeStyle || []}
                    onChange={(v) => updateIntake("creativeStyle", v)}
                  />
                  <div className="space-y-6 pt-6">
                    <div>
                      <label className="text-sm font-medium text-slate-900 mb-3 block">
                        How much motion graphics or animation do you expect?
                      </label>
                      <SingleSelectChips
                        options={MOTION_GRAPHICS}
                        selected={intake.motionGraphicsLevel || ""}
                        onChange={(v) => updateIntake("motionGraphicsLevel", v)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-900 mb-3 block">
                        Have any example links, brand guides, or references? (Optional)
                      </label>
                      <textarea
                        placeholder="Paste URLs to example videos, your website, or Google Drive folders here..."
                        value={intake.referenceLinks || ""}
                        onChange={(e) => updateIntake("referenceLinks", e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-brand-accent-glow min-h-[80px] resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 8 && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-3xl sm:text-4xl font-display tracking-tight mb-4">
                      When do you need this completed?
                    </h2>
                  </div>
                  <SingleSelectChips
                    options={TIMELINES}
                    selected={intake.timeline || ""}
                    onChange={(v) => updateIntake("timeline", v)}
                  />
                  <div className="pt-8">
                    <h2 className="text-2xl font-display tracking-tight mb-4">
                      Do you already have an investment range in mind, or should we recommend the best-fit scope?
                    </h2>
                    <BudgetSelect
                      options={BUDGET_COMFORTS}
                      selected={intake.budgetComfort}
                      onChange={(v) => updateIntake("budgetComfort", v)}
                    />
                  </div>
                </div>
              )}

              {step === 9 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {isEnriching ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <Loader2 className="h-8 w-8 animate-spin text-brand-accent-glow" />
                      <p className="text-slate-500">Shaping your brief and generating estimates...</p>
                    </div>
                  ) : (
                    <>
                      <div className="text-center mb-12">
                        <div className="inline-flex h-16 w-16 rounded-full bg-emerald-100 border border-emerald-200 items-center justify-center mb-6">
                          <Check className="h-8 w-8 text-emerald-600" />
                        </div>
                        <h2 className="text-4xl sm:text-5xl font-display tracking-tight mb-4">
                          Your project has been shaped into a working brief.
                        </h2>
                        <p className="text-slate-500 text-lg max-w-2xl mx-auto">
                          Based on your answers, this looks like a{" "}
                          <span className="font-semibold text-slate-900">
                            {briefSummary?.projectType || intake.projectType || "Premium Video"}
                          </span>{" "}
                          with a likely range between{" "}
                          <span className="font-semibold text-slate-900">
                            {estimate?.lean?.range ? calculateAdjustedRange(estimate.lean.range) : ""}
                          </span>
                          . The next step is a short discovery call so we can confirm scope, timeline, and the right production approach.
                        </p>
                      </div>

                      {briefSummary?.creativeHookIdea && (
                        <div className="mb-12 bg-gradient-to-r from-blue-50 to-slate-50 border border-blue-200 p-8 rounded-2xl relative overflow-hidden">
                          <h3 className="text-xl font-semibold mb-4 text-slate-900 flex items-center">
                            <PlaySquare className="w-5 h-5 mr-3 text-brand-accent-glow" />
                            The &quot;Wow Factor&quot; Concept
                          </h3>
                          <p className="text-slate-700 leading-relaxed">{briefSummary.creativeHookIdea}</p>
                        </div>
                      )}

                      {/* Scope Builder */}
                      <div className="mb-8 p-6 border border-slate-200 bg-white rounded-2xl shadow-sm">
                        <h4 className="text-lg font-medium mb-4 text-slate-900">Scope Builder</h4>
                        <div className="flex flex-wrap gap-3">
                          {addons.map((addon, i) => (
                            <button
                              key={addon.id}
                              onClick={() => {
                                const next = addons.map((a, idx) =>
                                  idx === i ? { ...a, selected: !a.selected } : a
                                );
                                setAddons(next);
                                syncToBackend({ addons: next });
                              }}
                              className={cn(
                                "px-4 py-2 border rounded-full text-sm font-medium transition-colors flex items-center",
                                addon.selected
                                  ? "bg-brand-accent-glow/10 border-brand-accent-glow text-brand-accent-glow"
                                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                              )}
                            >
                              {addon.selected ? <Check className="w-4 h-4 mr-2" /> : null}
                              {addon.name} (+${addon.cost.toLocaleString()})
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Estimates */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                        {[estimate?.lean, estimate?.recommended, estimate?.premium].map(
                          (est, i) =>
                            est && (
                              <div
                                key={i}
                                className={cn(
                                  "p-6 rounded-2xl border transition-all duration-300 bg-white",
                                  i === 1
                                    ? "border-brand-accent-glow relative scale-105 shadow-lg"
                                    : "border-slate-200 opacity-90"
                                )}
                              >
                                {i === 1 && (
                                  <div className="absolute top-0 right-6 -translate-y-1/2 bg-brand-accent-glow text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                    Recommended
                                  </div>
                                )}
                                <div className="text-slate-500 uppercase tracking-wider text-xs font-medium mb-2">
                                  {est.name} / Focus
                                </div>
                                <div className="text-2xl font-bold mb-4 font-mono text-slate-900">
                                  {calculateAdjustedRange(est.range)}
                                </div>
                                <div className="text-sm text-slate-500 mb-6">{est.bestFor}</div>
                                <ul className="space-y-3 mb-6 flex-1">
                                  {est.includes.map((inc: string, j: number) => (
                                    <li key={j} className="text-sm flex items-start gap-2 text-slate-700">
                                      <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                      {inc}
                                    </li>
                                  ))}
                                  {addons
                                    .filter((a) => a.selected)
                                    .map((a) => (
                                      <li key={a.id} className="text-sm flex items-start gap-2 text-brand-accent-glow">
                                        <Check className="h-4 w-4 text-brand-accent-glow shrink-0 mt-0.5" />
                                        + {a.name}
                                      </li>
                                    ))}
                                </ul>
                                <div className="pt-6 border-t border-slate-200 mt-auto">
                                  <span className="text-xs text-slate-500 uppercase">Estimated Timeline</span>
                                  <div className="text-sm font-medium text-slate-900">{est.timeline}</div>
                                </div>
                              </div>
                            )
                        )}
                      </div>

                      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-md mx-auto shadow-sm">
                        <h3 className="text-2xl font-display tracking-tight mb-4 text-slate-900">
                          Next step: book a short discovery call.
                        </h3>
                        <p className="text-slate-500 mb-6">
                          We&apos;ll use the brief you just created to make the call focused and useful.
                        </p>
                        <div className="space-y-4">
                          <a
                            href="https://calendly.com/baileyeubanks"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full bg-brand-accent-glow text-white hover:bg-blue-700 px-5 py-3 rounded-lg text-sm font-medium transition-colors text-center"
                          >
                            Book Discovery Call
                          </a>
                          <button
                            onClick={() => (window.location.href = "/")}
                            className="block w-full text-slate-500 hover:text-slate-900 text-sm transition-colors"
                          >
                            Return to Home
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          {step < 9 && (
            <div className="mt-12 flex items-center justify-between">
              <button
                onClick={handleBack}
                disabled={step === 0}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-slate-500 hover:text-slate-900 disabled:opacity-30 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                onClick={handleNextStep}
                disabled={!canProceed || isSubmitting}
                className="flex items-center gap-2 rounded-lg bg-brand-accent-glow px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {step === 8 ? "Shape My Brief" : "Continue"}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
