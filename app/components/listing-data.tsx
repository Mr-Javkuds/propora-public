/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { MlRecommendation, MlSignalKey } from "../lib/propora-ml-demo";
import { listingLabels } from "../lib/marketplace-types";
import { predictionNote, rupiah } from "../lib/marketplace-client";
import "./listing-data.css";
export const signalLabels: Record<MlSignalKey,string>={demand_score:"Permintaan pasar",accessibility_score:"Kemudahan akses",property_cost_efficiency_score:"Efisiensi biaya tempat",growth_score:"Pertumbuhan",foot_traffic_score:"Perkiraan keramaian",flood_safety_score:"Kondisi terkait banjir",sentiment_score:"Persepsi terhadap kawasan",google_trends_score:"Minat terhadap kategori usaha",competition_opportunity_score:"Peluang bersaing"};
export type DatabaseProperty = MlRecommendation;
export function ListingFacts({property:p}:{property:DatabaseProperty}) {
  return <><div className="listing-data-heading"><span className="listing-data-status">{p.status ? listingLabels[p.status] : "Status belum tersedia"}</span><h2>{p.name}</h2><p>{p.address}</p></div>
    {p.image && <img className="listing-data-image" src={p.image} alt={p.name}/>}
    <dl className="listing-data-facts"><div><dt>Sewa per tahun</dt><dd>{rupiah(p.price*1000000)}</dd></div><div><dt>Setara per bulan</dt><dd>{rupiah(Math.round(p.price*1000000/12))}</dd></div><div><dt>Luas bangunan</dt><dd>{p.building_area_m2} m²</dd></div><div><dt>Pemilik</dt><dd>{p.ownerEmail || "Belum tersedia"}</dd></div><div><dt>Koordinat</dt><dd>{p.latitude}, {p.longitude}</dd></div></dl>
    {p.image.startsWith("/figma/") && <p>Foto · bukan foto properti terverifikasi</p>}<p>Informasi properti belum diverifikasi melalui survei lapangan.</p><p>{p.description || "Deskripsi belum diisi pemilik."}</p><h3>Fasilitas dari pemilik</h3><p>{p.facilities.length ? p.facilities.join(" · ") : "Belum diisi"}</p></>;
}
export function ModelFacts({property:p}:{property:DatabaseProperty}) {
  if(p.mlStatus!=="ready" || p.propora_score == null)return <section className="listing-data-model"><h3>Analisis belum tersedia</h3><p>{predictionNote(p.mlNote) || "Listing ini belum mempunyai hasil analisis tersimpan."}</p></section>;
  return <section className="listing-data-model"><h3>Skor prediksi AI <strong>{p.propora_score?.toFixed(2) ?? "—"}/100</strong></h3><p>Prediksi AI: potensi lokasi {p.potential_label || "belum dinilai"}. Kategori usaha: {p.businessType} · {p.trendKeyword}.</p><p>Skor kecocokan lokasi, bukan persentase keberhasilan usaha. Setiap faktor menggunakan skala 0–100; nilai lebih tinggi berarti penilaian lebih mendukung.</p><p>{predictionNote(p.mlNote) || "Prediksi AI menggunakan data pendukung; memerlukan validasi lapangan."}</p>
    <dl className="listing-data-facts">{Object.entries(signalLabels).map(([key,label])=>{const value=p[key as MlSignalKey];return <div key={key}><dt>{label}</dt><dd>{value != null && Number.isFinite(value) ? value.toFixed(2)+"/100" : "Belum tersedia"}</dd></div>;})}</dl>
    <p>Faktor pendukung: {p.top_positive_drivers.map(key=>signalLabels[key]).join(", ") || "Belum tersedia"}.</p><p>Faktor yang perlu ditinjau: {p.main_risk_drivers.map(key=>signalLabels[key]).join(", ") || "Belum tersedia"}.</p>
    <small>Model {p.modelVersion} · Dianalisis {p.analyzedAt ? new Date(p.analyzedAt).toLocaleString("id-ID",{timeZone:"Asia/Jakarta"})+" WIB" : "waktu belum tersedia"}</small>
    <p>Jumlah pengunjung, jumlah kompetitor, jarak kampus, dan proyeksi balik modal belum tersedia.</p></section>;
}
export function ListingActions({property:p}:{property:DatabaseProperty}) {
  return <div className="listing-data-actions"><Link href={`/pencari/results/${p.id}/analysis`}>Detail properti</Link><Link href={`/pencari/chat?listingId=${p.id}`}>Hubungi pemilik & survei</Link>{p.ownerId && p.status==="available" && <Link href={`/pencari/booking/pengajuan-sewa?listingId=${p.id}`}>Ajukan sewa</Link>}</div>;
}
