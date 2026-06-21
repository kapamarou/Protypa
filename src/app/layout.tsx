import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Chrome } from "@/components/layout/Chrome";
import Chatbot from "@/components/Chatbot";
import { el } from "@/lib/i18n/el";

const notoSans = Noto_Sans({
  variable: "--font-sans-greek",
  subsets: ["latin", "greek", "greek-ext"],
  weight: ["400", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: `${el.brand.name} · ${el.brand.tagline}`,
  description: el.home.heroSubtitle,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="el"
      className={`${notoSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[#056ef5] focus:text-white focus:text-sm focus:font-bold focus:shadow-lg"
        >
          Μετάβαση στο κύριο περιεχόμενο
        </a>
        <Chrome><Header /></Chrome>
        <main id="main-content" className="flex-1">{children}</main>
        <Chrome><Footer /></Chrome>
        <Chatbot />
      </body>
    </html>
  );
}
