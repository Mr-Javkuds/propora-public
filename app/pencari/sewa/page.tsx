"use client";

import { rentalStatusLabel } from "../../lib/rental-status";
import ApplicationDocuments from "../../components/application-documents";
import { SeekerHeader, SeekerSidebar } from "../../components/seeker-navigation";
import { LanguageSwitcher } from "../../components/language-switcher";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { RefreshCcw } from "../../components/ui/next-icons";
import type { Application, Survey } from "../../lib/marketplace-types";
import { surveyLabels } from "../../lib/marketplace-types";
import { api, rupiah } from "../../lib/marketplace-client";
import "../../components/marketplace.css";
import "../pencari.css";
import "../seeker-pages.css";

const statusDescription = {
  pending: "Menunggu keputusan pemilik.",
  approved: "Administrasi disetujui. Silakan lanjutkan ke pembayaran.",
  rejected: "Pengajuan ditolak pemilik. Anda dapat mencari properti lain.",
  withdrawn: "Pengajuan telah dibatalkan.",
};

export default function SewaSayaPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [tab, setTab] = useState("Semua");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refreshRevision=useRef(0);
  const refresh = useCallback(async () => {
    const request=++refreshRevision.current;
    try {
      const [rentalData, surveyData] = await Promise.allSettled([api<{ applications: Application[] }>("/api/pencari/applications"), api<{ surveys: Survey[] }>("/api/pencari/surveys")]);
      if(request!==refreshRevision.current)return;
      if(rentalData.status==="fulfilled")setApplications(rentalData.value.applications);
      if(surveyData.status==="fulfilled")setSurveys(surveyData.value.surveys);
      const failures=[rentalData,surveyData].filter(result=>result.status==="rejected");
      setError(failures.length ? "Sebagian data belum dapat diperbarui. Status yang terlihat adalah hasil pemuatan terakhir." : "");
    } catch (error) { setError(error instanceof Error ? error.message : "Data belum dapat dimuat."); }
    finally { if(request===refreshRevision.current)setLoading(false); }
  }, []);
  useEffect(() => {
    queueMicrotask(() => { void refresh(); });
    const interval = setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 8000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(interval); window.removeEventListener("focus", refresh); };
  }, [refresh]);
  async function openBooking(id: number) {
    try {
      const data = await api<{ property: object }>(`/api/ml/properties/${id}`);
      localStorage.setItem("selectedBookingProperty", JSON.stringify(data.property));
      router.push(`/pencari/chat?listingId=${id}`);
    } catch (error) { setError(error instanceof Error ? error.message : "Properti tidak tersedia."); }
  }
  const visible = applications.filter(item => tab === "Semua" || (tab === "Riwayat" ? ["rejected", "withdrawn"].includes(item.status) : item.status === tab));
  return <main className="marketplace seeker-workspace pencari-shell seeker-shell seeker-page-shell">
    <SeekerSidebar/><SeekerHeader/>
    <section className="pencari-main"><div className="pencari-container seeker-page-container"><header className="market-heading"><div><p>Pengajuan Saya</p><h1>Survei dan Status Sewa</h1></div><div className="market-heading-actions"><LanguageSwitcher/><button aria-label="Muat ulang" title="Muat ulang" onClick={() => void refresh()}><RefreshCcw size={18} /></button></div></header>
      {error && <p className="market-error" role="alert">{error}</p>}
      <section className="market-stats"><div><span>Pengajuan Sewa</span><strong>{loading || error ? "—" : applications.length}</strong></div><div><span>Menunggu</span><strong>{loading || error ? "—" : applications.filter(item => item.status === "pending").length}</strong></div><div><span>Disetujui</span><strong>{loading || error ? "—" : applications.filter(item => item.status === "approved").length}</strong></div><div><span>Permintaan Survei</span><strong>{loading || error ? "—" : surveys.length}</strong></div></section>
      <section className="market-section"><h2>Pengajuan Sewa</h2><div className="market-tabs" role="tablist">{["Semua", "pending", "approved", "Riwayat"].map(value => <button role="tab" aria-selected={tab === value} key={value} onClick={() => setTab(value)}>{value === "pending" ? "Menunggu" : value === "approved" ? "Disetujui" : value}</button>)}</div>
        {loading ? <p>Memuat pengajuan...</p> : !visible.length ? <p className="market-empty">Belum ada pengajuan pada kategori ini. <Link href="/pencari/results">Cari properti</Link></p> : <div className="market-requests">{visible.map(item => <article key={item.id} data-testid={`application-${item.id}`}>
          <div className="market-request-title"><h3>{item.listingName}</h3><span className={`market-badge ${item.status}`}>{rentalStatusLabel(item)}</span></div>
          <p>{item.address}</p><p>Pemilik: {item.ownerEmail}</p>
          <p>Penawaran <strong>{rupiah(item.offer)} / tahun</strong></p>
          <p>{item.duration} tahun · Mulai {item.startDate}</p>
          <p>{item.payment ? "Pembayaran lunas. Properti tersedia di My Rent." : item.status === "approved" && item.listingStatus === "rented" ? "Sewa telah dicatat pemilik. Bukti pembayaran di aplikasi belum tersedia." : item.ownerNote || statusDescription[item.status]}</p><ApplicationDocuments listingId={item.listingId} applicationId={item.id} editable={item.status==="pending"} />
          <small>No. pengajuan: {item.id}</small>{item.payment && <p><Link href="/pencari/my-rent">Lihat di My Rent →</Link></p>}
          {item.status === "approved" && item.listingStatus === "reserved" && <p><Link href={`/pencari/payment?listingId=${item.listingId}`}>Lanjut ke pembayaran →</Link></p>}
          <div className="market-actions" style={{ marginTop: 16 }}>{item.status === "rejected" ? <Link href="/pencari/results">Cari Properti Lain</Link> : <button onClick={() => void openBooking(item.listingId)}>Hubungi Pemilik</button>}</div>
        </article>)}</div>}
      </section>
      <section className="market-section"><h2>Jadwal Survei</h2>{!surveys.length && <p className="market-empty">Belum ada permintaan survei.</p>}<div className="market-requests">{surveys.map(item => <article key={item.id} data-testid={`survey-${item.id}`}><div className="market-request-title"><h3>{item.listingName}</h3><span className={`market-badge ${item.status}`}>{surveyLabels[item.status]}</span></div><p>{item.date} · {item.time} WIB · {item.visitors} pengunjung</p><p>{item.note}</p>{item.ownerNote && <p>Catatan pemilik: {item.ownerNote}</p>}<button onClick={() => void openBooking(item.listingId)}>Buka Properti dan Chat</button></article>)}</div></section>
    </div></section>
  </main>;
}
