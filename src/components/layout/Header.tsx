import Link from "next/link";
import Image from "next/image";
import { el } from "@/lib/i18n/el";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SignOutButton } from "./SignOutButton";
import { MobileNav } from "./MobileNav";

export async function Header() {
  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  return (
    <header className="sticky top-0 z-30 bg-brand border-b border-white/10">
      <div className="mx-auto max-w-7xl flex items-center justify-between px-4 sm:px-6 h-14 md:h-16">
        {/* Logo */}
        <Link href="/" className="group flex items-center">
          <Image src="/Logos/mainLogo.png" alt="PROTUPA.GR" width={184} height={32} className="h-7 md:h-8 w-auto group-hover:opacity-80 transition-opacity" preload={true} />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          <NavLink href="/">{el.nav.home}</NavLink>
          <NavLink href="/paketa">{el.nav.packages}</NavLink>
          <NavLink href="/sxetika">{el.nav.about}</NavLink>
          <NavLink href="/nea">{el.nav.news}</NavLink>
          <NavLink href="/faq">FAQ</NavLink>
          <NavLink href="/epikoinonia">{el.nav.contact}</NavLink>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                href="/account"
                className="hidden md:inline-flex px-4 py-2 font-bold uppercase tracking-wider text-xs transition-opacity hover:opacity-70"
                style={{ color: "#ffffff" }}
              >
                {el.nav.account}
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link
                href="/signin"
                className="hidden md:inline-flex px-4 py-2 font-bold uppercase tracking-wider text-xs transition-opacity hover:opacity-70"
                style={{ color: "#ffffff" }}
              >
                {el.nav.signin}
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center px-4 py-2 rounded-md bg-[#FDFFFC] text-[#056ef5] border-2 border-[#c8ff00] font-black uppercase tracking-widest text-xs hover:bg-[#c8ff00]/10 hover:-translate-y-0.5 transition-all"
              >
                {el.nav.signup}
              </Link>
            </>
          )}
          <MobileNav />
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="px-3 py-2 font-bold uppercase tracking-wider text-xs transition-opacity hover:opacity-70"
      style={{ color: "#ffffff" }}
    >
      {children}
    </Link>
  );
}
