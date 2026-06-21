import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getActivePackages } from "@/lib/entitlements";
import type { Simulation, SchoolSimulation, ExamPaperKind } from "@/lib/types";

export default async function GradingListPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <GradingPreview />;

  const now = new Date().toISOString();

  const [{ data: simulations }, { data: myParticipations }, active, { data: yliSettings }] = await Promise.all([
    supabase.from("simulations").select("*").eq("is_published", true).order("number"),
    supabase.from("school_simulations").select("*").eq("school_id", user.id),
    getActivePackages(user.id),
    supabase.from("app_settings").select("key, value").in("key", ["yli_greek_visible", "yli_math_visible"]),
  ]);

  const sims = (simulations as Simulation[]) ?? [];
  const participationMap = new Map(((myParticipations as SchoolSimulation[]) ?? []).map((p) => [p.simulation_id, p]));

  // Build the set of subjects this user has paid access to.
  // v2 packages (parent / school-tier-*) include both Γλώσσα and Μαθηματικά,
  // so they count as the bundle.
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

  function hasAccess(simSubject: string): boolean {
    if (simSubject === "bundle") return hasBundle || (hasGreek && hasMath);
    if (simSubject === "greek")  return hasGreek;
    if (simSubject === "math")   return hasMath;
    return false;
  }

  const yliMap = Object.fromEntries((yliSettings ?? []).map((r) => [r.key, r.value === "true"]));
  const yliGreekVisible = yliMap["yli_greek_visible"] ?? false;
  const yliMathVisible  = yliMap["yli_math_visible"]  ?? false;

  return (
    <GradingView
      sims={sims}
      participationMap={participationMap}
      now={now}
      hasAccess={hasAccess}
      yliGreekVisible={yliGreekVisible}
      yliMathVisible={yliMathVisible}
    />
  );
}

// ─── View ────────────────────────────────────────────────────────────────────

function GradingView({ sims, participationMap, now, isPreview = false, hasAccess = () => true, yliGreekVisible = false, yliMathVisible = false }: {
  sims: Simulation[]; participationMap: Map<string, SchoolSimulation>;
  now: string; isPreview?: boolean;
  hasAccess?: (simSubject: string) => boolean;
  yliGreekVisible?: boolean;
  yliMathVisible?: boolean;
}) {
  const available = sims.filter((s) => s.unlocks_at && s.unlocks_at <= now);
  const submitted = sims.filter((s) => participationMap.get(s.id)?.is_submitted);
  const pending = available.filter((s) => !participationMap.get(s.id)?.is_submitted && (!s.grading_closes_at || s.grading_closes_at > now));
  const locked = sims.length - available.length;

  const nextDeadline = pending
    .filter((s) => s.grading_closes_at)
    .sort((a, b) => (a.grading_closes_at ?? "").localeCompare(b.grading_closes_at ?? ""))[0];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="text-xs text-ink/45">Βαθμολόγηση</div>
        <h1 className="font-display text-2xl text-ink mt-1">Διαγωνίσματα</h1>
        <p className="text-sm text-ink/55 mt-1">Ύλη, θέματα και καταχώρηση απαντήσεων ανά διαγώνισμα.</p>
      </div>

      {/* Ύλη download buttons — only shown when admin has enabled visibility */}
      {(yliGreekVisible || yliMathVisible) && (
        <div className="grid sm:grid-cols-2 gap-3">
          {yliGreekVisible && (
            <a
              href="/api/yli/greek"
              className="group flex items-center gap-4 px-5 py-4 rounded-2xl bg-[#7c00d0] hover:bg-[#6500b0] transition-colors !text-white"
            >
              <span className="w-10 h-10 rounded-xl bg-white/15 grid place-items-center flex-shrink-0 group-hover:bg-white/20 transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold tracking-[0.18em] uppercase opacity-80">
                  Ετήσιος προτεινόμενος προγραμματισμός
                </div>
                <div className="font-display text-lg leading-tight mt-0.5">Γλώσσα</div>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-white/15 px-2.5 py-1 rounded-full group-hover:bg-white/20 transition-colors">
                PDF ↓
              </span>
            </a>
          )}

          {yliMathVisible && (
            <a
              href="/api/yli/math"
              className="group flex items-center gap-4 px-5 py-4 rounded-2xl bg-[#056ef5] hover:bg-[#0451b8] transition-colors !text-white"
            >
              <span className="w-10 h-10 rounded-xl bg-white/15 grid place-items-center flex-shrink-0 group-hover:bg-white/20 transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold tracking-[0.18em] uppercase opacity-80">
                  Ετήσιος προτεινόμενος προγραμματισμός
                </div>
                <div className="font-display text-lg leading-tight mt-0.5">Μαθηματικά</div>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-white/15 px-2.5 py-1 rounded-full group-hover:bg-white/20 transition-colors">
                PDF ↓
              </span>
            </a>
          )}
        </div>
      )}

      {/* KPI strip — dividers with brand color accents */}
      {sims.length > 0 && (
        <div className="border-y border-ink/10 divide-x divide-ink/10 grid grid-cols-2 md:grid-cols-4">
          <Kpi label="Σύνολο"       value={sims.length}       color="#056ef5" />
          <Kpi label="Διαθέσιμα"    value={available.length}  color="#10b981" />
          <Kpi label="Υποβλήθηκαν" value={submitted.length} color="#7c00d0" />
          <Kpi label="Κλειδωμένα"   value={locked}            color="#94a3b8" />
        </div>
      )}

      {/* Next deadline notice */}
      {nextDeadline && <DeadlineNotice sim={nextDeadline} isPreview={isPreview} />}

      {sims.length === 0 ? (
        <div className="border border-ink/10 rounded-md px-4 py-12 text-center">
          <p className="text-sm text-ink/50">Δεν υπάρχουν ακόμα δημοσιευμένα Διαγωνίσματα.</p>
          <p className="text-xs text-ink/40 mt-2">Θα ειδοποιηθείτε με email όταν ξεκλειδωθεί το πρώτο.</p>
        </div>
      ) : (
        <SimulationsTable sims={sims} participationMap={participationMap} now={now} isPreview={isPreview} hasAccess={hasAccess} />
      )}

      {isPreview && (
        <p className="text-xs text-ink/40 pt-4 border-t border-ink/8">
          Προεπισκόπηση με δείγματα δεδομένων. Συνδεθείτε για πραγματικά Διαγωνίσματα.
        </p>
      )}
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="px-4 py-4 first:pl-0">
      <div className="text-[11px] text-ink/50">{label}</div>
      <div
        className="font-display text-2xl mt-1 tabular"
        style={{ color: color ?? "var(--color-ink)" }}
      >
        {value}
      </div>
    </div>
  );
}

function DeadlineNotice({ sim, isPreview }: { sim: Simulation; isPreview: boolean }) {
  if (!sim.grading_closes_at) return null;
  const diff = new Date(sim.grading_closes_at).getTime() - Date.now();
  const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  const hours = Math.max(0, Math.floor((diff / (1000 * 60 * 60)) % 24));
  const urgent = days < 3;
  const href = isPreview ? "/account/grading/preview" : `/account/grading/${sim.id}`;

  if (urgent) {
    const timeLeft =
      days > 0
        ? `${days} ${days === 1 ? "ημέρα" : "ημέρες"}${hours > 0 ? ` και ${hours}${hours === 1 ? " ώρα" : " ώρες"}` : ""}`
        : hours > 0
        ? `${hours} ${hours === 1 ? "ώρα" : "ώρες"}`
        : "λιγότερο από 1 ώρα";

    return (
      <Link
        href={href}
        className="block bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors group"
        style={{ boxShadow: "0 12px 32px -10px rgba(220, 38, 38, 0.55)" }}
      >
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-11 h-11 rounded-full bg-white/15 grid place-items-center flex-shrink-0 ring-2 ring-white/30">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] bg-white text-red-600 px-2 py-0.5 rounded-sm">
                  Επείγον
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/85">
                  Στατιστικά κλείνουν σύντομα
                </span>
              </div>
              <div className="text-base font-bold leading-tight truncate">{sim.title}</div>
              <div className="text-sm text-white/85 mt-0.5">
                Απομένουν <span className="font-bold tabular">{timeLeft}</span> για να συμπεριληφθούν στα στατιστικά
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 text-xs font-black uppercase tracking-wider bg-white text-red-600 px-5 py-2.5 rounded-full group-hover:translate-x-0.5 transition-transform whitespace-nowrap">
            Βαθμολόγηση →
          </div>
        </div>
      </Link>
    );
  }

  // Calm state — for far-away deadlines
  return (
    <div className="flex items-center justify-between gap-4 border-l-2 border-[#056ef5] bg-[#056ef5]/4 px-4 py-3 rounded-r-md">
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#056ef5]">
          Στατιστικά κλείνουν
        </div>
        <div className="text-sm text-ink mt-0.5 truncate">{sim.title}</div>
        <div className="text-xs text-ink/55 mt-0.5">
          {days === 0 ? "σήμερα" : days === 1 ? "σε 1 ημέρα" : `σε ${days} ημέρες`}
        </div>
      </div>
      <Link href={href} className="flex-shrink-0 text-xs font-bold text-[#056ef5] hover:text-[#0451b8] whitespace-nowrap">
        Έναρξη →
      </Link>
    </div>
  );
}

// ─── Table ───────────────────────────────────────────────────────────────────

function SimulationsTable({ sims, participationMap, now, isPreview, hasAccess }: {
  sims: Simulation[]; participationMap: Map<string, SchoolSimulation>;
  now: string; isPreview: boolean;
  hasAccess: (simSubject: string) => boolean;
}) {
  return (
    <div className="border border-ink/10 rounded-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/10 bg-[#fafaf8]">
              <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink/55 w-12">#</th>
              <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink/55">Διαγώνισμα</th>
              <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink/55 text-center min-w-[150px]">Θέματα</th>
              <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink/55 text-center min-w-[150px] hidden sm:table-cell">Απαντήσεις</th>
              <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink/55 text-right hidden md:table-cell">Συμμετοχή</th>
              <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink/55 text-right hidden md:table-cell">Στατιστικά</th>
              <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink/55 text-right">Κατάσταση</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/8">
            {sims.map((sim) => {
              const p = participationMap.get(sim.id);
              const closed = sim.grading_closes_at && sim.grading_closes_at <= now;
              const submitted = p?.is_submitted;

              return (
                <tr key={sim.id} className="row-hover text-ink">
                  <td className="px-3 py-3 tabular text-xs text-ink/60">{sim.number}</td>
                  <td className="px-3 py-3">
                    <div className="text-sm text-ink leading-tight">{sim.title}</div>
                    {sim.exam_date && (
                      <div className="text-[11px] text-ink/45 mt-0.5">
                        {new Date(sim.exam_date).toLocaleDateString("el-GR", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <PaperPair
                      simId={sim.id}
                      kind="questions"
                      greekUrl={sim.greek_questions_url}
                      mathUrl={sim.math_questions_url}
                      legacyUrl={sim.questions_url}
                      canAccess={hasAccess(sim.subject)}
                    />
                  </td>
                  <td className="px-3 py-3 text-center hidden sm:table-cell">
                    <PaperPair
                      simId={sim.id}
                      kind="answers"
                      greekUrl={sim.greek_answers_url}
                      mathUrl={sim.math_answers_url}
                      legacyUrl={null}
                      canAccess={hasAccess(sim.subject)}
                    />
                  </td>
                  <td className="px-3 py-3 text-right hidden md:table-cell">
                    {p?.student_count != null ? (
                      <span className="text-sm tabular">{p.student_count}</span>
                    ) : <span className="text-xs text-ink/30">—</span>}
                  </td>
                  <td className="px-3 py-3 text-right hidden md:table-cell">
                    <StatsWindowCell closesAt={sim.grading_closes_at} now={now} />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="inline-flex items-center justify-end gap-3">
                      <StatusCell
                        sim={sim}
                        submitted={!!submitted}
                        closed={!!closed}
                        p={p}
                        isPreview={isPreview}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Download chips ──────────────────────────────────────────────────────────
// Two small subject-colored chips (Γ / Μ) per column — one column for Θέματα,
// one for Απαντήσεις. Each chip downloads the watermarked PDF for that paper.

function PaperPair({ simId, kind, greekUrl, mathUrl, legacyUrl, canAccess }: {
  simId: string;
  kind: "questions" | "answers";
  greekUrl: string | null;
  mathUrl: string | null;
  // Only set for the "questions" column — surfaces the pre-0017 combined PDF
  // if no Greek / Math questions have been uploaded yet.
  legacyUrl: string | null;
  canAccess: boolean;
}) {
  // Nothing uploaded for either subject + no legacy fallback either.
  if (!greekUrl && !mathUrl && !legacyUrl) {
    return <span className="text-xs text-ink/25" title="Δεν έχει αναρτηθεί">—</span>;
  }

  // No active package → both chips show as locked (single lock icon to keep
  // the cell compact).
  if (!canAccess) {
    return (
      <span
        title="Απαιτείται αγορά του αντίστοιχου πακέτου"
        className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs text-ink/35 cursor-not-allowed"
        aria-label="Locked"
      >
        🔒
      </span>
    );
  }

  // Legacy fallback: pre-0017 simulations only have `questions_url`. Show one
  // generic chip in the questions column.
  if (kind === "questions" && !greekUrl && !mathUrl && legacyUrl) {
    return (
      <PaperChip
        simId={simId}
        kind={null}
        label="Διαγώνισμα"
        title="Θέματα διαγωνίσματος (legacy)"
        subject="legacy"
        available
      />
    );
  }

  const greekKind: ExamPaperKind = kind === "questions" ? "greek-questions" : "greek-answers";
  const mathKind: ExamPaperKind  = kind === "questions" ? "math-questions"  : "math-answers";

  return (
    <div className="inline-flex flex-col sm:flex-row items-center justify-center gap-1.5">
      <PaperChip
        simId={simId}
        kind={greekKind}
        label="Γλώσσα"
        title={`${kind === "questions" ? "Θέματα" : "Απαντήσεις"} Γλώσσας`}
        subject="greek"
        available={!!greekUrl}
      />
      <PaperChip
        simId={simId}
        kind={mathKind}
        label="Μαθηματικά"
        title={`${kind === "questions" ? "Θέματα" : "Απαντήσεις"} Μαθηματικών`}
        subject="math"
        available={!!mathUrl}
      />
    </div>
  );
}

function PaperChip({ simId, kind, label, title, subject, available }: {
  simId: string;
  // null kind → use the legacy `questions_url` (no query param on the URL).
  kind: ExamPaperKind | null;
  label: string;
  title: string;
  subject: "greek" | "math" | "legacy";
  available: boolean;
}) {
  // Pill button — short text label, color-coded by subject. Includes a small
  // download arrow so it visually reads as a downloadable file.
  const base = "inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider whitespace-nowrap border transition-colors";

  if (!available) {
    return (
      <span
        title="Δεν έχει αναρτηθεί ακόμα"
        className={`${base} border-ink/10 text-ink/25 bg-ink/[0.02] cursor-not-allowed`}
        aria-label="Not available"
      >
        {label}
      </span>
    );
  }

  const palette = subject === "greek"
    ? "border-[#7c00d0]/40 text-[#7c00d0] hover:bg-[#7c00d0] hover:text-white hover:border-[#7c00d0]"
    : subject === "math"
    ? "border-[#056ef5]/40 text-[#056ef5] hover:bg-[#056ef5] hover:text-white hover:border-[#056ef5]"
    : "border-ink/30 text-ink/70 hover:bg-ink hover:text-white hover:border-ink";

  const href = kind
    ? `/api/account/exam-paper/${simId}?kind=${kind}`
    : `/api/account/exam-paper/${simId}`;

  return (
    <a
      href={href}
      title={`${title} — με υδατογράφημα του φροντιστηρίου σας`}
      className={`${base} ${palette}`}
      aria-label={title}
    >
      {label}
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    </a>
  );
}

function StatusCell({ sim, submitted, closed, p, isPreview }: {
  sim: Simulation; submitted: boolean; closed: boolean;
  p: SchoolSimulation | undefined; isPreview: boolean;
}) {
  // Grading is always available — no `unlocked` gate. Schools and parents
  // can record (or re-record) grades at any time. `closed` only affects
  // whether the grade is included in stats, surfaced via the row label.
  const href = isPreview ? "/account/grading/preview" : `/account/grading/${sim.id}`;

  // Grading is always open. The only branch that changes behavior is whether
  // the row was already submitted (→ surface a "re-grade" link) and whether
  // we've passed the stats deadline (→ append a small "Στατιστικά κλειστά" note).
  if (submitted) {
    return (
      <div className="inline-flex flex-col items-end gap-0.5">
        <StatusDot color="#10b981" label="Υποβλήθηκε" />
        <Link href={href} className="text-[10px] font-bold text-[#056ef5] hover:text-[#0451b8] uppercase tracking-wider">
          Επεξεργασία →
        </Link>
        {closed && (
          <span className="text-[10px] font-bold text-amber-700 inline-flex items-center gap-1 mt-0.5">
            <span className="w-1 h-1 rounded-full bg-amber-500" />
            Στατιστικά κλειστά
          </span>
        )}
      </div>
    );
  }

  // Not submitted yet — show the action link, plus the deadline note if past.
  return (
    <div className="inline-flex flex-col items-end gap-0.5">
      <Link href={href} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#056ef5] hover:text-[#0451b8]">
        {p ? "Συνέχεια" : "Έναρξη"} →
      </Link>
      {closed && (
        <span className="text-[10px] font-bold text-amber-700 inline-flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-amber-500" />
          Στατιστικά κλειστά
        </span>
      )}
    </div>
  );
}


function StatsWindowCell({ closesAt, now }: { closesAt: string | null; now: string }) {
  // No deadline configured → stats stay open forever.
  if (!closesAt) {
    return <span className="text-xs text-ink/40">Χωρίς προθεσμία</span>;
  }
  const dt = new Date(closesAt);
  const dateLabel = dt.toLocaleDateString("el-GR", { day: "2-digit", month: "short", year: "numeric" });

  // Past the deadline → stats are now closed (grading itself is still allowed).
  if (closesAt <= now) {
    return (
      <div className="inline-flex flex-col items-end leading-tight">
        <span className="text-xs font-semibold text-amber-700">Έκλεισαν</span>
        <span className="text-[10px] text-ink/45 tabular mt-0.5">{dateLabel}</span>
      </div>
    );
  }

  // Future deadline → show "Έως [date]".
  const diffDays = Math.floor((dt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const urgent = diffDays >= 0 && diffDays < 3;
  return (
    <div className="inline-flex flex-col items-end leading-tight">
      <span className={`text-xs font-semibold tabular ${urgent ? "text-red-600" : "text-ink"}`}>
        Έως {dateLabel}
      </span>
      {urgent && (
        <span className="text-[10px] text-red-600 mt-0.5">
          {diffDays === 0 ? "σήμερα" : diffDays === 1 ? "σε 1 ημέρα" : `σε ${diffDays} ημέρες`}
        </span>
      )}
    </div>
  );
}

function StatusDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink/60">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

// ─── Preview ────────────────────────────────────────────────────────────────

const PREVIEW_SIMS: Simulation[] = [
  { id: "p1", number: 1, title: "Διαγώνισμα 1 · Νοέμβριος 2024", subject: "bundle", exam_date: "2024-11-16", unlocks_at: "2024-11-16T09:00:00Z", grading_closes_at: "2024-12-01T23:59:00Z", greek_questions: 20, math_questions: 20, is_published: true, material_url: null, questions_url: null, greek_questions_url: null, math_questions_url: null, greek_answers_url: null, math_answers_url: null, created_at: "" },
  { id: "p2", number: 2, title: "Διαγώνισμα 2 · Δεκέμβριος 2024", subject: "bundle", exam_date: "2024-12-14", unlocks_at: "2024-12-14T09:00:00Z", grading_closes_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), greek_questions: 20, math_questions: 20, is_published: true, material_url: null, questions_url: null, greek_questions_url: null, math_questions_url: null, greek_answers_url: null, math_answers_url: null, created_at: "" },
  { id: "p3", number: 3, title: "Διαγώνισμα 3 · Φεβρουάριος 2025", subject: "bundle", exam_date: "2025-02-08", unlocks_at: "2099-02-08T09:00:00Z", grading_closes_at: null, greek_questions: 20, math_questions: 20, is_published: true, material_url: null, questions_url: null, greek_questions_url: null, math_questions_url: null, greek_answers_url: null, math_answers_url: null, created_at: "" },
  { id: "p4", number: 4, title: "Διαγώνισμα 4 · Μάρτιος 2025", subject: "bundle", exam_date: "2025-03-15", unlocks_at: "2099-03-15T09:00:00Z", grading_closes_at: null, greek_questions: 20, math_questions: 20, is_published: true, material_url: null, questions_url: null, greek_questions_url: null, math_questions_url: null, greek_answers_url: null, math_answers_url: null, created_at: "" },
];

const PREVIEW_PARTICIPATIONS: SchoolSimulation[] = [
  { id: "pp1", school_id: "preview", simulation_id: "p1", student_count: 8, is_submitted: true, submitted_at: "2024-11-28T14:00:00Z" },
  { id: "pp2", school_id: "preview", simulation_id: "p2", student_count: 7, is_submitted: false, submitted_at: null },
];

function GradingPreview() {
  const now = new Date().toISOString();
  const participationMap = new Map(PREVIEW_PARTICIPATIONS.map((p) => [p.simulation_id, p]));
  return <GradingView sims={PREVIEW_SIMS} participationMap={participationMap} now={now} isPreview />;
}
