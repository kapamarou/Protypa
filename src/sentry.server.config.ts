import * as Sentry from "@sentry/nextjs";

// DSN-gated: with no SENTRY_DSN set, Sentry.init is never called and the SDK is
// completely inert (no network, no overhead). The owner adds SENTRY_DSN in
// Netlify env to turn it on — see .env.example.
const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    // Never attach IPs, cookies, or request bodies — protects student PII and
    // exam answer keys from leaking into error reports.
    sendDefaultPii: false,
  });
}
