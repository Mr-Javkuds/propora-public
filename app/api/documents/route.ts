import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { currentAccount, sameOrigin } from "../../lib/auth-server";
import { supabaseServer, checked } from "../../lib/supabase/server";
import { apiError, json } from "../../lib/marketplace-api";
import { MarketplaceError } from "../../lib/marketplace-store";

const bucket = "rental-documents";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function GET(request: NextRequest) {
  try {
    if (!await currentAccount()) return json({error:"Silakan masuk terlebih dahulu."},401);
    const id = request.nextUrl.searchParams.get("applicationId");
    if (!id || !uuid.test(id)) return json({error:"ID pengajuan tidak valid."},400);
    const client = await supabaseServer();
    return json({documents:checked(await client.from("application_documents").select("id,kind,name,size,created_at").eq("application_id",id).order("created_at"))});
  } catch (error) { return apiError(error); }
}
export async function POST(request: NextRequest) {
  try {
    const account = await currentAccount();
    if (!account) return json({error:"Silakan masuk terlebih dahulu."},401);
    if (account.role !== "pencari" || !sameOrigin(request)) return json({error:"Akses tidak diizinkan."},403);
    // Bound actual bytes before parsing multipart; Content-Length alone is untrusted.
    const reader = request.body?.getReader();
    if (!reader) throw new MarketplaceError("Pilih dokumen.");
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const part = await reader.read(); if (part.done) break;
      size += part.value.byteLength;
      if (size > 5 * 1024 * 1024 + 65536) { await reader.cancel(); throw new MarketplaceError("Ukuran dokumen maksimal 5MB.",413); }
      chunks.push(part.value);
    }
    let body: FormData;
    try {
      body = await new Response(Buffer.concat(chunks), {headers:{"Content-Type":request.headers.get("content-type") ?? ""}}).formData();
    } catch {
      throw new MarketplaceError("Formulir unggah tidak valid. Gunakan multipart/form-data.");
    }
    const file = body.get("file"); const kind = body.get("kind");
    const listingId = Number(body.get("listingId")); const applicationId = body.get("applicationId");
    if (!(file instanceof File) || !file.size || file.size > 5242880 || !Number.isSafeInteger(listingId) || listingId < 1 || !["ktp","npwp"].includes(String(kind))) throw new MarketplaceError("Dokumen atau properti tidak valid.");
    if (applicationId && (typeof applicationId !== "string" || !uuid.test(applicationId))) throw new MarketplaceError("ID pengajuan tidak valid.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const formats = [
      {mime:"application/pdf",ext:"pdf",valid:bytes.subarray(0,5).toString()==="%PDF-"},
      {mime:"image/png",ext:"png",valid:bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))},
      {mime:"image/jpeg",ext:"jpg",valid:bytes[0]===255 && bytes[1]===216 && bytes[2]===255},
    ];
    const format = formats.find(item=>item.mime===file.type && item.valid);
    if (!format) throw new MarketplaceError("Gunakan file PDF, JPG, atau PNG yang valid.");
    const client = await supabaseServer();
    const listing = checked(await client.from("listings").select("id,status,owner_id").eq("id",listingId).maybeSingle());
    if (!listing?.owner_id || listing.status!=="available") throw new MarketplaceError("Properti tidak tersedia.",409);
    if (applicationId) {
      const application = checked(await client.from("applications").select("id").eq("id",applicationId).eq("listing_id",listingId).eq("seeker_id",account.id).eq("status","pending").maybeSingle());
      if (!application) throw new MarketplaceError("Pengajuan tidak ditemukan atau telah diproses.",404);
    }
    const id = randomUUID(); const path = `${account.id}/${id}/${kind}.${format.ext}`;
    checked(await client.storage.from(bucket).upload(path,bytes,{contentType:format.mime,upsert:false}));
    const result = await client.from("application_documents").insert({id,user_id:account.id,listing_id:listingId,application_id:applicationId || null,kind,name:file.name.replace(/[\x00-\x1f\x7f/\\]/g,"_").slice(0,200),path,mime_type:format.mime,size:file.size}).select("id,kind,name,size,created_at").single();
    if (result.error) { await client.storage.from(bucket).remove([path]); checked(result); }
    return json({document:result.data},201);
  } catch (error) { return apiError(error); }
}
