import { createSupabaseServerClient } from "@/lib/supabase/server";
import { el } from "@/lib/i18n/el";
import { formatDate } from "@/lib/format";
import type { GradingSession, ExamPaper } from "@/lib/types";

export default async function HistoryPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("grading_sessions")
    .select("*, exam_papers(title_el)")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(200); // F4: cap history rows.

  const sessions =
    (data as (GradingSession & { exam_papers: Pick<ExamPaper, "title_el"> })[] | null) ?? [];

  return (
    <div>
      <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-ink/40 mb-2">
        {el.account.historyTitle}
      </div>
      <h2 className="font-display text-2xl text-ink mb-6">Ιστορικό Διορθώσεων</h2>

      {sessions.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-ink/15 p-12 flex flex-col items-center text-center gap-4">
          <div className="font-display text-5xl text-ink/10">—</div>
          <p className="text-ink/50 text-sm max-w-xs leading-relaxed">{el.account.noHistory}</p>
        </div>
      ) : (
        <div className="rounded-3xl border border-ink/10 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink/10 bg-[#fafaf8]">
                  <th className="text-left px-6 py-4 text-[10px] font-bold tracking-[0.2em] uppercase text-ink/40">
                    {el.account.date}
                  </th>
                  <th className="text-left px-6 py-4 text-[10px] font-bold tracking-[0.2em] uppercase text-ink/40">
                    {el.account.student}
                  </th>
                  <th className="text-left px-6 py-4 text-[10px] font-bold tracking-[0.2em] uppercase text-ink/40">
                    Θέμα
                  </th>
                  <th className="text-right px-6 py-4 text-[10px] font-bold tracking-[0.2em] uppercase text-ink/40">
                    {el.account.score}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-t border-ink/5 hover:bg-[#fafaf8] transition-colors">
                    <td className="px-6 py-4 text-ink/50 text-xs">{formatDate(s.created_at)}</td>
                    <td className="px-6 py-4 font-display text-base text-ink">{s.student_name ?? "—"}</td>
                    <td className="px-6 py-4 text-ink/70 text-xs">{s.exam_papers?.title_el}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-display text-lg text-[#056ef5]">{s.score}</span>
                      <span className="text-ink/40 text-sm">/{s.total}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
