import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Film,
  Clapperboard,
  PenTool,
  Wand2,
  Rocket,
  Mail,
  Phone,
  User,
  Building2,
  Calendar,
  DollarSign,
  MessageSquare,
  Loader2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { createRootQuoteDocument } from "@/lib/root-billing-client";

const serviceOptions = [
  { id: "brand_video", label: "Brand Story Video", icon: Film, desc: "2-5 min cinematic company story" },
  { id: "social_content", label: "Social Content Package", icon: Rocket, desc: "30+ short-form videos per month" },
  { id: "product_demo", label: "Product Demo / Explainer", icon: Clapperboard, desc: "Clear, conversion-focused product walkthrough" },
  { id: "scriptwriting", label: "Script & Creative Direction", icon: PenTool, desc: "Hooks, scripts, shot lists, storyboards" },
  { id: "editing", label: "Post-Production Editing", icon: Wand2, desc: "Cut, color, sound design, motion graphics" },
  { id: "other", label: "Something Else", icon: Sparkles, desc: "Tell us what you need" },
];

const budgetOptions = [
  { label: "$2,500 – $5,000", value: "2500-5000" },
  { label: "$5,000 – $10,000", value: "5000-10000" },
  { label: "$10,000 – $25,000", value: "10000-25000" },
  { label: "$25,000 – $50,000", value: "25000-50000" },
  { label: "$50,000+", value: "50000+" },
  { label: "Not sure yet", value: "unknown" },
];

const timelineOptions = [
  { label: "ASAP (1-2 weeks)", value: "1-2-weeks" },
  { label: "Standard (3-4 weeks)", value: "3-4-weeks" },
  { label: "Relaxed (1-2 months)", value: "1-2-months" },
  { label: "Future project (3+ months)", value: "3-plus-months" },
];

export function PublicQuoteEngine() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"form" | "submitting" | "success">("form");
  const [error, setError] = useState<string | null>(null);

  const [service, setService] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [budget, setBudget] = useState("");
  const [timeline, setTimeline] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !service || !description.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    setStep("submitting");
    setError(null);

    try {
      const selectedService = serviceOptions.find((s) => s.id === service);
      const title = selectedService ? `${selectedService.label} — ${company || name}` : `Video Project — ${name}`;

      await createRootQuoteDocument({
        kind: "proposal",
        companyAccount: "content-co-op",
        client: {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          company: company.trim() || null,
          address: null,
        },
        source: "public_intake",
        title,
        scopeSummary: description.trim(),
        servicePeriod: null,
        projectTimeline: timeline || null,
        deliverables: [service],
        lineItems: [
          {
            id: `line-${Date.now()}`,
            name: selectedService?.label || "Video Production",
            description: description.trim(),
            quantity: 1,
            unitPriceCents: 0,
            taxable: false,
            category: "service",
          },
        ],
        discountCents: 0,
        taxCents: 0,
        depositCents: 0,
        terms: "Proposal valid for 30 days. 50% deposit required to secure production dates. Final payment due on delivery.",
        internalNotes: `Public quote intake. Budget: ${budget}. Timeline: ${timeline}.`,
        clientNotes: "",
      });

      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quote submission failed.");
      setStep("form");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Ambient */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(61,125,216,0.06)_0%,transparent_50%)]" />
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle_at_top_right,rgba(61,125,216,0.04)_0%,transparent_50%)]" />

      <div className="relative z-10 mx-auto max-w-2xl px-6 py-12">
        {/* Brand */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-accent-glow/20 bg-brand-accent-glow/10 px-4 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-brand-accent-glow mb-4">
            <Sparkles className="h-3 w-3" />
            Content Co-op
          </div>
          <h1 className="text-4xl font-display tracking-[0.08em]">REQUEST A QUOTE</h1>
          <p className="mt-2 text-sm text-slate-500 font-mono">
            Tell us about your project. We'll respond within 24 hours.
          </p>
        </div>

        {step === "success" ? (
          <div className="glass-panel p-10 text-center space-y-5">
            <div className="mx-auto h-16 w-16 rounded-full bg-success/10 border border-success/20 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-2xl font-display tracking-[0.08em]">QUOTE RECEIVED</h2>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              We've captured your project details. A producer will review and send a formal proposal within 24 hours.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button onClick={() => navigate("/")} className="btn-outline text-sm">
                Back to Mission Control
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Service Type */}
            <div className="glass-panel p-6 space-y-4">
              <span className="label-nav">1. What do you need?</span>
              <div className="grid gap-3 sm:grid-cols-2">
                {serviceOptions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setService(s.id)}
                    className={`flex items-start gap-3 rounded-md border p-4 text-left transition-all ${
                      service === s.id
                        ? "border-brand-accent-glow/40 bg-brand-accent-glow/10"
                        : "border-slate-200 bg-white/[0.02] hover:border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <s.icon className={`h-5 w-5 shrink-0 mt-0.5 ${service === s.id ? "text-brand-accent-glow" : "text-slate-400"}`} />
                    <div>
                      <p className={`text-sm font-medium ${service === s.id ? "text-slate-900" : "text-slate-600"}`}>{s.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{s.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div className="glass-panel p-6 space-y-4">
              <span className="label-nav">2. Who are you?</span>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-md border border-slate-200 bg-slate-100 pl-9 pr-3 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-accent-glow/50 placeholder:text-slate-400"
                      placeholder="Your name"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-md border border-slate-200 bg-slate-100 pl-9 pr-3 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-accent-glow/50 placeholder:text-slate-400"
                      placeholder="you@company.com"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-md border border-slate-200 bg-slate-100 pl-9 pr-3 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-accent-glow/50 placeholder:text-slate-400"
                      placeholder="(555) 000-0000"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Company</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full rounded-md border border-slate-200 bg-slate-100 pl-9 pr-3 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-accent-glow/50 placeholder:text-slate-400"
                      placeholder="Company name"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Budget & Timeline */}
            <div className="glass-panel p-6 space-y-4">
              <span className="label-nav">3. Budget & Timeline</span>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Budget Range</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <select
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="w-full rounded-md border border-slate-200 bg-slate-100 pl-9 pr-3 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-accent-glow/50 appearance-none"
                    >
                      <option value="" className="bg-slate-50">Select budget...</option>
                      {budgetOptions.map((b) => (
                        <option key={b.value} value={b.value} className="bg-slate-50">{b.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Timeline</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <select
                      value={timeline}
                      onChange={(e) => setTimeline(e.target.value)}
                      className="w-full rounded-md border border-slate-200 bg-slate-100 pl-9 pr-3 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-accent-glow/50 appearance-none"
                    >
                      <option value="" className="bg-slate-50">Select timeline...</option>
                      {timelineOptions.map((t) => (
                        <option key={t.value} value={t.value} className="bg-slate-50">{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="glass-panel p-6 space-y-4">
              <span className="label-nav">4. Project Details</span>
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Describe your project *</label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full rounded-md border border-slate-200 bg-slate-100 pl-9 pr-3 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-accent-glow/50 placeholder:text-slate-400 resize-none"
                    placeholder="What are you trying to achieve? Who's the audience? Any references or inspirations?"
                  />
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <div className="flex justify-end">
              <button
                onClick={() => void handleSubmit()}
                disabled={step === "submitting"}
                className="btn-mission flex items-center gap-2"
              >
                {step === "submitting" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Quote Request
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>

            <p className="text-center text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              No commitment. We'll respond within 24 business hours.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
