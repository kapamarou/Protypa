import Stripe from "stripe";

// Lazily instantiate so importing this file doesn't crash builds when
// STRIPE_SECRET_KEY is absent (e.g., during local marketing-only dev).
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to .env.local to enable payments.",
    );
  }
  // Pin the API version (WP-B5) so a Stripe dashboard default change can't
  // silently shift event/payload shapes under us. Matches the version this
  // stripe-node major was generated against.
  _stripe = new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
  return _stripe;
}
