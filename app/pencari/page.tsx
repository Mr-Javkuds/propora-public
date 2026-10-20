"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComponentProps } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SeekerHeader, SeekerSidebar } from "../components/seeker-navigation";
import { Icon } from "../components/ui/icons";
import "./pencari.css";
import "./pencari-steps.css";
import { PencariIntro, PencariStepper } from "./pencari-progress";
import { persistPencariDraft } from "../lib/pencari-draft-client";

type IconName = ComponentProps<typeof Icon>["name"];

type BusinessType = {
  id: string;
  icon: IconName;
  title: string;
  subtitle: string;
  category: string;
  tag: string;
  summary: string;
  insight: string;
};

const businessTypes: BusinessType[] = [
  {
    id: "cafe",
    icon: "coffee",
    title: "Cafe & Kedai Kopi",
    subtitle: "Kedai kopi, espresso bar, dan ruang nongkrong komersial santai.",
    category: "Makanan & Minuman",
    tag: "Dekat kampus & kantor",
    summary: "Cafe & Kedai Kopi",
    insight:
      "Periksa akses kampus atau perkantoran serta kompetitor melalui survei. Jumlah kompetitor dan arus pengunjung langsung belum tersedia.",
  },
  {
    id: "resto",
    icon: "utensils",
    title: "Restoran & Kuliner",
    subtitle: "Resto santai, warung makan, dan outlet kuliner keluarga.",
    category: "Makanan & Minuman",
    tag: "Arus lalu lintas tinggi",
    summary: "Restoran",
    insight:
      "Restoran membutuhkan akses kendaraan, visibilitas fasad, dan jam ramai makan siang hingga malam.",
  },
  {
    id: "laundry",
    icon: "sparkles",
    title: "Laundry & Dry Clean",
    subtitle: "Jasa cuci pakaian, express wash, dan perawatan tekstil premium.",
    category: "Jasa",
    tag: "Dekat hunian & kos",
    summary: "Laundry",
    insight:
      "Laundry cocok berada dekat kos, kampus, dan kawasan hunian padat.",
  },
  {
    id: "retail",
    icon: "shopping-bag",
    title: "Minimarket & Retail",
    subtitle: "Toko kelontong modern dan retail kebutuhan harian masyarakat.",
    category: "Retail",
    tag: "Radius padat penduduk",
    summary: "Minimarket",
    insight:
      "Retail harian membutuhkan akses depan jalan dan kepadatan penduduk stabil.",
  },
  {
    id: "fotokopi",
    icon: "printer",
    title: "Fotokopi & Cetak",
    subtitle: "Jasa cetak dokumen, jilid, dan alat tulis kantor.",
    category: "Jasa",
    tag: "Akses dekat kampus",
    summary: "Fotokopi & Percetakan",
    insight:
      "Fotokopi sangat potensial di sekitar kampus, sekolah, dan perkantoran.",
  },
  {
    id: "barber",
    icon: "scissors",
    title: "Barbershop & Salon",
    subtitle: "Perawatan rambut pria/wanita dan studio kecantikan modern.",
    category: "Jasa",
    tag: "Visibilitas fasad jalan",
    summary: "Barbershop",
    insight:
      "Barbershop cocok berada di area mahasiswa, pekerja, dan hunian.",
  },
  {
    id: "clinic",
    icon: "cross",
    title: "Klinik & Apotek",
    subtitle: "Layanan kesehatan primer dan farmasi kebutuhan masyarakat.",
    category: "Retail",
    tag: "Akses parkir mudah",
    summary: "Klinik & Apotek",
    insight:
      "Klinik dan apotek membutuhkan akses jalan yang jelas serta parkir mudah.",
  },
  {
    id: "custom",
    icon: "ellipsis",
    title: "Lainnya (Kustom)",
    subtitle: "Kategori usaha spesifik lainnya sesuai rancangan rencana Anda.",
    category: "Lainnya",
    tag: "Analisis fleksibel",
    summary: "Bisnis Lainnya",
    insight:
      "Pencarian listing tetap tersedia. Analisis model untuk kategori kustom belum tersedia.",
  },
];

const categories = ["Semua", "Makanan & Minuman", "Jasa", "Retail"];

export default function PencariPage() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState("cafe");
  const [category, setCategory] = useState("Semua");
  const [query, setQuery] = useState("");
  const [saveError, setSaveError] = useState("");
  const [subCategory, setSubCategory] = useState("Specialty Coffee");
  const [businessName, setBusinessName] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = localStorage.getItem("proporaWizardData");
        if (!saved) return;

        const draft = JSON.parse(saved);
        if (draft.business?.id) setSelectedId(draft.business.id);
        if (draft.subCategory) setSubCategory(draft.subCategory);
        if (draft.businessName) setBusinessName(draft.businessName);
      } catch {
        // Isian formulir awal belum merupakan data pengguna tersimpan.
      }
    });
  }, []);

  const selectedBusiness =
    businessTypes.find((item) => item.id === selectedId) ?? businessTypes[0];

  const filteredBusinesses = useMemo(() => {
    return businessTypes.filter((item) => {
      const matchesCategory =
        category === "Semua" || item.category === category;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q);

      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  const canContinue = Boolean(selectedBusiness);

  const handleContinue = async () => {
    if (!canContinue) return;

    const pencariData = {
      businessType: selectedBusiness.title,
      business: selectedBusiness,
      subCategory: selectedId === "cafe" ? subCategory : "",
      businessName,
    };

    const previousDraft = localStorage.getItem("proporaWizardData");
    const nextDraft = previousDraft
      ? { ...JSON.parse(previousDraft), ...pencariData }
      : pencariData;

    localStorage.setItem("proporaWizardData", JSON.stringify(nextDraft));
    try { await persistPencariDraft(); } catch { setSaveError("Draf belum tersimpan. Silakan coba lagi."); return; }
    router.push("/pencari/budget");
  };

  return (
    <main className="pencari-shell pencari-steps-shell seeker-shell pencari-business-step">
      <SeekerSidebar />
      <SeekerHeader />

      <section className="pencari-main stage-one">
        <div className="pencari-container">
          <PencariIntro
            activeStep={1}
            title="Mulai dari jenis usaha Anda"
            description="Pilih usaha yang ingin dibuka. Kami akan menyesuaikan pencarian properti dengan kebutuhan bisnis Anda."
          />

          <PencariStepper activeStep={1} />

          <div className="stage-one-grid">
            <section className="pencari-card business-canvas">
              <div className="section-kicker">
                <span>LANGKAH 01 DARI 03</span>
                <small>JENIS USAHA</small>
              </div>

              <h2>Apa usaha yang ingin Anda buka?</h2>
              <p className="section-copy">
                Pilihan ini membantu kami menampilkan lokasi dan properti yang relevan.
                Anda bisa mengubahnya lagi nanti.
              </p>

              <div className="business-search-row">
                <label className="business-search">
                  <span>
                    <Icon name="search" size={17} />
                  </span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Cari cafe, laundry, apotek..."
                    aria-label="Cari jenis usaha"
                  />
                </label>

                <div className="category-chips">
                  {categories.map((item) => (
                    <button
                      type="button"
                      key={item}
                      className={category === item ? "active" : ""}
                      onClick={() => setCategory(item)}
                      aria-pressed={category === item}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="business-card-grid">
                {filteredBusinesses.map((item) => {
                  const selected = item.id === selectedId;

                  return (
                    <button
                      type="button"
                      className={`business-type-card ${
                        selected ? "selected" : ""
                      }`}
                      key={item.id}
                    onClick={() => { setSelectedId(item.id); if (item.id !== selectedId) setBusinessName(""); }}
                      aria-pressed={selected}
                    >
                      <span className="business-icon">
                        <Icon name={item.icon} size={21} />
                      </span>
                      {selected && (
                        <span className="business-check">
                          <Icon name="check" size={14} />
                        </span>
                      )}
                      <strong>{item.title}</strong>
                      <small>{item.subtitle}</small>
                      <em>{item.tag}</em>
                    </button>
                  );
                })}
              </div>

              {filteredBusinesses.length === 0 && (
                <div className="business-empty">
                  <strong>Jenis usaha tidak ditemukan</strong>
                  <p>Coba kata kunci lain atau pilih kategori Semua.</p>
                  <button type="button" onClick={() => { setQuery(""); setCategory("Semua"); }}>Lihat semua usaha</button>
                </div>
              )}

              <div className="subcategory-box">
                {selectedId === "cafe" && <><strong>Konsep cafe <span>Opsional</span></strong>
                <div className="subcategory-chips">
                  {[
                    "Specialty Coffee",
                    "Kopi Kekinian (Grab-and-Go)",
                    "Cafe Belajar / Co-working",
                    "Dessert & Bakery Bar",
                  ].map((item) => (
                    <button
                      type="button"
                      key={item}
                      className={subCategory === item ? "active" : ""}
                      onClick={() => setSubCategory(item)}
                      aria-pressed={subCategory === item}
                    >
                      {item}
                    </button>
                  ))}
                </div></>}

                <label>
                  Nama usaha <span>Opsional</span>
                  <input
                    value={businessName}
                    onChange={(event) => setBusinessName(event.target.value)}
                    placeholder="Contoh: Kopi Selasar"
                    maxLength={100}
                  />
                </label>
              </div>

              <div className="pencari-actions">
                <Link href="/" className="quiet-button"><Icon name="arrow-left" size={17} /> Kembali</Link>
                {saveError && <p role="alert" className="pencari-save-error">{saveError}</p>}
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleContinue}
                  disabled={!canContinue}
                >
                  Lanjut ke anggaran <Icon name="arrow-right" size={17} />
                </button>
              </div>
            </section>

            <aside className="stage-summary">
              <SummaryCard selectedBusiness={selectedBusiness} />

              <section className="pencari-card insight-card">
                <h3>
                  <Icon name="sparkles" size={17} /> Pertimbangan lokasi
                </h3>
                <p>{selectedBusiness.insight}</p>
              </section>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

function SummaryCard({ selectedBusiness }: { selectedBusiness: BusinessType }) {
  return (
    <section className="pencari-card need-summary">
      <div className="summary-title">
        <h3>
          <Icon name="database" size={17} /> Ringkasan Kebutuhan
        </h3>
        <span>Langkah 1 dari 3</span>
      </div>
      {[
        ["Jenis Usaha", selectedBusiness.summary],
        ["Anggaran sewa Anda", "Belum diisi"],
        ["Modal Awal", "Belum diisi"],
        ["Target Pelanggan", "Belum diisi"],
        ["Operasional", "Belum diisi"],
      ].map(([label, value], index) => (
        <div className="summary-line" key={label}>
          <span>{label}</span>
          <strong className={index === 0 ? "filled" : ""}>{value}</strong>
        </div>
      ))}
    </section>
  );
}
