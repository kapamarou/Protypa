"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Student } from "@/lib/types";

const DIMOTIKO = ["Δημοτικό"];
const GYMNASIO = ["Γυμνάσιο"];
const CLASS_YEARS = [...DIMOTIKO, ...GYMNASIO];

const AVATAR_COLORS = ["#056ef5", "#7c00d0", "#0451b8", "#5a0099", "#1b1b1b"];
function pickColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    first_name: "", last_name: "", class_year: "",
    subjects: [] as string[], notes: "",
    mother_name: "", father_name: "",
    gender: "" as "" | "female" | "male" | "other",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [isPreview, setIsPreview] = useState(false);

  const load = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsPreview(true); setLoading(false); setStudents(PREVIEW_STUDENTS); return; }
    const { data } = await supabase.from("students").select("*").eq("school_id", user.id).order("last_name");
    setStudents((data as Student[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function resetForm() {
    setForm({
      first_name: "", last_name: "", class_year: "",
      subjects: [], notes: "",
      mother_name: "", father_name: "", gender: "",
    });
    setEditId(null); setError(null);
  }
  function startEdit(s: Student) {
    setForm({
      first_name: s.first_name, last_name: s.last_name,
      class_year: s.class_year ?? "",
      subjects: s.subjects, notes: s.notes ?? "",
      mother_name: s.mother_name ?? "",
      father_name: s.father_name ?? "",
      gender: (s.gender ?? "") as "" | "female" | "male" | "other",
    });
    setEditId(s.id); setShowForm(true);
  }
  function toggleSubject(sub: string) {
    setForm((p) => ({ ...p, subjects: p.subjects.includes(sub) ? p.subjects.filter((x) => x !== sub) : [...p.subjects, sub] }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) { setError("Συμπληρώστε όνομα και επώνυμο."); return; }
    setSaving(true); setError(null);
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const mock: Student = {
        id: crypto.randomUUID(), school_id: "preview",
        first_name: form.first_name, last_name: form.last_name,
        class_year: form.class_year || null, subjects: form.subjects,
        notes: form.notes || null,
        mother_name: form.mother_name || null,
        father_name: form.father_name || null,
        gender: (form.gender || null) as Student["gender"],
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      setStudents((prev) => editId
        ? prev.map((s) => s.id === editId ? { ...s, ...mock, id: editId } : s)
        : [...prev, mock].sort((a, b) => a.last_name.localeCompare(b.last_name))
      );
      setSaving(false); setShowForm(false); resetForm(); return;
    }
    // Only include optional columns when they have a value — PostgREST will
    // error on null for a column that doesn't yet exist in the schema cache.
    const payload: Record<string, unknown> = {
      school_id: user.id,
      first_name: form.first_name,
      last_name: form.last_name,
      class_year: form.class_year || null,
      subjects: form.subjects,
      notes: form.notes || null,
    };
    if (form.mother_name) payload.mother_name = form.mother_name;
    if (form.father_name) payload.father_name = form.father_name;
    if (form.gender)      payload.gender       = form.gender;
    const { error: err } = editId
      ? await supabase.from("students").update(payload).eq("id", editId)
      : await supabase.from("students").insert(payload);

    setSaving(false);
    if (err) { setError(err.message); return; }
    setShowForm(false); resetForm(); load();
  }

  async function remove(id: string) {
    if (!confirm("Διαγραφή μαθητή; Θα διαγραφούν και τα δεδομένα βαθμολόγησης.")) return;
    if (isPreview) { setStudents((prev) => prev.filter((s) => s.id !== id)); return; }
    const supabase = createSupabaseBrowserClient();
    await supabase.from("students").delete().eq("id", id);
    load();
  }

  const filtered = useMemo(() => students.filter((s) => {
    const q = search.toLowerCase();
    const name = `${s.first_name} ${s.last_name}`.toLowerCase();
    return (!q || name.includes(q)) && (!filterClass || s.class_year === filterClass);
  }), [students, search, filterClass]);

  const counts = useMemo(() => ({
    total: students.length,
    dimotiko: students.filter((s) => DIMOTIKO.includes(s.class_year ?? "")).length,
    gymnasio: students.filter((s) => GYMNASIO.includes(s.class_year ?? "")).length,
    greek: students.filter((s) => s.subjects.includes("greek")).length,
    math: students.filter((s) => s.subjects.includes("math")).length,
  }), [students]);

  const byClass = CLASS_YEARS.reduce<Record<string, Student[]>>((acc, cy) => {
    acc[cy] = filtered.filter((s) => s.class_year === cy);
    return acc;
  }, {});
  const noClass = filtered.filter((s) => !s.class_year || !CLASS_YEARS.includes(s.class_year));

  return (
    <div className="space-y-6">
      {isPreview && (
        <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
          <strong>Προεπισκόπηση:</strong> Οι αλλαγές αποθηκεύονται μόνο τοπικά. Συνδεθείτε για μόνιμη αποθήκευση.
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs text-ink/45">Γονείς</div>
          <h1 className="font-display text-2xl text-ink mt-1">Αναλυτικά στοιχεία μαθητών</h1>
          <p className="text-sm text-ink/55 mt-1">Δεδομένα ανά μαθητή — μπορείτε να τα εκτυπώσετε και να τα μοιραστείτε με τους γονείς.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-2 rounded-md bg-[#056ef5] text-white font-bold text-xs hover:bg-[#0451b8] transition-colors cursor-pointer"
        >
          + Νέος μαθητής
        </button>
      </div>

      {/* KPI strip — dividers with brand color accents */}
      {students.length > 0 && (
        <div className="border-y border-ink/10 divide-x divide-ink/10 grid grid-cols-2 md:grid-cols-4">
          <StudentStat label="Σύνολο μαθητών"   value={counts.total}    color="#056ef5" />
          <StudentStat label="Δημοτικό"           value={counts.dimotiko} color="#7c00d0" />
          <StudentStat label="Γυμνάσιο"          value={counts.gymnasio} color="#056ef5" />
          <StudentStat label="Σε δύο μαθήματα" value={students.filter((s) => s.subjects.length === 2).length} color="#7c00d0" />
        </div>
      )}

      {/* ── Add/Edit form ── */}
      {showForm && (
        <div className="border border-ink/10 rounded-md p-5 bg-[#fafaf8]">
          <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#056ef5] mb-5">
            {editId ? "Επεξεργασία μαθητή" : "Νέος μαθητής"}
          </div>
          <form onSubmit={save} className="space-y-5">
            <div className="grid grid-cols-2 gap-5">
              <FormField label="Όνομα *" value={form.first_name} onChange={(v) => setForm((p) => ({ ...p, first_name: v }))} placeholder="π.χ. Μαρία" />
              <FormField label="Επώνυμο *" value={form.last_name} onChange={(v) => setForm((p) => ({ ...p, last_name: v }))} placeholder="π.χ. Παπαδοπούλου" />
            </div>

            <div>
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-ink/40">Φύλο</span>
              <div className="flex gap-2 mt-2">
                {[
                  { id: "female", label: "Θηλυκό" },
                  { id: "male",   label: "Αρσενικό" },
                  { id: "other",  label: "Άλλο" },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, gender: p.gender === id ? "" : (id as "female" | "male" | "other") }))}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${
                      form.gender === id
                        ? "border-[#056ef5] bg-[#056ef5] text-white"
                        : "border-ink/15 text-ink/60 hover:border-ink/30"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block">
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-ink/40">Τάξη</span>
                <select value={form.class_year} onChange={(e) => setForm((p) => ({ ...p, class_year: e.target.value }))}
                  className="mt-2 w-full bg-white border-0 border-b-2 border-ink/20 px-0 py-2.5 text-base font-display text-ink focus:outline-none focus:border-[#056ef5] transition-colors cursor-pointer">
                  <option value="">— Δεν έχει οριστεί —</option>
                  <optgroup label="Δημοτικό">{DIMOTIKO.map((cy) => <option key={cy} value={cy}>{cy}</option>)}</optgroup>
                  <optgroup label="Γυμνάσιο">{GYMNASIO.map((cy) => <option key={cy} value={cy}>{cy}</option>)}</optgroup>
                </select>
              </label>
            </div>

            <div>
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-ink/40">Μαθήματα</span>
              <div className="flex gap-3 mt-2">
                {[{ id: "greek", label: "Ν. Γλώσσα" }, { id: "math", label: "Μαθηματικά" }].map(({ id, label }) => (
                  <button key={id} type="button" onClick={() => toggleSubject(id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${form.subjects.includes(id) ? "border-[#056ef5] bg-[#056ef5] text-white" : "border-ink/15 text-ink/60 hover:border-ink/30"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-ink/8">
              <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-ink/40 mb-3">Στοιχεία γονέων</div>
              <div className="grid grid-cols-2 gap-5">
                <FormField label="Όνομα μητέρας" value={form.mother_name} onChange={(v) => setForm((p) => ({ ...p, mother_name: v }))} placeholder="π.χ. Ελένη" />
                <FormField label="Όνομα πατέρα"  value={form.father_name} onChange={(v) => setForm((p) => ({ ...p, father_name: v }))} placeholder="π.χ. Γιώργος" />
              </div>
            </div>

            <FormField label="Σημειώσεις" value={form.notes} onChange={(v) => setForm((p) => ({ ...p, notes: v }))} placeholder="Προαιρετικά σχόλια…" />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
                className="px-4 py-2 rounded-md border border-ink/15 text-ink/60 text-xs font-semibold hover:border-ink/30 transition-colors cursor-pointer">
                Ακύρωση
              </button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 rounded-md bg-[#056ef5] text-white font-bold text-xs hover:bg-[#0451b8] transition-colors disabled:opacity-50 cursor-pointer">
                {saving ? "…" : editId ? "Αποθήκευση" : "Προσθήκη"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Toolbar: search + filter + view ── */}
      {students.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <input type="text" placeholder="Αναζήτηση μαθητή…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] max-w-xs px-3 py-1.5 rounded-md border border-ink/15 text-sm text-ink bg-white focus:outline-none focus:border-[#056ef5] transition-colors placeholder:text-ink/35" />
          <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}
            className="px-3 py-1.5 rounded-md border border-ink/15 text-sm text-ink bg-white focus:outline-none focus:border-[#056ef5] transition-colors cursor-pointer">
            <option value="">Όλες οι τάξεις</option>
            <optgroup label="Δημοτικό">{DIMOTIKO.map((cy) => <option key={cy} value={cy}>{cy}</option>)}</optgroup>
            <optgroup label="Γυμνάσιο">{GYMNASIO.map((cy) => <option key={cy} value={cy}>{cy}</option>)}</optgroup>
          </select>
          <div className="flex border border-ink/15 rounded-md">
            <button onClick={() => setView("grid")} className={`px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${view === "grid" ? "bg-ink text-white" : "text-ink/55 hover:text-ink"}`}>Κάρτες</button>
            <button onClick={() => setView("list")} className={`px-3 py-1.5 text-xs font-semibold border-l border-ink/15 transition-colors cursor-pointer ${view === "list" ? "bg-ink text-white" : "text-ink/55 hover:text-ink"}`}>Λίστα</button>
          </div>
          {(search || filterClass) && (
            <button onClick={() => { setSearch(""); setFilterClass(""); }} className="text-xs text-ink/45 hover:text-ink transition-colors">
              καθαρισμός
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-ink/30 text-sm">Φόρτωση…</div>
      ) : students.length === 0 ? (
        <div className="border border-ink/10 rounded-md px-4 py-12 text-center">
          <p className="text-sm text-ink/55 max-w-sm mx-auto">
            Δεν έχετε προσθέσει μαθητές ακόμα. Προσθέστε τους για να βαθμολογείτε διαγωνίσματα.
          </p>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="mt-3 text-xs font-bold text-[#056ef5] hover:text-[#0451b8]">
            Προσθήκη πρώτου μαθητή →
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-ink/10 rounded-md px-4 py-10 text-center">
          <p className="text-sm text-ink/50">Δεν βρέθηκαν μαθητές με αυτά τα κριτήρια.</p>
        </div>
      ) : view === "list" ? (
        <ListView students={filtered} onEdit={startEdit} onDelete={remove} />
      ) : (
        <div className="space-y-8">
          {DIMOTIKO.some((cy) => byClass[cy]?.length > 0) && (
            <ClassSection title="Δημοτικό" color="#7c00d0" groups={DIMOTIKO.filter((cy) => byClass[cy]?.length > 0).map((cy) => ({ title: cy, students: byClass[cy] }))} onEdit={startEdit} onDelete={remove} />
          )}
          {GYMNASIO.some((cy) => byClass[cy]?.length > 0) && (
            <ClassSection title="Γυμνάσιο" color="#056ef5" groups={GYMNASIO.filter((cy) => byClass[cy]?.length > 0).map((cy) => ({ title: cy, students: byClass[cy] }))} onEdit={startEdit} onDelete={remove} />
          )}
          {noClass.length > 0 && (
            <ClassSection title="Χωρίς τάξη" groups={[{ title: "Χωρίς τάξη", students: noClass }]} onEdit={startEdit} onDelete={remove} />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Components ──────────────────────────────────────────────────────────────

function StudentStat({ label, value, color }: { label: string; value: number; color?: string }) {
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

function ClassSection({ title, color, groups, onEdit, onDelete }: {
  title: string; color?: string;
  groups: { title: string; students: Student[] }[];
  onEdit: (s: Student) => void; onDelete: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h2
          className="text-[11px] font-black tracking-wider uppercase inline-flex items-center gap-2"
          style={color ? { color } : { color: "var(--color-ink-55)" }}
        >
          {color && <span className="w-2 h-2 rounded-sm" style={{ background: color }} />}
          {title}
        </h2>
        <span className="text-[11px] text-ink/45">{groups.reduce((s, g) => s + g.students.length, 0)} μαθητές</span>
      </div>
      {groups.map((g) => (
        <div key={g.title} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {g.students.map((s) => <StudentCard key={s.id} student={s} onEdit={onEdit} onDelete={onDelete} />)}
        </div>
      ))}
    </div>
  );
}

function StudentCard({ student, onEdit, onDelete }: {
  student: Student;
  onEdit: (s: Student) => void; onDelete: (id: string) => void;
}) {
  const initials = `${student.first_name[0] ?? ""}${student.last_name[0] ?? ""}`.toUpperCase();
  const color = pickColor(student.id);
  return (
    <div className="group border border-ink/10 rounded-md p-3 hover:border-ink/25 transition-colors bg-white">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/account/students/${student.id}`} className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-md grid place-items-center font-semibold text-xs text-white flex-shrink-0"
               style={{ background: color }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-ink group-hover:text-[#056ef5] transition-colors leading-tight">
              {student.last_name} {student.first_name}
            </div>
            {student.class_year && <div className="text-[11px] text-ink/45 mt-0.5">{student.class_year}</div>}
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {student.subjects.map((sub) => (
                <span key={sub} className="text-[10px] text-ink/55 border border-ink/10 px-1.5 py-0.5 rounded">
                  {sub === "greek" ? "Γλώσσα" : "Μαθηματικά"}
                </span>
              ))}
            </div>
          </div>
        </Link>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => onEdit(student)} title="Επεξεργασία" className="p-1.5 rounded hover:bg-ink/5 text-ink/40 hover:text-ink transition-colors cursor-pointer text-xs">✎</button>
          <button onClick={() => onDelete(student.id)} title="Διαγραφή" className="p-1.5 rounded hover:bg-red-50 text-ink/40 hover:text-red-500 transition-colors cursor-pointer text-xs">✕</button>
        </div>
      </div>
      {student.notes && <p className="mt-2 text-[11px] text-ink/45 line-clamp-1">"{student.notes}"</p>}
    </div>
  );
}

function ListView({ students, onEdit, onDelete }: {
  students: Student[];
  onEdit: (s: Student) => void; onDelete: (id: string) => void;
}) {
  return (
    <div className="border border-ink/10 rounded-md overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#fafaf8] border-b border-ink/10">
            <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink/55">Μαθητής</th>
            <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink/55 hidden sm:table-cell">Τάξη</th>
            <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink/55 hidden md:table-cell">Μαθήματα</th>
            <th className="px-3 py-2.5"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink/8">
          {students.map((s) => {
            const initials = `${s.first_name[0] ?? ""}${s.last_name[0] ?? ""}`.toUpperCase();
            const color = pickColor(s.id);
            return (
              <tr key={s.id} className="row-hover group">
                <td className="px-3 py-2.5">
                  <Link href={`/account/students/${s.id}`} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded grid place-items-center font-semibold text-[11px] text-white flex-shrink-0"
                         style={{ background: color }}>
                      {initials}
                    </div>
                    <span className="text-sm text-ink group-hover:text-[#056ef5] transition-colors">
                      {s.last_name} {s.first_name}
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-xs text-ink/55 hidden sm:table-cell">{s.class_year ?? "—"}</td>
                <td className="px-3 py-2.5 hidden md:table-cell">
                  <span className="text-xs text-ink/55">
                    {s.subjects.map((x) => x === "greek" ? "Γλώσσα" : "Μαθηματικά").join(" · ") || "—"}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <div className="flex gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(s)} className="p-1.5 rounded hover:bg-ink/5 text-ink/40 hover:text-ink transition-colors cursor-pointer text-xs">✎</button>
                    <button onClick={() => onDelete(s.id)} className="p-1.5 rounded hover:bg-red-50 text-ink/40 hover:text-red-500 transition-colors cursor-pointer text-xs">✕</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FormField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-ink/40">{label}</span>
      <input type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full bg-transparent border-0 border-b-2 border-ink/20 px-0 py-2.5 text-base font-display text-ink placeholder:text-ink/25 focus:outline-none focus:border-[#056ef5] transition-colors" />
    </label>
  );
}

// ─── Preview seed data ──────────────────────────────────────────────────────

const PREVIEW_STUDENTS: Student[] = [
  { id: "s1", school_id: "preview", first_name: "Μαρία",    last_name: "Παπαδοπούλου", class_year: "Γυμνάσιο", subjects: ["greek","math"], notes: "Πολύ καλή στη Γλώσσα", mother_name: null, father_name: null, gender: "female", created_at: "", updated_at: "" },
  { id: "s2", school_id: "preview", first_name: "Γιώργης",  last_name: "Αλεξίου",      class_year: "Γυμνάσιο", subjects: ["math"],         notes: null,                  mother_name: null, father_name: null, gender: "male",   created_at: "", updated_at: "" },
  { id: "s3", school_id: "preview", first_name: "Ελένη",    last_name: "Βασιλείου",    class_year: "Γυμνάσιο", subjects: ["greek","math"], notes: null,                  mother_name: null, father_name: null, gender: "female", created_at: "", updated_at: "" },
  { id: "s4", school_id: "preview", first_name: "Νίκος",    last_name: "Δημητρίου",    class_year: "Λύκειο",   subjects: ["greek"],        notes: null,                  mother_name: null, father_name: null, gender: "male",   created_at: "", updated_at: "" },
  { id: "s5", school_id: "preview", first_name: "Σοφία",    last_name: "Κωνσταντίνου", class_year: "Λύκειο",   subjects: ["greek","math"], notes: "Νεοεγγραφή",          mother_name: null, father_name: null, gender: "female", created_at: "", updated_at: "" },
  { id: "s6", school_id: "preview", first_name: "Θάνος",    last_name: "Οικονόμου",    class_year: "Λύκειο",   subjects: ["math"],         notes: null,                  mother_name: null, father_name: null, gender: "male",   created_at: "", updated_at: "" },
];
