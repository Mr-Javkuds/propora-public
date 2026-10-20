"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, CreditCard, LockKeyhole, ShieldCheck } from "lucide-react";
import RentalStages from "../../components/rental-stages";
import { SeekerHeader, SeekerSidebar } from "../../components/seeker-navigation";
import { api, rupiah } from "../../lib/marketplace-client";
import { activeApplication } from "../../lib/rental-flow";
import type { Application, PaymentReceipt } from "../../lib/marketplace-types";
import "../pencari.css";
import "../seeker-pages.css";
import "./payment.css";

const methods = [{ id: "va", name: "Virtual account", description: "Transfer melalui virtual account bank" }, { id: "qris", name: "QRIS", description: "Bayar melalui aplikasi pembayaran pilihan Anda" }, { id: "wallet", name: "Dompet digital", description: "Pembayaran melalui dompet digital" }];

export default function PaymentPage() {
  const router = useRouter();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [listingId, setListingId] = useState(0);
  const [method, setMethod] = useState("va");
  const [step, setStep] = useState<"pending" | "processing" | "success">("pending");
  const [receipt, setReceipt] = useState({ id: "", time: "" });
  useEffect(() => {
    if (step !== "success") return;
    const timer = setTimeout(() => router.replace("/pencari/my-rent"), 1500);
    return () => clearTimeout(timer);
  }, [step, router]);
  useEffect(() => {
    if (step !== "processing") return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (!application) return;
      try {
        const { payment } = await api<{ payment: PaymentReceipt }>("/api/pencari/payments", { method: "POST", body: JSON.stringify({ applicationId: application.id, method }), signal: controller.signal });
        if (controller.signal.aborted) return;
        setReceipt(payment); setMethod(payment.method); setStep("success");
      } catch (error) { if (!controller.signal.aborted) { setError(error instanceof Error ? error.message : "Pembayaran belum tersimpan. Coba lagi."); setStep("pending"); dialog.current?.close(); } }
    }, 1500);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [step, application, method]);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    let timer:ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const id = Number(params.get("listingId"));
        const applicationId = params.get("applicationId");
        if (!Number.isSafeInteger(id) || id < 1) throw new Error("Pilih properti dari pengajuan Anda terlebih dahulu.");
        setListingId(id);
        const data = await api<{ applications: Application[] }>("/api/pencari/applications", { signal: controller.signal });
        if (!controller.signal.aborted) {
          const current = applicationId
            ? data.applications.find(item => item.id === applicationId && item.listingId === id) ?? null
            : activeApplication(data.applications, id);
          setApplication(current);
          if (current?.payment) { setReceipt(current.payment); setMethod(current.payment.method); }
        }
      } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Status pengajuan tidak dapat dimuat."); }
      finally { if (!controller.signal.aborted) {setLoading(false);timer=setTimeout(()=>{if(dialog.current?.open)timer=setTimeout(()=>void load(),5000);else void load();},5000);} }
    };
    const onFocus=()=>{if(!dialog.current?.open){clearTimeout(timer);void load();}};
    window.addEventListener("focus",onFocus);
    void load(); return () => {controller.abort();clearTimeout(timer);window.removeEventListener("focus",onFocus);};
  }, []);
  const approved = application?.status === "approved";
  const amount = (application?.offer ?? 0) * (application?.duration ?? 1);
  return <main className="pencari-shell seeker-shell seeker-page-shell"><SeekerSidebar /><SeekerHeader />
    <section className="pencari-main"><div className="pencari-container payment-container">
      <Link className="payment-back" href={listingId ? `/pencari/booking/pengajuan-sewa?listingId=${listingId}` : "/pencari/sewa"}><ArrowLeft size={16} /> Kembali ke pengajuan</Link>
      <RentalStages listingId={listingId} active={4} applicationStatus={application?.status} />
      <p className="seeker-page-eyebrow">TAHAP 4 · SETELAH PERSETUJUAN</p><h1>Pembayaran sewa</h1>
      <p className="seeker-page-intro">Pengajuan administrasi dan pembayaran merupakan dua tahap terpisah.</p>
      <Link href="/pencari/payments">Lihat riwayat pembayaran →</Link>
      {application?.listingDemo && <p>Properti ini belum terverifikasi melalui survei lapangan.</p>}
      <div className="payment-demo"><ShieldCheck size={20} /><div><strong>Pembayaran melalui Propora</strong><p>Selesaikan alur pembayaran Anda. Tidak ada dana yang ditagih.</p></div></div>
      {loading ? <p role="status">Memeriksa persetujuan pengajuan…</p> : error ? <div role="alert" className="payment-card"><p>{error}</p><Link href="/pencari/sewa">Lihat pengajuan saya</Link></div> : !approved ? <div className="payment-card payment-locked"><LockKeyhole size={32} /><h2>Menunggu persetujuan sewa</h2><p>{application ? "Pemilik belum menyetujui pengajuan Anda. Pilihan pembayaran tersedia setelah administrasi disetujui." : "Belum ada pengajuan aktif untuk properti ini. Lengkapi pengajuan administrasi terlebih dahulu."}</p><Link href={`/pencari/booking/pengajuan-sewa?listingId=${listingId}`}>Lihat pengajuan</Link></div> : <div className="payment-layout">
        <section className="payment-card"><h2>Pilih metode pembayaran</h2><p>Pilih metode untuk melanjutkan pembayaran sewa Anda.</p><fieldset disabled={!!application.payment}><legend>Metode pembayaran</legend>{methods.map(item => <label className={`payment-method ${method === item.id ? "selected" : ""}`} key={item.id}><input type="radio" name="payment-method" value={item.id} checked={method === item.id} onChange={() => { setMethod(item.id); setStep("pending"); }} /><CreditCard size={21} /><span><strong>{item.name}</strong><small>{item.description}</small></span></label>)}</fieldset></section>
        <aside className="payment-card"><span className="payment-approved">Administrasi disetujui</span><h2>{application.listingName}</h2><p>{application.address}</p><dl><div><dt>Penawaran per tahun</dt><dd>{rupiah(application.offer)}</dd></div><div><dt>Durasi</dt><dd>{application.duration} tahun</dd></div><div><dt>Mulai sewa</dt><dd>{application.startDate}</dd></div><div className="payment-total"><dt>Estimasi sewa</dt><dd>{rupiah(amount)}</dd></div></dl><p className="payment-note">Estimasi berdasarkan pengajuan yang disetujui. Deposit, pajak, biaya layanan, dan ketentuan kontrak belum termasuk.</p><button className="payment-preview" type="button" onClick={() => { if (application.payment) { setStep("success"); } dialog.current?.showModal(); }}>{application.payment || step === "success" ? "Lihat bukti pembayaran" : "Bayar sekarang"}</button></aside>
      </div>}
      <dialog ref={dialog} className="payment-dialog" aria-labelledby="payment-heading" onCancel={event => { if (step === "processing") event.preventDefault(); }}>
        <span className="payment-approved">Pembayaran Propora</span>
        {step === "success" ? <>
          <CheckCircle2 className="payment-success-icon" size={48} />
          <h2 id="payment-heading">Pembayaran berhasil!</h2><p>Pembayaran sewa {application?.listingName} berhasil diselesaikan.</p><strong>{rupiah(amount)}</strong>
          <dl className="payment-receipt"><div><dt>Status</dt><dd>Lunas</dd></div><div><dt>Metode</dt><dd>{methods.find(item => item.id === method)?.name}</dd></div><div><dt>ID transaksi</dt><dd>{receipt.id}</dd></div><div><dt>Waktu</dt><dd>{new Date(receipt.time).toLocaleString("id-ID")}</dd></div></dl>
          <Link className="payment-return" href="/pencari/my-rent">Kembali ke My Rent</Link><button className="payment-secondary" type="button" onClick={() => dialog.current?.close()}>Tutup</button>
        </> : step === "processing" ? <div role="status" aria-live="polite"><h2 id="payment-heading">Memproses pembayaran…</h2><p>Mohon tunggu, pembayaran Anda sedang diverifikasi.</p></div> : <>
          <h2 id="payment-heading">Selesaikan pembayaran</h2><p>{methods.find(item => item.id === method)?.name} · {application?.listingName}</p><strong>{rupiah(amount)}</strong>
          <div className="payment-instructions">{method === "va" ? <><b>Virtual account Propora</b><code>Nomor virtual account belum tersedia</code><p>Gunakan tombol di bawah untuk melanjutkan transfer dan verifikasi pembayaran.</p></> : method === "qris" ? <><b>Pembayaran QRIS</b><p>Gunakan tombol di bawah untuk melanjutkan pemindaian QRIS dan persetujuan pembayaran dari aplikasi Anda.</p></> : <><b>Konfirmasi dompet digital</b><p>Konfirmasikan pembayaran dari dompet digital melalui tombol di bawah.</p></>}</div>
          <button autoFocus type="button" onClick={() => setStep("processing")}>{method === "va" ? "Lanjutkan transfer" : method === "qris" ? "Bayar dengan QRIS" : "Konfirmasi pembayaran"}</button><button className="payment-secondary" type="button" onClick={() => dialog.current?.close()}>Kembali</button>
        </>}
      </dialog>
    </div></section>
  </main>;
}
