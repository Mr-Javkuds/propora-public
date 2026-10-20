"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {useLocale} from "next-intl";
import {ArrowRight,Building2,CheckCircle2,Clock3,CreditCard,ReceiptText,RefreshCcw,ShieldCheck} from "lucide-react";
import {SeekerHeader,SeekerSidebar} from "../../components/seeker-navigation";
import ApplicationDocuments from "../../components/application-documents";
import {ReceiptDetails} from "../../components/payment-history";
import {api,rupiah} from "../../lib/marketplace-client";
import {rentalStatusLabel} from "../../lib/rental-status";
import {estimatedLeaseBoundary,rentalDate,rentalYears} from "../../lib/rental-ledger";
import type {Application} from "../../lib/marketplace-types";
import "../pencari.css";
import "../seeker-pages.css";
import "./my-rent.css";

export default function MyRentPage(){
  const [rentals,setRentals]=useState<Application[]>([]),[tab,setTab]=useState("all");
  const [loading,setLoading]=useState(true),[error,setError]=useState("");
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();let timer:ReturnType<typeof setTimeout>;
    const load=async()=>{try{const data=await api<{applications:Application[]}>("/api/pencari/applications",{signal:controller.signal});if(!controller.signal.aborted){setRentals(data.applications);setError("");}}catch(err){if(!controller.signal.aborted)setError(err instanceof Error?err.message:"Rincian sewa gagal dimuat.");}finally{if(!controller.signal.aborted){setLoading(false);timer=setTimeout(()=>void load(),5000);}}};
    const onFocus=()=>{if(document.visibilityState==="visible"){clearTimeout(timer);void load();}};
    window.addEventListener("focus",onFocus);document.addEventListener("visibilitychange",onFocus);
    void load();return()=>{controller.abort();clearTimeout(timer);window.removeEventListener("focus",onFocus);document.removeEventListener("visibilitychange",onFocus);};
  },[revision]);
  const active=rentals.filter(item=>item.status==="approved"),history=rentals.filter(item=>["withdrawn","rejected"].includes(item.status));
  const unpaid=active.filter(item=>!item.payment);
  const visible=(tab==="pending"?rentals.filter(item=>item.status==="pending"):tab==="history"?history:active.filter(item=>tab==="all"||(tab==="rented"?item.listingStatus==="rented":item.listingStatus!=="rented")))
    .toSorted((a,b)=>Number(b.status==="approved"&&!b.payment)-Number(a.status==="approved"&&!a.payment)||b.updatedAt.localeCompare(a.updatedAt));
  return <main className="pencari-shell seeker-shell seeker-page-shell"><SeekerSidebar/><SeekerHeader/>
    <section className="pencari-main"><div className="pencari-container seeker-page-container my-rent-container">
      <div className="my-rent-heading"><div><p className="seeker-page-eyebrow">RUANG USAHA ANDA</p><h1>Sewa saya</h1><p className="seeker-page-intro">Pantau persetujuan, selesaikan pembayaran, dan lihat bukti sewa Anda.</p></div><button type="button" onClick={()=>setRevision(value=>value+1)} aria-label="Muat ulang data sewa" title="Muat ulang data sewa"><RefreshCcw size={18}/></button></div>
      <div className="my-rent-summary"><div><CreditCard size={20}/><span>Perlu pembayaran</span><strong>{loading||error?"—":unpaid.length}</strong></div><div><CheckCircle2 size={20}/><span>Pembayaran tercatat</span><strong>{loading||error?"—":active.filter(item=>!!item.payment).length}</strong></div><Link href="/pencari/payments"><ReceiptText size={20}/><span>Riwayat pembayaran</span><ArrowRight size={18}/></Link></div>
      <div className="my-rent-tabs" role="group" aria-label="Filter sewa">{[["all","Disetujui"],["pending","Menunggu persetujuan"],["rented","Sedang disewa"],["reserved","Reservasi"],["history","Riwayat ditutup"]].map(([value,label])=><button key={value} type="button" aria-pressed={tab===value} onClick={()=>setTab(value)}>{label}</button>)}</div>
      {error&&<p role="alert">{error} <button onClick={()=>setRevision(value=>value+1)}>Coba lagi</button></p>}
      {loading?<p role="status">Memuat rincian sewa…</p>:!error&&!visible.length?<div className="seeker-empty"><Building2 size={32}/><h2>{tab==="history"?"Belum ada riwayat ditutup":"Belum ada sewa pada kategori ini"}</h2><p>Pengajuan yang disetujui muncul di My Rent. Pengajuan menunggu dan riwayat tersedia melalui filter di atas.</p><Link href="/pencari/sewa">Lihat status pengajuan</Link></div>:<div className="my-rent-grid">{visible.map(item=><RentalRecord key={item.id} item={item}/>)}</div>}
    </div></section>
  </main>;
}

function RentalRecord({item}:{item:Application}){
  const locale=useLocale();
  const [documentsOpen,setDocumentsOpen]=useState(false);
  const boundary=estimatedLeaseBoundary(item.startDate,item.duration);
  const closed=["withdrawn","rejected"].includes(item.status),approved=item.status==="approved",needsPayment=approved&&!item.payment;
  const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  return <article className="my-rent-card">
    <div className="my-rent-card-heading"><span className="my-rent-property-icon"><Building2 size={20}/></span><span className={`my-rent-status ${needsPayment?"needs-payment":item.payment?"is-paid":""}`}>{needsPayment?"Disetujui · Belum dibayar":rentalStatusLabel(item)}</span></div>
    <h2>{item.listingName}</h2><p className="my-rent-address">{item.address}</p>
    <section className={`my-rent-payment-callout ${needsPayment?"is-actionable":item.payment?"is-complete":"is-waiting"}`} aria-label="Status pembayaran">
      <div className="my-rent-payment-icon">{needsPayment?<CreditCard size={23}/>:item.payment?<CheckCircle2 size={23}/>:<Clock3 size={23}/>}</div>
      <div className="my-rent-payment-copy"><span>{needsPayment?"LANGKAH BERIKUTNYA":item.payment?"PEMBAYARAN TERCATAT":"STATUS PENGAJUAN"}</span><h3>{needsPayment?"Selesaikan pembayaran sewa":item.payment?"Bukti pembayaran tersedia":closed?"Pengajuan telah ditutup":"Menunggu persetujuan pemilik"}</h3><p>{needsPayment?"Pengajuan sudah disetujui. Pilih metode pembayaran untuk melanjutkan proses sewa.":item.payment?"Transaksi tercatat dan dapat dilihat di riwayat pembayaran.":closed?"Tidak ada pembayaran yang perlu diselesaikan untuk pengajuan ini.":"Pembayaran akan tersedia setelah pemilik menyetujui pengajuan Anda."}</p>{needsPayment&&<small><ShieldCheck size={14}/> Tidak ada dana yang ditagih.</small>}</div>
      {needsPayment?<div className="my-rent-payment-action"><span>Estimasi sewa</span><strong>{rupiah(item.offer*item.duration)}</strong><Link href={`/pencari/payment?listingId=${item.listingId}&applicationId=${encodeURIComponent(item.id)}`}>Lanjut ke pembayaran <ArrowRight size={17}/></Link></div>:item.payment?<Link className="my-rent-receipt-link" href="/pencari/payments">Lihat bukti <ArrowRight size={16}/></Link>:null}
    </section>
    <div className="my-rent-period"><span>Periode berdasarkan pengajuan</span><strong>{rentalDate(item.startDate,locale)} <span>→</span> {boundary?rentalDate(boundary,locale):"Belum tersedia"}</strong><small>{rentalYears(item.duration,locale)} · Batas akhir merupakan estimasi dari tanggal mulai + durasi, bukan tanggal kontrak terverifikasi.</small>{!closed&&item.startDate>today&&<p>Tanggal mulai sewa belum tiba.</p>}{!closed&&boundary&&today>=boundary&&<p>Batas periode estimasi sudah lewat. Konfirmasikan status sewa kepada pemilik.</p>}</div>
    <div className="my-rent-detail-columns"><section><h3>Rincian sewa</h3><dl><div><dt>Penawaran / tahun</dt><dd>{rupiah(item.offer)}</dd></div><div><dt>Estimasi total sewa</dt><dd>{rupiah(item.offer*item.duration)}</dd></div><div><dt>Penyewa</dt><dd>{item.tenant.fullName}</dd></div><div><dt>Usaha</dt><dd>{item.tenant.businessName}</dd></div><div><dt>Jenis usaha</dt><dd>{item.tenant.businessType}</dd></div><div><dt>Pemilik</dt><dd>{item.ownerEmail||"Belum tersedia"}</dd></div></dl><p className="my-rent-fineprint">Estimasi sewa tidak mencakup deposit, pajak, atau biaya lain yang belum dicatat.</p></section>
      <section><h3>Bukti pembayaran</h3>{item.payment?<ReceiptDetails payment={item.payment}/>:<p className="my-rent-no-receipt">{needsPayment?"Bukti akan muncul setelah pembayaran selesai.":"Belum ada bukti pembayaran untuk pengajuan ini."}</p>}</section>
    </div>
    {item.ownerNote&&<div className="my-rent-owner-note"><strong>Catatan pemilik</strong><p>{item.ownerNote}</p></div>}
    <details className="my-rent-documents" onToggle={event=>setDocumentsOpen(event.currentTarget.open)}><summary>Dokumen dan referensi pengajuan</summary><dl><div><dt>ID pengajuan</dt><dd>{item.id}</dd></div><div><dt>Diajukan</dt><dd>{rentalDate(item.createdAt,locale)}</dd></div><div><dt>Terakhir diperbarui</dt><dd>{rentalDate(item.updatedAt,locale)}</dd></div></dl>{item.proposal&&<p>{item.proposal}</p>}{documentsOpen&&<ApplicationDocuments listingId={item.listingId} applicationId={item.id}/>}</details>
    <div className="my-rent-actions"><Link href={`/pencari/results/${item.listingId}/analysis`}>Detail properti</Link><Link href={`/pencari/chat?listingId=${item.listingId}`}>Hubungi pemilik</Link><Link href={closed?"/pencari/sewa":`/pencari/booking/pengajuan-sewa?listingId=${item.listingId}`}>{closed?"Riwayat pengajuan":"Status pengajuan"}</Link></div>
  </article>;
}
