"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/layout/SignOutButton";
import { AdminNavList, type AdminNavItem } from "./AdminNavList";

export function AdminMobileNav({ items }: { items: AdminNavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Auto-close drawer after a route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open
  useEffect(() => {
    if (open) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [open]);

  return (
    <>
      {/* Mobile top bar — only shown below md breakpoint */}
      <header className="md:hidden sticky top-0 z-30 bg-[#0a0a0f] border-b border-white/10 admin-mobile-bar">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            type="button"
            aria-label="Άνοιγμα μενού"
            onClick={() => setOpen(true)}
            className="-ml-2 p-2 text-white/80 hover:text-white"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <Link href="/admin" className="flex items-center gap-2">
            <img src="/Logos/mainLogo.png" alt="Protupa" className="h-5 w-auto" />
            <span className="text-[9px] font-black tracking-[0.2em] uppercase text-[#c8ff00]">
              Admin
            </span>
          </Link>

          <SignOutButton className="!text-white/70 hover:!text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-white/30 transition-colors" />
        </div>
      </header>

      {/* Drawer overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
          aria-label="Μενού διαχείρισης"
        >
          <button
            type="button"
            aria-label="Κλείσιμο μενού"
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-default"
          />
          <aside
            className="relative w-72 max-w-[85vw] bg-[#0a0a0f] border-r border-white/10 flex flex-col"
            style={{ animation: "admin-drawer-in 220ms cubic-bezier(0.16,1,0.3,1)" }}
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2"
              >
                <img src="/Logos/mainLogo.png" alt="Protupa" className="h-6 w-auto" />
                <span className="text-[10px] font-black tracking-[0.2em] uppercase text-[#c8ff00]">
                  Admin
                </span>
              </Link>
              <button
                type="button"
                aria-label="Κλείσιμο μενού"
                onClick={() => setOpen(false)}
                className="p-2 -mr-2 text-white/60 hover:text-white"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 px-3 py-4 overflow-y-auto">
              <AdminNavList items={items} onSelect={() => setOpen(false)} />
            </nav>

            <div className="p-3 border-t border-white/10">
              <SignOutButton className="!text-white/90 hover:!text-white block w-full text-center px-3 py-2 rounded-lg border border-white/10 hover:border-white/30 text-xs font-semibold transition-colors" />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
