import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return new Response(JSON.stringify({ error: "not configured" }), { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401 });

  const [
    { data: profile },
    { data: school },
    { data: purchases },
    { data: students },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("schools").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("purchases").select("*, packages(name_el, package_type, price_cents)").eq("user_id", user.id),
    // students are owned via school_id (not user_id) — see 0003_students.sql.
    supabase.from("students").select("*").eq("school_id", user.id),
  ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    },
    profile,
    school,
    purchases,
    students,
  };

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="protypa-data-export.json"',
    },
  });
}
