import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { getActivePackages } from "@/lib/entitlements";
import { applyWatermark } from "@/lib/pdf/watermark";
import { captureException } from "@/lib/observability";
import type { ExamPaperKind } from "@/lib/types";

// GET /api/account/exam-paper/[id]?kind=greek-questions
//
// Auth + entitlement-gated download of an exam paper PDF, watermarked with
// the requesting school's trade_name.
//
// kind = one of:
//   greek-questions | math-questions | greek-answers | math-answers
// If omitted, falls back to the legacy `questions_url` column for backward
// compat with any simulation rows that were created before 0017.

// Column-name map for each kind. Matches the schema added in 0017.
const KIND_TO_COLUMN: Record<ExamPaperKind, string> = {
  "greek-questions": "greek_questions_url",
  "math-questions":  "math_questions_url",
  "greek-answers":   "greek_answers_url",
  "math-answers":    "math_answers_url",
};

// Human-readable labels for the download filename suffix.
const KIND_LABEL: Record<ExamPaperKind, string> = {
  "greek-questions": "Θέματα Γλώσσας",
  "math-questions":  "Θέματα Μαθηματικών",
  "greek-answers":   "Απαντήσεις Γλώσσας",
  "math-answers":    "Απαντήσεις Μαθηματικών",
};

function isExamPaperKind(s: string): s is ExamPaperKind {
  return s in KIND_TO_COLUMN;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const kindParam = url.searchParams.get("kind");
  const kind: ExamPaperKind | null =
    kindParam && isExamPaperKind(kindParam) ? kindParam : null;

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  // 1. Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  // 2. Load the simulation row (always select all paper columns; pick the
  //    right one below based on `kind`).
  const { data: sim, error: simErr } = await supabase
    .from("simulations")
    .select(
      "id, title, subject, is_published, questions_url, greek_questions_url, math_questions_url, greek_answers_url, math_answers_url",
    )
    .eq("id", id)
    .maybeSingle();
  if (simErr || !sim || !sim.is_published) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Resolve which file to serve:
  //   • If `kind` was given, read the corresponding column.
  //   • Otherwise fall back to legacy `questions_url`.
  const storagePath: string | null = kind
    ? (sim[KIND_TO_COLUMN[kind] as keyof typeof sim] as string | null)
    : sim.questions_url;
  if (!storagePath) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // 3. Entitlement check — must have an active package. For kind='math-*'
  //    the user needs Math access; for 'greek-*' Greek; legacy (no kind)
  //    falls back to the sim.subject check as before.
  const active = await getActivePackages(user.id);
  const purchasedSubjects = new Set<string>();
  for (const a of active) {
    if (a.pkg.package_type === "parent" || a.pkg.package_type === "school") {
      purchasedSubjects.add("bundle");
    } else if (a.pkg.subject) {
      purchasedSubjects.add(a.pkg.subject);
    }
  }
  const hasBundle = purchasedSubjects.has("bundle");
  const hasGreek = hasBundle || purchasedSubjects.has("greek");
  const hasMath = hasBundle || purchasedSubjects.has("math");
  const kindSubject =
    kind === "greek-questions" || kind === "greek-answers" ? "greek"
    : kind === "math-questions" || kind === "math-answers" ? "math"
    : sim.subject;
  const allowed =
    kindSubject === "greek" ? hasGreek
    : kindSubject === "math" ? hasMath
    : (hasBundle || (hasGreek && hasMath));
  if (!allowed) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // 4. Fetch original PDF bytes via service role (bucket is private)
  const admin = createSupabaseServiceClient();
  const { data: fileBlob, error: dlErr } = await admin
    .storage
    .from("exam-papers")
    .download(storagePath);
  if (dlErr || !fileBlob) {
    return NextResponse.json({ error: "download failed" }, { status: 502 });
  }
  const originalBytes = new Uint8Array(await fileBlob.arrayBuffer());

  // 5. For schools, stamp the trade_name across every page.
  //    For parents, serve raw — the boss's anti-piracy ask was schools-only.
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();
  // E2-D: capture, but keep the SECURE default — on any doubt we treat the user
  // as a school and watermark (never serve a school a raw, un-stamped PDF).
  if (profileErr) {
    captureException(profileErr, { route: "api/exam-paper", extra: { stage: "profile" } });
  }

  let finalBytes: Uint8Array = originalBytes;
  if (profile?.account_type === "school" || !profile?.account_type) {
    const { data: school, error: schoolErr } = await admin
      .from("schools")
      .select("trade_name, legal_name")
      .eq("id", user.id)
      .maybeSingle();
    if (schoolErr) {
      captureException(schoolErr, { route: "api/exam-paper", extra: { stage: "school" } });
    }
    const watermarkText =
      (school?.trade_name?.trim() || school?.legal_name?.trim() || user.email || "")
        .toString()
        .slice(0, 80); // protect against ridiculously long names
    if (watermarkText) {
      try {
        finalBytes = await applyWatermark(originalBytes, watermarkText);
      } catch {
        // If watermarking fails for any reason (corrupt PDF, font issue,
        // etc.), don't block the download — fall back to the raw file.
        finalBytes = originalBytes;
      }
    }
  }

  // 6. Return as a download — include the kind in the filename so users can
  //    tell the four PDFs apart in their downloads folder.
  const titlePart = (sim.title || "exam").replace(/[\\/:*?"<>|]/g, "_");
  const kindPart = kind ? ` — ${KIND_LABEL[kind]}` : "";
  const downloadName = `${titlePart}${kindPart}.pdf`;

  return new NextResponse(finalBytes as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
