"use client";

import { useState } from "react";

export default function AISummaryCard({
  studentId,
  initialSummary,
  initialGeneratedAt,
}: {
  studentId: string;
  initialSummary: string | null;
  initialGeneratedAt: string | null;
}) {
  const [summary, setSummary] = useState(initialSummary);
  const [generatedAt, setGeneratedAt] = useState(initialGeneratedAt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/account/students/${studentId}/ai-summary`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Σφάλμα");
      setSummary(data.summary);
      setGeneratedAt(data.generated_at);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Σφάλμα δημιουργίας ανάλυσης.");
    } finally {
      setLoading(false);
    }
  }

  const formattedDate = generatedAt
    ? new Date(generatedAt).toLocaleDateString("el-GR", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  return (
    <section className="no-print">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-[11px] font-semibold tracking-wider uppercase text-ink/55">ΑΙ Ανάλυση Μαθητή</h2>
        {summary && !loading && (
          <button
            onClick={generate}
            className="text-[11px] text-ink/45 hover:text-ink transition-colors"
          >
            Ανανέωση ↺
          </button>
        )}
      </div>

      <div className="border border-ink/10 rounded-md p-5">
        {loading ? (
          <div className="flex items-center gap-3 py-6 text-sm text-ink/55">
            <svg className="animate-spin w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Δημιουργία ανάλυσης… αυτό μπορεί να πάρει 10–15 δευτερόλεπτα.
          </div>
        ) : summary ? (
          <>
            <pre className="whitespace-pre-wrap font-sans text-sm text-ink leading-relaxed">{summary}</pre>
            <div className="mt-4 pt-4 border-t border-ink/8 text-[11px] text-ink/40">
              Τελευταία ενημέρωση: {formattedDate}
            </div>
          </>
        ) : (
          <div className="py-6 text-center">
            <p className="text-sm text-ink/50 mb-4">
              Δεν έχει δημιουργηθεί ανάλυση για αυτόν τον μαθητή ακόμα.
            </p>
            <button
              onClick={generate}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#056ef5] text-white text-sm font-semibold hover:bg-[#0451b8] transition-colors"
            >
              <span>✦</span> Δημιουργία ανάλυσης
            </button>
          </div>
        )}

        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}
      </div>
    </section>
  );
}
