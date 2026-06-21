import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";

export async function PATCH(req: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { package_id, stripe_price_id } = await req.json();
  if (!package_id) return NextResponse.json({ error: "missing package_id" }, { status: 400 });

  const priceId = (stripe_price_id ?? "").trim();
  if (priceId && !/^price_/.test(priceId)) {
    return NextResponse.json(
      { error: "Το Stripe Price ID πρέπει να αρχίζει με price_" },
      { status: 422 },
    );
  }

  const admin = createSupabaseServiceClient();
  const { error } = await admin
    .from("packages")
    .update({ stripe_price_id: priceId || null })
    .eq("id", package_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
