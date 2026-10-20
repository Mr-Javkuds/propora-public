import { requiredRole, type Role } from './auth-policy';

export const SESSION_ROLE_HEADER = 'x-propora-session-role';
export const ACTIVE_ROLE_COOKIE = 'propora_active_role';
export function sessionCookieName(role: Role) { return `propora-auth-${role}`; }

// A route selects a credential namespace, never grants a role. Authorization
// still reads the verified user/profile through Supabase and RLS.
export function sessionRole(url: string, referer: string | null, activeRole?: string): Role {
  const target = new URL(url);
  const routeRole = requiredRole(target.pathname);
  if (routeRole) return routeRole;
  if (referer) {
    try {
      const source = new URL(referer);
      const sourceRole = source.origin === target.origin ? requiredRole(source.pathname) : null;
      if (sourceRole) return sourceRole;
    } catch { /* Ignore malformed referrers. */ }
  }
  return activeRole === 'pemilik' ? 'pemilik' : 'pencari';
}
