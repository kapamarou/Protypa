import type { Instrumentation } from "next";
import * as Sentry from "@sentry/nextjs";

// Next.js calls register() once per server instance. Load the runtime-specific
// Sentry init lazily so node-only code never gets bundled into the edge runtime.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  } else if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Capture unhandled server errors (Server Components, route handlers, etc.).
// No-op when Sentry isn't initialised (no DSN).
export const onRequestError: Instrumentation.onRequestError =
  Sentry.captureRequestError;
