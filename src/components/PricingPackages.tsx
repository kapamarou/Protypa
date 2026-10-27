"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";

const parentBenefits = [
  "Πρόσβαση σε 3+2 διαγωνίσματα",
  "Πρόσβαση σε όλα τα παλιά θέματα",
  "Άδεια για 1 μαθητή",
  "Στατιστικά μαθητή",
  "Διάγραμμα προσωπικής πορείας",
  "AI σύνοψη επίδοσης μαθητή",
];

const parentUnavailable = [
  "Συνολικά στατιστικά φροντιστηρίου",
  "Σύγκριση με άλλα φροντιστήρια Ελλάδας",
  "Θέση σε σχέση με τις προηγούμενες εξετάσεις",
];

const schoolBenefits = [
  "Πρόσβαση σε 10 διαγωνίσματα",
  "Πρόσβαση σε όλα τα παλιά θέματα",
  "Αριθμός αδειών της επιλογής σας",
  "Στατιστικά μαθητή",
  "Διάγραμμα προσωπικής πορείας",
  "AI σύνοψη επίδοσης μαθητή",
  "Συνολικά στατιστικά φροντιστηρίου",
  "Σύγκριση με άλλα φροντιστήρια Ελλάδας",
  "Θέση σε σχέση με τις προηγούμενες εξετάσεις",
];

const schoolOptions = [
  { students: "1–10", price: "120,00 €" },
  { students: "11–20", price: "190,00 €" },
  { students: "21–30", price: "250,00 €" },
];

function CheckItem({ children, accent }: { children: ReactNode; accent: string }) {
  return (
    <li className="flex items-start gap-3 text-sm font-bold leading-relaxed text-ink/60">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white shadow-sm" style={{ backgroundColor: accent }}>✓</span>
      <span>{children}</span>
    </li>
  );
}

function PlanIcon({ type, accent }: { type: "parent" | "school"; accent: string }) {
  return (
    <div className="flex h-20 w-20 -rotate-3 items-center justify-center rounded-[1.6rem] text-white shadow-[0_14px_30px_rgba(0,0,0,.18)] transition duration-300 group-hover:rotate-3 group-hover:scale-105" style={{ backgroundColor: accent }}>
      {type === "school" ? (
        <svg viewBox="0 0 48 48" className="h-11 w-11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7 20 24 10l17 10" /><path d="M10 21v18h28V21" /><path d="M17 39V27h6v12M29 39V27h4v12" /><path d="M6 42h36" />
        </svg>
      ) : (
        <svg viewBox="0 0 48 48" className="h-11 w-11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="18" cy="17" r="6" /><circle cx="32" cy="19" r="5" /><path d="M7 38c1-8 5-12 11-12s10 4 11 12M26 30c2-3 4-5 7-5 5 0 8 4 9 11" />
        </svg>
      )}
    </div>
  );
}

export default function PricingPackages() {
  const [selected, setSelected] = useState(0);
  const [parentExpanded, setParentExpanded] = useState(false);
  const [schoolExpanded, setSchoolExpanded] = useState(false);
  const schoolPlan = schoolOptions[selected];

  return (
    <section id="paketa" className="relative overflow-hidden bg-[#f5f7fb] py-16 md:py-24">
      <div className="pointer-events-none absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-brand/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-[#7c00d0]/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-[10px] font-black uppercase tracking-[0.28em] text-brand">Πακέτα</div>
          <h2 className="mt-4 font-display text-4xl leading-none text-ink md:text-6xl">
            Επιλέξτε το πακέτο που <span className="text-[#7c00d0]">σας ταιριάζει.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-ink/55">
            Ξεκάθαρες ετήσιες επιλογές για γονείς και φροντιστήρια προετοιμασίας.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-6xl items-start gap-8 lg:grid-cols-2">
          <article className="group relative rounded-[2.7rem] border-2 border-white bg-[#eadbff] p-3 shadow-[0_22px_60px_rgba(70,40,110,.14)]">
            <div className="relative overflow-hidden rounded-[2.1rem] bg-white/85 p-7 md:p-9">
              <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-[#7c00d0]/[.07]" />
              <div className="absolute right-6 top-6 font-display text-[7rem] leading-none text-[#7c00d0]/[.07]">01</div>
              <PlanIcon type="parent" accent="#7c00d0" />

              <div className="relative mt-7 text-[10px] font-black uppercase tracking-[.26em] text-[#7c00d0]">Για τον γονέα</div>
              <h3 className="relative mt-3 font-display text-4xl leading-none text-ink md:text-5xl">Πακέτο Γονέα</h3>
              <p className="relative mt-4 max-w-lg text-sm leading-relaxed text-ink/55">Για γονείς που προετοιμάζεται το παιδί τους για τις εξετάσεις των Πρότυπων Σχολείων.</p>

              <div className="relative mt-7 flex flex-wrap items-end gap-3 rounded-2xl bg-[#f5efff] p-5">
                <span className="font-display text-5xl leading-none text-[#7c00d0] md:text-6xl">50,00 €</span>
                <span className="pb-1 text-[11px] font-bold text-ink/45">+ 24% ΦΠΑ / έτος</span>
              </div>

              <ul className="relative mt-7 space-y-3.5">
                {parentBenefits.slice(0, parentExpanded ? parentBenefits.length : 4).map((benefit) => <CheckItem key={benefit} accent="#7c00d0">{benefit}</CheckItem>)}
                {parentExpanded && parentUnavailable.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3 text-sm font-semibold leading-relaxed text-ink/25 line-through">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink/5 text-[11px] font-black">−</span><span>{benefit}</span>
                  </li>
                ))}
              </ul>

              <button type="button" onClick={() => setParentExpanded((value) => !value)} className="mt-5 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#7c00d0] transition hover:gap-3" aria-expanded={parentExpanded}>
                {parentExpanded ? "Λιγότερα" : "Περισσότερα"}<span className={`transition ${parentExpanded ? "rotate-180" : ""}`}>↓</span>
              </button>

              <Link href="/paketa" className="relative mt-7 flex w-full items-center justify-center gap-3 rounded-full bg-[#7c00d0] px-6 py-4 text-sm font-black text-white shadow-lg transition hover:-translate-y-1 hover:bg-[#6500ad]">Αποκτήστε πρόσβαση <span aria-hidden="true">→</span></Link>
            </div>
          </article>

          <article className="group relative rounded-[2.7rem] border-2 border-white bg-[#dcecff] p-3 shadow-[0_22px_60px_rgba(30,80,150,.14)]">
            <div className="relative overflow-hidden rounded-[2.1rem] bg-white/85 p-7 md:p-9">
              <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-[#056ef5]/[.07]" />
              <div className="absolute right-6 top-6 font-display text-[7rem] leading-none text-[#056ef5]/[.07]">02</div>
              <div className="absolute right-6 top-6 z-10 rounded-full bg-[#c8ff00] px-4 py-2 text-[9px] font-black uppercase tracking-wider text-ink shadow-md">Δημοφιλές</div>
              <PlanIcon type="school" accent="#056ef5" />

              <div className="relative mt-7 text-[10px] font-black uppercase tracking-[.26em] text-[#056ef5]">Για το φροντιστήριο</div>
              <h3 className="relative mt-3 font-display text-4xl leading-none text-ink md:text-5xl">Πακέτο Φροντιστηρίου</h3>
              <p className="relative mt-4 max-w-lg text-sm leading-relaxed text-ink/55">Επιλέξτε εύρος μαθητών και το πακέτο προσαρμόζεται στις ανάγκες σας.</p>

              <div className="relative mt-6">
                <div className="mb-3 text-[9px] font-black uppercase tracking-[.23em] text-ink/45">Αριθμός μαθητών</div>
                <div className="grid grid-cols-3 gap-2">
                  {schoolOptions.map((option, index) => (
                    <button key={option.students} type="button" onClick={() => setSelected(index)} className={`rounded-xl border-2 px-2 py-3 text-xs font-black transition ${selected === index ? "border-[#056ef5] bg-[#056ef5] text-white shadow-lg" : "border-[#056ef5]/10 bg-[#eaf3ff] text-[#056ef5] hover:border-[#056ef5]/35"}`} aria-pressed={selected === index}>
                      {option.students}<span className={`mt-1 block text-[7px] uppercase tracking-wider ${selected === index ? "text-white/60" : "text-[#056ef5]/45"}`}>+ επέκταση</span>
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-[10px] text-ink/40">+5 μαθητές με 30€ + 24% ΦΠΑ ανά πακέτο</p>
              </div>

              <div className="relative mt-5 flex flex-wrap items-end gap-3 rounded-2xl bg-[#eaf3ff] p-5">
                <span className="font-display text-5xl leading-none text-[#056ef5] md:text-6xl">{schoolPlan.price}</span>
                <span className="pb-1 text-[11px] font-bold text-ink/45">+ 24% ΦΠΑ / έτος</span>
              </div>

              <ul className="relative mt-7 space-y-3.5">
                {schoolBenefits.slice(0, schoolExpanded ? schoolBenefits.length : 4).map((benefit) => <CheckItem key={benefit} accent="#056ef5">{benefit}</CheckItem>)}
              </ul>

              <button type="button" onClick={() => setSchoolExpanded((value) => !value)} className="mt-5 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#056ef5] transition hover:gap-3" aria-expanded={schoolExpanded}>
                {schoolExpanded ? "Λιγότερα" : "Περισσότερα"}<span className={`transition ${schoolExpanded ? "rotate-180" : ""}`}>↓</span>
              </button>

              <Link href="/paketa" className="relative mt-7 flex w-full items-center justify-center gap-3 rounded-full bg-[#056ef5] px-6 py-4 text-sm font-black text-white shadow-lg transition hover:-translate-y-1 hover:bg-[#0058c8]">Αποκτήστε πρόσβαση <span aria-hidden="true">→</span></Link>
            </div>
          </article>
        </div>

        <p className="mt-7 text-center text-xs text-ink/40">Οι αναγραφόμενες τιμές δεν περιλαμβάνουν ΦΠΑ 24%.</p>
      </div>
    </section>
  );
}
