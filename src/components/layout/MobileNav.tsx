"use client";
import { useState } from "react";
import Link from "next/link";
import { el } from "@/lib/i18n/el";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden site-header-mobile-toggle">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 cursor-pointer transition-opacity hover:opacity-70"
        style={{ color: "#ffffff" }}
        aria-label="Menu"
      >
        {open ? (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute top-14 md:top-16 left-0 right-0 bg-brand-dark border-b border-white/10 shadow-2xl z-40 px-4 py-6">
          <nav className="flex flex-col gap-1">
            <MobileLink href="/" onClick={() => setOpen(false)}>{el.nav.home}</MobileLink>
            <MobileLink href="/paketa" onClick={() => setOpen(false)}>{el.nav.packages}</MobileLink>
            <MobileLink href="/sxetika" onClick={() => setOpen(false)}>{el.nav.about}</MobileLink>
            <MobileLink href="/nea" onClick={() => setOpen(false)}>{el.nav.news}</MobileLink>
            <MobileLink href="/faq" onClick={() => setOpen(false)}>FAQ</MobileLink>
            <MobileLink href="/epikoinonia" onClick={() => setOpen(false)}>{el.nav.contact}</MobileLink>
            <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-2">
              <MobileLink href="/signin" onClick={() => setOpen(false)}>{el.nav.signin}</MobileLink>
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center px-4 py-3 rounded-md bg-[#FDFFFC] text-[#056ef5] border-2 border-[#c8ff00] font-black uppercase tracking-widest text-xs hover:bg-[#c8ff00]/10 transition-all"
              >
                {el.nav.signup}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}

function MobileLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="px-3 py-3 rounded-xl font-bold uppercase tracking-wider text-sm transition-opacity hover:opacity-70"
      style={{ color: "#ffffff" }}
    >
      {children}
    </Link>
  );
}
