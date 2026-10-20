"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import type { MlRecommendation } from "../lib/propora-ml-demo";
import { businessInsights, type RentAssumptions } from "../pencari/area/compare/business-analysis";
import { BusinessVerdict, RentBusinessScenario, SurveyPlan, SwotComparison } from "../pencari/area/compare/business-analysis-panel";
import ComparisonRadar from "../pencari/area/compare/comparison-radar";
import "../pencari/area/compare/compare.css";
import "./property-business-report.css";

export default function PropertyBusinessReport({ property }: { property: MlRecommendation }) {
  const [assumptions, setAssumptions] = useState<RentAssumptions | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  async function downloadPdf() {
    setDownloading(true);
    setDownloadError("");
    try {
      const { createPropertyAnalysisPdf } = await import("../lib/property-analysis-pdf");
      const bytes = await createPropertyAnalysisPdf(property, assumptions, window.location.href);
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `Propora-Analisis-${property.id}-${property.name.replace(/[^a-zA-Z0-9]+/g, "-").slice(0, 60)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setDownloadError("PDF belum dapat dibuat. Silakan coba unduh kembali.");
    } finally { setDownloading(false); }
  }

  return <section className="compare-container pd-business-report" id="laporan-lengkap" aria-label="Laporan analisis bisnis lengkap">
    <header className="pd-report-heading"><div><p className="pd-eyebrow">LAPORAN LENGKAP</p><h2>Kenali potensi dan risiko sebelum menyewa.</h2><p>Analisis mandiri untuk {property.name}, menggunakan sumber penilaian yang sama dengan halaman perbandingan.</p></div><button className="compare-primary" type="button" disabled={downloading} onClick={downloadPdf}><Download size={17} />{downloading ? "Menyiapkan PDF…" : "Unduh laporan PDF"}</button></header>
    {downloadError && <p className="pd-notice" role="alert">{downloadError}</p>}
    <nav className="compare-report-nav" aria-label="Bagian laporan analisis"><a href="#analisis-bisnis">Ringkasan bisnis</a><a href="#grafik-radar">Grafik radar</a><a href="#analisis-swot">SWOT</a><a href="#faktor-lokasi">Faktor lokasi</a><a href="#simulasi-sewa">Perhitungan sewa</a><a href="#rencana-survei">Rencana survei</a></nav>
    <BusinessVerdict properties={[property]} />
    <ComparisonRadar properties={[property]} />
    <SwotComparison properties={[property]} />
    <section className="compare-business-section" id="faktor-lokasi" aria-labelledby="pd-factors-heading"><div className="compare-analysis-heading"><p className="pd-eyebrow">ARTI ANGKA BAGI USAHA</p><h2 id="pd-factors-heading">Apa pengaruh tiap faktor terhadap usaha Anda?</h2><p>Skor prediksi AI bukan jumlah pengunjung, perkiraan omzet, atau persentase keberhasilan usaha. Setiap penjelasan disertai tindakan untuk survei.</p></div><div className="pd-report-factors">{businessInsights(property).map(insight => <article key={insight.key}><span className={`pd-factor-tag is-${insight.tone}`}>{insight.evidence}</span><h3>{insight.title}</h3><p>{insight.interpretation}</p><div><strong>Yang perlu dilakukan</strong><p>{insight.action}</p></div></article>)}</div></section>
    <RentBusinessScenario properties={[property]} onAssumptionsChange={setAssumptions} />
    <p className="pd-report-download-note">PDF memuat tabel SWOT, navigasi antarbagian, serta checklist dan catatan survei yang bisa diisi pada pembaca PDF yang mendukung formulir. Simpan ulang PDF setelah mengisi. Asumsi dan hasil perhitungan sewa yang sudah diisi juga ikut masuk; isian yang belum lengkap ditandai belum dihitung.</p>
    <SurveyPlan />
  </section>;
}
