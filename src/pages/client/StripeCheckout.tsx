import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Loader2, AlertCircle, ArrowLeft, Receipt } from "lucide-react";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

export function StripeCheckout() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<{ invoiceNumber: string; title: string; totalCents: number; client: { name: string } } | null>(null);

  useEffect(() => {
    if (!invoiceId) return;
    async function fetchSession() {
      try {
        const invRes = await fetch(`/api/root/invoices/${invoiceId}`);
        const invJson = await invRes.json();
        if (!invJson.ok || !invJson.data) {
          setError("Invoice not found.");
          setLoading(false);
          return;
        }
        setInvoice(invJson.data);
        const res = await fetch(`/api/root/invoices/${invoiceId}/embedded-checkout`, { method: "POST" });
        const json = await res.json();
        if (!json.ok || !json.data?.session?.clientSecret) {
          setError(json.error?.message || "Failed to create checkout session.");
          setLoading(false);
          return;
        }
        setClientSecret(json.data.session.clientSecret);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error.");
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, [invoiceId]);

  function formatCents(cents: number): string {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-sm text-zinc-400">Preparing secure checkout...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-900 p-6">
        <div className="w-full max-w-md rounded-xl border border-red-500/20 bg-red-950/20 p-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-red-400" />
          <h2 className="mt-3 text-lg font-semibold text-slate-900">Checkout Unavailable</h2>
          <p className="mt-2 text-sm text-zinc-400">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6">
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {invoice && (
          <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <Receipt className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">{invoice.title}</h1>
                <p className="text-xs text-zinc-400">{invoice.invoiceNumber} &middot; {invoice.client.name}</p>
              </div>
              <div className="ml-auto text-lg font-bold text-emerald-400">{formatCents(invoice.totalCents)}</div>
            </div>
          </div>
        )}

        {clientSecret && stripePromise && (
          <div className="rounded-xl border border-zinc-800 bg-white p-1">
            <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        )}
      </div>
    </div>
  );
}
