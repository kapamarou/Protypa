"use client";
import { useState } from "react";
import Link from "next/link";
import { el } from "@/lib/i18n/el";
import type { ClientQuestion } from "@/lib/types";
import type { GradingResult } from "@/lib/grading";

export function GradingClient({
  paperId,
  paperTitle,
  pdfUrl,
  questions,
}: {
  paperId: string;
  paperTitle: string;
  pdfUrl: string | null;
  questions: ClientQuestion[];
}) {
  const [studentName, setStudentName] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<GradingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function pick(num: number, choice: string) {
    setAnswers((a) => ({ ...a, [num]: choice }));
  }

  function reset() {
    setAnswers({});
    setStudentName("");
    setResult(null);
    setError(null);
  }

  async function submit() {
    setError(null);
    if (Object.keys(answers).length < questions.length) {
      setError(el.grading.pleaseAnswer);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paper_id: paperId, student_name: studentName, answers }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? el.auth.error);
      else setResult(data);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/account/papers"
            className="text-xs text-ink/50 hover:text-[#056ef5] transition-colors font-bold uppercase tracking-wider"
          >
            ← {el.account.papersTitle}
          </Link>
          <h1 className="font-display text-2xl text-ink mt-1">{paperTitle}</h1>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 min-h-[80vh]">
        {/* Left: PDF */}
        <div className="border border-ink/10 rounded-2xl overflow-hidden bg-white">
          {pdfUrl ? (
            <iframe src={pdfUrl} className="w-full h-[80vh]" title={paperTitle} />
          ) : (
            <div className="p-6 text-ink/50 text-sm">
              {el.grading.pdfFallback}
              <a href={pdfUrl ?? "#"} target="_blank" rel="noopener" className="text-[#056ef5] font-bold hover:underline ml-1">
                {el.grading.pdfOpenLink}
              </a>
            </div>
          )}
        </div>

        {/* Right: questions / results */}
        <div className="border border-ink/10 rounded-2xl bg-white p-6 overflow-y-auto max-h-[80vh]">
          {result ? (
            <ResultsView result={result} onReset={reset} />
          ) : (
            <>
              <div className="mb-5">
                <label className="block">
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-ink/40">
                    {el.grading.studentName}
                  </span>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder={el.grading.studentNamePlaceholder}
                    className="mt-2 w-full bg-transparent border-0 border-b-2 border-ink/20 px-0 py-2 text-base font-display text-ink placeholder:text-ink/30 focus:outline-none focus:border-[#056ef5] transition-colors"
                  />
                </label>
              </div>

              <div className="space-y-3">
                {questions.map((q) => (
                  <div key={q.id} className="p-4 rounded-xl border border-ink/10 hover:border-[#056ef5]/30 transition-colors">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <span className="font-display text-sm text-ink">
                        {el.grading.questionLabel} {q.number}
                      </span>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#056ef5]/10 text-[#056ef5] uppercase tracking-wider">
                        {el.questionTypes[q.qtype] ?? q.qtype}
                      </span>
                    </div>
                    {q.prompt_el && (
                      <p className="text-xs text-ink/60 mb-3 leading-relaxed">{q.prompt_el}</p>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      {q.choices.map((c) => {
                        const selected = answers[q.number] === c;
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => pick(q.number, c)}
                            className={
                              "px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all " +
                              (selected
                                ? "bg-[#056ef5] text-white border-[#056ef5]"
                                : "bg-white border-ink/15 text-ink hover:border-[#056ef5] hover:text-[#056ef5]")
                            }
                          >
                            {c}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-xl">
                  {error}
                </div>
              )}

              <button
                onClick={submit}
                disabled={submitting}
                className="mt-6 w-full px-6 py-3.5 rounded-full bg-[#FDFFFC] text-[#056ef5] border-2 border-[#056ef5] font-black uppercase tracking-wider text-xs hover:bg-[#056ef5]/5 hover:-translate-y-0.5 transition-all disabled:opacity-50 cursor-pointer"
              >
                {submitting ? el.common.loading : el.grading.submit}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultsView({ result, onReset }: { result: GradingResult; onReset: () => void }) {
  const pct = result.total > 0 ? Math.round((result.score / result.total) * 100) : 0;
  return (
    <div>
      <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-ink/40 mb-2">
        Αποτελέσματα
      </div>
      <h2 className="font-display text-2xl text-ink">{el.grading.resultsTitle}</h2>

      <div className="mt-5 rounded-2xl bg-[#7c00d0] p-6 text-center">
        <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/60 mb-2">
          {el.grading.totalScore}
        </div>
        <div className="font-display text-6xl text-white leading-none tabular-nums">
          {result.score}
          <span className="text-2xl text-white/40">/{result.total}</span>
        </div>
        <div className="mt-1 text-[#c8ff00] font-display text-xl">{pct}%</div>
      </div>

      <div className="mt-6">
        <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-ink/40 mb-3">
          {el.grading.breakdown}
        </div>
        <div className="space-y-3">
          {Object.entries(result.type_breakdown).map(([type, b]) => {
            const p = b.total > 0 ? (b.correct / b.total) * 100 : 0;
            return (
              <div key={type}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-bold text-ink">{el.questionTypes[type] ?? type}</span>
                  <span className="text-ink/50 tabular-nums">
                    {b.correct} {el.grading.outOf} {b.total}
                  </span>
                </div>
                <div className="h-2 bg-ink/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#056ef5] rounded-full transition-all duration-700"
                    style={{ width: `${p}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 text-xs text-green-700 bg-green-50 border border-green-200 p-3 rounded-xl">
        {el.grading.saved}
      </div>

      <button
        onClick={onReset}
        className="mt-5 w-full px-6 py-3.5 rounded-full bg-[#FDFFFC] text-[#7c00d0] border-2 border-[#7c00d0] font-black uppercase tracking-wider text-xs hover:bg-[#7c00d0]/5 hover:-translate-y-0.5 transition-all cursor-pointer"
      >
        {el.grading.reset}
      </button>
    </div>
  );
}
