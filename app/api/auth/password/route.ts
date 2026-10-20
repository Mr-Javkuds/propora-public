import { NextRequest, NextResponse } from "next/server";
import { sameOrigin } from "../../../lib/auth-server";
import { supabaseServer } from "../../../lib/supabase/server";
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Asal permintaan tidak diizinkan." }, { status: 403 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Data tidak valid." }, { status: 400 }); }
  if (typeof body?.password !== "string" || body.password.length < 8 || body.password.length > 128) return NextResponse.json({ error: "Gunakan kata sandi 8–128 karakter." }, { status: 400 });
  const client = await supabaseServer();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Tautan telah kedaluwarsa. Minta tautan baru." }, { status: 401 });
  const { error } = await client.auth.updateUser({ password: body.password });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await client.auth.signOut({ scope: "global" });
  return NextResponse.json({ message: "Kata sandi diperbarui. Silakan masuk kembali." }, { headers: { "Cache-Control": "no-store" } });
}
