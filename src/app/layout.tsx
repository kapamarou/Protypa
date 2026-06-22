import type { Metadata, Viewport } from "next";
import { Noto_Sans } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Chrome } from "@/components/layout/Chrome";
import { ChatbotLoader } from "@/components/ChatbotLoader";
import { JsonLd } from "@/components/JsonLd";
import { el } from "@/lib/i18n/el";
import { SITE_URL, OG_IMAGE } from "@/lib/seo";

const notoSans = Noto_Sans({
  variable: "--font-sans-greek",
  subsets: ["latin", "greek", "greek-ext"],
  weight: ["400", "700", "900"],
  display: "swap",
});

const SITE_TITLE = `${el.brand.name} · ${el.brand.tagline}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: `%s | ${el.brand.name}`,
    default: SITE_TITLE,
  },
  description: el.home.heroSubtitle,
  applicationName: el.brand.name,
  keywords: [
    "πρότυπα σχολεία",
    "προετοιμασία",
    "διαγωνίσματα προσομοίωσης",
    "φροντιστήριο",
    "εξετάσεις εισαγωγής",
    "Ωνάσεια",
    "Εκκλησιαστικά",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "el_GR",
    url: SITE_URL,
    siteName: el.brand.name,
    title: SITE_TITLE,
    description: el.home.heroSubtitle,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: el.brand.tagline }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: el.home.heroSubtitle,
    images: [OG_IMAGE],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#056ef5",
};

const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: el.brand.name,
  alternateName: "Πρότυπα",
  url: SITE_URL,
  logo: `${SITE_URL}/Logos/mainLogo.png`,
  description: el.home.heroSubtitle,
  areaServed: "GR",
  email: "info@protupa.gr",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="el"
      // Browser extensions (Google Translate, dark-mode, Grammarly) rewrite the
      // <html> element before React hydrates — e.g. flipping lang="el" to "en" —
      // which logs a hydration mismatch. This flag is SHALLOW: it silences only
      // mismatches on <html>'s own attributes, NOT real hydration bugs in the page.
      suppressHydrationWarning
      className={`${notoSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <JsonLd data={ORGANIZATION_SCHEMA} />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[#056ef5] focus:text-white focus:text-sm focus:font-bold focus:shadow-lg"
        >
          Μετάβαση στο κύριο περιεχόμενο
        </a>
        <Chrome><Header /></Chrome>
        <main id="main-content" className="flex-1">{children}</main>
        <Chrome><Footer /></Chrome>
        <ChatbotLoader />
      </body>
    </html>
  );
}
