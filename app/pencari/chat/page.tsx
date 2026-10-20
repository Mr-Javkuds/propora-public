import { redirect } from "next/navigation";
import { SeekerHeader, SeekerSidebar } from "../../components/seeker-navigation";
import { currentAccount } from "../../lib/auth-server";
import SeekerChatWorkspace from "../../components/seeker-chat-workspace";
import Link from "next/link";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import "../../components/marketplace.css";
import "../pencari.css";
import "../seeker-pages.css";

export default async function SeekerChatPage({ searchParams }: { searchParams: Promise<{ listingId?: string }> }) {
  const account = await currentAccount();
  if (!account) redirect("/login?returnTo=/pencari/chat");
  const { listingId } = await searchParams;
  const selectedId = Number(listingId);
  return <main className="pencari-shell seeker-shell seeker-page-shell seeker-chat-page">
    <SeekerSidebar /><SeekerHeader />
    <section className="pencari-main"><div className="pencari-container seeker-page-container">
      <div className="seeker-chat-intro"><div><p className="seeker-page-eyebrow"><MessageCircle size={14} /> KOTAK MASUK</p><h1>Chat dengan pemilik</h1>
      <p className="seeker-page-intro">Hubungi pemilik, pilih jadwal kunjungan, dan lanjutkan pengajuan sewa di satu tempat.</p></div><Link href="/pencari/results">Jelajahi Properti <ArrowUpRight size={16}/></Link></div>
      <SeekerChatWorkspace key={listingId || "inbox"} initialListingId={Number.isSafeInteger(selectedId) && selectedId > 0 ? selectedId : undefined} />
    </div></section>
  </main>;
}
