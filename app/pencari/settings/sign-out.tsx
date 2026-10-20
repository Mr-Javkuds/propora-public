"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clearClientAccountState } from "../../lib/dataset-revision-client";

export default function SettingsSignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function signOut() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Gagal keluar. Coba lagi.");
      clearClientAccountState();
      router.replace("/login");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Gagal keluar."); setBusy(false); }
  }
  return <><button type="button" disabled={busy} onClick={signOut}>{busy ? "Memproses..." : "Keluar dari akun"}</button>{error && <p role="alert">{error}</p>}</>;
}
