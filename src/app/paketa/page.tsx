import type { Metadata } from "next";
import Link from "next/link";
import PricingPackages from "@/components/PricingPackages";

export const metadata: Metadata = {
  title: "Πακέτα εγγραφής | Protupa",
  description:
    "Επιλέξτε το πακέτο Protupa για γονείς ή φροντιστήρια και αποκτήστε πρόσβαση σε διαγωνίσματα, αναλύσεις και στατιστικά μαθητών.",
  alternates: { canonical: "/paketa" },
};

const comparisonRows = [
  ["Πρόσβαση σε 3+2 διαγωνίσματα", true, false],
  ["Πρόσβαση σε 10 διαγωνίσματα", false, true],
  ["Πρόσβαση σε όλα τα παλιά θέματα", true, true],
  ["Άδεια για 1 μαθητή", true, false],
  ["Αριθμός αδειών της επιλογής σας", false, true],
  ["Στατιστικά μαθητή", true, true],
  ["Διάγραμμα προσωπικής πορείας", true, true],
  ["AI σύνοψη επίδοσης μαθητή", true, true],
  ["Συνολικά στατιστικά φροντιστηρίου", false, true],
  ["Σύγκριση με άλλα φροντιστήρια Ελλάδας", false, true],
  ["Θέση σε σχέση με προηγούμενες εξετάσεις", false, true],
] as const;

const faqs = [
  {
    question: "Πόσο διαρκεί η πρόσβαση;",
    answer:
      "Τα διαθέσιμα πακέτα είναι ετήσια. Πριν από την ολοκλήρωση της αγοράς βλέπετε καθαρά τη διάρκεια και τις παροχές του πακέτου που επιλέξατε.",
  },
  {
    question: "Πόσους μαθητές μπορώ να προσθέσω;",
    answer:
      "Το πακέτο γονέα αφορά έναν μαθητή. Στο πακέτο φροντιστηρίου επιλέγετε 1–10, 11–20 ή 21–30 μαθητές και μπορείτε να προσθέσετε επέκταση πέντε μαθητών.",
  },
  {
    question: "Μπορώ να αλλάξω πακέτο αργότερα;",
    answer:
      "Ναι. Το πακέτο φροντιστηρίου μπορεί να προσαρμοστεί καθώς αυξάνονται ή μειώνονται οι ανάγκες του οργανισμού σας.",
  },
  {
    question: "Πώς γίνεται η πληρωμή;",
    answer:
      "Η πληρωμή πραγματοποιείται με κάρτα μέσω ασφαλούς περιβάλλοντος πληρωμών. Τα στοιχεία της κάρτας δεν αποθηκεύονται από το Protupa.",
  },
  {
    question: "Λαμβάνω παραστατικό;",
    answer:
      "Ναι, το αντίστοιχο παραστατικό αποστέλλεται ηλεκτρονικά μετά την ολοκλήρωση της αγοράς.",
  },
];

function Availability({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${
        enabled ? "bg-[#c8ff00] text-ink" : "bg-ink/5 text-ink/25"
      }`}
      aria-label={enabled ? "Περιλαμβάνεται" : "Δεν περιλαμβάνεται"}
    >
      {enabled ? "✓" : "—"}
    </span>
  );
}

export default function PaketaPage() {
  return (
    <main className="overflow-hidden bg-[#f5f7fb]">
      <section className="relative bg-ink px-4 py-20 text-white md:py-28">
        <div className="pointer-events-none absolute -left-28 -top-28 h-80 w-80 rounded-full bg-[#7c00d0]/50 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-[#056ef5]/50 blur-3xl" />
        <div className="relative mx-auto max-w-7xl">
          <div className="inline-flex rotate-[-2deg] rounded-full bg-[#c8ff00] px-5 py-2 text-[10px] font-black uppercase tracking-[.24em] text-ink">
            Επίλεξε το πακέτο σου
          </div>
          <h1 className="mt-7 max-w-5xl font-display text-5xl leading-[.92] md:text-8xl">
            Διάλεξε το πλάνο που <span className="text-[#c8ff00]">σου ταιριάζει.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-relaxed text-white/65 md:text-lg">
            Δύο ξεκάθαρα πακέτα: ένα για γονείς που παρακολουθούν την πρόοδο του παιδιού τους και ένα για φροντιστήρια που προσαρμόζεται στον αριθμό των μαθητών.
          </p>
          <a href="#epilogi-paketou" className="mt-9 inline-flex items-center gap-3 rounded-full border border-white/20 bg-white px-6 py-4 text-sm font-black text-ink transition hover:-translate-y-1">
            Δείτε τα πακέτα <span aria-hidden="true">↓</span>
          </a>
        </div>
      </section>

      <div id="epilogi-paketou">
        <PricingPackages />
      </div>

      <section className="relative px-4 py-16 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-end gap-6 md:grid-cols-[1fr_.7fr]">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.28em] text-[#056ef5]">Λεπτομέρειες</div>
              <h2 className="mt-4 max-w-3xl font-display text-4xl leading-none text-ink md:text-6xl">
                Σύγκριση <span className="text-[#7c00d0]">χαρακτηριστικών.</span>
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-ink/55">
              Δείτε γρήγορα τι περιλαμβάνει κάθε επιλογή και επιλέξτε το πακέτο που ανταποκρίνεται στις πραγματικές σας ανάγκες.
            </p>
          </div>

          <div className="mt-10 overflow-hidden rounded-[2rem] border-2 border-white bg-white/80 shadow-[0_20px_60px_rgba(20,30,60,.1)]">
            <div className="grid grid-cols-[1fr_90px_110px] bg-ink px-4 py-5 text-xs font-black text-white sm:grid-cols-[1fr_150px_180px] sm:px-7">
              <div>Χαρακτηριστικό</div>
              <div className="text-center">Γονέας</div>
              <div className="text-center">Φροντιστήριο</div>
            </div>
            {comparisonRows.map(([label, parent, school], index) => (
              <div key={label} className={`grid grid-cols-[1fr_90px_110px] items-center px-4 py-4 text-sm sm:grid-cols-[1fr_150px_180px] sm:px-7 ${index !== comparisonRows.length - 1 ? "border-b border-ink/10" : ""}`}>
                <div className="pr-3 font-semibold text-ink/70">{label}</div>
                <Availability enabled={parent} />
                <Availability enabled={school} />
              </div>
            ))}
          </div>
          <p className="mt-5 text-center text-xs text-ink/45">
            Το πακέτο φροντιστηρίου διατίθεται για 1–10, 11–20 ή 21–30 μαθητές. Κάθε επέκταση πέντε μαθητών κοστίζει 30€ + ΦΠΑ.
          </p>
        </div>
      </section>

      <section className="px-4 pb-16 md:pb-24">
        <div className="relative mx-auto grid max-w-7xl overflow-hidden rounded-[2.5rem] bg-[#056ef5] p-8 text-white shadow-[0_24px_70px_rgba(5,110,245,.25)] md:grid-cols-[1fr_.55fr] md:p-14">
          <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border-[45px] border-[#c8ff00]/15" />
          <div className="relative">
            <div className="text-[10px] font-black uppercase tracking-[.25em] text-[#c8ff00]">Καμία δέσμευση</div>
            <h2 className="mt-4 max-w-3xl font-display text-4xl leading-none md:text-6xl">
              Δοκιμάστε το Protupa χωρίς ρίσκο.
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/70 md:text-base">
              Δεν χρειάζεστε κάρτα για να γνωρίσετε το demo. Δείτε πρώτα πώς λειτουργεί η πλατφόρμα και επιλέξτε πακέτο όταν είστε σίγουροι.
            </p>
          </div>
          <div className="relative mt-8 flex items-end md:mt-0 md:justify-end">
            <Link href="/demo" className="inline-flex items-center gap-3 rounded-full bg-[#c8ff00] px-7 py-4 text-sm font-black uppercase tracking-wider text-ink transition hover:-translate-y-1">
              Παίξτε με το demo <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 md:py-24">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <div className="text-[10px] font-black uppercase tracking-[.28em] text-[#7c00d0]">FAQ</div>
            <h2 className="mt-4 font-display text-4xl leading-none text-ink md:text-6xl">Συχνές απορίες.</h2>
          </div>
          <div className="mt-10 space-y-3">
            {faqs.map((faq, index) => (
              <details key={faq.question} className="group rounded-[1.5rem] border border-ink/10 bg-[#f5f7fb] px-6 py-5 open:bg-[#f1e7ff]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-black text-ink">
                  <span>{faq.question}</span>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg ${index % 2 ? "bg-[#7c00d0] text-white" : "bg-[#c8ff00] text-ink"}`} aria-hidden="true">+</span>
                </summary>
                <p className="max-w-2xl pt-4 text-sm leading-relaxed text-ink/60">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
