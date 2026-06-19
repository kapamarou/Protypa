import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

// Handles both email-confirmation links and password-reset links.
// Supabase sends: GET /auth/callback?code=<pkce-code>&next=<destination>
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
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

      if (nextParam) {
        // Explicit destination wins — used by forgot-password flow.
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
