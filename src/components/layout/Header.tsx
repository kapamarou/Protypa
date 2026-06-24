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
    // containerType="inline-size" enables container queries so the hamburger/desktop-nav
    // toggle responds to the header's own width rather than the CSS viewport — fixes
    // environments where window resize doesn't update the CSS viewport (some browser
    // extensions). The Tailwind md: classes remain as a standard-browser fallback.
    <header
      className="sticky top-0 z-30 bg-brand border-b border-white/10"
      style={{ containerType: "inline-size", containerName: "site-header" }}
    >
      <div className="mx-auto max-w-7xl flex items-center justify-between px-4 sm:px-6 h-14 md:h-16">
        {/* Logo */}
        <Link href="/" className="group flex items-center">
          <Image src="/Logos/mainLogo.png" alt="PROTUPA.GR" width={184} height={32} loading="eager" className="h-7 md:h-8 w-auto group-hover:opacity-80 transition-opacity" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 site-header-desktop-nav">
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
      className="inline-flex items-center min-h-[44px] px-3 font-bold uppercase tracking-wider text-xs transition-opacity hover:opacity-70"
      style={{ color: "#ffffff" }}
    >
      {children}
    </Link>
  );
}
