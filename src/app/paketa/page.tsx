import type { Metadata } from "next";
import Link from "next/link";
import { el } from "@/lib/i18n/el";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAccountType } from "@/lib/entitlements";
import type { AccountType, Package } from "@/lib/types";
import { PlansClient } from "./PlansClient";

export const metadata: Metadata = {
  title: "Πακέτα εγγραφής",
  description:
    "Πακέτα για γονείς και φροντιστήρια: πρόσβαση στα διαγωνίσματα προσομοίωσης, αυτόματη διόρθωση και ανάλυση επίδοσης μαθητών. Ετήσια συνδρομή με δυνατότητα αναβάθμισης.",
  alternates: { canonical: "/paketa" },
};

export const dynamic = "force-dynamic";

export default async function PackagesPage() {
  const supabase = await createSupabaseServerClient();
  const [rawPackages, user] = await Promise.all([
    supabase
      ? supabase
          .from("packages")
          .select("*")
          .in("package_type", ["parent", "school"])
          .order("price_cents", { ascending: true })
          .then((r) => r.data)
      : Promise.resolve(null),
    supabase
      ? supabase.auth.getUser().then((r) => r.data.user)
      : Promise.resolve(null),
  ]);

  const packages = (rawPackages as Package[]) ?? [];
  const accountType: AccountType | null = user
    ? await getAccountType(user.id)
    : null;

  return (
    <div>
      <Hero />
      <PlansClient packages={packages} signedIn={!!user} accountType={accountType} />
      <Compare packages={packages} />
      <Guarantee />
      <Faqs />
    </div>
  );
}

/* ─── HERO ─────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section
      className="relative pt-12 pb-14 md:pt-18 md:pb-20 clip-x overflow-hidden"
      style={{ backgroundImage: "url(/Packages.jpg)", backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <div className="absolute inset-0 bg-brand/80" />
      {/* Sprite decorations */}
      <img src="/TransparentAssets/Asset 18.png" alt="" aria-hidden="true" className="pointer-events-none select-none absolute bottom-4 right-6 w-32 md:w-52 opacity-75 rotate-6 hidden sm:block" />
      <img src="/TransparentAssets/Asset 22.png" alt="" aria-hidden="true" className="pointer-events-none select-none absolute top-6 right-[45%] w-16 md:w-24 opacity-65 -rotate-12 hidden lg:block" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-paper mb-4">
          {el.packages.eyebrow}
        </div>
        <h1 className="font-display text-[clamp(2.5rem,7vw,6rem)] leading-none text-ink">
          {el.packages.titleA} {el.packages.titleB}
          <br />
          <span className="text-paper">{el.packages.titleC} {el.packages.titleD}</span>
        </h1>
      </div>
    </section>
  );
}


/* ─── COMPARE ──────────────────────────────────────────────────────────── */

// 2-column comparison: Parent vs Φροντιστήριο.
// The school column merges all 4 school tiers since they have identical
// feature sets — only the student limit changes.
function Compare({ packages }: { packages: Package[] }) {
  const parentPkg = packages.find((p) => p.package_type === "parent");
  // Use the highest school tier as the representative — shows "Έως 25 μαθητές"
  // instead of "Έως 10 μαθητές", which reflects the ceiling of what schools can buy.
  const schoolPkg = packages
    .filter((p) => p.package_type === "school")
    .sort((a, b) => (b.max_students ?? 0) - (a.max_students ?? 0))[0];

  // Union of all feature labels across the two columns, preserving order.
  // Exclude stale/inaccurate labels that have been superseded by the new feature set.
  const HIDDEN_LABELS = new Set(["Στατιστικά για κάθε παιδί"]);
  const seen = new Set<string>();
  const allFeatureLabels: string[] = [];
  for (const pkg of [parentPkg, schoolPkg]) {
    if (!pkg) continue;
    for (const f of pkg.features) {
      if (!seen.has(f.label) && !HIDDEN_LABELS.has(f.label)) {
        seen.add(f.label);
        allFeatureLabels.push(f.label);
      }
    }
  }

  // These features belong to both packages per the new spec; force ✓ regardless of stale DB data.
  const BOTH_INCLUDED = new Set([
    "Διάγραμμα προσωπικής πορείας",
    "AI σύνοψη επίδοσης μαθητή",
    "Στατιστικά μαθητή",
    "Πρόσβαση σε όλα τα παλιά θέματα",
  ]);

  function included(pkg: Package | undefined, label: string): boolean {
    if (!pkg) return false;
    if (BOTH_INCLUDED.has(label)) return true;
    return pkg.features.some((f) => f.label === label && f.included);
  }

  return (
    <section className="relative py-10 md:py-20 bg-[#0a0a0f] overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 100% 0%, rgba(5,110,245,0.10), transparent 60%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl mb-12">
          <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-brand mb-3">
            Λεπτομέρειες
          </div>
          <h2 className="font-display text-3xl md:text-6xl leading-none text-paper">
            {el.packages.compareTitle}
          </h2>
          <p className="mt-4 text-muted text-base">
            Το πακέτο γονέα παρέχει πρόσβαση σε 3+2 διαγωνίσματα για 1 μαθητή.
            Το πακέτο φροντιστηρίου παρέχει πρόσβαση σε 10 διαγωνίσματα με συνολικά
            στατιστικά, σύγκριση με άλλα φροντιστήρια Ελλάδας, και κλιμακούμενο αριθμό μαθητών.
          </p>
        </div>

        <div className="relative overflow-x-auto rounded-3xl ring-1 ring-white/10 bg-white/[0.02]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left font-display text-sm md:text-lg text-paper px-3 py-4 md:px-6 md:py-5 min-w-[180px]">
                  Χαρακτηριστικά
                </th>
                <th className="text-center px-3 py-4 md:px-6 md:py-5 font-display text-base md:text-xl text-paper min-w-[120px]">
                  Γονέας
                </th>
                <th className="text-center px-3 py-4 md:px-6 md:py-5 font-display text-base md:text-xl text-paper min-w-[120px]">
                  Φροντιστήριο
                </th>
              </tr>
            </thead>
            <tbody>
              {allFeatureLabels.map((label, i) => (
                <tr key={label} className={i % 2 === 0 ? "bg-white/[0.02]" : "bg-transparent"}>
                  <td className="px-3 py-3 md:px-6 md:py-4 text-paper text-xs md:text-sm">{label}</td>
                  <td className="text-center px-3 py-3 md:px-6 md:py-4">
                    <CheckCell ok={included(parentPkg, label)} />
                  </td>
                  <td className="text-center px-3 py-3 md:px-6 md:py-4">
                    <CheckCell ok={included(schoolPkg, label)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-paper/60 text-center">
          Το πακέτο φροντιστηρίου έχει 3 επίπεδα (1–10 / 11–20 / 21–30 μαθητές). Κάθε επέκταση +5 μαθητών κοστίζει 30€ + ΦΠΑ.
        </p>
      </div>
    </section>
  );
}

function CheckCell({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="inline-grid place-items-center w-7 h-7 rounded-full bg-accent text-ink font-black text-xs leading-none">
      ✓
    </span>
  ) : (
    <span className="inline-grid place-items-center w-7 h-7 rounded-full ring-1 ring-white/15 text-white/30 text-xs leading-none">
      —
    </span>
  );
}

/* ─── GUARANTEE ───────────────────────────────────────────────────────── */

function Guarantee() {
  return (
    <section className="relative py-10 md:py-20 bg-[#7c00d0] clip-x overflow-hidden">
      {/* Sprite decorations */}
      <img src="/TransparentAssets/Asset 20.png" alt="" aria-hidden="true" className="pointer-events-none select-none absolute bottom-6 right-8 w-32 md:w-48 opacity-75 rotate-12 hidden sm:block" />
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="grid md:grid-cols-12 gap-10 items-center">
          <div className="md:col-span-4 flex items-center justify-center">
            <img src="/TransparentAssets/Asset 14.png" alt="" aria-hidden="true" className="w-48 md:w-72 opacity-80" />
          </div>

          <div className="md:col-span-8">
            <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-white mb-3">
              Καμία δέσμευση
            </div>
            <h2 className="font-display text-3xl md:text-6xl leading-none text-white">
              {el.packages.guaranteeTitle}
            </h2>
            <p className="mt-6 text-base text-white max-w-xl leading-relaxed">
              {el.packages.guaranteeBody}
            </p>
            <Link
              href="/demo"
              className="group inline-flex items-center gap-2 mt-8 px-7 py-4 rounded-full bg-[#056ef5] !text-white border-2 border-[#056ef5] font-black uppercase tracking-wider text-sm hover:bg-[#0451b8] hover:-translate-y-0.5 transition-all"
            >
              {el.packages.guaranteeCta}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── FAQS ─────────────────────────────────────────────────────────────── */

function Faqs() {
  return (
    <section className="relative py-10 md:py-20 bg-[#056ef5] text-paper">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="grid md:grid-cols-12 gap-12">
          <div className="md:col-span-4">
            <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-paper mb-3">
              FAQ
            </div>
            <h2 className="font-display text-4xl md:text-5xl leading-none text-paper">
              {el.packages.faqTitle}
            </h2>
            <Link
              href="/faq"
              className="inline-flex items-center gap-1.5 mt-6 text-sm font-bold !text-[#ffffff] hover:!text-[#c8ff00] transition-colors uppercase tracking-wider"
            >
              {el.packages.faqMore} →
            </Link>
          </div>

          <div className="md:col-span-8 space-y-3">
            {el.packages.faqs.map((item, i) => (
              <details
                key={i}
                className="group rounded-2xl border border-white/20 bg-white/10 p-6 hover:border-white/40 transition-colors [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex items-center justify-between gap-4 cursor-pointer">
                  <span className="font-display text-lg md:text-xl text-paper">
                    {item.q}
                  </span>
                  <span className="flex-shrink-0 w-8 h-8 rounded-full border border-white/50 text-paper grid place-items-center text-xl group-open:bg-[#c8ff00] group-open:text-ink group-open:border-[#c8ff00] group-open:rotate-45 transition-all">
                    +
                  </span>
                </summary>
                <p className="mt-4 text-paper leading-relaxed text-sm">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
