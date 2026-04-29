import { useState } from "react";
import { ShieldCheck, Mail, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ClientPortalLogin() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ token: string; url: string; expiresAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/client-portal/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = await res.json();
      if (json.ok) {
        setResult(json);
      } else {
        setError(json.error || "Failed to generate portal link.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fullUrl = result ? `${window.location.origin}${result.url}` : "";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Client Portal</h1>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em]">Content Co-op</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {!result ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="email"
                    placeholder="you@company.com"
                    className="pl-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                Access Portal
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">Portal link generated</span>
              </div>
              <p className="text-xs text-slate-500">
                Your secure portal link is valid until {new Date(result.expiresAt).toLocaleDateString()}.
              </p>
              <div className="rounded-md border border-slate-200 bg-slate-100 p-3">
                <code className="text-[11px] text-primary break-all">{fullUrl}</code>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 border-slate-200 text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(fullUrl);
                  }}
                >
                  Copy Link
                </Button>
                <Button className="flex-1 text-xs" onClick={() => window.open(result.url, "_blank")}>
                  Open Portal
                </Button>
              </div>
              <Button variant="ghost" className="w-full text-xs text-slate-500" onClick={() => { setResult(null); setEmail(""); }}>
                Use different email
              </Button>
            </div>
          )}
        </div>

        <p className="text-center text-[10px] font-mono text-slate-400 mt-6 uppercase tracking-[0.2em]">
          Powered by Mission Control · Content Co-op
        </p>
      </div>
    </div>
  );
}
