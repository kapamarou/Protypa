import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// True iff Supabase env vars are configured. Lets pages render in a
// "not yet configured" mode during initial local setup instead of crashing.
export function isSupabaseConfigured(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// Server-side Supabase client tied to Next.js cookies.
// Returns null if env vars are missing — callers must handle that case.
export async function createSupabaseServerClient() {
  if (!isSupabaseConfigured()) return null;
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a server component — middleware will refresh cookies.
          }
        },
      },
    },
  );
}

// True iff the service-role key is present. Lets routes return a graceful 503
// instead of constructing a broken client.
export function isServiceRoleConfigured(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Service-role client. Bypasses RLS. Only call from trusted server code
// (webhooks, scoring API). Never expose to the browser.
import { createClient } from "@supabase/supabase-js";
export function createSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // G4: guard instead of a non-null assertion, so a missing key fails loudly
  // and clearly rather than silently constructing a client with `undefined`.
  if (!url || !key) {
    throw new Error(
      "createSupabaseServiceClient: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
