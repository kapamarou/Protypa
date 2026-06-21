import Link from "next/link";
import Image from "next/image";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Post } from "@/lib/types";

const CATEGORIES = ["Όλα", "Νέα Θέματα", "Ανακοινώσεις", "Στατιστικά"] as const;

export const revalidate = 60;

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const sp = await searchParams;
  const activeFilter = sp.tag && CATEGORIES.includes(sp.tag as (typeof CATEGORIES)[number])
    ? (sp.tag as (typeof CATEGORIES)[number])
    : "Όλα";

  const supabase = await createSupabaseServerClient();
  let posts: Post[] = [];
  if (supabase) {
    const now = new Date().toISOString();
    let query = supabase
      .from("posts")
      .select("*")
      .not("publish_at", "is", null)
      .lte("publish_at", now)
      .order("publish_at", { ascending: false });
    if (activeFilter !== "Όλα") query = query.eq("tag", activeFilter);
    const { data } = await query;
    posts = (data as Post[]) ?? [];
  }

  return (
    <div className="overflow-hidden">
      <Hero />
      <section className="relative bg-white py-12 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-14">

            {/* Sidebar */}
            <aside className="lg:col-span-3">
              <div className="lg:sticky lg:top-24">
                <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-ink/50 mb-5">
                  Φίλτρα
                </div>
                <ul className="space-y-1">
                  {CATEGORIES.map((label) => (
                    <li key={label}>
                      <Link
                        href={label === "Όλα" ? "/nea" : `/nea?tag=${encodeURIComponent(label)}`}
                        className={`block w-full text-left px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                          activeFilter === label
                            ? "bg-[#056ef5] text-white"
                            : "text-ink/50 hover:text-ink hover:bg-ink/5"
                        }`}
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>

            {/* Cards */}
            <div className="lg:col-span-9 space-y-5">
              {posts.length === 0 ? (
                <div className="rounded-3xl border-2 border-dashed border-ink/15 p-12 text-center">
                  <p className="text-ink/40 text-sm font-bold uppercase tracking-wider">
                    {activeFilter === "Όλα"
                      ? "Δεν υπάρχουν ακόμα ανακοινώσεις"
                      : "Δεν υπάρχουν ανακοινώσεις σε αυτή την κατηγορία"}
                  </p>
                </div>
              ) : (
                posts.map((post) => <PostCard key={post.id} post={post} />)
              )}

              <div className="rounded-3xl border border-dashed border-ink/15 p-8 text-center">
                <p className="text-ink/40 text-xs font-bold uppercase tracking-wider">
                  Περισσότερες ανακοινώσεις σύντομα
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Cta />
    </div>
  );
}

function PostCard({ post }: { post: Post }) {
  const tagStyle = tagColors(post.tag);
  const date = post.publish_at
    ? new Date(post.publish_at).toLocaleDateString("el-GR", { month: "long", year: "numeric" })
    : "";

  return (
    <Link href={`/nea/${post.slug}`} className="block group rounded-3xl border border-ink/10 p-7 md:p-9 hover:border-[#056ef5]/30 hover:shadow-lg transition-all">
      {post.cover_image_url && (
        <div className="relative w-full aspect-[16/7] rounded-2xl overflow-hidden mb-5">
          <Image
            src={post.cover_image_url}
            alt=""
            aria-hidden="true"
            fill
            style={{ objectFit: "cover" }}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            loading="lazy"
          />
        </div>
      )}
      <div className="flex items-center gap-3 mb-4">
        {post.tag && (
          <span className={`inline-flex px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${tagStyle.bg} ${tagStyle.text}`}>
            {post.tag}
          </span>
        )}
        <span className="text-xs text-ink/40 font-bold uppercase tracking-wider capitalize">
          {date}
        </span>
      </div>
      <h2 className="font-display text-2xl md:text-3xl leading-tight text-ink group-hover:text-[#056ef5] transition-colors">
        {post.title}
      </h2>
      {post.excerpt && (
        <p className="mt-3 text-sm text-ink/70 leading-relaxed max-w-2xl">{post.excerpt}</p>
      )}
      <div className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#056ef5]">
        Διαβάστε περισσότερα
        <svg className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

function tagColors(tag: string | null) {
  switch (tag) {
    case "Νέα Θέματα":    return { bg: "bg-[#056ef5]", text: "text-white" };
    case "Ανακοινώσεις":  return { bg: "bg-[#7c00d0]", text: "text-white" };
    case "Στατιστικά":    return { bg: "bg-[#c8ff00]", text: "text-ink" };
    default:               return { bg: "bg-ink/10",    text: "text-ink/70" };
  }
}

function Hero() {
  return (
    <section
      className="relative pt-12 pb-16 md:pt-18 md:pb-20 clip-x overflow-hidden"
      style={{ backgroundImage: "url(/HeroPage.jpg)", backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <div className="absolute inset-0 bg-[#056ef5]/85" />
      <img src="/TransparentAssets/Asset 21.png" alt="" aria-hidden="true" className="pointer-events-none select-none absolute top-6 right-8 w-28 md:w-44 opacity-70 rotate-6 hidden sm:block" />
      <img src="/TransparentAssets/Asset 23.png" alt="" aria-hidden="true" className="pointer-events-none select-none absolute bottom-4 right-[30%] w-20 md:w-32 opacity-60 -rotate-12 hidden md:block" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/70 mb-4">
          Ενημερωθείτε πρώτοι
        </div>
        <h1 className="font-display text-[clamp(2.5rem,7vw,6rem)] leading-none text-white">
          Νέα &amp;
          <br />
          <span className="text-[#c8ff00]">Ανακοινώσεις</span>
        </h1>
        <p className="mt-6 max-w-xl text-base md:text-lg text-white/80 leading-relaxed">
          Εδώ θα βρείτε όλες τις νέες δημοσιεύσεις θεμάτων, στατιστικές αναλύσεις και ενημερώσεις για τα πακέτα μας.
        </p>
      </div>
    </section>
  );
}

function Cta() {
  return (
    <section className="relative bg-[#7c00d0] py-12 md:py-20 overflow-hidden">
      <div className="hidden sm:block pointer-events-none absolute -top-40 -right-40 w-[36rem] h-[36rem] rounded-full bg-[#056ef5]/20 blur-3xl" />
      <img src="/TransparentAssets/Asset 19.png" alt="" aria-hidden="true" className="pointer-events-none select-none absolute bottom-6 right-8 w-28 md:w-40 opacity-60 rotate-6 hidden sm:block" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#c8ff00] mb-4">
            Δείτε τι προσφέρουμε
          </div>
          <h2 className="font-display text-4xl md:text-5xl leading-none text-white">
            Έτοιμοι να ξεκινήσετε;
          </h2>
          <p className="mt-4 text-base text-white/80 max-w-lg leading-relaxed">
            Εξερευνήστε τα πακέτα μας και δείτε πώς η Protupa μπορεί να βοηθήσει τους μαθητές σας να ξεχωρίσουν.
          </p>
          <div className="mt-8 flex items-center gap-3 flex-wrap">
            <Link
              href="/paketa"
              className="group inline-flex items-center gap-2 px-7 py-4 rounded-full bg-[#FDFFFC] text-[#056ef5] border-2 border-[#056ef5] font-black uppercase tracking-wider text-sm hover:bg-[#056ef5]/5 hover:-translate-y-0.5 transition-all"
            >
              Δείτε τα πακέτα
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/epikoinonia"
              className="group inline-flex items-center gap-2 px-7 py-4 rounded-full bg-[#FDFFFC] text-[#7c00d0] border-2 border-[#7c00d0] font-black uppercase tracking-wider text-sm hover:bg-[#7c00d0]/5 hover:-translate-y-0.5 transition-all"
            >
              Επικοινωνήστε μαζί μας
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
