import "server-only";
import { randomUUID } from "node:crypto";
import { supabaseServer, checked } from "./supabase/server";
import type { Account } from "./auth-policy";
import type { Application, Listing, ListingStatus, Message, Survey } from "./marketplace-types";
import type { MlRecommendation, MlRecommendationRequest, MlSignalKey } from "./propora-ml-demo";
import { analyzeListing, listingFingerprint, selectVariant } from "./ml/inference.mjs";
import { recommendationContext } from "./ml/context";

export class MarketplaceError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
type Input = Record<string, unknown>;
export function object(value: unknown): Input {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new MarketplaceError("Data tidak valid.");
  return value as Input;
}
function text(value: unknown, label: string, max = 200, required = true) {
  if (typeof value !== "string" || value.trim().length > max || (required && !value.trim())) throw new MarketplaceError(`${label} tidak valid.`);
  return value.trim();
}
function number(value: unknown, label: string, min: number, max: number, integer = false) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) throw new MarketplaceError(`${label} tidak valid.`);
  return value;
}
export function jakartaToday() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
function futureDate(value: unknown) {
  const date = text(value, "Tanggal", 10);
  const parsed = new Date(`${date}T00:00:00+07:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(parsed) !== date || date < jakartaToday()) throw new MarketplaceError("Tanggal tidak boleh lampau atau tidak valid.");
  return date;
}
const listingSelect = "*, owner:users!listings_owner_id_fkey(email), analysis:listing_analyses(result_json)";
async function listingRows(id?: number, ownerId?: string) {
  const client = await supabaseServer();
  const { data: { user } } = await client.auth.getUser();
  const selection: string = user ? listingSelect : "*, analysis:listing_analyses(result_json)";
  let query = client.from("listings").select(selection).order("id", {ascending:false});
  if (id !== undefined) query = query.eq("id",id);
  if (ownerId) query = query.eq("owner_id",ownerId);
  return (checked(await query) as unknown as (ListingRow & {owner?: {email:string}; analysis?: {result_json:string} | {result_json:string}[]})[]).map(row => ({...row, owner_email:(row.owner as unknown as {email?:string} | null)?.email ?? null, analysis_json:(Array.isArray(row.analysis) ? row.analysis[0]?.result_json : (row.analysis as {result_json?: string} | null)?.result_json) ?? null})) as ListingRow[];
}
type ListingRow = { id: number; owner_id: string | null; owner_email: string | null; name: string; address: string; price: number; latitude: number; longitude: number; area: number; image: string; facilities: string; description: string; status: ListingStatus; demo_json?: string | null; analysis_json: string | null; created_at: string; updated_at: string };
function listingFromRow(row: ListingRow): Listing {
  const result = row.analysis_json ? JSON.parse(row.analysis_json) : null;
  const variant = result ? selectVariant(result) : null;
  return { id: row.id, ownerId: row.owner_id, ownerEmail: row.owner_email, name: row.name, address: row.address, price: row.price, latitude: row.latitude, longitude: row.longitude, area: row.area, image: row.image, facilities: JSON.parse(row.facilities), description: row.description, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at, demo: !!row.demo_json,
    mlStatus: result ? "ready" : "pending", analysis: result ? { modelVersion: result.modelVersion, analyzedAt: result.analyzedAt, score: variant.propora_score, potentialLabel: variant.potential_label, dataQuality: result.dataQuality } : null };
}
export async function getListing(id: number) {
  number(id, "ID properti", 1, Number.MAX_SAFE_INTEGER, true);
  return (await listingRows(id)).map(listingFromRow)[0] ?? null;
}
export async function ownerListings(ownerId: string) { return (await listingRows(undefined,ownerId)).map(listingFromRow); }
export function canReadListing(listing: Listing, account: Account | null) {
  if (listing.status !== "draft" || account?.id === listing.ownerId) return true;
  return false;
}
async function ownedListing(ownerId: string, id: number) {
  const listing = await getListing(id);
  if (!listing || listing.ownerId !== ownerId) throw new MarketplaceError("Listing tidak ditemukan.", 404);
  return listing;
}
async function availableListing(id: unknown) {
  const listing = await getListing(number(id, "ID properti", 1, Number.MAX_SAFE_INTEGER, true));
  if (!listing || !listing.ownerId || listing.status !== "available") throw new MarketplaceError("Properti belum memiliki pemilik aktif atau tidak tersedia.", 409);
  return listing;
}
export async function saveListing(ownerId: string, input: Input, id?: number) {
  {
    const previous = id ? await ownedListing(ownerId, id) : null;
    if (previous?.status === "reserved" || previous?.status === "rented") throw new MarketplaceError("Listing yang sudah dipesan tidak dapat diubah.", 409);
    const name = text(input.name, "Nama properti", 150);
    const address = text(input.address, "Alamat", 300);
    const price = number(input.price, "Harga sewa tahunan", 1_000_000, 100_000_000_000, true);
    const latitude = number(input.latitude, "Latitude", -90, 90);
    const longitude = number(input.longitude, "Longitude", -180, 180);
    const area = number(input.area, "Luas", 1, 100000);
    const image = text(input.image || "/figma/results/ruko-1.jpeg", "Foto", 1000);
    if (image.startsWith("/api/listing-photos/")) {
      const path=image.slice("/api/listing-photos/".length);
      const filename=path.slice(ownerId.length+1);
      if(!path.startsWith(ownerId+"/") || !/^[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(filename)) throw new MarketplaceError("Foto harus diunggah oleh pemilik properti.");
      const photoClient=await supabaseServer();
      const photos=checked(await photoClient.storage.from("listing-photos").list(ownerId,{search:filename,limit:10}));
      if(!photos?.some(photo=>photo.name===filename)) throw new MarketplaceError("Foto unggahan tidak ditemukan.");
    } else if (!(image.startsWith("/figma/") && !image.includes("..")) && !/^https:\/\//.test(image)) throw new MarketplaceError("Unggah foto properti yang valid.");
    const facilities = input.facilities;
    if (!Array.isArray(facilities) || facilities.length > 20) throw new MarketplaceError("Fasilitas tidak valid.");
    const facilityJson = JSON.stringify(facilities.map(value => text(value, "Fasilitas", 100)));
    const description = text(input.description ?? "", "Deskripsi", 5000, false);
    const status = input.status;
    if (status !== "available" && status !== "draft") throw new MarketplaceError("Status listing tidak valid.");
    let analysis: ReturnType<typeof analyzeListing> | undefined;
    if (status === "available") {
      const mlInput = { price, area, latitude, longitude };
      const client = await supabaseServer();
      const current = id ? checked(await client.from("listing_analyses").select("input_fingerprint,result_json").eq("listing_id",id).maybeSingle()) : null;
      try { analysis = current?.input_fingerprint === listingFingerprint(mlInput) ? JSON.parse(String(current.result_json)) : analyzeListing(mlInput); }
      catch (error) { if (status === "available") throw new MarketplaceError(`Analisis ML gagal: ${error instanceof Error ? error.message : "Data belum dapat dianalisis."}`, 422); }
    }
    const now = new Date().toISOString();
    const client = await supabaseServer();
    const listingId = checked(await client.rpc("save_listing", { p_id: id ?? null, p_listing: { owner_id:ownerId,name,address,price,latitude,longitude,area,image,facilities:facilityJson,description,status,updated_at:now }, p_analysis: analysis ?? null }));
    return (await getListing(Number(listingId)))!;
  }
}

function recommendationFromRow(row: ListingRow, request: MlRecommendationRequest): MlRecommendation {
  const listing = listingFromRow(row);
  const analysis = row.analysis_json ? JSON.parse(row.analysis_json) : null;
  const variant = analysis ? selectVariant(analysis, request.businessType, request.trendKeyword) : null;
  const signals = variant?.signals ?? { demand_score: null, accessibility_score: null, property_cost_efficiency_score: null, growth_score: null, foot_traffic_score: null, flood_safety_score: null, sentiment_score: null, google_trends_score: null, competition_opportunity_score: null };
  return {
    ...signals, id: listing.id, ruko_id: String(listing.id), name: listing.name, shortName: listing.name, address: listing.address,
    kecamatan: analysis?.kecamatan ?? "Belum tersedia", latitude: listing.latitude, longitude: listing.longitude, price: listing.price / 1_000_000,
    building_area_m2: listing.area, image: listing.image, photos: null, distance: "Belum dihitung", competitorCount: null, nearestCampusDistance: null,
    status: listing.status, description: listing.description,
    facilities: listing.facilities, pin: null, ownerId: listing.ownerId, ownerEmail: listing.ownerEmail,
    demo: listing.demo, mlStatus: variant ? "ready" : "pending", modelVersion: analysis?.modelVersion,
    analyzedAt: analysis?.analyzedAt, dataQuality: analysis?.dataQuality, mlNote: analysis && !variant ? "Analisis untuk profil usaha atau tren ini belum tersedia. Pilih profil yang didukung model." : analysis?.note,
    businessType: variant?.businessType, trendKeyword: variant?.trendKeyword,
    propora_score: variant?.propora_score ?? null, potential_label: variant?.potential_label ?? null, rank: null,
    top_positive_drivers: (variant?.top_positive_drivers ?? []) as MlSignalKey[], main_risk_drivers: (variant?.main_risk_drivers ?? []) as MlSignalKey[],
    claim_status: "business_recommendation_decision_support",
  };
}
export async function accountMlContext(account: Account | null): Promise<MlRecommendationRequest> {
  if (account?.role !== "pencari") return {};
  const client = await supabaseServer();
  const row = checked(await client.from("wizard_drafts").select("data").eq("user_id",account.id).maybeSingle());
  return row ? recommendationContext(JSON.parse(String(row.data))) : {};
}
export async function marketplaceRecommendations(request: MlRecommendationRequest = {}, seekerId?: string) {
  for (const key of ["budgetMin", "budgetMax", "radiusMeters"] as const) {
    const value = request[key];
    if (value !== undefined && (typeof value !== "number" || !Number.isFinite(value) || value < 0)) throw new MarketplaceError("Filter anggaran atau radius tidak valid.");
  }
  if (request.budgetMin !== undefined && request.budgetMax !== undefined && request.budgetMin > request.budgetMax) throw new MarketplaceError("Anggaran minimum melebihi maksimum.");
  if (request.center !== undefined && (!request.center || !Number.isFinite(request.center.lat) || !Number.isFinite(request.center.lng) || Math.abs(request.center.lat) > 90 || Math.abs(request.center.lng) > 180)) throw new MarketplaceError("Koordinat pusat tidak valid.");
  for (const key of ["businessType", "trendKeyword"] as const) if (request[key] !== undefined && (typeof request[key] !== "string" || request[key]!.length > 100)) throw new MarketplaceError("Jenis usaha atau tren tidak valid.");
  let rows = (await listingRows()).filter(row => row.status === "available");
  if (seekerId) {
    const client = await supabaseServer();
    const rejected = checked(await client.from("applications").select("listing_id").eq("seeker_id",seekerId).eq("status","rejected"))!;
    rows = rows.filter(row => !rejected.some(item => item.listing_id === row.id));
  }
  if(request.locationFilters!==undefined && (!Array.isArray(request.locationFilters) || request.locationFilters.length>20 || request.locationFilters.some(value=>typeof value!=="string" || value.length>100))) throw new MarketplaceError("Filter fasilitas tidak valid.");
  const candidates = rows.map(row => recommendationFromRow(row, request));
  const filtered = candidates.filter(item => {
    if(request.locationFilters?.some(filter=>!item.facilities.some(value=>value.toLowerCase()===filter.toLowerCase())))return false;
    if (request.budgetMin !== undefined && item.price < request.budgetMin) return false;
    if (request.budgetMax !== undefined && item.price > request.budgetMax) return false;
    if (request.center && request.radiusMeters !== undefined) {
      const rad = Math.PI / 180;
      const a = Math.sin((item.latitude - request.center.lat) * rad / 2) ** 2 + Math.cos(item.latitude * rad) * Math.cos(request.center.lat * rad) * Math.sin((item.longitude - request.center.lng) * rad / 2) ** 2;
      if (6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a))) > request.radiusMeters) return false;
    }
    return true;
  });
  return filtered.sort((a, b) => (b.propora_score ?? -1) - (a.propora_score ?? -1) || a.id - b.id).map((item, index) => ({ ...item, rank: index + 1 }));
}
export async function marketplaceProperty(id: string | number, account: Account | null, request: MlRecommendationRequest = {}) {
  if (!/^\d+$/.test(String(id)) || !Number.isSafeInteger(Number(id)) || Number(id) < 1) throw new MarketplaceError("ID properti tidak valid.");
  const listing = await getListing(Number(id));
  if (!listing || !canReadListing(listing, account)) return null;
  const context = { ...await accountMlContext(account), ...request };
  const row = (await listingRows(listing.id))[0];
  return { ...recommendationFromRow(row, context), status: listing.status };
}

async function requests(kind: "surveys" | "applications", account: Account) {
  const client = await supabaseServer();
  const rows = checked(await client.from(kind).select("*,listing:listings!inner(*,owner:users!listings_owner_id_fkey(email)),seeker:users!seeker_id(email)").order("created_at",{ascending:false}))!;
  return rows.filter(row => account.role === "pemilik" ? row.listing.owner_id === account.id : row.seeker_id === account.id).map(row => ({
    id:row.id,listingId:row.listing_id,seekerId:row.seeker_id,seekerEmail:row.seeker?.email ?? "",listingName:row.listing.name,
    date:row.date,time:row.time,visitors:row.visitors,note:row.note,status:row.status,ownerNote:row.owner_note,createdAt:row.created_at,updatedAt:row.updated_at,
    address:row.listing.address,image:row.listing.image,ownerEmail:row.listing.owner?.email ?? "",listingStatus:row.listing.status,listingDemo:!!row.listing.demo_json,listingPrice:row.listing.price,offer:row.offer,
    payment:row.payment ?? null,startDate:row.start_date,duration:row.duration,tenant:row.tenant_json ? JSON.parse(row.tenant_json) : undefined,proposal:row.proposal,
  }));
}
export async function surveys(account: Account): Promise<Survey[]> { return await requests("surveys",account) as Survey[]; }
export async function applications(account: Account): Promise<Application[]> { return await requests("applications",account) as Application[]; }
export async function createSurvey(account: Account, input: Input) {
  {
    const listing = await availableListing(input.listingId);
    const date = futureDate(input.date);
    const time = text(input.time, "Jam", 5);
    if (!["09:00", "10:00", "13:00", "15:00"].includes(time) || new Date(`${date}T${time}:00+07:00`).getTime() <= Date.now()) throw new MarketplaceError("Pilih jadwal survei di masa depan.");
    const visitors = number(input.visitors, "Jumlah pengunjung", 1, 20, true);
    const note = text(input.note ?? "", "Catatan", 2000, false);
    const id = randomUUID(); const now = new Date().toISOString();
    const client = await supabaseServer();
    checked(await client.from("surveys").insert({id,listing_id:listing.id,seeker_id:account.id,date,time,visitors,note,status:"pending",created_at:now,updated_at:now}));
    return (await surveys(account)).find(item => item.id === id)!;
  }
}

export async function createApplication(account: Account, input: Input) {
  {
    // Return the existing administrative request on retries; the database's
    // one_open_application index also guards simultaneous submissions.
    const existing = (await applications(account)).find(item => item.listingId === Number(input.listingId) && ["pending", "approved"].includes(item.status));
    if (existing) return existing;
    const listing = await availableListing(input.listingId);
    const tenant = object(input.tenant);
    const contact = { fullName: text(tenant.fullName, "Nama penyewa", 150), phone: text(tenant.phone, "Telepon", 30), email: account.email, businessName: text(tenant.businessName, "Nama usaha", 150), businessType: text(tenant.businessType, "Jenis usaha", 100) };
    if (!/^\+?[0-9\s()-]{8,30}$/.test(contact.phone)) throw new MarketplaceError("Nomor telepon tidak valid.");
    const startDate = futureDate(input.startDate);
    const duration = number(input.duration, "Durasi", 1, 10, true);
    const offer = number(input.offer, "Penawaran", 1_000_000, 100_000_000_000, true);
    const proposal = text(input.proposal ?? "", "Proposal", 5000, false);
    if (input.acceptedTerms !== true) throw new MarketplaceError("Setujui ketentuan pengajuan terlebih dahulu.");
    const id = randomUUID(); const now = new Date().toISOString();
    const client = await supabaseServer();
    const documents = input.documents ?? [];
    if (!Array.isArray(documents) || documents.length>2 || documents.some(id=>typeof id!=="string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) || new Set(documents).size!==documents.length) throw new MarketplaceError("Dokumen tidak valid.");
    const result = await client.rpc("submit_application",{p_application:{id,listing_id:listing.id,tenant_json:JSON.stringify(contact),start_date:startDate,duration,offer,proposal,created_at:now,updated_at:now},p_document_ids:documents});
    if (result.error?.code === "23505") {
      const concurrent = (await applications(account)).find(item => item.listingId === listing.id && ["pending", "approved"].includes(item.status));
      if (concurrent) return concurrent;
    }
    checked(result);
    return (await applications(account)).find(item => item.id === id)!;
  }
}

export async function decideRequest(account: Account, kind: "surveys" | "applications", id: string, input: Input) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new MarketplaceError("ID permintaan tidak valid.");
  const status = input.status;
  const allowed = kind === "surveys" ? ["confirmed","rejected"] : ["approved","rejected"];
  if (typeof status !== "string" || !allowed.includes(status)) throw new MarketplaceError("Perubahan status tidak valid.");
  const note = text(input.ownerNote ?? "", "Catatan pemilik", 2000, false);
  const client = await supabaseServer();
  const {error} = await client.rpc("decide_request",{p_kind:kind,p_id:id,p_status:status,p_note:note});
  if (error) throw new MarketplaceError(error.message,error.message === "Permintaan tidak ditemukan" ? 404 : 409);
  return kind === "surveys" ? (await surveys(account)).find(row => row.id === id)! : (await applications(account)).find(row => row.id === id)!;
}
export async function conversation(account: Account, listingId: number, seekerId?: string) {
  const listing = await getListing(listingId);
  if (!listing || !listing.ownerId) throw new MarketplaceError("Listing tidak ditemukan.", 404);
  const participant = account.role === "pencari" ? account.id : seekerId;
  if (participant && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(participant)) throw new MarketplaceError("ID peserta tidak valid.");
  if (!participant || (account.role === "pemilik" && listing.ownerId !== account.id)) throw new MarketplaceError("Percakapan tidak ditemukan.", 404);
  const client = await supabaseServer();
  const previous = checked(await client.from("messages").select("id").eq("listing_id",listingId).eq("seeker_id",participant).limit(1))!;
  if (!previous.length && account.role === "pemilik") {
    const [applications,surveys] = await Promise.all([
      client.from("applications").select("id").eq("listing_id",listingId).eq("seeker_id",participant).limit(1),
      client.from("surveys").select("id").eq("listing_id",listingId).eq("seeker_id",participant).limit(1),
    ]);
    if (!checked(applications)!.length && !checked(surveys)!.length) throw new MarketplaceError("Percakapan tidak ditemukan.",404);
  }
  if (!previous.length && listing.status === "draft") throw new MarketplaceError("Percakapan tidak ditemukan.",404);
  return { listing, seekerId: participant };
}
export async function messages(account: Account, listingId: number, seekerId?: string): Promise<Message[]> {
  const thread = await conversation(account,listingId,seekerId);
  const client = await supabaseServer();
  const rows = checked(await client.from("messages").select("*").eq("listing_id",listingId).eq("seeker_id",thread.seekerId).order("id"))!;
  return rows.map(row => ({id:row.id,listingId:row.listing_id,seekerId:row.seeker_id,senderId:row.sender_id,senderRole:row.sender_id === thread.listing.ownerId ? "pemilik" : "pencari",text:row.text,createdAt:row.created_at}));
}
export async function sendMessage(account: Account,input: Input) {
  const listingId = number(input.listingId,"ID properti",1,Number.MAX_SAFE_INTEGER,true);
  const thread = await conversation(account,listingId,typeof input.seekerId === "string" ? input.seekerId : undefined);
  const message = text(input.text,"Pesan",3000);
  const client = await supabaseServer();
  checked(await client.from("messages").insert({listing_id:listingId,seeker_id:thread.seekerId,sender_id:account.id,text:message}));
  return messages(account,listingId,thread.seekerId);
}
export async function conversations(account: Account) {
  const client = await supabaseServer();
  const rows = checked(await client.from("messages").select("*,listing:listings!inner(name,owner_id,owner:users!listings_owner_id_fkey(email)),seeker:users!seeker_id(email)").order("id",{ascending:false}))!;
  const seen = new Set<string>();
  return rows.filter(row => {
    if (account.role === "pemilik" ? row.listing.owner_id !== account.id : row.seeker_id !== account.id) return false;
    const key = `${row.listing_id}:${row.seeker_id}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).map(row => ({listingId:row.listing_id,seekerId:row.seeker_id,seekerEmail:row.seeker?.email ?? "",listingName:row.listing.name,ownerEmail:row.listing.owner?.email ?? "",lastMessage:row.text,updatedAt:row.created_at}));
}
export const ownerConversations = conversations;
