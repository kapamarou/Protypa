import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { hasAccessToPaper } from "@/lib/entitlements";
import { scoreAnswers } from "@/lib/grading";
import { checkRateLimit, tooManyRequests } from "@/lib/ratelimit";
import type { Question } from "@/lib/types";

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

  const { paper_id, student_name, answers } = await req.json();
  if (!paper_id || typeof answers !== "object" || answers === null) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const allowed = await hasAccessToPaper(user.id, paper_id);
  if (!allowed) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Server is the only authority on scoring — re-fetch questions, never trust the client.
  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("paper_id", paper_id)
    .order("number", { ascending: true });
  if (!questions || questions.length === 0) {
    return NextResponse.json({ error: "no questions" }, { status: 404 });
  }

  const result = scoreAnswers(questions as Question[], answers);

  const admin = createSupabaseServiceClient();
  await admin.from("grading_sessions").insert({
    user_id: user.id,
    paper_id,
    student_name: student_name || null,
    answers,
    score: result.score,
    total: result.total,
    type_breakdown: result.type_breakdown,
  });

  return NextResponse.json(result);
}
