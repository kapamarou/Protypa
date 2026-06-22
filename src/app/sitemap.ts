import type { MetadataRoute } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/paketa`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/nea`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/sxetika`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/epikoinonia`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/oroi`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/aporrito`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Published news posts.
  const supabase = await createSupabaseServerClient();
  let postRoutes: MetadataRoute.Sitemap = [];
  if (supabase) {
    const iso = now.toISOString();
    const { data: posts } = await supabase
      .from("posts")
      .select("slug, updated_at, publish_at")
      .not("publish_at", "is", null)
      .lte("publish_at", iso)
      .order("publish_at", { ascending: false })
      .limit(2000);

    postRoutes = (posts ?? []).map((p) => ({
      url: `${SITE_URL}/nea/${p.slug}`,
      lastModified: new Date(p.updated_at ?? p.publish_at),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  }

  return [...staticRoutes, ...postRoutes];
}
