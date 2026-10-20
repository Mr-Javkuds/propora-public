"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { Account } from "../lib/auth-policy";
import { roleHome } from "../lib/auth-policy";
import { clearClientAccountState } from "../lib/dataset-revision-client";

type SessionState = { status: "loading" | "guest" | "active" | "error"; account: Account | null }
export function HomeAccountActions() {
  const t = useTranslations("HomeNavigation");
  const router = useRouter();
  const [session, setSession] = useState<SessionState>({ status: "loading", account: null });
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Session check failed");
        const data = await response.json() as { user: Account | null };
        if (!controller.signal.aborted) setSession({ status: data.user ? "active" : "guest", account: data.user });
      } catch {
        if (!controller.signal.aborted) setSession({ status: "error", account: null });
      }
    }
    void refresh();
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);
    return () => { controller.abort(); window.removeEventListener("focus", onFocus); };
  }, []);

  async function signOut() {
    setSigningOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Sign out failed");
      if (session.account?.role === 'pencari') clearClientAccountState();
      setSession({ status: "guest", account: null });
      router.refresh();
    } catch {
      setSession({ status: "error", account: null });
    } finally {
      setSigningOut(false);
    }
  }

  if (session.status === "loading") return <span className="home-session-loading" aria-label="Loading session" />;
  if (session.status === "active" && session.account) return <div className="home-session-active">
    <span className="home-session-role" title={session.account.email}>{session.account.role === "pemilik" ? t("owner") : t("seeker")}</span>
    <Link href={roleHome(session.account.role)} className="register-link">{t("dashboard")}</Link>
    <button type="button" className="home-signout" disabled={signingOut} onClick={() => void signOut()}>{signingOut ? t("signingOut") : t("signOut")}</button>
  </div>;
  return <div className="home-session-guest">
    {session.status === "error" && <span className="home-session-error" role="status">{t("sessionError")}</span>}
    <Link href="/login" className="login-link">{t("signIn")}</Link>
    <Link href="/login?mode=register" className="register-link">{t("signUp")}</Link>
  </div>;
}
