import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { getActivePackages } from "@/lib/entitlements";
import { checkRateLimit, tooManyRequests } from "@/lib/ratelimit";

const FILENAMES: Record<string, string> = {
  greek:       "Ύλη Γλώσσας.pdf",
  math:        "Ύλη Μαθηματικών.pdf",
  apodesmeusi: "Σύσταση Αποδέσμευσης Θεμάτων.pdf",
};

const SETTING_KEYS: Record<string, string> = {
  greek:       "yli_greek_visible",
  math:        "yli_math_visible",
  apodesmeusi: "yli_apodesmeusi_visible",
};

// Which subject entitlement each download requires. "any" = any active package.
const REQUIRED_SUBJECT: Record<string, "greek" | "math" | "any"> = {
  greek:       "greek",
  math:        "math",
  apodesmeusi: "any",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ subject: string }> },
) {
  const { subject } = await params;
  const filename = FILENAMES[subject];
  if (!filename) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // ── Authn ────────────────────────────────────────────────────────────────
  // WP-A2: this route mints a service-role signed URL to a PRIVATE bucket.
  // It must never serve an anonymous visitor. Require a logged-in user, then
  // a valid entitlement (or admin), then the admin visibility toggle.
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  // Throttle signed-URL minting per user.
  const rl = await checkRateLimit(`yli:${user.id}`, 60, 3600);
  if (!rl.allowed) return tooManyRequests();

  // ── Authz: active entitlement for the subject, or admin ────────────────────
  const [{ data: profile }, active] = await Promise.all([
    supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle(),
    getActivePackages(user.id),
  ]);
  const isAdmin = profile?.is_admin === true;

  if (!isAdmin) {
    // v2 packages (parent / school-tier-*) bundle both subjects.
    const subjects = new Set<string>();
    for (const a of active) {
      if (a.pkg.package_type === "parent" || a.pkg.package_type === "school") {
        subjects.add("bundle");
      } else if (a.pkg.subject) {
        subjects.add(a.pkg.subject);
      }
    }
    const hasBundle = subjects.has("bundle");
    const need = REQUIRED_SUBJECT[subject];
    const entitled =
      need === "any"
        ? active.length > 0
        : hasBundle || subjects.has(need);
    if (!entitled) {
      return NextResponse.json(
        { error: "Απαιτείται ενεργό πακέτο." },
        { status: 403 },
      );
    }
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  const admin = createSupabaseServiceClient();

  // ── Admin visibility toggle (applies to entitled customers, not admins) ────
  if (!isAdmin) {
    const { data: setting } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", SETTING_KEYS[subject])
      .maybeSingle();

    if (setting?.value !== "true") {
      return NextResponse.json(
        { error: "Η ύλη δεν είναι διαθέσιμη αυτή τη στιγμή." },
        { status: 403 },
      );
    }
  }

  const { data, error } = await admin.storage
    .from("exam-papers")
    .createSignedUrl(`yli/${subject}.pdf`, 3600, { download: filename });

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: "Η ύλη δεν έχει ανέβει ακόμα." },
      { status: 404 },
    );
  }

  return NextResponse.redirect(data.signedUrl);
}
