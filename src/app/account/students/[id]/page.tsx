import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Student, StudentSimulationGrade, Simulation, SimulationQuestionTag } from "@/lib/types";
import { computeScore, gradeCountsForStats } from "@/lib/scoring";
import PrintButton from "./PrintButton";
import AISummaryCard from "./AISummaryCard";

type PeerGrade = { student_id: string; simulation_id: string; score: number; school_simulation_id: string; wrong_questions?: number[] | null };
type Subject = "all" | "greek" | "math";

const PREVIEW_IDS = new Set(["s1", "s2", "s3", "s4", "s5", "s6"]);

function buildPreviewData(id: string): {
  student: Student;
  grades: (StudentSimulationGrade & { simulations: Simulation })[];
  allGrades: PeerGrade[];
  tagMap: Map<string, Map<number, string>>;
  difficultyMap: Map<string, Map<number, number>>;
} | null {
  const STUDENTS: Record<string, Student> = {
    s1: { id: "s1", school_id: "preview", first_name: "Μαρία",   last_name: "Παπαδοπούλου", class_year: "Γυμνάσιο", subjects: ["greek","math"], notes: "Πολύ καλή στη Γλώσσα", mother_name: null, father_name: null, gender: null, created_at: "", updated_at: "" },
    s2: { id: "s2", school_id: "preview", first_name: "Γιώργης", last_name: "Αλεξίου",      class_year: "Γυμνάσιο", subjects: ["math"],         notes: null, mother_name: null, father_name: null, gender: null, created_at: "", updated_at: "" },
    s3: { id: "s3", school_id: "preview", first_name: "Ελένη",   last_name: "Βασιλείου",    class_year: "Γυμνάσιο", subjects: ["greek","math"], notes: null, mother_name: null, father_name: null, gender: null, created_at: "", updated_at: "" },
    s4: { id: "s4", school_id: "preview", first_name: "Νίκος",   last_name: "Δημητρίου",    class_year: "Λύκειο",   subjects: ["greek"],        notes: null, mother_name: null, father_name: null, gender: null, created_at: "", updated_at: "" },
    s5: { id: "s5", school_id: "preview", first_name: "Σοφία",   last_name: "Κωνσταντίνου", class_year: "Λύκειο",   subjects: ["greek","math"], notes: "Νεοεγγραφή", mother_name: null, father_name: null, gender: null, created_at: "", updated_at: "" },
    s6: { id: "s6", school_id: "preview", first_name: "Θάνος",   last_name: "Οικονόμου",    class_year: "Λύκειο",   subjects: ["math"],         notes: null, mother_name: null, father_name: null, gender: null, created_at: "", updated_at: "" },
  };
  const student = STUDENTS[id];
  if (!student) return null;

  // Sim catalog used by all preview students
  const SIMS: Simulation[] = [
    { id: "p1", number: 1, title: "Διαγώνισμα 1 · Νοέμβριος 2024",   subject: "bundle", exam_date: "2024-11-16", unlocks_at: "2024-11-16T09:00:00Z", grading_closes_at: "2024-12-01T23:59:00Z", greek_questions: 20, math_questions: 20, is_published: true, material_url: null, questions_url: null, greek_questions_url: null, math_questions_url: null, greek_answers_url: null, math_answers_url: null, created_at: "" },
    { id: "p2", number: 2, title: "Διαγώνισμα 2 · Δεκέμβριος 2024",  subject: "bundle", exam_date: "2024-12-14", unlocks_at: "2024-12-14T09:00:00Z", grading_closes_at: "2024-12-29T23:59:00Z", greek_questions: 20, math_questions: 20, is_published: true, material_url: null, questions_url: null, greek_questions_url: null, math_questions_url: null, greek_answers_url: null, math_answers_url: null, created_at: "" },
    { id: "p3", number: 3, title: "Διαγώνισμα 3 · Φεβρουάριος 2025", subject: "bundle", exam_date: "2025-02-08", unlocks_at: "2025-02-08T09:00:00Z", grading_closes_at: "2025-02-23T23:59:00Z", greek_questions: 20, math_questions: 20, is_published: true, material_url: null, questions_url: null, greek_questions_url: null, math_questions_url: null, greek_answers_url: null, math_answers_url: null, created_at: "" },
    { id: "p4", number: 4, title: "Διαγώνισμα 4 · Μάρτιος 2025",     subject: "bundle", exam_date: "2025-03-15", unlocks_at: "2025-03-15T09:00:00Z", grading_closes_at: "2025-03-30T23:59:00Z", greek_questions: 20, math_questions: 20, is_published: true, material_url: null, questions_url: null, greek_questions_url: null, math_questions_url: null, greek_answers_url: null, math_answers_url: null, created_at: "" },
  ];
  const submittedDates = ["2024-11-28T14:00:00Z", "2024-12-22T11:00:00Z", "2025-02-15T15:30:00Z", "2025-03-22T10:15:00Z"];

  // Per-student score sequences (length determines how many sims they took)
  const SCORE_PROFILES: Record<string, number[]> = {
    s1: [88, 91, 93, 95],   // Μαρία — top
    s2: [62, 68, 74, 78],   // Γιώργης — improving
    s3: [76, 79, 84, 88],   // Ελένη — strong
    s4: [70, 73, 77, 82],   // Νίκος — Greek only
    s5: [75, 79],           // Σοφία — new, only 2 exams
    s6: [58, 64, 71, 76],   // Θάνος — improving
  };
  const scores = SCORE_PROFILES[id];

  // Build wrong_questions per sim. Total = 40 Q (Q1-20 greek, Q21-40 math).
  // Restrict by subject — students who only do "greek" lose only Greek Qs (treat Math as not asked → mark them all correct, since the data model still has 40 Qs).
  // For realism we'll still put a few wrong in their non-subject to keep ranks honest, but bias toward their subject.
  const subjects = student.subjects;
  function buildWrongs(score: number, seed: number): number[] {
    const wrongCount = Math.round(40 * (1 - score / 100));
    // deterministic pseudo-random pick
    const candidates: number[] = [];
    const greekPool = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    const mathPool = [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40];
    if (subjects.includes("greek")) candidates.push(...greekPool);
    if (subjects.includes("math")) candidates.push(...mathPool);
    if (candidates.length === 0) candidates.push(...greekPool, ...mathPool);
    // simple LCG shuffle
    let s = seed;
    const shuffled = [...candidates];
    for (let i = shuffled.length - 1; i > 0; i--) {
      s = (s * 9301 + 49297) % 233280;
      const j = Math.floor((s / 233280) * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, Math.min(wrongCount, shuffled.length)).sort((a, b) => a - b);
  }

  const grades: (StudentSimulationGrade & { simulations: Simulation })[] = scores.map((score, i) => {
    const sim = SIMS[i];
    const seed = (id.charCodeAt(1) * 100) + i + 1;
    return {
      id: `${id}-g${i + 1}`,
      student_id: id,
      simulation_id: sim.id,
      school_simulation_id: `pp-${sim.id}`,
      score,
      wrong_questions: buildWrongs(score, seed),
      submitted_at: submittedDates[i],
      updated_at: submittedDates[i],
      simulations: sim,
    } as StudentSimulationGrade & { simulations: Simulation };
  });

  // Peer grades — 5-6 peers per sim, with this student usually in the top 3.
  const PEER_NAMES = ["peer1", "peer2", "peer3", "peer4", "peer5"];
  const allGrades: PeerGrade[] = [];
  for (let i = 0; i < grades.length; i++) {
    const g = grades[i];
    // peers spread below the student's score (with one occasionally above for Σοφία/Θάνος)
    const studentScore = g.score;
    const baseSpread = [-8, -14, -20, -5, -25];
    const peerScores = PEER_NAMES.map((_, pi) => {
      let s = studentScore + baseSpread[pi];
      // sometimes peer beats student slightly for non-top performers
      if ((id === "s5" || id === "s6") && pi === 0) s = studentScore + 3;
      if (id === "s2" && pi === 0 && i === 0) s = studentScore + 4;
      return Math.max(30, Math.min(98, s));
    });
    allGrades.push({ student_id: id, simulation_id: g.simulation_id, score: g.score, school_simulation_id: g.school_simulation_id });
    peerScores.forEach((ps, pi) => {
      allGrades.push({ student_id: `${id}-peer${pi}`, simulation_id: g.simulation_id, score: ps, school_simulation_id: g.school_simulation_id });
    });
  }

  // Category tags per sim. Greek Qs 1-20, Math Qs 21-40.
  const GREEK_CATS = ["Γραμματική", "Λεξιλόγιο", "Κατανόηση κειμένου", "Σύνταξη"];
  const MATH_CATS = ["Πράξεις", "Κλάσματα", "Γεωμετρία", "Προβλήματα"];
  const tagMap = new Map<string, Map<number, string>>();
  for (const sim of SIMS) {
    const m = new Map<number, string>();
    for (let q = 1; q <= 20; q++) m.set(q, GREEK_CATS[(q - 1) % GREEK_CATS.length]);
    for (let q = 21; q <= 40; q++) m.set(q, MATH_CATS[(q - 21) % MATH_CATS.length]);
    tagMap.set(sim.id, m);
  }

  return { student, grades, allGrades, tagMap, difficultyMap: new Map() };
}

export default async function StudentProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ subject?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();

  let student: Student;
  let grades: (StudentSimulationGrade & { simulations: Simulation })[];
  let tagMap: Map<string, Map<number, string>>;
  let difficultyMap: Map<string, Map<number, number>>;
  let allGrades: PeerGrade[];
  let isPreview = false;

  if (!user) {
    if (!PREVIEW_IDS.has(id)) return null;
    const preview = buildPreviewData(id);
    if (!preview) return null;
    isPreview = true;
    student = preview.student;
    grades = preview.grades;
    tagMap = preview.tagMap;
    difficultyMap = preview.difficultyMap;
    allGrades = preview.allGrades;
  } else {
    const { data: studentRow } = await supabase
      .from("students").select("*, ai_summary, ai_summary_generated_at").eq("id", id).eq("school_id", user.id).maybeSingle();
    if (!studentRow) notFound();
    student = studentRow as Student;

    const { data: gradesRaw } = await supabase
      .from("student_simulation_grades")
      .select(`*, simulations(*)`)
      .eq("student_id", id)
      .order("submitted_at", { ascending: true });
    grades = (gradesRaw ?? []) as (StudentSimulationGrade & { simulations: Simulation })[];

    const simIds = grades.map((g) => g.simulation_id);
    const { data: tagsRaw } = simIds.length
      ? await supabase.from("simulation_question_tags").select("*").in("simulation_id", simIds)
      : { data: [] };
    const tags = (tagsRaw ?? []) as SimulationQuestionTag[];

    tagMap = new Map<string, Map<number, string>>();
    difficultyMap = new Map<string, Map<number, number>>();
    for (const t of tags) {
      if (!tagMap.has(t.simulation_id)) tagMap.set(t.simulation_id, new Map());
      tagMap.get(t.simulation_id)!.set(t.question_number, t.category);
      if (t.difficulty != null) {
        if (!difficultyMap.has(t.simulation_id)) difficultyMap.set(t.simulation_id, new Map());
        difficultyMap.get(t.simulation_id)!.set(t.question_number, t.difficulty);
      }
    }

    const schoolSimIds = grades.map((g) => g.school_simulation_id);
    const { data: allGradesRaw } = schoolSimIds.length
      ? await supabase.from("student_simulation_grades").select("student_id, simulation_id, score, school_simulation_id, wrong_questions").in("school_simulation_id", schoolSimIds)
      : { data: [] };
    allGrades = (allGradesRaw ?? []) as PeerGrade[];
  }

  // ── Subject filtering ──────────────────────────────────────────────────
  // Default: if the student only does one subject, lock the view to it.
  // Otherwise default to "all" but let the user toggle via ?subject=...
  const defaultSubject: Subject = student.subjects.length === 1
    ? (student.subjects[0] as "greek" | "math")
    : "all";
  const requested = sp.subject;
  const subject: Subject = requested === "greek" || requested === "math" || requested === "all"
    ? requested
    : defaultSubject;
  const showSubjectToggle = student.subjects.length > 1;

  function inSubject(qNum: number, sim: Simulation, s: Subject) {
    if (s === "all") return true;
    if (s === "greek") return qNum <= sim.greek_questions;
    return qNum > sim.greek_questions;
  }
  // Uses the global point-weighted scoring (Q1-10=2, Q11-20=3, Q21-30=2, Q31-40=3).
  function subjectScore(wrongQs: number[], sim: Simulation, s: Subject): number {
    if (s === "all") return computeScore(wrongQs);
    if (s === "greek") return computeScore(wrongQs, 1, sim.greek_questions);
    return computeScore(wrongQs, sim.greek_questions + 1, sim.greek_questions + sim.math_questions);
  }

  // Project grades through the subject filter (recompute score + filter wrong_questions).
  // Each row gets an `_inStats` flag — true if the grade was submitted on/before
  // the stats deadline (or the sim has no deadline at all). Late grades stay
  // visible in the exam-history list but are excluded from every aggregate.
  const sGrades = grades.map((g) => ({
    ...g,
    score: subjectScore(g.wrong_questions ?? [], g.simulations, subject),
    wrong_questions: (g.wrong_questions ?? []).filter((q) => inSubject(q, g.simulations, subject)),
    _inStats: gradeCountsForStats(g.submitted_at, g.simulations?.grading_closes_at),
  }));

  const eligibleGrades = sGrades.filter((g) => g._inStats);

  // Category aggregation — only count questions in the active subject AND
  // only from on-time submissions.
  const categoryStats: Record<string, { wrong: number; total: number; subject: "greek" | "math" }> = {};
  for (const grade of grades) {
    const sim = grade.simulations;
    if (!sim) continue;
    if (!gradeCountsForStats(grade.submitted_at, sim.grading_closes_at)) continue;
    const total = sim.greek_questions + sim.math_questions;
    const simTagMap = tagMap.get(grade.simulation_id);
    for (let q = 1; q <= total; q++) {
      if (!inSubject(q, sim, subject)) continue;
      const isGreek = q <= sim.greek_questions;
      const cat = simTagMap?.get(q) ?? (isGreek ? "Ν. Γλώσσα" : "Μαθηματικά");
      if (!categoryStats[cat]) categoryStats[cat] = { wrong: 0, total: 0, subject: isGreek ? "greek" : "math" };
      categoryStats[cat].total++;
      if ((grade.wrong_questions ?? []).includes(q)) categoryStats[cat].wrong++;
    }
  }

  // Difficulty stats — % correct per difficulty level (1=easy, 2=medium, 3=hard)
  const difficultyStats: Record<number, { right: number; wrong: number }> = { 1: { right: 0, wrong: 0 }, 2: { right: 0, wrong: 0 }, 3: { right: 0, wrong: 0 } };
  for (const grade of grades) {
    const sim = grade.simulations;
    if (!sim) continue;
    if (!gradeCountsForStats(grade.submitted_at, sim.grading_closes_at)) continue;
    const simDiffMap = difficultyMap.get(grade.simulation_id);
    if (!simDiffMap) continue;
    const total = sim.greek_questions + sim.math_questions;
    for (let q = 1; q <= total; q++) {
      if (!inSubject(q, sim, subject)) continue;
      const diff = simDiffMap.get(q);
      if (!diff) continue;
      if ((grade.wrong_questions ?? []).includes(q)) difficultyStats[diff].wrong++;
      else difficultyStats[diff].right++;
    }
  }
  const hasDifficultyData = ([1, 2, 3] as const).some((d) => difficultyStats[d].right + difficultyStats[d].wrong > 0);

  const avgScore = eligibleGrades.length ? Math.round(eligibleGrades.reduce((s, g) => s + g.score, 0) / eligibleGrades.length) : null;
  const bestScore = eligibleGrades.length ? Math.max(...eligibleGrades.map((g) => g.score)) : null;
  const worstScore = eligibleGrades.length ? Math.min(...eligibleGrades.map((g) => g.score)) : null;
  const totalQuestions = eligibleGrades.reduce((s, g) => {
    const sim = g.simulations;
    if (!sim) return s;
    return s + (subject === "all" ? sim.greek_questions + sim.math_questions : subject === "greek" ? sim.greek_questions : sim.math_questions);
  }, 0);
  const totalWrong = eligibleGrades.reduce((s, g) => s + g.wrong_questions.length, 0);

  const trend = eligibleGrades.length > 1 ? eligibleGrades[eligibleGrades.length - 1].score - eligibleGrades[0].score : 0;

  // Class avg per sim — recomputed for the current subject from peer wrong_questions
  // (only over eligible grades)
  const classAvgs = new Map<string, number>();
  for (const grade of eligibleGrades) {
    const peers = allGrades.filter((p) => p.school_simulation_id === grade.school_simulation_id);
    if (!peers.length) continue;
    const peerScores = peers.map((p) =>
      subject === "all"
        ? p.score
        : subjectScore(p.wrong_questions ?? [], grade.simulations, subject)
    );
    classAvgs.set(grade.school_simulation_id, peerScores.reduce((a, b) => a + b, 0) / peerScores.length);
  }
  const studentAvgVsClass = eligibleGrades.length && classAvgs.size
    ? Math.round(avgScore! - (Array.from(classAvgs.values()).reduce((a, b) => a + b, 0) / classAvgs.size))
    : 0;

  const categoryList = Object.entries(categoryStats)
    .map(([cat, { wrong, total, subject: catSubject }]) => ({ cat, wrong, total, rate: total ? wrong / total : 0, subject: catSubject }))
    .sort((a, b) => b.rate - a.rate);

  const initials = `${student.first_name[0] ?? ""}${student.last_name[0] ?? ""}`.toUpperCase();
  const avatarColor = pickColor(student.id);

  return (
    <div className="space-y-8 max-w-5xl print:max-w-none print-area">
      <div className="flex items-center justify-between gap-4 no-print">
        <Link href="/account/students" className="text-xs text-ink/45 hover:text-ink transition-colors">
          ← Κατάλογος μαθητών
        </Link>
        <PrintButton />
      </div>

      {isPreview && (
        <div className="border-l-2 border-amber-500 bg-amber-50/60 px-4 py-3 text-sm text-amber-900">
          <strong className="font-semibold">Προεπισκόπηση:</strong> Δείγμα προφίλ μαθητή με ενδεικτικά δεδομένα. Συνδεθείτε για πραγματικούς μαθητές.
        </div>
      )}

      {/* Hero */}
      <div className="flex items-start gap-4 flex-wrap">
        <div className="w-14 h-14 rounded-md grid place-items-center font-semibold text-base text-white flex-shrink-0"
             style={{ background: avatarColor }}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl text-ink">{student.last_name} {student.first_name}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-ink/55">
            {student.class_year && <span>{student.class_year}</span>}
            {student.subjects.length > 0 && (
              <span>{student.subjects.map((s) => s === "greek" ? "Γλώσσα" : "Μαθηματικά").join(" · ")}</span>
            )}
            {avgScore !== null && studentAvgVsClass !== 0 && (
              <span className={studentAvgVsClass > 0 ? "text-green-700" : "text-red-600"}>
                {studentAvgVsClass > 0 ? "+" : ""}{studentAvgVsClass} vs μ.ο. τμήματος
              </span>
            )}
          </div>
          {student.notes && (
            <p className="text-xs text-ink/50 mt-2 max-w-xl">"{student.notes}"</p>
          )}
        </div>
      </div>

      {/* Subject toggle — only for dual-subject students */}
      {showSubjectToggle && (
        <div className="flex border border-ink/15 rounded-md w-fit">
          <SubjectTab href={`/account/students/${student.id}?subject=all`}   active={subject === "all"}   label="Όλα" />
          <SubjectTab href={`/account/students/${student.id}?subject=greek`} active={subject === "greek"} label="Γλώσσα" />
          <SubjectTab href={`/account/students/${student.id}?subject=math`}  active={subject === "math"}  label="Μαθηματικά" />
        </div>
      )}

      {/* KPI strip — dividers */}
      <div className="border-y border-ink/10 divide-x divide-ink/10 grid grid-cols-2 md:grid-cols-4">
        <ProfileKPI label="Μέσος βαθμός" value={avgScore} trend={trend} trendLabel={eligibleGrades.length > 1 ? "από την αρχή" : null} />
        <ProfileKPI label="Καλύτερος"     value={bestScore} />
        <ProfileKPI label="Χειρότερος"    value={worstScore} />
        <ProfileKPI
          label="Διαγωνίσματα"
          value={sGrades.length}
          sub={sGrades.length !== eligibleGrades.length
            ? `${eligibleGrades.length} στα στατιστικά`
            : totalWrong > 0 ? `${totalWrong}/${totalQuestions} λάθος` : null}
        />
      </div>

      {sGrades.length === 0 ? (
        <div className="border border-ink/10 rounded-md px-4 py-10 text-center">
          <p className="text-sm text-ink/50">Δεν έχει καταχωρηθεί βαθμολόγηση για αυτόν τον μαθητή ακόμα.</p>
          <Link href="/account/grading" className="inline-block mt-3 text-xs font-bold text-[#056ef5] hover:text-[#0451b8]">
            Πηγαίνετε στη βαθμολόγηση →
          </Link>
        </div>
      ) : (
        <>
          {/* Performance + Donut */}
          <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
            <ProgressChart grades={eligibleGrades} classAvgs={classAvgs} />
            <CategoryDonut categories={categoryList} />
          </div>

          {/* Category bars */}
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-[11px] font-semibold tracking-wider uppercase text-ink/55">Αδύνατα σημεία ανά κατηγορία</h2>
              <span className="text-[11px] text-ink/45">{categoryList.length} κατηγορίες</span>
            </div>
            <div className="border border-ink/10 rounded-md divide-y divide-ink/8">
              {categoryList.map(({ cat, wrong, total, rate }) => {
                const pct = Math.round(rate * 100);
                const barColor = pct >= 60 ? "#ef4444" : pct >= 35 ? "#f59e0b" : "#22c55e";
                return (
                  <div key={cat} className="row-hover flex items-center gap-3 px-4 py-2.5">
                    <div className="w-44 text-sm text-ink flex-shrink-0 truncate">{cat}</div>
                    <div className="flex-1 h-1.5 rounded bg-ink/8 overflow-hidden">
                      <div className="h-full" style={{ width: `${pct}%`, background: barColor }} />
                    </div>
                    <div className="w-24 text-right text-xs tabular">
                      <span className="text-ink" style={{ color: barColor }}>{pct}%</span>
                      <span className="text-ink/40 ml-1">({wrong}/{total})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Difficulty bars */}
          {hasDifficultyData && (
            <section>
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-[11px] font-semibold tracking-wider uppercase text-ink/55">Επίδοση ανά δυσκολία</h2>
              </div>
              <div className="border border-ink/10 rounded-md divide-y divide-ink/8">
                {([1, 2, 3] as const).map((d) => {
                  const { right, wrong } = difficultyStats[d];
                  const total = right + wrong;
                  if (total === 0) return null;
                  const pct = Math.round((right / total) * 100);
                  const label = d === 1 ? "Εύκολες" : d === 2 ? "Μέτριες" : "Δύσκολες";
                  const barColor = pct >= 70 ? "#22c55e" : pct >= 45 ? "#f59e0b" : "#ef4444";
                  return (
                    <div key={d} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="w-24 text-sm text-ink flex-shrink-0">{label}</div>
                      <div className="flex-1 h-1.5 rounded bg-ink/8 overflow-hidden">
                        <div className="h-full" style={{ width: `${pct}%`, background: barColor }} />
                      </div>
                      <div className="w-28 text-right text-xs tabular">
                        <span style={{ color: barColor }}>{pct}%</span>
                        <span className="text-ink/40 ml-1">({right}/{total} σωστές)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Exam history */}
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-[11px] font-semibold tracking-wider uppercase text-ink/55">Ιστορικό διαγωνισμάτων</h2>
              <span className="text-[11px] text-ink/45">{sGrades.length} καταχωρήσεις</span>
            </div>
            <div className="space-y-3">
              {[...sGrades].reverse().map((grade) => {
                const sim = grade.simulations;
                if (!sim) return null;
                const total = subject === "all" ? sim.greek_questions + sim.math_questions
                            : subject === "greek" ? sim.greek_questions
                            : sim.math_questions;
                const wrong = grade.wrong_questions.length;
                const correct = total - wrong;

                // Peer scores recomputed in the current subject
                const peers = allGrades.filter((g) => g.school_simulation_id === grade.school_simulation_id);
                const peerSubjectScores = peers.map((p) =>
                  subject === "all"
                    ? p.score
                    : subjectScore(p.wrong_questions ?? [], sim, subject)
                );
                const rank = peerSubjectScores.filter((s) => s > grade.score).length + 1;
                const totalPeers = peerSubjectScores.length;
                const percentile = totalPeers > 1
                  ? Math.round(((totalPeers - rank) / (totalPeers - 1)) * 100)
                  : 100;
                const classAvg = peerSubjectScores.length ? Math.round(peerSubjectScores.reduce((a, b) => a + b, 0) / peerSubjectScores.length) : 0;
                const diffFromAvg = grade.score - classAvg;

                const wrongCats = (() => {
                  const simTagMap = tagMap.get(grade.simulation_id);
                  const cats: Record<string, number> = {};
                  for (const qn of grade.wrong_questions) {
                    const cat = simTagMap?.get(qn) ?? (qn <= sim.greek_questions ? "Ν. Γλώσσα" : "Μαθηματικά");
                    cats[cat] = (cats[cat] ?? 0) + 1;
                  }
                  return Object.entries(cats).sort((a, b) => b[1] - a[1]);
                })();

                return (
                  <div key={grade.id} className={`border rounded-md p-4 transition-colors bg-white ${grade._inStats ? "border-ink/10 hover:border-ink/25" : "border-amber-300/50 bg-amber-50/30"}`}>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-xs text-ink/45">Διαγώνισμα {sim.number}</div>
                          {!grade._inStats && (
                            <span className="text-[9px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded">
                              Εκτός στατιστικών
                            </span>
                          )}
                        </div>
                        <div className="text-base text-ink mt-0.5">{sim.title}</div>
                        <div className="text-[11px] text-ink/45 mt-0.5">
                          {new Date(grade.submitted_at).toLocaleDateString("el-GR", { day: "2-digit", month: "long", year: "numeric" })}
                        </div>
                      </div>
                      <div className="flex items-baseline gap-5 flex-shrink-0">
                        <div className="text-right">
                          <div className="text-[11px] text-ink/45">Βαθμός</div>
                          <div className="font-display text-2xl text-ink tabular mt-0.5">{grade.score}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[11px] text-ink/45">Θέση</div>
                          <div className="font-display text-2xl text-ink tabular mt-0.5">
                            {rank}<span className="text-ink/40 text-sm">/{totalPeers}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Score bar with class-avg marker */}
                    <div className="mt-4">
                      <div className="relative h-1.5 rounded bg-ink/8 overflow-hidden">
                        <div className="h-full" style={{ width: `${(correct / total) * 100}%`, background: grade.score >= 75 ? "#22c55e" : grade.score >= 50 ? "#f59e0b" : "#ef4444" }} />
                        {classAvg > 0 && (
                          <div className="absolute top-0 bottom-0 w-px bg-ink/55" style={{ left: `${classAvg}%` }} />
                        )}
                      </div>
                      <div className="flex justify-between text-[11px] text-ink/45 mt-1.5 tabular">
                        <span>{correct} σωστές · {wrong} λάθος</span>
                        {classAvg > 0 && <span>μ.ο. τμήματος: {classAvg}</span>}
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-ink/55">
                      {totalPeers > 1 && (
                        <span>Καλύτερος από <span className="text-ink font-semibold tabular">{percentile}%</span></span>
                      )}
                      <span>
                        vs τμήμα{" "}
                        <span className={`tabular font-semibold ${diffFromAvg > 0 ? "text-green-700" : diffFromAvg < 0 ? "text-red-600" : "text-ink"}`}>
                          {diffFromAvg > 0 ? "+" : ""}{diffFromAvg}
                        </span>
                      </span>
                      <span>Ποσοστό <span className="text-ink font-semibold tabular">{Math.round((correct / total) * 100)}%</span></span>
                    </div>

                    {/* Wrong by category */}
                    {wrongCats.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-ink/5">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-ink/55 mb-2">Λάθος ανά κατηγορία</div>
                        <div className="flex flex-wrap gap-1.5">
                          {wrongCats.map(([cat, count]) => (
                            <span key={cat} className="text-[11px] text-ink/70 border border-ink/12 px-1.5 py-0.5 rounded">
                              {cat} <span className="text-ink/40">×{count}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* AI Summary — only for real accounts, not preview */}
      {!isPreview && (
        <AISummaryCard
          studentId={student.id}
          initialSummary={(student as Student & { ai_summary?: string | null }).ai_summary ?? null}
          initialGeneratedAt={(student as Student & { ai_summary_generated_at?: string | null }).ai_summary_generated_at ?? null}
        />
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ["#1b1b1b", "#3f3f46", "#52525b"];
function pickColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function SubjectTab({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link href={href}
      className={`px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer not-first:border-l border-ink/15 ${
        active ? "bg-ink text-white" : "text-ink/55 hover:text-ink"
      }`}>
      {label}
    </Link>
  );
}

function ProfileKPI({ label, value, trend, trendLabel, sub }: {
  label: string; value: number | null;
  trend?: number; trendLabel?: string | null; sub?: string | null;
}) {
  return (
    <div className="px-4 py-4 first:pl-0">
      <div className="text-[11px] text-ink/50">{label}</div>
      <div className="mt-1 font-display text-2xl text-ink tabular">{value ?? "—"}</div>
      {trend !== undefined && trend !== 0 && trendLabel && (
        <div className={`text-[11px] mt-0.5 ${trend > 0 ? "text-green-700" : "text-red-600"}`}>
          {trend > 0 ? "+" : ""}{trend} {trendLabel}
        </div>
      )}
      {sub && <div className="text-[11px] text-ink/45 mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── Progress chart ──────────────────────────────────────────────────────────

type GradeWithSim = StudentSimulationGrade & { simulations: Simulation };

function ProgressChart({ grades, classAvgs }: { grades: GradeWithSim[]; classAvgs: Map<string, number> }) {
  if (grades.length === 0) return null;
  const w = 600, h = 200, padL = 30, padR = 12, padT = 18, padB = 28;
  const scoreToY = (s: number) => padT + (1 - s / 100) * (h - padT - padB);
  const idxToX = (i: number) => grades.length === 1 ? w / 2 : padL + (i / (grades.length - 1)) * (w - padL - padR);

  const studentPath = grades.map((g, i) => `${i === 0 ? "M" : "L"} ${idxToX(i)} ${scoreToY(g.score)}`).join(" ");
  const classPath = grades.map((g, i) => {
    const ca = classAvgs.get(g.school_simulation_id);
    return ca != null ? `${i === 0 ? "M" : "L"} ${idxToX(i)} ${scoreToY(ca)}` : "";
  }).filter(Boolean).join(" ");

  const lastScore = grades[grades.length - 1].score;
  const firstScore = grades[0].score;
  const change = lastScore - firstScore;

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-[11px] font-semibold tracking-wider uppercase text-ink/55">Πορεία βαθμολογίας</h2>
        {grades.length > 1 && (
          <span className={`text-xs tabular ${change > 0 ? "text-green-700" : change < 0 ? "text-red-600" : "text-ink/45"}`}>
            {change > 0 ? "+" : ""}{change} συνολικά
          </span>
        )}
      </div>
      <div className="border border-ink/10 rounded-md p-4">
        <div className="flex items-center gap-4 mb-3 text-[11px] text-ink/55">
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#056ef5]" />Μαθητής</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 border-t border-dashed border-ink/40" />Μ.ο. τμήματος</span>
        </div>
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-48">
        <defs>
          <linearGradient id="studentFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#056ef5" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#056ef5" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Y axis labels */}
        {[0, 50, 100].map((v) => (
          <g key={v}>
            <line x1={padL} y1={scoreToY(v)} x2={w - padR} y2={scoreToY(v)} stroke="#0a0a0f10" strokeDasharray="2,3" />
            <text x={padL - 6} y={scoreToY(v) + 3} fontSize="9" fill="#0a0a0f50" textAnchor="end">{v}</text>
          </g>
        ))}

        {/* Area under student line */}
        {grades.length > 1 && (
          <path d={`${studentPath} L ${idxToX(grades.length - 1)} ${scoreToY(0)} L ${idxToX(0)} ${scoreToY(0)} Z`}
                fill="url(#studentFill)" />
        )}

        {/* Class avg line */}
        {classPath && <path d={classPath} fill="none" stroke="#0a0a0f" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="4,3" vectorEffect="non-scaling-stroke" />}

        {/* Student line */}
        <path d={studentPath} fill="none" stroke="#056ef5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />

        {/* Points */}
        {grades.map((g, i) => (
          <g key={g.id}>
            <circle cx={idxToX(i)} cy={scoreToY(g.score)} r="3" fill="white" stroke="#056ef5" strokeWidth="1.5" />
            <text x={idxToX(i)} y={scoreToY(g.score) - 9} fontSize="10" fill="#0a0a0f" textAnchor="middle">{g.score}</text>
            <text x={idxToX(i)} y={h - 10} fontSize="9" fill="#0a0a0f60" textAnchor="middle">Δ{g.simulations?.number ?? i + 1}</text>
          </g>
        ))}
        </svg>
      </div>
    </section>
  );
}

// ─── Category donut ──────────────────────────────────────────────────────────

function CategoryDonut({ categories }: { categories: { cat: string; wrong: number; total: number; rate: number; subject: "greek" | "math" }[] }) {
  const totalWrong = categories.reduce((s, c) => s + c.wrong, 0);
  const top = categories.filter((c) => c.wrong > 0).slice(0, 5);

  // Build SVG arcs for donut
  const radius = 60, cx = 80, cy = 80, strokeW = 18;
  const circ = 2 * Math.PI * radius;
  let offset = 0;
  const palette = ["#ef4444", "#f59e0b", "#7c00d0", "#056ef5", "#10b981"];

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-[11px] font-semibold tracking-wider uppercase text-ink/55">Λάθη ανά κατηγορία</h2>
        <span className="text-[11px] text-ink/45 tabular">{totalWrong} σύνολο</span>
      </div>
      <div className="border border-ink/10 rounded-md p-4">
        {totalWrong === 0 ? (
          <p className="text-sm text-ink/55 py-6 text-center">Καθαρό. Καμία λάθος απάντηση.</p>
        ) : (
          <>
            <div className="flex items-center justify-center mb-4">
              <svg viewBox="0 0 160 160" className="w-32 h-32 -rotate-90">
                <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#0a0a0f0d" strokeWidth={strokeW} />
                {top.map((c, i) => {
                  const frac = c.wrong / totalWrong;
                  const len = frac * circ;
                  const dash = `${len} ${circ - len}`;
                  const dashoffset = -offset;
                  offset += len;
                  return (
                    <circle key={c.cat} cx={cx} cy={cy} r={radius} fill="none"
                            stroke={palette[i % palette.length]} strokeWidth={strokeW}
                            strokeDasharray={dash} strokeDashoffset={dashoffset} strokeLinecap="butt" />
                  );
                })}
                <text x="80" y="84" textAnchor="middle" fontSize="20" fill="#0a0a0f" transform="rotate(90 80 80)">
                  {totalWrong}
                </text>
              </svg>
            </div>
            <ul className="space-y-1">
              {top.map((c, i) => (
                <li key={c.cat} className="flex items-center gap-2 text-[12px]">
                  <span className="w-1.5 h-1.5 rounded-sm flex-shrink-0" style={{ background: palette[i % palette.length] }} />
                  <span className="flex-1 text-ink/80 truncate">{c.cat}</span>
                  <span className="text-ink tabular">{c.wrong}</span>
                  <span className="text-ink/45 tabular w-10 text-right">{Math.round(c.rate * 100)}%</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
