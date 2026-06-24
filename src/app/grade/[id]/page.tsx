import Link from "next/link";
import { redirect } from "next/navigation";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { hasAccessToPaper } from "@/lib/entitlements";
import { el } from "@/lib/i18n/el";
import type { ClientQuestion } from "@/lib/types";
import { GradingClient } from "./GradingClient";

export default async function GradePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect(`/signin?next=/grade/${id}`);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/signin?next=/grade/${id}`);

  const allowed = await hasAccessToPaper(user.id, id);
  if (!allowed) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-brand-dark">
          {el.grading.accessDenied}
        </h1>
        <Link
          href="/paketa"
          className="inline-block mt-6 px-5 py-2.5 rounded-md bg-[#FDFFFC] text-[#7c00d0] border-2 border-[#7c00d0] font-medium hover:bg-[#7c00d0]/5"
        >
          {el.grading.accessDeniedCta}
        </Link>
      </div>
    );
  }

  const { data: paper } = await supabase
    .from("exam_papers")
    .select("*")
    .eq("id", id)
    .single();
  // SECURITY (WP-C1): select ONLY the fields the client needs. Never select
  // `correct_answer` here — `questions` is passed to a "use client" component,
  // so any selected column is serialized into the RSC payload and readable in
  // DevTools before answering. Scoring re-fetches the key server-side in /api/grade.
  const { data: questions } = await supabase
    .from("questions")
    .select("id, number, qtype, prompt_el, choices")
    .eq("paper_id", id)
    .order("number", { ascending: true });

  // Mint a short-lived signed URL server-side so the iframe loads immediately.
  // NOTE: this is the orphaned legacy grading path (see docs/LEGACY_GRADING.md).
  let pdfUrl: string | null = null;
  if (paper) {
    const admin = createSupabaseServiceClient();
    const { data: signed } = await admin.storage
      .from("exam-pdfs")
      .createSignedUrl(paper.pdf_path, 60 * 30);
    pdfUrl = signed?.signedUrl ?? null;
  }

  return (
    <GradingClient
      paperId={id}
      paperTitle={paper?.title_el ?? ""}
      pdfUrl={pdfUrl}
      questions={(questions as ClientQuestion[]) ?? []}
    />
  );
}
