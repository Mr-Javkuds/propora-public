"use client";

import { useState } from "react";
import type { MlRecommendation } from "../../../lib/propora-ml-demo";
import { rupiah } from "../../../lib/marketplace-client";
import { buildSwot, overallMeaning, rentScenario, type SwotAnalysis, type RentAssumptions, surveySteps } from "./business-analysis";

const quadrants: { key: keyof SwotAnalysis; title: string; subtitle: string; letter: string }[] = [
  { key: "strengths", title: "Kekuatan", subtitle: "Kelebihan properti", letter: "S" },
  { key: "weaknesses", title: "Kelemahan", subtitle: "Keterbatasan properti", letter: "W" },
  { key: "opportunities", title: "Peluang", subtitle: "Potensi dari lingkungan usaha", letter: "O" },
  { key: "threats", title: "Ancaman", subtitle: "Faktor luar yang perlu diantisipasi", letter: "T" },
];

export function BusinessVerdict({ properties }: { properties: MlRecommendation[] }) {
  return (
    <section className="compare-business-section" id="analisis-bisnis" aria-labelledby="business-verdict-title">
      <div className="compare-analysis-heading"><p className="seeker-page-eyebrow">ARTINYA UNTUK USAHA ANDA</p><h2 id="business-verdict-title">Pilih berdasarkan prioritas usaha.</h2><p>Harga lebih rendah, ruang lebih luas, dan skor lebih tinggi menjawab kebutuhan yang berbeda.</p></div>
      <div className="compare-decision-grid">{properties.map((property, index) => <article key={property.id}><span className="compare-analysis-tag">Pilihan {index + 1}</span><h3>{property.name}</h3><p>Komitmen sewa {rupiah(property.price * 1_000_000)} per tahun untuk bangunan {property.building_area_m2} m². Pertimbangkan luas yang benar-benar dipakai, biaya renovasi, dan kemampuan usaha menutup biaya tetap.</p></article>)}</div>
      <div className="compare-decision-grid compare-cost-grid">{properties.map((property, index) => <article key={property.id}><span className="compare-analysis-tag">Pilihan {index + 1} · {property.name}</span><h3>{property.building_area_m2 > 0 ? `${rupiah(Math.round(property.price * 1_000_000 / property.building_area_m2))} / m² / tahun` : "Biaya per m² belum dapat dihitung"}</h3><p>{property.building_area_m2 > 0 ? "Biaya ruang membantu membandingkan harga untuk setiap meter bangunan. Nilai lebih rendah berarti sewa per luas lebih ringan, bukan otomatis lokasi lebih menguntungkan." : "Luas bangunan yang valid diperlukan untuk membandingkan efisiensi ruang."}</p><div className="compare-verdict-note"><strong>Kecocokan lokasi</strong><p>{overallMeaning(property)}</p></div></article>)}</div>
    </section>
  );
}

export function SwotComparison({ properties }: { properties: MlRecommendation[] }) {
  return (
    <section className="compare-business-section" id="analisis-swot" aria-labelledby="compare-swot-title">
      <div className="compare-analysis-heading"><p className="seeker-page-eyebrow">ANALISIS SWOT</p><h2 id="compare-swot-title">Kelebihan, celah, dan langkah antisipasi.</h2><p>Kekuatan dan kelemahan berasal dari perbandingan informasi properti yang dipilih. Peluang dan risiko merupakan perkiraan awal dari prediksi AI yang perlu diperiksa saat survei.</p></div>
      <div className="compare-swot-properties">{properties.map((property, index) => {
        const swot = buildSwot(property, properties.filter(item => item.id !== property.id));
        return <article className="compare-swot-property" key={property.id}><header><span>Pilihan {index + 1}</span><h3>{property.name}</h3></header><div className="compare-swot-grid">{quadrants.map(quadrant => <section className={`compare-swot-quadrant is-${quadrant.key}`} key={quadrant.key}><h4><span>{quadrant.letter}</span>{quadrant.title}</h4><p className="compare-swot-subtitle">{quadrant.subtitle}</p><ul>{swot[quadrant.key].map(point => <li key={point.title}><strong>{point.title}</strong><p>{point.detail}</p><small>Dasar: {point.source}</small></li>)}</ul></section>)}</div></article>;
      })}</div>
    </section>
  );
}

export function RentBusinessScenario({ properties, onAssumptionsChange }: { properties: MlRecommendation[]; onAssumptionsChange?: (value: RentAssumptions | null) => void }) {
  const [ticket, setTicket] = useState("");
  const [margin, setMargin] = useState("");
  const [days, setDays] = useState("");
  function emitAssumptions(nextTicket: string, nextMargin: string, nextDays: string) {
    const assumptions = { ticket: Number(nextTicket), margin: Number(nextMargin), days: Number(nextDays) };
    onAssumptionsChange?.(rentScenario(0, assumptions.ticket, assumptions.margin, assumptions.days) ? assumptions : null);
  }
  const hasInput = ticket !== "" || margin !== "" || days !== "";
  const valid = rentScenario(0, Number(ticket), Number(margin), Number(days)) !== null;
  return (
    <section className="compare-business-section compare-scenario" id="simulasi-sewa" aria-labelledby="rent-scenario-title">
      <div className="compare-analysis-heading"><p className="seeker-page-eyebrow">PERHITUNGAN BIAYA TEMPAT</p><h2 id="rent-scenario-title">Berapa penjualan untuk menutup sewa saja?</h2><p>Masukkan asumsi usaha Anda agar biaya sewa lebih mudah dipahami dalam target transaksi.</p></div>
      <div className="compare-scenario-inputs">
        <label>Nilai rata-rata transaksi (Rp)<input type="number" min="1" placeholder="Contoh: 25000" value={ticket} onChange={event => { setTicket(event.target.value); emitAssumptions(event.target.value, margin, days); }} /></label>
        <label>Margin kotor (%)<input type="number" min="0.1" max="100" step="any" placeholder="Contoh: 50" value={margin} onChange={event => { setMargin(event.target.value); emitAssumptions(ticket, event.target.value, days); }} /><small>Bagian penjualan setelah biaya langsung produk, sebelum sewa dan biaya operasional lain.</small></label>
        <label>Hari buka per bulan<input type="number" min="1" max="31" placeholder="Contoh: 26" value={days} onChange={event => { setDays(event.target.value); emitAssumptions(ticket, margin, event.target.value); }} /></label>
      </div>
      <div className="compare-scenario-results" aria-live="polite">{valid ? properties.map((property, index) => {
        const result = rentScenario(property.price * 1_000_000, Number(ticket), Number(margin), Number(days));
        if (!result) return null;
        return <article key={property.id}><span>Pilihan {index + 1} · {property.name}</span><h3>{result.dailyTransactions} transaksi / hari buka</h3><p>Setara penjualan {rupiah(Math.ceil(result.monthlySales))} per bulan untuk menghasilkan margin kotor yang menutup sewa.</p></article>;
      }) : <p className="compare-scenario-placeholder">{hasInput ? "Lengkapi seluruh asumsi: transaksi di atas Rp0, margin lebih dari 0–100%, dan 1–31 hari buka (bilangan bulat)." : "Isi ketiga asumsi untuk melihat kebutuhan transaksi masing-masing properti. Belum ada proyeksi yang dihitung."}</p>}</div>
      <p className="compare-scenario-formula">Cara hitung: sewa tahunan ÷ 12 ÷ margin kotor ÷ nilai transaksi ÷ hari buka. Transaksi dibulatkan ke atas.</p>
      <p className="compare-scenario-limit"><strong>Belum merupakan titik impas usaha.</strong> Hasil belum menutup gaji, listrik, pemasaran, pajak, penyusutan, dan biaya lainnya. Perhitungan ini berdasarkan asumsi Anda, bukan prediksi omzet atau waktu balik modal.</p>
    </section>
  );
}



export function SurveyPlan() {
  return <section className="compare-business-section compare-survey" id="rencana-survei" aria-labelledby="compare-survey-title"><div className="compare-analysis-heading"><p className="seeker-page-eyebrow">LANGKAH BERIKUTNYA</p><h2 id="compare-survey-title">Bawa empat pertanyaan ini saat survei.</h2><p>Omzet aktual, jumlah pelanggan, pangsa pasar, dan waktu balik modal belum tersedia. Gunakan survei untuk melengkapi keputusan.</p></div><ol>{surveySteps.map(step => <li key={step.title}><h3>{step.title}</h3><p>{step.detail}</p></li>)}</ol></section>;
}
