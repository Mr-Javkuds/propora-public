"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Heart,
  HeartFill,
  Search,
  User,
  X,
} from "../../components/ui/next-icons";
import { SeekerHeader, SeekerSidebar } from "../../components/seeker-navigation";
import {
  type MlRecommendation,
  type MlRecommendationRequest,
} from "../../lib/propora-ml-demo";
import "./results.css";
import ResultsMap from "./results-map";
import { localMlContext, persistPencariDraft } from "../../lib/pencari-draft-client";

type Property = MlRecommendation & {
  score: number | null;
  footfall: string;
  status: MlRecommendation["status"];
  monthly: string;
  area: string;
  market: string;
  competition: string;
  access: string;
  campus: string;
  payback: string;
  model: string;
  badge: string;
};

type MlApiResponse = {
  recommendations?: MlRecommendation[];
};

const toProperty = (item: MlRecommendation): Property => ({
  ...item,
  score: item.propora_score == null ? null : Math.round(item.propora_score ?? 0),
  footfall: item.foot_traffic_score == null ? "Belum tersedia" : `Skor keramaian ${Math.round(item.foot_traffic_score ?? 0)}/100`,
  status: item.status,
  monthly: `≈ Rp ${(item.price / 12).toLocaleString("id-ID", { maximumFractionDigits: 2 })} jt / bln`,
  area: `${item.building_area_m2} m² / ${item.kecamatan}`,
  market: item.demand_score == null ? "Belum tersedia" : `Skor peluang pelanggan ${Math.round(item.demand_score ?? 0)}/100`,
  competition: item.competition_opportunity_score == null ? "Belum tersedia" : `Skor peluang bersaing ${Math.round(item.competition_opportunity_score ?? 0)}/100`,
  access: item.accessibility_score == null ? "Belum tersedia" : `Skor kemudahan akses ${Math.round(item.accessibility_score ?? 0)}/100`,
  campus: "Jarak fasilitas belum tersedia",
  payback: "Bahan pertimbangan, bukan perkiraan waktu balik modal",
  model:
    item.potential_label === "tinggi"
      ? "Layak diprioritaskan untuk survei"
      : "Perlu diperiksa saat survei",
  badge: `Rank #${item.rank}`,
});


const toRadiusMeters = (value?: string) => {
  const numeric = Number.parseFloat(value?.replace(",", ".") ?? "");
  return Number.isFinite(numeric) && numeric > 0
    ? numeric * (value?.includes("km") ? 1000 : 1)
    : 2000;
};

export default function ResultsPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [minArea, setMinArea] = useState(0);
  const [facility, setFacility] = useState("");
  const [sort, setSort] = useState("score");
  const [focusedMapId, setFocusedMapId] = useState<number | null>(null);
  const [priceLimit, setPriceLimit] = useState(0);
  const [radius, setRadius] = useState(0);
  const [filtersReady, setFiltersReady] = useState(false);
  const [center, setCenter] = useState({lat: -6.9827, lng: 110.4091, label: "Kawasan Kampus UDINUS, Semarang Tengah"});
  const visibleProperties = properties.filter(property =>
    `${property.name} ${property.address}`.toLowerCase().includes(query.toLowerCase()) &&
    property.building_area_m2 >= minArea &&
    (!facility || property.facilities.some(item => item.toLowerCase().includes(facility.toLowerCase())))
  ).sort((a,b) => sort === "price" ? a.price - b.price : sort === "area" ? b.building_area_m2 - a.building_area_m2 : (b.score ?? -1) - (a.score ?? -1));
  const focusedMapProperty = visibleProperties.find(property => property.id === focusedMapId);

  function focusPropertyOnMap(property: Property) {
    setFocusedMapId(property.id);
    if (window.matchMedia("(max-width: 980px)").matches) {
      document.getElementById("peta-ruko")?.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }
  const [searchRevision, setSearchRevision] = useState(0);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [favoriteError, setFavoriteError] = useState("");
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const selectedProperties = selectedIds
    .map((id) => properties.find((property) => property.id === id))
    .filter((property): property is Property => Boolean(property));

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const key = `proporaResultFilters:${localStorage.getItem("proporaDraftAccount") ?? "guest"}`;
        const saved = JSON.parse(sessionStorage.getItem(key) || "{}");
        if ([0, 50, 80, 150, 500].includes(saved.priceLimit)) setPriceLimit(saved.priceLimit);
        if ([0, 500, 2000, 5000, 10000].includes(saved.radius)) setRadius(saved.radius);
      } catch { /* Invalid session filters fall back to the saved pencari preferences. */ }
      setFiltersReady(true);
    });
  }, []);

  useEffect(() => {
    if (!filtersReady) return;
    const controller = new AbortController();
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setLoading(true);
      setLoadError("");
      try {
        sessionStorage.setItem(`proporaResultFilters:${localStorage.getItem("proporaDraftAccount") ?? "guest"}`, JSON.stringify({priceLimit, radius}));
        const savedCompare = localStorage.getItem("proporaCompareIds");
        const pencariData = JSON.parse(
          localStorage.getItem("proporaWizardData") ?? "{}"
        );
        const areaSearch = JSON.parse(
          localStorage.getItem("proporaAreaSearch") ?? "{}"
        );
        if (savedCompare) {
          const parsed = JSON.parse(savedCompare);
          if (Array.isArray(parsed)) setSelectedIds(parsed.filter((id): id is number => Number.isInteger(id)));
        }

        const payload: MlRecommendationRequest = {
          ...localMlContext(),
          locationFilters: areaSearch.filters ?? [],
          budgetMin: pencariData.budget?.min,
          budgetMax: priceLimit || pencariData.budget?.max,
          radiusMeters: radius || toRadiusMeters(areaSearch.radius),
          center: {
            lat: areaSearch.coordinates?.[0] ?? -6.9827,
            lng: areaSearch.coordinates?.[1] ?? 110.4091,
            label: areaSearch.center ?? "Kawasan Kampus UDINUS, Semarang Tengah",
          },
        };
        setCenter(payload.center!);

        fetch("/api/ml/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]),
        })
          .then(async response => {
            const data = await response.json();
            if (!response.ok || !Array.isArray(data.recommendations)) throw new Error(data.error || "Data rekomendasi tidak valid.");
            return data as MlApiResponse;
          })
          .then((data) => {
            if (controller.signal.aborted) return;
            if (Array.isArray(data.recommendations)) {
              const nextProperties = data.recommendations.map(toProperty);
              setProperties(nextProperties);
              setSelectedIds(current => {
                const available = new Set(nextProperties.map(property => property.id));
                const next = current.filter(id => available.has(id));
                localStorage.setItem("proporaCompareIds", JSON.stringify(next));
                return next;
              });
              localStorage.setItem(
                "proporaMlRecommendations",
                JSON.stringify(nextProperties)
              );
            }
          })
          .catch(() => {
            if (controller.signal.aborted) return;
            setProperties([]);
            setLoadError("Data belum dapat dimuat. Silakan coba lagi.");
          }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
      } catch {
        setLoading(false);
        setLoadError("Preferensi pencarian tidak valid. Atur ulang kebutuhan bisnis Anda.");
      }
    });
    return () => controller.abort();
  }, [searchRevision, priceLimit, radius, filtersReady]);

  useEffect(() => {
    let cancelled = false;
    async function loadFavorites() {
      try {
        const session = await fetch("/api/auth/session", { cache: "no-store" }).then(response => response.json());
        if (session.user?.role !== "pencari") return;
        const pending = sessionStorage.getItem("proporaPendingFavorite");
        const response = pending
          ? await fetch("/api/pencari/favorites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: Number(pending), saved: true }) })
          : await fetch("/api/pencari/favorites", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (pending) sessionStorage.removeItem("proporaPendingFavorite");
        if (!cancelled) setFavorites(data.ids);
      } catch { if (!cancelled) setFavoriteError("Favorit belum dapat dimuat. Coba muat ulang halaman."); }
    }
    void loadFavorites();
    return () => { cancelled = true; };
  }, []);

  const openDetail = (property: Property) => {
    localStorage.setItem(
      "selectedBookingProperty",
      JSON.stringify({
        id: property.id,
        name: property.shortName,
        address: property.address,
        price: property.price,
        score: property.score,
        image: property.image,
        distance: property.distance,
        footfall: property.footfall,
        status: property.status,
        facilities: property.facilities,
        monthly: property.monthly,
        area: property.area,
        market: property.market,
        competition: property.competition,
        access: property.access,
        campus: property.campus,
        payback: property.payback,
        model: property.model,
        badge: property.badge,
        mlSignals: {
          propora_score: property.propora_score,
          potential_label: property.potential_label,
          top_positive_drivers: property.top_positive_drivers,
          main_risk_drivers: property.main_risk_drivers,
          latitude: property.latitude,
          longitude: property.longitude,
        },
      })
    );
    router.push(`/pencari/results/${property.id}/analysis`);
  };

  const toggleFavorite = async (id: number) => {
    if (savingFavorite) return;
    setSavingFavorite(true);
    setFavoriteError("");
    try {
      const response = await fetch("/api/pencari/favorites", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, saved: !favorites.includes(id) }),
      });
      if (response.status === 401) {
        sessionStorage.setItem("proporaPendingFavorite", String(id));
        setShowLoginPrompt(true);
        return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setFavorites(data.ids);
    } catch { setFavoriteError("Favorit gagal disimpan. Silakan coba lagi."); }
    finally { setSavingFavorite(false); }
  };

  const toggleCompare = (id: number) => {
    setSelectedIds((current) => {
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];

      localStorage.setItem("proporaCompareIds", JSON.stringify(next));
      return next;
    });
  };

  const goCompare = async () => {
    if (selectedProperties.length === 0) return;

    const compared = selectedProperties.map((property) => ({
      ...property,
      name: property.shortName,
    }));
    localStorage.setItem("compareProperties", JSON.stringify(compared));
    try { await persistPencariDraft(); } catch { setFavoriteError("Pilihan perbandingan belum tersimpan."); return; }
    router.push("/pencari/area/compare");
  };

  const clearCompare = () => {
    setSelectedIds([]);
    localStorage.setItem("proporaCompareIds", JSON.stringify([]));
  };

  return (
    <main className="results-shell">
      <SeekerSidebar />
      <SeekerHeader />

      <section className="results-left">
        <div className="results-intro">
          <div><p>RUANG UNTUK USAHA ANDA</p><h1>Temukan properti yang cocok</h1></div>
          <button type="button" onClick={() => router.push("/pencari")}>Ubah kebutuhan</button>
          <a className="results-show-map" href="#peta-ruko">Lihat peta ↓</a>
          <span>{center.label}</span>
        </div>
        <div className="results-search">
          <Search size={16} />
          <input aria-label="Cari nama atau alamat properti" placeholder="Cari nama atau alamat properti" value={query} onChange={event => setQuery(event.target.value)} />
          <button aria-label="Hapus pencarian" type="button" onClick={() => setQuery("")}>
            <X size={14} />
          </button>
        </div>

        <details className="results-filter-panel">
          <summary><span>Filter pencarian</span><small>{[priceLimit, minArea, radius, facility].filter(Boolean).length ? `${[priceLimit, minArea, radius, facility].filter(Boolean).length} filter aktif` : "Harga, luas, radius & fasilitas"}</small></summary>
        <div className="results-filters">
          <label>
            Harga
            <select aria-label="Batas harga tahunan" value={priceLimit} onChange={event => setPriceLimit(Number(event.target.value))}>
              <option value={0}>Sesuai anggaran</option>
              <option value={50}>≤ Rp 50 jt</option>
              <option value={80}>≤ Rp 80 jt</option>
              <option value={150}>≤ Rp 150 jt</option>
              <option value={500}>≤ Rp 500 jt</option>
            </select>
          </label>
          <label>Luas<select aria-label="Luas minimum" value={minArea} onChange={event => setMinArea(Number(event.target.value))}><option value={0}>Semua luas</option><option value={50}>≥ 50 m²</option><option value={100}>≥ 100 m²</option><option value={200}>≥ 200 m²</option></select></label>
          <label>Radius<select aria-label="Radius pencarian" value={radius} onChange={event => setRadius(Number(event.target.value))}><option value={0}>Sesuai area</option><option value={500}>500 m</option><option value={2000}>2 km</option><option value={5000}>5 km</option><option value={10000}>10 km</option></select></label>
          <label>Fasilitas<select aria-label="Filter fasilitas" value={facility} onChange={event => setFacility(event.target.value)}><option value="">Semua fasilitas</option><option>Parkir</option><option>PDAM</option><option>Listrik</option></select></label>
          <button type="button" onClick={() => { setMinArea(0); setFacility(""); setPriceLimit(0); setRadius(0); }}>Reset filter</button>
        </div>
        </details>

        <div className="results-meta">
          <p>
            {loading ? "Mencari properti…" : <><b>{visibleProperties.length}</b> properti ditemukan</>}
          </p>
          <div>
            <span>Urutkan:</span>
            <select aria-label="Urutkan properti" value={sort} onChange={event => setSort(event.target.value)}><option value="score">Skor Tertinggi</option><option value="price">Harga Terendah</option><option value="area">Luas Terbesar</option></select>
          </div>
        </div>

        <div className="results-cards" aria-busy={loading}>
          {loading && <p role="status">Memuat rekomendasi properti…</p>}
          {loadError && <div role="alert"><p>{loadError}</p><button onClick={() => setSearchRevision(value => value + 1)}>Coba lagi</button><button onClick={() => router.push("/pencari")}>Atur kebutuhan</button></div>}
          {!loading && !loadError && !visibleProperties.length && <div><h2>Belum ada properti yang sesuai</h2><p>Perluas area, naikkan anggaran, atau hapus filter.</p><button onClick={() => setRadius(5000)}>Perbesar radius ke 5 km</button><button onClick={() => setPriceLimit(150)}>Batas anggaran Rp 150 jt</button><button onClick={() => { setQuery(""); setFacility(""); setMinArea(0); setRadius(0); setPriceLimit(0); }}>Reset filter</button></div>}
          {!loading && !loadError && visibleProperties.map((property) => (
            <article
              className={`figma-property-card ${
                selectedIds.includes(property.id) ? "selected compare-selected" : ""
              } ${focusedMapProperty?.id === property.id ? "map-focused" : ""}`}
              onClick={event => {
                if (!(event.target as HTMLElement).closest("button, input, label, a")) focusPropertyOnMap(property);
              }}
              key={property.id}
            >
              <button
                className="figma-card-image"
                aria-label={`Tampilkan lokasi ${property.shortName} di peta`}
                aria-pressed={focusedMapProperty?.id === property.id}
                onClick={() => focusPropertyOnMap(property)}
                style={{ backgroundImage: `url(${property.image})` }}
                type="button"
              >
                <span className="available-dot">{property.status === "available" ? "Tersedia" : "Status berubah"}</span>
              </button>
              <button
                aria-label={`${favorites.includes(property.id) ? "Hapus favorit" : "Favoritkan"} ${property.shortName}`}
                aria-pressed={favorites.includes(property.id)}
                disabled={savingFavorite}
                className={`favorite-bubble ${favorites.includes(property.id) ? "active" : ""}`}
                onClick={() => toggleFavorite(property.id)}
                type="button"
              >
                {favorites.includes(property.id) ? <HeartFill size={18} /> : <Heart size={18} />}
              </button>
              <div className="result-card-details">
                <div className="result-card-heading">
                  <h2>{property.shortName}</h2>
                  <span className="result-score">{property.score == null ? "Analisis belum tersedia" : `Skor prediksi AI ${property.score}/100`}</span>
                </div>
                {property.image.startsWith("/figma/") && <small>Foto</small>}<p className="result-address">{property.address}</p><small>{property.mlStatus === "ready" ? "Skala 0–100 · bukan persentase keberhasilan usaha · perlu survei" : "Analisis belum tersedia"}</small>
                <p className="result-price"><strong>Rp {property.price.toLocaleString("id-ID")} jt</strong><span> / tahun</span></p>
                <span className="result-area">Luas bangunan {property.building_area_m2} m²</span>
                {focusedMapProperty?.id === property.id && <p className="result-map-selection">Lokasi ditampilkan di peta · {property.footfall}. Penilaian AI, bukan jumlah pengunjung aktual.</p>}
                <div className="result-facilities">{property.facilities.slice(0,3).map(item => <span key={item}>{item}</span>)}</div>
                <div className="result-card-actions">
                  <label className="result-compare">
                    <input aria-label={`Pilih ${property.shortName} untuk dibandingkan`} checked={selectedIds.includes(property.id)} onChange={() => toggleCompare(property.id)} type="checkbox" />
                    Bandingkan
                  </label>
                  <button type="button" aria-label={`Lihat detail ${property.shortName}`} onClick={() => openDetail(property)}>Lihat detail <span aria-hidden="true">→</span></button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {selectedProperties.length > 0 && <section className="compare-dock" aria-label="Properti pilihan Anda">
          <header className="compare-dock-heading"><div className="compare-icon"><BarChart size={18} /></div><strong>{selectedProperties.length} properti dipilih</strong><button className="ghost-link" onClick={clearCompare} type="button">Hapus semua</button></header>
          <div className="compare-dock-choices">{selectedProperties.map(property => <button key={property.id} type="button" onClick={() => toggleCompare(property.id)} aria-label={`Hapus ${property.shortName} dari pilihan`}>{property.shortName}<X size={14} aria-hidden="true" /></button>)}</div>
          <footer><p>{selectedProperties.length === 1 ? "Analisis satu properti atau tambahkan pilihan lainnya." : "Bandingkan biaya, peluang, dan risiko properti pilihan Anda."}</p><button className="compare-button" disabled={loading} onClick={goCompare} type="button">{selectedProperties.length === 1 ? "Lihat analisis" : "Bandingkan"}<BarChart size={16} /></button></footer>
        </section>}

      </section>

      <ResultsMap
        center={center}
        focusedProperty={focusedMapProperty}
        onReset={() => setFocusedMapId(null)}
        onOpenProperty={id => {
          const property = visibleProperties.find(item => item.id === id);
          if (property) openDetail(property);
        }}
      />

      {showLoginPrompt && (
        <div className="results-modal" role="dialog" aria-modal="true">
          <section>
            <User size={28} />
            <h2>Masuk untuk menyimpan properti</h2>
            <p>Aksi simpan sudah ditahan. Setelah masuk, pengguna kembali ke halaman ini dan favorit tetap tersimpan.</p>
            <div>
              <button onClick={() => router.push("/login?returnTo=%2Fpencari%2Fresults")} type="button">Ke Login</button>
              <button
                className="primary"
                onClick={() => {
                  setShowLoginPrompt(false);
                }}
                type="button"
              >
                Kembali
              </button>
            </div>
          </section>
        </div>
      )}
      {favoriteError && <p role="alert">{favoriteError}</p>}
    </main>
  );
}
