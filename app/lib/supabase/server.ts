import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import type { Role } from '../auth-policy';
import { ACTIVE_ROLE_COOKIE, SESSION_ROLE_HEADER, sessionCookieName } from '../session-scope';

export async function supabaseServer(role?: Role) {
  const jar = await cookies();
  const scope = role ?? ((await headers()).get(SESSION_ROLE_HEADER) ?? jar.get(ACTIVE_ROLE_COOKIE)?.value);
  const selectedRole = scope === 'pemilik' ? 'pemilik' : 'pencari';
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookieOptions: { name: sessionCookieName(selectedRole), httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" },
    cookies: {
      getAll: () => jar.getAll(),
      setAll(values) {
        try { values.forEach(({ name, value, options }) => jar.set(name, value, options)); }
        catch { /* Server Components are read-only; proxy refreshes the session. */ }
      },
    },
  });
}

export class DatabaseError extends Error {
  constructor(message: string, public code?: string) { super(message); }
}
export function checked<T>({ data, error }: { data: T; error: { message: string; code?: string } | null }): T {
  if (error) throw new DatabaseError(error.message, error.code);
  return data;
}
