"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
type Receipt = {id:string;file_name:string;receipt_date:string;amount:number|null;description:string|null};
export function ReceiptManager({parentId,receipts}:{parentId:string;receipts:Receipt[]}) {
  const router = useRouter();
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const [failed,setFailed] = useState(false);
  async function run(url:string,options:RequestInit,onSuccess?:()=>void) {
    setBusy(true);setMessage("");setFailed(false);
    try {
      const res = await fetch(url,options);
      const body = await res.json().catch(()=>null);
      if (!res.ok) throw new Error(body?.error ?? "Η ενέργεια απέτυχε.");
      onSuccess?.();setMessage("Η ενέργεια ολοκληρώθηκε.");router.refresh();
    } catch(e) {setFailed(true);setMessage(e instanceof Error ? e.message : "Σφάλμα σύνδεσης.");}
    finally {setBusy(false);}
  }
  function upload(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();const form=e.currentTarget;const data=new FormData(form);data.set("parent_id",parentId);
    void run("/api/admin/receipts",{method:"POST",body:data},()=>form.reset());
  }
  const field="w-full rounded-lg bg-white/5 border border-white/15 p-3 text-white text-sm [color-scheme:dark]";
  return <div className="space-y-6">
    <form onSubmit={upload} className="rounded-2xl border border-white/10 p-5 space-y-4">
      <h2 className="text-white font-bold">+ Προσθήκη απόδειξης</h2>
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
        <label className="text-white/70 text-xs">Αρχείο (PDF, JPG, PNG · έως 4 MB)<input className={field} type="file" name="file" accept="application/pdf,image/jpeg,image/png" required/></label>
        <label className="text-white/70 text-xs">Ημερομηνία<input className={field} type="date" name="receipt_date" defaultValue={new Date().toLocaleDateString("sv-SE",{timeZone:"Europe/Athens"})} required/></label>
        <label className="text-white/70 text-xs">Ποσό (€) — προαιρετικό<input className={field} type="number" name="amount" min="0" max="9999999999.99" step="0.01"/></label>
        <label className="text-white/70 text-xs">Περιγραφή — προαιρετική<input className={field} name="description" maxLength={500}/></label>
        <button className="rounded-full bg-[#c8ff00] text-black font-bold px-5 py-3 text-sm disabled:opacity-50" type="submit">{busy?"Παρακαλώ περιμένετε…":"Ανέβασμα απόδειξης"}</button>
      </fieldset>
    </form>
    {message && <p role="status" className={failed?"text-red-400":"text-[#c8ff00]"}>{message}</p>}
    <h2 className="text-white font-bold">Ιστορικό ({receipts.length})</h2>
    {!receipts.length && <p className="text-white/55">Δεν υπάρχουν αποδείξεις.</p>}
    {receipts.map(r=><div key={r.id} className="rounded-xl border border-white/10 p-4 flex flex-wrap items-center justify-between gap-4"><div className="min-w-0"><p className="text-white font-medium break-all">{r.file_name}</p><p className="text-white/60 text-xs">{r.receipt_date.split("-").reverse().join("/")}{r.amount!=null?` · ${Number(r.amount).toLocaleString("el-GR",{style:"currency",currency:"EUR"})}`:""}</p>{r.description && <p className="text-white/70 text-sm break-words">{r.description}</p>}</div><div className="flex gap-4 text-xs font-bold"><a className="!text-[#c8ff00]" href={`/api/receipts/${r.id}`} target="_blank" rel="noreferrer">Προβολή</a><a className="!text-white" href={`/api/receipts/${r.id}?download=1`}>Λήψη</a><button disabled={busy} className="text-red-400 disabled:opacity-50" onClick={()=>{if(window.confirm("Οριστική διαγραφή της απόδειξης;"))void run(`/api/admin/receipts?id=${r.id}`,{method:"DELETE"});}}>Διαγραφή</button></div></div>)}
  </div>;
}
