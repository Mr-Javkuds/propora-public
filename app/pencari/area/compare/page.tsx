/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { type CSSProperties, useEffect, useState } from "react";
import { SeekerHeader, SeekerSidebar } from "../../../components/seeker-navigation";
import type { DatabaseProperty } from "../../../components/listing-data";
import { Icon } from "../../../components/ui/icons";
import { api, rupiah } from "../../../lib/marketplace-client";
import { listingLabels } from "../../../lib/marketplace-types";
import { localMlContext } from "../../../lib/pencari-draft-client";
import { businessInsights, overallMeaning } from "./business-analysis";
import { BusinessVerdict, RentBusinessScenario, SurveyPlan, SwotComparison } from "./business-analysis-panel";
import "../../pencari.css";
import "../../seeker-pages.css";
import ComparisonRadar from "./comparison-radar";
import "./compare.css";

type ComparisonRow = { label: string; values: string[]; notes?: string[]; description?: string };
const scoreFormatter = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function scoreLabel(property: DatabaseProperty) {
  return property.mlStatus === "ready" && property.propora_score != null
    ? `${scoreFormatter.format(property.propora_score)} / 100`
    : "Belum tersedia";
}

function PropertyCard({ property, index }: { property: DatabaseProperty; index: number }) {
  return (
    <article className="compare-property">
      <div className="compare-photo">
        {property.image ? <img src={property.image} alt={`Tampak ${property.name}`} /> : <Icon name="building" size={42} />}
        <span className="compare-property-label">Pilihan {index + 1}</span>
        {property.image.startsWith("/figma/") && <small>Foto</small>}
      </div>
      <div className="compare-property-body">
        <span className={`compare-status ${property.status === "available" ? "is-available" : ""}`}>
          {property.status ? listingLabels[property.status] : "Status belum tersedia"}
        </span>
        <h2>{property.name}</h2>
        <p className="compare-address"><Icon name="map-pin" size={16} />{property.address}</p>
        <div className="compare-price"><strong>{rupiah(property.price * 1_000_000)}</strong><span>/ tahun</span></div>
        <p className="compare-monthly">Setara {rupiah(Math.round(property.price * 1_000_000 / 12))} / bulan</p>
        <div className="compare-card-metrics">
          <div><span>Luas bangunan</span><strong>{property.building_area_m2} m²</strong><small>Periksa luas efektif dan denah untuk kebutuhan operasional.</small></div>
          <div><span>Skor prediksi AI</span><strong>{scoreLabel(property)}</strong><small>{overallMeaning(property)}</small></div>
        </div>
        <div className="compare-property-actions">
          <Link className="compare-primary" href={`/pencari/results/${property.id}/analysis`}>Lihat detail<Icon name="arrow-right" size={16} /></Link>
          <Link className="compare-secondary" href={`/pencari/chat?listingId=${property.id}`}>Hubungi pemilik</Link>
        </div>
      </div>
    </article>
  );
}

function ComparisonTable({ properties, rows, caption }: {
  properties: DatabaseProperty[];
  rows: ComparisonRow[];
  caption: string;
}) {
  return (
    <div className="compare-table-wrap">
      <table className="compare-table" style={{ minWidth: properties.length > 2 ? 200 + properties.length * 250 : undefined }}>
        <caption>{caption}</caption>
        <colgroup><col className="compare-label-column" />{properties.map(property => <col key={property.id} />)}</colgroup>
        <thead><tr><th scope="col">Yang dibandingkan</th>{properties.map((property, index) => <th scope="col" key={property.id}><small>Pilihan {index + 1}</small>{property.name}</th>)}</tr></thead>
        <tbody>{rows.map(row => <tr key={row.label} style={{ gridTemplateColumns: `repeat(${properties.length}, minmax(0, 1fr))` }}><th scope="row">{row.label}{row.description && <small className="compare-row-description">{row.description}</small>}</th>{row.values.map((value, index) => <td key={index} data-label={`Pilihan ${index + 1}`}>{value}{row.notes && <small className="compare-cell-note">{row.notes[index]}</small>}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export default function ComparePage() {
  const [properties, setProperties] = useState<DatabaseProperty[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [missingSelection, setMissingSelection] = useState(false);
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const ids: unknown = JSON.parse(localStorage.getItem("proporaCompareIds") || "[]");
        if (!Array.isArray(ids) || ids.length === 0 || new Set(ids).size !== ids.length || !ids.every(id => Number.isSafeInteger(id) && id > 0)) {
          setMissingSelection(true);
          return;
        }
        setMissingSelection(false);
        const data = await api<{ properties: DatabaseProperty[] }>("/api/ml/compare", {
          method: "POST",
          body: JSON.stringify({ ids, ...localMlContext() }),
          signal: controller.signal,
        });
        const selected = ids.map(id => data.properties.find(property => property.id === id));
        const available = selected.filter((property): property is DatabaseProperty => property !== undefined);
        if (available.length !== ids.length) throw new Error("Salah satu properti tidak tersedia. Pilih kembali properti dari hasil pencarian.");
        if (!controller.signal.aborted) setProperties(available);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Perbandingan gagal dimuat.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [attempt]);

  const values = (format: (property: DatabaseProperty) => string) => properties.map(format);
  const rows: ComparisonRow[] = properties.length > 0 ? [
    { label: "Sewa per tahun", description: "Komitmen sewa tahunan; deposit, renovasi, dan biaya lainnya belum termasuk.", values: values(p => rupiah(p.price * 1_000_000)) },
    { label: "Setara per bulan", description: "Untuk merencanakan beban sewa bulanan, bukan jadwal pembayaran kontrak.", values: values(p => rupiah(Math.round(p.price * 1_000_000 / 12))) },
    { label: "Luas bangunan", description: "Menentukan ruang yang tersedia untuk layanan, stok, dan pelanggan. Luas efektif perlu diukur.", values: values(p => `${p.building_area_m2} m²`) },
    { label: "Kecamatan", values: values(p => p.kecamatan || "Belum tersedia") },
    { label: "Status properti", values: values(p => p.status ? listingLabels[p.status] : "Belum tersedia") },
    { label: "Fasilitas", values: values(p => [...p.facilities].sort().join(" · ") || "Belum diisi pemilik") },
    { label: "Deskripsi pemilik", values: values(p => p.description || "Belum diisi pemilik") },
    { label: "Skor prediksi AI", description: "Skor kecocokan lokasi dengan kebutuhan usaha, bukan persentase keberhasilan usaha.", values: values(p => `${scoreLabel(p)}. ${overallMeaning(p)}`) },
  ] : [];
  const visibleRows = differencesOnly ? rows.filter(row => new Set(row.values).size > 1) : rows;
  const insights = properties.map(businessInsights);
  const modelRows: ComparisonRow[] = properties.length > 0 ? businessInsights(properties[0]).map((insight, index) => {
    const factors = insights.map(items => items[index]);
    return {
      label: insight.title,
      values: factors.map(item => item.interpretation),
      notes: factors.map(item => `${item.evidence}. Langkah praktis: ${item.action}`),
    };
  }) : [];

  return (
    <main className="pencari-shell seeker-shell seeker-page-shell compare-page">
      <SeekerSidebar /><SeekerHeader />
      <section className="pencari-main">
        <div className="pencari-container compare-container" style={{ "--compare-columns": Math.max(properties.length, 1) } as CSSProperties}>
          <Link className="compare-back" href="/pencari/results"><Icon name="arrow-left" size={16} />Kembali ke hasil pencarian</Link>
          <header className="compare-intro">
            <div><p className="seeker-page-eyebrow">PERBANDINGAN PROPERTI</p><h1>Kenali pilihan properti Anda.</h1><p>Pahami biaya, peluang pasar, dan risiko setiap properti sebelum menentukan langkah usaha.</p></div>
            {!loading && !error && properties.length > 0 && <Link className="compare-secondary" href="/pencari/results">Ganti pilihan<Icon name="arrow-right" size={16} /></Link>}
          </header>

          {loading ? <div className="compare-state" role="status"><Icon name="building" size={32} /><h2>Menyiapkan analisis</h2><p>Sedang mengambil informasi properti pilihan Anda…</p></div>
            : missingSelection ? <div className="compare-state"><Icon name="building" size={36} /><h2>Pilih properti untuk mulai</h2><p>Tandai satu atau beberapa properti di hasil pencarian untuk melihat analisis dan membandingkan pilihan.</p><Link className="compare-primary" href="/pencari/results">Pilih properti<Icon name="arrow-right" size={16} /></Link></div>
            : error ? <div className="compare-state" role="alert"><Icon name="circle-help" size={36} /><h2>Perbandingan belum dapat dimuat</h2><p>{error}</p><div className="compare-state-actions"><button className="compare-primary" onClick={() => setAttempt(current => current + 1)}>Coba lagi</button><Link className="compare-secondary" href="/pencari/results">Kembali ke pencarian</Link></div></div>
            : <>
              <nav className="compare-report-nav" aria-label="Bagian analisis perbandingan"><a href="#analisis-bisnis">Ringkasan bisnis</a><a href="#grafik-radar">Grafik radar</a><a href="#analisis-swot">SWOT</a><a href="#faktor-lokasi">Peluang & risiko</a><a href="#simulasi-sewa">Perhitungan sewa</a><a href="#rencana-survei">Rencana survei</a></nav>
              {properties.length > 1 && <p className="compare-column-guide">Satu kolom untuk setiap properti, dengan urutan pilihan yang sama di setiap bagian. Geser ke samping jika seluruh kolom belum terlihat.</p>}
              <div className="compare-properties">{properties.map((property, index) => <PropertyCard property={property} index={index} key={property.id} />)}</div>
              <BusinessVerdict properties={properties} />
              <ComparisonRadar properties={properties} />
              <SwotComparison properties={properties} />
              <section className="compare-details compare-business-signals" id="faktor-lokasi" aria-labelledby="business-signals-title">
                <div className="compare-section-heading"><div><h2 id="business-signals-title">Apa arti faktor lokasi bagi usaha?</h2><p>Pahami pengaruh tiap faktor terhadap usaha dan apa yang perlu Anda periksa.</p></div></div>
                <p className="compare-model-note">Prediksi AI membantu menilai kecocokan lokasi. Skornya bukan jumlah pelanggan, perkiraan omzet, atau persentase keberhasilan usaha.</p>
                <ComparisonTable properties={properties} rows={modelRows} caption="Implikasi bisnis dari faktor lokasi" />
                <details className="compare-method"><summary>Bagaimana membaca analisis ini?</summary><p>Untuk tiap faktor: skor 70–100 dibaca sebagai mendukung, 40 hingga di bawah 70 perlu ditinjau, dan di bawah 40 perlu perhatian lebih. Pembagian ini membantu menjelaskan skor, bukan menentukan apakah usaha pasti layak. Penilaian potensi lokasi secara keseluruhan berasal dari hasil prediksi AI yang terpisah.</p><p>Jika data belum tersedia, faktor tersebut belum dapat dinilai. Skor nol berbeda dengan data yang belum tersedia dan tidak berarti usaha pasti gagal. SWOT merupakan analisis awal dari informasi properti dan prediksi AI; pastikan kesimpulannya melalui survei.</p></details>
              </section>
              <RentBusinessScenario properties={properties} />
              <section className="compare-details" aria-labelledby="compare-detail-heading">
                <div className="compare-section-heading"><div><h2 id="compare-detail-heading">Rincian properti pilihan Anda</h2><p>Informasi mengikuti data listing dari pemilik.</p></div><label className="compare-toggle"><input disabled={properties.length < 2} type="checkbox" checked={differencesOnly} onChange={event => setDifferencesOnly(event.target.checked)} />Hanya perbedaan</label></div>
                {visibleRows.length ? <ComparisonTable properties={properties} rows={visibleRows} caption="Perbandingan informasi properti" /> : <p className="compare-no-difference" role="status">Semua informasi pada tabel ini sama. Nonaktifkan “Hanya perbedaan” untuk melihat seluruh informasi.</p>}
              </section>
              <SurveyPlan />
              <div className="compare-next-actions">{properties.map((property, index) => <article key={property.id}><span>Pilihan {index + 1}</span><h3>{property.name}</h3><Link className="compare-primary" href={`/pencari/chat?listingId=${property.id}`}>Diskusikan & jadwalkan survei<Icon name="arrow-right" size={16} /></Link></article>)}</div>
              <p className="compare-footnote"><Icon name="circle-help" size={17} />Angka per bulan adalah pembagian sewa tahunan, bukan pilihan cicilan. Informasi properti perlu dikonfirmasi dengan pemilik.</p>
            </>}
        </div>
      </section>
    </main>
  );
}
