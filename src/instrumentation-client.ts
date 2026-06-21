import * as Sentry from "@sentry/nextjs";

// Client-side error monitoring. DSN-gated via the public env var — inert (no
// network, minimal overhead) until NEXT_PUBLIC_SENTRY_DSN is set in Netlify.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    // No session replay / no PII — keep the bundle light and the data clean.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    sendDefaultPii: false,
  });
}
