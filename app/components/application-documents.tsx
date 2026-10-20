"use client";
import "./application-documents.css";
import { useEffect, useId, useRef, useState } from "react";
import { CheckCircle2, FileText, ShieldCheck, Trash2, UploadCloud, LoaderCircle, ExternalLink } from "lucide-react";
import { api } from "../lib/marketplace-client";
export type RentalDocument = {id:string;kind:"ktp"|"npwp";name:string;size:number};
export default function ApplicationDocuments({listingId,applicationId,editable=false,onChange,onBusyChange}:{listingId:number;applicationId?:string;editable?:boolean;onChange?:(documents:RentalDocument[])=>void;onBusyChange?:(busy:boolean)=>void}) {
  const [documents,setDocuments] = useState<RentalDocument[]>([]);
  const [busy,setBusy] = useState(false);
  const [activeKind,setActiveKind] = useState<"ktp"|"npwp"|null>(null);
  const [errorKind,setErrorKind] = useState<"ktp"|"npwp"|null>(null);
  const [dragKind,setDragKind] = useState<"ktp"|"npwp"|null>(null);
  const lock = useRef(false);
  const inputId = useId();
  const [error,setError] = useState("");
  const [loading,setLoading] = useState(!!applicationId);
  useEffect(()=>{
    if (!applicationId) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const load=async()=>{
      try {
        const data=await api<{documents:RentalDocument[]}>(`/api/documents?applicationId=${applicationId}`,{signal:controller.signal});
        if (!controller.signal.aborted) {setDocuments(data.documents);setError("");}
      } catch(error) {if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Dokumen gagal dimuat.");}
      finally {if (!controller.signal.aborted) {setLoading(false);timer=setTimeout(()=>{void load();},8000);}}
    };
    void load();
    return ()=>{controller.abort();clearTimeout(timer);};
  },[applicationId]);
  function update(next: RentalDocument[]) {setDocuments(next);onChange?.(next);}
  async function upload(kind:"ktp"|"npwp",file?:File) {
    if (!file || lock.current || !editable || !listingId || loading) return;
    setErrorKind(kind);
    if (!file.size || file.size>5242880 || !["application/pdf","image/jpeg","image/png"].includes(file.type)) {setError("Pilih PDF, JPG, atau PNG maksimal 5MB.");return;}
    lock.current=true;setActiveKind(kind);setBusy(true);onBusyChange?.(true);setError("");
    try {
      const form = new FormData();form.set("file",file);form.set("kind",kind);form.set("listingId",String(listingId));
      if (applicationId) form.set("applicationId",applicationId);
      const result = await api<{document:RentalDocument}>("/api/documents",{method:"POST",body:form});
      update([...documents,result.document]);
    } catch(error) {setError(error instanceof Error ? error.message : "Dokumen gagal diunggah.");}
    finally {lock.current=false;setActiveKind(null);setBusy(false);onBusyChange?.(false);}
  }
  async function remove(id:string) {
    if (lock.current) return;
    lock.current=true;setActiveKind(documents.find(item=>item.id===id)?.kind ?? null);setBusy(true);onBusyChange?.(true);setError("");
    try {await api(`/api/documents/${id}`,{method:"DELETE"});update(documents.filter(item=>item.id!==id));}
    catch(error) {setError(error instanceof Error ? error.message : "Dokumen gagal dihapus.");}
    finally {lock.current=false;setActiveKind(null);setBusy(false);onBusyChange?.(false);}
  }
  function chooseFiles(kind:"ktp"|"npwp", files: File[]) {
    if (!files.length || busy) return;
    if (files.length > 1) { setErrorKind(kind);setError("Pilih satu file untuk setiap jenis dokumen.");return; }
    void upload(kind,files[0]);
  }
  const hasKtp = documents.some(item=>item.kind==="ktp");
  return <div className="rental-documents" aria-busy={busy || loading}>
    {editable && <div className="documents-overview">
      <div><strong>Dokumen pengajuan</strong><p>KTP wajib dilampirkan. NPWP dapat ditambahkan jika ada.</p></div>
      <span className={hasKtp ? "documents-ready" : "documents-required"}>{hasKtp ? <><CheckCircle2 size={15} /> KTP sudah lengkap</> : "KTP belum diunggah"}</span>
    </div>}
    {loading && <p role="status" className="document-message">Memuat dokumen…</p>}
    {error && !errorKind && <p className="document-error" role="alert">{error}</p>}
    <div className="document-card-list">
    {(["ktp","npwp"] as const).map(kind=>{
      const file=documents.find(item=>item.kind===kind);
      const active=busy && activeKind===kind;
      const disabled=busy || loading || !listingId;
      const hintId=`${inputId}-${kind}-hint`;
      const errorId=`${inputId}-${kind}-error`;
      return <section className={`document-card ${file ? "has-document" : ""}`} key={kind} aria-labelledby={`${inputId}-${kind}-title`}>
        <div className="document-card-heading">
          <span className="document-type-icon"><FileText size={20} /></span>
          <div><h3 id={`${inputId}-${kind}-title`}>{kind==="ktp" ? "Kartu Tanda Penduduk" : "NPWP"}</h3><p>{kind==="ktp" ? "Identitas penanggung jawab pengajuan" : "Dokumen pendukung perpajakan"}</p></div>
          <span className={`document-requirement ${kind==="ktp" ? "required" : ""}`}>{kind==="ktp" ? "Wajib" : "Opsional"}</span>
        </div>
        {file ? <div className="document-file">
          <span className="document-file-icon"><CheckCircle2 size={22} /></span>
          <div className="document-file-info"><strong>{file.name}</strong><span>{file.size>=1048576 ? `${(file.size/1048576).toFixed(1)} MB` : `${Math.max(1,Math.ceil(file.size/1024))} KB`} · Berhasil diunggah</span><a href={`/api/documents/${file.id}`} target="_blank" rel="noopener noreferrer">Lihat dokumen <ExternalLink size={12} /></a></div>
          {editable && !applicationId && <button className="document-remove" type="button" aria-label={`Hapus ${kind.toUpperCase()}`} disabled={busy} onClick={()=>{setErrorKind(kind);void remove(file.id);}}>{active ? <LoaderCircle size={16} className="document-spinner" /> : <Trash2 size={16} />}<span>Hapus</span></button>}
        </div> : editable ? <div className={`document-dropzone ${dragKind===kind ? "is-dragging" : ""} ${disabled ? "is-disabled" : ""}`}
          onDragOver={event=>{event.preventDefault();if(!disabled)setDragKind(kind);}}
          onDragLeave={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setDragKind(null);}}
          onDrop={event=>{event.preventDefault();setDragKind(null);if(!disabled)chooseFiles(kind,Array.from(event.dataTransfer.files));}}>
          <input id={`${inputId}-${kind}`} aria-label={`Unggah ${kind.toUpperCase()}`} aria-describedby={`${hintId}${error && errorKind===kind ? ` ${errorId}` : ""}`} aria-invalid={!!error && errorKind===kind} type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={disabled} onChange={event=>{chooseFiles(kind,Array.from(event.target.files ?? []));event.target.value="";}} />
          <label htmlFor={`${inputId}-${kind}`}>
            <span className="document-upload-icon">{active ? <LoaderCircle size={24} className="document-spinner" /> : <UploadCloud size={24} />}</span>
            <strong>{active ? `Mengunggah ${kind.toUpperCase()}…` : <>Pilih file <span>atau tarik ke sini</span></>}</strong>
            <small id={hintId}>PDF, JPG, atau PNG · Maksimal 5 MB per file</small>
            {!active && <span className="document-choose">Pilih {kind.toUpperCase()}</span>}
          </label>
        </div> : <p className="document-empty">Belum ada dokumen {kind.toUpperCase()} yang dilampirkan.</p>}
        {!file && editable && <p className="document-guidance">{kind==="ktp" ? "Pastikan foto terang, seluruh kartu terlihat, dan tulisan terbaca." : "Tambahkan NPWP jika tersedia. Anda tetap dapat melanjutkan tanpa dokumen ini."}</p>}
        {error && errorKind===kind && <p id={errorId} className="document-error" role="alert">{error}</p>}
      </section>;
    })}
    </div>
    {editable && !listingId && <p className="document-error" role="alert">Pilih properti yang tersedia terlebih dahulu agar dokumen bisa diunggah.</p>}
    <div className="document-privacy"><ShieldCheck size={18} /><p>Dokumen bersifat privat. Pemilik properti terkait dapat mengaksesnya setelah pengajuan dikirim.</p></div>
    <span className="document-sr-status" role="status">{busy ? "Dokumen sedang diproses. Tunggu hingga selesai sebelum mengirim pengajuan." : hasKtp ? "KTP berhasil dilampirkan." : ""}</span>
  </div>;
}