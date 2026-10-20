"use client";

import { ProporaLogo } from "./propora-logo";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "./language-switcher";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ClipboardList, MapPinned, MessageSquareText, Settings2, Building2, ReceiptText, PanelLeftClose, PanelLeftOpen } from "lucide-react";

const sidebarPreferenceKey = "proporaSidebarCollapsed";

const items = [
  { href: "/pencari", label: "business", Icon: ClipboardList },
  { href: "/pencari/results", label: "map", Icon: MapPinned },
  { href: "/pencari/my-rent", label: "myRent", Icon: Building2 },
  { href: "/pencari/payments", label: "payments", Icon: ReceiptText },
  { href: "/pencari/chat", label: "chat", Icon: MessageSquareText },
  { href: "/pencari/settings", label: "settings", Icon: Settings2 },
] as const;

export function SeekerSidebar() {
  const pathname = usePathname();
  const t = useTranslations("Navigation");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      try { setCollapsed(localStorage.getItem(sidebarPreferenceKey) === "true"); }
      catch { /* The sidebar still works when browser storage is unavailable. */ }
    });
  }, []);

  function toggleSidebar() {
    const nextCollapsed = !collapsed;
    setCollapsed(nextCollapsed);
    try { localStorage.setItem(sidebarPreferenceKey, String(nextCollapsed)); }
    catch { /* Keep the current-page preference even if it cannot be saved. */ }
  }

  return <aside className="pencari-aside seeker-nav" data-collapsed={collapsed}>
    <Link href="/pencari" className="seeker-nav-brand" aria-label={t("brandLabel")}><span className="seeker-nav-mark"><ProporaLogo /></span><strong>Propora<span>.</span>AI</strong></Link>
    <button className="seeker-nav-toggle" type="button" onClick={toggleSidebar} aria-expanded={!collapsed} aria-controls="seeker-navigation" aria-label={t(collapsed ? "expandMenu" : "collapseMenu")} title={t(collapsed ? "expandMenu" : "collapseMenu")}>
      {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
      <span>{t("collapseMenu")}</span>
    </button>
    <span className="seeker-nav-heading">{t("menu")}</span>
    <nav id="seeker-navigation" aria-label={t("navigation")}>{items.map(({href,label,Icon}) => {
      const active = href === "/pencari" ? pathname === href || pathname === "/pencari/budget" || pathname === "/pencari/area" : href === "/pencari/chat" ? pathname === href || pathname.startsWith("/pencari/booking") : href === "/pencari/results" ? pathname === href || pathname.startsWith(`${href}/`) || pathname === "/pencari/analysis" || pathname === "/pencari/area/compare" : pathname === href || pathname.startsWith(`${href}/`);
      return <Link key={href} href={href} aria-current={active ? "page" : undefined} title={t(label)} aria-label={t(label)}><Icon size={19} strokeWidth={1.8} /><span className="seeker-nav-full" aria-hidden="true">{t(label)}</span><span className="seeker-nav-short" aria-hidden="true">{t(`short.${label}`)}</span></Link>;
    })}</nav>
    <div className="seeker-nav-footer">PROPORA <span>{t("forTenants")}</span></div>
  </aside>;
}

export function SeekerHeader() {
  const t = useTranslations("Navigation");
  return <header className="pencari-header seeker-header">
    <div className="seeker-header-title"><strong>Propora.AI</strong><span>{t("tagline")}</span></div>
    <LanguageSwitcher />
    <span className="seeker-header-location">{t("coverage")}: Semarang</span>
  </header>;
}
