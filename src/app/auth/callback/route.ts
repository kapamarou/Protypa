import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

// Handles both email-confirmation links and password-reset links.
// Supabase sends: GET /auth/callback?code=<pkce-code>&next=<destination>
export async function GET(request: NextRequest) {
  const { searchParams, origin: requestOrigin } = new URL(request.url);
  // On Netlify, request.url carries the internal .netlify.app origin even on
  // custom-domain traffic. Use NEXT_PUBLIC_SITE_URL so redirects always land
  // on the canonical domain (protupa.gr) rather than the deploy preview URL.
  const origin = (process.env.NEXT_PUBLIC_SITE_URL ?? requestOrigin).replace(/\/$/, "");
  const code  = searchParams.get("code");
  const type  = searchParams.get("type");
  const nextParam = searchParams.get("next");

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          },
        },
      },
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      let destination: string;

      if (nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")) {
        // Explicit destination wins — used by forgot-password flow. G5: accept
        // only same-origin absolute paths; reject "//evil.com" and absolute
        // URLs so this can never become an open redirect.
        destination = nextParam;
      } else if (type === "recovery") {
        // Supabase password-reset links include type=recovery.
        // Send the user straight to the reset form.
        destination = "/reset-password";
      } else {
        // Regular sign-in: route admins to /admin, everyone else to /account.
        destination = "/account";
        if (data.user) {
          const { data: profile } = await supabase
            .from("profiles").select("is_admin").eq("id", data.user.id).maybeSingle();
          if (profile?.is_admin) destination = "/admin";
        }
      }

      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/signin?error=auth`);
}
