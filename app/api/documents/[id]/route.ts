import { NextRequest, NextResponse } from "next/server";
import { currentAccount, sameOrigin } from "../../../lib/auth-server";
import { supabaseServer, checked } from "../../../lib/supabase/server";
import { apiError, json } from "../../../lib/marketplace-api";
type Context = {params:Promise<{id:string}>};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function GET(_request: NextRequest, context: Context) {
  try {
    if (!await currentAccount()) return json({error:"Silakan masuk terlebih dahulu."},401);
    const {id} = await context.params; const client = await supabaseServer();
    if (!uuid.test(id)) return json({error:"ID dokumen tidak valid."},400);
    const document = checked(await client.from("application_documents").select("path").eq("id",id).maybeSingle());
    if (!document) return json({error:"Dokumen tidak ditemukan."},404);
    const signed = checked(await client.storage.from("rental-documents").createSignedUrl(document.path,60,{download:true}));
    return NextResponse.redirect(signed!.signedUrl,{headers:{"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"}});
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: NextRequest, context: Context) {
  try {
    const account = await currentAccount();
    if (!account) return json({error:"Silakan masuk terlebih dahulu."},401);
    if (account.role!=="pencari" || !sameOrigin(request)) return json({error:"Akses tidak diizinkan."},403);
    const {id} = await context.params; const client = await supabaseServer();
    if (!uuid.test(id)) return json({error:"ID dokumen tidak valid."},400);
    const document = checked(await client.from("application_documents").select("path").eq("id",id).eq("user_id",account.id).is("application_id",null).maybeSingle());
    if (!document) return json({error:"Dokumen tidak dapat dihapus."},404);
    checked(await client.storage.from("rental-documents").remove([document.path]));
    checked(await client.from("application_documents").delete().eq("id",id));
    return json({ok:true});
  } catch (error) { return apiError(error); }
}
