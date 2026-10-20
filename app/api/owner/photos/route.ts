import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { currentAccount, sameOrigin } from "../../../lib/auth-server";
import { supabaseServer, checked } from "../../../lib/supabase/server";
import { apiError, json } from "../../../lib/marketplace-api";
import { MarketplaceError } from "../../../lib/marketplace-store";

export async function POST(request: NextRequest) {
  try {
    const account = await currentAccount();
    if (!account) return json({error:"Silakan masuk terlebih dahulu."},401);
    if (account.role !== "pemilik" || !sameOrigin(request)) return json({error:"Akses tidak diizinkan."},403);
    const reader=request.body?.getReader();
    if (!reader) throw new MarketplaceError("Pilih foto properti.");
    const chunks:Uint8Array[]=[]; let size=0;
    while(true) {
      const part=await reader.read(); if(part.done) break;
      size+=part.value.byteLength;
      if(size>5242880+65536) {await reader.cancel(); throw new MarketplaceError("Ukuran foto maksimal 5 MB.",413);}
      chunks.push(part.value);
    }
    let form:FormData;
    try {form=await new Response(Buffer.concat(chunks),{headers:{"Content-Type":request.headers.get("content-type")??""}}).formData();}
    catch {throw new MarketplaceError("Formulir unggah tidak valid.");}
    const file=form.get("file");
    if(!(file instanceof File)||!file.size||file.size>5242880) throw new MarketplaceError("Pilih foto berukuran maksimal 5 MB.");
    const bytes=Buffer.from(await file.arrayBuffer());
    const formats=[
      {mime:"image/jpeg",ext:"jpg",valid:bytes[0]===255&&bytes[1]===216&&bytes[2]===255},
      {mime:"image/png",ext:"png",valid:bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))},
      {mime:"image/webp",ext:"webp",valid:bytes.subarray(0,4).toString()==="RIFF"&&bytes.subarray(8,12).toString()==="WEBP"}
    ];
    const format=formats.find(item=>item.mime===file.type&&item.valid);
    if(!format) throw new MarketplaceError("Gunakan foto JPG, PNG, atau WebP yang valid.");
    const client=await supabaseServer();
    const path=`${account.id}/${randomUUID()}.${format.ext}`;
    checked(await client.storage.from("listing-photos").upload(path,bytes,{contentType:format.mime,upsert:false}));
    return json({image:`/api/listing-photos/${path}`},201);
  } catch(error) {return apiError(error);}
}
