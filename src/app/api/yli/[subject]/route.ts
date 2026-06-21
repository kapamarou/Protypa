import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ subject: string }> },
) {
  const { subject } = await params;
  const filename = FILENAMES[subject];
  if (!filename) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const admin = createSupabaseServiceClient();

  // Check visibility setting — refuse if admin hasn't enabled it.
  const { data: setting } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", SETTING_KEYS[subject])
    .maybeSingle();

  if (setting?.value !== "true") {
    return NextResponse.json({ error: "Η ύλη δεν είναι διαθέσιμη αυτή τη στιγμή." }, { status: 403 });
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
