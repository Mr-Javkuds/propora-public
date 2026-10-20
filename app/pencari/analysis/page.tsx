"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyAnalysisPage() {
  const router = useRouter();
  useEffect(() => {
    let id = new URLSearchParams(window.location.search).get("listingId");
    if (!id) {
      try { id = JSON.parse(localStorage.getItem("selectedBookingProperty") || "null")?.id; } catch { /* Return to results if the stored selection is invalid. */ }
    }
    router.replace(id && /^\d+$/.test(String(id)) ? `/pencari/results/${id}/analysis` : "/pencari/results");
  }, [router]);
  return <p role="status" style={{ padding: 32 }}>Membuka analisis dari hasil pencarian…</p>;
}
