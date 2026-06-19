"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { el } from "@/lib/i18n/el";

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div>
      <Hero />

      <section className="relative bg-white pt-10 pb-12 md:pt-14 md:pb-20 overflow-hidden">
        {/* Sprite decorations */}
        <img src="/TransparentAssets/Asset 21.png" alt="" aria-hidden="true" className="pointer-events-none select-none absolute top-8 right-4 w-20 md:w-28 opacity-65 rotate-12 hidden sm:block" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">

            {/* Left — contact info */}
            <aside className="lg:col-span-5">
              <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-ink/40 mb-6">
                Πού να μας βρείτε
              </div>

              <ul className="divide-y divide-ink/10 border-y border-ink/10">
                <InfoRow numeral="01" label="Email" value={el.contact.infoEmailValue} note={el.contact.infoEmailNote} href={`mailto:${el.contact.infoEmailValue}`} />
                <InfoRow numeral="02" label="Ώρες" value={el.contact.infoHoursValue} note={el.contact.infoHoursNote} />
                <InfoRow numeral="03" label="Τοποθεσία" value={el.contact.infoLocationValue} note={el.contact.infoLocationNote} />
              </ul>

              <p className="mt-10 text-sm text-ink/50 leading-relaxed max-w-sm">
                Πριν επικοινωνήσετε, ίσως βρείτε την απάντηση στις{" "}
                <Link href="/faq" className="text-brand hover:text-accent-purple font-bold transition-colors">
                  συχνές ερωτήσεις
                </Link>
                .
              </p>
            </aside>

            {/* Right — form */}
            <div className="lg:col-span-7">
              <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-ink/40 mb-8">
                ↓ Στείλτε μήνυμα
              </div>

              {sent ? (
                <SuccessState onReset={() => { setSent(false); formRef.current?.reset(); }} />
              ) : (
                <form
                  ref={formRef}
                  className="space-y-8"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setError(null);
                    setSubmitting(true);
                    const data = new FormData(e.currentTarget);
                    try {
                      const res = await fetch("/api/contact", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          name:    data.get("name"),
                          email:   data.get("email"),
                          school:  data.get("school") || undefined,
                          subject: data.get("subject"),
                          message: data.get("message"),
                        }),
                      });
                      const json = await res.json();
                      if (!res.ok) throw new Error(json.error ?? "Σφάλμα αποστολής.");
                      setSent(true);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Σφάλμα αποστολής. Δοκιμάστε ξανά.");
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                >
                  <div className="grid sm:grid-cols-2 gap-8">
                    <Field label={el.contact.name} name="name" placeholder={el.contact.namePlaceholder} required />
                    <Field label={el.contact.email} name="email" type="email" placeholder={el.contact.emailPlaceholder} required />
                  </div>
                  <Field label={el.contact.school} name="school" placeholder={el.contact.schoolPlaceholder} />
                  <SelectField label={el.contact.subject} name="subject" placeholder={el.contact.subjectPlaceholder} options={el.contact.subjectOptions} />
                  <TextareaField label={el.contact.message} name="message" placeholder={el.contact.messagePlaceholder} />

                  {error && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-xl">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="group inline-flex items-center gap-2 px-7 py-4 rounded-full bg-[#FDFFFC] text-[#056ef5] border-2 border-[#056ef5] font-black uppercase tracking-wider text-sm hover:bg-[#056ef5]/5 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:hover:translate-y-0 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <SpinnerIcon className="w-4 h-4 animate-spin" />
                        {el.contact.sending}
                      </>
                    ) : (
                      <>
                        <span className="w-6 h-6 rounded-full bg-white/15 grid place-items-center group-hover:scale-110 transition-transform">
                          <svg className="w-2.5 h-2.5 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="6 4 20 12 6 20 6 4" />
                          </svg>
                        </span>
                        {el.contact.send}
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ─── HERO ─────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section
      className="relative pt-12 pb-14 md:pt-18 md:pb-20 clip-x overflow-hidden"
      style={{ backgroundImage: "url('/contactus.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}
    >
      {/* Dark overlay so text stays readable */}
      <div className="absolute inset-0 bg-brand/70" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <h1 className="font-display text-[clamp(1.8rem,4vw,3.5rem)] leading-tight text-paper">
          Επικοινωνήστε{" "}
          <span className="text-[#c8ff00]">μαζί μας</span>
        </h1>
        <p className="mt-4 max-w-md text-base text-paper/80 leading-relaxed">
          Κάθε ερώτηση μετράει. Είμαστε εδώ για να σας ακούσουμε και να σας απαντήσουμε άμεσα.
        </p>
      </div>
    </section>
  );
}

/* ─── INFO ROW ─────────────────────────────────────────────────────────── */

function InfoRow({ numeral, label, value, note, href }: {
  numeral: string; label: string; value: string; note: string; href?: string;
}) {
  const inner = (
    <div className="group flex items-baseline gap-5 py-6">
      <span className="font-display text-2xl tabular-nums text-ink/30 group-hover:text-brand transition-colors flex-shrink-0">
        {numeral}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-ink/40">
          {label}
        </div>
        <div className="mt-2 font-display text-base sm:text-2xl leading-tight text-ink break-all">
          {value}
        </div>
        <div className="mt-1 text-xs text-ink/40">{note}</div>
      </div>
      {href && (
        <span className="font-display text-2xl text-ink/30 group-hover:text-brand group-hover:translate-x-1 transition-all flex-shrink-0">
          →
        </span>
      )}
    </div>
  );
  return (
    <li>
      {href ? <a href={href} className="block">{inner}</a> : inner}
    </li>
  );
}

/* ─── FORM FIELDS ──────────────────────────────────────────────────────── */

function Field({ label, name, placeholder, type = "text", required = false }: {
  label: string; name: string; placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <label className="block group">
      <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-ink/40">
        {label}
      </span>
      <input
        required={required}
        name={name}
        type={type}
        placeholder={placeholder}
        className="mt-2 w-full bg-transparent border-0 border-b-2 border-ink/20 px-0 py-3 text-lg font-display text-ink placeholder:text-ink/30 focus:outline-none focus:border-brand transition-colors"
      />
    </label>
  );
}

function SelectField({ label, name, placeholder, options }: {
  label: string; name: string; placeholder: string; options: readonly string[];
}) {
  return (
    <label className="block group">
      <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-ink/40">
        {label}
      </span>
      <select
        required
        name={name}
        defaultValue=""
        className="mt-2 w-full bg-white border-0 border-b-2 border-ink/20 px-0 py-3 text-lg font-display text-ink focus:outline-none focus:border-brand transition-colors cursor-pointer"
      >
        <option value="" disabled className="text-ink/30">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt} className="bg-white text-ink">{opt}</option>
        ))}
      </select>
    </label>
  );
}

function TextareaField({ label, name, placeholder }: {
  label: string; name: string; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-ink/40">
        {label}
      </span>
      <textarea
        required
        name={name}
        rows={5}
        placeholder={placeholder}
        className="mt-2 w-full bg-transparent border-0 border-b-2 border-ink/20 px-0 py-3 text-lg font-display text-ink placeholder:text-ink/30 focus:outline-none focus:border-brand transition-colors resize-none"
      />
    </label>
  );
}

/* ─── SUCCESS STATE ────────────────────────────────────────────────────── */

function SuccessState({ onReset }: { onReset: () => void }) {
  return (
    <div>
      <div className="font-display text-6xl text-brand">Ευχαριστούμε</div>
      <h2 className="mt-6 font-display text-3xl text-ink">{el.contact.sentTitle}</h2>
      <p className="mt-3 text-ink/50 max-w-md leading-relaxed text-sm">{el.contact.sentBody}</p>
      <button
        onClick={onReset}
        className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#FDFFFC] text-[#7c00d0] border-2 border-[#7c00d0] font-bold uppercase tracking-wider text-sm hover:bg-[#7c00d0]/5 hover:-translate-y-0.5 transition-all cursor-pointer"
      >
        {el.contact.sentAction}
      </button>
    </div>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
