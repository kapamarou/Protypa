import type { MetadataRoute } from "next";
import { el } from "@/lib/i18n/el";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${el.brand.name} · ${el.brand.tagline}`,
    short_name: el.brand.name,
    description: el.home.heroSubtitle,
    start_url: "/",
    display: "standalone",
    background_color: "#FDFFFC",
    theme_color: "#056ef5",
    lang: "el",
    categories: ["education", "productivity"],
    icons: [
      { src: "/Logos/mainLogo.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
