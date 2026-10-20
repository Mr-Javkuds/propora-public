import { NextRequest, NextResponse } from "next/server";
import { safeReturnTo } from "../../../lib/auth-policy";
import { supabaseServer } from "../../../lib/supabase/server";
import { currentAccount } from "../../../lib/auth-server";
import { sameOrigin } from "../../../lib/auth-server";
import { ACTIVE_ROLE_COOKIE } from '../../../lib/session-scope';


export const runtime = "nodejs";
type Context = { params: Promise<{ action: string }> };
const attempts = new Map<string, { count: number; until: number }>();

export async function GET(request: NextRequest, context: Context) {
  if ((await context.params).action !== "session") return NextResponse.json({ error: "Endpoint tidak ditemukan." }, { status: 404 });
  const user = await currentAccount();
  return NextResponse.json({ user, dataRevision: "supabase-v1" }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest, context: Context) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Asal permintaan tidak diizinkan." }, { status: 403 });
  const { action } = await context.params;
  if (action === "logout") {
    const client = await supabaseServer();
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error) return NextResponse.json({ error: "Gagal keluar. Coba lagi." }, { status: 503 });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  }
  if (action !== "login" && action !== "register") return NextResponse.json({ error: "Endpoint tidak ditemukan." }, { status: 404 });
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  for (const [key, value] of attempts) if (value.until <= Date.now()) attempts.delete(key);
  const attempt = attempts.get(key) ?? { count: 0, until: Date.now() + 15 * 60 * 1000 };
  if (attempt.count >= 20) return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi dalam 15 menit." }, { status: 429 });
  attempt.count++;
  attempts.set(key, attempt);
  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Data permintaan tidak valid." }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Data permintaan tidak valid." }, { status: 400 });
  const { role, password, returnTo } = body;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || typeof password !== "string" || password.length < 8 || password.length > 128 || (role !== "pencari" && role !== "pemilik")) {
    return NextResponse.json({ error: "Isi email, kata sandi 8-128 karakter, dan peran yang valid." }, { status: 400 });
  }
  try {
    const client = await supabaseServer(role);
    const result = action === "register"
      ? await client.auth.signUp({ email, password, options: { data: { role }, emailRedirectTo: `${request.nextUrl.origin}/auth/callback?role=${role}` } })
      : await client.auth.signInWithPassword({ email, password });
    if (result.error) return NextResponse.json({ error: action === "login" ? "Email, kata sandi, atau konfirmasi email belum sesuai." : result.error.message }, { status: 400 });
    if (!result.data.session) return NextResponse.json({ message: "Periksa email Anda untuk mengonfirmasi akun, lalu masuk." }, { status: 201, headers: { "Cache-Control": "no-store" } });
    const user = await currentAccount(role);
    if (!user || user.role !== role) {
      await client.auth.signOut({ scope: "local" });
      return NextResponse.json({ error: "Peran akun tidak sesuai." }, { status: 403 });
    }
    const response = NextResponse.json({ user, redirectTo: safeReturnTo(typeof returnTo === "string" ? returnTo : null, user.role) }, { status: action === "register" ? 201 : 200, headers: { "Cache-Control": "no-store" } });
    response.cookies.set(ACTIVE_ROLE_COOKIE, role, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_EXISTS") return NextResponse.json({ error: "Email sudah terdaftar. Silakan masuk." }, { status: 409 });
    console.error("Authentication failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Layanan akun sedang bermasalah. Silakan coba lagi." }, { status: 500 });
  }
}
