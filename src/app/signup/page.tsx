"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { el } from "@/lib/i18n/el";
import { scorePassword, validatePassword } from "@/lib/password";
import Image from "next/image";

type AccountType = "school" | "parent";

const STRENGTH_COLOR: Record<0 | 1 | 2 | 3, string> = {
  0: "bg-ink/10",
  1: "bg-red-500",
  2: "bg-yellow-500",
  3: "bg-green-500",
};
const STRENGTH_TEXT: Record<0 | 1 | 2 | 3, string> = {
  0: "text-ink/35",
  1: "text-red-600",
  2: "text-yellow-600",
  3: "text-green-700",
};
const STRENGTH_LABEL: Record<0 | 1 | 2 | 3, string> = {
  0: "",
  1: "Αδύναμος",
  2: "Μέτριος",
  3: "Ισχυρός",
};

// ── Eye icon ─────────────────────────────────────────────────────────────────
function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

export default function SignUpPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<AccountType>("school");
  const [fullName, setFullName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const strength = scorePassword(password);
  const confirmMismatch = confirm.length > 0 && confirm !== password;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const pwError = validatePassword(password);
    if (pwError) { setError(pwError); return; }
    if (password !== confirm) { setError("Οι κωδικοί δεν ταιριάζουν."); return; }
    if (!fullName.trim()) { setError("Συμπληρώστε το ονοματεπώνυμό σας."); return; }
    if (accountType === "school" && !schoolName.trim()) { setError("Συμπληρώστε το όνομα του φροντιστηρίου."); return; }
    if (!termsAccepted) { setError("Πρέπει να αποδεχτείτε τους Όρους Χρήσης και την Πολιτική Απορρήτου."); return; }

    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          school_name: accountType === "school" ? schoolName.trim() : null,
          account_type: accountType,
        },
      },
    });
    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }
    // Supabase returns a user with empty identities when the email is already taken
    // but email confirmation is disabled — guard against this silent failure.
    if (data.user && data.user.identities?.length === 0) {
      setError("Αυτό το email είναι ήδη καταχωρημένο. Δοκιμάστε να συνδεθείτε.");
      return;
    }
    if (data.session) {
      router.push("/onboarding");
      router.refresh();
    } else {
      setInfo(el.auth.checkEmail);
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] grid md:grid-cols-[1fr_1.1fr]">
      {/* Left brand panel */}
      <div className="hidden md:flex flex-col justify-between p-10 relative overflow-hidden">
        <Image src="/auth-start.jpg" alt="" aria-hidden="true" fill style={{ objectFit: "cover" }} sizes="50vw" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#056ef5]/85 via-[#056ef5]/70 to-[#056ef5]/95 mix-blend-multiply" />
        <div />
        <div className="relative z-10">
          <h2 className="font-display text-5xl text-white leading-tight">
            Ξεκινήστε<br />
            <span className="text-[#c8ff00]">σήμερα</span>
          </h2>
          <p className="mt-4 text-white/80 text-sm max-w-xs leading-relaxed">
            Δημιουργήστε δωρεάν λογαριασμό και αποκτήστε πρόσβαση στα εργαλεία προετοιμασίας.
          </p>
        </div>
        <div className="relative z-10 text-white/50 text-xs">© {new Date().getFullYear()} Protupa</div>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center px-6 py-10 bg-white">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-ink/40 mb-2">Εγγραφή</div>
            <h1 className="font-display text-3xl md:text-4xl text-ink">{el.auth.signupTitle}</h1>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Account type toggle */}
            <div>
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-ink/40">Είστε</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["school", "parent"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setAccountType(t)}
                    className={`px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                      accountType === t
                        ? t === "school"
                          ? "bg-[#056ef5] text-white border-2 border-[#056ef5]"
                          : "bg-[#7c00d0] text-white border-2 border-[#7c00d0]"
                        : "bg-white text-ink/60 border-2 border-ink/10 hover:border-ink/30"
                    }`}
                  >
                    {t === "school" ? "Φροντιστήριο" : "Γονέας"}
                  </button>
                ))}
              </div>
            </div>

            <AuthField label={el.auth.fullName} value={fullName} onChange={setFullName} />
            {accountType === "school" && (
              <AuthField label={el.auth.schoolName} value={schoolName} onChange={setSchoolName} />
            )}
            <AuthField label={el.auth.email} type="email" value={email} onChange={setEmail} />

            {/* Password field */}
            <div>
              <label className="block">
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-ink/40">{el.auth.password}</span>
                <div className="relative">
                  <input
                    required
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className="mt-2 w-full bg-transparent border-0 border-b-2 border-ink/20 px-0 pr-8 py-3 text-base font-display text-ink placeholder:text-ink/30 focus:outline-none focus:border-[#7c00d0] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-0 bottom-3 text-ink/35 hover:text-ink/70 transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    <EyeIcon open={showPw} />
                  </button>
                </div>
              </label>

              {/* Strength meter */}
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          strength >= i ? STRENGTH_COLOR[strength] : "bg-ink/10"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold ${STRENGTH_TEXT[strength]}`}>
                      {STRENGTH_LABEL[strength]}
                    </span>
                    <span className="text-[10px] text-ink/35">
                      Απαιτείται κεφαλαίο, πεζό &amp; αριθμός · τουλάχιστον 8 χαρακτήρες
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="block">
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-ink/40">Επιβεβαίωση κωδικού</span>
                <div className="relative">
                  <input
                    required
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    className={`mt-2 w-full bg-transparent border-0 border-b-2 px-0 pr-8 py-3 text-base font-display text-ink placeholder:text-ink/30 focus:outline-none transition-colors ${
                      confirmMismatch ? "border-red-400 focus:border-red-500" : "border-ink/20 focus:border-[#7c00d0]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-0 bottom-3 text-ink/35 hover:text-ink/70 transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    <EyeIcon open={showConfirm} />
                  </button>
                </div>
              </label>
              {confirmMismatch && (
                <p className="mt-1 text-[10px] text-red-500 font-bold">Οι κωδικοί δεν ταιριάζουν.</p>
              )}
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-xl">{error}</div>
            )}
            {info && (
              <div className="text-sm text-green-700 bg-green-50 border border-green-200 p-3 rounded-xl">{info}</div>
            )}

            {/* Terms acceptance */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <button
                type="button"
                role="checkbox"
                aria-checked={termsAccepted}
                onClick={() => setTermsAccepted((v) => !v)}
                className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  termsAccepted ? "bg-[#7c00d0] border-[#7c00d0]" : "border-ink/30 group-hover:border-ink/50"
                }`}
              >
                {termsAccepted && <span className="text-white text-xs font-black leading-none">✓</span>}
              </button>
              <span className="text-xs text-ink/60 leading-relaxed">
                Διάβασα και αποδέχομαι τους{" "}
                <Link href="/oroi" target="_blank" className="text-[#056ef5] font-bold hover:text-[#7c00d0] transition-colors">
                  Όρους Χρήσης
                </Link>
                {" "}και την{" "}
                <Link href="/aporrito" target="_blank" className="text-[#056ef5] font-bold hover:text-[#7c00d0] transition-colors">
                  Πολιτική Απορρήτου
                </Link>
                {" "}του protupa.gr.
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || confirmMismatch || !termsAccepted}
              className="w-full px-6 py-4 rounded-full bg-[#FDFFFC] text-[#7c00d0] border-2 border-[#7c00d0] font-black uppercase tracking-wider text-sm hover:bg-[#7c00d0]/5 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? el.common.loading : el.auth.signupButton}
            </button>
          </form>

          <p className="mt-8 text-sm text-ink/50 text-center">
            {el.auth.haveAccount}{" "}
            <Link href="/signin" className="text-[#056ef5] font-bold hover:text-[#7c00d0] transition-colors">
              {el.auth.signinLink}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function AuthField({ label, value, onChange, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-ink/40">{label}</span>
      <input
        required
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={type === "email" ? "email" : type === "password" ? "new-password" : "off"}
        className="mt-2 w-full bg-transparent border-0 border-b-2 border-ink/20 px-0 py-3 text-base font-display text-ink placeholder:text-ink/30 focus:outline-none focus:border-[#7c00d0] transition-colors"
      />
    </label>
  );
}
