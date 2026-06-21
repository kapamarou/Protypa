import Link from "next/link";
import { el } from "@/lib/i18n/el";

export default function HomePage() {
  return (
    <div>
      <Hero />
      <Ticker />
      <Features />
      <MidCta />
      <HowItWorks />
      <Manifesto />
    </div>
  );
}

/* ─── 1. HERO ──────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section
      className="relative min-h-[78vh] flex items-center clip-x overflow-hidden"
      style={{ backgroundImage: "url(/HeroPage.jpg)", backgroundSize: "cover", backgroundPosition: "center" }}
    >
      {/* Blue brand overlay — preserves brand colour while letting image show through */}
      <div className="absolute inset-0 bg-brand/80" />

      {/* Sprite cluster — intentionally asymmetrical, varied sizes & rotations */}
      <div aria-hidden="true" className="hidden md:block absolute inset-0 z-10 pointer-events-none">
        <img src="/TransparentAssets/Asset 20.png" alt="" className="select-none absolute top-[14%] left-[4%]   w-32 -rotate-[18deg]" />
        <img src="/TransparentAssets/Asset 13.png" alt="" className="select-none absolute top-[6%]  right-[28%] w-20 rotate-[8deg]" />
        <img src="/TransparentAssets/Asset 7.png"  alt="" className="select-none absolute top-[42%] right-[6%]  w-36 -rotate-[7deg]" />
        <img src="/TransparentAssets/Asset 19.png" alt="" className="select-none absolute bottom-[22%] left-[12%] w-40 rotate-[14deg]" />
      </div>

      {/* Content — centered as the main event */}
      <div className="relative z-20 w-full mx-auto px-4 sm:px-6 py-20 md:py-28 text-center">
        <h1 className="font-display text-paper leading-[0.95]">
          <span className="block whitespace-nowrap text-[clamp(1rem,6vw,5rem)] uppercase">Ολοκληρωμένη προετοιμασία</span>
          <span className="block whitespace-nowrap text-[clamp(1rem,5vw,4.25rem)] uppercase">για τα Πρότυπα</span>
        </h1>
        <p className="mt-4 font-display text-[clamp(1.25rem,2.5vw,2rem)] text-paper/80">
          Σταθερή πρόοδος
        </p>

        <div className="mt-10 md:mt-14 flex flex-col items-center gap-4 max-w-sm mx-auto">
          <Link
            href="/paketa"
            className="group w-full inline-flex items-center justify-center gap-2 px-10 py-5 rounded-full bg-[#FDFFFC] text-[#7c00d0] border-2 border-[#7c00d0] font-black uppercase tracking-wider hover:bg-[#7c00d0]/5 hover:-translate-y-0.5 transition-all text-base md:text-lg"
          >
            Εξερευνήστε τα πακέτα
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Link>
          <Link
            href="/demo"
            className="w-full inline-flex items-center justify-center gap-2 px-10 py-5 rounded-full bg-[#FDFFFC] text-[#056ef5] border-2 border-[#056ef5] font-black uppercase tracking-wider hover:bg-[#056ef5]/5 hover:-translate-y-0.5 transition-all text-base md:text-lg"
          >
            Δοκιμαστε το demo
          </Link>
        </div>
      </div>
    </section>
  );
}


/* ─── TICKER ───────────────────────────────────────────────────────────── */

type TickerItem =
  | { kind: "text"; text: string; color: string }
  | { kind: "image"; src: string; alt?: string };

const SEP: TickerItem = { kind: "image", src: "/TransparentAssets/Asset 20.png", alt: "" };

const TICKER_ITEMS: TickerItem[] = [
  { kind: "text", text: "Πρότυπα Σχολεία",           color: "#0a0a0f" }, SEP,
  { kind: "text", text: "Ωνάσεια Σχολεία",           color: "#0a0a0f" }, SEP,
  { kind: "text", text: "Εκκλησιαστικά Σχολεία",      color: "#0a0a0f" }, SEP,
  { kind: "text", text: "Ανάλυση Λαθών",             color: "#0a0a0f" }, SEP,
  { kind: "text", text: "Στατιστική Ανάλυση",         color: "#0a0a0f" }, SEP,
  { kind: "text", text: "Εξατομικευμένη Διδασκαλία",  color: "#0a0a0f" }, SEP,
];

function Ticker() {
  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="relative bg-[#c8ff00] overflow-hidden py-4 border-y border-black/10">
      <style>{`
        @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .ticker-track { animation: ticker 32s linear infinite; }
      `}</style>
      <div className="ticker-track flex items-center whitespace-nowrap">
        {doubled.map((item, i) =>
          item.kind === "text" ? (
            <span
              key={i}
              className="font-display text-base md:text-lg mx-5 flex-shrink-0"
              style={{ color: item.color }}
            >
              {item.text}
            </span>
          ) : (
            <img
              key={i}
              src={item.src}
              alt={item.alt ?? ""}
              aria-hidden={!item.alt}
              className="select-none mx-5 flex-shrink-0 h-5 md:h-6 w-auto"
            />
          ),
        )}
      </div>
    </div>
  );
}

/* ─── 2. FEATURES ──────────────────────────────────────────────────────── */

function Features() {
  return (
    <>
      {/* Intro + Τι πουλάμε */}
      <section className="relative bg-white py-10 md:py-18 overflow-hidden">
        <img src="/TransparentAssets/Asset 8.png" alt="" aria-hidden="true" loading="lazy" className="pointer-events-none select-none absolute top-8 right-4 w-24 md:w-36 opacity-70 rotate-12 hidden sm:block" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-3xl mb-10">
            <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-brand mb-3">
              Τι προσφέρουμε
            </div>
            <h2 className="font-display text-4xl md:text-6xl text-ink leading-none">
              Το εργαλείο που{" "}
              <span className="text-brand">κάνει τη διαφορά</span>
            </h2>
            <p className="mt-6 text-sm md:text-base text-ink/70 max-w-2xl leading-relaxed">
              Οι εξετάσεις για τα Πρότυπα, Ωνάσεια και Εκκλησιαστικά Σχολεία είναι μια διαδικασία κατάταξης. Στόχος να γράψουν οι μαθητές μας καλύτερα από τους άλλους υποψηφίους. Άρα πρέπει να έχετε εικόνα του πού βρίσκεται ο κάθε μαθητής σας σε σχέση με τους υπόλοιπους συμμετέχοντες.
            </p>
          </div>

          {/* Τι πουλάμε */}
          <div className="mb-10">
            <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-ink/40 mb-6">Τι πουλάμε</div>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { num: "01", title: "Θέματα Προσομοιώσεων", body: "Διαγωνίσματα προσομοιώσεων για μια ολόκληρη εκπαιδευτική χρονιά προετοιμασίας." },
                { num: "02", title: "Προγραμματισμός Ύλης", body: "Τι πρέπει να διδάξετε και πότε — δομημένα σε βάθος έτους." },
                { num: "03", title: "Προγραμματισμός Διαγωνισμάτων", body: "Πλήρης προγραμματισμός διαγωνισμάτων σε βάθος έτους." },
              ].map((item) => (
                <div key={item.num} className="rounded-3xl border border-ink/10 p-7 hover:border-[#056ef5]/30 hover:shadow-md transition-all">
                  <span className="font-display text-3xl text-[#056ef5]/20">{item.num}</span>
                  <h3 className="mt-3 font-display text-xl md:text-2xl text-ink leading-tight">{item.title}</h3>
                  <p className="mt-3 text-sm text-ink/60 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Εσείς / Εμείς */}
          <div className="flex flex-col sm:flex-row gap-0 mb-8 rounded-3xl overflow-hidden">
            <div className="flex-1 bg-[#056ef5] hover:bg-[#0451b8] transition-colors duration-300 px-8 py-7 flex items-center gap-4">
              <span className="font-display text-4xl text-paper/20 flex-shrink-0">→</span>
              <div>
                <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-paper/50 mb-1">Εσείς</div>
                <p className="font-display text-xl md:text-2xl text-paper leading-tight">Καταχωρείτε τις απαντήσεις των μαθητών</p>
              </div>
            </div>
            <div className="flex-1 bg-[#c8ff00] hover:bg-[#b8ee00] transition-colors duration-300 px-8 py-7 flex items-center gap-4">
              <span className="font-display text-4xl text-ink/20 flex-shrink-0">→</span>
              <div>
                <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-ink/50 mb-1">Εμείς</div>
                <p className="font-display text-xl md:text-2xl text-ink leading-tight">Αναλύουμε κάθε γραπτό για εσάς</p>
              </div>
            </div>
          </div>

          {/* Bento grid */}
          <div className="grid grid-cols-1 sm:grid-cols-6 gap-4 md:gap-5 sm:auto-rows-[minmax(180px,auto)]">

            {/* Big card — Φροντιστήριο */}
            <Link href="/sxetika" className="sm:col-span-6 md:col-span-4 md:row-span-2 relative rounded-3xl bg-accent-purple hover:bg-[#6500b0] p-8 md:p-10 overflow-hidden group hover:-translate-y-1 transition-all duration-300 block cursor-pointer">
              <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-brand/10 blur-3xl" />
              <img src="/TransparentAssets/Asset 9.png" alt="" aria-hidden="true" loading="lazy" className="pointer-events-none select-none absolute bottom-4 right-4 w-28 md:w-40 opacity-30 rotate-6" />
              <div className="relative">
                <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-paper/50">Στο Φροντιστήριο</div>
                <h3 className="mt-4 font-display text-2xl sm:text-4xl md:text-5xl leading-none text-paper">
                  Περισσότερες εγγραφές{" "}
                  <span className="text-[#c8ff00]">Λιγότερες διαγραφές</span>
                </h3>
                <p className="mt-6 max-w-md text-paper/80 leading-relaxed text-sm md:text-base">
                  Διαφοροποιηθείτε από τον ανταγωνισμό με δεδομένα που χτίζουν εμπιστοσύνη στους γονείς. Καλύτερα αποτελέσματα, θετικές συστάσεις και μελλοντικοί μαθητές.
                </p>
              </div>
            </Link>

            {/* Διδάσκοντα — Τύπος λάθους */}
            <BentoCard
              span="col-span-6 sm:col-span-3 md:col-span-2"
              bg="bg-[#056ef5]"
              hoverBg="hover:bg-[#0451b8]"
              accentText="text-[#c8ff00]"
              label="Στον Διδάσκοντα"
              title="Ανάλυση Τύπου Λάθους"
              body="Όχι μόνο πόσα λάθη κάνει ο μαθητής — αλλά και γιατί: απροσεξία, κατανόηση ή τεχνική."
            />

            {/* Διδάσκοντα — Κρυμμένες αδυναμίες */}
            <BentoCard
              span="col-span-6 sm:col-span-3 md:col-span-2"
              bg="bg-[#7c00d0]"
              hoverBg="hover:bg-[#6500b0]"
              accentText="text-[#c8ff00]"
              label="Στον Διδάσκοντα"
              title="Αναδεικνύει κρυμμένες αδυναμίες"
              body="Δείκτης ανθεκτικότητας, σταθμισμένης επίδοσης και βαρύτητας λάθους — για σχεδιασμό παρέμβασης."
            />

            {/* Γονείς — Σύγκριση */}
            <BentoCard
              span="col-span-6 md:col-span-2"
              bg="bg-[#056ef5]"
              hoverBg="hover:bg-[#0451b8]"
              accentText="text-[#c8ff00]"
              label="Στους Γονείς"
              title="Σύγκριση με τα πραγματικά αποτελέσματα"
              body="Σύγκριση με τους βαθμούς όλων των συμμετεχόντων και με τα περσινά αποτελέσματα των εξετάσεων."
            />

            {/* Γονείς — Εμπιστοσύνη */}
            <BentoCard
              span="col-span-6 md:col-span-4"
              bg="bg-[#c8ff00]"
              hoverBg="hover:bg-[#b8ee00]"
              accentText="text-ink"
              bodyColor="text-ink"
              label="Στους Γονείς"
              title="Εμπιστοσύνη μέσω διαφάνειας"
              body="Ποιοτική ανάλυση γραπτού για κάθε προσομοίωση. Εξατομικευμένη διδασκαλία, μέτρηση βελτίωσης και πραγματική εικόνα προόδου."
            />
          </div>
        </div>
      </section>

    </>
  );
}

function BentoCard({ span, bg, hoverBg, accentText, label, title, body, bodyColor = "text-paper" }: {
  span: string; bg: string; hoverBg: string; accentText: string; label: string; title: string; body: string; bodyColor?: string;
}) {
  return (
    <Link href="/sxetika" className={`${span} relative rounded-3xl ${bg} ${hoverBg} p-7 md:p-8 overflow-hidden hover:-translate-y-1 transition-all duration-300 block cursor-pointer`}>
      <div className={`text-[10px] font-bold tracking-[0.2em] uppercase ${accentText} opacity-70`}>{label}</div>
      <h3 className={`mt-3 font-display text-2xl md:text-3xl leading-tight ${accentText}`}>{title}</h3>
      <p className={`mt-3 text-sm leading-relaxed opacity-70 ${bodyColor}`}>{body}</p>
    </Link>
  );
}

/* ─── 2.5 MID CTA ──────────────────────────────────────────────────────── */

function MidCta() {
  return (
    <section className="relative bg-[#7c00d0] clip-x overflow-hidden">
      {/* Sprite decorations */}
      <img src="/TransparentAssets/Asset 7.png" alt="" aria-hidden="true" loading="lazy" className="pointer-events-none select-none absolute bottom-0 right-8 w-40 md:w-64 opacity-80 rotate-6 hidden sm:block" />
      <img src="/TransparentAssets/Asset 18.png" alt="" aria-hidden="true" loading="lazy" className="pointer-events-none select-none absolute top-6 right-[30%] w-20 md:w-28 opacity-60 -rotate-12 hidden lg:block" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-14 md:py-22">
        <div className="grid md:grid-cols-2 gap-12 items-center">

          {/* Left — title */}
          <div>
            <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-paper/60 mb-4">
              Ξεκινήστε σήμερα
            </div>
            <h2 className="font-display text-[clamp(2rem,4vw,3.5rem)] leading-[0.9] text-paper">
              Ξεκινήστε &amp; κάντε τη διαφορά
            </h2>
          </div>

          {/* Right — buttons */}
          <div className="flex flex-col items-start gap-4 md:pl-8">
            <Link
              href="/demo"
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-10 py-5 rounded-full bg-[#FDFFFC] text-[#056ef5] border-2 border-[#056ef5] font-black uppercase tracking-wider hover:bg-[#056ef5]/5 hover:-translate-y-0.5 transition-all text-base md:text-lg"
            >
              Δοκιμαστε το Demo
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/paketa"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#FDFFFC] text-[#7c00d0] border-2 border-[#7c00d0] font-bold uppercase tracking-wider hover:bg-[#7c00d0]/5 hover:-translate-y-0.5 transition-all text-sm"
            >
              Δειτε τα Πακετα
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}


/* ─── 3. HOW IT WORKS ──────────────────────────────────────────────────── */

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Επιλέξτε την Demo λειτουργεία",
      body: "Κατεβάστε το κριτήριο και δώστε το σε κάποιο μαθητή σας. Καταχωρίστε τη βαθμολογία του και δείτε τη μαθησιακή του πορεία.",
    },
    {
      n: "02",
      title: "Πληρώστε με Ασφάλεια",
      body: "Εφάπαξ πληρωμή μέσω e-pay και λάβετε άμεσα το παραστατικό-τιμολόγιο μέσω email.",
    },
    {
      n: "03",
      title: "Διαδικασία Προσομοίωσης",
      body: "Ενημερωθείτε για το πρόγραμμα των Προσομοιώσεων και την ύλη στην οποία αντιστοιχεί κάθε Προσομοίωση. Αφού οι μαθητές σας γράψουν, καταχωρίστε τις απαντήσεις τους στην πλατφόρμα.",
    },
    {
      n: "04",
      title: "Δείτε τα αποτελέσματα",
      body: "Μετά την ολοκλήρωση όλων των καταχωρήσεων θα έχετε στη διάθεσή σας το πλήρες εκπαιδευτικό προφίλ των μαθητών σας και την ανάλυση εστιασμένη στα λάθη τους.",
    },
    {
      n: "05",
      title: "Ενημέρωση Γονέων",
      body: "Ακολουθεί η ενημέρωση για την στοχευμένη στρατηγική βελτίωσης της επίδοσης του μαθητή καλύπτοντας τα κενά που εμφανίστηκαν.",
    },
  ];

  return (
    <section className="relative py-10 md:py-20 bg-brand overflow-hidden">
      <div className="hidden sm:block pointer-events-none absolute -top-40 right-0 w-[30rem] h-[30rem] rounded-full bg-white/10 blur-3xl" />
      {/* Sprite decorations */}
      <img src="/TransparentAssets/Asset 10.png" alt="" aria-hidden="true" loading="lazy" className="pointer-events-none select-none absolute top-10 right-8 w-28 md:w-44 opacity-75 -rotate-6 hidden sm:block" />
      <img src="/TransparentAssets/Asset 11.png" alt="" aria-hidden="true" loading="lazy" className="pointer-events-none select-none absolute bottom-8 right-4 w-24 md:w-36 opacity-70 rotate-12 hidden sm:block" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-3xl mb-10">
          <h2 className="font-display text-5xl md:text-7xl text-ink leading-none">
            Πώς λειτουργεί
          </h2>
          <p className="mt-4 text-sm md:text-base text-paper/70 max-w-xl">
            Με 5 βήματα… το φροντιστήριό σου ξεχωρίζει.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-x-12 gap-y-14">
          {steps.map((s, i) => (
            <div key={s.n} className={`group flex gap-6${i === steps.length - 1 && steps.length % 2 !== 0 ? " md:col-span-2 md:justify-center" : ""}`}>
              <div className="font-display text-5xl sm:text-8xl md:text-9xl leading-none text-ink group-hover:text-accent transition-colors duration-500 tabular-nums flex-shrink-0">
                {s.n}
              </div>
              <div className="pt-3">
                <h3 className="font-display text-2xl md:text-3xl leading-tight text-ink">
                  {s.title}
                </h3>
                <p className="mt-3 text-paper/70 leading-relaxed max-w-md text-sm">
                  {s.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── 4. MANIFESTO ─────────────────────────────────────────────────────── */

function Manifesto() {
  return (
    <section className="relative py-10 md:py-18 bg-accent-purple overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-brand/20 blur-3xl" />
      {/* Sprite decorations */}
      <img src="/TransparentAssets/Asset 13.png" alt="" aria-hidden="true" loading="lazy" className="pointer-events-none select-none absolute top-6 right-6 w-28 md:w-40 opacity-70 rotate-6 hidden sm:block" />
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 text-center">
        <div className="text-sm md:text-base font-bold tracking-[0.25em] uppercase text-accent mb-6">
          {el.home.manifestoEyebrow}
        </div>
        <blockquote className="font-display text-base sm:text-lg md:text-xl leading-tight text-paper">
          <span className="block text-accent text-5xl leading-none mb-3 text-left">&ldquo;</span>
          {el.home.manifestoQuote}
          <span className="block text-accent text-5xl leading-none mt-3 text-right">&rdquo;</span>
        </blockquote>
        <div className="mt-8 text-sm md:text-base font-bold text-paper/50 uppercase tracking-wider">
          {el.home.manifestoBy}
        </div>
      </div>
    </section>
  );
}

