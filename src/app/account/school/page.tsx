import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAccountType } from "@/lib/entitlements";
import type { Simulation } from "@/lib/types";

interface QuestionStat {
  question_number: number;
  total_students: number;
  wrong_count: number;
  wrong_percentage: number;
}
interface CategoryStat {
  category: string;
  questions_count: number;
  students_count: number;
  wrong_count: number;
  wrong_percentage: number;
}
interface ScoreAvg {
  scope: "national" | "school";
  total_students: number;
  avg_score: number;
}

export const dynamic = "force-dynamic";

export default async function SchoolPage({
  searchParams,
}: {
  searchParams: Promise<{ sim?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Parent accounts don't get school-wide stats — only schools (φροντιστήρια) do.
  const accountType = await getAccountType(user.id);
  if (accountType === "parent") redirect("/account");

  const sp = await searchParams;

  // Sims this school has participated in
  const { data: participations } = await supabase
    .from("school_simulations")
    .select("simulation_id, simulations(*)")
    .eq("school_id", user.id);

  // Supabase types the joined `simulations` as an array even for single FK joins
  const sims = ((participations ?? []) as unknown as { simulations: Simulation | Simulation[] }[])
    .flatMap((p) => Array.isArray(p.simulations) ? p.simulations : (p.simulations ? [p.simulations] : []))
    .sort((a, b) => a.number - b.number);

  // Active sim (URL param ?sim=id, else most recent)
  const selectedSim = sims.find((s) => s.id === sp.sim) ?? sims[sims.length - 1] ?? null;

  // School-wide students count
  const { count: totalStudents } = await supabase
    .from("students")
    .select("*", { count: "exact", head: true })
    .eq("school_id", user.id);

  let questionStats: { school: QuestionStat[]; national: QuestionStat[] } = { school: [], national: [] };
  let categoryStats: { school: CategoryStat[]; national: CategoryStat[] } = { school: [], national: [] };
  let scoreAvg: { school: number | null; national: number | null; schoolN: number; nationalN: number } = {
    school: null, national: null, schoolN: 0, nationalN: 0
  };

  if (selectedSim) {
    const [
      { data: schoolQ },
      { data: nationalQ },
      { data: schoolC },
      { data: nationalC },
      { data: avgs },
    ] = await Promise.all([
      supabase.rpc("get_school_question_stats",   { p_simulation_id: selectedSim.id, p_school_id: user.id }),
      supabase.rpc("get_national_question_stats", { p_simulation_id: selectedSim.id }),
      supabase.rpc("get_school_category_stats",   { p_simulation_id: selectedSim.id, p_school_id: user.id }),
      supabase.rpc("get_national_category_stats", { p_simulation_id: selectedSim.id }),
      supabase.rpc("get_score_averages",          { p_simulation_id: selectedSim.id, p_school_id: user.id }),
    ]);

    questionStats = { school: (schoolQ as QuestionStat[]) ?? [], national: (nationalQ as QuestionStat[]) ?? [] };
    categoryStats = { school: (schoolC as CategoryStat[]) ?? [], national: (nationalC as CategoryStat[]) ?? [] };

    const a = (avgs as ScoreAvg[]) ?? [];
    const schoolRow = a.find((r) => r.scope === "school");
    const nationalRow = a.find((r) => r.scope === "national");
    scoreAvg = {
      school: schoolRow?.avg_score ?? null,
      national: nationalRow?.avg_score ?? null,
      schoolN: Number(schoolRow?.total_students ?? 0),
      nationalN: Number(nationalRow?.total_students ?? 0),
    };
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs text-ink/45">Φροντιστήριο</div>
        <h1 className="font-display text-2xl text-ink mt-1">Συγκριτική ανάλυση</h1>
        <p className="text-sm text-ink/55 mt-1">
          Σύγκριση των μαθητών σας με τον πανελλήνιο μέσο όρο όλων των φροντιστηρίων που χρησιμοποιούν την πλατφόρμα.
        </p>
      </div>

      {/* KPI strip */}
      <div className="border-y border-ink/10 divide-x divide-ink/10 grid grid-cols-2 md:grid-cols-4">
        <Kpi label="Μαθητές" value={totalStudents ?? 0} />
        <Kpi label="Διαγωνίσματα" value={sims.length} />
        <Kpi
          label="Μ.ο. φροντιστηρίου"
          value={scoreAvg.school != null ? scoreAvg.school.toFixed(1) : "—"}
          sub={scoreAvg.schoolN > 0 ? `${scoreAvg.schoolN} βαθμολογίες` : ""}
        />
        <Kpi
          label="Πανελλήνιος μ.ο."
          value={scoreAvg.national != null ? scoreAvg.national.toFixed(1) : "—"}
          sub={scoreAvg.nationalN > 0 ? `${scoreAvg.nationalN} βαθμολογίες πανελλήνια` : ""}
        />
      </div>

      {sims.length === 0 ? (
        <div className="border border-ink/10 rounded-md px-4 py-10 text-center">
          <p className="text-sm text-ink/55">Δεν έχετε συμμετάσχει ακόμα σε κανένα διαγώνισμα.</p>
          <Link href="/account/grading" className="inline-block mt-3 text-xs font-bold text-[#056ef5] hover:text-[#0451b8]">
            Μεταβείτε στα διαγωνίσματα →
          </Link>
        </div>
      ) : (
        <>
          {/* Simulation picker */}
          <div>
            <div className="text-[11px] font-semibold tracking-wider uppercase text-ink/55 mb-3">Επιλέξτε διαγώνισμα</div>
            <div className="flex flex-wrap gap-2">
              {sims.map((s) => (
                <Link key={s.id}
                  href={`/account/school?sim=${s.id}`}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                    selectedSim?.id === s.id
                      ? "bg-[#c8ff00] text-ink border-[#c8ff00]"
                      : "border-ink/15 text-ink/70 hover:border-ink/30"
                  }`}>
                  Δ{s.number}
                </Link>
              ))}
            </div>
            {selectedSim && (
              <div className="text-xs text-ink/55 mt-3">
                <span className="font-semibold text-ink/80">{selectedSim.title}</span>
                {selectedSim.exam_date && (
                  <span className="ml-2">· Εξέταση: {new Date(selectedSim.exam_date).toLocaleDateString("el-GR", { day: "2-digit", month: "long", year: "numeric" })}</span>
                )}
              </div>
            )}
          </div>

          {/* Per-category comparison */}
          {categoryStats.national.length > 0 && (
            <section>
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-[11px] font-semibold tracking-wider uppercase text-ink/55">Σύγκριση ανά κατηγορία ερώτησης</h2>
                <span className="text-[11px] text-ink/45">% λάθος απαντήσεων</span>
              </div>
              <div className="border border-ink/10 rounded-md divide-y divide-ink/8">
                {categoryStats.national.map((nat) => {
                  const sch = categoryStats.school.find((s) => s.category === nat.category);
                  const schoolPct = sch?.wrong_percentage ?? 0;
                  const nationalPct = nat.wrong_percentage;
                  const diff = schoolPct - nationalPct;
                  const aheadOfNational = diff < 0; // lower wrong % = better
                  return (
                    <CategoryRow
                      key={nat.category}
                      category={nat.category}
                      schoolPct={schoolPct}
                      nationalPct={nationalPct}
                      aheadOfNational={aheadOfNational}
                      diff={diff}
                    />
                  );
                })}
              </div>
              <p className="text-[11px] text-ink/40 mt-2 text-right">
                Μπλε ράβδος = το φροντιστήριό σας · Γκρι = πανελλήνιος μ.ο.
              </p>
            </section>
          )}

          {/* Per-question comparison */}
          {questionStats.national.length > 0 && (
            <section>
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-[11px] font-semibold tracking-wider uppercase text-ink/55">Σύγκριση ανά ερώτηση</h2>
                <span className="text-[11px] text-ink/45">{questionStats.national.length} ερωτήσεις</span>
              </div>
              <div className="border border-ink/10 rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#fafaf8] border-b border-ink/10">
                      <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink/55 w-16">Ερώτηση</th>
                      <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink/55">Φροντιστήριο</th>
                      <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink/55">Πανελλήνια</th>
                      <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink/55 w-24">Διαφορά</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/8">
                    {questionStats.national.map((nat) => {
                      const sch = questionStats.school.find((s) => s.question_number === nat.question_number);
                      const schoolPct = sch?.wrong_percentage ?? 0;
                      const nationalPct = nat.wrong_percentage;
                      const diff = Number((schoolPct - nationalPct).toFixed(1));
                      return (
                        <tr key={nat.question_number} className="row-hover">
                          <td className="px-3 py-2 text-xs text-ink/55 tabular">Ε{nat.question_number}</td>
                          <td className="px-3 py-2 text-right text-sm tabular text-ink">{schoolPct.toFixed(1)}%</td>
                          <td className="px-3 py-2 text-right text-sm tabular text-ink/55">{nationalPct.toFixed(1)}%</td>
                          <td className="px-3 py-2 text-right text-xs tabular font-semibold">
                            <span className={diff < 0 ? "text-green-700" : diff > 0 ? "text-red-600" : "text-ink/40"}>
                              {diff > 0 ? "+" : ""}{diff.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-ink/40 mt-2 text-right">
                Αρνητική διαφορά = το φροντιστήριο σας τα πάει καλύτερα από τον μ.ο.
              </p>
            </section>
          )}

          {questionStats.national.length === 0 && (
            <div className="border border-ink/10 rounded-md px-4 py-10 text-center">
              <p className="text-sm text-ink/55">Δεν υπάρχουν ακόμα συγκριτικά δεδομένα για αυτό το διαγώνισμα.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="px-4 py-4 first:pl-0">
      <div className="text-[11px] text-ink/50">{label}</div>
      <div className="font-display text-2xl text-ink mt-1 tabular">{value}</div>
      {sub && <div className="text-[11px] text-ink/45 mt-0.5">{sub}</div>}
    </div>
  );
}

function CategoryRow({ category, schoolPct, nationalPct, aheadOfNational, diff }: {
  category: string; schoolPct: number; nationalPct: number; aheadOfNational: boolean; diff: number;
}) {
  const max = Math.max(schoolPct, nationalPct, 10); // ensure bars have some width
  const schoolBarPct = (schoolPct / max) * 100;
  const nationalBarPct = (nationalPct / max) * 100;
  return (
    <div className="row-hover px-4 py-3">
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-sm text-ink font-medium">{category}</div>
        <div className="text-xs tabular">
          <span className={`font-semibold ${aheadOfNational ? "text-green-700" : diff > 0 ? "text-red-600" : "text-ink/55"}`}>
            {diff > 0 ? "+" : ""}{diff.toFixed(1)}%
          </span>
          <span className="text-ink/40 ml-1">vs μ.ο.</span>
        </div>
      </div>
      {/* School bar */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] tabular text-ink/55 w-14">Δικό σας</span>
        <div className="flex-1 h-2 rounded bg-ink/8 overflow-hidden">
          <div className="h-full rounded bg-[#056ef5]" style={{ width: `${schoolBarPct}%` }} />
        </div>
        <span className="text-[11px] tabular text-ink font-semibold w-12 text-right">{schoolPct.toFixed(1)}%</span>
      </div>
      {/* National bar */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] tabular text-ink/55 w-14">Πανελλήνια</span>
        <div className="flex-1 h-2 rounded bg-ink/8 overflow-hidden">
          <div className="h-full rounded bg-ink/40" style={{ width: `${nationalBarPct}%` }} />
        </div>
        <span className="text-[11px] tabular text-ink/55 w-12 text-right">{nationalPct.toFixed(1)}%</span>
      </div>
    </div>
  );
}
