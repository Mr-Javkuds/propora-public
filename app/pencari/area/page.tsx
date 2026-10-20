"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "../../components/ui/icons";
import { SeekerHeader, SeekerSidebar } from "../../components/seeker-navigation";
import type { MlRecommendation } from "../../lib/propora-ml-demo";
import { api } from "../../lib/marketplace-client";
import { localMlContext, persistPencariDraft } from "../../lib/pencari-draft-client";
import "../pencari.css";
import "../pencari-steps.css";
import { PencariIntro, PencariStepper } from "../pencari-progress";


type PencariData = {
  initialCapital?: number;
  businessType?: string;
  subCategory?: string;
  businessName?: string;
  budget?: { min?: number; max?: number };
  targets?: string[];
  operationalHours?: { open?: string; close?: string };
};



const mapEmbedUrl =
  "https://www.google.com/maps?q=-6.9827,110.4091&z=15&output=embed";

const toRadiusMeters = (value: string) => {
  if (value.includes("500")) return 500;
  const numeric = Number(value.replace(/[^\d]/g, ""));
  return Number.isFinite(numeric) && numeric > 0 ? numeric * 1000 : 2000;
};

export default function AreaPage() {
  const router = useRouter();
  const [pencariData, setPencariData] = useState<PencariData | null>(null);
  const [saveError, setSaveError] = useState("");
  const [radius, setRadius] = useState("2 km");
  const [areaMode, setAreaMode] = useState("Dekat kampus");
  const [filters, setFilters] = useState<string[]>([]);
  const [matches,setMatches] = useState<MlRecommendation[]>([]);
  const [facilityOptions,setFacilityOptions] = useState<string[]>([]);
  const [loading,setLoading] = useState(true);
  const [loadError,setLoadError] = useState("");
  useEffect(()=>{
    const controller=new AbortController();
    const load=async()=>{try{
      setLoading(true);
      const data=await api<{recommendations:MlRecommendation[]}>("/api/ml/recommendations",{method:"POST",body:JSON.stringify({...localMlContext(),budgetMin:pencariData?.budget?.min,budgetMax:pencariData?.budget?.max,radiusMeters:toRadiusMeters(radius),center:{lat:-6.9827,lng:110.4091,label:"Kawasan Kampus UDINUS, Semarang Tengah"}}),signal:controller.signal});
      if(!controller.signal.aborted){setMatches(data.recommendations);setFacilityOptions([...new Set(data.recommendations.flatMap(item=>item.facilities))]);setLoadError("");}
    }catch(error){if(!controller.signal.aborted){setMatches([]);setLoadError(error instanceof Error ? error.message : "Data area gagal dimuat.");}}finally{if(!controller.signal.aborted)setLoading(false);}};
    void load();return()=>controller.abort();
  },[radius,pencariData]);
  const demoMatches=matches.filter(item=>filters.every(filter=>item.facilities.includes(filter)));

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = localStorage.getItem("proporaWizardData");
        if (saved) setPencariData(JSON.parse(saved));
        const area = JSON.parse(localStorage.getItem("proporaAreaSearch") || "null");
        if (area) { if (area.radius) setRadius(area.radius); if (area.areaMode) setAreaMode(area.areaMode); if (Array.isArray(area.filters)) setFilters(area.filters); }
      } catch {
        setPencariData(null);
      }
    });
  }, []);

  const summary = useMemo(() => {
    const budgetMin = pencariData?.budget?.min ?? 30;
    const budgetMax = pencariData?.budget?.max ?? 80;
    const targets =
      pencariData?.targets?.join(", ") ?? "Belum diisi";
    const open = pencariData?.operationalHours?.open ?? "—";
    const close = pencariData?.operationalHours?.close ?? "—";

    return {
      businessType: pencariData?.businessType ?? "Belum diisi",
      businessName: pencariData?.businessName ?? "Belum diisi",
      subCategory: pencariData?.subCategory ?? "Belum diisi",
      budget: pencariData?.budget ? `Rp ${budgetMin} Jt - ${budgetMax} Jt / th` : "Belum diisi",
      capital: pencariData?.initialCapital ? `Rp ${pencariData.initialCapital.toLocaleString("id-ID")}` : "Belum diisi",
      targets,
      hours: `${open} - ${close}`,
    };
  }, [pencariData]);

  const toggleFilter = (filter: string) => {
    setFilters((current) =>
      current.includes(filter)
        ? current.filter((item) => item !== filter)
        : [...current, filter]
    );
  };

  const handleContinue = async () => {
    localStorage.setItem(
      "proporaAreaSearch",
      JSON.stringify({
        center: "Kawasan Kampus UDINUS, Semarang Tengah",
        coordinates: [-6.9827, 110.4091],
        radius,
        areaMode,
        filters,
        matches: demoMatches.length,
        radiusMeters: toRadiusMeters(radius),
        mlInput: localMlContext(),
      })
    );
    try { await persistPencariDraft(); } catch { setSaveError("Draf belum tersimpan. Silakan coba lagi."); return; }
    router.push("/pencari/results");
  };

  return (
    <main className="pencari-shell pencari-steps-shell seeker-shell pencari-business-step">
      {saveError && <p role="alert">{saveError}</p>}{loadError && <p role="alert">{loadError}</p>}
      <SeekerSidebar />
      <SeekerHeader />

      <section className="pencari-main stage-three">
        <div className="pencari-container">
          <PencariIntro
            activeStep={3}
            title="Tentukan Area Pencarian"
            description="Pilih titik pusat, radius, dan filter lokasi agar Propora AI hanya mencari properti yang relevan untuk kebutuhan bisnis Anda."
          />

          <PencariStepper activeStep={3} />

          <div className="area-grid">
            <section className="pencari-card area-canvas">
              <div className="section-kicker">
                <span>LANGKAH 03 DARI 03</span>
                <small>• Lokasi & jangkauan pencarian</small>
              </div>

              <h2>Tentukan Area Pencarian</h2>
              <p className="section-copy">
                Pencarian memakai titik pusat UDINUS yang dipilih di bawah. Hasil berasal dari listing tersedia di database; skor menggunakan hasil prediksi AI tersimpan.
              </p>

              <div className="map-toolbar">
                <label className="business-search map-search">
                  <span>
                    <Icon name="search" size={17} />
                  </span>
                  <input value="Kawasan Kampus UDINUS, Semarang Tengah" readOnly />
                </label>
                <button type="button" className="quiet-button compact" disabled title="Pemilihan lokasi perangkat belum tersedia">
                  <Icon name="locate" size={17} /> Gunakan Lokasi Saya
                </button>
              </div>

              <div className="demo-map" aria-label="Peta area Semarang Tengah">
                <iframe
                  title="Google Maps kawasan UDINUS Semarang"
                  src={mapEmbedUrl}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
                <div className="map-glass" />
                <span className="radius-ring" />
                <span className="center-pin">
                  <Icon name="locate" size={18} />
                </span>
                <div className="map-layer-control">
                  <button type="button" className="active">
                    Map
                  </button>
                  <button type="button" disabled>Satellite</button>
                </div>
              </div>

              <div className="coordinate-strip">
                <span>Koordinat pusat: -6.9827, 110.4091</span>
                <strong>Titik pusat pencarian terpilih</strong>
              </div>

              <div className="area-controls">
                <ControlBlock title="Titik Pusat Pencarian">
                  {["Dekat kampus"].map((item) => (
                    <button
                      type="button"
                      className={areaMode === item ? "active" : ""}
                      key={item}
                      onClick={() => setAreaMode(item)}
                    >
                      {item}
                    </button>
                  ))}
                </ControlBlock>

                <ControlBlock title="Jangkauan pencarian">
                  {["500 m", "1 km", "2 km", "5 km"].map((item) => (
                    <button
                      type="button"
                      className={radius === item ? "active" : ""}
                      key={item}
                      onClick={() => setRadius(item)}
                    >
                      {item}
                    </button>
                  ))}
                </ControlBlock>

                <ControlBlock title="Filter Lokasi Prioritas">
                  {[...new Set([...facilityOptions,...filters])].map((item) => (
                    <button
                      type="button"
                      className={filters.includes(item) ? "active" : ""}
                      key={item}
                      onClick={() => toggleFilter(item)}
                    >
                      {item}
                    </button>
                  ))}
                </ControlBlock>
              </div>

              <section className="match-panel">
                <div>
                  <small>HASIL PENCARIAN DATABASE</small>
                  <strong>{loading ? "Memuat hasil…" : loadError ? "Hasil belum tersedia" : `${demoMatches.length} properti tersedia dalam radius ${radius}`}</strong>
                </div>
                <div className="match-metrics">
                  <span>
                    <b>Propora score</b> Target ranking
                  </span>
                  <span>
                    <b>{toRadiusMeters(radius)} m</b> Jangkauan pencarian
                  </span>
                  <span>
                    <b>{!loading && !loadError && demoMatches[0]?.propora_score != null ? `${Math.round(demoMatches[0].propora_score ?? 0)}/100` : "—"}</b> Skor tertinggi
                  </span>
                </div>
              </section>

              <div className="pencari-actions">
                <button
                  type="button"
                  className="quiet-button"
                  onClick={() => router.push("/pencari/budget")}
                >
                  <Icon name="arrow-left" size={17} /> Kembali
                </button>
                <button type="button" className="primary-button" disabled={loading || !!loadError} onClick={handleContinue}>
                  Lihat {demoMatches.length} Properti yang Cocok <Icon name="arrow-right" size={17} />
                </button>
              </div>
            </section>

            <aside className="stage-summary">
              <AreaSummary summary={summary} />

              <section className="pencari-card insight-card rose">
                <h3>
                  <Icon name="sparkles" size={17} /> Insight AI Area
                </h3>
                <p>
                  Hasil mengikuti radius, anggaran, dan fasilitas yang dipilih. Prediksi AI menggunakan data pendukung dan perlu divalidasi melalui survei.
                </p>
              </section>

              <section className="pencari-card match-distribution">
                <div className="factor-title">
                  <h3>
                    <Icon name="bar-chart" size={17} /> Distribusi Kecocokan
                  </h3>
                  <span>{loading || loadError ? "—" : `${demoMatches.length} Lokasi`}</span>
                </div>
                {!loading && !loadError && [
                  ["Potensi tinggi",demoMatches.filter(item=>item.mlStatus==="ready" && item.potential_label==="tinggi").length],
                  ["Potensi sedang",demoMatches.filter(item=>item.mlStatus==="ready" && item.potential_label==="sedang").length],
                  ["Potensi rendah",demoMatches.filter(item=>item.mlStatus==="ready" && item.potential_label==="rendah").length],
                  ["Belum dianalisis",demoMatches.filter(item=>item.mlStatus!=="ready").length],
                ].map(([label,count])=>[label,`${count} properti`,`${demoMatches.length ? Number(count)/demoMatches.length*100 : 0}%`]).map(([label, count, width]) => (
                  <div className="distribution-row" key={label}>
                    <div>
                      <strong>{label}</strong>
                      <span>{count}</span>
                    </div>
                    <i style={{ width }} />
                  </div>
                ))}
              </section>
            </aside>
          </div>

          {!loading && !loadError && demoMatches.length === 0 && (
          <section className="pencari-card state-preview">
            <div className="preview-head">
              <div>
                <span>HASIL PENCARIAN KOSONG</span>
                <strong>Belum ada properti yang sesuai</strong>
              </div>
              <em>Periksa filter area</em>
            </div>
            <p>
              Perluas jangkauan pencarian atau kurangi filter untuk menemukan lebih banyak pilihan properti.
            </p>
            <div className="preview-strip">
              <div className="preview-status">ⓘ 0 properti ditemukan pada radius {radius}</div>
              <button type="button" onClick={()=>{setRadius("5 km");setFilters([]);}}>Perluas radius ke 5 km</button>
              <button disabled>Jalankan Analisis Area</button>
              <div className="preview-summary">
                Koordinat aktif: <b>-6.9827, 110.4091</b>
              </div>
            </div>
          </section>
          )}
        </div>
      </section>
    </main>
  );
}

function ControlBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="control-block">
      <strong>{title}</strong>
      <div>{children}</div>
    </div>
  );
}

type AreaSummaryData = {
  businessType: string;
  businessName: string;
  subCategory: string;
  budget: string;
  capital: string;
  targets: string;
  hours: string;
};

function AreaSummary({ summary }: { summary: AreaSummaryData }) {
  const rows = [
    ["Jenis Usaha", summary.businessType],
    ["Sub-kategori", summary.subCategory],
    ["Nama Bisnis", summary.businessName],
    ["Anggaran sewa Anda", summary.budget],
    ["Modal Awal", summary.capital],
    ["Target Pelanggan", summary.targets],
    ["Operasional", summary.hours],
  ];

  return (
    <section className="pencari-card need-summary">
      <div className="summary-title">
        <h3>
          <Icon name="database" size={17} /> Ringkasan Kebutuhan
        </h3>
        <span>Langkah 3 dari 3</span>
      </div>
      {rows.map(([label, value]) => (
        <div className="summary-line" key={label}>
          <span>{label}</span>
          <strong className="filled">{value}</strong>
        </div>
      ))}
    </section>
  );
}
