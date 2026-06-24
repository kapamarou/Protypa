-- 0030 — Payment-intent tracking + revocation on purchases (WP-B3)
--
-- The webhook only handled checkout.session.completed and could never revoke a
-- purchase after a refund or dispute. To revoke, we must be able to find the
-- purchase row from a charge.refunded / charge.dispute.created event, whose only
-- link back to us is the Stripe PaymentIntent. We therefore:
--   • store payment_intent on provision (indexed for refund lookups)
--   • record revoked_at for audit (revocation itself sets expires_at = now() so
--     every existing entitlement check — getActivePackages and the exam_papers /
--     questions RLS policies that test `expires_at > now()` — stops granting
--     access immediately, with no further schema changes).

alter table purchases
  add column if not exists payment_intent text,
  add column if not exists revoked_at     timestamptz;

create index if not exists purchases_payment_intent_idx
  on purchases (payment_intent);
