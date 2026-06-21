import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type Stripe from "stripe";

// Stripe webhook — receives payment events and provisions access.
// Configure the endpoint URL + secret in the Stripe dashboard (or via `stripe listen`).

export async function POST(req: Request) {
  const stripe = getStripe();
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  const body = await req.text();
  let event: Stripe.Event;
  try {
    if (!sig || !secret) throw new Error("missing");
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch {
    // Return a consistent response — don't reveal whether the secret is
    // missing vs the signature is invalid (prevents enumeration).
    return NextResponse.json({ error: "Invalid request" }, { status: 401 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const packageId = session.metadata?.package_id;
    const durationDays = Number(session.metadata?.duration_days ?? 30);

    if (userId && packageId) {
      const expiresAt = new Date(
        Date.now() + durationDays * 24 * 60 * 60 * 1000,
      ).toISOString();

      const admin = createSupabaseServiceClient();
      // Idempotent: stripe_session_id is unique, so retries don't double-grant.
      await admin.from("purchases").upsert(
        {
          user_id: userId,
          package_id: packageId,
          stripe_session_id: session.id,
          expires_at: expiresAt,
        },
        { onConflict: "stripe_session_id" },
      );
    }
  }

  return NextResponse.json({ received: true });
}
