"use client";
import { useEffect, useState } from "react";
import { api } from "../lib/marketplace-client";
import { pencariKeys, pencariSnapshot } from "../lib/pencari-draft-client";
import { syncDatasetRevision } from "../lib/dataset-revision-client";

export default function PencariDraftGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { user, dataRevision } = await api<{ user: { id: string; role: string } | null; dataRevision: string }>("/api/auth/session");
        syncDatasetRevision(dataRevision);
        if (user?.role === "pencari") {
          const previous = localStorage.getItem("proporaDraftAccount");
          if (previous && previous !== user.id) [...pencariKeys,"selectedBookingProperty","selectedProperty","proporaMlRecommendations","proporaRentalApplication","proporaSurveyDraft","proporaSurveyRequest"].forEach(key => localStorage.removeItem(key));
          const data = await api<{ draft: Record<string, unknown> | null }>("/api/pencari/wizard");
          if (!data.draft || (sessionStorage.getItem("proporaGuestDraft") && !previous)) {
            await api("/api/pencari/wizard", { method: "PUT", body: JSON.stringify(pencariSnapshot()) });
          } else {
            for (const key of pencariKeys) {
              if (data.draft[key] != null) localStorage.setItem(key, JSON.stringify(data.draft[key]));
              else localStorage.removeItem(key);
            }
          }
          sessionStorage.removeItem("proporaGuestDraft");
          localStorage.setItem("proporaDraftAccount", user.id);
        }
        if (active) setReady(true);
      } catch { if (active) setError("Draf belum dapat dimuat. Muat ulang halaman untuk mencoba lagi."); }
    };
    void load(); return () => { active = false; };
  }, []);
  if (!ready) return <main style={{ padding: 40 }}><p role={error ? "alert" : "status"}>{error || "Memuat kebutuhan bisnis..."}</p>{error && <button onClick={() => window.location.reload()}>Muat Ulang</button>}</main>;
  return children;
}
