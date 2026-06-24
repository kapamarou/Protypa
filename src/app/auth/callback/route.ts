import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

// Handles email-confirmation and password-reset links from Supabase.
// Supabase sends one of two formats:
//   PKCE:      ?code=<pkce-code>&type=<type>
//   token_hash: ?token_hash=<hash>&type=recovery  (used in newer email templates)
// We support both so either format works.
export async function GET(request: NextRequest) {
  const { searchParams, origin: requestOrigin } = new URL(request.url);
  // On Netlify, request.url carries the internal .netlify.app origin even on
  // custom-domain traffic. Use NEXT_PUBLIC_SITE_URL so redirects always land
  // on the canonical domain (protupa.gr) rather than the deploy preview URL.
  const origin = (process.env.NEXT_PUBLIC_SITE_URL ?? requestOrigin).replace(/\/$/, "");

  const code       = searchParams.get("code");
  const tokenHash  = searchParams.get("token_hash");
  const type       = searchParams.get("type") as EmailOtpType | null;
  const nextParam  = searchParams.get("next");

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    },
  );

  let user: { id: string } | null = null;
  let verified = false;

  if (tokenHash && type) {
    // Newer Supabase email templates — token_hash flow (no PKCE verifier needed).
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) { verified = true; user = data.user; }
  } else if (code) {
    // PKCE flow — requires the verifier cookie set during resetPasswordForEmail.
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) { verified = true; user = data.user; }
  }

  if (verified) {
    let destination: string;

    if (nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")) {
      // Explicit ?next= wins — accept only same-origin paths; reject "//evil.com"
      // and absolute URLs so this can never be an open redirect.
      destination = nextParam;
    } else if (type === "recovery") {
      destination = "/reset-password";
    } else {
      destination = "/account";
      if (user) {
        const { data: profile } = await supabase
          .from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
        if (profile?.is_admin) destination = "/admin";
      }
    }

    return NextResponse.redirect(`${origin}${destination}`);
  }

  return NextResponse.redirect(`${origin}/signin?error=auth`);
}
