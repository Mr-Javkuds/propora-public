"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Building2, MessageCircle, Search } from "lucide-react";
import RentalBooking from "./rental-booking";
import type { ChatThread } from "./chat-inbox";
import { api } from "../lib/marketplace-client";
import "./seeker-chat-workspace.css";

export default function SeekerChatWorkspace({ initialListingId }: { initialListingId?: number }) {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const router = useRouter();
  const selectedId = initialListingId;
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function load() {
      try {
        const data = await api<{ conversations: ChatThread[] }>("/api/pencari/messages", { signal: controller.signal });
        if (!controller.signal.aborted) { setThreads(data.conversations); setError(""); }
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Percakapan gagal dimuat.");
      } finally {
        if (!controller.signal.aborted) { setLoading(false); timer = setTimeout(() => { void load(); }, 5000); }
      }
    }
    void load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, []);

  const visible = threads.filter(thread => `${thread.listingName} ${thread.ownerEmail} ${thread.lastMessage || ""}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="seeker-chat-workspace">
    <section className="rental-conversations" aria-label="Daftar percakapan">
      <div className="rental-conversations-heading"><h2><MessageCircle size={18}/> Percakapan <span>{threads.length}</span></h2><label><Search size={16}/><input aria-label="Cari percakapan" placeholder="Cari properti atau pemilik…" value={query} onChange={event => setQuery(event.target.value)}/></label></div>
      {error && <p role="alert">{error}</p>}
      {loading && <p role="status">Memuat percakapan…</p>}
      {!loading && !error && !threads.length && <p>Belum ada percakapan. <Link href="/pencari/results">Cari properti untuk menghubungi pemilik.</Link></p>}
      {!loading && threads.length > 0 && !visible.length && <p>Tidak ada percakapan yang cocok.</p>}
      <div className="rental-conversation-list">{visible.map(thread => <button type="button" key={`${thread.listingId}:${thread.seekerId}`} aria-pressed={selectedId === thread.listingId} onClick={() => router.push(`/pencari/chat?listingId=${thread.listingId}`, { scroll: false })}><span className="rental-conversation-icon"><Building2 size={20}/></span><span><strong>{thread.listingName}</strong><small>{thread.ownerEmail}</small><span>{thread.lastMessage || "Mulai percakapan"}</span></span></button>)}</div>
    </section>
    {selectedId ? <RentalBooking key={selectedId} listingId={selectedId} embedded onBack={() => router.push("/pencari/chat", { scroll: false })}/> : <div className="rental-chat-empty"><MessageCircle size={34}/><h2>Chat dan atur kunjungan dalam satu tempat</h2><p>Pilih percakapan untuk menghubungi pemilik, memilih tanggal survei, dan melanjutkan pengajuan sewa.</p></div>}
  </div>;
}
