import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface ParentRow {
  id: string;
  full_name: string | null;
  created_at: string;
  onboarding_complete: boolean;
  purchases: {
    expires_at: string;
    packages: { name_el: string; package_type: string } | null;
  }[];
}

export default async function AdminParentsPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: parents } = await supabase
    .from("profiles")
    .select(`
      id, full_name, created_at, onboarding_complete,
      purchases(expires_at, packages(name_el, package_type))
    `)
    .eq("account_type", "parent")
    .order("created_at", { ascending: false });

  // Fetch emails via service role (auth.users is not accessible otherwise).
  let emailMap: Record<string, string> = {};
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createSupabaseServiceClient();
    const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 });
    for (const u of users ?? []) emailMap[u.id] = u.email ?? "";
  }

  const rows = (parents as unknown as ParentRow[]) ?? [];
  const now = new Date().toISOString();

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/80 mb-2">Admin</div>
        <h1 className="font-display text-3xl text-white">Γονείς</h1>
        <p className="mt-1 text-sm text-white/55">{rows.length} {rows.length === 1 ? "εγγεγραμμένος" : "εγγεγραμμένοι"}</p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-white/10 p-12 text-center">
          <p className="text-white/80 text-sm">Δεν υπάρχουν εγγεγραμμένοι γονείς ακόμα.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                {["Γονέας", "Email", "Πακέτο", "Λήξη", "Εγγραφή"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] font-bold tracking-wider uppercase text-white/45 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((p, i) => {
                const activePurchases = p.purchases?.filter(
                  (pu) => pu.packages?.package_type === "parent" && pu.expires_at > now
                ) ?? [];
                const activePkg = activePurchases[0] ?? null;

                return (
                  <tr key={p.id} className={i % 2 === 0 ? "bg-white/[0.015]" : ""}>
                    <td className="px-5 py-4">
                      <div className="font-medium text-white">{p.full_name ?? "—"}</div>
                    </td>
                    <td className="px-5 py-4 text-white/55 text-xs font-mono">
                      {emailMap[p.id] ?? "—"}
                    </td>
                    <td className="px-5 py-4">
                      {activePkg ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-green-500/15 text-green-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                          {activePkg.packages?.name_el ?? "Πακέτο γονέα"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/5 text-white/35">
                          <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                          Χωρίς πακέτο
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-white/55 text-xs">
                      {activePkg
                        ? new Date(activePkg.expires_at).toLocaleDateString("el-GR", { day: "2-digit", month: "short", year: "numeric" })
                        : "—"}
                    </td>
                    <td className="px-5 py-4 text-white/55 text-xs">
                      {new Date(p.created_at).toLocaleDateString("el-GR", { day: "2-digit", month: "short", year: "numeric" })}
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
