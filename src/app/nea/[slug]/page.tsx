import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/seo";
import type { Post } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { title: "Άρθρο" };

  const now = new Date().toISOString();
  const { data } = await supabase
    .from("posts")
    .select("title, excerpt, cover_image_url, publish_at")
    .eq("slug", slug)
    .not("publish_at", "is", null)
    .lte("publish_at", now)
    .maybeSingle();

  if (!data) return { title: "Άρθρο" };
  const post = data as Post;
  const description = post.excerpt ?? `${el_title(post.title)} — Protupa`;
  const canonical = `/nea/${slug}`;

  return {
    title: post.title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: `${SITE_URL}${canonical}`,
      title: post.title,
      description,
      ...(post.publish_at ? { publishedTime: post.publish_at } : {}),
      images: post.cover_image_url
        ? [{ url: post.cover_image_url }]
        : undefined,
    },
  };
}

// Tiny helper to keep the description non-empty without leaking markup.
function el_title(t: string): string {
  return t.slice(0, 150);
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) notFound();

  const now = new Date().toISOString();
  const { data } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .not("publish_at", "is", null)
    .lte("publish_at", now)
    .maybeSingle();

  if (!data) notFound();
  const post = data as Post;

  const date = post.publish_at
    ? new Date(post.publish_at).toLocaleDateString("el-GR", { day: "numeric", month: "long", year: "numeric" })
    : "";

  const canonical = `${SITE_URL}/nea/${slug}`;
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: post.title,
    description: post.excerpt ?? undefined,
    image: post.cover_image_url ?? undefined,
    datePublished: post.publish_at ?? undefined,
    dateModified: post.updated_at ?? post.publish_at ?? undefined,
    inLanguage: "el",
    author: { "@type": "Organization", name: "Protupa" },
    publisher: {
      "@type": "Organization",
      name: "Protupa",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/Logos/mainLogo.png` },
    },
    mainEntityOfPage: canonical,
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Αρχική", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Νέα", item: `${SITE_URL}/nea` },
      { "@type": "ListItem", position: 3, name: post.title, item: canonical },
    ],
  };

  return (
    <div className="overflow-hidden bg-white">
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumbSchema} />
      <article className="mx-auto max-w-3xl px-4 sm:px-6 py-12 md:py-20">
        <Link href="/nea" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink/45 hover:text-ink transition-colors mb-8">
          ← Πίσω στα νέα
        </Link>

        <div className="flex items-center gap-3 mb-4">
          {post.tag && (
            <span className={`inline-flex px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${tagColors(post.tag).bg} ${tagColors(post.tag).text}`}>
              {post.tag}
            </span>
          )}
          <span className="text-xs text-ink/45 font-bold uppercase tracking-wider capitalize">{date}</span>
        </div>

        <h1 className="font-display text-3xl md:text-5xl leading-tight text-ink">{post.title}</h1>

        {post.excerpt && (
          <p className="mt-4 text-base md:text-lg text-ink/65 leading-relaxed">{post.excerpt}</p>
        )}

        {post.cover_image_url && (
          <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden mt-8">
            <Image
              src={post.cover_image_url}
              alt=""
              aria-hidden="true"
              fill
              style={{ objectFit: "cover" }}
              sizes="(max-width: 768px) 100vw, 800px"
              loading="lazy"
            />
          </div>
        )}

        <div className="mt-10 prose prose-lg max-w-none text-ink/80 leading-relaxed whitespace-pre-wrap">
          {post.body}
        </div>
      </article>
    </div>
  );
}

function tagColors(tag: string | null) {
  switch (tag) {
    case "Νέα Θέματα":   return { bg: "bg-[#056ef5]", text: "text-white" };
    case "Ανακοινώσεις": return { bg: "bg-[#7c00d0]", text: "text-white" };
    case "Στατιστικά":   return { bg: "bg-[#c8ff00]", text: "text-ink" };
    default:              return { bg: "bg-ink/10",    text: "text-ink/70" };
  }
}
