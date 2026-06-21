import { createSupabaseServiceClient } from "./supabase/server"

/**
 * Checks (and increments) a sliding-window rate limit stored in Supabase.
 * Always fails open — if the DB call errors, the request is allowed through
 * rather than blocking legitimate users.
 *
 * @param key           Unique key, e.g. "ai-summary:user-uuid" or "contact:1.2.3.4"
 * @param max           Maximum allowed calls within the window
 * @param windowSeconds Window length in seconds
 */
export async function checkRateLimit(
  key: string,
  max: number,
  windowSeconds: number,
): Promise<{ allowed: boolean }> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { allowed: true }
  }
  try {
    const admin = createSupabaseServiceClient()
    const { data: count, error } = await admin.rpc("increment_rate_limit", {
      p_key: key,
      p_max: max,
      p_window_seconds: windowSeconds,
    })
    if (error) {
      console.error("rate limit rpc error:", error.message)
      return { allowed: true }
    }
    return { allowed: (count as number) <= max }
  } catch {
    return { allowed: true }
  }
}

/** Standard 429 response with Greek error message. */
export function tooManyRequests(): Response {
  return new Response(
    JSON.stringify({ error: "Πάρα πολλά αιτήματα. Δοκιμάστε ξανά σε λίγο." }),
    {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": "60" },
    },
  )
}
