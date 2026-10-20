"use client";
import {useEffect,useState} from "react";
import {SeekerHeader,SeekerSidebar} from "../../components/seeker-navigation";
import PaymentHistory from "../../components/payment-history";
import {api} from "../../lib/marketplace-client";
import type {Application} from "../../lib/marketplace-types";
import "../pencari.css";
import "../seeker-pages.css";

export default function PaymentsPage(){
  const [applications,setApplications]=useState<Application[]>([]);
  const [loading,setLoading]=useState(true),[error,setError]=useState("");
  useEffect(()=>{
    const controller=new AbortController();let timer:ReturnType<typeof setTimeout>;
    const load=async()=>{try{const data=await api<{applications:Application[]}>("/api/pencari/applications",{signal:controller.signal});if(!controller.signal.aborted){setApplications(data.applications);setError("");}}catch(err){if(!controller.signal.aborted)setError(err instanceof Error?err.message:"Riwayat belum dapat dimuat.");}finally{if(!controller.signal.aborted){setLoading(false);timer=setTimeout(()=>void load(),10000);}}};
    void load();return()=>{controller.abort();clearTimeout(timer);};
  },[]);
  return <main className="pencari-shell seeker-shell seeker-page-shell"><SeekerSidebar/><SeekerHeader/><section className="pencari-main"><div className="pencari-container seeker-page-container"><p className="seeker-page-eyebrow">PEMBAYARAN SAYA</p><h1>Riwayat pembayaran</h1><p className="seeker-page-intro">Telusuri pembayaran, metode, dan bukti transaksi sewa Anda.</p><PaymentHistory applications={applications} role="pencari" loading={loading} error={error}/></div></section></main>;
}
