import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminParentsPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: parents, error } = await supabase
    .from("profiles")
    .select("id, full_name, created_at, onboarding_complete")
    .eq("account_type", "parent")
    .order("created_at", { ascending: false })
    .limit(2000); // F4: bound the query; add cursor UI if parents exceed this.

  // Fetch purchases + packages separately — avoids PostgREST implicit-FK join.
  type PurchaseRow = { user_id: string; expires_at: string; packages: { name_el: string; package_type: string } | null };
  let purchaseMap: Record<string, PurchaseRow[]> = {};
  if (parents && parents.length > 0) {
    const { data: purchases } = await supabase
      .from("purchases")
      .select("user_id, expires_at, packages(name_el, package_type)")
      .in("user_id", parents.map((p) => p.id));
    for (const pu of (purchases ?? []) as unknown as PurchaseRow[]) {
      (purchaseMap[pu.user_id] ??= []).push(pu);
    }
  }

  // Fetch emails via service role (auth.users is not accessible otherwise).
  const emailMap: Record<string, string> = {};
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createSupabaseServiceClient();
    // F4: listUsers caps at perPage (max 1000). Loop until a short page so
    // emails past the 1000th user actually appear (was silently truncated).
    for (let page = 1; page <= 100; page++) {
      const { data, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000, page });
      const users = data?.users ?? [];
      for (const u of users) emailMap[u.id] = u.email ?? "";
      if (listErr || users.length < 1000) break;
    }
  }

  const rows = parents ?? [];
  const now = new Date().toISOString();

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/80 mb-2">Admin</div>
        <h1 className="font-display text-3xl text-white">Γονείς</h1>
        <p className="mt-1 text-sm text-white/55">{rows.length} {rows.length === 1 ? "εγγεγραμμένος" : "εγγεγραμμένοι"}</p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-12 text-center">
          <p className="text-red-400 text-sm font-bold">Σφάλμα φόρτωσης</p>
          <p className="text-white/55 text-xs mt-1">{error.message}</p>
        </div>
      ) : rows.length === 0 ? (
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
                const activePurchases = (purchaseMap[p.id] ?? []).filter(
                  (pu) => pu.packages?.package_type === "parent" && pu.expires_at > now
                );
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
