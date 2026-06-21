"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Simulation } from "@/lib/types";

type FormState = {
  number: string; title: string; subject: string;
  exam_date: string; unlocks_at: string; grading_closes_at: string;
  greek_questions: string; math_questions: string; is_published: boolean;
  material_url: string;
  // Legacy single combined PDF — still saved for backward compat, no UI for it
  questions_url: string;
  // Per-kind PDFs (v2)
  greek_questions_url: string;
  math_questions_url: string;
  greek_answers_url: string;
  math_answers_url: string;
};

const EMPTY_FORM: FormState = {
  number: "", title: "", subject: "bundle",
  exam_date: "", unlocks_at: "", grading_closes_at: "",
  greek_questions: "20", math_questions: "20", is_published: false,
  material_url: "", questions_url: "",
  greek_questions_url: "", math_questions_url: "",
  greek_answers_url: "", math_answers_url: "",
};

export default function AdminSimulationsPage() {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.from("simulations").select("*").order("number");
    setSimulations((data as Simulation[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  function startEdit(sim: Simulation) {
    setEditId(sim.id);
    setForm({
      number: String(sim.number),
      title: sim.title,
      subject: sim.subject,
      exam_date: sim.exam_date?.slice(0, 10) ?? "",
      unlocks_at: sim.unlocks_at?.slice(0, 16) ?? "",
      grading_closes_at: sim.grading_closes_at?.slice(0, 16) ?? "",
      greek_questions: String(sim.greek_questions),
      math_questions: String(sim.math_questions),
      is_published: sim.is_published,
      material_url: sim.material_url ?? "",
      questions_url: sim.questions_url ?? "",
      greek_questions_url: sim.greek_questions_url ?? "",
      math_questions_url: sim.math_questions_url ?? "",
      greek_answers_url: sim.greek_answers_url ?? "",
      math_answers_url: sim.math_answers_url ?? "",
    });
    setShowForm(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    const supabase = createSupabaseBrowserClient();

    // Auto-compute the next available number when creating; preserve when editing.
    const nextNumber = editId
      ? parseInt(form.number) || 1
      : (simulations.reduce((max, s) => Math.max(max, s.number), 0) + 1);

    const payload = {
      number: nextNumber,
      title: form.title,
      // Every διαγώνισμα is the full 20 Greek + 20 Math bundle (per the global rule)
      subject: "bundle",
      greek_questions: 20,
      math_questions: 20,
      exam_date: form.exam_date || null,
      unlocks_at: form.unlocks_at ? new Date(form.unlocks_at).toISOString() : null,
      grading_closes_at: form.grading_closes_at ? new Date(form.grading_closes_at).toISOString() : null,
      is_published: form.is_published,
      material_url: form.material_url || null,
      questions_url: form.questions_url || null,
      greek_questions_url: form.greek_questions_url || null,
      math_questions_url:  form.math_questions_url  || null,
      greek_answers_url:   form.greek_answers_url   || null,
      math_answers_url:    form.math_answers_url    || null,
    };
    const { error: err } = editId
      ? await supabase.from("simulations").update(payload).eq("id", editId)
      : await supabase.from("simulations").insert(payload);
    setSaving(false);
    if (err) { setError(err.message); return; }
    setShowForm(false); setEditId(null); setForm(EMPTY_FORM);
    load();
  }

  async function seedTags(sim: Simulation) {
    const supabase = createSupabaseBrowserClient();
    await supabase.rpc("seed_default_question_tags", {
      sim_id: sim.id,
      greek_q: sim.greek_questions,
      math_q: sim.math_questions,
    });
    alert(`Κατηγορίες ερωτήσεων δημιουργήθηκαν για "${sim.title}"`);
  }

  async function togglePublish(sim: Simulation) {
    const supabase = createSupabaseBrowserClient();
    await supabase.from("simulations").update({ is_published: !sim.is_published }).eq("id", sim.id);
    load();
  }

  const subjectLabel = (s: string) => s === "greek" ? "Γλώσσα" : s === "math" ? "Μαθηματικά" : "Και τα δύο";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/80 mb-2">Admin</div>
          <h1 className="font-display text-3xl text-white">Προσομοιώσεις</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/yli"
            className="!text-white px-4 py-2.5 rounded-full border border-white/20 hover:border-white/40 font-bold uppercase tracking-wider text-xs hover:bg-white/5 transition-all"
          >
            ↑ Ύλη
          </Link>
          <Link
            href="/admin/simulations/categorizations"
            className="!text-white px-4 py-2.5 rounded-full border border-white/20 hover:border-white/40 font-bold uppercase tracking-wider text-xs hover:bg-white/5 transition-all"
          >
            ↑ Κατηγοριοποιήσεις
          </Link>
          <button
            onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY_FORM); }}
            className="px-5 py-2.5 rounded-full bg-[#056ef5] text-white font-black uppercase tracking-wider text-xs hover:bg-[#0451b8] transition-all cursor-pointer"
          >
            + Νέα Προσομοίωση
          </button>
        </div>
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <div className="rounded-2xl border border-[#056ef5]/40 bg-[#056ef5]/5 p-6">
          <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#056ef5] mb-5">
            {editId ? "Επεξεργασία Προσομοίωσης" : "Νέα Προσομοίωση"}
          </div>
          <form onSubmit={save} className="space-y-5">
            <AdminField label="Τίτλος *" placeholder="π.χ. Διαγώνισμα 1 · Νοέμβριος 2025"
              value={form.title} onChange={(v) => set("title", v)} required />
            <div className="grid md:grid-cols-3 gap-5">
              <EUDateField label="Ημ/νία εξέτασης" value={form.exam_date}        onChange={(v) => set("exam_date", v)} />
              <EUDateField label="Ξεκλείδωμα"      value={form.unlocks_at}        onChange={(v) => set("unlocks_at", v)} withTime />
              <EUDateField label="Κλείσιμο βαθμολόγησης" value={form.grading_closes_at} onChange={(v) => set("grading_closes_at", v)} withTime />
            </div>
            <div className="pt-2 border-t border-white/10">
              <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-white mb-4">Αρχεία διαγωνίσματος</div>
              <div className="grid md:grid-cols-2 gap-5">
                <PdfUpload
                  label="Θέματα Γλώσσας (PDF)"
                  url={form.greek_questions_url}
                  onChange={(v) => set("greek_questions_url", v)}
                />
                <PdfUpload
                  label="Θέματα Μαθηματικών (PDF)"
                  url={form.math_questions_url}
                  onChange={(v) => set("math_questions_url", v)}
                />
                <PdfUpload
                  label="Απαντήσεις Γλώσσας (PDF)"
                  url={form.greek_answers_url}
                  onChange={(v) => set("greek_answers_url", v)}
                />
                <PdfUpload
                  label="Απαντήσεις Μαθηματικών (PDF)"
                  url={form.math_answers_url}
                  onChange={(v) => set("math_answers_url", v)}
                />
              </div>
              <p className="text-xs font-medium text-white/75 mt-3">
                Κάθε PDF κατεβαίνει από τους χρήστες με υδατογράφημα του φροντιστηρίου τους.
                Δεν χρειάζεται να μεταφορτώσετε και τα τέσσερα — άδεια πεδία απλά κρύβονται από το dropdown.
              </p>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${form.is_published ? "bg-[#c8ff00] border-[#c8ff00]" : "border-white/30"}`}
                onClick={() => set("is_published", !form.is_published)}>
                {form.is_published && <span className="text-ink text-xs font-black">✓</span>}
              </div>
              <span className="text-sm text-white/70">Δημοσιευμένο (ορατό σε χρήστες)</span>
            </label>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); }}
                className="px-5 py-2 rounded-full border border-white/20 text-white text-sm font-bold hover:border-white/40 transition-colors cursor-pointer">
                Ακύρωση
              </button>
              <button type="submit" disabled={saving}
                className="px-6 py-2 rounded-full bg-[#056ef5] text-white font-black text-sm uppercase tracking-wider hover:bg-[#0451b8] transition-all disabled:opacity-50 cursor-pointer">
                {saving ? "Αποθήκευση…" : "Αποθήκευση"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Simulations list */}
      {loading ? (
        <div className="text-center py-12 text-white/80">Φόρτωση…</div>
      ) : simulations.length === 0 ? (
        <div className="rounded-2xl border border-white/10 p-12 text-center">
          <p className="text-white/80 text-sm">Δεν υπάρχουν Προσομοιώσεις ακόμα. Δημιουργήστε την πρώτη.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {simulations.map((sim) => (
            <div key={sim.id} className="rounded-2xl border border-white/10 bg-white/5 p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#056ef5]/20 text-[#056ef5] font-display text-lg grid place-items-center flex-shrink-0">
                {sim.number}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white">{sim.title}</div>
                <div className="text-xs text-white mt-0.5 flex flex-wrap gap-3">
                  <span>{subjectLabel(sim.subject)}</span>
                  {sim.exam_date && <span>Εξέταση: {new Date(sim.exam_date).toLocaleDateString("el-GR")}</span>}
                  {sim.unlocks_at && <span>Ξεκλ.: {new Date(sim.unlocks_at).toLocaleDateString("el-GR")}</span>}
                  {sim.grading_closes_at && <span>Κλείσιμο: {new Date(sim.grading_closes_at).toLocaleDateString("el-GR")}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button onClick={() => togglePublish(sim)}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                    sim.is_published
                      ? "border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20"
                      : "border-white/20 text-white hover:border-white/40"
                  }`}>
                  {sim.is_published ? "✓ Δημοσιευμένο" : "Μη δημοσ."}
                </button>
                <button onClick={() => seedTags(sim)}
                  className="text-[10px] font-bold px-3 py-1.5 rounded-full border border-[#c8ff00]/30 text-[#c8ff00]/70 hover:bg-[#c8ff00]/10 transition-all cursor-pointer"
                  title="Δημιουργία προεπιλεγμένων κατηγοριών ερωτήσεων">
                  Κατηγορίες
                </button>
                <button onClick={() => startEdit(sim)}
                  className="text-xs font-bold text-[#056ef5] hover:text-[#c8ff00] transition-colors cursor-pointer">
                  Επεξ. →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PdfUpload({ label, url, onChange }: { label: string; url: string; onChange: (v: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(file: File) {
    if (file.type !== "application/pdf") {
      setError("Μόνο PDF αρχεία επιτρέπονται.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("Το αρχείο πρέπει να είναι μικρότερο από 50 MB.");
      return;
    }
    setUploading(true); setError(null);
    const supabase = createSupabaseBrowserClient();
    const path = `${crypto.randomUUID()}.pdf`;
    const { error: upErr } = await supabase.storage.from("exam-papers").upload(path, file, {
      contentType: "application/pdf",
      upsert: false,
    });
    if (upErr) { setError(upErr.message); setUploading(false); return; }
    // Store only the storage path. Downloads route through
    // /api/account/exam-paper/[sim_id] which fetches via service role,
    // applies a watermark with the school's trade_name, and returns the PDF.
    onChange(path);
    setUploading(false);
  }

  // Filename slug for display (last segment of the URL)
  const filename = url ? decodeURIComponent(url.split("/").pop() ?? "") : null;

  return (
    <div>
      <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-white mb-2">{label}</div>
      {url ? (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-white/15 bg-white/5">
          <div className="w-9 h-9 rounded bg-red-500/15 text-red-300 grid place-items-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-white truncate" title={filename ?? ""}>{filename}</div>
            <button
              type="button"
              onClick={async () => {
                // Bucket is private — generate a short-lived signed URL on
                // demand for admin preview. Customers go through the
                // watermark route at /api/account/exam-paper/[id].
                const supabase = createSupabaseBrowserClient();
                const { data, error: signErr } = await supabase.storage
                  .from("exam-papers")
                  .createSignedUrl(url, 60);
                if (signErr || !data?.signedUrl) {
                  alert(`Δεν ήταν δυνατή η προβολή: ${signErr?.message ?? "άγνωστο σφάλμα"}`);
                  return;
                }
                window.open(data.signedUrl, "_blank", "noopener,noreferrer");
              }}
              className="text-[10px] text-[#c8ff00] hover:underline cursor-pointer"
            >
              Άνοιγμα PDF →
            </button>
          </div>
          <label className="cursor-pointer text-[10px] font-bold uppercase tracking-wider text-white/60 hover:text-white border border-white/15 hover:border-white/40 px-2.5 py-1.5 rounded transition-colors">
            <input type="file" accept="application/pdf" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
            {uploading ? "..." : "Αλλαγή"}
          </label>
          <button type="button" onClick={() => onChange("")} title="Αφαίρεση"
            className="text-[10px] text-white/45 hover:text-red-400 transition-colors cursor-pointer">
            ✕
          </button>
        </div>
      ) : (
        <label className="cursor-pointer block">
          <input type="file" accept="application/pdf" className="hidden"
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
          <div className="flex items-center justify-center gap-2 px-4 py-5 rounded-lg border-2 border-dashed border-white/20 hover:border-[#056ef5]/60 hover:bg-[#056ef5]/5 transition-colors text-center">
            <div>
              <div className="text-xs font-bold text-white/70">
                {uploading ? "Μεταφόρτωση…" : "Επιλέξτε PDF"}
              </div>
              <div className="text-[10px] text-white/35 mt-0.5">ή σύρετε εδώ · έως 50 MB</div>
            </div>
          </div>
        </label>
      )}
      {error && <p className="text-[10px] text-red-400 mt-1">{error}</p>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// European-format date / datetime input. Always displays dd/mm/yyyy[ HH:MM]
// regardless of browser locale. Stores YYYY-MM-DD or YYYY-MM-DDTHH:MM
// internally so submission code keeps working.
// ──────────────────────────────────────────────────────────────────────────

function EUDateField({
  label, value, onChange, withTime = false,
}: {
  label: string;
  value: string;            // stored format: YYYY-MM-DD or YYYY-MM-DDTHH:MM
  onChange: (v: string) => void;
  withTime?: boolean;
}) {
  // The visible text input shows dd/mm/yyyy[ HH:MM]; keep its own local state
  // so partial typing doesn't get reformatted on every keystroke.
  const [text, setText] = useState(() => isoToEU(value, withTime));

  // If the parent value changes externally (e.g. startEdit), resync.
  useEffect(() => {
    setText(isoToEU(value, withTime));
  }, [value, withTime]);

  function commit(raw: string) {
    setText(raw);
    const iso = euToIso(raw, withTime);
    onChange(iso ?? "");
  }

  return (
    <label className="block">
      <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white">{label}</span>
      <div className="relative mt-2">
        <input
          type="text"
          inputMode="numeric"
          value={text}
          placeholder={withTime ? "ηη/μμ/εεεε ΩΩ:ΛΛ" : "ηη/μμ/εεεε"}
          onChange={(e) => commit(e.target.value)}
          className="w-full bg-transparent border-0 border-b-2 border-white/20 px-0 py-2.5 pr-9 text-sm text-white placeholder:text-white/80 focus:outline-none focus:border-[#056ef5] transition-colors tabular-nums"
        />
        {/* Hidden native picker — clicking the calendar icon opens it */}
        <input
          type={withTime ? "datetime-local" : "date"}
          value={value}
          onChange={(e) => commit(isoToEU(e.target.value, withTime))}
          className="absolute right-0 top-1/2 -translate-y-1/2 w-7 opacity-0 cursor-pointer"
          aria-hidden="true"
          tabIndex={-1}
        />
        <svg
          className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-white"
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </div>
    </label>
  );
}

// ISO 8601 (date or datetime-local) → "dd/mm/yyyy" or "dd/mm/yyyy HH:MM"
function isoToEU(iso: string, withTime: boolean): string {
  if (!iso) return "";
  const [date, time] = iso.split("T");
  if (!date) return "";
  const parts = date.split("-");
  if (parts.length !== 3) return "";
  const [y, m, d] = parts;
  let out = `${d}/${m}/${y}`;
  if (withTime && time) out += ` ${time.slice(0, 5)}`;
  return out;
}

// "dd/mm/yyyy" or "dd/mm/yyyy HH:MM" → ISO. Returns null if input is invalid /
// partial — the caller can decide to keep typing or clear the stored value.
function euToIso(text: string, withTime: boolean): string | null {
  if (!text.trim()) return "";
  const re = withTime
    ? /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[\s,]+(\d{1,2}):(\d{2}))?$/
    : /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const m = text.match(re);
  if (!m) return null;
  const [, d, mo, y, h, mn] = m;
  const dd = d.padStart(2, "0");
  const mm = mo.padStart(2, "0");
  // Basic sanity check
  const day = +dd, mon = +mm;
  if (mon < 1 || mon > 12 || day < 1 || day > 31) return null;
  if (!withTime) return `${y}-${mm}-${dd}`;
  if (!h || !mn) return `${y}-${mm}-${dd}T00:00`;
  const hh = h.padStart(2, "0");
  if (+hh > 23 || +mn > 59) return null;
  return `${y}-${mm}-${dd}T${hh}:${mn}`;
}

function AdminField({ label, value, onChange, type = "text", placeholder, required = false }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean;
}) {
  // Force European dd/mm/yyyy formatting on date / datetime-local inputs
  // regardless of the user's browser locale.
  const isDate = type === "date" || type === "datetime-local";
  return (
    <label className="block">
      <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white">{label}</span>
      <input
        required={required} type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        {...(isDate ? { lang: "el-GR" } : {})}
        className="mt-2 w-full bg-transparent border-0 border-b-2 border-white/20 px-0 py-2.5 text-sm text-white placeholder:text-white/80 focus:outline-none focus:border-[#056ef5] transition-colors"
      />
    </label>
  );
}
