"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Subject = "greek" | "math";

type YliState = {
  uploading: boolean;
  error: string | null;
  success: boolean;
  visible: boolean;
  toggling: boolean;
};

const LABELS: Record<Subject, { title: string; color: string; settingKey: string }> = {
  greek: { title: "Γλώσσα",      color: "#7c00d0", settingKey: "yli_greek_visible" },
  math:  { title: "Μαθηματικά",  color: "#056ef5", settingKey: "yli_math_visible"  },
};

export default function AdminYliPage() {
  const [state, setState] = useState<Record<Subject, YliState>>({
    greek: { uploading: false, error: null, success: false, visible: false, toggling: false },
    math:  { uploading: false, error: null, success: false, visible: false, toggling: false },
  });
  const [loading, setLoading] = useState(true);

  // Load current visibility settings on mount.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["yli_greek_visible", "yli_math_visible"])
      .then(({ data }) => {
        if (!data) return;
        const map = Object.fromEntries(data.map((r) => [r.key, r.value === "true"]));
        setState((prev) => ({
          greek: { ...prev.greek, visible: map["yli_greek_visible"] ?? false },
          math:  { ...prev.math,  visible: map["yli_math_visible"]  ?? false },
        }));
        setLoading(false);
      });
  }, []);

  function patch(subject: Subject, p: Partial<YliState>) {
    setState((prev) => ({ ...prev, [subject]: { ...prev[subject], ...p } }));
  }

  async function upload(subject: Subject, file: File) {
    if (file.type !== "application/pdf") {
      patch(subject, { error: "Μόνο PDF αρχεία επιτρέπονται.", success: false });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      patch(subject, { error: "Το αρχείο πρέπει να είναι μικρότερο από 50 MB.", success: false });
      return;
    }
    patch(subject, { uploading: true, error: null, success: false });
    const supabase = createSupabaseBrowserClient();
    const { error: upErr } = await supabase.storage
      .from("exam-papers")
      .upload(`yli/${subject}.pdf`, file, { contentType: "application/pdf", upsert: true });
    if (upErr) {
      patch(subject, { uploading: false, error: upErr.message });
      return;
    }
    patch(subject, { uploading: false, success: true });
  }

  async function toggleVisibility(subject: Subject) {
    const next = !state[subject].visible;
    patch(subject, { toggling: true });
    const supabase = createSupabaseBrowserClient();
    const key = LABELS[subject].settingKey;
    await supabase.from("app_settings").upsert({ key, value: String(next), updated_at: new Date().toISOString() });
    patch(subject, { visible: next, toggling: false });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/80 mb-2">Admin</div>
          <h1 className="font-display text-3xl text-white">Ύλη</h1>
          <p className="text-sm text-white/60 mt-1">
            Ανεβάστε τα PDF της ετήσιας ύλης και ελέγξτε αν είναι ορατά στους χρήστες.
          </p>
        </div>
        <Link
          href="/admin/simulations"
          className="!text-white/70 hover:!text-white text-xs font-bold uppercase tracking-wider transition-colors flex-shrink-0"
        >
          ← Πίσω
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-white/40 text-sm">Φόρτωση…</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {(["greek", "math"] as Subject[]).map((subject) => {
            const { title, color, settingKey } = LABELS[subject];
            const { uploading, error, success, visible, toggling } = state[subject];
            return (
              <div key={subject} className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-black tracking-[0.2em] uppercase" style={{ color }}>
                      Ύλη
                    </div>
                    <div className="font-display text-xl text-white mt-0.5">{title}</div>
                  </div>

                  {/* Visibility toggle */}
                  <button
                    type="button"
                    onClick={() => toggleVisibility(subject)}
                    disabled={toggling}
                    className="flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    title={visible ? "Ορατό στους χρήστες — κάντε κλικ για απόκρυψη" : "Κρυφό — κάντε κλικ για εμφάνιση"}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                      {visible ? "Ορατό" : "Κρυφό"}
                    </span>
                    {/* Toggle pill */}
                    <span
                      className="relative inline-flex w-10 h-5 rounded-full transition-colors duration-200"
                      style={{ backgroundColor: visible ? color : "rgba(255,255,255,0.15)" }}
                    >
                      <span
                        className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
                        style={{ transform: visible ? "translateX(20px)" : "translateX(0)" }}
                      />
                    </span>
                  </button>
                </div>

                {/* Visibility status notice */}
                <div className={`text-[10px] font-bold px-3 py-2 rounded-lg ${
                  visible
                    ? "bg-green-500/10 text-green-400 border border-green-500/20"
                    : "bg-white/5 text-white/40 border border-white/10"
                }`}>
                  {visible
                    ? "✓ Εμφανίζεται στη σελίδα Διαγωνισμάτων των χρηστών"
                    : "— Δεν εμφανίζεται στους χρήστες"}
                </div>

                {/* Upload zone */}
                <div>
                  <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/40 mb-2">
                    Αρχείο PDF
                  </div>
                  <label className="cursor-pointer block">
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) upload(subject, f);
                        e.target.value = "";
                      }}
                    />
                    <div
                      className="flex items-center justify-center gap-2 px-4 py-5 rounded-xl border-2 border-dashed transition-colors text-center"
                      style={{ borderColor: `${color}40` }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${color}80`)}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = `${color}40`)}
                    >
                      {uploading ? (
                        <span className="text-sm font-bold text-white/60">Μεταφόρτωση…</span>
                      ) : (
                        <div>
                          <div className="text-sm font-bold text-white/70">Επιλέξτε PDF</div>
                          <div className="text-[10px] text-white/35 mt-0.5">ή σύρετε εδώ · έως 50 MB</div>
                        </div>
                      )}
                    </div>
                  </label>

                  {success && (
                    <div className="flex items-center gap-2 text-green-400 text-xs font-bold mt-2">
                      <span className="w-4 h-4 rounded-full bg-green-500/20 grid place-items-center text-[9px]">✓</span>
                      Αποθηκεύτηκε επιτυχώς.
                    </div>
                  )}
                  {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
                </div>

                {/* Preview current file */}
                <button
                  type="button"
                  onClick={async () => {
                    const supabase = createSupabaseBrowserClient();
                    const { data, error: signErr } = await supabase.storage
                      .from("exam-papers")
                      .createSignedUrl(`yli/${subject}.pdf`, 60);
                    if (signErr || !data?.signedUrl) {
                      alert("Δεν βρέθηκε αρχείο — ανεβάστε ένα πρώτα.");
                      return;
                    }
                    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
                  }}
                  className="text-[10px] font-bold uppercase tracking-wider text-white/35 hover:text-white transition-colors cursor-pointer"
                >
                  Προβολή τρέχοντος PDF →
                </button>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
