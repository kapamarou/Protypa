"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const slides = [
  {
    eyebrow: "Ολοκληρωμένη εκπαιδευτική πλατφόρμα",
    title: "Η προετοιμασία για τα Πρότυπα, βασισμένη σε δεδομένα.",
    text: "Οργανώστε την ύλη, πραγματοποιήστε διαγωνίσματα προσομοίωσης και δείτε με ακρίβεια την πρόοδο, τις αδυναμίες και τις ανάγκες κάθε μαθητή.",
    image: "/hero-dashboard.png",
    imageAlt: "Αναλυτική αναφορά επίδοσης μαθητή στην πλατφόρμα Protupa",
    primary: { label: "Δείτε πώς λειτουργεί", href: "#pos-leitourgei" },
    secondary: { label: "Δοκιμάστε δωρεάν το Demo", href: "/demo" },
    theme: "blue",
  },
  {
    eyebrow: "Όλοι μαζί για την πρόοδο του μαθητή",
    title: "Ένα ολοκληρωμένο εργαλείο για φροντιστήρια, εκπαιδευτικούς και γονείς.",
    text: "Από την οργάνωση της διδασκαλίας και την ανάλυση των αποτελεσμάτων μέχρι την ουσιαστική ενημέρωση των γονέων, το Protupa συνδέει όλους όσοι συμμετέχουν στην προετοιμασία του μαθητή.",
    image: "/hero-audience.png",
    imageAlt: "Εκπαιδευτικός, γονέας και μαθητής συνεργάζονται μέσα από την πλατφόρμα Protupa",
    primary: { label: "Δοκιμάστε δωρεάν το Demo", href: "/demo" },
    secondary: { label: "Δείτε τα πακέτα", href: "/paketa" },
    theme: "purple",
  },
] as const;

export default function HeroSlider() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [paused]);

  const goTo = (index: number) => setActive((index + slides.length) % slides.length);

  return (
    <section
      className="relative overflow-hidden bg-[#056ef5]"
      aria-roledescription="carousel"
      aria-label="Παρουσίαση της πλατφόρμας Protupa"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        className="flex transition-transform duration-700 ease-[cubic-bezier(.22,.61,.36,1)]"
        style={{ transform: `translateX(-${active * 100}%)` }}
      >
        {slides.map((slide, index) => (
          <article
            key={slide.title}
            className={`relative min-w-full overflow-hidden ${slide.theme === "blue" ? "bg-[#056ef5]" : "bg-[#7c00d0]"}`}
            aria-hidden={active !== index}
          >
            <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-40 right-0 h-[30rem] w-[30rem] rounded-full bg-[#c8ff00]/10 blur-3xl" />

            <div className="relative mx-auto grid min-h-[620px] max-w-7xl items-center gap-10 px-5 pb-24 pt-16 sm:px-8 lg:grid-cols-[.9fr_1.1fr] lg:gap-14 lg:py-20">
              <div className="text-left">
                <div className="inline-flex rounded-full border border-white/30 bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.22em] text-white backdrop-blur">
                  {slide.eyebrow}
                </div>
                <h1 className="mt-6 max-w-2xl font-display text-[clamp(1.9rem,3vw,3.25rem)] leading-[1.05] text-paper">
                  {slide.title}
                </h1>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-paper/75 md:text-lg">
                  {slide.text}
                </p>
                <div className="mt-8 flex flex-col gap-3 min-[520px]:flex-row min-[520px]:flex-nowrap min-[520px]:items-center">
                  <Link
                    href={slide.primary.href}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-[#c8ff00] px-6 py-4 text-center text-xs font-black uppercase tracking-wider text-ink transition hover:-translate-y-0.5 hover:shadow-lg md:text-sm"
                    tabIndex={active === index ? 0 : -1}
                  >
                    {slide.primary.label}
                  </Link>
                  <Link
                    href={slide.secondary.href}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-full border-2 border-white/40 bg-white/10 px-6 py-4 text-center text-xs font-black uppercase tracking-wider text-paper backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20 md:text-sm"
                    tabIndex={active === index ? 0 : -1}
                  >
                    {slide.secondary.label}
                  </Link>
                </div>
              </div>

              <div className="relative">
                <div className="pointer-events-none absolute -inset-8 rounded-full bg-[#c8ff00]/15 blur-3xl" />
                <img
                  src={slide.image}
                  alt={slide.imageAlt}
                  className="relative aspect-[16/9] w-full rounded-[1.75rem] object-cover object-center shadow-[0_35px_80px_rgba(0,0,0,.28)] ring-1 ring-white/20"
                  loading={index === 0 ? "eager" : "lazy"}
                />
              </div>
            </div>
          </article>
        ))}
      </div>

      <button
        type="button"
        onClick={() => goTo(active - 1)}
        className="absolute left-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/15 p-0 text-white backdrop-blur transition hover:bg-black/30 md:flex"
        aria-label="Προηγούμενο slide"
      >
        <svg className="block h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => goTo(active + 1)}
        className="absolute right-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/15 p-0 text-white backdrop-blur transition hover:bg-black/30 md:flex"
        aria-label="Επόμενο slide"
      >
        <svg className="block h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="absolute bottom-7 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-black/15 px-3 py-2 backdrop-blur">
        {slides.map((slide, index) => (
          <button
            key={slide.title}
            type="button"
            onClick={() => goTo(index)}
            className={`h-2.5 rounded-full transition-all ${active === index ? "w-9 bg-[#c8ff00]" : "w-2.5 bg-white/45 hover:bg-white/75"}`}
            aria-label={`Μετάβαση στο slide ${index + 1}`}
            aria-current={active === index ? "true" : undefined}
          />
        ))}
      </div>
    </section>
  );
}
