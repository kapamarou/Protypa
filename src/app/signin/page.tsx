"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { el } from "@/lib/i18n/el";
import Image from "next/image";

function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const explicitNext = params.get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    params.get("error") === "auth" ? "Ο σύνδεσμος επιβεβαίωσης έληξε. Δοκιμάστε ξανά." : null
  );
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="space-y-7"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        const supabase = createSupabaseBrowserClient();
        const { data: { user }, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { setError(error.message); setLoading(false); return; }

        // Route admins to /admin, customers to /account.
        // If a specific ?next= URL was passed (e.g. deep link), honour it.
        let destination = explicitNext ?? "/account";
        if (!explicitNext && user) {
          const { data: profile } = await supabase
            .from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
          if (profile?.is_admin) destination = "/admin";
        }
        setLoading(false);
        router.push(destination);
        router.refresh();
      }}
    >
      <AuthField label={el.auth.email} type="email" value={email} onChange={setEmail} />
      <AuthField label={el.auth.password} type="password" value={password} onChange={setPassword} />
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-xl">{error}</div>
      )}
      <div className="text-right -mt-4">
        <Link href="/forgot-password" className="text-xs text-ink/40 hover:text-[#056ef5] transition-colors">
          Ξεχάσατε τον κωδικό;
        </Link>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full px-6 py-4 rounded-full bg-[#FDFFFC] text-[#056ef5] border-2 border-[#056ef5] font-black uppercase tracking-wider text-sm hover:bg-[#056ef5]/5 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 cursor-pointer"
      >
        {loading ? el.common.loading : el.auth.signinButton}
      </button>
    </form>
  );
}

export default function SignInPage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] grid md:grid-cols-[1fr_1.1fr]">
      {/* Left brand panel */}
      <div className="hidden md:flex flex-col justify-between p-10 relative overflow-hidden">
        <Image
          src="/auth-welcome.jpg"
          alt=""
          aria-hidden="true"
          fill
          style={{ objectFit: "cover" }}
          sizes="50vw"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#7c00d0]/85 via-[#7c00d0]/70 to-[#7c00d0]/95 mix-blend-multiply" />
        <div />
        <div className="relative z-10">
          <h2 className="font-display text-5xl text-white leading-tight">
            Καλώς ήρθατε<br />
            <span className="text-[#c8ff00]">ξανά</span>
          </h2>
          <p className="mt-4 text-white/80 text-sm max-w-xs leading-relaxed">
            Συνδεθείτε για να αποκτήσετε πρόσβαση στα διαθέσιμα θέματα και το ιστορικό διορθώσεων σας.
          </p>
        </div>
        <div className="relative z-10 text-white/50 text-xs">© {new Date().getFullYear()} Protupa</div>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center px-6 py-14 bg-white">
        <div className="w-full max-w-sm">
          <div className="mb-10">
            <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-ink/40 mb-2">Σύνδεση</div>
            <h1 className="font-display text-3xl md:text-4xl text-ink">{el.auth.signinTitle}</h1>
          </div>
          <Suspense fallback={null}>
            <SignInForm />
          </Suspense>
          <p className="mt-10 text-sm text-ink/50 text-center">
            {el.auth.noAccount}{" "}
            <Link href="/signup" className="text-[#056ef5] font-bold hover:text-[#7c00d0] transition-colors">
              {el.auth.signupLink}
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
        className="mt-2 w-full bg-transparent border-0 border-b-2 border-ink/20 px-0 py-3 text-lg font-display text-ink placeholder:text-ink/30 focus:outline-none focus:border-[#056ef5] transition-colors"
      />
    </label>
  );
}
