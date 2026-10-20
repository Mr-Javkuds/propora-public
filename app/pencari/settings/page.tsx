import Link from "next/link";
import { SeekerHeader, SeekerSidebar } from "../../components/seeker-navigation";
import { ArrowRight, User } from "../../components/ui/next-icons";
import { currentAccount } from "../../lib/auth-server";
import SettingsSignOut from "./sign-out";
import "../pencari.css";
import "../seeker-pages.css";

export default async function SeekerSettingsPage() {
  const account = await currentAccount();
  return <main className="pencari-shell seeker-shell seeker-page-shell">
    <SeekerSidebar /><SeekerHeader />
    <section className="pencari-main"><div className="pencari-container seeker-page-container">
      <p className="seeker-page-eyebrow">AKUN</p><h1>Pengaturan</h1>
      <p className="seeker-page-intro">Kelola akses akun pencari properti Anda.</p>
      <div className="seeker-settings-section"><div className="seeker-settings-heading"><User size={20} /><h2>Informasi akun</h2></div>
        {account ? <><div className="seeker-settings-row"><span>Alamat email</span><strong>{account.email}</strong></div><div className="seeker-settings-row"><span>Peran</span><strong>Pencari properti</strong></div><div className="seeker-settings-actions"><SettingsSignOut /></div></> : <><p>Anda sedang menjelajah sebagai tamu. Masuk untuk menyimpan kebutuhan bisnis, menghubungi pemilik, dan mengajukan sewa.</p><Link className="seeker-settings-login" href="/login?returnTo=/pencari/settings">Masuk ke akun <ArrowRight size={16} /></Link></>}
      </div>
    </div></section>
  </main>;
}
