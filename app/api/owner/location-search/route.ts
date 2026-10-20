import { NextRequest } from "next/server";
import { authorize } from "../../../lib/auth-server";
import { json, apiError } from "../../../lib/marketplace-api";

export async function GET(request: NextRequest) {
  try {
    const { error } = await authorize("pemilik");
    if (error) return error;
    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (query.length < 3 || query.length > 200) return json({ error: "Masukkan alamat sepanjang 3–200 karakter." }, 400);
    const url = new URL(process.env.PHOTON_SEARCH_URL || "https://photon.komoot.io/api/");
    url.searchParams.set("q", query);
    url.searchParams.set("lat", "-6.9827");
    url.searchParams.set("lon", "110.4091");
    url.searchParams.set("limit", "5");
    const response = await fetch(url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) return json({ error: "Pencarian lokasi belum tersedia. Pilih titik langsung di peta." }, 502);
    const body = await response.json();
    const places = (Array.isArray(body.features) ? body.features : []).flatMap((feature: { geometry?: { coordinates?: number[] }; properties?: Record<string, string> }) => {
      const [longitude, latitude] = feature.geometry?.coordinates ?? [];
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return [];
      const p = feature.properties ?? {};
      const label = [...new Set([p.name, [p.street, p.housenumber].filter(Boolean).join(" "), p.district, p.city, p.state, p.country].filter(Boolean))].join(", ");
      return label ? [{ latitude, longitude, label }] : [];
    });
    return json({ places });
  } catch (error) {
    if (error instanceof Error && ["TimeoutError", "AbortError", "TypeError", "SyntaxError"].includes(error.name)) return json({ error: "Pencarian lokasi belum tersedia. Pilih titik langsung di peta." }, 502);
    return apiError(error);
  }
}
