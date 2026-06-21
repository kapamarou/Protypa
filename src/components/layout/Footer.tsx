import Link from "next/link";
import Image from "next/image";
import { el } from "@/lib/i18n/el";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-[#056ef5] border-t border-white/10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14">
        <div className="grid md:grid-cols-3 gap-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="inline-block group">
              <Image src="/Logos/mainLogo.png" alt="PROTUPA.GR" width={184} height={32} className="h-8 w-auto group-hover:opacity-80 transition-opacity" />
            </Link>
            <p className="mt-4 text-sm text-paper max-w-sm leading-relaxed">
              {el.brand.tagline}. Πραγματικά θέματα, έξυπνη διόρθωση και
              αναλυτικά στατιστικά για κάθε μαθητή
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-[10px] font-bold tracking-[0.2em] uppercase text-paper mb-4">
              Χρήσιμοι σύνδεσμοι
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li><FooterLink href="/faq">{el.nav.faq}</FooterLink></li>
              <li><FooterLink href="/aporrito">{el.footer.privacy}</FooterLink></li>
              <li><FooterLink href="/oroi">{el.footer.terms}</FooterLink></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-paper">
          <div>
            © {year} {el.brand.name}. {el.footer.rights}
          </div>
          <div className="flex items-center gap-2">
            <span>Φτιάχτηκε με</span>
            <span className="text-[#c8ff00]">♥</span>
            <span>στην Ελλάδα</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="!text-white hover:!text-[#c8ff00] hover:translate-x-0.5 inline-block transition-all"
    >
      {children}
    </Link>
  );
}
