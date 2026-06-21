"use client";
import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { computeScore, pointsForQuestion } from "@/lib/scoring";
import type { Simulation, SchoolSimulation, StudentSimulationGrade, Student, SimulationQuestionTag } from "@/lib/types";

interface Props {
  simulation: Simulation;
  participation: SchoolSimulation | null;
  students: Student[];
  existingGrades: StudentSimulationGrade[];
  tags: SimulationQuestionTag[];
  schoolSimulationId: string | null;
  userId: string;
}

export default function GradingSheet({ simulation, participation, students, existingGrades, tags, schoolSimulationId, userId }: Props) {
  const router = useRouter();
  const total = simulation.greek_questions + simulation.math_questions;

  // ── Step: select participating students ──────────────────────────────────
  const alreadyGraded = new Set(existingGrades.map((g) => g.student_id));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(existingGrades.map((g) => g.student_id).concat(
      participation?.is_submitted ? [] : []
    ))
  );
  const [step, setStep] = useState<"select" | "grade" | "done">(
    participation?.is_submitted ? "done" : existingGrades.length > 0 ? "grade" : "select"
  );

  // ── Grading state: wrong[studentId][questionIndex (0-based)] = bool ──────
  const buildInitial = useCallback(() => {
    const map: Record<string, boolean[]> = {};
    for (const sid of selectedIds) {
      const grade = existingGrades.find((g) => g.student_id === sid);
      map[sid] = Array.from({ length: total }, (_, qi) =>
        grade ? grade.wrong_questions.includes(qi + 1) : false
      );
    }
    return map;
  }, [selectedIds, existingGrades, total]);

  const [wrong, setWrong] = useState<Record<string, boolean[]>>(buildInitial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ssId, setSsId] = useState<string | null>(schoolSimulationId);

  function toggleCell(studentId: string, qi: number) {
    setWrong((prev) => {
      const row = [...(prev[studentId] ?? Array(total).fill(false))];
      row[qi] = !row[qi];
      return { ...prev, [studentId]: row };
    });
  }

  function score(studentId: string) {
    const row = wrong[studentId] ?? Array(total).fill(false);
    const wrongQs: number[] = [];
    row.forEach((isWrong, i) => { if (isWrong) wrongQs.push(i + 1); });
    return computeScore(wrongQs);
  }

  function wrongCount(studentId: string) {
    return (wrong[studentId] ?? []).filter(Boolean).length;
  }

  // Preview pages pass userId="preview" and a non-UUID schoolSimulationId.
  // In that mode we skip all DB calls and just simulate the state transitions.
  const isPreview = userId === "preview";

  // ── Confirm student selection ─────────────────────────────────────────────
  async function confirmSelection() {
    if (selectedIds.size === 0) { setError("Επιλέξτε τουλάχιστον έναν μαθητή."); return; }
    setSaving(true); setError(null);

    if (!isPreview) {
      const supabase = createSupabaseBrowserClient();
      let id = ssId;
      if (!id) {
        const { data, error: err } = await supabase.from("school_simulations").insert({
          school_id: userId, simulation_id: simulation.id, student_count: selectedIds.size,
        }).select("id").single();
        if (err) { setError(err.message); setSaving(false); return; }
        id = data.id;
        setSsId(id);
      } else {
        await supabase.from("school_simulations").update({ student_count: selectedIds.size }).eq("id", id);
      }
    }

    const initial: Record<string, boolean[]> = {};
    for (const sid of selectedIds) {
      const grade = existingGrades.find((g) => g.student_id === sid);
      initial[sid] = Array.from({ length: total }, (_, qi) =>
        grade ? grade.wrong_questions.includes(qi + 1) : false
      );
    }
    setWrong(initial);
    setStep("grade");
    setSaving(false);
    if (!isPreview) router.refresh();
  }

  // ── Submit grades ─────────────────────────────────────────────────────────
  async function submit() {
    setSaving(true); setError(null);

    if (isPreview) {
      // Simulate save + transition to done state
      setTimeout(() => { setStep("done"); setSaving(false); }, 300);
      return;
    }

    if (!ssId) { setError("Σφάλμα: δεν βρέθηκε η συμμετοχή."); setSaving(false); return; }
    const supabase = createSupabaseBrowserClient();

    for (const studentId of selectedIds) {
      const wrongQs = (wrong[studentId] ?? []).map((w, qi) => w ? qi + 1 : null).filter(Boolean) as number[];
      const { error: err } = await supabase.from("student_simulation_grades").upsert({
        student_id: studentId,
        simulation_id: simulation.id,
        school_simulation_id: ssId,
        wrong_questions: wrongQs,
        score: score(studentId),
      }, { onConflict: "student_id,simulation_id" });
      if (err) { setError(err.message); setSaving(false); return; }
    }

    await supabase.from("school_simulations").update({
      is_submitted: true, submitted_at: new Date().toISOString(), student_count: selectedIds.size,
    }).eq("id", ssId);

    setStep("done");
    setSaving(false);
    router.refresh();
  }

  const activeStudents = students.filter((s) => selectedIds.has(s.id));

  // Grading is always open — but if the stats deadline has passed, new edits
  // won't be counted toward analytics. We surface that fact above the table
  // already; here we just always allow the action.
  const canEdit = true;

  // ── Done state ────────────────────────────────────────────────────────────
  if (step === "done") {
    const graded = students.filter((s) => alreadyGraded.has(s.id) || selectedIds.has(s.id));
    const avg = graded.length ? Math.round(graded.reduce((a, s) => a + score(s.id), 0) / graded.length) : 0;
    return (
      <div className="space-y-6">
        <div className="rounded-3xl bg-green-50 border border-green-200 p-8 text-center">
          <div className="font-display text-5xl text-green-500">✓</div>
          <h2 className="mt-4 font-display text-2xl text-ink">Η βαθμολόγηση υποβλήθηκε!</h2>
          <p className="mt-2 text-sm text-ink/50">Τα αποτελέσματα αποθηκεύτηκαν. Δείτε λεπτομέρειες στο προφίλ κάθε μαθητή.</p>
          {canEdit && (
            <div className="mt-5 inline-flex items-center gap-2 text-xs text-ink/55 bg-white border border-ink/10 px-3 py-2 rounded-full">
              <span>Κάνατε λάθος;</span>
              <button
                onClick={() => setStep("grade")}
                className="font-black uppercase tracking-wider text-[#056ef5] hover:text-[#0451b8] cursor-pointer"
              >
                Επεξεργασία βαθμολόγησης →
              </button>
            </div>
          )}
        </div>
        <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-ink/40 mb-3">Αποτελέσματα</div>
        <div className="rounded-2xl border border-ink/10 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 bg-[#fafaf8]">
                <th className="text-left px-5 py-3 text-[10px] font-bold tracking-wider uppercase text-ink/40">Μαθητής</th>
                <th className="text-left px-5 py-3 text-[10px] font-bold tracking-wider uppercase text-ink/40 hidden sm:table-cell">Τάξη</th>
                <th className="text-center px-5 py-3 text-[10px] font-bold tracking-wider uppercase text-ink/40">Βαθμός</th>
                <th className="text-center px-5 py-3 text-[10px] font-bold tracking-wider uppercase text-ink/40">Λάθος</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {graded
                .sort((a, b) => score(b.id) - score(a.id))
                .map((s, i) => {
                  const sc = score(s.id);
                  const rank = i + 1;
                  return (
                    <tr key={s.id} className={i % 2 === 0 ? "bg-white" : "bg-[#fafaf8]"}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-ink/20 w-5 text-right">#{rank}</span>
                          <span className="font-medium text-ink">{s.last_name} {s.first_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-ink/40 text-xs hidden sm:table-cell">{s.class_year ?? "—"}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`font-display text-xl font-black ${sc >= 75 ? "text-green-600" : sc >= 50 ? "text-yellow-600" : "text-red-600"}`}>{sc}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center text-sm text-ink/50">{wrongCount(s.id)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <Link href={`/account/students/${s.id}`} className="text-xs font-bold text-[#056ef5] hover:text-[#7c00d0] transition-colors">Προφίλ →</Link>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-ink/10 bg-[#fafaf8]">
                <td className="px-5 py-3 font-bold text-ink text-sm" colSpan={2}>Μέσος όρος τμήματος</td>
                <td className="px-5 py-3 text-center font-display text-xl font-black text-[#056ef5]">{avg}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  }

  // ── Select students ───────────────────────────────────────────────────────
  if (step === "select") {
    if (students.length === 0) {
      return (
        <div className="rounded-3xl border-2 border-dashed border-ink/10 p-12 text-center">
          <div className="font-display text-5xl text-ink/10 mb-4">👤</div>
          <h2 className="font-display text-xl text-ink">Δεν υπάρχουν μαθητές</h2>
          <p className="mt-2 text-sm text-ink/50 max-w-xs mx-auto leading-relaxed">
            Πρέπει να προσθέσετε μαθητές στον κατάλογό σας πριν βαθμολογήσετε.
          </p>
          <Link href="/account/students"
            className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-full bg-[#056ef5] text-white font-black uppercase tracking-wider text-xs hover:bg-[#0451b8] transition-all">
            Προσθήκη μαθητών →
          </Link>
        </div>
      );
    }
    return (
      <div className="space-y-6 max-w-lg">
        <div>
          <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-ink/40 mb-2">Βήμα 1 από 2</div>
          <h2 className="font-display text-2xl text-ink">Ποιοι μαθητές συμμετείχαν;</h2>
          <p className="mt-1 text-sm text-ink/50">Επιλέξτε τους μαθητές που έκαναν αυτή την Προσομοίωση.</p>
        </div>
        <div className="rounded-2xl border border-ink/10 bg-white overflow-hidden">
          {/* Select all */}
          <label className="flex items-center gap-3 px-5 py-3.5 border-b border-ink/10 bg-[#fafaf8] cursor-pointer hover:bg-ink/5 transition-colors">
            <Checkbox
              checked={selectedIds.size === students.length}
              indeterminate={selectedIds.size > 0 && selectedIds.size < students.length}
              onChange={() => setSelectedIds(selectedIds.size === students.length ? new Set() : new Set(students.map((s) => s.id)))}
            />
            <span className="text-sm font-bold text-ink">Επιλογή όλων ({students.length})</span>
          </label>
          {students.map((s) => (
            <label key={s.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-ink/5 last:border-0 cursor-pointer hover:bg-[#fafaf8] transition-colors">
              <Checkbox
                checked={selectedIds.has(s.id)}
                onChange={() => {
                  const next = new Set(selectedIds);
                  next.has(s.id) ? next.delete(s.id) : next.add(s.id);
                  setSelectedIds(next);
                  setError(null);
                }}
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-ink">{s.last_name} {s.first_name}</span>
                {s.class_year && <span className="text-xs text-ink/40 ml-2">{s.class_year}</span>}
              </div>
            </label>
          ))}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button onClick={confirmSelection} disabled={saving || selectedIds.size === 0}
          className="w-full px-6 py-3 rounded-full bg-[#056ef5] text-white font-black uppercase tracking-wider text-sm hover:bg-[#0451b8] transition-all disabled:opacity-50 cursor-pointer">
          {saving ? "…" : `Έναρξη βαθμολόγησης (${selectedIds.size} μαθητές) →`}
        </button>
      </div>
    );
  }

  // ── Grading grid ─────────────────────────────────────────────────────────
  const COL_SECTION = 36;   // px — rotated label column
  const COL_Q      = 80;    // px — question number column (wider for bolder text)

  // If the participation was already submitted before this session, we're editing existing grades
  const isReGrading = !!participation?.is_submitted;

  // Roster management — add or remove students mid-grading
  function addStudent(id: string) {
    setSelectedIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setWrong((prev) => {
      if (prev[id]) return prev;
      const existing = existingGrades.find((g) => g.student_id === id);
      return {
        ...prev,
        [id]: Array.from({ length: total }, (_, qi) =>
          existing ? existing.wrong_questions.includes(qi + 1) : false
        ),
      };
    });
  }

  function removeStudent(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setWrong((prev) => {
      // Drop key without using a tslint-friendly rest pattern
      const next: Record<string, boolean[]> = {};
      for (const k in prev) if (k !== id) next[k] = prev[k];
      return next;
    });
  }

  // One-student-at-a-time wizard
  return (
    <GradeStep
      allStudents={students}
      activeStudents={activeStudents}
      wrong={wrong}
      score={score}
      wrongCount={wrongCount}
      toggleCell={toggleCell}
      onAddStudent={addStudent}
      onRemoveStudent={removeStudent}
      simulation={simulation}
      total={total}
      isReGrading={isReGrading}
      onCancel={() => setStep(isReGrading ? "done" : "select")}
      onSubmit={submit}
      saving={saving}
      error={error}
      COL_SECTION={COL_SECTION}
      COL_Q={COL_Q}
    />
  );
}

// ─── Grade step component — one student at a time ────────────────────────────

function GradeStep({
  allStudents, activeStudents, wrong, score, wrongCount, toggleCell,
  onAddStudent, onRemoveStudent,
  simulation, total,
  isReGrading, onCancel, onSubmit, saving, error, COL_SECTION, COL_Q,
}: {
  allStudents: Student[];
  activeStudents: Student[];
  wrong: Record<string, boolean[]>;
  score: (id: string) => number;
  wrongCount: (id: string) => number;
  toggleCell: (id: string, qi: number) => void;
  onAddStudent: (id: string) => void;
  onRemoveStudent: (id: string) => void;
  simulation: Simulation;
  total: number;
  isReGrading: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  saving: boolean;
  error: string | null;
  COL_SECTION: number;
  COL_Q: number;
}) {
  const [activeId, setActiveId] = useState<string>(() => activeStudents[0]?.id ?? "");
  const [visited, setVisited] = useState<Set<string>>(() => new Set([activeStudents[0]?.id].filter(Boolean) as string[]));
  const [pickerOpen, setPickerOpen] = useState(false);

  // If the active student is no longer in selection (e.g. someone navigated back), jump to the first
  useEffect(() => {
    if (!activeStudents.some((s) => s.id === activeId)) {
      setActiveId(activeStudents[0]?.id ?? "");
    }
  }, [activeStudents, activeId]);

  const activeIdx = Math.max(0, activeStudents.findIndex((s) => s.id === activeId));
  const currentStudent = activeStudents[activeIdx];

  function switchTo(id: string) {
    setActiveId(id);
    setVisited((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  const allVisited = activeStudents.every((s) => visited.has(s.id));
  const canSubmit = !saving && (allVisited || isReGrading);

  if (!currentStudent) return null;

  return (
    <div className="space-y-5" translate="no">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="text-xs text-ink/50">
          {isReGrading && (
            <>
              <span className="inline-flex items-center gap-1 text-amber-700 font-semibold mr-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Επεξεργασία προηγούμενης βαθμολόγησης
              </span>·{" "}
            </>
          )}
          {activeStudents.length} μαθητές · {total} ερωτήσεις ·{" "}
          <button onClick={onCancel} className="text-[#056ef5] hover:underline cursor-pointer">
            {isReGrading ? "ακύρωση" : "αλλαγή επιλογής"}
          </button>
        </div>
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          title={!allVisited && !isReGrading ? "Δείτε όλους τους μαθητές πριν την υποβολή" : undefined}
          className="px-6 py-2.5 rounded-full bg-[#056ef5] text-white font-black uppercase tracking-wider text-sm hover:bg-[#0451b8] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {saving ? "Αποθήκευση…" : isReGrading ? "Αποθήκευση αλλαγών →" : "Υποβολή όλων →"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-xl">{error}</p>}

      {/* Student picker strip */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] text-ink/55">
          <span className="font-semibold uppercase tracking-wider">
            Μαθητής {activeIdx + 1} από {activeStudents.length}
          </span>
          <span className="tabular">{visited.size}/{activeStudents.length} ολοκληρωμένοι</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {activeStudents.map((s, i) => {
            const isActive = s.id === activeId;
            const isVisited = visited.has(s.id);
            const sc = score(s.id);
            const wc = wrongCount(s.id);
            return (
              <div key={s.id} className="relative group flex-shrink-0">
                <button
                  onClick={() => switchTo(s.id)}
                  className={`flex items-center gap-2 pl-3 pr-7 py-2 rounded-md whitespace-nowrap transition-colors text-sm ${
                    isActive
                      ? "bg-[#056ef5] text-white"
                      : isVisited
                        ? "bg-white border border-[#056ef5]/30 text-ink hover:border-[#056ef5]/60"
                        : "bg-white border border-ink/15 text-ink/70 hover:border-ink/30"
                  }`}
                >
                  <span className={`tabular text-[11px] font-bold ${isActive ? "text-white/80" : "text-ink/55"}`}>{i + 1}.</span>
                  <span className="font-black">{s.last_name} {s.first_name}</span>
                  {isVisited && (
                    <span className={`tabular text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      isActive ? "bg-white/15 text-white" : "bg-[#056ef5]/10 text-[#056ef5]"
                    }`}>{sc}</span>
                  )}
                </button>
                {/* Remove button — only when more than 1 student selected */}
                {activeStudents.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const confirmMsg = wc > 0
                        ? `Αφαίρεση του/της ${s.last_name} ${s.first_name}; Θα χαθούν τα ${wc} σημειωμένα λάθη.`
                        : `Αφαίρεση του/της ${s.last_name} ${s.first_name} από αυτή τη βαθμολόγηση;`;
                      if (!confirm(confirmMsg)) return;
                      // If removing the active student, switch to the next/prev one
                      if (s.id === activeId) {
                        const nextStudent = activeStudents[i + 1] ?? activeStudents[i - 1];
                        if (nextStudent) setActiveId(nextStudent.id);
                      }
                      onRemoveStudent(s.id);
                    }}
                    title="Αφαίρεση"
                    aria-label={`Αφαίρεση ${s.last_name} ${s.first_name}`}
                    className={`absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full grid place-items-center text-[11px] font-black transition-opacity cursor-pointer ${
                      isActive
                        ? "text-white/70 hover:bg-white/15 hover:text-white opacity-100"
                        : "text-ink/35 hover:bg-red-50 hover:text-red-600 opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}

          {/* Add student button */}
          {allStudents.some((s) => !activeStudents.some((a) => a.id === s.id)) && (
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setPickerOpen((o) => !o)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md whitespace-nowrap text-xs font-bold text-[#056ef5] border border-dashed border-[#056ef5]/40 hover:bg-[#056ef5]/5 hover:border-[#056ef5]/70 transition-colors cursor-pointer"
              >
                + Προσθήκη μαθητή
              </button>
              {pickerOpen && (
                <div
                  className="absolute z-30 top-full mt-1 right-0 sm:right-auto sm:left-0 min-w-[240px] max-w-[300px] max-h-[280px] overflow-y-auto rounded-lg border border-ink/15 bg-white shadow-lg"
                  onMouseLeave={() => setPickerOpen(false)}
                >
                  <div className="px-3 py-2 text-[10px] font-bold tracking-wider uppercase text-ink/55 border-b border-ink/10 bg-[#fafaf8]">
                    Διαθέσιμοι μαθητές
                  </div>
                  <ul className="py-1">
                    {allStudents
                      .filter((s) => !activeStudents.some((a) => a.id === s.id))
                      .map((s) => (
                        <li key={s.id}>
                          <button
                            onClick={() => {
                              onAddStudent(s.id);
                              switchTo(s.id);
                              setPickerOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-ink hover:bg-[#056ef5]/5 transition-colors cursor-pointer flex items-center justify-between gap-2"
                          >
                            <span className="truncate">
                              <span className="font-semibold">{s.last_name} {s.first_name}</span>
                              {s.class_year && <span className="text-ink/45 ml-2">{s.class_year}</span>}
                            </span>
                            <span className="text-[#056ef5] font-bold flex-shrink-0">+</span>
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Red instruction banner */}
      <div className="flex items-start gap-3 bg-red-50 border-l-4 border-red-500 rounded-r-md px-4 py-3">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-red-600 mt-0.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div>
          <div className="text-sm font-bold text-red-800">
            Πατήστε <span className="inline-block px-1.5 bg-red-600 text-white rounded text-xs align-middle">✕</span> σε κάθε ερώτηση που ο μαθητής απάντησε λάθος
          </div>
          <div className="text-xs text-red-700/80 mt-0.5">
            Ο βαθμός υπολογίζεται αυτόματα. Πλοηγηθείτε ανάμεσα στους μαθητές με τα κουμπιά κάτω.
          </div>
        </div>
      </div>

      {/* The grading grid — ONE student */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm bg-white">
        <table className="border-collapse w-full">
          {/* ── Header row ─────────────────────────────────── */}
          <thead>
            <tr>
              <th style={{ width: COL_SECTION }} className="border border-gray-200 bg-[#eaffba]" />
              <th
                style={{ width: COL_Q }}
                className="border border-gray-200 bg-[#eaffba] px-2 py-3 text-center text-[11px] font-black tracking-widest uppercase text-gray-700"
              >
                Ερωτ.
              </th>
              <th className="border border-gray-200 bg-[#eaffba] px-3 py-3 text-center">
                <Link
                  href={`/account/students/${currentStudent.id}`}
                  className="block leading-tight hover:opacity-80 transition-opacity"
                >
                  <div className="text-base font-black text-ink">{currentStudent.last_name} {currentStudent.first_name}</div>
                  {currentStudent.class_year && (
                    <div className="text-xs text-ink/60 font-bold mt-1">{currentStudent.class_year}</div>
                  )}
                </Link>
              </th>
            </tr>
          </thead>

          <tbody>
            {/* ── Ν. ΓΛΩΣΣΑ section ──────────────────────────── */}
            {Array.from({ length: simulation.greek_questions }, (_, qi) => (
              <tr key={qi}>
                {qi === 0 && (
                  <td
                    rowSpan={simulation.greek_questions}
                    style={{ width: COL_SECTION, writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                    className="border border-gray-200 bg-[#f3e8ff] text-center text-[11px] font-black tracking-[0.3em] uppercase text-[#7c00d0] select-none py-2"
                  >
                    Ν. ΓΛΩΣΣΑ
                  </td>
                )}
                <td
                  style={{ width: COL_Q }}
                  className="border border-gray-200 bg-[#faf5ff] text-center py-1 leading-none"
                >
                  <div className="text-sm font-black text-gray-800">Ε{qi + 1}</div>
                  <div className="text-[10px] font-semibold text-gray-500 mt-1">{pointsForQuestion(qi + 1)}β</div>
                </td>
                <td style={{ height: 48 }} className="border border-gray-200 bg-[#fdfaff] text-center p-0">
                  <CellBtn
                    isWrong={wrong[currentStudent.id]?.[qi] ?? false}
                    onToggle={() => toggleCell(currentStudent.id, qi)}
                    hue="purple"
                  />
                </td>
              </tr>
            ))}

            {/* ── ΜΑΘΗΜΑΤΙΚΑ section ─────────────────────────── */}
            {Array.from({ length: simulation.math_questions }, (_, qi) => {
              const absQi = simulation.greek_questions + qi;
              return (
                <tr key={absQi}>
                  {qi === 0 && (
                    <td
                      rowSpan={simulation.math_questions}
                      style={{ width: COL_SECTION, writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                      className="border border-gray-200 bg-[#dbeafe] text-center text-[11px] font-black tracking-[0.3em] uppercase text-[#056ef5] select-none py-2"
                    >
                      ΜΑΘΗΜΑΤΙΚΑ
                    </td>
                  )}
                  <td
                    style={{ width: COL_Q }}
                    className="border border-gray-200 bg-[#eff6ff] text-center py-1 leading-none"
                  >
                    <div className="text-sm font-black text-gray-800">Ε{absQi + 1}</div>
                    <div className="text-[10px] font-semibold text-gray-500 mt-1">{pointsForQuestion(absQi + 1)}β</div>
                  </td>
                  <td style={{ height: 48 }} className="border border-gray-200 bg-[#f5f8ff] text-center p-0">
                    <CellBtn
                      isWrong={wrong[currentStudent.id]?.[absQi] ?? false}
                      onToggle={() => toggleCell(currentStudent.id, absQi)}
                      hue="blue"
                    />
                  </td>
                </tr>
              );
            })}

            {/* ── Score row ──────────────────────────────────── */}
            <tr>
              <td
                colSpan={2}
                className="border border-gray-300 bg-[#0a0a0f] px-3 py-3 text-[10px] font-black tracking-[0.25em] uppercase text-white/80"
              >
                ΤΕΛΙΚΟΣ ΒΑΘΜΟΣ
              </td>
              <td className="border border-gray-300 bg-[#0a0a0f] text-center py-3">
                <div className="flex items-center justify-center gap-3">
                  <div className={`font-display text-2xl font-black tabular-nums ${
                    score(currentStudent.id) >= 75 ? "text-[#c8ff00]" : score(currentStudent.id) >= 50 ? "text-yellow-300" : "text-red-400"
                  }`}>
                    {score(currentStudent.id)}
                  </div>
                  <div className="text-xs font-black text-white/85 uppercase tracking-wider">
                    {wrongCount(currentStudent.id)} ΛΑΘΟΣ
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Prev / Next navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => switchTo(activeStudents[activeIdx - 1].id)}
          disabled={activeIdx === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-ink/15 text-sm font-semibold text-ink/70 hover:border-ink/30 hover:text-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          ← Προηγούμενος
        </button>
        <span className="text-xs text-ink/45 tabular">{activeIdx + 1} / {activeStudents.length}</span>
        {activeIdx < activeStudents.length - 1 ? (
          <button
            onClick={() => switchTo(activeStudents[activeIdx + 1].id)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#056ef5] text-white text-sm font-bold hover:bg-[#0451b8] transition-colors cursor-pointer"
          >
            Επόμενος →
          </button>
        ) : (
          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-green-600 text-white text-sm font-black uppercase tracking-wider hover:bg-green-700 transition-colors disabled:opacity-40 cursor-pointer"
          >
            {saving ? "Αποθήκευση…" : isReGrading ? "Αποθήκευση →" : "Υποβολή όλων →"}
          </button>
        )}
      </div>

      {!allVisited && !isReGrading && (
        <p className="text-xs text-ink/40 text-center">
          Δείτε όλους τους μαθητές πριν την τελική υποβολή
        </p>
      )}
    </div>
  );
}

function CellBtn({ isWrong, onToggle, hue }: { isWrong: boolean; onToggle: () => void; hue: "purple" | "blue" }) {
  const hover = hue === "purple"
    ? "hover:bg-purple-50 hover:text-[#7c00d0]/40"
    : "hover:bg-blue-50 hover:text-[#056ef5]/40";
  return (
    <button
      onClick={onToggle}
      style={{ width: "100%", height: 48 }}
      className={`text-xl font-black transition-colors cursor-pointer select-none ${
        isWrong ? "bg-red-100 text-red-600 hover:bg-red-200" : `text-transparent ${hover}`
      }`}
    >
      ✕
    </button>
  );
}

function Checkbox({ checked, indeterminate = false, onChange }: { checked: boolean; indeterminate?: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      onClick={onChange}
      onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onChange(); } }}
      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-[#056ef5] focus:ring-offset-1 ${
        checked || indeterminate ? "bg-[#056ef5] border-[#056ef5]" : "border-ink/25 hover:border-[#056ef5]"
      }`}
    >
      {checked && <span aria-hidden="true" className="text-white text-xs font-black leading-none">✓</span>}
      {!checked && indeterminate && <span aria-hidden="true" className="text-white text-xs font-black leading-none">–</span>}
    </button>
  );
}
