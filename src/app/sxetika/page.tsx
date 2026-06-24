import type { Metadata } from "next";
import Link from "next/link";
import { el } from "@/lib/i18n/el";

export const metadata: Metadata = {
  title: "Σχετικά με εμάς",
  description:
    "Η ιστορία πίσω από το Protupa — φτιαγμένο από εκπαιδευτικούς για να βοηθήσει τα φροντιστήρια και τα παιδιά να ξεχωρίσουν στις εξετάσεις των Πρότυπων Σχολείων.",
  alternates: { canonical: "/sxetika" },
};

export default function AboutPage() {
  return (
    <div className="overflow-hidden">
      <Hero />
      <Story />
      <Values />
      <Cta />
    </div>
  );
}

/* ─── HERO ─────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section
      className="relative pt-12 pb-14 md:pt-18 md:pb-20 clip-x overflow-hidden"
      style={{ backgroundImage: "url(/about.jpg)", backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <div className="absolute inset-0 bg-[#7c00d0]/85" />
      <img src="/TransparentAssets/Asset 13.png" alt="" aria-hidden="true" className="pointer-events-none select-none absolute top-6 right-8 w-32 md:w-48 opacity-70 rotate-6 hidden sm:block" />
      <img src="/TransparentAssets/Asset 9.png" alt="" aria-hidden="true" className="pointer-events-none select-none absolute bottom-4 right-[35%] w-20 md:w-32 opacity-65 -rotate-12 hidden md:block" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/70 mb-4">
          {el.about.eyebrow}
        </div>
        <h1 className="font-display text-[clamp(2.5rem,7vw,6rem)] leading-none text-white">
          {el.about.titleA}
          <br />
          <span className="text-[#c8ff00]">{el.about.titleB}</span>
        </h1>
        <p className="mt-8 max-w-xl text-base md:text-lg text-white/80 leading-relaxed">
          {el.about.intro}
        </p>
      </div>
    </section>
  );
}

/* ─── STORY ────────────────────────────────────────────────────────────── */

function Story() {
  return (
    <section className="relative bg-white py-10 md:py-20 overflow-hidden">
      <img src="/TransparentAssets/Asset 11.png" alt="" aria-hidden="true" className="pointer-events-none select-none absolute bottom-8 left-6 w-24 md:w-36 opacity-50 rotate-12 hidden sm:block" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-24">
              <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-ink/50 mb-4">
                {el.about.storyEyebrow}
              </div>
              <div className="font-display text-[6rem] md:text-[9rem] leading-none text-[#056ef5]/10 select-none">
                01
              </div>
            </div>
          </aside>
          <div className="lg:col-span-8">
            <h2 className="font-display text-3xl md:text-5xl leading-tight text-ink">
              {el.about.storyTitle}
            </h2>
            <p className="mt-8 text-base md:text-lg text-ink/70 leading-relaxed max-w-2xl">
              {el.about.storyBody1}
            </p>
            <p className="mt-5 text-base md:text-lg text-ink/70 leading-relaxed max-w-2xl">
              {el.about.storyBody2}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── VALUES ────────────────────────────────────────────────────────────── */

function Values() {
  return (
    <section className="relative bg-[#7c00d0] py-10 md:py-20 overflow-hidden">
      <div className="hidden sm:block pointer-events-none absolute -top-40 -right-40 w-[36rem] h-[36rem] rounded-full bg-[#056ef5]/20 blur-3xl" />
      <img src="/TransparentAssets/Asset 12.png" alt="" aria-hidden="true" className="pointer-events-none select-none absolute top-10 right-8 w-28 md:w-44 opacity-60 -rotate-6 hidden sm:block" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          <aside className="lg:col-span-5">
            <div className="lg:sticky lg:top-24">
              <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#c8ff00] mb-4">
                {el.about.missionEyebrow}
              </div>
              <h2 className="font-display text-3xl md:text-5xl leading-tight text-white [word-break:normal] [hyphens:none]">
                {el.about.missionTitle}
              </h2>
              <p className="mt-6 text-base text-white/80 leading-relaxed">
                {el.about.missionBody}
              </p>
              <div className="font-display text-[6rem] md:text-[9rem] leading-none text-white/10 select-none mt-4">
                02
              </div>
            </div>
          </aside>
          <div className="lg:col-span-7">
            <ul className="divide-y divide-white/15 border-y border-white/15">
              {el.about.values.map((v, i) => (
                <li key={i} className="group py-8">
                  <div className="flex items-start gap-6">
                    <span className="font-display text-2xl tabular-nums text-[#c8ff00]/50 group-hover:text-[#c8ff00] transition-colors flex-shrink-0 mt-1">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1">
                      <h3 className="font-display text-xl md:text-2xl leading-tight text-white">
                        {v.title}
                      </h3>
                      <p className="mt-3 text-white/70 leading-relaxed text-sm md:text-base">
                        {v.body}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── CTA ──────────────────────────────────────────────────────────────── */

function Cta() {
  return (
    <section className="relative bg-[#056ef5] py-10 md:py-20 overflow-hidden">
      <img src="/TransparentAssets/Asset 14.png" alt="" aria-hidden="true" className="pointer-events-none select-none absolute bottom-6 right-8 w-32 md:w-48 opacity-65 rotate-12 hidden sm:block" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#c8ff00] mb-4">
            Ξεκινήστε σήμερα
          </div>
          <h2 className="font-display text-4xl md:text-6xl leading-none text-white">
            {el.about.ctaTitle}
          </h2>
          <p className="mt-6 text-base md:text-lg text-white/80 max-w-xl leading-relaxed">
            {el.about.ctaBody}
          </p>
          <div className="mt-10 flex items-center gap-3 flex-wrap">
            <Link
              href="/paketa"
              className="group inline-flex items-center gap-2 px-7 py-4 rounded-full bg-[#FDFFFC] text-[#7c00d0] border-2 border-[#7c00d0] font-black uppercase tracking-wider text-sm hover:bg-[#7c00d0]/5 hover:-translate-y-0.5 transition-all"
            >
              {el.about.ctaPackages}
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/demo"
              className="group inline-flex items-center gap-2 px-7 py-4 rounded-full bg-[#FDFFFC] text-[#056ef5] border-2 border-[#c8ff00] font-black uppercase tracking-wider text-sm hover:bg-[#c8ff00]/10 hover:-translate-y-0.5 transition-all"
            >
              <span className="w-6 h-6 rounded-full bg-[#c8ff00]/20 grid place-items-center group-hover:scale-110 transition-transform">
                <svg className="w-2.5 h-2.5 ml-0.5" viewBox="0 0 24 24" fill="#056ef5">
                  <polygon points="6 4 20 12 6 20 6 4" />
                </svg>
              </span>
              {el.about.ctaDemo}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
