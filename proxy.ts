import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { requiredRole, roleDestination } from "./app/lib/auth-policy";
import { ACTIVE_ROLE_COOKIE, SESSION_ROLE_HEADER, sessionCookieName, sessionRole } from './app/lib/session-scope';
export async function proxy(request: NextRequest) {
  const scope = sessionRole(request.url, request.headers.get('referer'), request.cookies.get(ACTIVE_ROLE_COOKIE)?.value);
  // Always replace client-supplied scope headers before forwarding to handlers.
  request.headers.set(SESSION_ROLE_HEADER, scope);
  let response = NextResponse.next({ request });
  const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookieOptions: { name: sessionCookieName(scope), httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values, headers) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });
  const { data: { user } } = await client.auth.getUser();
  const role = requiredRole(request.nextUrl.pathname);
  const finish = (result: NextResponse) => {
    response.cookies.getAll().forEach(cookie => result.cookies.set(cookie));
    result.headers.set("Cache-Control", "private, no-store");
    return result;
  };
  if (!role) return finish(response);
  const isApi = request.nextUrl.pathname.startsWith("/api/");
  if (!user) {
    if (isApi) return finish(NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 }));
    const url = new URL("/login", request.url);
    url.searchParams.set("returnTo", request.nextUrl.pathname + request.nextUrl.search);
    return finish(NextResponse.redirect(url));
  }
  const { data: profile, error } = await client.from("users").select("role").eq("id", user.id).single();
  if (error || !profile) return finish(NextResponse.json({ error: "Profil akun belum tersedia." }, { status: 403 }));
  if (profile.role !== role) return finish(isApi
    ? NextResponse.json({ error: "Peran akun tidak memiliki akses." }, { status: 403 })
    : NextResponse.redirect(new URL(roleDestination(request.nextUrl.pathname, request.nextUrl.search, profile.role), request.url)));
  return finish(response);
}
export const config = { matcher: ["/owner/:path*", "/pencari/:path*", "/api/:path*", "/login", "/auth/:path*"] };
