import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep private/authed surfaces and API/download routes out of the index.
        disallow: [
          "/account",
          "/admin",
          "/api",
          "/grade",
          "/signin",
          "/signup",
          "/forgot-password",
          "/reset-password",
          "/onboarding",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
