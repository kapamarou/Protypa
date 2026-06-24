import * as Sentry from "@sentry/nextjs";

interface CaptureContext {
  /** Short route/operation tag, e.g. "api/webhook". */
  route?: string;
  /** Safe, non-PII metadata only. NEVER pass student data or answer keys. */
  extra?: Record<string, unknown>;
}

// Single entry point for reporting server-side errors. Sends to Sentry when a
// DSN is configured (otherwise a harmless no-op), and ALWAYS logs locally so the
// error is visible in Netlify function logs regardless of Sentry setup.
export function captureException(error: unknown, context?: CaptureContext): void {
  try {
    Sentry.captureException(error, {
      tags: context?.route ? { route: context.route } : undefined,
      extra: context?.extra,
    });
  } catch {
    // Observability must never throw and mask the original error.
  }
  console.error(`[${context?.route ?? "app"}]`, error);
}
