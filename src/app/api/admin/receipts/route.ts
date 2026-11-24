import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createSupabaseServerClient, createSupabaseServiceClient, isServiceRoleConfigured } from "@/lib/supabase/server";
export const runtime = "nodejs";
const bucket = "parent-receipts";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });
async function authorized(req: Request) {
  // Browser mutations must originate from the same site.
  if (req.headers.get("sec-fetch-site") !== "same-origin" && req.headers.get("origin") !== new URL(req.url).origin) return null;
  const db = await createSupabaseServerClient();
  if (!db) return null;
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  return data?.is_admin ? db : null;
}
export async function POST(req: Request) {
  if (!await authorized(req)) return fail("Δεν επιτρέπεται η πρόσβαση.", 403);
  if (!isServiceRoleConfigured()) return fail("Δεν έχει ρυθμιστεί το Storage.", 503);
  let form: FormData;

try {
  console.log("[Receipts] Content-Type:", req.headers.get("content-type"));
  console.log("[Receipts] Content-Length:", req.headers.get("content-length"));
  console.log("[Receipts] Body used:", req.bodyUsed);

  form = await req.formData();

  console.log("[Receipts] Form parsed successfully");

} catch (error) {
  console.error("[Receipts] FormData error:", error);

  return fail("Μη έγκυρη φόρμα. Ελέγξτε το terminal.");
}
  const parent = String(form.get("parent_id") ?? "");
  const file = form.get("file");
  const date = String(form.get("receipt_date") ?? "");
  const amount = String(form.get("amount") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  if (!uuid.test(parent) || !(file instanceof File) || !file.size || file.size > 4 * 1024 * 1024) return fail("Επιλέξτε αρχείο έως 4 MB.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date || (amount && !/^\d{1,10}(\.\d{1,2})?$/.test(amount)) || description.length > 500) return fail("Ελέγξτε ημερομηνία, ποσό και περιγραφή.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = file.type === "application/pdf" && bytes.subarray(0,5).toString() === "%PDF-" ? "pdf" : file.type === "image/jpeg" && bytes.subarray(0,3).equals(Buffer.from([255,216,255])) ? "jpg" : file.type === "image/png" && bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? "png" : null;
  if (!ext) return fail("Επιτρέπονται μόνο PDF, JPG και PNG.");
  const admin = createSupabaseServiceClient();
  const { data: profile } = await admin.from("profiles").select("id").eq("id",parent).eq("account_type","parent").maybeSingle();
  if (!profile) return fail("Ο γονέας δεν βρέθηκε.",404);
  const id = randomUUID();
  const path = `${parent}/${id}.${ext}`;
  const { error: uploadError } = await admin.storage.from(bucket).upload(path,bytes,{contentType:file.type,upsert:false});
  if (uploadError) return fail("Αποτυχία ανεβάσματος.",500);
  const { error } = await admin.from("parent_receipts").insert({id,parent_id:parent,storage_path:path,file_name:file.name.slice(0,240),receipt_date:date,amount:amount || null,description:description || null});
  if (error) { await admin.storage.from(bucket).remove([path]); return fail("Αποτυχία καταχώρισης απόδειξης.",500); }
  return NextResponse.json({ok:true});
}
export async function DELETE(req: Request) {
  if (!await authorized(req)) return fail("Δεν επιτρέπεται η πρόσβαση.",403);
  if (!isServiceRoleConfigured()) return fail("Δεν έχει ρυθμιστεί το Storage.",503);
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!uuid.test(id)) return fail("Μη έγκυρο ID.");
  const admin = createSupabaseServiceClient();
  const {data,error} = await admin.from("parent_receipts").select("storage_path").eq("id",id).maybeSingle();
  if (error || !data) return fail("Η απόδειξη δεν βρέθηκε.",404);
  const removed = await admin.storage.from(bucket).remove([data.storage_path]);
  if (removed.error) return fail("Αποτυχία διαγραφής αρχείου.",500);
  const deleted = await admin.from("parent_receipts").delete().eq("id",id);
  if (deleted.error) return fail("Το αρχείο διαγράφηκε αλλά όχι η εγγραφή. Δοκιμάστε ξανά.",500);
  return NextResponse.json({ok:true});
}
