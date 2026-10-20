"use client";
/* eslint-disable @next/next/no-img-element */
import { useId, useRef, useState } from "react";
import { CheckCircle2, ImagePlus, LoaderCircle, UploadCloud } from "lucide-react";
import { useTranslations } from "next-intl";
import { api } from "../lib/marketplace-client";
import "./listing-photo-upload.css";

export default function ListingPhotoUpload({ value, onChange, onBusy, disabled }: { value: string; onChange: (value: string) => void; onBusy: (busy: boolean) => void; disabled: boolean }) {
  const t = useTranslations("Owner.photoUpload");
  const input = useRef<HTMLInputElement>(null);
  const uploading = useRef(false);
  const hintId = useId();
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const locked = disabled || busy;
  async function upload(file?: File) {
    if (!file || disabled || uploading.current) return;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || !file.size || file.size > 5242880) { setError(t("invalid")); return; }
    uploading.current = true;
    setBusy(true); onBusy(true);
    try {
      const body = new FormData(); body.set("file", file);
      const result = await api<{ image: string }>("/api/owner/photos", { method: "POST", body });
      if (!result || typeof result.image !== "string" || !result.image.startsWith("/api/listing-photos/")) throw new Error(t("failed"));
      onChange(result.image);
    } catch (error) { setError(error instanceof Error ? error.message : t("failed")); }
    finally { uploading.current = false; setBusy(false); onBusy(false); }
  }
  return <div className="listing-photo-field wide">
    <div className="listing-photo-heading"><strong>{t("title")}</strong><span>{t("cover")}</span></div>
    <p>{t("description")}</p>
    <div className={`listing-photo-dropzone${dragging ? " is-dragging" : ""}${value ? " has-photo" : ""}${locked ? " is-disabled" : ""}`} aria-busy={busy}
      onDragOver={event => { event.preventDefault(); if (!locked) setDragging(true); }}
      onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
      onDrop={event => { event.preventDefault(); setDragging(false); if (!locked) { if (event.dataTransfer.files.length > 1) setError(t("single")); else void upload(event.dataTransfer.files[0]); } }}>
      {value ? <div className="listing-photo-preview"><img src={value} alt={t("preview")} /><span><CheckCircle2 size={14} />{t("uploaded")}</span></div> : <div className="listing-photo-icon"><ImagePlus size={28} strokeWidth={1.7} /></div>}
      <div className="listing-photo-content"><strong>{busy ? t("uploading") : value ? t("replaceHeading") : t("dropHeading")}</strong><p>{value ? t("replaceHint") : t("dropHint")}</p>
        <button type="button" className="listing-photo-choose" disabled={locked} onClick={() => input.current?.click()} aria-describedby={hintId}>{busy ? <LoaderCircle className="listing-photo-spinner" size={17} /> : <UploadCloud size={17} />}{busy ? t("uploading") : value ? t("replace") : t("choose")}</button>
        <small id={hintId}>{t("formats")}</small>
      </div>
      <input ref={input} className="listing-photo-native" aria-label={t("choose")} type="file" accept="image/jpeg,image/png,image/webp" disabled={locked} tabIndex={-1} onChange={event => { void upload(event.target.files?.[0]); event.target.value = ""; }} />
    </div>
    <small className="listing-photo-note">{t("privacy")}</small>
    <span className="listing-photo-status" role="status">{busy ? t("uploading") : ""}</span>
    {error && <p role="alert" className="market-error">{error}</p>}
  </div>;
}
