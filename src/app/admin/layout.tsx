import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/layout/SignOutButton";
import { AdminNavList, type AdminNavItem } from "./AdminNavList";
import { AdminMobileNav } from "./AdminMobileNav";

const NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "Πίνακας" },
  { href: "/admin/schools", label: "Φροντιστήρια" },
  { href: "/admin/parents", label: "Γονείς" },
  { href: "/admin/simulations", label: "Διαγωνίσματα" },
  { href: "/admin/news", label: "Νέα" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/signin");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) redirect("/account");

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      {/* Desktop sidebar — md and up */}
      <aside className="hidden md:flex md:flex-col w-56 lg:w-60 shrink-0 border-r border-white/10 sticky top-0 h-screen">
        <Link
          href="/admin"
          className="flex items-center gap-2 px-6 py-5 border-b border-white/10"
        >
          <img src="/Logos/mainLogo.png" alt="Protupa" className="h-6 w-auto" />
          <span className="text-[10px] font-black tracking-[0.2em] uppercase text-[#c8ff00]">
            Admin
          </span>
        </Link>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <AdminNavList items={NAV_ITEMS} />
        </nav>

        <div className="p-3 border-t border-white/10">
          <SignOutButton className="!text-white/90 hover:!text-white block w-full text-center px-3 py-2 rounded-lg border border-white/10 hover:border-white/30 text-xs font-semibold transition-colors" />
        </div>
      </aside>

      {/* Right column: mobile top bar + main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <AdminMobileNav items={NAV_ITEMS} />

        <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
