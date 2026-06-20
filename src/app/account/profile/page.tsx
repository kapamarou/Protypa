"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { DOY_LIST } from "@/lib/doy-list";
import { formatEuro } from "@/lib/format";
import type { Package, School } from "@/lib/types";

type AccountType = "school" | "parent";

interface ActivePkg {
  pkg: Package;
  expires_at: string;
}

export default function ProfilePage() {
  const [school, setSchool] = useState<Partial<School>>({});
  const [accountType, setAccountType] = useState<AccountType>("school");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);

  // Subscription state
  const [activePkgs, setActivePkgs] = useState<ActivePkg[]>([]);
  const [expansionPkgs, setExpansionPkgs] = useState<Package[]>([]);
  const [expansionCount, setExpansionCount] = useState(1);
  const [expansionLoading, setExpansionLoading] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setSchool(PREVIEW_SCHOOL);
        setIsPreview(true);
        setLoading(false);
        return;
      }

      const [
        { data: schoolData },
        { data: profile },
        { data: purchases },
        { data: expPkgs },
      ] = await Promise.all([
        supabase.from("schools").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("profiles").select("account_type").eq("id", user.id).maybeSingle(),
        supabase
          .from("purchases")
          .select("*, packages(*)")
          .eq("user_id", user.id)
          .gt("expires_at", new Date().toISOString())
          .order("expires_at", { ascending: false }),
        supabase
          .from("packages")
          .select("*")
          .eq("package_type", "expansion")
          .order("min_students"),
      ]);

      if (schoolData) setSchool(schoolData as School);
      setAccountType((profile?.account_type as AccountType | undefined) ?? "school");

      if (purchases) {
        const mapped = purchases
          .map((row: { packages: Package; expires_at: string }) => ({
            pkg: row.packages,
            expires_at: row.expires_at,
          }))
          .filter((r: ActivePkg) => r.pkg?.package_type !== "expansion");
        setActivePkgs(mapped);
      }

      if (expPkgs) setExpansionPkgs(expPkgs as Package[]);

      setLoading(false);
    });
  }, []);

  function set<K extends keyof School>(key: K, val: School[K]) {
    setSchool((prev) => ({ ...prev, [key]: val }));
    setSaved(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null); setSaved(false);
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: err } = await supabase.from("schools").upsert({ id: user.id, ...school });
    setSaving(false);
    if (err) { setError(err.message); return; }

    const required = ["legal_name", "trade_name", "afm", "doy", "city"] as const;
    const complete = required.every((k) => school[k]);
    if (complete) {
      await supabase.from("profiles").update({ onboarding_complete: true }).eq("id", user.id);
    }
    setSaved(true);
  }

  async function buyExpansion() {
    const pkg = expansionPkgs.find((p) => p.min_students === expansionCount);
    if (!pkg) return;
    setExpansionLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package_id: pkg.id }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error ?? "Κάτι πήγε στραβά. Δοκιμάστε ξανά.");
    } finally {
      setExpansionLoading(false);
    }
  }

  if (loading) return <div className="py-12 text-center text-ink/30 text-sm">Φόρτωση…</div>;

  const isParent = accountType === "parent";
  const hasActivePackage = activePkgs.length > 0;
  const expansionPkg = expansionPkgs.find((p) => p.min_students === expansionCount);
  const expansionPurchasable = !!expansionPkg?.stripe_price_id && (expansionPkg?.price_cents ?? 0) > 0;

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <div className="text-xs text-ink/45">Ρυθμίσεις</div>
        <h1 className="font-display text-2xl text-ink mt-1">
          {isParent ? "Το Προφίλ μου" : "Προφίλ Φροντιστηρίου"}
        </h1>
        <p className="text-sm text-ink/55 mt-1">
          {isParent
            ? "Τα στοιχεία σας για έκδοση παραστατικών."
            : "Συμπληρώστε τα στοιχεία για έκδοση παραστατικών και στατιστικά."}
        </p>
      </div>

      {isPreview && (
        <div className="border-l-2 border-amber-500 bg-amber-50/60 px-4 py-3 text-sm text-amber-900">
          <strong className="font-semibold">Προεπισκόπηση:</strong> Δείγμα συμπληρωμένου προφίλ. Συνδεθείτε για να επεξεργαστείτε τα δικά σας στοιχεία.
        </div>
      )}

      {/* ─── Subscription section ─── */}
      {!isPreview && (
        <div className="rounded-2xl border border-ink/10 bg-white overflow-hidden">
          <div className="px-6 pt-5">
            <div className="inline-flex items-center gap-2 text-[10px] font-black tracking-[0.2em] uppercase text-[#7c00d0]">
              <span className="w-2 h-2 rounded-sm bg-[#7c00d0]" />
              Συνδρομή
            </div>
          </div>
          <div className="px-6 pb-6 pt-4 space-y-4">
            {hasActivePackage ? (
              <>
                {activePkgs.map((ap) => (
                  <div key={ap.pkg.id} className="flex items-start justify-between gap-4 rounded-xl bg-[#056ef5]/5 border border-[#056ef5]/15 px-4 py-3">
                    <div>
                      <div className="text-sm font-bold text-ink">{ap.pkg.name_el}</div>
                      <div className="text-xs text-ink/50 mt-0.5">
                        Λήγει {new Date(ap.expires_at).toLocaleDateString("el-GR", { day: "numeric", month: "long", year: "numeric" })}
                      </div>
                    </div>
                    <span className="flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full bg-green-100 text-green-800 text-[10px] font-black uppercase tracking-wider">
                      Ενεργό
                    </span>
                  </div>
                ))}
                <Link
                  href="/paketa"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-[#056ef5] hover:text-[#0451b8] transition-colors"
                >
                  Αναβάθμιση πακέτου →
                </Link>
              </>
            ) : (
              <div className="flex items-center justify-between gap-4 rounded-xl bg-ink/4 px-4 py-3">
                <p className="text-sm text-ink/60">Δεν έχετε ενεργό πακέτο.</p>
                <Link
                  href="/paketa"
                  className="flex-shrink-0 inline-flex items-center gap-1 px-4 py-2 rounded-full bg-[#056ef5] text-white text-xs font-black uppercase tracking-wider hover:bg-[#0451b8] transition-colors"
                >
                  Αποκτήστε πακέτο →
                </Link>
              </div>
            )}

            {/* Expansion widget — school accounts only */}
            {!isParent && hasActivePackage && (
              <>
                <div className="h-px bg-ink/8 my-2" />
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.15em] text-ink/50 mb-3">
                    Επέκταση μαθητών
                  </div>
                  <p className="text-sm text-ink/60 mb-4 leading-relaxed">
                    Προσθέστε έως 5 επιπλέον μαθητές στο πακέτο σας (12€ ανά μαθητή / έτος).
                  </p>

                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-0 rounded-xl border-2 border-ink/15 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpansionCount((c) => Math.max(1, c - 1))}
                        className="w-10 h-10 flex items-center justify-center text-ink hover:bg-ink/5 transition-colors font-bold text-lg cursor-pointer"
                      >
                        −
                      </button>
                      <span className="w-10 text-center font-display text-lg font-bold text-ink tabular-nums">
                        {expansionCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpansionCount((c) => Math.min(5, c + 1))}
                        className="w-10 h-10 flex items-center justify-center text-ink hover:bg-ink/5 transition-colors font-bold text-lg cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                    <div>
                      <span className="text-xs text-ink/50">Τιμή:</span>{" "}
                      <span className="font-display text-xl font-bold text-ink tabular-nums">
                        {formatEuro(expansionCount * 1200)}
                      </span>
                      <span className="text-xs text-ink/50"> / έτος</span>
                    </div>
                  </div>

                  {expansionPurchasable ? (
                    <button
                      type="button"
                      disabled={expansionLoading}
                      onClick={buyExpansion}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#056ef5] text-white font-black text-sm uppercase tracking-wider hover:bg-[#0451b8] hover:-translate-y-0.5 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {expansionLoading ? "Φόρτωση…" : `Προσθήκη ${expansionCount} μαθητή${expansionCount !== 1 ? "ών" : ""}`}
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-ink/15 text-ink/50 font-bold text-sm cursor-not-allowed">
                      Διαθέσιμο σύντομα
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Upgrade option also shown when no package */}
            {!isParent && !hasActivePackage && (
              <>
                <div className="h-px bg-ink/8 my-2" />
                <p className="text-xs text-ink/40">
                  Αγοράστε πρώτα ένα βασικό πακέτο για να μπορείτε να προσθέσετε επέκταση μαθητών.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <form onSubmit={save} className="space-y-8">
        {isParent ? (
          <Section title="Στοιχεία" color="#7c00d0">
            <Field label="Ονοματεπώνυμο" value={school.contact_person ?? ""} onChange={(v) => set("contact_person", v)} placeholder="π.χ. Μαρία Παπαδοπούλου" />
            <Field label="Email" value={school.contact_email ?? ""} onChange={(v) => set("contact_email", v)} type="email" placeholder="you@example.com" />
            <Field label="Τηλέφωνο" value={school.mobile ?? ""} onChange={(v) => set("mobile", v)} type="tel" placeholder="π.χ. 6944525252" />
            <Field label="Διεύθυνση" value={school.address ?? ""} onChange={(v) => set("address", v)} placeholder="π.χ. Παπαδοπούλου 12, 71201 Ηράκλειο" />
            <Field label="ΑΦΜ" value={school.afm ?? ""} onChange={(v) => set("afm", v)} placeholder="π.χ. 152998856" />
          </Section>
        ) : (
          <>
            <Section title="Στοιχεία Εταιρείας" color="#056ef5">
              <Field label="Επωνυμία" value={school.legal_name ?? ""} onChange={(v) => set("legal_name", v)} placeholder="π.χ. Βασιλειάδης & ΣΙΑ ΟΕ" />
              <div>
                <Field label="Διακριτικός τίτλος" value={school.trade_name ?? ""} onChange={(v) => set("trade_name", v)} placeholder="π.χ. Φροντιστήριο Πεδίο" />
                <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-700 flex-shrink-0 mt-0.5" aria-hidden="true">
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    Αυτό το όνομα εμφανίζεται ως <strong className="font-bold">υδατογράφημα</strong> σε κάθε
                    διαγώνισμα PDF που κατεβάζετε.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <Field label="ΑΦΜ" value={school.afm ?? ""} onChange={(v) => set("afm", v)} placeholder="π.χ. 152998856" />
                <label className="block">
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-ink/40">ΔΟΥ</span>
                  <select
                    value={school.doy ?? ""}
                    onChange={(e) => set("doy", e.target.value)}
                    className="mt-2 w-full bg-white border-0 border-b-2 border-ink/20 px-0 py-2.5 text-base font-display text-ink focus:outline-none focus:border-[#056ef5] transition-colors cursor-pointer"
                  >
                    <option value="">Επιλέξτε ΔΟΥ</option>
                    {DOY_LIST.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </label>
              </div>
            </Section>

            <Section title="Διεύθυνση" color="#7c00d0">
              <Field label="Οδός & αριθμός" value={school.address ?? ""} onChange={(v) => set("address", v)} placeholder="π.χ. Παπαδοπούλου 12" />
              <div className="grid grid-cols-2 gap-5">
                <Field label="Ταχ. κώδικας" value={school.postal_code ?? ""} onChange={(v) => set("postal_code", v)} placeholder="π.χ. 71201" />
                <Field label="Πόλη" value={school.city ?? ""} onChange={(v) => set("city", v)} placeholder="π.χ. Ηράκλειο" />
              </div>
              <Field label="Περιοχή / Νομός" value={school.region ?? ""} onChange={(v) => set("region", v)} placeholder="π.χ. Κρήτη" />
            </Section>

            <Section title="Επικοινωνία" color="#056ef5">
              <Field label="Τηλέφωνο φροντιστηρίου" value={school.phone ?? ""} onChange={(v) => set("phone", v)} type="tel" placeholder="π.χ. 2801711611" />
              <Field label="Email φροντιστηρίου" value={school.school_email ?? ""} onChange={(v) => set("school_email", v)} type="email" placeholder="info@frontistirio.gr" />
              <Field label="Υπεύθυνος επικοινωνίας" value={school.contact_person ?? ""} onChange={(v) => set("contact_person", v)} placeholder="π.χ. Γραμματεία" />
              <Field label="Κινητό υπευθύνου" value={school.mobile ?? ""} onChange={(v) => set("mobile", v)} type="tel" placeholder="π.χ. 6944525252" />
              <Field label="Email υπευθύνου" value={school.contact_email ?? ""} onChange={(v) => set("contact_email", v)} type="email" placeholder="manager@frontistirio.gr" />
            </Section>
          </>
        )}

        <Section title="Ενημερωτικά Emails">
          <button type="button"
            onClick={() => set("marketing_opt_in", !school.marketing_opt_in)}
            className={`w-full flex items-start gap-4 p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
              school.marketing_opt_in ? "border-[#056ef5] bg-[#056ef5]/5" : "border-ink/10 hover:border-ink/30"
            }`}>
            <span className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
              school.marketing_opt_in ? "bg-[#056ef5] border-[#056ef5]" : "border-ink/30"
            }`}>
              {school.marketing_opt_in && <span className="text-white text-xs font-black">✓</span>}
            </span>
            <div>
              <div className="font-bold text-ink text-sm">Θέλω να λαμβάνω ενημερωτικά emails</div>
              <p className="mt-1 text-xs text-ink/55 leading-relaxed">
                Νέα θέματα διαγωνισμάτων, ανακοινώσεις και ενημερώσεις της πλατφόρμας — απευθείας στο email σας.
                Μπορείτε να αλλάξετε αυτή τη ρύθμιση ανά πάσα στιγμή από εδώ.
              </p>
            </div>
          </button>
        </Section>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-xl">{error}</p>}
        {saved && <p className="text-sm text-green-700 bg-green-50 border border-green-200 p-3 rounded-xl">✓ Οι αλλαγές αποθηκεύτηκαν.</p>}

        <button type="submit" disabled={saving}
          className="px-8 py-3 rounded-full bg-[#056ef5] text-white font-black uppercase tracking-wider text-sm hover:bg-[#0451b8] hover:-translate-y-0.5 transition-all disabled:opacity-50 cursor-pointer">
          {saving ? "Αποθήκευση…" : "Αποθήκευση αλλαγών"}
        </button>
      </form>
    </div>
  );
}

function Section({ title, children, color = "#056ef5" }: { title: string; children: React.ReactNode; color?: string }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white overflow-hidden">
      <div className="px-6 pt-5">
        <div className="inline-flex items-center gap-2 text-[10px] font-black tracking-[0.2em] uppercase" style={{ color }}>
          <span className="w-2 h-2 rounded-sm" style={{ background: color }} />
          {title}
        </div>
      </div>
      <div className="px-6 pb-6 pt-4 space-y-5">
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-ink/40">{label}</span>
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full bg-transparent border-0 border-b-2 border-ink/20 px-0 py-2.5 text-base font-display text-ink placeholder:text-ink/25 focus:outline-none focus:border-[#056ef5] transition-colors"
      />
    </label>
  );
}

const PREVIEW_SCHOOL: Partial<School> = {
  legal_name: "Βασιλειάδης & ΣΙΑ ΟΕ",
  trade_name: "Φροντιστήριο Πεδίο",
  address: "Παπαδοπούλου 12",
  postal_code: "71201",
  city: "Ηράκλειο",
  region: "Κρήτη",
  phone: "2801711611",
  school_email: "info@pediofrontistirio.gr",
  contact_person: "Νίκος Παπαδόπουλος",
  mobile: "6944525252",
  contact_email: "nikos@pediofrontistirio.gr",
  afm: "152998856",
  doy: "ΗΡΑΚΛΕΙΟΥ",
  subjects: ["greek", "math"],
  marketing_opt_in: true,
};
