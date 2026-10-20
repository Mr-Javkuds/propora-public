"use client";
import Link from "next/link";
import {useState} from "react";
import {useLocale} from "next-intl";
import {CreditCard, ReceiptText, Search} from "lucide-react";
import type {Application, PaymentReceipt} from "../lib/marketplace-types";
import {applicationLabels} from "../lib/marketplace-types";
import {paymentMethods,paymentRecords,rentalDate,rentalYears} from "../lib/rental-ledger";
import {rupiah} from "../lib/marketplace-client";
import "./payment-history.css";

export function ReceiptDetails({payment}:{payment:PaymentReceipt}) {
  const locale=useLocale();
  return <dl className="ledger-details"><div><dt>ID transaksi</dt><dd>{payment.id}</dd></div><div><dt>Waktu pembayaran</dt><dd>{rentalDate(payment.time,locale)}</dd></div><div><dt>Metode</dt><dd>{paymentMethods[payment.method] || "Metode belum tersedia"}</dd></div><div><dt>Nominal tercatat</dt><dd>{rupiah(payment.amount)}</dd></div><div><dt>Status</dt><dd>Selesai</dd></div></dl>;
}

export default function PaymentHistory({applications,role,loading=false,error=""}:{applications:Application[];role:"pencari"|"pemilik";loading?:boolean;error?:string}) {
  const locale=useLocale();
  const [query,setQuery]=useState("");
  const records=paymentRecords(applications);
  const filtered=records.filter(item=>`${item.listingName} ${item.payment.id} ${item.tenant.fullName} ${item.ownerEmail} ${item.seekerEmail}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <div className="payment-ledger">
    <div className="ledger-notice"><CreditCard size={19}/><p><strong>Riwayat pembayaran</strong><span>Bukti berikut dibaca dari catatan pembayaran pengajuan. Tidak ada dana asli yang ditagih atau diterima melalui aplikasi.</span></p></div>
    <div className="ledger-summary"><div><span>Transaksi tercatat</span><strong>{loading || error ? "—" : records.length}</strong></div><div><span>Total pembayaran</span><strong>{loading || error ? "—" : rupiah(records.reduce((sum,item)=>sum+item.payment.amount,0))}</strong></div></div>
    <label className="ledger-search"><Search size={17}/><input aria-label="Cari riwayat pembayaran" placeholder="Cari properti, nama, email, atau ID transaksi…" value={query} onChange={event=>setQuery(event.target.value)}/></label>
    {loading ? <p role="status">Memuat riwayat pembayaran…</p> : error ? <p role="alert">{error}</p> : !records.length ? <div className="ledger-empty"><ReceiptText size={30}/><h2>Belum ada pembayaran tercatat</h2><p>Pembayaran yang berhasil disimpan akan muncul di sini. Persetujuan pengajuan saja belum menghasilkan bukti pembayaran.</p></div> : !filtered.length ? <p>Tidak ada transaksi yang sesuai pencarian.</p> : <div className="ledger-list">{filtered.map(item=><article className="ledger-card" key={item.payment.id}>
      <div className="ledger-card-top"><div><span className="ledger-badge">Selesai</span><h2>{item.listingName}</h2><p>{item.address}</p></div><strong>{rupiah(item.payment.amount)}</strong></div>
      <div className="ledger-parties"><span>{role==="pemilik" ? "Penyewa" : "Pemilik"}<strong>{role==="pemilik" ? item.tenant.fullName : item.ownerEmail || "Belum tersedia"}</strong>{role==="pemilik" && <small>{item.seekerEmail}</small>}</span><span>Metode<strong>{paymentMethods[item.payment.method]}</strong></span><span>Tanggal pembayaran<strong>{rentalDate(item.payment.time,locale)}</strong></span></div>
      <details><summary>Lihat rincian & bukti pembayaran</summary><ReceiptDetails payment={item.payment}/><dl className="ledger-details"><div><dt>ID pengajuan</dt><dd>{item.id}</dd></div><div><dt>Status pengajuan saat ini</dt><dd>{applicationLabels[item.status]}</dd></div><div><dt>Penawaran sewa per tahun</dt><dd>{rupiah(item.offer)}</dd></div><div><dt>Durasi</dt><dd>{rentalYears(item.duration,locale)}</dd></div><div><dt>Mulai sewa</dt><dd>{rentalDate(item.startDate,locale)}</dd></div></dl>{item.status==="withdrawn" && <p className="ledger-closed">Pengajuan sudah ditutup. Bukti pembayaran tetap tersimpan sebagai riwayat; tidak ada pencatatan pengembalian dana pada fitur ini.</p>}</details>
      <div className="ledger-actions">{role==="pencari" ? <><Link href={`/pencari/results/${item.listingId}/analysis`}>Detail properti</Link><Link href="/pencari/my-rent">Lihat sewa saya</Link></> : <Link href="/owner?view=applications">Lihat pengajuan sewa</Link>}</div>
    </article>)}</div>}
  </div>;
}
