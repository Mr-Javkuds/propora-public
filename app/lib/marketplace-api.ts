import { NextRequest, NextResponse } from "next/server";
import { authorize, sameOrigin } from "./auth-server";
import type { Role } from "./auth-policy";
import { supabaseServer, checked, DatabaseError } from "./supabase/server";
import { applications, createApplication, createSurvey, decideRequest, MarketplaceError, messages, object, ownerConversations, ownerListings, saveListing, sendMessage, surveys } from "./marketplace-store";

export function json(data: unknown, status = 200) { return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } }); }
export async function readInput(request: NextRequest) {
  const body = await request.text();
  if (body.length > 40000) throw new MarketplaceError("Data terlalu besar.", 413);
  try { return object(JSON.parse(body)); } catch (error) {
    if (error instanceof MarketplaceError) throw error;
    throw new MarketplaceError("JSON tidak valid.");
  }
}
export function apiError(error: unknown) {
  if (error instanceof MarketplaceError) return json({ error: error.message }, error.status);
  if (error instanceof DatabaseError && error.code === "P0001") return json({error:error.message},409);
  if (error instanceof DatabaseError && error.code === "23505") return json({ error: "Permintaan aktif atau jadwal tersebut sudah ada." }, 409);
  if (error instanceof DatabaseError && error.code === "42501") return json({ error: "Akses tidak diizinkan." }, 403);
  console.error("Marketplace request failed", error instanceof Error ? error.message : "unknown");
  return json({ error: "Permintaan belum dapat diproses. Silakan coba lagi." }, 500);
}
export async function marketplaceApi(request: NextRequest, role: Role, resource: string, id?: string) {
  try {
    const { account, error } = await authorize(role);
    if (error) return error;
    if (request.method !== "GET" && !sameOrigin(request)) throw new MarketplaceError("Asal permintaan tidak diizinkan.", 403);
    if (request.method === "GET") {
      if (resource === "listings" && role === "pemilik") return json({ listings: await ownerListings(account.id) });
      if (resource === "surveys") return json({ surveys: await surveys(account) });
      if (resource === "applications") return json({ applications: await applications(account) });
      if (resource === "messages") {
        const listingId = request.nextUrl.searchParams.get("listingId");
        if (!listingId) return json({ conversations: await ownerConversations(account) });
        if (!listingId || !/^\d+$/.test(listingId)) throw new MarketplaceError("ID properti tidak valid.");
        return json({ messages: await messages(account, Number(listingId), request.nextUrl.searchParams.get("seekerId") ?? undefined) });
      }
      if (resource === "wizard" && role === "pencari") {
        const client = await supabaseServer();
        const row = checked(await client.from("wizard_drafts").select("data").eq("user_id",account.id).maybeSingle());
        return json({ draft: row ? JSON.parse(String(row.data)) : null });
      }
    }
    if (request.method === "POST") {
      const input = await readInput(request);
      if (resource === "listings" && role === "pemilik") return json({ listing: await saveListing(account.id, input) }, 201);
      if (resource === "surveys" && role === "pencari") return json({ survey: await createSurvey(account, input) }, 201);
      if (resource === "payments" && role === "pencari") {
        if (typeof input.applicationId!=="string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.applicationId) || !["va","qris","wallet"].includes(String(input.method))) throw new MarketplaceError("Data pembayaran tidak valid.");
        const client=await supabaseServer();
        const payment=checked(await client.rpc("complete_simulated_payment",{p_application:input.applicationId,p_method:input.method}));
        return json({payment});
      }
      if (resource === "applications" && role === "pencari") return json({ application: await createApplication(account, input) }, 201);
      if (resource === "messages") return json({ messages: await sendMessage(account, input) }, 201);
    }
    if (request.method === "PATCH" && id && role === "pemilik") {
      const input = await readInput(request);
      if (resource === "listings") {
        if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id)<1) throw new MarketplaceError("ID properti tidak valid.");
        if (input.rentalStatus !== undefined) {
          if (!["rented","available"].includes(String(input.rentalStatus))) throw new MarketplaceError("Status tidak valid.");
          const client = await supabaseServer();
          const {error} = await client.rpc("set_rental_status",{p_listing:Number(id),p_status:input.rentalStatus});
          if (error) throw new MarketplaceError(error.message,error.message === "Listing tidak ditemukan" ? 404 : 409);
          return json({ok:true});
        }
        return json({ listing: await saveListing(account.id, input, Number(id)) });
      }
      if (resource === "surveys" || resource === "applications") return json({ request: await decideRequest(account, resource, id, input) });
    }
    if (request.method === "PUT" && resource === "wizard" && role === "pencari") {
      const input = await readInput(request);
      const client = await supabaseServer();
      checked(await client.from("wizard_drafts").upsert({user_id:account.id,data:JSON.stringify(input),updated_at:new Date().toISOString()}));
      return json({ draft: input });
    }
    return json({ error: "Endpoint tidak ditemukan." }, 404);
  } catch (error) { return apiError(error); }
}
