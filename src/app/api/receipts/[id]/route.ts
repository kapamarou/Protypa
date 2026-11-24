import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient, isServiceRoleConfigured } from "@/lib/supabase/server";
export async function GET(req: Request, {params}: {params: Promise<{id:string}>}) {
  const db = await createSupabaseServerClient();
  if (!db || !isServiceRoleConfigured()) return new Response("Unavailable",{status:503});
  const {data:{user}} = await db.auth.getUser();
  if (!user) return new Response("Unauthorized",{status:401});
  const {id} = await params;
  // User-scoped query enforces ownership via RLS before service-role signing.
  const {data,error} = await db.from("parent_receipts").select("storage_path,file_name").eq("id",id).maybeSingle();
  if (error || !data) return new Response("Not found",{status:404});
  const download = new URL(req.url).searchParams.has("download");
  const signed = await createSupabaseServiceClient().storage.from("parent-receipts").createSignedUrl(data.storage_path,60,download ? {download:data.file_name} : undefined);
  if (signed.error || !signed.data) return new Response("Unavailable",{status:503});
  return NextResponse.redirect(signed.data.signedUrl,{headers:{"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"}});
}
