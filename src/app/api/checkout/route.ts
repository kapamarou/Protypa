import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { checkRateLimit, tooManyRequests } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  // 5 checkout attempts per user per hour — prevents Stripe session flooding
  const rl = await checkRateLimit(`checkout:${user.id}`, 5, 3600);
  if (!rl.allowed) return tooManyRequests();

  const { package_id } = await req.json();
  if (!package_id) {
    return NextResponse.json({ error: "missing package_id" }, { status: 400 });
  }

  const { data: pkg } = await supabase
    .from("packages")
    .select("*")
    .eq("id", package_id)
    .single();
  if (!pkg) {
    return NextResponse.json({ error: "package not found" }, { status: 404 });
  }
  // Stripe products / prices haven't been wired yet for this package.
  if (!pkg.stripe_price_id) {
    return NextResponse.json(
      {
        error:
          "Το πακέτο δεν είναι ακόμα διαθέσιμο προς αγορά. Επικοινωνήστε μαζί μας στο info@protupa.gr.",
      },
      { status: 409 },
    );
  }

  // Use a server-controlled base URL — never trust the Origin header from the
  // client, which can be spoofed to redirect users to an attacker-controlled site.
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://protypa.gr").replace(/\/$/, "");
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    locale: "el",
    customer_email: user.email,
    line_items: [{ price: pkg.stripe_price_id, quantity: 1 }],
    success_url: `${siteUrl}/account?purchase=success`,
    cancel_url: `${siteUrl}/paketa`,
    metadata: {
      user_id: user.id,
      package_id: pkg.id,
      duration_days: String(pkg.duration_days),
    },
  });

  return NextResponse.json({ url: session.url });
}
