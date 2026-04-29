import Stripe from "stripe";
import { RootBillingError } from "./root-billing-store";

const apiKey = process.env.STRIPE_SECRET_KEY;

export const stripe = apiKey ? new Stripe(apiKey, { apiVersion: "2026-04-22.dahlia" }) : null;

export function assertStripe(): Stripe {
  if (!stripe) {
    throw new RootBillingError("STRIPE_NOT_CONFIGURED", "Stripe is not configured. Set STRIPE_SECRET_KEY.", 501);
  }
  return stripe;
}

export async function createStripePaymentLink(invoiceId: string, amountCents: number, description: string): Promise<{ url: string; id: string }> {
  const s = assertStripe();
  const session = await s.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: description },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    metadata: { invoiceId, source: "mission_control" },
    success_url: `${process.env.CLIENT_URL || "http://localhost:4300"}/client/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL || "http://localhost:4300"}/client/payment-cancel`,
  });
  if (!session.url) {
    throw new RootBillingError("STRIPE_SESSION_ERROR", "Checkout session created without URL.", 500);
  }
  return { url: session.url, id: session.id };
}

export async function createStripeEmbeddedSession(invoiceId: string, amountCents: number, description: string): Promise<{ clientSecret: string; id: string }> {
  const s = assertStripe();
  const session = await s.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: description },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    metadata: { invoiceId, source: "mission_control" },
    ui_mode: "embedded_page",
    return_url: `${process.env.CLIENT_URL || "http://localhost:4300"}/client/payment-return?session_id={CHECKOUT_SESSION_ID}`,
  });
  if (!session.client_secret) {
    throw new RootBillingError("STRIPE_SESSION_ERROR", "Embedded checkout session created without client secret.", 500);
  }
  return { clientSecret: session.client_secret, id: session.id };
}

export async function retrieveStripeSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  const s = assertStripe();
  return s.checkout.sessions.retrieve(sessionId);
}

export async function constructStripeEvent(payload: string | Buffer, signature: string, webhookSecret: string): Promise<Stripe.Event> {
  const s = assertStripe();
  return s.webhooks.constructEvent(payload, signature, webhookSecret);
}
