import { NextResponse } from "next/server";
import { supabaseServer, checked } from "../../../../lib/supabase/server";
import { apiError, json } from "../../../../lib/marketplace-api";

export async function GET(_request:Request,{params}:{params:Promise<{ownerId:string;filename:string}>}) {
  try {
    const {ownerId,filename}=await params;
    const uuid="[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
    if(!new RegExp(`^${uuid}$`,"i").test(ownerId)||!new RegExp(`^${uuid}\\.(jpg|png|webp)$`,"i").test(filename)) return json({error:"Foto tidak ditemukan."},404);
    const client=await supabaseServer();
    const result=await client.storage.from("listing-photos").createSignedUrl(`${ownerId}/${filename}`,60);
    if(result.error) return json({error:"Foto tidak ditemukan."},404);
    const data=checked(result);
    const response=NextResponse.redirect(data.signedUrl);
    response.headers.set("Cache-Control","private, no-store");
    return response;
  } catch(error) {return apiError(error);}
}
