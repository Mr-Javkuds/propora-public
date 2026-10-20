"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import RentalStages from "./rental-stages";
import { CalendarDays, Clock3, MapPinned, Send } from "lucide-react";
import { SeekerHeader, SeekerSidebar } from "./seeker-navigation";
import {
  ArrowRight,
  Building,
  Check,
  Database,
  MapPin,
  MessageSquare,
} from "./ui/next-icons";
import "../pencari/booking/booking.css";
import { api } from "../lib/marketplace-client";
import { mlContextQuery } from "../lib/pencari-draft-client";
import type { Application, Message, Survey } from "../lib/marketplace-types";
import { activeApplication } from "../lib/rental-flow";
import { surveyLabels } from "../lib/marketplace-types";

type Property = {
  demo?: boolean;
  ownerId?: string | null;
  ownerEmail?: string | null;
  mlStatus?: string;
  id?: number | string;
  name?: string;
  shortName?: string;
  address?: string;
  price?: number | string;
  monthly?: string;
  score?: number;
  propora_score?: number;
  rank?: number;
  image?: string;
  distance?: string;
  status?: string;
  market?: string;
  competition?: string;
  access?: string;
  campus?: string;
  potential_label?: string;
  badge?: string;
  latitude?: number;
  longitude?: number;
};

type ChatMessage = {
  id: number;
  sender: "owner" | "user" | "notice";
  text: string;
  time?: string;
};

const fallbackProperty = {
  name: "Belum tersedia", address: "Belum tersedia", price: 0, score: 0,
  image: "/images/property-unavailable.svg", distance: "Jarak belum dihitung", status: "Status belum tersedia",
};

function normalizeBookingProperty(property: Property): Property {
  const score =
    typeof property.score === "number"
      ? property.score
      : typeof property.propora_score === "number"
        ? Math.round(property.propora_score)
        : undefined;

  return {
    ...property,
    score,
    status: property.status,
  };
}

const toChatMessages = (messages: Message[]): ChatMessage[] => messages.map(message => ({ id: message.id, sender: message.senderRole === "pemilik" ? "owner" : "user", text: message.text, time: new Date(message.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }) + " WIB" }));

const quickReplies = [
  "Apakah harga bisa nego?",
  "Kapan bisa survei?",
  "Apakah ada biaya IPL / tambahan?",
  "Bagaimana sistem pembayarannya?",
];

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function intlLocale(locale: string) {
  return locale === "en" ? "en-US" : locale === "zh" ? "zh-CN" : "id-ID";
}

function formatLongDate(dateKey: string, locale: string) {
  const date = new Date(`${dateKey}T12:00:00`);

  return new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function RentalBooking({ listingId, embedded = false, onBack }: { listingId?: number; embedded?: boolean; onBack?: () => void }) {
  const router = useRouter();
  const locale = useLocale();

  const [property, setProperty] =
    useState<Property>(fallbackProperty);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [propertyLoading, setPropertyLoading] = useState(true);
  const chatVersion = useRef(0);
  const threadScroll = useRef<HTMLDivElement>(null);
  const stickToLatest = useRef(true);
  const [requestError, setRequestError] = useState("");
  const [requestBusy, setRequestBusy] = useState(false);
  const [surveyState, setSurveyState] = useState("Belum ada permintaan survei");
  const [rentalApplication, setRentalApplication] = useState<Application|null>(null);
  const applicationStatus=rentalApplication?.status;

  const [dataSource, setDataSource] = useState(
    "selectedBookingProperty"
  );

  const [messageInput, setMessageInput] = useState("");

  const [viewMonth, setViewMonth] =
    useState(() => new Date(Date.now() + 86400000));

  const [selectedDate, setSelectedDate] =
    useState(() => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(Date.now() + 86400000)));

  const [selectedTime, setSelectedTime] =
    useState("10.00 WIB");

  const [visitors, setVisitors] = useState(2);

  const [ownerNote, setOwnerNote] = useState("");

  const [bookingStatus, setBookingStatus] =
    useState<"idle" | "submitted">("idle");

  useEffect(() => {
    let active = true;

    const loadProperty = async () => {
      try {
        const storedProperty = localStorage.getItem(
          "selectedBookingProperty"
        );

        const selectedId = listingId || new URLSearchParams(window.location.search).get("listingId") || (storedProperty ? JSON.parse(storedProperty).id : null);
        if(!selectedId) throw new Error("Pilih properti terlebih dahulu.");
        const response = await fetch(`/api/ml/properties/${encodeURIComponent(selectedId)}?${mlContextQuery()}`, { cache: "no-store" });

        if (!response.ok) {
          throw new Error("Endpoint properti ML tidak tersedia");
        }

        const payload = (await response.json()) as {
          property?: Property;
        };

        if(!payload.property)throw new Error("Data properti tidak tersedia.");
        const nextProperty = normalizeBookingProperty(payload.property);

        if (!active) return;

        setProperty(nextProperty);
        setDataSource("Listing terkini");
        try {
          const saved = sessionStorage.getItem(`proporaVisitDraft:${localStorage.getItem("proporaDraftAccount") || "session"}:${nextProperty.id}`);
          if (saved) {
            const draft = JSON.parse(saved);
            if (typeof draft.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(draft.date)) { setSelectedDate(draft.date); setViewMonth(new Date(`${draft.date}T12:00:00`)); }
            if (typeof draft.time === "string") setSelectedTime(draft.time);
            if (Number.isInteger(draft.visitors) && draft.visitors >= 1 && draft.visitors <= 20) setVisitors(draft.visitors);
            if (typeof draft.note === "string") setOwnerNote(draft.note);
            if (typeof draft.message === "string") setMessageInput(draft.message);
          }
        } catch { /* An invalid local draft does not prevent loading the property. */ }
      } catch {
        if (!active) return;

        setProperty(fallbackProperty);
        setRequestError("Listing tidak dapat dimuat. Kembali ke hasil pencarian untuk memilih properti.");
        setDataSource("Tidak tersedia");
      } finally {
        if (active) setPropertyLoading(false);
      }
    };

    void loadProperty();

    return () => {
      active = false;
    };
  }, [listingId]);

  useEffect(() => {
    if (propertyLoading || !property.id) return;
    try {
      sessionStorage.setItem(`proporaVisitDraft:${localStorage.getItem("proporaDraftAccount") || "session"}:${property.id}`, JSON.stringify({ date: selectedDate, time: selectedTime, visitors, note: ownerNote, message: messageInput }));
    } catch { /* Booking remains usable when browser storage is unavailable. */ }
  }, [propertyLoading, property.id, selectedDate, selectedTime, visitors, ownerNote, messageInput]);

  useEffect(() => {
    if (!property.ownerId || !property.id) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      const sequence = ++chatVersion.current;
      try {
        const [chat, data, requests] = await Promise.all([api<{ messages: Message[] }>(`/api/pencari/messages?listingId=${property.id}`), api<{ surveys: Survey[] }>("/api/pencari/surveys"), api<{applications:Application[]}>("/api/pencari/applications")]);
        if (!active) return;
        if (sequence === chatVersion.current) setMessages(toChatMessages(chat.messages));
        if(sequence===chatVersion.current){
          const current=activeApplication(requests.applications,Number(property.id));
          setRentalApplication(current);
          if(current)setProperty(previous=>({...previous,status:current.listingStatus}));
        }
        const latest = data.surveys.find(survey => survey.listingId === Number(property.id));
        if (latest) setSurveyState(surveyLabels[latest.status] + (latest.ownerNote ? `: ${latest.ownerNote}` : ""));
      } catch (error) { if (active) setRequestError(error instanceof Error ? error.message : "Data belum dapat dimuat."); }
      finally {if (active) timer=setTimeout(()=>{void load();},3000);}
    };
    void load();
    return () => { active = false; clearTimeout(timer); };
  }, [property.id, property.ownerId]);

  const latestMessageId = messages.at(-1)?.id;
  useEffect(()=>{if (stickToLatest.current && threadScroll.current) threadScroll.current.scrollTop=threadScroll.current.scrollHeight;},[latestMessageId]);

  const calendarCells = useMemo(() => {
    const firstOfMonth = new Date(
      viewMonth.getFullYear(),
      viewMonth.getMonth(),
      1
    );

    const mondayOffset = (firstOfMonth.getDay() + 6) % 7;

    const gridStart = new Date(
      viewMonth.getFullYear(),
      viewMonth.getMonth(),
      1 - mondayOffset
    );

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);

      date.setDate(gridStart.getDate() + index);

      return {
        date,
        key: formatDateKey(date),
        inMonth: date.getMonth() === viewMonth.getMonth(),
      };
    });
  }, [viewMonth]);

  const monthLabel = new Intl.DateTimeFormat(intlLocale(locale), {
    month: "long",
    year: "numeric",
  }).format(viewMonth);
  const weekdayLabels = useMemo(() => Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(intlLocale(locale), { weekday: "short", timeZone: "UTC" })
      .format(new Date(Date.UTC(2024, 0, index + 1)))), [locale]);

  const sendMessage = async (text = messageInput) => {
    const cleanText = text.trim();

    if (!cleanText || requestBusy) return;
    if (!property.ownerId) { setRequestError("Properti ini belum memiliki pemilik aktif untuk dihubungi."); return; }
    setRequestBusy(true); setRequestError("");
    ++chatVersion.current;
    try {
      const data = await api<{ messages: Message[] }>("/api/pencari/messages", { method: "POST", body: JSON.stringify({ listingId: Number(property.id), text: cleanText }) });
      ++chatVersion.current; stickToLatest.current=true;
      setMessages(toChatMessages(data.messages)); setMessageInput("");
    } catch (error) { setRequestError(error instanceof Error ? error.message : "Pesan gagal dikirim."); }
    finally { setRequestBusy(false); }
  };

  const submitSurvey = async () => {
    if (requestBusy) return;
    setRequestBusy(true); setRequestError("");
    try {
      await api("/api/pencari/surveys", { method: "POST", body: JSON.stringify({ listingId: Number(property.id), date: selectedDate, time: selectedTime.replace(".", ":").split(" ")[0], visitors, note: ownerNote }) });
      setBookingStatus("submitted"); setSurveyState("Menunggu konfirmasi pemilik");
    } catch (error) { setRequestError(error instanceof Error ? error.message : "Survei gagal diajukan."); }
    finally { setRequestBusy(false); }
  };

  // BARU: lanjutkan ke formulir pengajuan sewa.
  const continueToRentalApplication = () => {
    if (applicationStatus==="pending" || !property.ownerId || (!rentalApplication && property.status!=="available")) return;
    try {
      // Properti yang sama digunakan pada formulir pengajuan.
      localStorage.setItem(
        "selectedBookingProperty",
        JSON.stringify(property)
      );

      // Simpan pilihan survei sebagai draft.
      localStorage.setItem(
        "proporaSurveyDraft",
        JSON.stringify({
          property,
          date: selectedDate,
          time: selectedTime,
          visitors,
          note: ownerNote,
          status:
            bookingStatus === "submitted"
              ? "Menunggu konfirmasi pemilik"
              : "Draft jadwal survei",
        })
      );
    } catch {
      // Navigasi tetap berjalan jika penyimpanan browser gagal.
    }

    router.push(`/pencari/booking/pengajuan-sewa?listingId=${property.id}`);
  };

  const formattedPrice = (() => {
    const numericPrice =
      typeof property.price === "string"
        ? Number(property.price)
        : property.price;

    if (
      typeof numericPrice === "number" &&
      Number.isFinite(numericPrice)
    ) {
      return `Rp ${new Intl.NumberFormat("id-ID", {
        maximumFractionDigits: 0,
      }).format(numericPrice)} jt / tahun`;
    }

    return "Harga belum tersedia";
  })();

  const propertyName = property.name || fallbackProperty.name;
  const propertyAddress =
    property.address || fallbackProperty.address;
  const propertyDistance =
    property.distance || fallbackProperty.distance;
  const propertyScore = property.score;
  const ownerPropertyLabel =
    property.shortName || propertyName.replace(/\s*\(.+?\)\s*/g, "");

  if (propertyLoading) return <p role="status" style={{ padding: 24 }}>Memuat chat dan jadwal kunjungan…</p>;
  if (dataSource === "Tidak tersedia") return <div role="alert" style={{ padding: 24 }}><p>{requestError}</p><Link href="/pencari/results">Pilih properti lain</Link></div>;

  return (
    <div className={`booking-page ${embedded ? "booking-embedded" : ""}`}>
      {!embedded && <><SeekerSidebar /><SeekerHeader /></>}

      <section className="booking-app-content">
        <div className="booking-main">
          {requestError && <p role="alert" style={{ color: "#912c30", padding: 12 }}>{requestError}</p>}
          {!property.ownerId && <p>Properti ini belum menerima chat, survei, atau pengajuan sewa. <a href="/pencari/results">Pilih properti milik pemilik aktif.</a></p>}
          <a href="/pencari/sewa">Lihat status survei dan sewa saya</a>
          {property.demo && <p>Properti ini belum terverifikasi melalui survei lapangan.</p>}
          <div className="booking-breadcrumb-row">
            <div className="booking-breadcrumb">
              <span><MapPinned size={16} /></span>
              Eksplorasi Properti <b>›</b>{" "}
              {propertyName}
              <b>›</b>
              <strong>
                Hubungi Pemilik &amp; Jadwal Survei
              </strong>
            </div>

            <div className="booking-listing-meta">
              <span className="available-pill">
                <i />
                {property.status || fallbackProperty.status}
              </span>

              <span className="meta-dot">•</span>

              <span>
                ID Listing:{" "}
                <b>
                  PRP-SMG-
                  {String(property.id ?? "").padStart(4, "0")}
                </b>
              </span>
            </div>
          </div>

          <RentalStages listingId={property.id || listingId || 0} active={2} applicationStatus={applicationStatus} />

          <div className="booking-columns">
            <section
              className="chat-card"
              id="chat-pemilik"
              aria-label="Percakapan dengan pemilik properti"
            >
              <div className="chat-header">
                <button
                  className="back-button"
                  onClick={() => onBack ? onBack() : router.push("/pencari/chat")}
                  aria-label="Kembali"
                >
                  ‹
                </button>

                <div className="owner-avatar">
                  <span aria-hidden="true">P</span>
                </div>

                <div className="owner-details">
                  <div className="owner-name">
                    {property.ownerEmail || "Belum ada pemilik aktif"}{" "}

                    <span className="owner-role">
                      Pemilik {ownerPropertyLabel}
                    </span>
                  </div>

                  <div className="owner-response">
                    <Clock3 size={14} /> Percakapan dengan pemilik properti
                  </div>
                </div>

              </div>

              {!embedded && <Link className="booking-inbox-link" href={`/pencari/chat?listingId=${property.id}`}>Buka di kotak masuk <ArrowRight size={16} /></Link>}
              <div className="chat-thread" ref={threadScroll} role="log" aria-live="polite" onScroll={event=>{const el=event.currentTarget;stickToLatest.current=el.scrollHeight-el.scrollTop-el.clientHeight<60;}}>
                <div className="date-separator">
                  Percakapan
                </div>

                {!messages.length && <p>Belum ada pesan.</p>}
                {messages.map((message) => {
                  if (message.sender === "notice") {
                    return (
                      <div
                        className="survey-chat-notice"
                        key={message.id}
                      >
                        <CalendarDays size={18} />
                        <span>{message.text}</span>
                      </div>
                    );
                  }

                  return (
                    <div
                      className={`chat-message-row ${
                        message.sender === "user"
                          ? "from-user"
                          : "from-owner"
                      }`}
                      key={message.id}
                    >
                      {message.sender === "owner" && (
                        <div className="mini-avatar">
                          <span aria-hidden="true">P</span>
                        </div>
                      )}

                      <div className="message-block">
                        <div className="message-bubble">
                          {message.text}
                        </div>

                        <div className="message-time">
                          {message.time || ""}

                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="chat-composer">
                <div className="quick-replies">
                  {quickReplies.map((reply) => (
                    <button
                      key={reply}
                      onClick={() => setMessageInput(reply)}
                    >
                      {reply}
                    </button>
                  ))}
                </div>

                <form
                  className="message-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void sendMessage();
                  }}
                >
                  <input
                    maxLength={3000}
                    disabled={!property.ownerId || requestBusy}
                    value={messageInput}
                    onChange={(event) =>
                      setMessageInput(event.target.value)
                    }
                    placeholder={`Tulis pesan untuk Pemilik ${ownerPropertyLabel}...`}
                    aria-label="Pesan untuk pemilik"
                  />

                  <button
                    type="submit"
                    className="send-button"
                    disabled={!property.ownerId || requestBusy || !messageInput.trim()}
                  >
                    Kirim <Send size={16} aria-hidden="true" />
                  </button>
                </form>
              </div>
            </section>

            <aside className="survey-card">
              <div className="property-summary">
                <img
                  className="property-photo"
                  src={property.image || fallbackProperty.image}
                  alt={propertyName}
                  onError={(event) => {
                    event.currentTarget.src = fallbackProperty.image;
                  }}
                />

                <div className="property-summary-text">
                  <span className="price-pill">
                    {formattedPrice}
                  </span>

                  <h2>
                    {propertyName}
                  </h2>

                  <p>
                    <MapPin size={14} /> {propertyAddress} (
                    {propertyDistance})
                  </p>
                </div>

                <div className="property-score">
                  <Check size={12} /> {property.mlStatus !== "ready" || propertyScore === undefined ? "Prediksi AI belum tersedia" : `Prediksi AI: potensi lokasi ${property.potential_label || "belum dinilai"} · ${propertyScore}/100`}
                </div>
              </div>

              <div className="booking-ml-grid">
                <div>
                  <Building size={16} />
                  <span>Listing</span>
                  <strong>
                    {property.rank ? `Rank #${property.rank}` : "Siap survei"}
                  </strong>
                </div>
                <div>
                  <Database size={16} />
                  <span>Sumber</span>
                  <strong>{dataSource}</strong>
                </div>
                <div>
                  <MessageSquare size={16} />
                  <span>Sinyal ML</span>
                  <strong>
                    {property.mlStatus === "ready" ? property.potential_label : "Belum tersedia"}
                  </strong>
                </div>
              </div>

              <div className="survey-intro">
                <h1>Jadwalkan Survei Lokasi</h1>
                <p>
                  Pilih tanggal dan waktu untuk inspeksi fisik properti bersama
                  pemilik
                </p>
              </div>

              <section
                className="calendar-panel"
                aria-label="Pilih tanggal survei"
              >
                <div className="calendar-heading">
                  <h2>{monthLabel}</h2>

                  <div>
                    <button
                      onClick={() =>
                        setViewMonth(
                          (month) =>
                            new Date(
                              month.getFullYear(),
                              month.getMonth() - 1,
                              1
                            )
                        )
                      }
                      aria-label="Bulan sebelumnya"
                    >
                      ‹
                    </button>

                    <button
                      onClick={() =>
                        setViewMonth(
                          (month) =>
                            new Date(
                              month.getFullYear(),
                              month.getMonth() + 1,
                              1
                            )
                        )
                      }
                      aria-label="Bulan berikutnya"
                    >
                      ›
                    </button>
                  </div>
                </div>

                <div className="weekday-grid">
                  {weekdayLabels.map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>

                <div className="calendar-grid">
                  {calendarCells.map(
                    ({ date, key, inMonth }) => (
                      <button
                        key={key}
                        disabled={key < new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())}
                        className={`calendar-day ${
                          inMonth ? "" : "outside-month"
                        } ${key === selectedDate ? "selected" : ""}`}
                        onClick={() => {
                          setSelectedDate(key);
                          setBookingStatus("idle");
                        }}
                        aria-pressed={key === selectedDate}
                        aria-label={formatLongDate(key, locale)}
                      >
                        <span>{date.getDate()}</span>
                        {key === selectedDate && <i />}
                      </button>
                    )
                  )}
                </div>
              </section>

              <section className="time-section">
                <div className="section-label-row">
                  <h3>Pilih Waktu Kunjungan</h3>
                  <span>Zona Waktu: WIB</span>
                </div>

                <div className="time-options">
                  {[
                    "09.00 WIB",
                    "10.00 WIB",
                    "13.00 WIB",
                    "15.00 WIB",
                  ].map((time) => (
                    <button
                      key={time}
                      className={`${
                        selectedTime === time ? "chosen" : ""
                      }`}
                      onClick={() => {
                        setSelectedTime(time);
                        setBookingStatus("idle");
                      }}
                      aria-pressed={selectedTime === time}
                    >
                      <span>
                        {selectedTime === time ? "✓ " : ""}
                      </span>
                      {time}
                    </button>
                  ))}
                </div>
              </section>

              <section className="visitors-control">
                <div>
                  <h3>Jumlah Pengunjung</h3>
                  <p>
                    Berapa orang yang akan hadir saat survei?
                  </p>
                </div>

                <div className="stepper">
                  <button
                    onClick={() =>
                      setVisitors((count) =>
                        Math.max(1, count - 1)
                      )
                    }
                    aria-label="Kurangi pengunjung"
                  >
                    −
                  </button>

                  <strong>{visitors}</strong>

                  <button
                    onClick={() =>
                      setVisitors((count) =>
                        Math.min(20, count + 1)
                      )
                    }
                    aria-label="Tambah pengunjung"
                  >
                    ＋
                  </button>
                </div>
              </section>

              <section className="owner-note-section">
                <label htmlFor="owner-note">
                  Catatan untuk Pemilik
                </label>

                <textarea
                  id="owner-note"
                  value={ownerNote}
                  onChange={(event) => {
                    setOwnerNote(event.target.value);
                    setBookingStatus("idle");
                  }}
                  rows={2}
                />
              </section>

              <button
                type="button"
                className="request-survey-button"
                onClick={submitSurvey}
                disabled={requestBusy || !property.ownerId || property.status !== "available"}
              >
                <CalendarDays size={18} />
                Ajukan Jadwal Survei
              </button>

              <div className="booking-status">
                <span>⌛</span>
                <p>
                  <strong>
                    Status:{" "}
                    {surveyState}
                  </strong>{" "}
                </p>
              </div>

              <div className="free-survey-note">
                <span>♢</span> Jadwal survei menunggu konfirmasi pemilik.
              </div>

              {/* TOMBOL BARU: MENUJU FORMULIR SEWA */}
              <button
                type="button"
                className="request-survey-button continue-rental-button"
                onClick={continueToRentalApplication}
                disabled={!property.ownerId || applicationStatus==="pending" || (!rentalApplication && property.status !== "available")}
              >
                {applicationStatus==="pending" ? "Pengajuan sudah terkirim" : applicationStatus==="approved" ? "Lihat status pengajuan" : "Lanjutkan Booking Sewa"} <ArrowRight size={18} />
              </button>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
