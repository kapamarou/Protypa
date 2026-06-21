import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Post } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminNewsPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("posts")
    .select("*")
    .order("publish_at", { ascending: false, nullsFirst: true })
    .order("created_at", { ascending: false });

  const posts = (data as Post[]) ?? [];
  const now = Date.now();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/80 mb-2">Admin</div>
          <h1 className="font-display text-3xl text-white">Νέα &amp; Ανακοινώσεις</h1>
          <p className="mt-1 text-sm text-white/55">{posts.length} {posts.length === 1 ? "άρθρο" : "άρθρα"}</p>
        </div>
        <Link
          href="/admin/news/new"
          className="px-5 py-2.5 rounded-full bg-[#056ef5] text-white font-black uppercase tracking-wider text-xs hover:bg-[#0451b8] transition-all cursor-pointer"
        >
          + Νέο άρθρο
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-white/10 p-12 text-center">
          <p className="text-white text-sm">Δεν υπάρχουν άρθρα ακόμα.</p>
          <Link href="/admin/news/new" className="inline-block mt-3 text-xs font-bold text-[#c8ff00] hover:text-white transition-colors">
            Δημιουργία πρώτου άρθρου →
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-wider text-white/45">Τίτλος</th>
                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-wider text-white/45 hidden md:table-cell">Κατηγορία</th>
                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-wider text-white/45 hidden sm:table-cell">Δημοσίευση</th>
                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-wider text-white/45">Κατάσταση</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {posts.map((p) => {
                const publishMs = p.publish_at ? new Date(p.publish_at).getTime() : null;
                const state: "draft" | "scheduled" | "live" =
                  publishMs === null ? "draft" : publishMs > now ? "scheduled" : "live";

                return (
                  <tr key={p.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-sm text-white">{p.title}</div>
                      <div className="text-[10px] text-white mt-0.5">/{p.slug}</div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-white/55">{p.tag ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {p.publish_at ? (
                        <span className="text-xs text-white/55 tabular">
                          {new Date(p.publish_at).toLocaleDateString("el-GR", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      ) : (
                        <span className="text-xs text-white/80">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StateBadge state={state} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/news/${p.id}/edit`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#056ef5] hover:bg-[#0451b8] text-white text-[10px] font-black uppercase tracking-wider transition-colors"
                      >
                        Επεξεργασία →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StateBadge({ state }: { state: "draft" | "scheduled" | "live" }) {
  if (state === "live") return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-green-300 bg-green-500/10 border border-green-500/30 px-2.5 py-1 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Δημοσιευμένο
    </span>
  );
  if (state === "scheduled") return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Προγραμματισμένο
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-white/45 bg-white/5 border border-white/15 px-2.5 py-1 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-white/40" /> Πρόχειρο
    </span>
  );
}
