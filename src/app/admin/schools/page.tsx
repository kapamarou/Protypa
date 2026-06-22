import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminSchoolsPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: schools } = await supabase
    .from("schools")
    .select(`
      id, trade_name, legal_name, city, region, phone, afm, subjects,
      created_at, terms_accepted_at,
      profiles(full_name, onboarding_complete)
    `)
    .order("created_at", { ascending: false })
    .limit(2000); // F4: bound the query; add cursor UI if schools exceed this.

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/80 mb-2">Admin</div>
        <h1 className="font-display text-3xl text-white">Φροντιστήρια</h1>
        <p className="mt-1 text-sm text-white">{schools?.length ?? 0} εγγεγραμμένα</p>
      </div>

      {!schools || schools.length === 0 ? (
        <div className="rounded-2xl border border-white/10 p-12 text-center">
          <p className="text-white/80 text-sm">Δεν υπάρχουν φροντιστήρια ακόμα.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                {["Φροντιστήριο", "Τοποθεσία", "ΑΦΜ", "Μαθήματα", "Κατάσταση", "Εγγραφή", ""].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] font-bold tracking-wider uppercase text-white/80 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schools.map((s, i) => {
                const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles as { full_name: string | null; onboarding_complete: boolean } | null;
                const complete = profile?.onboarding_complete ?? false;
                return (
                  <tr key={s.id} className={`border-b border-white/5 ${i % 2 === 0 ? "bg-white/[0.015]" : ""}`}>
                    <td className="px-5 py-4">
                      <div className="font-medium text-white">{s.trade_name ?? s.legal_name ?? "—"}</div>
                      {s.legal_name && s.trade_name && (
                        <div className="text-xs text-white/80 mt-0.5">{s.legal_name}</div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-white">{[s.city, s.region].filter(Boolean).join(", ") || "—"}</td>
                    <td className="px-5 py-4 text-white font-mono text-xs">{s.afm ?? "—"}</td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {(s.subjects as string[]).map((sub) => (
                          <span key={sub} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#056ef5]/20 text-[#056ef5]">
                            {sub === "greek" ? "Γλώσσα" : sub === "math" ? "Μαθηματικά" : sub}
                          </span>
                        ))}
                        {(s.subjects as string[]).length === 0 && <span className="text-white/80">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        complete
                          ? "bg-green-500/15 text-green-400"
                          : "bg-yellow-500/15 text-yellow-400"
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {complete ? "Ολοκληρωμένο" : "Εκκρεμεί"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-white/80 text-xs">
                      {new Date(s.created_at).toLocaleDateString("el-GR")}
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/schools/${s.id}`}
                        className="text-xs font-bold text-[#056ef5] hover:text-[#c8ff00] transition-colors"
                      >
                        Προβολή →
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
