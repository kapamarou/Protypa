"use client";
import { useState } from "react";
import Link from "next/link";
import { computeScore, pointsForQuestion } from "@/lib/scoring";

// ──────────────────────────────────────────────────────────────────────────
// Seeded demo data for a single fictional student
// ──────────────────────────────────────────────────────────────────────────

const STUDENT = {
  name: "Μαρία Παπαδοπούλου",
  classYear: "Γυμνάσιο",
  initials: "ΜΠ",
};

// Three historical exams (already graded) — gives the line chart and analytics
// pre-filled context so the visitor sees what stats look like.
interface HistoricalExam {
  label: string;
  title: string;
  date: string;
  wrong: number[];
  classAvg: number;
}
const HISTORICAL: HistoricalExam[] = [
  { label: "Δ1", title: "Διαγώνισμα 1 · Νοέμβριος 2024", date: "16 Νοε 2024", wrong: [3, 7, 14, 22, 28, 35],         classAvg: 73 },
  { label: "Δ2", title: "Διαγώνισμα 2 · Δεκέμβριος 2024", date: "14 Δεκ 2024", wrong: [5, 12, 24, 31, 38],            classAvg: 76 },
  { label: "Δ3", title: "Διαγώνισμα 3 · Φεβρουάριος 2025", date: "08 Φεβ 2025", wrong: [9, 18, 22, 36],                classAvg: 81 },
];

// The live exam they're grading right now
const LIVE_EXAM_TITLE = "Διαγώνισμα 4 · Μάιος 2026";
const LIVE_EXAM_DATE = "10 Μαΐου 2026";

// Question category map (1-20 Greek, 21-40 Math)
const GREEK_CATS = ["Γραμματική", "Λεξιλόγιο", "Κατανόηση κειμένου", "Σύνταξη"] as const;
const MATH_CATS = ["Πράξεις", "Κλάσματα", "Γεωμετρία", "Προβλήματα"] as const;
function categoryOf(qNum: number): string {
  if (qNum <= 20) return GREEK_CATS[(qNum - 1) % 4];
  return MATH_CATS[(qNum - 21) % 4];
}

// ──────────────────────────────────────────────────────────────────────────

export default function DemoExperience() {
  const [step, setStep] = useState<"grade" | "results">("grade");
  // 40 bits — bit i (0-based) = true when question i+1 was wrong
  const [wrong, setWrong] = useState<boolean[]>(Array(40).fill(false));

  function toggle(qi: number) {
    setWrong((prev) => {
      const next = [...prev];
      next[qi] = !next[qi];
      return next;
    });
  }

  function reset() {
    setWrong(Array(40).fill(false));
    setStep("grade");
  }

  const wrongIndices = wrong.flatMap((w, i) => (w ? [i + 1] : []));
  const score = computeScore(wrongIndices);

  if (step === "grade") {
    return <GradePhase wrong={wrong} score={score} onToggle={toggle} onSubmit={() => setStep("results")} />;
  }
  return <ResultsPhase wrongIndices={wrongIndices} score={score} onRestart={reset} />;
}

// ──────────────────────────────────────────────────────────────────────────
// PHASE 1 — Grading sheet with red instruction
// ──────────────────────────────────────────────────────────────────────────

function GradePhase({
  wrong, score, onToggle, onSubmit,
}: {
  wrong: boolean[]; score: number; onToggle: (qi: number) => void; onSubmit: () => void;
}) {
  const wrongCount = wrong.filter(Boolean).length;
  const COL_SECTION = 28, COL_Q = 52, COL_STUDENT = 200;

  return (
    <div className="space-y-5">
      {/* Red instruction banner */}
      <div className="flex items-start gap-3 bg-red-50 border-l-4 border-red-500 rounded-r-md px-4 py-3">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-red-600 mt-0.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div>
          <div className="text-sm font-bold text-red-800">Πατήστε <span className="inline-block px-1.5 bg-red-600 text-white rounded text-xs">✕</span> σε κάθε ερώτηση που η Μαρία απάντησε λάθος</div>
          <div className="text-xs text-red-700/80 mt-0.5">Ο βαθμός υπολογίζεται αυτόματα. Όταν τελειώσετε, πατήστε «Υποβολή» για να δείτε τα στατιστικά της Μαρίας.</div>
        </div>
      </div>

      {/* Score + submit toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="text-xs text-ink/55">
          <span className="font-semibold text-ink">{STUDENT.name}</span>
          <span className="mx-2">·</span>
          <span>{LIVE_EXAM_TITLE}</span>
        </div>
        <button
          onClick={onSubmit}
          className="px-6 py-2.5 rounded-full bg-[#056ef5] text-white font-black uppercase tracking-wider text-sm hover:bg-[#0451b8] transition-colors cursor-pointer"
        >
          Υποβολή · Δείτε τα στατιστικά →
        </button>
      </div>

      {/* The grading grid */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm bg-white">
        <table
          className="border-collapse w-full"
          style={{ minWidth: COL_SECTION + COL_Q + COL_STUDENT }}
        >
          <thead>
            <tr>
              <th style={{ width: COL_SECTION }} className="border border-gray-200 bg-[#eaffba]" />
              <th
                style={{ width: COL_Q, position: "sticky", left: COL_SECTION, zIndex: 20 }}
                className="border border-gray-200 bg-[#eaffba] px-2 py-2 text-center text-[9px] font-black tracking-widest uppercase text-gray-500"
              >
                Ερωτ.
              </th>
              <th
                className="border border-gray-200 bg-[#eaffba] px-3 py-2 text-center"
              >
                <div className="text-[9px] font-black leading-tight text-gray-600">{STUDENT.name.split(" ")[1]}</div>
                <div className="text-[9px] text-gray-400 font-medium">{STUDENT.name.split(" ")[0]}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Greek section */}
            {Array.from({ length: 20 }, (_, qi) => (
              <tr key={qi}>
                {qi === 0 && (
                  <td
                    rowSpan={20}
                    style={{ width: COL_SECTION, writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                    className="border border-gray-200 bg-[#f3e8ff] text-center text-[9px] font-black tracking-[0.3em] uppercase text-[#7c00d0] select-none py-2"
                  >
                    Ν. Γλώσσα
                  </td>
                )}
                <td
                  style={{ width: COL_Q, position: "sticky", left: COL_SECTION, zIndex: 10 }}
                  className="border border-gray-200 bg-[#faf5ff] text-center py-0 leading-none"
                >
                  <div className="text-[10px] font-bold text-gray-600">Ε{qi + 1}</div>
                  <div className="text-[8px] text-gray-400 mt-0.5">{pointsForQuestion(qi + 1)}β</div>
                </td>
                <td style={{ height: 30 }} className="border border-gray-200 bg-[#fdfaff] text-center p-0">
                  <Cell isWrong={wrong[qi]} onToggle={() => onToggle(qi)} hoverHue="purple" />
                </td>
              </tr>
            ))}

            {/* Math section */}
            {Array.from({ length: 20 }, (_, qi) => {
              const absQi = 20 + qi;
              return (
                <tr key={absQi}>
                  {qi === 0 && (
                    <td
                      rowSpan={20}
                      style={{ width: COL_SECTION, writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                      className="border border-gray-200 bg-[#dbeafe] text-center text-[9px] font-black tracking-[0.3em] uppercase text-[#056ef5] select-none py-2"
                    >
                      Μαθηματικά
                    </td>
                  )}
                  <td
                    style={{ width: COL_Q, position: "sticky", left: COL_SECTION, zIndex: 10 }}
                    className="border border-gray-200 bg-[#eff6ff] text-center py-0 leading-none"
                  >
                    <div className="text-[10px] font-bold text-gray-600">Ε{absQi + 1}</div>
                    <div className="text-[8px] text-gray-400 mt-0.5">{pointsForQuestion(absQi + 1)}β</div>
                  </td>
                  <td style={{ height: 30 }} className="border border-gray-200 bg-[#f5f8ff] text-center p-0">
                    <Cell isWrong={wrong[absQi]} onToggle={() => onToggle(absQi)} hoverHue="blue" />
                  </td>
                </tr>
              );
            })}

            {/* Live score row */}
            <tr>
              <td
                colSpan={2}
                style={{ position: "sticky", left: 0, zIndex: 10 }}
                className="border border-gray-300 bg-[#0a0a0f] px-3 py-2.5 text-[9px] font-black tracking-[0.25em] uppercase text-white/80"
              >
                Τελικός Βαθμός
              </td>
              <td className="border border-gray-300 bg-[#0a0a0f] text-center py-2">
                <div className={`text-base font-black tabular-nums ${score >= 75 ? "text-[#c8ff00]" : score >= 50 ? "text-yellow-300" : "text-red-400"}`}>
                  {score}
                </div>
                <div className="text-[9px] text-white/45 mt-0.5">{wrongCount} λάθος</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-xs text-ink/40 text-center">
        Κλικ σε κελί για να σημειώσετε λάθος · σύνολο 40 ερωτήσεις, 100 βαθμοί
      </p>
    </div>
  );
}

function Cell({ isWrong, onToggle, hoverHue }: { isWrong: boolean; onToggle: () => void; hoverHue: "purple" | "blue" }) {
  const hoverCls = hoverHue === "purple"
    ? "hover:bg-purple-50 hover:text-[#7c00d0]/40"
    : "hover:bg-blue-50 hover:text-[#056ef5]/40";
  return (
    <button
      onClick={onToggle}
      style={{ width: "100%", height: 30 }}
      className={`text-xs font-black transition-colors cursor-pointer select-none ${
        isWrong ? "bg-red-100 text-red-600 hover:bg-red-200" : `text-transparent ${hoverCls}`
      }`}
    >
      ✕
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// PHASE 2 — Student profile-style analytics
// ──────────────────────────────────────────────────────────────────────────

function ResultsPhase({ wrongIndices, score, onRestart }: { wrongIndices: number[]; score: number; onRestart: () => void }) {
  // Build full history including the just-completed exam
  const liveExam: HistoricalExam = {
    label: "Δ4",
    title: LIVE_EXAM_TITLE,
    date: LIVE_EXAM_DATE,
    wrong: wrongIndices,
    classAvg: 79, // fictional class avg for the current exam
  };
  const allExams = [...HISTORICAL, liveExam];

  // Aggregate category stats across ALL exams (for weakness bars)
  const categoryStats: Record<string, { wrong: number; total: number; subject: "greek" | "math" }> = {};
  for (const exam of allExams) {
    for (let q = 1; q <= 40; q++) {
      const cat = categoryOf(q);
      const subject: "greek" | "math" = q <= 20 ? "greek" : "math";
      if (!categoryStats[cat]) categoryStats[cat] = { wrong: 0, total: 0, subject };
      categoryStats[cat].total++;
      if (exam.wrong.includes(q)) categoryStats[cat].wrong++;
    }
  }
  const categoryList = Object.entries(categoryStats)
    .map(([cat, s]) => ({ cat, ...s, rate: s.total ? s.wrong / s.total : 0 }))
    .sort((a, b) => b.rate - a.rate);

  // For donut — only the CURRENT exam's wrong-by-category
  const liveCats: Record<string, number> = {};
  for (const qn of wrongIndices) {
    const c = categoryOf(qn);
    liveCats[c] = (liveCats[c] ?? 0) + 1;
  }
  const liveCatList = Object.entries(liveCats).sort((a, b) => b[1] - a[1]);
  const totalWrongLive = wrongIndices.length;

  // History scores
  const historyPoints = allExams.map((e) => ({
    label: e.label,
    score: computeScore(e.wrong),
    classAvg: e.classAvg,
  }));

  const avgScore = Math.round(historyPoints.reduce((a, p) => a + p.score, 0) / historyPoints.length);
  const bestScore = Math.max(...historyPoints.map((p) => p.score));
  const worstScore = Math.min(...historyPoints.map((p) => p.score));
  const trend = historyPoints[historyPoints.length - 1].score - historyPoints[0].score;

  return (
    <div className="space-y-8">
      {/* Top toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="text-xs text-ink/55">
          <span className="inline-flex items-center gap-1.5 text-green-700 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Η βαθμολόγηση καταχωρήθηκε
          </span>
          <span className="mx-2">·</span>
          Δείτε πώς θα φαίνονται τα στατιστικά της μαθήτριας στον λογαριασμό σας
        </div>
        <button
          onClick={onRestart}
          className="text-xs font-bold text-ink/60 hover:text-ink border border-ink/15 hover:border-ink/30 px-3 py-1.5 rounded-md transition-colors cursor-pointer"
        >
          ← Νέα βαθμολόγηση
        </button>
      </div>

      {/* Hero */}
      <div className="flex items-start gap-4 flex-wrap">
        <div className="w-14 h-14 rounded-md grid place-items-center font-semibold text-base text-white flex-shrink-0 bg-[#1b1b1b]">
          {STUDENT.initials}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-2xl text-ink">{STUDENT.name}</h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-ink/55">
            <span>{STUDENT.classYear}</span>
            <span>Γλώσσα · Μαθηματικά</span>
            <span className="text-green-700">
              {score - liveExam.classAvg > 0 ? "+" : ""}{score - liveExam.classAvg} vs μ.ο. τμήματος (αυτό το διαγώνισμα)
            </span>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="border-y border-ink/10 divide-x divide-ink/10 grid grid-cols-2 md:grid-cols-4">
        <Kpi label="Μέσος βαθμός" value={avgScore} trend={trend} />
        <Kpi label="Καλύτερος" value={bestScore} />
        <Kpi label="Χειρότερος" value={worstScore} />
        <Kpi label="Διαγωνίσματα" value={allExams.length} sub={`${historyPoints.reduce((s, p) => 0, 0) || allExams.reduce((s, e) => s + e.wrong.length, 0)} λάθος`} />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
        <ProgressChart points={historyPoints} />
        <CategoryDonut totalWrong={totalWrongLive} top={liveCatList} />
      </div>

      {/* Weakness bars */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[11px] font-semibold tracking-wider uppercase text-ink/55">Αδύνατα σημεία ανά κατηγορία</h2>
          <span className="text-[11px] text-ink/45">{categoryList.length} κατηγορίες · όλα τα διαγωνίσματα</span>
        </div>
        <div className="border border-ink/10 rounded-md divide-y divide-ink/8 bg-white">
          {categoryList.map(({ cat, wrong, total, rate }) => {
            const pct = Math.round(rate * 100);
            const barColor = pct >= 60 ? "#ef4444" : pct >= 35 ? "#f59e0b" : "#22c55e";
            return (
              <div key={cat} className="flex items-center gap-3 px-4 py-2.5">
                <div className="w-44 text-sm text-ink flex-shrink-0 truncate">{cat}</div>
                <div className="flex-1 h-1.5 rounded bg-ink/8 overflow-hidden">
                  <div className="h-full" style={{ width: `${pct}%`, background: barColor }} />
                </div>
                <div className="w-24 text-right text-xs tabular">
                  <span style={{ color: barColor }}>{pct}%</span>
                  <span className="text-ink/40 ml-1">({wrong}/{total})</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Exam history */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[11px] font-semibold tracking-wider uppercase text-ink/55">Ιστορικό διαγωνισμάτων</h2>
          <span className="text-[11px] text-ink/45">{allExams.length} καταχωρήσεις</span>
        </div>
        <div className="space-y-3">
          {[...allExams].reverse().map((exam, idx) => {
            const exScore = computeScore(exam.wrong);
            const correct = 40 - exam.wrong.length;
            const diff = exScore - exam.classAvg;
            const isLatest = idx === 0;
            return (
              <div
                key={exam.label}
                className={`border rounded-md p-4 bg-white transition-colors ${isLatest ? "border-[#056ef5]/40 ring-1 ring-[#056ef5]/15" : "border-ink/10"}`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="text-xs text-ink/45 flex items-center gap-2">
                      <span>{exam.label}</span>
                      {isLatest && <span className="text-[10px] font-black uppercase tracking-wider bg-[#056ef5] text-white px-2 py-0.5 rounded">Νέο</span>}
                    </div>
                    <div className="text-base text-ink mt-0.5">{exam.title}</div>
                    <div className="text-[11px] text-ink/45 mt-0.5">{exam.date}</div>
                  </div>
                  <div className="flex items-baseline gap-5 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-[11px] text-ink/45">Βαθμός</div>
                      <div className="font-display text-2xl text-ink tabular mt-0.5">{exScore}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-ink/45">Λάθος</div>
                      <div className="font-display text-2xl text-ink tabular mt-0.5">{exam.wrong.length}<span className="text-ink/40 text-sm">/40</span></div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-ink/55">
                  <span>vs τμήμα <span className={`font-semibold tabular ${diff > 0 ? "text-green-700" : diff < 0 ? "text-red-600" : "text-ink"}`}>{diff > 0 ? "+" : ""}{diff}</span></span>
                  <span>Σωστές <span className="text-ink font-semibold tabular">{correct}</span></span>
                  <span>Ποσοστό <span className="text-ink font-semibold tabular">{Math.round((correct / 40) * 100)}%</span></span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA banner */}
      <div className="rounded-2xl bg-[#7c00d0] text-white p-6 md:p-8 text-center">
        <h2 className="font-display text-2xl md:text-3xl">Έτσι θα φαίνονται οι μαθητές σας</h2>
        <p className="mt-2 text-sm text-white/85 max-w-xl mx-auto">
          Με το Protupa, αυτή η ανάλυση δημιουργείται αυτόματα για κάθε μαθητή σας μετά από κάθε διαγώνισμα.
        </p>
        <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/paketa"
            style={{ color: "#056ef5", backgroundColor: "#ffffff" }}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full font-black uppercase tracking-wider text-xs hover:-translate-y-0.5 transition-transform"
          >
            Δείτε τα πακέτα →
          </Link>
          <Link
            href="/signup"
            style={{ color: "#0a0a0f", backgroundColor: "#c8ff00" }}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full font-black uppercase tracking-wider text-xs hover:-translate-y-0.5 transition-transform"
          >
            Δωρεάν εγγραφή
          </Link>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, trend, sub }: { label: string; value: number | string; trend?: number; sub?: string }) {
  return (
    <div className="px-4 py-4 first:pl-0">
      <div className="text-[11px] text-ink/50">{label}</div>
      <div className="mt-1 font-display text-2xl text-ink tabular">{value}</div>
      {trend !== undefined && trend !== 0 && (
        <div className={`text-[11px] mt-0.5 ${trend > 0 ? "text-green-700" : "text-red-600"}`}>
          {trend > 0 ? "+" : ""}{trend} συνολικά
        </div>
      )}
      {sub && <div className="text-[11px] text-ink/45 mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── Progress (line chart) ──────────────────────────────────────────────

function ProgressChart({ points }: { points: { label: string; score: number; classAvg: number }[] }) {
  const w = 600, h = 220, padL = 32, padR = 12, padT = 18, padB = 28;
  const yFor = (s: number) => padT + (1 - s / 100) * (h - padT - padB);
  const xFor = (i: number) => points.length === 1 ? w / 2 : padL + (i / (points.length - 1)) * (w - padL - padR);

  const studentPath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(p.score)}`).join(" ");
  const classPath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(p.classAvg)}`).join(" ");

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-[11px] font-semibold tracking-wider uppercase text-ink/55">Πορεία βαθμολογίας</h2>
        <span className="text-[11px] text-ink/45">{points.length} διαγωνίσματα</span>
      </div>
      <div className="border border-ink/10 rounded-md p-4 bg-white">
        <div className="flex items-center gap-4 mb-3 text-[11px] text-ink/55">
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#056ef5]" />Μαθητής</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 border-t border-dashed border-ink/40" />Μ.ο. τμήματος</span>
        </div>
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-48">
          {[0, 50, 100].map((v) => (
            <g key={v}>
              <line x1={padL} y1={yFor(v)} x2={w - padR} y2={yFor(v)} stroke="#0a0a0f10" strokeDasharray="2,3" />
              <text x={padL - 6} y={yFor(v) + 3} fontSize="9" fill="#0a0a0f50" textAnchor="end">{v}</text>
            </g>
          ))}
          <path d={classPath} fill="none" stroke="#0a0a0f" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="4,3" />
          <path d={studentPath} fill="none" stroke="#056ef5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={xFor(i)} cy={yFor(p.score)} r="3.5" fill="white" stroke="#056ef5" strokeWidth="1.5" />
              <text x={xFor(i)} y={yFor(p.score) - 9} fontSize="10" fill="#0a0a0f" textAnchor="middle">{p.score}</text>
              <text x={xFor(i)} y={h - 10} fontSize="9" fill="#0a0a0f60" textAnchor="middle">{p.label}</text>
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}

// ─── Category donut (current exam) ──────────────────────────────────────

function CategoryDonut({ totalWrong, top }: { totalWrong: number; top: [string, number][] }) {
  const radius = 60, cx = 80, cy = 80, strokeW = 18;
  const circ = 2 * Math.PI * radius;
  const palette = ["#ef4444", "#f59e0b", "#7c00d0", "#056ef5", "#10b981"];
  let offset = 0;

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-[11px] font-semibold tracking-wider uppercase text-ink/55">Λάθη σε αυτό το διαγώνισμα</h2>
        <span className="text-[11px] text-ink/45 tabular">{totalWrong} σύνολο</span>
      </div>
      <div className="border border-ink/10 rounded-md p-4 bg-white">
        {totalWrong === 0 ? (
          <p className="text-sm text-ink/55 py-6 text-center">Καθαρό. Καμία λάθος απάντηση.</p>
        ) : (
          <>
            <div className="flex items-center justify-center mb-4">
              <svg viewBox="0 0 160 160" className="w-32 h-32 -rotate-90">
                <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#0a0a0f0d" strokeWidth={strokeW} />
                {top.slice(0, 5).map(([cat, n], i) => {
                  const frac = n / totalWrong;
                  const len = frac * circ;
                  const dash = `${len} ${circ - len}`;
                  const dashoffset = -offset;
                  offset += len;
                  return (
                    <circle key={cat} cx={cx} cy={cy} r={radius} fill="none"
                      stroke={palette[i % palette.length]} strokeWidth={strokeW}
                      strokeDasharray={dash} strokeDashoffset={dashoffset} />
                  );
                })}
                <text x="80" y="84" textAnchor="middle" fontSize="20" fill="#0a0a0f" transform="rotate(90 80 80)">{totalWrong}</text>
              </svg>
            </div>
            <ul className="space-y-1">
              {top.slice(0, 5).map(([cat, n], i) => (
                <li key={cat} className="flex items-center gap-2 text-[12px]">
                  <span className="w-1.5 h-1.5 rounded-sm flex-shrink-0" style={{ background: palette[i % palette.length] }} />
                  <span className="flex-1 text-ink/80 truncate">{cat}</span>
                  <span className="text-ink tabular">{n}</span>
                  <span className="text-ink/45 tabular w-10 text-right">{Math.round((n / totalWrong) * 100)}%</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
