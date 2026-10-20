import type { MlRecommendation, MlSignalKey } from "../../../lib/propora-ml-demo";

export type BusinessInsight = {
  key: MlSignalKey;
  title: string;
  interpretation: string;
  action: string;
  evidence: string;
  tone: "positive" | "caution" | "neutral";
};

type SignalCopy = { title: string; high: string; medium: string; low: string; action: string };

const signalCopy: Record<MlSignalKey, SignalCopy> = {
  demand_score: {
    title: "Apakah ada peluang mendapatkan pelanggan?",
    high: "Sinyal permintaan mendukung usaha yang dipilih. Lokasi ini layak diuji untuk mendapatkan pelanggan awal.",
    medium: "Sinyal permintaan belum kuat. Kejelasan target pelanggan dan penawaran produk akan berperan besar.",
    low: "Sinyal permintaan lemah. Uji kebutuhan calon pelanggan sebelum menambah kapasitas atau stok.",
    action: "Wawancarai calon pelanggan di sekitar lokasi dan uji minat terhadap produk serta harga Anda.",
  },
  accessibility_score: {
    title: "Seberapa mudah pelanggan menjangkau toko?",
    high: "Prediksi AI menunjukkan akses yang mendukung kunjungan. Akses yang nyaman dapat mengurangi hambatan pelanggan untuk datang.",
    medium: "Akses perlu diperiksa lebih dekat. Jalur masuk, parkir, dan kemudahan berhenti bisa memengaruhi kunjungan.",
    low: "Sinyal akses kurang mendukung. Pelanggan mungkin memerlukan petunjuk lokasi atau pilihan pengantaran yang lebih baik.",
    action: "Coba rute dari arah pelanggan, periksa akses pejalan kaki, parkir, bongkar muat, dan putar balik.",
  },
  property_cost_efficiency_score: {
    title: "Apakah biaya tempat mendukung operasional?",
    high: "Menurut prediksi AI, biaya tempat relatif efisien. Ini dapat memberi ruang anggaran untuk operasional, jika biaya tambahan tetap terkendali.",
    medium: "Efisiensi biaya berada di tengah. Nilai sewa perlu ditimbang bersama luas yang benar-benar bisa dipakai.",
    low: "Menurut prediksi AI, biaya tempat kurang efisien. Biaya tempat perlu diuji terhadap kemampuan penjualan usaha.",
    action: "Minta rincian deposit, renovasi, iuran, dan biaya utilitas. Bandingkan total biaya tahun pertama.",
  },
  growth_score: {
    title: "Apakah pertumbuhan kawasan bisa diandalkan?",
    high: "Prediksi AI menunjukkan peluang pertumbuhan kawasan. Perubahan kawasan bisa membuka peluang, jika terkonfirmasi di lapangan.",
    medium: "Sinyal pertumbuhan belum dominan. Dasarkan keputusan pada pelanggan yang sudah ada saat ini.",
    low: "Pertumbuhan kawasan belum cukup didukung data. Jangan mendasarkan rencana penjualan pada asumsi kawasan akan segera ramai.",
    action: "Periksa perubahan hunian, kantor, dan aktivitas usaha sekitar. Skor rendah atau nol tidak membuktikan kawasan akan menurun.",
  },
  foot_traffic_score: {
    title: "Bagaimana peluang menarik orang yang lewat?",
    high: "Perkiraan keramaian mendukung visibilitas toko. Etalase dan penawaran yang jelas berpotensi membantu menarik perhatian.",
    medium: "Arus pengunjung belum menjadi keunggulan utama. Pertimbangkan kanal pemesanan dan pelanggan tujuan.",
    low: "Perkiraan keramaian rendah. Usaha perlu menguji kanal pelanggan selain mengandalkan orang yang lewat.",
    action: "Hitung pejalan kaki dan kendaraan pada jam buka yang direncanakan. Catat siapa yang lewat dan apakah mereka sesuai target pasar.",
  },
  flood_safety_score: {
    title: "Apa yang perlu diantisipasi saat musim hujan?",
    high: "Kondisi terkait banjir relatif mendukung. Tetap periksa akses, drainase, dan posisi penyimpanan barang.",
    medium: "Faktor banjir masih perlu perhatian. Gangguan akses dapat menghambat toko meskipun bangunan tidak tergenang.",
    low: "Kondisi terkait banjir kurang mendukung. Antisipasi gangguan operasional dan perlindungan stok sebelum menyewa.",
    action: "Tanyakan riwayat genangan kepada tetangga dan pemilik, cek elevasi lantai serta drainase saat hujan.",
  },
  sentiment_score: {
    title: "Bagaimana sinyal persepsi terhadap kawasan?",
    high: "Data menunjukkan persepsi yang relatif positif terhadap kawasan. Ini bisa menjadi konteks pendukung, tetapi belum menunjukkan kepuasan pelanggan usaha Anda.",
    medium: "Persepsi terhadap kawasan belum cukup jelas dari data. Pengalaman pelanggan tetap perlu dibangun melalui pelayanan dan kualitas produk.",
    low: "Data menunjukkan persepsi yang kurang mendukung terhadap kawasan. Cari tahu isu kawasan yang mungkin memengaruhi pengalaman pelanggan.",
    action: "Baca ulasan kawasan dan lakukan wawancara singkat. Bedakan keluhan akses, keamanan, dan kualitas usaha lain.",
  },
  google_trends_score: {
    title: "Apakah minat terhadap kategori usaha mendukung?",
    high: "Minat terhadap kategori usaha mendukung minat pada kategori atau kata kunci usaha. Gunakan sebagai ide uji produk, bukan proyeksi penjualan.",
    medium: "Sinyal tren tidak dominan. Utamakan kebutuhan rutin pelanggan dan produk yang sudah teruji.",
    low: "Minat terhadap kategori usaha rendah. Jangan mengandalkan popularitas kategori untuk menarik pelanggan tanpa memeriksa kebutuhan pelanggan sekitar.",
    action: "Uji produk dan promosi dalam skala kecil. Minat pencarian tidak sama dengan pembelian di lokasi ini.",
  },
  competition_opportunity_score: {
    title: "Seberapa kuat kebutuhan untuk tampil berbeda?",
    high: "Prediksi AI menunjukkan peluang bersaing yang mendukung. Tetap tentukan alasan pelanggan memilih usaha Anda.",
    medium: "Peluang bersaing belum menjadi keunggulan yang jelas. Produk, pelayanan, atau segmen pelanggan perlu dibedakan.",
    low: "Peluang bersaing dinilai masih terbatas. Tentukan pembeda usaha; jangan masuk hanya dengan meniru penawaran yang sudah ada.",
    action: "Petakan pesaing, harga, menu atau layanan, dan jam ramai. Skor ini tidak menunjukkan jumlah pesaing maupun pangsa pasar.",
  },
};

const number = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

export function businessInsights(property: MlRecommendation): BusinessInsight[] {
  return (Object.entries(signalCopy) as [MlSignalKey, SignalCopy][]).map(([key, copy]) => {
    const score = property[key];
    const available = property.mlStatus === "ready" && score != null && Number.isFinite(score) && score >= 0 && score <= 100;
    const tone = !available ? "neutral" : score >= 70 ? "positive" : score < 40 ? "caution" : "neutral";
    return {
      key,
      title: copy.title,
      interpretation: !available ? "Data untuk prediksi AI belum tersedia pada faktor ini. Belum dapat disimpulkan sebagai keunggulan atau risiko." : score >= 70 ? copy.high : score < 40 ? copy.low : copy.medium,
      action: copy.action,
      evidence: available ? `Skor prediksi AI ${number.format(score)}/100` : "Data untuk prediksi AI belum tersedia",
      tone,
    };
  });
}

export function overallMeaning(property: MlRecommendation) {
  if (property.status === "rented" || property.status === "reserved" || property.status === "draft") return "Ketersediaan properti perlu dikonfirmasi terlebih dahulu. Skor prediksi AI tidak menunjukkan bahwa properti sudah bisa disewa.";
  if (property.mlStatus !== "ready" || property.propora_score == null || !Number.isFinite(property.propora_score) || property.propora_score < 0 || property.propora_score > 100) return "Kecocokan belum dapat dinilai. Lengkapi survei dan data sebelum mengambil keputusan.";
  if (property.potential_label === "tinggi") return "Prediksi AI menunjukkan potensi lokasi tinggi. Layak masuk prioritas survei; hasil penjualan tetap bergantung pada cara Anda menjalankan usaha.";
  if (property.potential_label === "sedang") return "Prediksi AI menunjukkan potensi lokasi sedang. Periksa kebutuhan calon pelanggan dan seluruh biaya sebelum memilih lokasi ini.";
  if (property.potential_label === "rendah") return "Prediksi AI menunjukkan potensi lokasi rendah. Telusuri faktor penghambat dan kebutuhan usaha sebelum melanjutkan.";
  return "Skor prediksi AI merangkum kecocokan lokasi dengan kebutuhan usaha. Periksa faktor pendukung dan penghambat sebelum menentukan prioritas survei.";
}

export type SwotPoint = { title: string; detail: string; source: string };
export type SwotAnalysis = { strengths: SwotPoint[]; weaknesses: SwotPoint[]; opportunities: SwotPoint[]; threats: SwotPoint[] };

export function buildSwot(property: MlRecommendation, alternative: MlRecommendation | MlRecommendation[]): SwotAnalysis {
  const alternatives = Array.isArray(alternative) ? alternative : [alternative];
  const comparison = {
    price: alternatives.length ? Math.min(...alternatives.map(item => item.price)) : property.price,
    building_area_m2: alternatives.length ? Math.max(...alternatives.map(item => item.building_area_m2)) : property.building_area_m2,
    facilities: [...new Set(alternatives.flatMap(item => item.facilities))],
  };
  const strengths: SwotPoint[] = [];
  const weaknesses: SwotPoint[] = [];
  if (!alternatives.length && property.facilities.length) strengths.push({ title: "Fasilitas pendukung tercantum", detail: `${property.facilities.join(", ")}. Periksa kondisi, kapasitas, dan biaya penggunaannya sebelum menyesuaikan kebutuhan operasional.`, source: "Fasilitas dari pemilik, belum diverifikasi melalui survei" });
  if (property.status && property.status !== "available") weaknesses.push({ title: "Ketersediaan perlu dikonfirmasi", detail: "Status listing belum tersedia untuk disewa. Tanyakan waktu ketersediaan sebelum menyusun jadwal pembukaan usaha.", source: "Status listing saat perbandingan dimuat" });
  if (property.price < comparison.price) strengths.push({ title: "Komitmen sewa lebih ringan", detail: "Dibanding alternatif, lebih sedikit anggaran terikat pada sewa. Selisihnya bisa dialokasikan sesuai prioritas operasional.", source: "Perbandingan harga listing" });
  if (property.price > comparison.price) weaknesses.push({ title: "Komitmen sewa lebih besar", detail: "Perlu alasan bisnis yang jelas untuk menanggung biaya tambahan, seperti kapasitas terpakai atau akses yang terverifikasi lebih baik.", source: "Perbandingan harga listing" });
  if (property.building_area_m2 > comparison.building_area_m2) strengths.push({ title: "Ruang operasional lebih luas", detail: "Ada lebih banyak luas untuk mengatur pelayanan, penyimpanan, atau area pelanggan. Manfaatnya bergantung pada denah dan luas efektif.", source: "Luas bangunan dari listing" });
  if (property.building_area_m2 < comparison.building_area_m2) weaknesses.push({ title: "Kapasitas ruang lebih terbatas", detail: "Periksa apakah peralatan, stok, alur kerja, dan area pelanggan muat tanpa mengganggu pelayanan.", source: "Luas bangunan dibanding alternatif" });
  const extra = alternatives.length ? property.facilities.filter(item => !comparison.facilities.includes(item)) : [];
  const missing = comparison.facilities.filter(item => !property.facilities.includes(item));
  if (extra.length) strengths.push({ title: "Fasilitas tambahan tercantum", detail: `${extra.join(", ")}. Konfirmasi kondisi dan apakah penggunaannya sudah termasuk sewa.`, source: "Fasilitas listing dibanding alternatif" });
  if (missing.length) weaknesses.push({ title: "Ada fasilitas yang belum tercantum", detail: `${missing.join(", ")}. Tanyakan ketersediaannya; belum tercantum bukan berarti fasilitas pasti tidak ada.`, source: "Perbedaan informasi fasilitas" });
  if (!strengths.length) strengths.push({ title: alternatives.length ? "Belum ada keunggulan fisik yang membedakan" : "Belum ada properti pembanding", detail: alternatives.length ? "Harga, luas, dan fasilitas belum menunjukkan keunggulan khusus dibanding pilihan lainnya. Gunakan survei untuk menilai denah dan kondisi bangunan." : "Tambahkan properti lain untuk membandingkan harga, luas, dan fasilitas. Peluang serta risiko lokasi tetap dapat ditinjau di bawah.", source: "Data listing yang tersedia" });
  if (!weaknesses.length) weaknesses.push({ title: "Kondisi dan biaya tambahan belum diketahui", detail: "Tanpa pemeriksaan bangunan dan rincian kontrak, kebutuhan perbaikan serta total biaya masuk belum dapat dinilai.", source: "Keterbatasan data listing" });
  const externalKeys: MlSignalKey[] = ["demand_score", "accessibility_score", "foot_traffic_score", "competition_opportunity_score", "google_trends_score", "growth_score", "sentiment_score", "flood_safety_score"];
  const external = businessInsights(property).filter(insight => externalKeys.includes(insight.key));
  const opportunities = external.filter(insight => insight.tone === "positive").slice(0, 3).map(insight => ({ title: insight.title, detail: insight.interpretation, source: `${insight.evidence} · perlu dicek saat survei` }));
  const threats = external.filter(insight => insight.tone === "caution").map(insight => ({ title: insight.title, detail: `${insight.interpretation} ${insight.action}`, source: `${insight.evidence} · sinyal perhatian` }));
  const flood = external.find(insight => insight.key === "flood_safety_score");
  if (flood && flood.tone !== "positive" && !threats.some(point => point.title === flood.title)) threats.push({ title: "Gangguan akses saat hujan perlu dicek", detail: flood.action, source: flood.evidence });
  if (!opportunities.length) opportunities.push({ title: "Peluang pasar belum terkonfirmasi", detail: "Uji kebutuhan pelanggan, akses, dan penawaran pesaing untuk menemukan peluang yang belum terlihat di data.", source: "Data untuk prediksi AI belum cukup mendukung" });
  if (!threats.length) threats.push({ title: "Permintaan dan persaingan tetap bisa berubah", detail: "Periksa kondisi sekitar sebelum menandatangani kontrak. Data referensi tidak mencatat seluruh perubahan pasar saat ini.", source: "Keterbatasan data untuk prediksi AI" });
  return { strengths, weaknesses, opportunities, threats };
}

// This is a rent-only scenario, not a forecast of revenue or business break-even.
export function rentScenario(annualRent: number, ticket: number, marginPercent: number, openDays: number) {
  if (![annualRent, ticket, marginPercent, openDays].every(Number.isFinite) || annualRent < 0 || ticket <= 0 || marginPercent <= 0 || marginPercent > 100 || !Number.isInteger(openDays) || openDays < 1 || openDays > 31) return null;
  const monthlySales = annualRent / 12 / (marginPercent / 100);
  const dailyTransactions = Math.ceil(monthlySales / ticket / openDays);
  if (!Number.isFinite(monthlySales) || !Number.isSafeInteger(dailyTransactions)) return null;
  return { monthlySales, dailyTransactions };
}

export const radarAxes: { key: MlSignalKey; label: string }[] = [
  { key: "demand_score", label: "Peluang pelanggan" },
  { key: "accessibility_score", label: "Kemudahan akses" },
  { key: "property_cost_efficiency_score", label: "Efisiensi biaya" },
  { key: "growth_score", label: "Pertumbuhan kawasan" },
  { key: "foot_traffic_score", label: "Keramaian" },
  { key: "flood_safety_score", label: "Keamanan banjir" },
  { key: "sentiment_score", label: "Persepsi kawasan" },
  { key: "google_trends_score", label: "Minat kategori" },
  { key: "competition_opportunity_score", label: "Peluang bersaing" },
];

export type RentAssumptions = { ticket: number; margin: number; days: number };

export const surveySteps = [
  { title: "Kenali calon pelanggan", detail: "Amati pagi, siang, dan malam pada hari kerja serta akhir pekan. Catat profil pelanggan dan jam ramai yang sesuai jam buka Anda." },
  { title: "Periksa pesaing dan pembeda", detail: "Catat layanan, harga, serta alasan pelanggan datang ke usaha sekitar. Tentukan pembeda yang ingin diuji, lalu lakukan uji penawaran kecil." },
  { title: "Hitung seluruh biaya masuk", detail: "Minta rincian sewa, deposit, renovasi, daya listrik, izin, dan iuran. Angka pada listing belum mencakup seluruh kebutuhan pembukaan usaha." },
  { title: "Uji kelayakan bangunan dan kontrak", detail: "Periksa luas efektif, parkir, bongkar muat, air, sanitasi, drainase, serta izin jenis usaha. Pastikan ketentuan penggunaan dan kenaikan sewa tertulis." },
];
