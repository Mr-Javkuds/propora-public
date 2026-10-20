"use client";

import { ProporaLogo } from "./propora-logo";
import AccountMenu from "./account-menu";
import PropertyLocationPicker from "./property-location-picker";
import ListingPhotoUpload from "./listing-photo-upload";
import PaymentHistory from "./payment-history";
import { ReceiptText } from "lucide-react";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter } from "next/navigation";
import ChatInbox, { type ChatThread } from "./chat-inbox";
import ApplicationDocuments from "./application-documents";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Building, MessageSquare, Plus, RefreshCcw, Search } from "./ui/next-icons";
import type { Application, Listing, Survey } from "../lib/marketplace-types";
import { listingLabels } from "../lib/marketplace-types";
import { api, rupiah } from "../lib/marketplace-client";
import "./marketplace.css";
import "./owner-dashboard.css";
import { LanguageSwitcher } from "./language-switcher";
import { ArrowRight, ArrowUpRight, CalendarDays, ChevronDown, ChevronRight, CircleCheck, ClipboardList, Clock3, ExternalLink, House, KeyRound, LayoutDashboard, MapPin, ShieldCheck, Sparkles } from "lucide-react";

type Conversation = { listingId: number; seekerId: string; seekerEmail: string; listingName: string };
const emptyListing = { name: "", address: "", price: "", latitude: "", longitude: "", area: "", image: "", facilities: "", description: "", status: "draft" as "draft" | "available" };

export default function OwnerWorkspace({ compose = false, initialView = "listings", initialListingId }: { compose?: boolean; initialView?: string; initialListingId?: number }) {
  const router = useRouter();
  const t = useTranslations("Owner");
  const listingText = (status: string) => t(`status.listing.${status}`);
  const applicationText = (status: string) => t(`status.application.${status}`);
  const surveyText = (status: string) => t(`status.survey.${status}`);
  const [view,setView] = useState(initialView);
  useEffect(()=>{queueMicrotask(()=>setView(initialView));},[initialView]);
  const [chatTarget,setChatTarget] = useState<ChatThread>();
  const [listings, setListings] = useState<Listing[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("Semua");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadingPhoto,setUploadingPhoto] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(compose);
  const [form, setForm] = useState(emptyListing);
  const numericListingInput = { price: Number(form.price), area: Number(form.area), latitude: Number(form.latitude), longitude: Number(form.longitude) };
  function facilityValue(prefix: string) { return form.facilities.split(",").map(value => value.trim()).find(value => value.startsWith(prefix))?.slice(prefix.length) ?? ""; }
  function setFacility(prefix: string, value: string) {
    setForm(current => ({ ...current, facilities: [...current.facilities.split(",").map(item => item.trim()).filter(item => item && !item.startsWith(prefix)), ...(value ? [prefix + value] : [])].join(", ") }));
  }
  const [notes, setNotes] = useState<Record<string, string>>({});

  const refreshRevision=useRef(0);
  const refresh = useCallback(async () => {
    const request=++refreshRevision.current;
    try {
      const [listingData, applicationData, surveyData, chatData] = await Promise.all([
        api<{ listings: Listing[] }>("/api/owner/listings"), api<{ applications: Application[] }>("/api/owner/applications"),
        api<{ surveys: Survey[] }>("/api/owner/surveys"), api<{ conversations: Conversation[] }>("/api/owner/messages"),
      ]);
      if(request!==refreshRevision.current)return;
      setListings(listingData.listings); setApplications(applicationData.applications); setSurveys(surveyData.surveys);
      setConversations(chatData.conversations); setError("");
    } catch (error) { setError(error instanceof Error ? error.message : t("errors.loadData")); }
    finally { if(request===refreshRevision.current)setLoading(false); }
  }, [t]);
  useEffect(() => {
    queueMicrotask(() => { void refresh(); });
    const interval = setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 10000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(interval); window.removeEventListener("focus", refresh); };
  }, [refresh]);

  function navigateView(next:string) { if (compose) router.push(`/owner?view=${next}`); else {setView(next);setShowForm(false);} }
  async function save(event: FormEvent) {
    event.preventDefault(); if (busy || uploadingPhoto) return; setBusy(true); setError("");
    try {
      if(!form.image) throw new Error("Unggah foto utama properti terlebih dahulu.");
      await api(`/api/owner/listings${editing ? `/${editing}` : ""}`, { method: editing ? "PATCH" : "POST", body: JSON.stringify({ ...form, ...numericListingInput, facilities: form.facilities.split(",").map(item => item.trim()).filter(Boolean) }) });
      setNotice(editing ? t("notices.listingUpdated") : t("notices.listingCreated")); setShowForm(false); setEditing(null); setForm(emptyListing); await refresh(); if (compose) router.push("/owner");
    } catch (error) { setError(error instanceof Error ? error.message : t("errors.saveListing")); }
    finally { setBusy(false); }
  }
  async function decide(kind: "applications" | "surveys", id: string, status: string) {
    if (busy) return; setBusy(true); setError("");
    try { await api(`/api/owner/${kind}/${id}`, { method: "PATCH", body: JSON.stringify({ status, ownerNote: notes[id] ?? "" }) }); setNotice(t("notices.decisionSaved")); await refresh(); }
    catch (error) { setError(error instanceof Error ? error.message : t("errors.saveDecision")); }
    finally { setBusy(false); }
  }
  async function rentalStatus(listing: Listing,status: "rented" | "available") {
    const message = status === "rented" ? t("confirm.markRented", { name: listing.name }) : t("confirm.releaseListing", { action: listing.status === "rented" ? t("actions.endRental") : t("actions.cancelReservation"), name: listing.name });
    if (busy || !window.confirm(message)) return;
    setBusy(true);setError("");
    try {await api(`/api/owner/listings/${listing.id}`,{method:"PATCH",body:JSON.stringify({rentalStatus:status})});setNotice(t("notices.statusUpdated"));await refresh();}
    catch(error) {setError(error instanceof Error ? error.message : t("errors.statusUpdate"));}
    finally {setBusy(false);}
  }
  function openChat(item: {listingId:number;seekerId:string;listingName:string;seekerEmail:string}) {setChatTarget(item);setView("messages");}
  const visible = listings.filter(item => (tab === "Semua" || item.status === tab) && `${item.name} ${item.address}`.toLowerCase().includes(search.toLowerCase()));
  const pending = applications.filter(item => item.status === "pending").length + surveys.filter(item => item.status === "pending").length;
  const pendingApplications = applications.filter(item => item.status === "pending");
  const pendingSurveys = surveys.filter(item => item.status === "pending");
  const counts = { available: listings.filter(item => item.status === "available").length, reserved: listings.filter(item => item.status === "reserved").length, rented: listings.filter(item => item.status === "rented").length, draft: listings.filter(item => item.status === "draft").length };
  const navigation = [
    { id: "listings", label: t("navigation.listings"), icon: LayoutDashboard, count: 0 },
    { id: "applications", label: t("navigation.applications"), icon: ClipboardList, count: pendingApplications.length },
    { id: "surveys", label: t("navigation.surveys"), icon: CalendarDays, count: pendingSurveys.length },
    { id: "messages", label: t("navigation.messages"), icon: MessageSquare, count: conversations.length },
    { id: "payments", label: t("navigation.payments"), icon: ReceiptText, count: applications.filter(item=>item.payment).length },
  ];
  const heading = compose ? t("headings.create") : showForm ? t("headings.edit") : t(`headings.${view}`);
  const subtitle = compose || showForm ? t("subtitles.form") : t(`subtitles.${view}`);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const upcoming = surveys.filter(item => item.status === "confirmed" && item.date >= today).sort((a,b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)).slice(0,3);
  const occupancy = listings.length ? Math.round(counts.rented / listings.length * 100) : 0;
  function editListing(item: Listing) {
    setEditing(item.id); setForm({ ...item, price: String(item.price), area: String(item.area), latitude: String(item.latitude), longitude: String(item.longitude), facilities: item.facilities.join(", "), status: item.status === "available" ? "available" : "draft" }); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function filterListings(status: string) { navigateView("listings"); setTab(status); }
  return (
    <main className="marketplace owner-workspace owner-dashboard">
      <aside className="market-nav owner-sidebar" aria-label={t("ownerNavigation")}>
        <Link className="market-brand owner-brand" href="/owner"><span><ProporaLogo /></span>Propora<span className="owner-brand-dot">.</span><small>AI</small></Link>
        <div className="owner-workspace-label"><span className="owner-workspace-mark"><Building size={17} /></span><div><strong>{t("workspace")}</strong><small>{t("workspaceSubtitle")}</small></div></div>
        <p className="owner-nav-label">{t("workspace")}</p>
        <nav className="owner-navigation">{navigation.map(item => {
          const Icon = item.icon;
          return <button key={item.id} aria-current={!compose && view === item.id ? "page" : undefined} onClick={() => navigateView(item.id)}><Icon size={19} /><span>{item.label}</span>{item.count > 0 && <b>{item.count}</b>}</button>;
        })}</nav>
        <Link href="/owner/listing-baru" className={`owner-add-nav ${compose ? "active" : ""}`}><Plus size={18} /> {t("addProperty")}</Link>
        <div className="owner-sidebar-guide"><span><Sparkles size={20} /></span><strong>{t("guideTitle")}</strong><p>{t("guideText")}</p><Link href="/owner/listing-baru">{t("completePortfolio")} <ArrowUpRight size={15} /></Link></div>
        <div className="owner-sidebar-bottom"><Link href="/"><ExternalLink size={16} /> {t("viewSite")}</Link></div>
      </aside>
      <div className="market-main owner-main">
        <div className="owner-topbar"><div><span>{t("workspace")}</span><ChevronRight size={14} /><strong>{compose ? t("addProperty") : navigation.find(item => item.id === view)?.label}</strong></div><div className="owner-topbar-account"><LanguageSwitcher /><span className="owner-topbar-role"><span /> {t("ownerRole")}</span><AccountMenu inline /></div></div>
        <div className="owner-content">
          <header className="market-heading owner-heading"><div><span className="owner-eyebrow">{t("portfolio")}</span><h1>{heading}</h1><p>{subtitle}</p></div><div className="market-actions"><button className="owner-refresh" title={t("actions.refresh")} aria-label={t("actions.refresh")} onClick={() => void refresh()}><RefreshCcw size={17} /></button>{!compose && <Link className="owner-primary-link" href="/owner/listing-baru"><Plus size={17} /> {t("addProperty")}</Link>}</div></header>
          {error && <p className="market-error" role="alert">{error}</p>}{notice && <p className="market-notice" role="status"><CircleCheck size={17} />{notice}</p>}
          <nav hidden={compose} className="owner-mobile-tabs" aria-label="Menu dashboard">{navigation.map(item => <button key={item.id} aria-current={view === item.id ? "page" : undefined} onClick={() => navigateView(item.id)}>{item.label}</button>)}</nav>
          <section hidden={compose || showForm} className="owner-stats" aria-label={t("portfolioSummary")} aria-busy={loading}>
            <button className="owner-stat" onClick={() => filterListings("Semua")}><span className="owner-stat-top">{t("stats.total")}<span className="owner-stat-icon"><Building size={19} /></span></span><strong>{loading || error ? "—" : listings.length}<small>{t("units.properties")}</small></strong><span className="owner-stat-note">{counts.draft} {t("stats.draftNote")}<ArrowUpRight size={15} /></span></button>
            <button className="owner-stat" onClick={() => filterListings("available")}><span className="owner-stat-top">{t("stats.available")}<span className="owner-stat-icon green"><House size={19} /></span></span><strong>{loading ? "—" : counts.available}<small>{t("units.properties")}</small></strong><span className="owner-stat-note"><i className="owner-dot available" />{t("stats.availableNote")}<ArrowUpRight size={15} /></span></button>
            <button className="owner-stat" onClick={() => filterListings("rented")}><span className="owner-stat-top">{t("stats.rented")}<span className="owner-stat-icon purple"><KeyRound size={19} /></span></span><strong>{loading ? "—" : counts.rented}<small>{t("units.properties")}</small></strong><span className="owner-stat-note">{counts.reserved} {t("stats.reservedNote")}<ArrowUpRight size={15} /></span></button>
            <button className={`owner-stat ${pending ? "needs-attention" : ""}`} onClick={() => navigateView(pendingApplications.length ? "applications" : "surveys")}><span className="owner-stat-top">{t("stats.attention")}<span className="owner-stat-icon amber"><Clock3 size={19} /></span></span><strong>{loading ? "—" : pending}<small>{t("units.requests")}</small></strong><span className="owner-stat-note">{pendingApplications.length} {t("units.applications")} · {pendingSurveys.length} {t("units.surveys")}<ArrowUpRight size={15} /></span></button>
          </section>
          {showForm && <section className="market-editor owner-editor"><div className="owner-editor-heading"><span className="owner-section-icon"><Building size={21} /></span><div><h2>{editing ? t("form.propertyInfo") : t("form.propertyDetails")}</h2><p>{t("form.saveHint")}</p></div></div><form onSubmit={save} className="market-form">
            <div className="wide owner-analysis-guide"><h3>{t("form.analysisTitle")}</h3><p>{t("form.analysisHint")}</p></div>
            <label>{t("form.name")}<input required maxLength={150} placeholder={t("form.namePlaceholder")} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
            <label>{t("form.address")}<input required maxLength={300} placeholder={t("form.addressPlaceholder")} value={form.address} onChange={event => setForm({ ...form, address: event.target.value })} /></label>
            <label>{t("form.price")}<input type="number" min={1000000} max={100000000000} required value={form.price} onChange={event => setForm({ ...form, price: event.target.value })} /></label>
            <label>{t("form.area")}<input type="number" min={1} max={100000} step="any" required value={form.area} onChange={event => setForm({ ...form, area: event.target.value })} /></label>
            <PropertyLocationPicker latitude={form.latitude} longitude={form.longitude} onChange={(latitude, longitude) => setForm(current => ({ ...current, latitude, longitude }))} />
            <label>{t("form.latitude")}<input type="number" min={-90} max={90} step="any" required value={form.latitude} onChange={event => setForm({ ...form, latitude: event.target.value })} /></label>
            <label>{t("form.longitude")}<input type="number" min={-180} max={180} step="any" required value={form.longitude} onChange={event => setForm({ ...form, longitude: event.target.value })} /></label>
            <div className="wide owner-analysis-guide"><p>{t("form.coordinatesHint")}</p></div>
            <ListingPhotoUpload value={form.image} disabled={busy} onBusy={setUploadingPhoto} onChange={image=>setForm(current=>({...current,image}))}/>
            <p className="wide">{t("form.facilitiesHint")}</p>
            <label>{t("form.power")}<input type="number" min="1" step="1" max="10000000" placeholder={t("form.unknown")} value={facilityValue("Listrik ")} onChange={event => setFacility("Listrik ", event.target.value)} /></label>
            <label>{t("form.water")}<select value={facilityValue("Air: ")} onChange={event => setFacility("Air: ", event.target.value)}><option value="">{t("form.unknown")}</option><option value="PDAM">{t("form.pdam")}</option><option value="Sumur">{t("form.well")}</option></select></label>
            <label>{t("form.parking")}<input type="number" min="0" step="1" max="10000" placeholder={t("form.unknown")} value={facilityValue("Parkir mobil: ")} onChange={event => setFacility("Parkir mobil: ", event.target.value)} /></label>
            <label>{t("form.facilities")}<input placeholder={t("form.facilitiesPlaceholder")} value={form.facilities} onChange={event => setForm({ ...form, facilities: event.target.value })} /></label>
            <label className="wide">{t("form.description")}<textarea maxLength={5000} placeholder={t("form.descriptionPlaceholder")} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></label>
            <label>{t("form.publicationStatus")}<select value={form.status} onChange={event => setForm({ ...form, status: event.target.value as "draft" | "available" })}><option value="draft">{listingText("draft")}</option><option value="available">{t("form.availableForRent")}</option></select></label>
            <div className="market-actions owner-form-actions"><button type="button" disabled={busy} onClick={() => { if (compose) router.push("/owner"); else setShowForm(false); }}>{t("actions.cancel")}</button><button className="primary" disabled={busy || uploadingPhoto}>{busy ? t("actions.saving") : form.status === "available" ? t("actions.savePublish") : t("actions.saveDraft")}<ArrowRight size={16} /></button></div>
          </form></section>}
          <div className={`owner-content-grid ${view !== "listings" || showForm || compose ? "full" : ""}`}>
            <section hidden={compose || showForm || view !== "listings"} className="market-section owner-inventory">
              <div className="market-section-head"><div><h2>Properti Anda <span className="owner-count">{listings.length}</span></h2><p>Ruang usaha yang Anda kelola.</p></div><label className="market-search"><Search size={16} /><input aria-label="Cari properti" placeholder="Cari nama atau lokasi…" value={search} onChange={event => setSearch(event.target.value)} /></label></div>
              <div className="market-tabs owner-filters" aria-label={t("filters.propertyStatus")}>{["Semua", "available", "reserved", "rented", "draft"].map(value => <button key={value} aria-pressed={tab === value} onClick={() => setTab(value)}>{value === "Semua" ? t("filters.allProperties") : listingText(value)}<span>{value === "Semua" ? listings.length : counts[value as keyof typeof counts]}</span></button>)}</div>
              {loading ? <div className="owner-property-skeletons" role="status" aria-label="Memuat properti">{[1,2].map(item => <div key={item}><span /><i /><i /></div>)}</div> : !visible.length ? <div className="owner-empty"><Building size={28} /><h3>{listings.length ? "Belum ada properti yang cocok" : "Portofolio Anda dimulai di sini"}</h3><p>{listings.length ? "Coba kata pencarian atau status yang berbeda." : "Tambahkan properti pertama Anda dan temukan calon penyewa."}</p>{listings.length ? <button onClick={() => { setSearch(""); setTab("Semua"); }}>Tampilkan semua properti</button> : <Link className="owner-primary-link" href="/owner/listing-baru"><Plus size={16} /> Tambah properti</Link>}</div> : <div className="market-listings owner-property-grid">{visible.map(item => <article className="owner-property-card" key={item.id}>
                <div className="owner-property-visual"><img src={item.image} alt={item.name} loading="lazy" /><span className={`market-badge owner-status ${item.status}`}><i />{listingText(item.status)}</span><span className="owner-property-number">#{String(item.id).padStart(3,"0")}</span></div>
                <div className="owner-property-body"><h3>{item.name}</h3><p className="owner-property-address"><MapPin size={14} />{item.address}</p><div className="owner-property-price"><strong>{rupiah(item.price)}</strong><span>/ tahun</span></div><div className="owner-property-specs"><span><Building size={14} />{item.area} m²</span><span>{item.facilities.length ? item.facilities.slice(0,2).join(" · ") : "Fasilitas belum ditambahkan"}</span></div>
                  <div className={`owner-property-analysis ${item.analysis ? "ready" : ""}`}><span><Sparkles size={15} />{item.analysis ? "Skor potensi usaha" : "Analisis setelah publikasi"}</span>{item.analysis && <strong>{Math.round(item.analysis.score)}<small>/100</small></strong>}</div>
                  <div className="market-actions owner-property-actions">{["draft","available"].includes(item.status) && <button onClick={() => editListing(item)} disabled={busy}>Kelola properti<ArrowUpRight size={16} /></button>}{item.status === "reserved" && <button className="primary" disabled={busy} onClick={() => void rentalStatus(item,"rented")}>Tandai disewa<ArrowRight size={15} /></button>}{["reserved","rented"].includes(item.status) && <button disabled={busy} onClick={() => void rentalStatus(item,"available")}>{item.status === "rented" ? "Akhiri sewa" : "Batalkan reservasi"}</button>}</div>
                </div>
              </article>)}</div>}
              {!loading && visible.length > 0 && <p className="owner-inventory-footer">Menampilkan {visible.length} dari {listings.length} properti<span><ShieldCheck size={14} /> Data portofolio Anda</span></p>}
            </section>
            {!compose && !showForm && view === "listings" && <aside className="owner-insights" aria-label="Aktivitas dan ringkasan">
              <section className="owner-attention-panel"><div className="owner-panel-heading"><span className="owner-section-icon amber"><Clock3 size={18} /></span><h2>Perlu perhatian</h2>{pending > 0 && <b>{pending}</b>}</div>
                {loading ? <p className="owner-panel-empty">Memuat aktivitas…</p> : pending === 0 ? <div className="owner-all-clear"><CircleCheck size={27} /><strong>Semua sudah ditangani.</strong><p>Pengajuan dan survei baru akan muncul di sini.</p></div> : <div className="owner-activity-list">{pendingApplications.slice(0,2).map(item => <button key={item.id} onClick={() => navigateView("applications")}><span className="owner-activity-icon"><ClipboardList size={17} /></span><span><strong>Pengajuan sewa baru</strong><small>{item.tenant.fullName} · {item.listingName}</small></span><ChevronRight size={16} /></button>)}{pendingSurveys.slice(0,2).map(item => <button key={item.id} onClick={() => navigateView("surveys")}><span className="owner-activity-icon green"><CalendarDays size={17} /></span><span><strong>Konfirmasi jadwal survei</strong><small>{item.listingName} · {item.date}</small></span><ChevronRight size={16} /></button>)}</div>}
                <button className="owner-text-button" onClick={() => navigateView(pendingApplications.length ? "applications" : "surveys")}>Lihat semua permintaan<ArrowRight size={15} /></button>
              </section>
              <section className="owner-occupancy-panel"><div className="owner-panel-heading"><h2>Status portofolio</h2><Building size={17} /></div><div className="owner-occupancy-number"><strong>{loading ? "—" : `${occupancy}%`}</strong><span>properti sedang disewa</span></div><div className="owner-occupancy-bar" aria-hidden="true">{(["rented","reserved","available","draft"] as const).map(status => <span key={status} className={status} style={{width:listings.length ? `${counts[status]/listings.length*100}%` : "0%"}} />)}</div><div className="owner-occupancy-legend">{(["rented","available","reserved","draft"] as const).map(status => <div key={status}><span><i className={`owner-dot ${status}`} />{listingLabels[status]}</span><strong>{counts[status]}</strong></div>)}</div></section>
              <section className="owner-schedule-panel"><div className="owner-panel-heading"><h2>Survei mendatang</h2><CalendarDays size={17} /></div>{upcoming.length ? upcoming.map(item => <button className="owner-schedule-item" key={item.id} onClick={() => navigateView("surveys")}><span className="owner-date-tile"><small>{new Intl.DateTimeFormat("id-ID",{month:"short"}).format(new Date(`${item.date}T12:00:00+07:00`))}</small><strong>{item.date.slice(-2)}</strong></span><span><strong>{item.listingName}</strong><small>{item.time} WIB · {item.visitors} pengunjung</small></span><ChevronRight size={15} /></button>) : <p className="owner-panel-empty">Belum ada kunjungan terkonfirmasi.</p>}</section>
            </aside>}
            <section hidden={compose || view !== "applications"} id="requests" className="market-section owner-request-section"><div className="owner-section-title"><h2>{t("sections.applications")} <span className="owner-count">{applications.length}</span></h2><p>{t("sections.applicationsHint")}</p></div>{!applications.length && <div className="owner-empty"><ClipboardList size={30} /><h3>{t("empty.noApplications")}</h3><p>{t("empty.noApplicationsHint")}</p></div>}<div className="market-requests">{applications.map(item => <article key={item.id} data-testid={`application-${item.id}`}><span className="owner-request-kicker">{t("sections.applicationKicker")} · #{item.id.slice(-6).toUpperCase()}</span><div className="market-request-title"><h3>{item.tenant.businessName}</h3><span className={`market-badge ${item.status}`}>{applicationText(item.status)}</span></div><p className="owner-request-property"><Building size={15} />{item.listingName}</p><div className="owner-request-finance"><strong>{rupiah(item.offer)}<small> / tahun</small></strong><span>{item.duration} tahun</span></div><dl className="owner-request-details"><div><dt>Calon penyewa</dt><dd>{item.tenant.fullName}</dd></div><div><dt>Mulai sewa</dt><dd>{item.startDate}</dd></div><div><dt>Email</dt><dd>{item.seekerEmail}</dd></div><div><dt>Telepon</dt><dd>{item.tenant.phone}</dd></div></dl>{item.proposal && <p className="owner-proposal">{item.proposal}</p>}{view === "applications" && <details className="owner-documents"><summary>Tinjau dokumen pengajuan<ChevronDown size={15} /></summary><ApplicationDocuments listingId={item.listingId} applicationId={item.id} /></details>}<button className="owner-chat-action" onClick={() => openChat(item)}><MessageSquare size={16} />Chat pencari<ArrowUpRight size={15} /></button>{item.status === "pending" ? <><label>Catatan untuk pencari<textarea placeholder="Tambahkan catatan keputusan…" value={notes[item.id] ?? ""} maxLength={2000} onChange={event => setNotes({ ...notes, [item.id]: event.target.value })} /></label><div className="market-actions owner-decision-actions"><button className="primary" disabled={busy} onClick={() => { if (window.confirm(`Setujui pengajuan ${item.tenant.fullName} untuk ${item.listingName}? Pengajuan lain akan ditolak dan properti ditandai Dipesan.`)) void decide("applications", item.id, "approved"); }}><CircleCheck size={16} />Setujui pengajuan</button><button disabled={busy} onClick={() => void decide("applications", item.id, "rejected")}>Tolak</button></div></> : <p className="owner-decision-note">{item.ownerNote || "Keputusan sudah tersimpan dan dapat dilihat pencari."}</p>}</article>)}</div></section>
            <section hidden={compose || view !== "surveys"} className="market-section owner-request-section"><div className="owner-section-title"><h2>{t("sections.surveys")} <span className="owner-count">{surveys.length}</span></h2><p>{t("sections.surveysHint")}</p></div>{!surveys.length && <div className="owner-empty"><CalendarDays size={30} /><h3>{t("empty.noSurveys")}</h3><p>{t("empty.noSurveysHint")}</p></div>}<div className="market-requests">{surveys.map(item => <article key={item.id} data-testid={`survey-${item.id}`}><span className="owner-request-kicker">{t("sections.surveyKicker")}</span><div className="market-request-title"><h3>{item.listingName}</h3><span className={`market-badge ${item.status}`}>{surveyText(item.status)}</span></div><div className="owner-survey-time"><CalendarDays size={22} /><div><strong>{item.date}</strong><small>{item.time} WIB · {item.visitors} pengunjung</small></div></div><p>{item.seekerEmail}</p>{item.note && <p className="owner-proposal">{item.note}</p>}<button className="owner-chat-action" onClick={() => openChat(item)}><MessageSquare size={16} />Chat pencari<ArrowUpRight size={15} /></button>{item.status === "pending" ? <><label>Catatan untuk pencari<textarea placeholder="Petunjuk lokasi atau informasi kunjungan…" maxLength={2000} value={notes[item.id] ?? ""} onChange={event => setNotes({ ...notes, [item.id]: event.target.value })} /></label><div className="market-actions owner-decision-actions"><button className="primary" disabled={busy} onClick={() => void decide("surveys", item.id, "confirmed")}><CircleCheck size={16} />Konfirmasi jadwal</button><button disabled={busy} onClick={() => void decide("surveys", item.id, "rejected")}>Tolak</button></div></> : <p className="owner-decision-note">{item.ownerNote || "Status kunjungan sudah diperbarui."}</p>}</article>)}</div></section>
            {view === "messages" && !compose && <section className="market-section owner-messages-section"><div className="owner-section-title"><h2>Kotak masuk</h2><p>Satu percakapan lebih dekat dengan penyewa berikutnya.</p></div><ChatInbox key={chatTarget ? `${chatTarget.listingId}:${chatTarget.seekerId}` : "inbox"} role="pemilik" initialThread={chatTarget} initialListingId={initialListingId} /></section>}
            {view === "payments" && !compose && <section className="market-section"><PaymentHistory applications={applications} role="pemilik" loading={loading} error={error}/></section>}
          </div>
          <footer className="owner-footer"><span>Propora.AI <span>Workspace pemilik</span></span><span>Ruang yang tepat. Usaha yang bertumbuh.</span></footer>
        </div>
      </div>
    </main>
  );
}
