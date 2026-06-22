import { NextResponse } from "next/server";
import { createHash } from "crypto";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { getActivePackages } from "@/lib/entitlements";
import { applyWatermark } from "@/lib/pdf/watermark";
import { captureException } from "@/lib/observability";
import { checkRateLimit, tooManyRequests } from "@/lib/ratelimit";
import type { ExamPaperKind } from "@/lib/types";

// Watermark generation can take a few seconds on a cold cache; give it headroom.
export const maxDuration = 60;

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

  // Throttle this expensive endpoint (PDF download + cold-cache watermarking)
  // so a single account can't hammer it with kind/paper permutations.
  const rl = await checkRateLimit(`exam-paper:${user.id}`, 120, 3600);
  if (!rl.allowed) return tooManyRequests();

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

  // Filename so the four PDFs are distinguishable in the downloads folder.
  const titlePart = (sim.title || "exam").replace(/[\\/:*?"<>|]/g, "_");
  const kindPart = kind ? ` — ${KIND_LABEL[kind]}` : "";
  const downloadName = `${titlePart}${kindPart}.pdf`;

  const admin = createSupabaseServiceClient();

  // 4. Are we watermarking? Schools yes; parents (the boss's ask was
  //    schools-only) get the raw file. On any doubt, treat as school (secure
  //    default — never serve a school an un-stamped PDF).
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();
  if (profileErr) {
    captureException(profileErr, { route: "api/exam-paper", extra: { stage: "profile" } });
  }
  const isSchool = profile?.account_type === "school" || !profile?.account_type;

  // Helper: 302 to a short-lived signed URL so the bytes stream from Supabase's
  // CDN, not through this Lambda (F1 — avoids loading whole PDFs into memory).
  async function redirectToSigned(path: string) {
    const { data: signed, error } = await admin.storage
      .from("exam-papers")
      .createSignedUrl(path, 60, { download: downloadName });
    if (error || !signed?.signedUrl) return null;
    return NextResponse.redirect(signed.signedUrl);
  }

  // Parents: serve the original directly.
  if (!isSchool) {
    const res = await redirectToSigned(storagePath);
    if (res) return res;
    return NextResponse.json({ error: "download failed" }, { status: 502 });
  }

  // 5. Schools: stamp the trade_name. Cache the stamped copy per
  //    (school × source file × watermark text) so repeat downloads NEVER
  //    re-render — they just redirect to the cached file (F1).
  const { data: school, error: schoolErr } = await admin
    .from("schools")
    .select("trade_name, legal_name")
    .eq("id", user.id)
    .maybeSingle();
  if (schoolErr) {
    captureException(schoolErr, { route: "api/exam-paper", extra: { stage: "school" } });
  }
  const watermarkText = (
    school?.trade_name?.trim() ||
    school?.legal_name?.trim() ||
    user.email ||
    ""
  )
    .toString()
    .slice(0, 80);

  // No name to stamp (e.g. brand-new school row) — serve the original.
  if (!watermarkText) {
    const res = await redirectToSigned(storagePath);
    if (res) return res;
    return NextResponse.json({ error: "download failed" }, { status: 502 });
  }

  // Cache key includes the source path AND the watermark text, so renaming the
  // trade_name produces a fresh stamped file rather than serving a stale one.
  const fingerprint = createHash("sha1")
    .update(`${storagePath}|${watermarkText}`)
    .digest("hex")
    .slice(0, 16);
  const cachePath = `watermarked/${user.id}/${fingerprint}.pdf`;

  // Cache hit? createSignedUrl errors if the object doesn't exist yet.
  const cached = await redirectToSigned(cachePath);
  if (cached) return cached;

  // Cache miss — generate once: download original, stamp, upload to cache.
  const { data: fileBlob, error: dlErr } = await admin.storage
    .from("exam-papers")
    .download(storagePath);
  if (dlErr || !fileBlob) {
    captureException(dlErr ?? new Error("missing source PDF"), {
      route: "api/exam-paper",
      extra: { stage: "download" },
    });
    return NextResponse.json({ error: "download failed" }, { status: 502 });
  }
  const originalBytes = new Uint8Array(await fileBlob.arrayBuffer());

  let finalBytes: Uint8Array = originalBytes;
  let stamped = false;
  try {
    finalBytes = await applyWatermark(originalBytes, watermarkText);
    stamped = true;
  } catch (e) {
    // Corrupt PDF / font issue — don't block the download; serve raw.
    captureException(e, { route: "api/exam-paper", extra: { stage: "watermark" } });
  }

  if (stamped) {
    const { error: upErr } = await admin.storage
      .from("exam-papers")
      .upload(cachePath, new Blob([finalBytes as BlobPart], { type: "application/pdf" }), {
        contentType: "application/pdf",
        upsert: true,
      });
    if (upErr) {
      // Non-fatal: we still have the bytes to stream this time.
      captureException(upErr, { route: "api/exam-paper", extra: { stage: "cache-upload" } });
    } else {
      const fresh = await redirectToSigned(cachePath);
      if (fresh) return fresh;
    }
  }

  // Fallback: stream the bytes we already have (un-cached) — last resort.
  return new NextResponse(finalBytes as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
