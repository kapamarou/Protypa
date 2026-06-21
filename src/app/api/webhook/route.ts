import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type Stripe from "stripe";

// Stripe webhook — receives payment events and provisions / revokes access.
// Configure the endpoint URL + secret in the Stripe dashboard (or `stripe listen`).
export const runtime = "nodejs";

// Outcome of a handler:
//   ok     → 200 (done, or nothing to do)
//   retry  → 500 so Stripe re-delivers (transient: DB/network failure)
//   reject → 200 but NOT provisioned (permanent: bad data / price mismatch);
//            we ack so Stripe doesn't retry a condition that can never succeed.
type Outcome = { status: "ok" | "retry" | "reject"; error?: string };

function piId(
  pi: string | Stripe.PaymentIntent | null | undefined,
): string | null {
  if (!pi) return null;
  return typeof pi === "string" ? pi : pi.id;
}

// Provision an entitlement for a confirmed-paid checkout session.
async function provision(session: Stripe.Checkout.Session): Promise<Outcome> {
  const userId = session.metadata?.user_id;
  const packageId = session.metadata?.package_id;
  // Not one of our checkout sessions (or missing metadata) — nothing to do.
  if (!userId || !packageId) return { status: "ok" };

  const admin = createSupabaseServiceClient();

  // B4/B5: never trust metadata for entitlement VALUES — re-fetch the package.
  const { data: pkg, error: pkgErr } = await admin
    .from("packages")
    .select("id, duration_days, stripe_price_id, price_cents")
    .eq("id", packageId)
    .maybeSingle();
  if (pkgErr) return { status: "retry", error: `package lookup: ${pkgErr.message}` };
  if (!pkg) return { status: "reject", error: `package ${packageId} not found` };

  // B5: cross-check what was actually charged against the package's price.
  const stripe = getStripe();
  let chargedPriceId: string | null = null;
  try {
    const items = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
    chargedPriceId = items.data[0]?.price?.id ?? null;
  } catch (e) {
    return { status: "retry", error: `listLineItems: ${(e as Error).message}` };
  }
  if (pkg.stripe_price_id && chargedPriceId && chargedPriceId !== pkg.stripe_price_id) {
    return {
      status: "reject",
      error: `price mismatch: charged ${chargedPriceId} != package ${pkg.stripe_price_id}`,
    };
  }

  // B4: derive the window from the DB package; validate; anchor to Stripe's
  // authoritative session.created (NOT the app clock) so a delayed re-delivery
  // computes the SAME expiry instead of shifting it forward.
  const durationDays = Number(pkg.duration_days);
  if (!Number.isFinite(durationDays) || durationDays <= 0) {
    return { status: "reject", error: `invalid duration_days for package ${packageId}` };
  }
  const anchorMs = (session.created ?? 0) * 1000;
  if (!anchorMs) return { status: "reject", error: "session.created missing" };
  const expiresAt = new Date(anchorMs + durationDays * 86_400_000).toISOString();

  // B1/B4: insert-or-IGNORE on the unique stripe_session_id. A re-delivered
  // event must never overwrite (and thus never shift) an already-provisioned row.
  const { error: upsertErr } = await admin.from("purchases").upsert(
    {
      user_id: userId,
      package_id: packageId,
      stripe_session_id: session.id,
      payment_intent: piId(session.payment_intent),
      expires_at: expiresAt,
    },
    { onConflict: "stripe_session_id", ignoreDuplicates: true },
  );
  // B1: surface the write failure so Stripe retries — never silently 200.
  if (upsertErr) return { status: "retry", error: `purchase upsert: ${upsertErr.message}` };

  return { status: "ok" };
}

// Revoke access for a refunded/disputed payment by setting expires_at = now().
async function revoke(paymentIntent: string | null, reason: string): Promise<Outcome> {
  if (!paymentIntent) return { status: "ok" }; // nothing to match
  const admin = createSupabaseServiceClient();
  const nowIso = new Date().toISOString();
  const { error } = await admin
    .from("purchases")
    .update({ expires_at: nowIso, revoked_at: nowIso })
    .eq("payment_intent", paymentIntent)
    .is("revoked_at", null);
  if (error) return { status: "retry", error: `revoke (${reason}): ${error.message}` };
  return { status: "ok" };
}

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
    // Consistent response — don't reveal missing-secret vs bad-signature.
    return NextResponse.json({ error: "Invalid request" }, { status: 401 });
  }

  let outcome: Outcome = { status: "ok" };

  switch (event.type) {
    // B2: provision ONLY on confirmed payment. Card payments are "paid" on
    // completed; async methods (SEPA/iDEAL/Klarna — common with locale:"el")
    // are "paid" only on async_payment_succeeded.
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === "paid") {
        outcome = await provision(session);
      }
      break;
    }

    // Async payment never settled / session abandoned — nothing was granted.
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired":
      break;

    // B3: revoke on full refund or dispute.
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      // Only a FULL refund revokes; partial refunds keep access.
      if (charge.refunded === true) {
        outcome = await revoke(piId(charge.payment_intent), "refund");
      }
      break;
    }
    case "charge.dispute.created": {
      const dispute = event.data.object as Stripe.Dispute;
      outcome = await revoke(piId(dispute.payment_intent), "dispute");
      break;
    }

    default:
      break;
  }

  if (outcome.status === "retry") {
    // B1: 500 ⇒ Stripe retries. (WP-E wires Sentry capture here.)
    console.error("webhook transient error:", outcome.error);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }
  if (outcome.status === "reject") {
    // Permanent condition — ack so Stripe stops retrying, but record it.
    console.error("webhook rejected event:", outcome.error);
  }

  return NextResponse.json({ received: true });
}
