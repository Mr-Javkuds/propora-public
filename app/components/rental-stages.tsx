import Link from "next/link";
import "./rental-stages.css";

export default function RentalStages({ listingId, active, applicationStatus }: { listingId: number | string; active: 1 | 2 | 3 | 4; applicationStatus?: string }) {
  const id = encodeURIComponent(String(listingId));
  const stages = [
    { title: "Detail", caption: "Properti dipilih", href: `/pencari/results/${id}/analysis` },
    { title: "Chat & Survei", caption: "Hubungi pemilik dan pilih jadwal", href: `/pencari/chat?listingId=${id}` },
    { title: applicationStatus === "pending" ? "Pengajuan terkirim" : applicationStatus === "approved" ? "Status pengajuan" : "Pengajuan Sewa", caption: applicationStatus === "pending" ? "Menunggu persetujuan pemilik" : applicationStatus === "approved" ? "Administrasi disetujui" : "Lengkapi data & dokumen", href: `/pencari/booking/pengajuan-sewa?listingId=${id}` },
    { title: "Pembayaran", caption: "Setelah pengajuan disetujui", href: `/pencari/payment?listingId=${id}` },
  ];
  return <nav className="rental-flow-stages" aria-label="Tahapan sewa"><ol>{stages.map((stage,index)=>{
    const locked=!listingId || (index===3 && applicationStatus!=="approved") || (index===2 && applicationStatus==="pending");
    const current=active===index+1;
    const content=<><b>{index+1}</b><span><strong>{stage.title}</strong><small>{stage.caption}</small></span></>;
    return <li key={stage.title}>{locked || current ? <span className={locked ? "rental-stage-disabled" : "rental-stage-current"} aria-disabled={locked || undefined} aria-current={current ? "step" : undefined}>{content}</span> : <Link href={stage.href}>{content}</Link>}</li>;
  })}</ol></nav>;
}
