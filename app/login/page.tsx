"use client";

import { ProporaLogo } from "../components/propora-logo";
import { LanguageSwitcher } from "../components/language-switcher";

import { Suspense, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Building, Check, MapPin, Store, X } from "../components/ui/next-icons";
import type { Role } from "../lib/auth-policy";
import "./login.css";

type Mode = "login" | "register";

export default function LoginPage() {
  return <Suspense fallback={<main className="login-page" />}><LoginContent /></Suspense>;
}

function LoginContent() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>(() => searchParams.get("mode") === "register" ? "register" : "login");
  const [role, setRole] = useState<Role>("pencari");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const confirmationRef = useRef<HTMLInputElement>(null);
  const register = mode === "register";

  function changeMode(next: Mode) {
    setMode(next);
    setError("");
  }

  function handleModeKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (busy || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? "login" : event.key === "End" ? "register" : register ? "login" : "register";
    changeMode(next);
    event.currentTarget.querySelector<HTMLButtonElement>(`#auth-tab-${next}`)?.focus();
  }

  async function recoverPassword() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/recovery", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})});
      const data = await response.json(); setError(data.message ?? data.error);
    } catch { setError("Koneksi terputus. Silakan coba lagi."); }
    finally { setBusy(false); }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (register && password !== confirmation) {
      setError("Konfirmasi kata sandi belum cocok. Silakan periksa kembali.");
      confirmationRef.current?.focus();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/auth/${register ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(), password, role,
          returnTo: new URLSearchParams(window.location.search).get("returnTo"),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Tidak dapat masuk. Silakan coba lagi.");
      if (data.message) { setError(data.message); setBusy(false); return; }
      window.location.assign(data.redirectTo);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Koneksi terputus. Silakan coba lagi.");
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
     

      <div className="login-layout">
        <section className="login-form-region" aria-label="Akses akun Propora">
          <div className="login-form-content">
            <div className="login-intro">
   
              <h1>{register ? "Buat akun Propora" : "Selamat datang kembali."}</h1>
              <p>{register ? "Awali langkah usaha Anda bersama kami." : "Masuk untuk melanjutkan perjalanan usaha Anda."}</p>
            </div>

            <div className="login-mode" role="tablist" aria-label="Akses akun" onKeyDown={handleModeKeys}>
              {(["login", "register"] as const).map(value => (
                <button key={value} id={`auth-tab-${value}`} role="tab" type="button"
                  aria-selected={mode === value} aria-controls="auth-panel" tabIndex={mode === value ? 0 : -1}
                  disabled={busy} onClick={() => changeMode(value)}>
                  {value === "login" ? "Masuk" : "Daftar"}
                </button>
              ))}
            </div>

            <div id="auth-panel" role="tabpanel" aria-labelledby={`auth-tab-${mode}`}>
              <form onSubmit={handleSubmit} aria-busy={busy}>
                <fieldset className="login-role-fieldset" disabled={busy}>
                  <legend>Saya sebagai</legend>
                  <div className="login-roles">
                    {([
                      { value: "pencari", label: "Pencari properti", detail: "Untuk usaha saya", Icon: Store },
                      { value: "pemilik", label: "Pemilik properti", detail: "Untuk properti saya", Icon: Building },
                    ] as const).map(({ value, label, detail, Icon }) => (
                      <label key={value} className={`login-role ${role === value ? "is-selected" : ""}`}>
                        <input type="radio" name="role" value={value} checked={role === value}
                          onChange={() => { setRole(value); setError(""); }} />
                        <Icon size={21} strokeWidth={1.6} />
                        <span><strong>{label}</strong><small>{detail}</small></span>
                        <span className="login-role-indicator" aria-hidden="true">{role === value && <Check size={11} />}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {error && <div className="login-error"><p id="auth-error" role="alert">{error}</p><button type="button" aria-label="Tutup pesan galat" title="Tutup pesan galat" onClick={() => setError("")}><X size={16} /></button></div>}

                <div className="login-field">
                  <label htmlFor="email">Alamat email</label>
                  <input id="email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
                    placeholder="nama@email.com" value={email} onChange={event => setEmail(event.target.value)}
                    disabled={busy} required maxLength={254} aria-describedby={error ? "auth-error" : undefined} />
                </div>

                <div className="login-field">
                  <label htmlFor="password">Kata sandi</label>
                  <div className="login-password">
                    <input id="password" name="password" type={showPassword ? "text" : "password"}
                      autoComplete={register ? "new-password" : "current-password"}
                      placeholder={register ? "Minimal 8 karakter" : "Masukkan kata sandi"}
                      value={password} onChange={event => setPassword(event.target.value)}
                      disabled={busy} minLength={8} maxLength={128} required />
                    <button type="button" disabled={busy} aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                      aria-pressed={showPassword} title={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                      onClick={() => setShowPassword(value => !value)}>{showPassword ? "Sembunyikan" : "Lihat"}</button>
                  </div>
                </div>

                {register && <div className="login-field">
                  <label htmlFor="confirmation">Konfirmasi kata sandi</label>
                  <input ref={confirmationRef} id="confirmation" name="confirmation" type={showPassword ? "text" : "password"}
                    autoComplete="new-password" placeholder="Ulangi kata sandi" value={confirmation}
                    onChange={event => setConfirmation(event.target.value)} minLength={8} maxLength={128} disabled={busy} required />
                </div>}


                {!register && <button className="login-recovery" type="button" disabled={busy || !email} onClick={recoverPassword}>Lupa kata sandi?</button>}
                <button className="login-submit" type="submit" disabled={busy}>
                  <span>{busy ? "Memproses..." : register ? "Buat akun" : "Masuk ke Propora AI"}</span>
                  {busy ? <span className="login-spinner" aria-hidden="true" /> : <ArrowRight size={18} />}
                </button>
              </form>
            </div>

            <div className="login-guest"><span>Belum ingin masuk?</span><Link href="/">Kembali ke beranda <ArrowRight size={14} /></Link></div>
          </div>
          <footer className="login-footer"><span>&copy; {new Date().getFullYear()} Propora AI</span><span>Indonesia</span></footer>
        </section>

        <aside className="login-property-region" aria-label="Properti komersial Propora">
          <div className="login-property-content">
            <div className="login-property-location"><span /> SEMARANG, JAWA TENGAH</div>
            <h2>Ruang usaha.<br />Langkah berikutnya.</h2>
            <figure className="login-property-photo">
              <Image src="/figma/results/ruko-2.jpeg" alt="Properti komersial dengan fasad kaca dan akses jalan di Semarang" width={512} height={279} sizes="(max-width: 999px) 0px, (max-width: 1300px) 40vw, 500px" priority />
              <figcaption><span><MapPin size={16} /> Semarang Tengah</span><span>Properti komersial</span></figcaption>
            </figure>
            <div className="login-property-note"><span className="login-property-line" /><p>Setiap usaha punya tempatnya.</p></div>
          </div>
          <div className="login-property-bottom"><span>PROPORA / LOCATION INTELLIGENCE</span><span>01</span></div>
        </aside>
      </div>
    </main>
  );
}
