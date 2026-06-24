"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { el } from "@/lib/i18n/el";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // After the auth/callback redirect, the session is set in the cookie.
  // We verify it's live before showing the form.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      setSessionReady(!!data.session);
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Οι κωδικοί δεν ταιριάζουν.");
      return;
    }
    if (password.length < 6) {
      setError("Ο κωδικός πρέπει να είναι τουλάχιστον 6 χαρακτήρες.");
      return;
    }
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) setError(error.message);
    else setDone(true);
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] grid md:grid-cols-[1fr_1.1fr]">
      {/* Left brand panel */}
      <div className="hidden md:flex flex-col justify-between bg-[#056ef5] p-10 relative overflow-hidden">
        <img src="/Logos/mainLogo.png" alt="Protupa" className="h-8 w-auto" />
        <div className="relative z-10">
          <h2 className="font-display text-5xl text-white leading-tight">
            Νέος<br />
            <span className="text-[#c8ff00]">κωδικός</span>
          </h2>
          <p className="mt-4 text-white/70 text-sm max-w-xs leading-relaxed">
            Επιλέξτε έναν νέο κωδικό για τον λογαριασμό σας.
          </p>
        </div>
        <div className="text-white/30 text-xs">© {new Date().getFullYear()} Protupa</div>
        <img src="/TransparentAssets/Asset 21.png" alt="" aria-hidden="true"
          className="pointer-events-none select-none absolute top-8 right-6 w-32 opacity-60 rotate-12" />
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center px-6 py-14 bg-white">
        <div className="w-full max-w-sm">
          {done ? (
            <div>
              <div className="font-display text-6xl text-[#056ef5]">✓</div>
              <h1 className="mt-4 font-display text-3xl text-ink">Ο κωδικός άλλαξε</h1>
              <p className="mt-3 text-ink/50 text-sm leading-relaxed max-w-xs">
                Μπορείτε τώρα να συνδεθείτε με τον νέο σας κωδικό.
              </p>
              <button
                onClick={() => { router.push("/account"); router.refresh(); }}
                className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-full bg-[#FDFFFC] text-[#056ef5] border-2 border-[#056ef5] font-black uppercase tracking-wider text-xs hover:bg-[#056ef5]/5 hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                Πηγαίνω στον λογαριασμό μου →
              </button>
            </div>
          ) : !sessionReady ? (
            <div>
              <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-ink/40 mb-2">Επαναφορά</div>
              <h1 className="font-display text-3xl text-ink mb-6">Μη έγκυρος σύνδεσμος</h1>
              <p className="text-ink/50 text-sm leading-relaxed max-w-xs">
                Ο σύνδεσμος επαναφοράς έχει λήξει ή δεν είναι έγκυρος. Ζητήστε νέο σύνδεσμο.
              </p>
              <Link
                href="/forgot-password"
                className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-full bg-[#FDFFFC] text-[#7c00d0] border-2 border-[#7c00d0] font-black uppercase tracking-wider text-xs hover:bg-[#7c00d0]/5 hover:-translate-y-0.5 transition-all"
              >
                Νέος σύνδεσμος
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-10">
                <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-ink/40 mb-2">
                  Επαναφορά κωδικού
                </div>
                <h1 className="font-display text-3xl md:text-4xl text-ink">Νέος κωδικός</h1>
              </div>
              <form className="space-y-7" onSubmit={submit}>
                <AuthField
                  label="Νέος κωδικός"
                  type="password"
                  value={password}
                  onChange={setPassword}
                />
                <AuthField
                  label="Επιβεβαίωση κωδικού"
                  type="password"
                  value={confirm}
                  onChange={setConfirm}
                />
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-xl">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-4 rounded-full bg-[#FDFFFC] text-[#056ef5] border-2 border-[#056ef5] font-black uppercase tracking-wider text-sm hover:bg-[#056ef5]/5 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? el.common.loading : "Αποθήκευση κωδικού"}
                </button>
              </form>
            </>
          )}
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
        className="mt-2 w-full bg-transparent border-0 border-b-2 border-ink/20 px-0 py-3 text-lg font-sans text-ink placeholder:text-ink/30 focus:outline-none focus:border-[#056ef5] transition-colors"
      />
    </label>
  );
}
