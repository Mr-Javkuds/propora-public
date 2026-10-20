"use client";

import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import idMessages from "../../messages/id.json";
import enMessages from "../../messages/en.json";
import zhMessages from "../../messages/zh.json";
import { pagePhrases } from "../../i18n/page-phrases";

type Locale = "id" | "en" | "zh";
type Phrase = Record<Locale, string>;

const phrases: Record<string, Phrase> = {
  ...pagePhrases,
  "Kebutuhan bisnis": { id: "Kebutuhan bisnis", en: "Business needs", zh: "企业需求" },
  "Peta properti": { id: "Peta properti", en: "Property map", zh: "商铺地图" },
  "Chat pemilik": { id: "Chat pemilik", en: "Chat with owners", zh: "联系房东" },
  "Pengaturan": { id: "Pengaturan", en: "Settings", zh: "设置" },
  "MENU PENYEWA": { id: "MENU PENYEWA", en: "TENANT MENU", zh: "租客菜单" },
  "Navigasi penyewa": { id: "Navigasi penyewa", en: "Tenant navigation", zh: "租客导航" },
  "UNTUK PENYEWA": { id: "UNTUK PENYEWA", en: "FOR TENANTS", zh: "租客专区" },
  "Bahasa": { id: "Bahasa", en: "Language", zh: "语言" },
  "Mulai dari jenis usaha Anda": { id: "Mulai dari jenis usaha Anda", en: "Start with your business type", zh: "从您的经营类型开始" },
  "Pilih usaha yang ingin dibuka.": { id: "Pilih usaha yang ingin dibuka.", en: "Choose the business you want to open.", zh: "选择您想要开设的企业。" },
  "Cari cafe, laundry, apotek...": { id: "Cari cafe, laundry, apotek...", en: "Search for a cafe, laundry, pharmacy...", zh: "搜索咖啡馆、洗衣店、药房..." },
  "Lihat semua usaha": { id: "Lihat semua usaha", en: "View all businesses", zh: "查看所有企业" },
  "Kembali": { id: "Kembali", en: "Back", zh: "返回" },
  "Lanjutkan": { id: "Lanjutkan", en: "Continue", zh: "继续" },
  "Simpan": { id: "Simpan", en: "Save", zh: "保存" },
  "Batal": { id: "Batal", en: "Cancel", zh: "取消" },
  "Kirim": { id: "Kirim", en: "Send", zh: "发送" },
  "Tutup": { id: "Tutup", en: "Close", zh: "关闭" },
  "Memuat...": { id: "Memuat...", en: "Loading...", zh: "加载中..." },
  "Memuat…": { id: "Memuat…", en: "Loading…", zh: "加载中…" },
  "Data belum dapat dimuat.": { id: "Data belum dapat dimuat.", en: "Data could not be loaded.", zh: "无法加载数据。" },
  "Coba lagi": { id: "Coba lagi", en: "Try again", zh: "重试" },
  "Selamat datang kembali.": { id: "Selamat datang kembali.", en: "Welcome back.", zh: "欢迎回来。" },
  "Temukan properti yang cocok": { id: "Temukan properti yang cocok", en: "Find the right property", zh: "寻找合适的商铺" },
  "Atur kebutuhan": { id: "Atur kebutuhan", en: "Set your needs", zh: "设置需求" },
  "Lihat detail": { id: "Lihat detail", en: "View details", zh: "查看详情" },
  "Tambah properti": { id: "Tambah properti", en: "Add property", zh: "添加房产" },
  "Kelola properti": { id: "Kelola properti", en: "Manage property", zh: "管理房产" },
  "Properti Anda": { id: "Properti Anda", en: "Your properties", zh: "您的房产" },
  "Semua properti": { id: "Semua properti", en: "All properties", zh: "所有房产" },
  "Tersedia": { id: "Tersedia", en: "Available", zh: "可出租" },
  "Dipesan": { id: "Dipesan", en: "Reserved", zh: "已预订" },
  "Disewa": { id: "Disewa", en: "Rented", zh: "已出租" },
  "Draft": { id: "Draft", en: "Draft", zh: "草稿" },
  "Pengajuan sewa": { id: "Pengajuan sewa", en: "Rental applications", zh: "租赁申请" },
  "Jadwal survei": { id: "Jadwal survei", en: "Survey schedule", zh: "看房日程" },
  "Permintaan survei": { id: "Permintaan survei", en: "Survey requests", zh: "看房请求" },
  "Pesan": { id: "Pesan", en: "Messages", zh: "消息" },
  "Perlu perhatian": { id: "Perlu perhatian", en: "Needs attention", zh: "需要关注" },
  "Perlu respons": { id: "Perlu respons", en: "Needs response", zh: "需要回复" },
  "Status portofolio": { id: "Status portofolio", en: "Portfolio status", zh: "房产组合状态" },
  "Survei mendatang": { id: "Survei mendatang", en: "Upcoming surveys", zh: "即将进行的看房" },
  "Belum ada pengajuan masuk": { id: "Belum ada pengajuan masuk", en: "No applications yet", zh: "暂无申请" },
  "Belum ada permintaan survei": { id: "Belum ada permintaan survei", en: "No survey requests yet", zh: "暂无看房请求" },
  "Belum ada properti yang cocok": { id: "Belum ada properti yang cocok", en: "No matching properties", zh: "没有符合条件的房产" },
  "Portofolio Anda dimulai di sini": { id: "Portofolio Anda dimulai di sini", en: "Your portfolio starts here", zh: "您的房产组合从这里开始" },
  "Alamat email": { id: "Alamat email", en: "Email address", zh: "电子邮箱" },
  "Kata sandi": { id: "Kata sandi", en: "Password", zh: "密码" },
  "Masuk": { id: "Masuk", en: "Sign in", zh: "登录" },
  "Daftar": { id: "Daftar", en: "Sign up", zh: "注册" },
  "Keluar dari akun": { id: "Keluar dari akun", en: "Sign out", zh: "退出账户" },
  "Lupa kata sandi?": { id: "Lupa kata sandi?", en: "Forgot password?", zh: "忘记密码？" },
  "Masuk ke akun": { id: "Masuk ke akun", en: "Sign in", zh: "登录账户" },
  "Hubungi pemilik": { id: "Hubungi pemilik", en: "Contact owner", zh: "联系房东" },
  "Chat dengan pemilik": { id: "Chat dengan pemilik", en: "Chat with the owner", zh: "与房东聊天" },
  "Jelajahi Properti": { id: "Jelajahi Properti", en: "Explore properties", zh: "探索商铺" },
  "My Rent": { id: "My Rent", en: "My Rent", zh: "我的租赁" },
  "SEWA SAYA": { id: "SEWA SAYA", en: "MY RENT", zh: "我的租赁" },
  "KOTAK MASUK": { id: "KOTAK MASUK", en: "INBOX", zh: "收件箱" },
  "Informasi akun": { id: "Informasi akun", en: "Account information", zh: "账户信息" },
  "Harga sewa": { id: "Harga sewa", en: "Rent price", zh: "租金" },
  "Pemilik": { id: "Pemilik", en: "Owner", zh: "房东" },
  "Detail Pengajuan": { id: "Detail Pengajuan", en: "Application details", zh: "申请详情" },
  "KONFIRMASI": { id: "KONFIRMASI", en: "CONFIRMATION", zh: "确认" },
  "Kembali ke beranda": { id: "Kembali ke beranda", en: "Back to home", zh: "返回首页" },
  "Kembali ke pencarian": { id: "Kembali ke pencarian", en: "Back to search", zh: "返回搜索" },
  "PORTOFOLIO PROPERTI": { id: "PORTOFOLIO PROPERTI", en: "PROPERTY PORTFOLIO", zh: "房产组合" },
  "RUANG UNTUK USAHA ANDA": { id: "RUANG UNTUK USAHA ANDA", en: "SPACE FOR YOUR BUSINESS", zh: "您的经营空间" },
  "Langkah 1 dari 3": { id: "Langkah 1 dari 3", en: "Step 1 of 3", zh: "第 1 步，共 3 步" },
  "Langkah 2 dari 3": { id: "Langkah 2 dari 3", en: "Step 2 of 3", zh: "第 2 步，共 3 步" },
  "Langkah 3 dari 3": { id: "Langkah 3 dari 3", en: "Step 3 of 3", zh: "第 3 步，共 3 步" },
  "Jangkauan pencarian": { id: "Jangkauan pencarian", en: "Search radius", zh: "搜索半径" },
  "Perluas radius ke 5 km": { id: "Perluas radius ke 5 km", en: "Expand radius to 5 km", zh: "将半径扩大到 5 公里" },
  "Langkah Akhir": { id: "Langkah Akhir", en: "Final step", zh: "最后一步" },
  "Kebutuhan bisnis Anda": { id: "Kebutuhan bisnis Anda", en: "Your business needs", zh: "您的企业需求" },
  "Anggaran sewa": { id: "Anggaran sewa", en: "Rental budget", zh: "租金预算" },
  "Pilih area": { id: "Pilih area", en: "Choose an area", zh: "选择区域" },
  "Hasil pencarian": { id: "Hasil pencarian", en: "Search results", zh: "搜索结果" },
  "Bandingkan properti pilihan": { id: "Bandingkan properti pilihan", en: "Compare selected properties", zh: "比较选中的商铺" },
  "Jadwalkan survei": { id: "Jadwalkan survei", en: "Schedule a survey", zh: "安排看房" },
  "Ajukan sewa": { id: "Ajukan sewa", en: "Apply to rent", zh: "申请租赁" },
  "Pembayaran": { id: "Pembayaran", en: "Payment", zh: "付款" },
  "Analisis lokasi": { id: "Analisis lokasi", en: "Location analysis", zh: "位置分析" },
  "Simpan sebagai draft": { id: "Simpan sebagai draft", en: "Save as draft", zh: "保存为草稿" },
  "Tersedia untuk disewa": { id: "Tersedia untuk disewa", en: "Available for rent", zh: "可出租" },
  "Perbarui properti Anda.": { id: "Perbarui properti Anda.", en: "Update your property.", zh: "更新您的房产。" },
  "Mulai dari detail properti": { id: "Mulai dari detail properti", en: "Start with property details", zh: "从房产详情开始" },
  "Nama properti": { id: "Nama properti", en: "Property name", zh: "商铺名称" },
  "Alamat lengkap": { id: "Alamat lengkap", en: "Full address", zh: "完整地址" },
  "Fasilitas": { id: "Fasilitas", en: "Facilities", zh: "设施" },
  "Deskripsi": { id: "Deskripsi", en: "Description", zh: "描述" },
  "Status publikasi": { id: "Status publikasi", en: "Publication status", zh: "发布状态" },
  "Tampilkan semua properti": { id: "Tampilkan semua properti", en: "Show all properties", zh: "显示所有房产" },
  "Memuat aktivitas…": { id: "Memuat aktivitas…", en: "Loading activity…", zh: "正在加载活动…" },
  "Semua sudah ditangani.": { id: "Semua sudah ditangani.", en: "Everything is handled.", zh: "所有事项都已处理。" },
  "Belum ada kunjungan terkonfirmasi.": { id: "Belum ada kunjungan terkonfirmasi.", en: "No confirmed visits yet.", zh: "暂无已确认的看房。" },
  "Catatan untuk pencari": { id: "Catatan untuk pencari", en: "Note for the seeker", zh: "给租客的备注" },
  "Chat pencari": { id: "Chat pencari", en: "Chat with seeker", zh: "联系租客" },
  "Setujui pengajuan": { id: "Setujui pengajuan", en: "Approve application", zh: "批准申请" },
  "Konfirmasi jadwal": { id: "Konfirmasi jadwal", en: "Confirm schedule", zh: "确认日程" },
  "Tolak": { id: "Tolak", en: "Reject", zh: "拒绝" },
};

type TranslationState = { source: string; rendered: string };
const originalText = new WeakMap<Text, TranslationState>();
const translatedElements = new WeakMap<Element, Record<string, TranslationState>>();
// Share next-intl messages with dynamic text, including values received from APIs.
function addMessages(id: unknown, en: unknown, zh: unknown) {
  if (typeof id === "string" && typeof en === "string" && typeof zh === "string") {
    if (!id.includes("{")) phrases[id] = { id, en, zh };
  } else if (id && en && zh && typeof id === "object" && typeof en === "object" && typeof zh === "object") {
    for (const key of Object.keys(id)) addMessages((id as Record<string, unknown>)[key], (en as Record<string, unknown>)[key], (zh as Record<string, unknown>)[key]);
  }
}
addMessages(idMessages, enMessages, zhMessages);
const normalizeProperty = (value: string) => value.replace(/\bruko\b/gi, word => word === "RUKO" ? "PROPERTI" : word === "Ruko" ? "Properti" : "properti");
const phraseLookup = new Map(Object.entries(phrases).map(([key, value]) => [key.toLocaleLowerCase("id"), value]));
const phrasePattern = new RegExp(
  `(?<![\\p{L}\\p{N}])(${Object.keys(phrases).sort((a, b) => b.length - a.length).map(key => key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")).join("|")})(?![\\p{L}\\p{N}])`,
  "giu"
);

export function translate(value: string, locale: Locale) {
  const leading = value.match(/^\s*/)?.[0] ?? "";
  const trailing = value.match(/\s*$/)?.[0] ?? "";
  const core = normalizeProperty(value.trim());
  if (!core) return value;
  if (/^[\w.+-]+@[\w.-]+\.[\p{L}]{2,}$/u.test(core)) return value;
  const translated = core.replace(phrasePattern, key => (phrases[key.replace(/\s+/g, " ")] ?? phraseLookup.get(key.replace(/\s+/g, " ").toLocaleLowerCase("id")))?.[locale] ?? key);
  return `${leading}${translated}${trailing}`;
}

function scan(root: Node, locale: Locale) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const node of nodes) {
    const parent = node.parentElement;
    if (!parent || ["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE"].includes(parent.tagName)) continue;
    const current = node.nodeValue ?? "";
    const previous = originalText.get(node);
    const original = previous?.rendered === current ? previous.source : current;
    const next = translate(original, locale);
    originalText.set(node, { source: original, rendered: next });
    if (current !== next) node.nodeValue = next;
  }
  const elements = root instanceof Element ? [root, ...Array.from(root.querySelectorAll<HTMLElement>("input,textarea,[aria-label],[title],[alt],[data-label]"))] : Array.from(document.querySelectorAll<HTMLElement>("input,textarea,[aria-label],[title]"));
  for (const element of elements) {
    for (const attribute of ["placeholder", "aria-label", "title", "alt", "data-label"]) {
      const value = element.getAttribute(attribute);
      if (!value) continue;
      const originals = translatedElements.get(element) ?? {};
      const previous = originals[attribute];
      const original = previous?.rendered === value ? previous.source : value;
      const next = translate(original, locale);
      originals[attribute] = { source: original, rendered: next };
      translatedElements.set(element, originals);
      if (value !== next) element.setAttribute(attribute, next);
    }
  }
}

export function GlobalLocaleTranslator() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  useEffect(() => {
    let updating = false;
    let frameOne = 0;
    let frameTwo = 0;
    let observer: MutationObserver | undefined;
    const run = () => {
      if (updating) return;
      updating = true;
      scan(document.body, locale);
      updating = false;
    };
    const options = { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["placeholder", "aria-label", "title", "alt", "data-label"] };
    frameOne = requestAnimationFrame(() => {
      frameTwo = requestAnimationFrame(() => {
        run();
        observer = new MutationObserver(() => {
          // Translation writes must not queue another scan of the entire dashboard.
          observer?.disconnect();
          try { run(); } finally { observer?.observe(document.body, options); }
        });
        observer.observe(document.body, options);
      });
    });
    return () => {
      cancelAnimationFrame(frameOne);
      cancelAnimationFrame(frameTwo);
      observer?.disconnect();
    };
  }, [locale, pathname]);
  return null;
}
