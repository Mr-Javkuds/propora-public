"use client";
import "./collaboration.css";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Building2, Check, MessageCircle, Search, Send } from "lucide-react";
import { api } from "../lib/marketplace-client";
import type { Message } from "../lib/marketplace-types";
import type { Role } from "../lib/auth-policy";
export type ChatThread = {listingId:number;seekerId:string;listingName:string;seekerEmail?:string;ownerEmail?:string;lastMessage?:string;updatedAt?:string};
export default function ChatInbox({role,initialThread,initialListingId}:{role:Role;initialThread?:ChatThread;initialListingId?:number}) {
  const [threads,setThreads] = useState<ChatThread[]>([]);
  const [selected,setSelected] = useState<ChatThread|null>(initialThread??null);
  const [error,setError] = useState("");
  const [loading,setLoading] = useState(true);
  const [search,setSearch] = useState("");
  const openedInitial=useRef(false);
  const base=role==="pemilik" ? "/api/owner" : "/api/pencari";
  useEffect(()=>{
    const controller=new AbortController();let timer:ReturnType<typeof setTimeout>;
    const load=async()=>{
      try {const data=await api<{conversations:ChatThread[]}>(`${base}/messages`,{signal:controller.signal});if (!controller.signal.aborted) {setThreads(data.conversations);if (initialListingId && !openedInitial.current) {const match=data.conversations.find(item=>item.listingId===initialListingId);if(match){setSelected(match);openedInitial.current=true;}}setError("");}}
      catch(error) {if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Percakapan gagal dimuat.");}
      finally {if (!controller.signal.aborted) {setLoading(false);timer=setTimeout(()=>{void load();},5000);}}
    };void load();
    return ()=>{controller.abort();clearTimeout(timer);};
  },[base,initialListingId]);
  const choices=selected && !threads.some(item=>item.listingId===selected.listingId && item.seekerId===selected.seekerId) ? [selected,...threads] : threads;
  const visible=choices.filter(item=>`${item.listingName} ${item.seekerEmail ?? ""} ${item.ownerEmail ?? ""} ${item.lastMessage ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  return <div className={`chat-inbox messenger ${selected ? "has-selection" : ""}`}>
    <nav className="messenger-list" aria-label="Percakapan"><div className="messenger-list-heading"><h3>Pesan <span>{choices.length}</span></h3><MessageCircle size={20}/></div>
      <label className="messenger-search"><Search size={17}/><input aria-label="Cari percakapan" placeholder="Cari nama, properti, atau pesan…" value={search} onChange={event=>setSearch(event.target.value)}/></label>
      <div className="messenger-threads">{loading && <p role="status">Memuat percakapan…</p>}{error && <p role="alert">{error}</p>}
      {!loading && !choices.length && <p>Belum ada percakapan. {role==="pemilik" ? "Hubungi pencari dari pengajuan atau permintaan survei." : "Mulai chat dari halaman detail properti."}</p>}
      {!loading && choices.length>0 && !visible.length && <p>Tidak ada percakapan yang cocok.</p>}
      {visible.map(item=><button className="messenger-thread" type="button" aria-pressed={selected?.listingId===item.listingId && selected?.seekerId===item.seekerId} key={`${item.listingId}:${item.seekerId}`} onClick={()=>setSelected(item)}><span className="messenger-avatar">{(role==="pemilik" ? item.seekerEmail : item.ownerEmail)?.slice(0,2).toUpperCase() || "PR"}</span><span className="messenger-preview"><strong>{item.listingName}</strong><small>{role==="pemilik" ? item.seekerEmail : item.ownerEmail}</small><span>{item.lastMessage || "Mulai percakapan"}</span></span>{item.updatedAt && <time className="messenger-time">{new Date(item.updatedAt).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Jakarta"})}</time>}</button>)}
      </div>
    </nav>
    {selected ? <Thread key={`${selected.listingId}:${selected.seekerId}`} role={role} base={base} thread={selected} onBack={()=>setSelected(null)} /> : <div className="messenger-welcome"><span><MessageCircle size={38}/></span><h3>Percakapan dimulai di sini</h3><p>Pilih percakapan untuk membahas properti, mengatur survei, dan menemukan kesepakatan.</p><small>Pesan diperbarui secara otomatis</small></div>}
  </div>;
}
function Thread({role,base,thread,onBack}:{role:Role;base:string;thread:ChatThread;onBack:()=>void}) {
  const [messages,setMessages]=useState<Message[]>([]);const [draft,setDraft]=useState("");
  const [busy,setBusy]=useState(false);const [loading,setLoading]=useState(true);const [error,setError]=useState("");
  const version=useRef(0);const scroll=useRef<HTMLDivElement>(null);const stick=useRef(true);
  const query=`listingId=${thread.listingId}&seekerId=${encodeURIComponent(thread.seekerId)}`;
  useEffect(()=>{
    const controller=new AbortController();let timer:ReturnType<typeof setTimeout>;
    const load=async()=>{
      const sequence=++version.current;
      try {const data=await api<{messages:Message[]}>(`${base}/messages?${query}`,{signal:controller.signal});if (!controller.signal.aborted && sequence===version.current) {setMessages(data.messages);setError("");}}
      catch(error) {if (!controller.signal.aborted && sequence===version.current) setError(error instanceof Error ? error.message : "Pesan gagal dimuat.");}
      finally {if (!controller.signal.aborted) {setLoading(false);timer=setTimeout(()=>{void load();},3000);}}
    };void load();return ()=>{controller.abort();clearTimeout(timer);};
  },[base,query]);
  const lastId=messages.at(-1)?.id;
  useEffect(()=>{if (stick.current && scroll.current) scroll.current.scrollTop=scroll.current.scrollHeight;},[lastId]);
  async function send(event:FormEvent) {
    event.preventDefault();if (busy || !draft.trim()) return;
    const text=draft.trim();setBusy(true);setError("");++version.current;
    try {const data=await api<{messages:Message[]}>(`${base}/messages`,{method:"POST",body:JSON.stringify({listingId:thread.listingId,seekerId:thread.seekerId,text})});++version.current;stick.current=true;setMessages(data.messages);setDraft("");}
    catch(error) {setError(error instanceof Error ? error.message : "Pesan gagal dikirim. Teks Anda tetap tersimpan.");}
    finally {setBusy(false);}
  }
  return <section className="market-chat messenger-chat"><header className="messenger-chat-header"><button type="button" className="messenger-back" onClick={onBack} aria-label="Kembali ke percakapan"><ArrowLeft size={20}/></button><span className="messenger-avatar">{(role==="pemilik" ? thread.seekerEmail : thread.ownerEmail)?.slice(0,2).toUpperCase() || "PR"}</span><div><h3>{role==="pemilik" ? thread.seekerEmail : thread.ownerEmail}</h3><span>{role==="pemilik" ? "Calon penyewa" : "Pemilik properti"}</span></div></header>
    <div className="messenger-property"><Building2 size={16}/><span>{thread.listingName}</span><small>Percakapan properti</small></div>
    {error && <p className="market-error" role="alert">{error}</p>}
    <div className="market-messages" ref={scroll} role="log" aria-label="Riwayat pesan" aria-live="polite" onScroll={event=>{const el=event.currentTarget;stick.current=el.scrollHeight-el.scrollTop-el.clientHeight<60;}}>
      {loading ? <p role="status">Memuat pesan…</p> : !messages.length ? <div className="messenger-no-messages"><MessageCircle size={28}/><p>Sapa dan mulai percakapan pertama Anda.</p></div> : messages.map((item,index)=>{const day=new Date(item.createdAt).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric",timeZone:"Asia/Jakarta"});const previous=messages[index-1];return <div className="messenger-message-group" key={item.id}>{(!previous || new Date(previous.createdAt).toLocaleDateString("id-ID",{timeZone:"Asia/Jakarta"})!==new Date(item.createdAt).toLocaleDateString("id-ID",{timeZone:"Asia/Jakarta"})) && <div className="messenger-day"><span>{day}</span></div>}<p className={item.senderRole===role ? "mine" : ""}>{item.text}<small>{new Date(item.createdAt).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Jakarta"})} WIB {item.senderRole===role && <Check size={13} aria-label="Terkirim"/>}</small></p></div>;})}
    </div>
    <form className="messenger-composer" onSubmit={send}><textarea aria-label="Tulis pesan" placeholder="Tulis pesan Anda…" rows={1} maxLength={3000} disabled={busy} value={draft} onChange={event=>setDraft(event.target.value)} onKeyDown={event=>{if(event.key==="Enter" && !event.shiftKey && !event.nativeEvent.isComposing){event.preventDefault();void send(event);}}}/><button className="primary" aria-label={busy ? "Mengirim pesan" : "Kirim pesan"} disabled={busy || !draft.trim()}><Send size={18}/><span>{busy ? "Mengirim…" : "Kirim"}</span></button></form><div className="messenger-composer-hint">Enter untuk kirim · Shift + Enter untuk baris baru</div>
  </section>;
}
