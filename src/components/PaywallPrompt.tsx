import Link from "next/link";

export function PaywallPrompt({ feature = "αυτή τη λειτουργία" }: { feature?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#056ef5]/10 grid place-items-center mb-5">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#056ef5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <h2 className="font-display text-2xl text-ink">Απαιτείται πακέτο</h2>
      <p className="mt-2 text-sm text-ink/55 max-w-sm">
        Χρειάζεστε ενεργό πακέτο για να χρησιμοποιήσετε {feature}.
      </p>
      <Link
        href="/paketa"
        className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#056ef5] text-white font-black text-sm uppercase tracking-wider hover:bg-[#0451b8] transition-colors"
      >
        Δείτε τα πακέτα →
      </Link>
    </div>
  );
}
