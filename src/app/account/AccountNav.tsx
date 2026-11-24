"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { el } from "@/lib/i18n/el";

export function AccountNav({ accountType = "school" }: { accountType?: "school" | "parent" }) {
  const path = usePathname();
  const isParent = accountType === "parent";
  return (
    <nav className="flex gap-0 mt-2 overflow-x-auto">
      <TabLink href="/account"           active={path === "/account"}>{el.account.dashboardTitle}</TabLink>
      <TabLink href="/account/students"  active={path.startsWith("/account/students")}>
        {isParent ? "Παιδιά" : "Μαθητές"}
      </TabLink>
      {!isParent && (
        <TabLink href="/account/school"    active={path.startsWith("/account/school")}>Φροντιστήριο</TabLink>
      )}
      <TabLink href="/account/grading"   active={path.startsWith("/account/grading")}>Διαγωνίσματα</TabLink>
      {isParent && <TabLink href="/account/receipts" active={path.startsWith("/account/receipts")}>Αποδείξεις</TabLink>}
      <TabLink href="/account/profile"   active={path.startsWith("/account/profile")}>Προφίλ</TabLink>
    </nav>
  );
}

function TabLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`px-4 py-3 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
        active
          ? "border-[#c8ff00] !text-white"
          : "border-transparent !text-white hover:border-white/30"
      }`}
    >
      {children}
    </Link>
  );
}
