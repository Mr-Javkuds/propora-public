import "server-only";
import { supabaseServer, checked } from "./supabase/server";
export async function getFavorites(userId: string): Promise<number[]> {
  const client = await supabaseServer();
  return checked(await client.from("favorites").select("listing_id").eq("user_id", userId).order("listing_id"))!.map(row => row.listing_id);
}
export async function setFavorite(userId: string, propertyId: number, saved: boolean) {
  const client = await supabaseServer();
  checked(saved ? await client.from("favorites").upsert({user_id:userId,listing_id:propertyId}) : await client.from("favorites").delete().eq("user_id",userId).eq("listing_id",propertyId));
  return getFavorites(userId);
}
