import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AccountNav } from "./AccountNav";

// Private area — keep it out of search indexes (also blocked in robots.ts).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 bg-white">
        <div className="max-w-md text-center">
          <div className="font-display text-6xl text-[#056ef5]/20">!</div>
          <h1 className="mt-4 font-display text-2xl text-ink">Η εφαρμογή δεν έχει ρυθμιστεί</h1>
          <p className="mt-3 text-ink/50 text-sm leading-relaxed">
            Συμπληρώστε τα κλειδιά Supabase στο αρχείο{" "}
            <code className="text-[#056ef5]">.env.local</code> και επανεκκινήστε τον server.
          </p>
        </div>
      </div>
    );
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/signin?next=/account");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, is_admin, onboarding_complete, account_type")
    .eq("id", user.id)
    .maybeSingle();

  const incomplete = !profile?.onboarding_complete;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-white">
      {/* Account header */}
      <div className="bg-[#056ef5] border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-1.5 h-4 bg-[#c8ff00] flex-shrink-0" />
              <span className="text-xs font-black uppercase tracking-wider text-white">Πίνακας Ελέγχου</span>
              {profile?.full_name && (
                <span className="text-xs text-white/50 truncate hidden sm:inline">· {profile.full_name}</span>
              )}
            </div>
            {profile?.is_admin && (
              <Link href="/admin"
                className="flex-shrink-0 text-xs font-black uppercase tracking-wider text-[#c8ff00] hover:text-white transition-colors border border-[#c8ff00]/40 hover:border-white/40 px-3 py-1.5 rounded-full">
                Admin Panel →
              </Link>
            )}
          </div>
          <AccountNav accountType={profile?.account_type === "parent" ? "parent" : "school"} />
        </div>
      </div>

      {/* Profile completion banner */}
      {incomplete && (
        <div className="bg-[#7c00d0] border-b border-[#7c00d0]/50">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <p className="text-sm text-white/80">
              <span className="font-bold text-[#c8ff00]">Συμπληρώστε το προφίλ σας</span>
              {" "}— Χρειαζόμαστε τα στοιχεία του φροντιστηρίου σας για να μπορούν να εκδοθούν παραστατικά.
            </p>
            <Link href="/account/profile"
              className="flex-shrink-0 text-xs font-black uppercase tracking-wider text-[#7c00d0] bg-white hover:bg-white/90 px-3 py-1.5 rounded-full transition-colors">
              Συμπλήρωση →
            </Link>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 md:py-10" translate="no">
        <div className="account-card">
          {children}
        </div>
      </div>
    </div>
  );
}
