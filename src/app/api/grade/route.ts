import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { z } from "zod";
import { hasAccessToPaper } from "@/lib/entitlements";
import { scoreAnswers } from "@/lib/grading";
import { checkRateLimit, tooManyRequests } from "@/lib/ratelimit";
import { captureException } from "@/lib/observability";
import type { Question } from "@/lib/types";

const bodySchema = z.object({
  paper_id: z.string().uuid(),
  student_name: z.string().max(100).nullish(),
  answers: z.record(z.string(), z.string()),
});

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

  // 60 grading sessions per user per 10 minutes
  const rl = await checkRateLimit(`grade:${user.id}`, 60, 600);
  if (!rl.allowed) return tooManyRequests();

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const { paper_id, student_name, answers } = parsed.data;

  const allowed = await hasAccessToPaper(user.id, paper_id);
  if (!allowed) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Server is the only authority on scoring — re-fetch questions, never trust the client.
  const { data: questions, error: qErr } = await supabase
    .from("questions")
    .select("*")
    .eq("paper_id", paper_id)
    .order("number", { ascending: true });
  // E2-B: a DB error is a 5xx, not a misleading 404 ("paper has no questions").
  if (qErr) {
    captureException(qErr, { route: "api/grade", extra: { stage: "fetch-questions" } });
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
  if (!questions || questions.length === 0) {
    return NextResponse.json({ error: "no questions" }, { status: 404 });
  }

  const result = scoreAnswers(questions as Question[], answers);

  const admin = createSupabaseServiceClient();
  const { error: insErr } = await admin.from("grading_sessions").insert({
    user_id: user.id,
    paper_id,
    student_name: student_name || null,
    answers,
    score: result.score,
    total: result.total,
    type_breakdown: result.type_breakdown,
  });
  // Don't silently lose a graded result — report the failure.
  if (insErr) {
    captureException(insErr, { route: "api/grade", extra: { stage: "persist-grade" } });
    return NextResponse.json({ error: "could not save result" }, { status: 500 });
  }

  return NextResponse.json(result);
}
