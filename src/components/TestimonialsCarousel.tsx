"use client";

import { useEffect, useRef, useState } from "react";

const testimonials = [
  {
    quote:
      "Πολύ ενδιαφέρουσα εφαρμογή με αρκετή εκπαιδευτική πληροφορία που αναδύεται μέσα από μια σειρά προσομοιώσεων.",
    name: "Φροντιστήριο Πράξη",
    role: "Φροντιστήριο",
    initials: "ΠΡ",
    bg: "#e7f1ff",
    accent: "#056ef5",
  },
  {
    quote:
      "Η κάλυψη των κενών του Δημοτικού, μέσω της προετοιμασίας για τα Πρότυπα Γυμνάσια, είναι ζητούμενο για κάθε γονιό.",
    name: "Φροντιστήρια Αναφορά",
    role: "Φροντιστήριο",
    initials: "ΑΝ",
    bg: "#f1e7ff",
    accent: "#7c00d0",
  },
  {
    quote:
      "Δεν περιμέναμε τόση θερμή ανταπόκριση από τους γονείς στην ανάλυση γραπτού που κάνει το protupa.gr.",
    name: "Φροντιστήριο Παπασπύρου",
    role: "Φροντιστήριο",
    initials: "ΠΑ",
    bg: "#efffc7",
    accent: "#75b900",
  },
  {
    quote:
      "Μετά την πρώτη προσομοίωση που έκανε το παιδί μου, με έκπληξη διαπίστωσα ότι από ένα γραπτό μπορείς να διορθώσεις πολλά, πολλά πράγματα. Μπράβο σας.",
    name: "Κ.Π.",
    role: "Γονέας",
    initials: "ΚΠ",
    bg: "#fff0e5",
    accent: "#ff6b35",
  },
  {
    quote:
      "Είμαστε καλοί και στη Γλώσσα και στα Μαθηματικά, όμως και πάλι βρήκαμε σημεία στα οποία πρέπει να εστιάσουμε προσεκτικότερα.",
    name: "Μ.Ν.",
    role: "Γονέας",
    initials: "ΜΝ",
    bg: "#e7fbf7",
    accent: "#00a88f",
  },
];

export default function TestimonialsCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const goTo = (index: number) => {
    const track = trackRef.current;
    const card = track?.children[index] as HTMLElement | undefined;
    if (!track || !card) return;

    track.scrollTo({ left: card.offsetLeft, behavior: "smooth" });
    setActive(index);
  };

  const move = (direction: 1 | -1) => {
    const next =
      (active + direction + testimonials.length) % testimonials.length;
    goTo(next);
  };

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => move(1), 5000);
    return () => window.clearInterval(timer);
  }, [active, paused]);

  return (
    <section className="relative overflow-hidden bg-white py-16 md:py-24">
      <div className="pointer-events-none absolute left-1/3 top-0 h-72 w-72 rounded-full bg-[#c8ff00]/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-[#7c00d0]/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
          <div className="max-w-3xl">
            <div className="text-[10px] font-black uppercase tracking-[0.28em] text-brand">
              Εμπειρίες συνεργατών &amp; γονέων
            </div>
            <h2 className="mt-4 font-display text-4xl leading-none text-ink md:text-6xl">
              Λόγια που έχουν{" "}
              <span className="text-[#7c00d0]">μετρήσιμη αξία.</span>
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label="Προηγούμενη κριτική"
              className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-ink/10 bg-white text-ink shadow-sm transition hover:-translate-y-1 hover:border-[#7c00d0] hover:bg-[#7c00d0] hover:text-white"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              aria-label="Επόμενη κριτική"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-ink text-white shadow-lg transition hover:-translate-y-1 hover:bg-[#7c00d0]"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>

        <div
          ref={trackRef}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onScroll={(event) => {
            const track = event.currentTarget;
            const cards = Array.from(track.children) as HTMLElement[];
            const closest = cards.reduce(
              (best, card, index) =>
                Math.abs(card.offsetLeft - track.scrollLeft) < best.distance
                  ? { index, distance: Math.abs(card.offsetLeft - track.scrollLeft) }
                  : best,
              { index: 0, distance: Number.POSITIVE_INFINITY },
            );
            setActive(closest.index);
          }}
          className="mt-14 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {testimonials.map((item, index) => (
            <figure
              key={item.name}
              className="group relative flex min-h-[350px] min-w-full snap-start flex-col overflow-hidden rounded-[2.25rem] border-2 border-white p-8 shadow-[0_18px_50px_rgba(20,30,60,.1)] transition duration-300 hover:-translate-y-2 sm:min-w-[calc(50%-0.75rem)] lg:min-w-[calc(33.333%-1rem)]"
              style={{ backgroundColor: item.bg }}
            >
              <div className="absolute -right-5 -top-8 font-display text-[11rem] leading-none opacity-10" style={{ color: item.accent }}>“</div>
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl text-5xl leading-none text-white shadow-lg transition group-hover:-rotate-6 group-hover:scale-110" style={{ backgroundColor: item.accent }}>“</div>
              <blockquote className="relative mt-7 flex-1 text-lg font-bold leading-relaxed text-ink/75">
                {item.quote}
              </blockquote>
              <figcaption className="relative mt-8 flex items-center gap-4 border-t border-ink/10 pt-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xs font-black text-white" style={{ backgroundColor: item.accent }}>
                  {item.initials}
                </div>
                <div>
                  <div className="font-black text-ink">{item.name}</div>
                  <div className="mt-1 text-xs text-ink/45">{item.role}</div>
                </div>
              </figcaption>
              <span className="absolute bottom-0 left-0 h-2 w-full origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100" style={{ backgroundColor: item.accent }} />
            </figure>
          ))}
        </div>

        <div className="mt-2 flex justify-center gap-2" aria-label="Επιλογή κριτικής">
          {testimonials.map((item, index) => (
            <button
              key={item.name}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Μετάβαση στην κριτική ${index + 1}`}
              className={`h-2.5 rounded-full transition-all duration-300 ${active === index ? "w-9 bg-[#7c00d0]" : "w-2.5 bg-ink/15 hover:bg-ink/30"}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
