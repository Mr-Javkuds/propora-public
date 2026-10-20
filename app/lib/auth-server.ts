import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { type Role } from "./auth-policy";
import { supabaseServer } from "./supabase/server";
import type { Account } from "./auth-policy";

export async function currentAccount(role?: Role) {
  const supabase = await supabaseServer(role);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from("users").select("id,email,role").eq("id", user.id).single();
  if (error) throw new Error("Profil akun belum tersedia.");
  return data as Account;
}

export async function authorize(role: Role) {
  const account = await currentAccount();
  if (!account) return { account: null, error: NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 }) };
  if (account.role !== role) return { account: null, error: NextResponse.json({ error: "Peran akun tidak memiliki akses." }, { status: 403 }) };
  return { account, error: null };
}

export function sameOrigin(request: NextRequest) {
  return request.headers.get("origin") === request.nextUrl.origin;
}
