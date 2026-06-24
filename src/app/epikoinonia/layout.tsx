import type { Metadata } from "next";

// The contact page is a client component, so its metadata lives in this layout.
export const metadata: Metadata = {
  title: "Επικοινωνία",
  description:
    "Επικοινωνήστε με την ομάδα του Protupa για ερωτήσεις σχετικά με τα πακέτα, την πλατφόρμα ή τη συνεργασία με το φροντιστήριό σας.",
  alternates: { canonical: "/epikoinonia" },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
