import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../lib/supabase/server";
import { currentAccount } from "../../lib/auth-server";
import { roleHome } from "../../lib/auth-policy";
import { ACTIVE_ROLE_COOKIE } from '../../lib/session-scope';
export async function GET(request: NextRequest) {
  const requestedRole = request.nextUrl.searchParams.get('role');
  const role = requestedRole === 'pemilik' || requestedRole === 'pencari' ? requestedRole : undefined;
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const client = await supabaseServer(role);
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) {
      const account = await currentAccount(role);
      const response = NextResponse.redirect(new URL(request.nextUrl.searchParams.get("next") === "/auth/reset" ? "/auth/reset" : account ? roleHome(account.role) : "/login", request.url), { headers: { "Cache-Control": "no-store" } });
      if (account) response.cookies.set(ACTIVE_ROLE_COOKIE, account.role, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
      return response;
    }
  }
  return NextResponse.redirect(new URL("/login?error=confirmation", request.url));
}
