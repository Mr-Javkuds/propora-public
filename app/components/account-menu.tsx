"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { Account } from "../lib/auth-policy";
import { roleHome } from "../lib/auth-policy";
import { User } from "./ui/next-icons";
import { clearClientAccountState, syncDatasetRevision } from "../lib/dataset-revision-client";

export default function AccountMenu({ inline = false }: { inline?: boolean }) {
  const pathname = usePathname();
  const [user, setUser] = useState<Account | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!inline && (pathname === "/" || pathname.startsWith("/owner"))) return;
    const controller = new AbortController();
    fetch("/api/auth/session", { cache: "no-store", signal: controller.signal })
      .then(response => response.json()).then(data => { syncDatasetRevision(data.dataRevision); setUser(data.user); }).catch(() => {});
    return () => controller.abort();
  }, [pathname, inline]);
  if (!user || pathname === "/login" || (!inline && (pathname === "/" || pathname.startsWith("/owner")))) return null;
  return (
    <details className={`account-menu${inline ? " account-menu-inline" : ""}`}>
      <summary aria-label="Akun aktif" title="Akun"><User size={18} /></summary>
      <div className="account-menu-panel">
      <a href={roleHome(user.role)}>{user.email} · {user.role === "pemilik" ? "Pemilik Properti" : "Pencari Properti"}</a>
      <button disabled={busy} onClick={async () => {
        setBusy(true);
        try {
          const response = await fetch("/api/auth/logout", { method: "POST" });
          if (!response.ok) throw new Error();
          if (user.role === 'pencari') clearClientAccountState();
          window.location.assign("/login");
        } catch { setError("Gagal keluar. Coba lagi."); setBusy(false); }
      }}>{busy ? "Memproses..." : "Keluar"}</button>
      {error && <span role="alert">{error}</span>}
      </div>
    </details>
  );
}
