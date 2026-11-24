import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ReceiptManager } from "./ReceiptManager";
export const dynamic = "force-dynamic";
export default async function Page({params}: {params: Promise<{id:string}>}) {
  const {id} = await params;
  const db = await createSupabaseServerClient();
  if (!db) redirect("/signin");
  const {data:{user}} = await db.auth.getUser();
  if (!user) redirect("/signin");
  const {data:me} = await db.from("profiles").select("is_admin").eq("id",user.id).maybeSingle();
  if (!me?.is_admin) redirect("/account");
  const {data:parent} = await db.from("profiles").select("full_name").eq("id",id).eq("account_type","parent").maybeSingle();
  if (!parent) notFound();
  const {data,error} = await db.from("parent_receipts").select("id,file_name,receipt_date,amount,description").eq("parent_id",id).order("receipt_date",{ascending:false}).order("created_at",{ascending:false});
  return <div className="space-y-6"><Link href="/admin/parents" className="!text-[#c8ff00] text-xs font-bold">← Γονείς</Link><h1 className="font-display text-3xl text-white">Αποδείξεις · {parent.full_name ?? "Γονέας"}</h1>{error ? <p className="text-red-400">Αδυναμία φόρτωσης αποδείξεων. Ελέγξτε τη migration.</p> : <ReceiptManager parentId={id} receipts={data ?? []}/>}</div>;
}
