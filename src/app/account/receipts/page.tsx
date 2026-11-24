import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export default async function ReceiptsPage() {
  const db = await createSupabaseServerClient();
  if (!db) redirect("/signin");
  const {data:{user}} = await db.auth.getUser();
  if (!user) redirect("/signin?next=/account/receipts");
  const {data:profile} = await db.from("profiles").select("account_type").eq("id",user.id).maybeSingle();
  if (profile?.account_type !== "parent") redirect("/account");
  const {data,error} = await db.from("parent_receipts").select("id,file_name,receipt_date,amount,description").eq("parent_id",user.id).order("receipt_date",{ascending:false}).order("created_at",{ascending:false});
  return <div className="space-y-5"><div><h2 className="font-display text-2xl text-ink">Οι αποδείξεις μου</h2><p className="text-ink/60 text-sm mt-2">Προβάλετε ή κατεβάστε τα παραστατικά των πληρωμών σας.</p></div>{error ? <p className="text-red-600">Δεν ήταν δυνατή η φόρτωση. Δοκιμάστε ξανά αργότερα.</p> : !data?.length ? <div className="rounded-2xl border-2 border-dashed border-ink/15 p-10 text-center text-ink/50">Δεν υπάρχουν διαθέσιμες αποδείξεις ακόμα.</div> : data.map(r=><div key={r.id} className="rounded-2xl border border-ink/10 bg-white p-5 flex flex-wrap items-center justify-between gap-4"><div className="min-w-0"><h3 className="font-bold text-ink break-all">{r.file_name}</h3><p className="text-ink/60 text-xs mt-1">{r.receipt_date.split("-").reverse().join("/")}{r.amount!=null?` · ${Number(r.amount).toLocaleString("el-GR",{style:"currency",currency:"EUR"})}`:""}</p>{r.description && <p className="text-ink/70 text-sm mt-1 break-words">{r.description}</p>}</div><div className="flex flex-wrap gap-2"><a href={`/api/receipts/${r.id}`} target="_blank" rel="noreferrer" className="rounded-full border border-[#056ef5] !text-[#056ef5] px-4 py-2 text-xs font-bold">Προβολή</a><a href={`/api/receipts/${r.id}?download=1`} className="rounded-full bg-[#056ef5] !text-white px-4 py-2 text-xs font-bold">Λήψη ↓</a></div></div>)}</div>;
}
