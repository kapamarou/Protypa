"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { el } from "@/lib/i18n/el";

export function BuyButton({
  packageId,
  signedIn,
  purchasable = true,
  buttonClass = "bg-accent-purple text-white hover:bg-[#6500b0]",
}: {
  packageId: string;
  signedIn: boolean;
  purchasable?: boolean;
  buttonClass?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  if (!purchasable) {
    return (
      <button
        type="button"
        disabled
        aria-disabled="true"
        className={`group w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full font-semibold cursor-not-allowed opacity-60 ${buttonClass}`}
      >
        Διαθέσιμο σύντομα
      </button>
    );
  }

  if (!signedIn) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowAuthPrompt((v) => !v)}
          className={`group w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full font-semibold shadow-lg shadow-slate-900/10 hover:-translate-y-0.5 hover:shadow-xl transition-all cursor-pointer ${buttonClass}`}
        >
          Αποκτήστε πρόσβαση
          <Arrow />
        </button>

        {showAuthPrompt && (
          <div className="absolute bottom-full mb-3 left-0 right-0 z-50 bg-white rounded-2xl shadow-2xl border border-ink/10 p-4 text-ink">
            <p className="text-sm font-semibold text-center mb-3">
              Χρειάζεστε λογαριασμό για να συνεχίσετε
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href="/signup"
                className="w-full inline-flex items-center justify-center px-5 py-3 rounded-full bg-[#056ef5] text-white font-black text-sm uppercase tracking-wider hover:bg-[#0451b8] transition-colors"
              >
                Δημιουργία λογαριασμού
              </Link>
              <Link
                href={`/signin?next=/paketa`}
                className="w-full inline-flex items-center justify-center px-5 py-3 rounded-full border-2 border-ink/20 text-ink font-bold text-sm hover:border-ink/40 transition-colors"
              >
                Σύνδεση
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          const res = await fetch("/api/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ package_id: packageId }),
          });
          const data = await res.json();
          if (data.url) window.location.href = data.url;
          else alert(data.error ?? el.auth.error);
        } finally {
          setLoading(false);
        }
      }}
      className={`group w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full font-semibold shadow-lg shadow-slate-900/10 hover:-translate-y-0.5 hover:shadow-xl transition-all disabled:opacity-50 disabled:hover:translate-y-0 cursor-pointer ${buttonClass}`}
    >
      {loading ? el.common.loading : el.packages.buy}
      {!loading && <Arrow />}
    </button>
  );
}

function Arrow() {
  return (
    <svg
      className="w-4 h-4 group-hover:translate-x-1 transition-transform"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}
