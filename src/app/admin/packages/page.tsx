"use client";
import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Package } from "@/lib/types";

type Row = Package & { saving: boolean; saved: boolean; error: string | null; draft: string };

const TYPE_LABELS: Record<string, string> = {
  parent:    "Γονέας",
  school:    "Φροντιστήριο",
  expansion: "Επέκταση",
};

export default function AdminPackagesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase
      .from("packages")
      .select("*")
      .neq("package_type", "legacy")
      .order("package_type")
      .order("price_cents")
      .then(({ data }) => {
        if (!data) return;
        setRows(
          (data as Package[]).map((p) => ({
            ...p,
            saving: false,
            saved: false,
            error: null,
            draft: p.stripe_price_id ?? "",
          })),
        );
        setLoading(false);
      });
  }, []);

  function patch(id: string, update: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...update } : r)));
  }

  async function save(row: Row) {
    patch(row.id, { saving: true, saved: false, error: null });
    const res = await fetch("/api/admin/packages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ package_id: row.id, stripe_price_id: row.draft }),
    });
    const data = await res.json();
    if (!res.ok) {
      patch(row.id, { saving: false, error: data.error ?? "Σφάλμα" });
    } else {
      patch(row.id, { saving: false, saved: true, stripe_price_id: row.draft || null });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/80 mb-2">Admin</div>
        <h1 className="font-display text-3xl text-white">Πακέτα & Stripe</h1>
        <p className="text-sm text-white/55 mt-1">
          Συνδέστε κάθε πακέτο με το αντίστοιχο Stripe Price ID για να ενεργοποιηθεί η αγορά.
        </p>
      </div>

      {/* Instructions */}
      <div className="rounded-2xl border border-[#c8ff00]/20 bg-[#c8ff00]/5 px-5 py-4 space-y-1.5">
        <div className="text-xs font-black uppercase tracking-wider text-[#c8ff00]">Οδηγίες</div>
        <ol className="text-xs text-white/70 space-y-1 list-decimal list-inside">
          <li>Μεταβείτε στο <span className="text-white font-bold">Stripe Dashboard → Products</span></li>
          <li>Δημιουργήστε ένα Product για κάθε πακέτο (π.χ. «Γονέας»)</li>
          <li>Μέσα στο κάθε Product, δημιουργήστε ένα <span className="text-white font-bold">One-time Price</span> με την τιμή που βλέπετε παρακάτω</li>
          <li>Αντιγράψτε το <span className="text-white font-bold">Price ID</span> (αρχίζει με <code className="text-[#c8ff00]">price_</code>) και επικολλήστε το παρακάτω</li>
          <li>Κάντε κλικ <span className="text-white font-bold">Αποθήκευση</span> για κάθε πακέτο</li>
        </ol>
      </div>

      {loading ? (
        <div className="text-center py-12 text-white/40 text-sm">Φόρτωση…</div>
      ) : (
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-wider text-white/45">Πακέτο</th>
                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-wider text-white/45 hidden sm:table-cell">Τύπος</th>
                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-wider text-white/45 hidden md:table-cell">Τιμή</th>
                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-wider text-white/45">Stripe Price ID</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-sm text-white font-semibold">{row.name_el}</div>
                    <div className="text-[10px] text-white/40 mt-0.5">{row.slug}</div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs text-white/55">{TYPE_LABELS[row.package_type] ?? row.package_type}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-white/70 tabular-nums">
                      {(row.price_cents / 100).toFixed(0)}€
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={row.draft}
                        onChange={(e) => patch(row.id, { draft: e.target.value, saved: false })}
                        placeholder="price_xxxxxxxxxxxxxxxxxx"
                        className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-[#c8ff00]/50 transition-colors font-mono"
                      />
                      {row.error && <p className="text-[10px] text-red-400">{row.error}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {row.saved && (
                        <span className="text-[10px] text-green-400 font-bold">✓</span>
                      )}
                      {!row.stripe_price_id && !row.draft && (
                        <span className="text-[10px] text-amber-400 font-bold">Χωρίς ID</span>
                      )}
                      <button
                        type="button"
                        disabled={row.saving || row.draft === (row.stripe_price_id ?? "")}
                        onClick={() => save(row)}
                        className="px-3 py-1.5 rounded-full bg-[#056ef5] text-white text-[10px] font-black uppercase tracking-wider hover:bg-[#0451b8] transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-default"
                      >
                        {row.saving ? "…" : "Αποθήκευση"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/3 px-5 py-4">
        <div className="text-[10px] font-black uppercase tracking-wider text-white/45 mb-2">Έλεγχος Webhook</div>
        <p className="text-xs text-white/55">
          Στο Stripe Dashboard → Developers → Webhooks, προσθέστε endpoint:{" "}
          <code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-[11px]">
            https://protypa.gr/api/webhook
          </code>
          {" "}και ενεργοποιήστε το event{" "}
          <code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-[11px]">checkout.session.completed</code>.
          Αντιγράψτε το Webhook Secret (<code className="text-[#c8ff00] text-[11px]">whsec_…</code>) στο env σας ως{" "}
          <code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-[11px]">STRIPE_WEBHOOK_SECRET</code>.
        </p>
      </div>
    </div>
  );
}
