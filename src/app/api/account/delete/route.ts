import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { checkRateLimit, tooManyRequests } from "@/lib/ratelimit";

export async function DELETE() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // Self-deletion only (deletes the caller's own account). Throttle anyway.
  const rl = await checkRateLimit(`account-delete:${user.id}`, 5, 3600);
  if (!rl.allowed) return tooManyRequests();

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Σφάλμα διακομιστή." }, { status: 503 });
  }

  const admin = createSupabaseServiceClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("account delete error:", error.message);
    return NextResponse.json({ error: "Αποτυχία διαγραφής. Δοκιμάστε ξανά." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
