import { NextRequest, NextResponse } from "next/server";
import { authorize, sameOrigin } from "../../../lib/auth-server";
import { getFavorites, setFavorite } from "../../../lib/auth-store";
import { apiError } from "../../../lib/marketplace-api";
import { getListing } from "../../../lib/marketplace-store";

export async function GET() {
  try {
  const { account, error } = await authorize("pencari");
  if (error) return error;
  return NextResponse.json({ ids: await getFavorites(account.id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try {
  const { account, error } = await authorize("pencari");
  if (error) return error;
  if (!sameOrigin(request)) return NextResponse.json({ error: "Asal permintaan tidak diizinkan." }, { status: 403 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Data tidak valid." }, { status: 400 }); }
  const id = body?.id;
  const listing = Number.isInteger(id) ? await getListing(id) : null;
  if (!listing || listing.status === "draft" || typeof body.saved !== "boolean") return NextResponse.json({ error: "Data favorit tidak valid." }, { status: 400 });
  return NextResponse.json({ ids: await setFavorite(account.id, id, body.saved) });
  } catch (error) { return apiError(error); }
}
