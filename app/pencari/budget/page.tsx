"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "../../components/ui/icons";
import { SeekerHeader, SeekerSidebar } from "../../components/seeker-navigation";
import "../pencari.css";
import "../pencari-steps.css";
import { PencariIntro, PencariStepper } from "../pencari-progress";
import { persistPencariDraft } from "../../lib/pencari-draft-client";


type PencariData = {
  businessType?: string;
  businessName?: string;
  subCategory?: string;
  budget?: { min?: number; max?: number };
  initialCapital?: number;
  targets?: string[];
  operationalHours?: { open?: string; close?: string };
};

const targetOptions = [
  "Mahasiswa",
  "Pekerja",
  "Komunitas",
  "Keluarga",
  "Wisatawan",
  "Penghuni Kos",
];

const defaultTargets = ["Mahasiswa", "Pekerja", "Komunitas"];

export default function BudgetPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<PencariData | null>(null);
  const [saveError, setSaveError] = useState("");
  const [rentMin, setRentMin] = useState(30);
  const [rentMax, setRentMax] = useState(80);
  const [capital, setCapital] = useState(120000000);
  const [targets, setTargets] = useState<string[]>(defaultTargets);
  const [openHour, setOpenHour] = useState("09:00");
  const [closeHour, setCloseHour] = useState("22:00");

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = localStorage.getItem("proporaWizardData");
        if (!saved) return;

        const parsed: PencariData = JSON.parse(saved);
        setDraft(parsed);
        setRentMin(parsed.budget?.min ?? 30);
        setRentMax(parsed.budget?.max ?? 80);
        setCapital(parsed.initialCapital ?? 120000000);
        setTargets(parsed.targets?.length ? parsed.targets : defaultTargets);
        setOpenHour(parsed.operationalHours?.open ?? "09:00");
        setCloseHour(parsed.operationalHours?.close ?? "22:00");
      } catch {
        setDraft(null);
      }
    });
  }, []);

  const errors = useMemo(() => {
    return {
      rent: rentMax <= rentMin ? "Sewa maksimal harus lebih besar dari sewa minimal." : "",
      capital: capital <= 0 ? "Modal awal wajib diisi." : "",
      targets: targets.length === 0 ? "Pilih minimal satu target pelanggan." : "",
      hours:
        closeHour <= openHour
          ? "Jam tutup harus setelah jam buka."
          : "",
    };
  }, [capital, closeHour, openHour, rentMax, rentMin, targets.length]);

  const canContinue = Object.values(errors).every((item) => !item);

  const toggleTarget = (target: string) => {
    setTargets((current) =>
      current.includes(target)
        ? current.filter((item) => item !== target)
        : [...current, target]
    );
  };

  const handleContinue = async () => {
    if (!canContinue) return;

    const nextDraft: PencariData = {
      ...(draft ?? {}),
      budget: { min: rentMin, max: rentMax },
      initialCapital: capital,
      targets,
      operationalHours: { open: openHour, close: closeHour },
    };

    localStorage.setItem("proporaWizardData", JSON.stringify(nextDraft));
    try { await persistPencariDraft(); } catch { setSaveError("Draf belum tersimpan. Silakan coba lagi."); return; }
    router.push("/pencari/area");
  };

  return (
    <main className="pencari-shell pencari-steps-shell seeker-shell pencari-business-step">
      {saveError && <p role="alert">{saveError}</p>}
      <SeekerSidebar />
      <SeekerHeader />

      <section className="pencari-main stage-two">
        <div className="pencari-container">
          <PencariIntro
            activeStep={2}
            title="Anggaran & Target Pelanggan"
            description="Lengkapi batas sewa, modal awal, target pelanggan, dan jam operasional agar hasil properti benar-benar relevan."
          />

          <PencariStepper activeStep={2} />

          <div className="stage-one-grid">
            <section className="pencari-card budget-canvas">
              <div className="section-kicker">
                <span>LANGKAH 02 DARI 03</span>
                <small>• Anggaran & target pelanggan</small>
              </div>

              <h2>Anggaran & Target Pelanggan</h2>
              <p className="section-copy">
                Isian Anda digunakan untuk menyaring properti berdasarkan anggaran dan menilai kecocokan lokasi dengan kebutuhan usaha.
              </p>

              <div className="budget-form-grid">
                <label className="field-card">
                  <span>Sewa minimal / tahun</span>
                  <div className="money-field">
                    <small>Rp</small>
                    <input
                      min={0}
                      type="number"
                      value={rentMin}
                      onChange={(event) => setRentMin(Number(event.target.value))}
                    />
                    <small>juta</small>
                  </div>
                </label>

                <label className="field-card">
                  <span>Sewa maksimal / tahun</span>
                  <div className="money-field">
                    <small>Rp</small>
                    <input
                      min={0}
                      type="number"
                      value={rentMax}
                      onChange={(event) => setRentMax(Number(event.target.value))}
                    />
                    <small>juta</small>
                  </div>
                  {errors.rent && <em>{errors.rent}</em>}
                </label>

                <label className="field-card wide">
                  <span>Modal awal operasional</span>
                  <div className="money-field">
                    <small>Rp</small>
                    <input
                      min={0}
                      step={5000000}
                      type="number"
                      value={capital}
                      onChange={(event) => setCapital(Number(event.target.value))}
                    />
                  </div>
                  {errors.capital && <em>{errors.capital}</em>}
                </label>
              </div>

              <div className="field-card target-picker">
                <span>Target pelanggan</span>
                <div className="subcategory-chips">
                  {targetOptions.map((item) => (
                    <button
                      className={targets.includes(item) ? "active" : ""}
                      key={item}
                      onClick={() => toggleTarget(item)}
                      type="button"
                    >
                      {item}
                    </button>
                  ))}
                </div>
                {errors.targets && <em>{errors.targets}</em>}
              </div>

              <div className="budget-form-grid">
                <label className="field-card">
                  <span>Jam buka</span>
                  <input
                    className="time-input"
                    type="time"
                    value={openHour}
                    onChange={(event) => setOpenHour(event.target.value)}
                  />
                </label>

                <label className="field-card">
                  <span>Jam tutup</span>
                  <input
                    className="time-input"
                    type="time"
                    value={closeHour}
                    onChange={(event) => setCloseHour(event.target.value)}
                  />
                  {errors.hours && <em>{errors.hours}</em>}
                </label>
              </div>

              <div className="pencari-actions">
                <button
                  className="quiet-button"
                  onClick={() => router.push("/pencari")}
                  type="button"
                >
                  <Icon name="arrow-left" size={17} /> Kembali
                </button>
                <button
                  className="primary-button"
                  disabled={!canContinue}
                  onClick={handleContinue}
                  type="button"
                >
                  Lanjut ke Area Pilihan <Icon name="arrow-right" size={17} />
                </button>
              </div>
            </section>

            <aside className="stage-summary">
              <section className="pencari-card need-summary">
                <div className="summary-title">
                  <h3>
                    <Icon name="database" size={17} /> Ringkasan Kebutuhan
                  </h3>
                  <span>Langkah 2 dari 3</span>
                </div>
                {[
                  ["Jenis Usaha", draft?.businessType || "Belum diisi"],
                  ["Nama usaha", draft?.businessName || "Belum diisi"],
                  ["Anggaran sewa Anda", `Rp ${rentMin} Jt - ${rentMax} Jt / th`],
                  ["Modal Awal", `Rp ${capital.toLocaleString("id-ID")}`],
                  ["Target", targets.join(", ") || "Belum dipilih"],
                  ["Operasional", `${openHour} - ${closeHour}`],
                ].map(([label, value]) => (
                  <div className="summary-line" key={label}>
                    <span>{label}</span>
                    <strong className="filled">{value}</strong>
                  </div>
                ))}
              </section>

              <section className="pencari-card insight-card rose">
                <h3>
                  <Icon name="sparkles" size={17} /> Periksa kembali isian Anda
                </h3>
                <p>
                  Nilai awal merupakan isian formulir. Sesuaikan dengan rencana Anda; pilihan disimpan saat menekan lanjut.
                </p>
              </section>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
