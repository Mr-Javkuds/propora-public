"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect,useState } from "react";
import { SeekerHeader,SeekerSidebar } from "./seeker-navigation";
import { signalLabels,type DatabaseProperty } from "./listing-data";
import RentalStages from "./rental-stages";
import PropertyBusinessReport from "./property-business-report";
import { ArrowLeft, ArrowRight, Building2, Check, MapPin, MessageSquare, ShieldCheck, Sparkles } from "lucide-react";
import { api, predictionNote, rupiah } from "../lib/marketplace-client";
import { activeApplication } from "../lib/rental-flow";
import { applicationLabels, listingLabels, type Application } from "../lib/marketplace-types";
import { mlContextQuery } from "../lib/pencari-draft-client";
import "../pencari/pencari.css";
import "../pencari/seeker-pages.css";
import "./property-analysis.css";
export default function PropertyAnalysis({listingId}:{listingId:string}) {
  const [property,setProperty]=useState<DatabaseProperty|null>(null);
  const [application,setApplication]=useState<Application|null>(null);
  const [error,setError]=useState("");
  useEffect(()=>{
    const controller=new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const load=async()=>{
      try {
        if(document.visibilityState!=="hidden"){
          const [detail,requests]=await Promise.all([
            api<{property:DatabaseProperty}>(`/api/ml/properties/${encodeURIComponent(listingId)}?${mlContextQuery()}`,{signal:controller.signal}),
            api<{applications:Application[]}>("/api/pencari/applications",{signal:controller.signal}),
          ]);
          if(!controller.signal.aborted){setProperty(detail.property);setApplication(activeApplication(requests.applications,Number(listingId)));setError("");}
        }
      }catch(error){if(!controller.signal.aborted)setError(error instanceof Error ? error.message : "Properti gagal dimuat.");}
      finally{if(!controller.signal.aborted)timer=setTimeout(()=>void load(),8000);}
    };
    void load();
    return()=>{controller.abort();clearTimeout(timer);};
  },[listingId]);
  const p=property;
  const rented=application?.listingStatus==="rented" || !!application?.payment;
  const approved=application?.status==="approved";
  const nextHref=rented ? "/pencari/my-rent" : approved ? `/pencari/payment?listingId=${listingId}` : `/pencari/booking/pengajuan-sewa?listingId=${listingId}`;
  const nextLabel=rented ? "Lihat sewa saya" : approved ? "Lanjut ke pembayaran" : application ? "Lihat pengajuan saya" : "Ajukan sewa";
  return <main className="pencari-shell seeker-shell seeker-page-shell property-detail-page"><SeekerSidebar/><SeekerHeader/>
    <section className="pencari-main"><div className="pencari-container property-detail-container">
      <Link className="pd-back" href="/pencari/results"><ArrowLeft size={16}/>Kembali ke pencarian</Link>
      {error && <p className="pd-notice" role="alert">{error}{p && " · Menampilkan data terakhir yang berhasil dimuat."}</p>}
      {!p ? !error && <div className="pd-panel" role="status">Memuat detail properti dan status pengajuan…</div> : <>
        <header className="pd-heading"><div><p className="pd-eyebrow">PROPERTI PILIHAN ANDA</p><h1>{p.name}</h1><p className="pd-address"><MapPin size={16}/>{p.address}</p></div><div className="pd-badges"><span>{p.status ? listingLabels[p.status] : "Status belum tersedia"}</span></div></header>
        <a className="pd-report-link" href="#laporan-lengkap">Lihat laporan lengkap & unduh PDF ↓</a>
        <RentalStages listingId={p.id} active={1} applicationStatus={application?.status}/>
        <div className="pd-layout"><div className="pd-main">
          <figure className="pd-photo"><img src={p.image} alt={p.name}/><figcaption>{p.image.startsWith("/figma/") ? "Foto · bukan foto properti terverifikasi" : "Foto dari pemilik"}<span><MapPin size={13}/>{p.kecamatan}</span></figcaption></figure>
          <section className="pd-panel"><div className="pd-section-title"><div><p className="pd-eyebrow">KENALI RUANGNYA</p><h2>Tentang properti</h2></div><Building2 size={21}/></div>
            <div className="pd-specs"><div><span>Luas bangunan</span><strong>{p.building_area_m2} m²</strong></div><div><span>Sewa per tahun</span><strong>{rupiah(p.price*1000000)}</strong></div><div><span>Setara per bulan</span><strong>{rupiah(Math.round(p.price*1000000/12))}</strong></div></div>
            <p className="pd-description">{p.description || "Pemilik belum menambahkan deskripsi."}</p><h3>Fasilitas dari pemilik</h3><div className="pd-facilities">{p.facilities.length ? p.facilities.map((value,index)=><span key={`${value}-${index}`}><Check size={14}/>{value}</span>) : <p>Fasilitas belum dicantumkan.</p>}</div><p className="pd-footnote"><ShieldCheck size={15}/>Informasi properti perlu dikonfirmasi melalui survei lapangan.</p>
          </section>
          <section className="pd-panel"><div className="pd-section-title"><div><p className="pd-eyebrow">PERTIMBANGAN UNTUK USAHA ANDA</p><h2>Analisis lokasi</h2></div><Sparkles size={21}/></div>
            {p.mlStatus==="ready" && p.propora_score!=null ? <><div className="pd-score-summary"><div className="pd-score"><strong>{p.propora_score.toFixed(2)}</strong><span>/ 100</span></div><div><small>Prediksi AI</small><h3>Potensi lokasi {p.potential_label || "belum dinilai"}</h3><p>{p.businessType} · {p.trendKeyword}</p><p>Skor kecocokan lokasi, bukan persentase keberhasilan usaha.</p></div></div>
            <p className="pd-footnote">Setiap faktor menggunakan skala 0–100. Nilai lebih tinggi berarti penilaian lebih mendukung; skor terkait banjir yang lebih tinggi berarti kondisi dinilai lebih aman, bukan risiko lebih besar.</p><div className="pd-signals">{Object.entries(signalLabels).map(([key,label])=>{const value=p[key as keyof typeof signalLabels];return <div className="pd-signal" key={key}><div><span>{label}</span><strong>{value==null ? "—" : value.toFixed(1)}</strong></div><div className="pd-meter"><i style={{width:`${value==null ? 0 : Math.max(0,Math.min(100,value))}%`}}/></div></div>;})}</div>
            <div className="pd-drivers"><div><h3>Faktor pendukung</h3>{p.top_positive_drivers.map(key=><p key={key}>✓ {signalLabels[key]}</p>)}</div><div><h3>Perlu ditinjau saat survei</h3>{p.main_risk_drivers.map(key=><p key={key}>› {signalLabels[key]}</p>)}</div></div></> : <p>{predictionNote(p.mlNote) || "Analisis untuk profil usaha ini belum tersedia."}</p>}
            <details className="pd-provenance"><summary>Tentang sumber analisis</summary><p>{predictionNote(p.mlNote) || "Skor dihasilkan dari prediksi AI menggunakan data pendukung."}</p>{p.modelVersion && <p>Model: {p.modelVersion}</p>}{p.analyzedAt && <p>Dianalisis: {new Date(p.analyzedAt).toLocaleString("id-ID",{timeZone:"Asia/Jakarta"})} WIB</p>}<p>Jumlah pengunjung, jumlah kompetitor, jarak kampus, dan proyeksi balik modal belum tersedia.</p></details>
          </section>
          <section className="pd-panel"><div className="pd-section-title"><div><p className="pd-eyebrow">LIHAT LINGKUNGAN SEKITAR</p><h2>Lokasi properti</h2></div><MapPin size={21}/></div><p>{p.address}</p><iframe className="pd-map" title={`Peta ${p.name}`} src={`https://www.google.com/maps?q=${p.latitude},${p.longitude}&z=16&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade"/><p className="pd-footnote">Koordinat dari listing: {p.latitude}, {p.longitude}</p></section>
        </div><aside className="pd-sidebar"><section className="pd-rental-card"><p className="pd-eyebrow">LANGKAH BERIKUTNYA</p><h2>Mulai dari ruang yang tepat.</h2><div className="pd-rental-price"><strong>{rupiah(p.price*1000000)}</strong><span>/ tahun</span></div><p className="pd-rental-copy">Diskusikan kebutuhan Anda dengan pemilik, jadwalkan survei, lalu ajukan sewa.</p>
          {application && <div className="pd-application-status"><ShieldCheck size={18}/><div><strong>{application.payment ? "Lunas" : rented ? "Sewa aktif" : applicationLabels[application.status]}</strong><p>{rented ? "Properti Anda dapat dilihat di My Rent." : approved ? "Anda dapat melanjutkan ke pembayaran." : "Menunggu keputusan pemilik sebelum pembayaran."}</p></div></div>}
          {application || (p.ownerId && p.status==="available") ? <Link className="pd-primary" href={nextHref}>{nextLabel}<ArrowRight size={17}/></Link> : <p className="pd-application-status">Properti ini belum tersedia untuk pengajuan baru.</p>}
          {p.ownerId && <Link className="pd-secondary" href={`/pencari/chat?listingId=${p.id}`}><MessageSquare size={16}/>Chat pemilik & jadwalkan survei</Link>}
          <ol className="pd-process"><li><b>1</b><span><strong>Diskusikan & survei</strong><small>Kenali properti bersama pemilik</small></span></li><li><b>2</b><span><strong>Ajukan sewa</strong><small>Lengkapi data dan dokumen</small></span></li><li><b>3</b><span><strong>Persetujuan & pembayaran</strong><small>Terbuka setelah pengajuan disetujui</small></span></li></ol><p className="pd-footnote">Pembayaran diproses melalui aplikasi. Tidak ada dana asli yang ditagih.</p>
        </section><Link className="pd-history-link" href="/pencari/sewa">Lihat semua pengajuan saya<ArrowRight size={15}/></Link></aside></div>
        <PropertyBusinessReport key={p.id} property={p} />
      </>}
    </div></section></main>;
}
