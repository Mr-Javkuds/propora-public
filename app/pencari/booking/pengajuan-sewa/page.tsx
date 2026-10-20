
"use client";

import RentalStages from "../../../components/rental-stages";
import { SeekerHeader, SeekerSidebar } from "../../../components/seeker-navigation";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import type { Application } from "../../../lib/marketplace-types";
import { activeApplication } from "../../../lib/rental-flow";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Building2, Images, MapPin, MessageSquareText, ShieldCheck } from "lucide-react";
import "./pengajuan-sewa.css";
import ApplicationDocuments, { type RentalDocument } from "../../../components/application-documents";
import { api } from "../../../lib/marketplace-client";
import { mlContextQuery } from "../../../lib/pencari-draft-client";

type Property = {
  demo?: boolean;
  ownerId?: string | null;
  mlStatus?: string;
  id?: number | string;
  name?: string;
  address?: string;
  price?: number | string;
  score?: number;
  propora_score?: number;
  building_area_m2?: number;
  facilities?: string[];
  image?: string;
  distance?: string;
  status?: string;
};

const defaultProperty: Property = {name:"Belum tersedia",address:"Belum tersedia",image:"/images/property-unavailable.svg",distance:"Jarak belum dihitung",mlStatus:"pending"};

const rupiah = (value: number) =>
  "Rp " +
  new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(Math.max(0, value));

function normalizePrice(value: Property["price"]) {
  return typeof value === "number" && Number.isFinite(value) ? value*1000000 : 0;
}

export default function PengajuanSewaPage() {
  const router = useRouter();

  const [property, setProperty] =
    useState<Property>(defaultProperty);

  const [fullName, setFullName] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [businessName, setBusinessName] =
    useState("");

  const [businessType, setBusinessType] =
    useState("");

  const [startDate, setStartDate] =
    useState("");

  const [duration, setDuration] = useState(1);

const [negotiationEnabled, setNegotiationEnabled] =
    useState(true);

  const [offer, setOffer] = useState("");

  const [proposal, setProposal] = useState("");

  const [documents,setDocuments] = useState<RentalDocument[]>([]);
  const [documentsBusy,setDocumentsBusy] = useState(false);

  const [acceptedTerms, setAcceptedTerms] =
    useState(false);

  const [errors, setErrors] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [application, setApplication] = useState<Application | null>(null);
  const [checkingApplication, setCheckingApplication] = useState(true);
  const submitLock = useRef(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const saved = JSON.parse(localStorage.getItem("selectedBookingProperty") || "null");
        const id = new URLSearchParams(window.location.search).get("listingId") || saved?.id;
        if (!id) throw new Error("Pilih properti dari hasil pencarian terlebih dahulu.");
        const [data, session, requests] = await Promise.all([api<{ property: Property }>(`/api/ml/properties/${encodeURIComponent(id)}?${mlContextQuery()}`), api<{ user: { email: string } }>("/api/pencari/account"), api<{applications:Application[]}>("/api/pencari/applications")]);
        if (!active) return;
        setProperty(data.property); setEmail(session.user.email);
        const current = activeApplication(requests.applications, Number(id));
        setApplication(current);
        if(current){
          setFullName(current.tenant.fullName);setPhone(current.tenant.phone);setBusinessName(current.tenant.businessName);setBusinessType(current.tenant.businessType);setStartDate(current.startDate);setDuration(current.duration);setOffer(String(current.offer));setProposal(current.proposal);
        }else{
          const draft=JSON.parse(localStorage.getItem("proporaWizardData") || "{}");
          setBusinessName(draft.businessName || "");setBusinessType(draft.businessType || "");setOffer(String(normalizePrice(data.property.price)));
        }
        setCheckingApplication(false);
        if (!current && (!data.property.ownerId || data.property.status !== "available")) setErrors(["Properti belum memiliki pemilik aktif atau tidak tersedia untuk diajukan."]);
      } catch (error) { if (active) setErrors([error instanceof Error ? error.message : "Properti gagal dimuat."]); }
    };
    void load(); return () => { active = false; };
  }, []);

  const applicationId = application?.id;
  useEffect(() => {
    if (!applicationId) return;
    let active = true;
    const refresh = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const data = await api<{applications:Application[]}>("/api/pencari/applications");
        const current = data.applications.find(item => item.id === applicationId);
        if (active && current) setApplication(current);
      } catch { /* Keep the last confirmed state; never unlock submission on a network error. */ }
    };
    const timer = setInterval(() => void refresh(), 8000);
    window.addEventListener("focus", refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [applicationId]);

  const listingPrice = useMemo(
    () => normalizePrice(property.price),
    [property.price]
  );

  const numericOffer = Math.max(
    0,
    Number(offer) || 0
  );

  const rentAmount = negotiationEnabled
    ? numericOffer
    : listingPrice;

  const discount =
    listingPrice > 0
      ? Math.max(
          0,
          Math.round(
            ((listingPrice - rentAmount) /
              listingPrice) *
              100
          )
        )
      : 0;

  const emailIsValid =
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(
      email.trim()
    );

  const propertyId = String(
    property.id ?? ""
  ).replace(/^RUKO-SMG-/, "");

  const submitApplication = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (submitLock.current || application || checkingApplication || documentsBusy) return;
    if (!documents.some(item=>item.kind==="ktp")) {setErrors(["Unggah KTP terlebih dahulu."]);return;}

    submitLock.current = true;
    setSubmitting(true);
    setErrors([]);

    try {
      const result = await api<{application:Application}>("/api/pencari/applications", { method: "POST", body: JSON.stringify({ listingId: Number(property.id), tenant: { fullName, phone, email, businessName, businessType }, startDate, duration, offer: rentAmount, proposal, acceptedTerms, documents:documents.map(item=>item.id) }) });
      setApplication(result.application);
      setSubmitting(false);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Pengajuan gagal dikirim."]);
      setSubmitting(false);
      submitLock.current = false;
    }
  };

  if(checkingApplication)return <main className="rental-root"><SeekerSidebar/><SeekerHeader/><div className="rental-content">{errors.length ? <p role="alert">{errors.join(" ")} <a href="/pencari/results">Kembali ke pencarian</a></p> : <p role="status">Memuat properti dan pengajuan…</p>}</div></main>;
  return (
    <main className="rental-root">
      <SeekerSidebar />
      <SeekerHeader />

      <div className="rental-content">
        <div className="rental-main">
          <div className="rental-breadcrumb">
            <button
              type="button"
              onClick={() => router.push("/pencari/area")}
            >
              Eksplorasi Properti
            </button>

            <span>›</span>

            <button
              type="button"
              onClick={() => router.push("/pencari/area")}
            >
              {property.name || defaultProperty.name}
            </button>

            <span>›</span>
            <strong>Formulir Pengajuan Sewa</strong>
          </div>

          <RentalStages listingId={property.id || 0} active={3} applicationStatus={application?.status} />
          <div className="rental-title-row">
            <div className="rental-page-heading">
              <span className="rental-verification-pill">
                <span>✓</span>
                Pengajuan untuk ditinjau pemilik
              </span>

              <h1>
                {application ? "Pengajuan Sewa" : "Ajukan Sewa"} {property.name || "Properti belum dipilih"}
              </h1>

              <p>
                Lengkapi data pengajuan sewa tempat usaha Anda
                untuk diteruskan dan ditinjau langsung oleh
                pemilik properti.
              </p>
            </div>

          </div>

          {errors.length > 0 && (
            <div className="rental-errors" role="alert">
              <strong>Informasi:</strong>
              <ul>
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
              {checkingApplication && <button type="button" onClick={() => window.location.reload()}>Muat ulang status pengajuan</button>}
            </div>
          )}

          <div className="rental-layout">
            {application ? <section className="rental-application-status" role="status">

              <h2>{application.status === "pending" ? "Menunggu persetujuan sewa" : application.status === "approved" ? "Pengajuan disetujui" : "Pengajuan telah diproses"}</h2>
              <p>{application.status === "pending" ? "Data dan dokumen Anda sudah dikirim. Pemilik properti sedang meninjau pengajuan. Anda tidak perlu mengirim ulang." : application.status === "approved" ? "Administrasi sudah disetujui pemilik." : application.ownerNote || "Lihat riwayat untuk mengetahui keputusan pemilik."}</p>
              <dl><div><dt>Nama penyewa</dt><dd>{application.tenant.fullName}</dd></div><div><dt>Usaha</dt><dd>{application.tenant.businessName}</dd></div><div><dt>Mulai sewa</dt><dd>{application.startDate}</dd></div><div><dt>Durasi</dt><dd>{application.duration} tahun</dd></div></dl>
              {application.ownerNote && <p>Catatan pemilik: {application.ownerNote}</p>}
              <ApplicationDocuments listingId={Number(property.id)} applicationId={application.id} />
              {application.status === "approved" && <button type="button" onClick={() => router.push(application?.payment || application?.listingStatus === "rented" ? "/pencari/my-rent" : `/pencari/payment?listingId=${property.id}`)}>{application?.payment || application?.listingStatus === "rented" ? "Lihat di My Rent →" : "Lanjut ke pembayaran →"}</button>}
              <button type="button" onClick={() => router.push("/pencari/sewa")}>Lihat status pengajuan</button>
              <button type="button" onClick={() => router.push(`/pencari/chat?listingId=${property.id}`)}>Hubungi pemilik</button>
            </section> : <form
              id="rental-application-form"
              className="rental-form"
              onSubmit={submitApplication}
              noValidate
            >
              <section className="rental-section">
                <div className="rental-section-heading">
                  <span className="rental-section-number">1</span>
                  <div>
                    <h2>Data Penyewa &amp; Profil Bisnis</h2>
                    <p>
                      Identitas penanggung jawab operasional
                      komersial
                    </p>
                  </div>
                  <span className="rental-required-badge">
                    Wajib Diisi
                  </span>
                </div>

                <div className="rental-section-body">
                  <div className="rental-field-grid">
                    <label className="rental-field">
                      <span>Nama Lengkap <b>*</b></span>
                      <div className="rental-input-wrap">
                        <input
                          value={fullName}
                          onChange={(event) =>
                            setFullName(event.target.value)
                          }
                        />
                        {fullName.trim() && (
                          <span className="rental-input-ok">✓</span>
                        )}
                      </div>
                    </label>

                    <label className="rental-field">
                      <span>
                        Nomor Telepon (WhatsApp) <b>*</b>
                      </span>
                      <div className="rental-input-wrap">
                        <span className="rental-flag">🇮🇩</span>
                        <input
                          value={phone}
                          onChange={(event) =>
                            setPhone(event.target.value)
                          }
                        />
                      </div>
                    </label>

                    <label
                      className={`rental-field ${
                        !emailIsValid ? "rental-field-invalid" : ""
                      }`}
                    >
                      <span>
                        Email Bisnis Resmi <b>*</b>
                        {!emailIsValid && (
                          <em>ⓘ Format Perlu Diperbaiki</em>
                        )}
                      </span>

                      <div className="rental-input-wrap">
                        <input
                          type="email"
                          readOnly
                          value={email}
                          onChange={(event) =>
                            setEmail(event.target.value)
                          }
                          aria-invalid={!emailIsValid}
                        />
                        {!emailIsValid && (
                          <span className="rental-input-error">!</span>
                        )}
                      </div>

                      {!emailIsValid && (
                        <small className="rental-error-text">
                          ⓘ Format email tidak valid. Contoh:
                          nama@domain.com
                        </small>
                      )}
                    </label>

                    <label className="rental-field">
                      <span>Nama Usaha / Brand <b>*</b></span>
                      <input
                        value={businessName}
                        onChange={(event) =>
                          setBusinessName(event.target.value)
                        }
                      />
                    </label>

                    <label className="rental-field">
                      <span>Jenis Usaha / Kategori Retail <b>*</b></span>
                      <select
                        value={businessType}
                        onChange={(event) =>
                          setBusinessType(event.target.value)
                        }
                      >
                        <option>Cafe &amp; Kedai Kopi</option>
                        <option>Restoran</option>
                        <option>Minimarket</option>
                        <option>Fashion &amp; Retail</option>
                        <option>Kantor</option>
                        <option>Jasa</option>
                        <option>Lainnya</option>
                      </select>
                    </label>
                  </div>
                </div>
              </section>

              <section className="rental-section">
                <div className="rental-section-heading">
                  <span className="rental-section-number">2</span>
                  <div>
                    <h2>Rencana Sewa &amp; Operasional</h2>
                    <p>
                      Periode sewa, jadwal serah terima, dan
                      skema pembayaran
                    </p>
                  </div>
                </div>

                <div className="rental-section-body">
                  <div className="rental-field-grid">
                    <label className="rental-field">
                      <span>Tanggal Mulai Sewa <b>*</b></span>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(event) =>
                          setStartDate(event.target.value)
                        }
                      />
                      <small>
                        Termasuk masa grace period fit-out 14 hari.
                      </small>
                    </label>

                    <div className="rental-field">
                      <span>
                        Durasi Sewa <b>*</b>
                        <em>Prioritas Pemilik</em>
                      </span>

                      <div className="rental-duration-options">
                        {[1, 2, 3].map((year) => (
                          <button
                            type="button"
                            key={year}
                            className={
                              duration === year
                                ? "rental-option-active"
                                : ""
                            }
                            onClick={() => setDuration(year)}
                            aria-pressed={duration === year}
                          >
                            {year} Tahun
                          </button>
                        ))}
                      </div>

                      <small>
                        Perpanjangan sewa perlu disepakati kembali dengan pemilik.
                      </small>
                    </div>
                  </div>

                  <div className="rental-admin-note">
                    <span></span>
                    <div>
                      <strong>Pembayaran setelah persetujuan</strong>
                      <p>
                        Lengkapi administrasi terlebih dahulu. Pilihan metode pembayaran tersedia pada tahap 4 setelah pemilik menyetujui pengajuan.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rental-section">
                <div className="rental-section-heading">
                  <span className="rental-section-number">3</span>
                  <div>
                    <h2>Penawaran Harga &amp; Negosiasi</h2>
                    <p>
                      Fleksibilitas proposal komersial ke
                      pihak pemilik
                    </p>
                  </div>
                </div>

                <div className="rental-section-body">
                  <div className="rental-negotiation-banner">
                    <div>
                      <strong>Ajukan negosiasi harga sewa</strong>
                      <p>
                        Harga standar pemilik adalah{" "}
                        {rupiah(listingPrice)} / tahun.
                      </p>
                    </div>
                    <button
                      type="button"
                      className={`rental-toggle ${
                        negotiationEnabled ? "on" : ""
                      }`}
                      onClick={() =>
                        setNegotiationEnabled((value) => !value)
                      }
                      aria-label="Aktifkan negosiasi harga"
                      aria-pressed={negotiationEnabled}
                    >
                      <i />
                    </button>
                  </div>

                  <div className="rental-offer-label">
                    <label htmlFor="rental-offer">
                      Nominal Penawaran Anda
                    </label>
                    {negotiationEnabled && discount > 0 && (
                      <strong>
                        Hemat {discount}% dari harga listing
                      </strong>
                    )}
                  </div>

                  <div className="rental-offer-input">
                    <span>Rp</span>
                    <input
                      id="rental-offer"
                      type="number"
                      min="1"
                      step="100000"
                      value={
                        negotiationEnabled
                          ? offer
                          : String(listingPrice)
                      }
                      disabled={!negotiationEnabled}
                      onChange={(event) =>
                        setOffer(event.target.value)
                      }
                    />
                    <span>/ tahun</span>
                  </div>

                  <label className="rental-field rental-proposal-field">
                    <span>
                      Catatan / Proposal Singkat untuk Pemilik
                    </span>
                    <textarea
                      rows={3}
                      maxLength={500}
                      value={proposal}
                      onChange={(event) =>
                        setProposal(event.target.value)
                      }
                      placeholder="Jelaskan rencana usaha atau penawaran untuk pemilik properti..."
                    />
                    <small className="rental-character-count">
                      {proposal.length} / 500 karakter
                    </small>
                  </label>
                </div>
              </section>

              <section className="rental-section">
                <div className="rental-section-heading">
                  <span className="rental-section-number">4</span>
                  <div>
                    <h2>Kelengkapan Dokumen Legalitas</h2>
                    <p>
                      Unggah KTP dan NPWP pendukung. Dokumen hanya dibagikan kepada pemilik properti saat pengajuan dikirim.
                    </p>
                  </div>
                </div>

                <div className="rental-section-body">
                  <ApplicationDocuments listingId={property.ownerId ? Number(property.id)||0 : 0} editable={!submitting} onChange={setDocuments} onBusyChange={setDocumentsBusy} />

                  <label className="rental-terms">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(event) =>
                        setAcceptedTerms(event.target.checked)
                      }
                    />
                    <span>
                      Saya menyetujui{" "}
                      <strong>syarat &amp; ketentuan sewa</strong>{" "}
                      properti komersial Propora AI serta
                      menjamin keabsahan seluruh data dan
                      identitas yang diajukan.
                    </span>
                  </label>
                </div>
              </section>
            </form>}

            <aside className="rental-summary">
              <div className="rental-summary-card">
                <div className="rental-property-heading">
                  <span><Building2 size={16} /> Properti Terpilih</span>
                  <small>ID: PROPERTI-SMG-{propertyId}</small>
                </div>

                <img
                  className="rental-property-image"
                  src={property.image || defaultProperty.image}
                  alt={property.name || defaultProperty.name}
                  onError={(event) => {
                    event.currentTarget.src = defaultProperty.image!;
                  }}
                />

                <div className="rental-image-caption">
                  <span><Images size={15} /> Foto properti</span>
                  <strong>● Tersedia Segera</strong>
                </div>

                <h2>{property.name || defaultProperty.name}</h2>

                <p className="rental-property-address">
                  <span><MapPin size={15} /></span>{" "}
                  {property.address || defaultProperty.address}
                  {" "}({property.distance || defaultProperty.distance})
                </p>

                <div className="rental-property-specs">
                  <span>{property.building_area_m2 ?? "—"} m²</span>
                  <i>•</i>
                  <span>{property.facilities?.join(" · ") || "Fasilitas belum dicantumkan"}</span>
                </div>

                <div className="rental-property-score">
                  <span>{property.mlStatus !== "ready" || property.propora_score == null ? "—" : Math.round(property.propora_score ?? property.score ?? 0)}</span>
                  <div>
                    <strong>{property.mlStatus !== "ready" || property.propora_score == null ? "Prediksi AI belum tersedia" : `Skor prediksi AI ${Math.round(property.propora_score ?? property.score ?? 0)}/100`}</strong>
                    <small>
                      Nilai kelayakan mengikuti data analisis yang tersedia.
                    </small>
                  </div>
                </div>

                <div className="rental-cost-heading"><strong>Ringkasan administrasi</strong><span>{application?.duration ?? duration} tahun</span></div>
                <div className="rental-cost-row"><span>Penawaran sewa / tahun</span><strong>{rupiah(application?.offer ?? rentAmount)}</strong></div>
                <p className="rental-payment-disclaimer">Pengajuan ini untuk pemeriksaan data dan dokumen. Pembayaran dilakukan pada tahap berikutnya setelah persetujuan pemilik.</p>
                <button className="rental-submit-button" type="submit" form="rental-application-form"
                  disabled={!!application || checkingApplication || submitting || documentsBusy || !documents.some(item=>item.kind==="ktp") || !property.ownerId || property.status !== "available" || !acceptedTerms}>
                  {checkingApplication ? (errors.length ? "Status pengajuan belum tersedia" : "Memeriksa status pengajuan…") : application?.status === "pending" ? "Menunggu persetujuan sewa" : application?.status === "approved" ? "Administrasi disetujui" : application ? "Pengajuan sudah diproses" : submitting ? "Mengirim pengajuan…" : "Kirim Pengajuan Sewa →"}
                </button>
                {application?.status === "approved" && <button className="rental-submit-button" type="button" onClick={() => router.push(`/pencari/payment?listingId=${property.id}`)}>Lanjut ke pembayaran →</button>}

                <p className="rental-payment-disclaimer">
                  <ShieldCheck size={16} aria-hidden="true" /> Pengajuan diteruskan ke tahap review.
                  Belum ada pembayaran yang diproses.
                </p>

                <div className="rental-security-list">
                  <p>
                    <span>✓</span>
                    Pengajuan hanya diteruskan kepada pemilik listing
                  </p>
                  <p>
                    <span>✓</span>
                    Waktu tanggapan mengikuti ketersediaan pemilik
                  </p>
                  <p>
                    <span>✓</span>
                    Ketentuan kontrak disepakati langsung dengan pemilik
                  </p>
                </div>
              </div>

              <div className="rental-help-card">
                <span className="rental-help-avatar"><MessageSquareText size={20} /></span>
                <div>
                  <strong>Perlu informasi tambahan?</strong>
                  <p>
                    Hubungi pemilik properti melalui chat
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push(`/pencari/chat?listingId=${property.id}`)}
                >
                  Chat
                </button>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
