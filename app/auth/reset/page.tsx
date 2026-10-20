"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { LanguageSwitcher } from "../../components/language-switcher";
import "../../login/login.css";
export default function ResetPasswordPage() {
  const [password,setPassword] = useState("");
  const [confirmation,setConfirmation] = useState("");
  const [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false);
  const [done,setDone] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmation) { setMessage("Konfirmasi kata sandi belum cocok."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/auth/password", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password})});
      const data = await response.json();
      setMessage(data.message ?? data.error); setDone(response.ok);
    } catch { setMessage("Koneksi terputus. Silakan coba lagi."); }
    finally { setBusy(false); }
  }
  return <main className="login-page login-reset-page"><section className="login-form-region"><div className="login-form-content">
    <LanguageSwitcher />
    <h1>Buat kata sandi baru</h1>
    <p>Gunakan tautan reset dari email untuk memperbarui kata sandi akun Anda.</p>
    {!done && <form onSubmit={submit} aria-busy={busy}>
      <div className="login-field"><label htmlFor="new-password">Kata sandi baru</label><input id="new-password" type="password" autoComplete="new-password" disabled={busy} required minLength={8} maxLength={128} value={password} onChange={event=>setPassword(event.target.value)} /></div>
      <div className="login-field"><label htmlFor="confirm-password">Konfirmasi kata sandi</label><input id="confirm-password" type="password" autoComplete="new-password" disabled={busy} required minLength={8} maxLength={128} value={confirmation} onChange={event=>setConfirmation(event.target.value)} /></div>
      <button className="login-submit" disabled={busy} type="submit">{busy ? "Menyimpan…" : "Simpan kata sandi"}</button>
    </form>}
    <p role="status">{message}</p><Link href="/login">Kembali ke halaman masuk</Link>
  </div></section></main>;
}
