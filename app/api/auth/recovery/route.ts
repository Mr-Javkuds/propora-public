import { NextRequest, NextResponse } from "next/server";
import { sameOrigin } from "../../../lib/auth-server";
import { supabaseServer } from "../../../lib/supabase/server";
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Asal permintaan tidak diizinkan." }, { status: 403 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Data tidak valid." }, { status: 400 }); }
  if (typeof body?.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) || body.email.length > 254) return NextResponse.json({ error: "Email tidak valid." }, { status: 400 });
  const client = await supabaseServer();
  const { error } = await client.auth.resetPasswordForEmail(body.email.trim().toLowerCase(), { redirectTo: `${request.nextUrl.origin}/auth/callback?next=/auth/reset` });
  if (error) return NextResponse.json({ error: "Permintaan belum dapat diproses. Coba lagi nanti." }, { status: 429 });
  return NextResponse.json({ message: "Jika email terdaftar, tautan reset akan dikirim. Periksa kotak masuk Anda." }, { headers: { "Cache-Control": "no-store" } });
}
