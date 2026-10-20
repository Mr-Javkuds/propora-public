export type Role = "pencari" | "pemilik";
export type Account = { id: string; email: string; role: Role };
export const SESSION_COOKIE = "propora_session";

export function roleHome(role: Role) {
  return role === "pemilik" ? "/owner" : "/pencari";
}

export function roleDestination(pathname: string, search: string, role: Role) {
  if (role === "pemilik" && (pathname === "/pencari/chat" || pathname === "/pencari/booking")) {
    const source = new URLSearchParams(search);
    const target = new URLSearchParams({ view: "messages" });
    const listingId = source.get("listingId");
    if (listingId && /^[1-9]\d*$/.test(listingId) && Number.isSafeInteger(Number(listingId))) target.set("listingId", listingId);
    return `/owner?${target}`;
  }
  return roleHome(role);
}

export function requiredRole(pathname: string): Role | null {
  if (pathname === "/owner" || pathname.startsWith("/owner/") || pathname.startsWith("/api/owner/")) return "pemilik";
  if (pathname === "/pencari" || pathname.startsWith("/pencari/") || pathname.startsWith("/api/pencari/")) return "pencari";
  return null;
}

export function safeReturnTo(value: string | null, role: Role) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value)) return roleHome(role);
  const url = new URL(value, "http://propora.local");
  return requiredRole(url.pathname) === role ? url.pathname + url.search : roleDestination(url.pathname, url.search, role);
}
