"use client";

import { ProporaLogo } from "./components/propora-logo";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { LanguageSwitcher } from "./components/language-switcher";
import { HomeAccountActions } from "./components/home-account-actions";
import { ArrowRight, Building2, ChartNoAxesCombined, Check, MapPin, Menu, Search, Sparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { api, rupiah } from "./lib/marketplace-client";
import type { MlRecommendation } from "./lib/propora-ml-demo";
import "./hero-clean.css";

const icons = { building: Building2, search: Search, chart: ChartNoAxesCombined, arrow: ArrowRight, pin: MapPin, sparkle: Sparkles, check: Check, menu: Menu };
function Icon({ name, size = 20 }: { name: keyof typeof icons; size?: number }) {
  const Component = icons[name];
  return <Component size={size} aria-hidden="true" />;
}
function propertyName(name: string) {
  return name.replace(/\bRuko\b/gi, "Properti");
}

export default function Home() {
  const t = useTranslations("Landing");
  const [listings, setListings] = useState<MlRecommendation[]>([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    api<{ listings: MlRecommendation[] }>("/api/listings", { signal: controller.signal }).then(data => { if (!controller.signal.aborted) setListings(data.listings); }).catch(() => { if (!controller.signal.aborted) setLoadError(t("loadError")); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [t]);

  return (
    <main className="landing-page">
      {/* HEADER */}
      <header className="landing-header">
        <Link href="/" className="logo">
          <span className="logo-icon">
            <ProporaLogo />
          </span>

          <span>
            Propora<span>.AI</span>
          </span>
        </Link>

        <nav id="landing-navigation" className={`desktop-nav ${menuOpen ? "is-open" : ""}`}>
          <a href="#cari">{t("findProperties")}</a>
          <a href="#pemilik">{t("forOwners")}</a>
          <a href="#cara-kerja">{t("howItWorks")}</a>
        </nav>

        <div className="header-actions">
          <LanguageSwitcher />
          <HomeAccountActions />
          <button className="mobile-menu" aria-label={menuOpen ? t("closeMenu") : t("openMenu")} aria-expanded={menuOpen} aria-controls="landing-navigation" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className="hero hero-clean" id="cari" aria-labelledby="hero-heading">
        <div className="hero-left">
          <p className="hero-kicker"><MapPin size={15} aria-hidden="true" />{t("kicker")}</p>
          <h1 id="hero-heading">{t("headline")}<br /><span>{t("headlineAccent")}</span></h1>
          <p className="hero-description">{t("description")}</p>
          <div className="hero-cta-group">
            <Link href="/pencari" className="hero-primary-cta">{t("findProperty")}<ArrowRight size={18} aria-hidden="true" /></Link>
            <a href="#cara-kerja" className="hero-secondary-cta">{t("seeHow")}<ArrowRight size={16} aria-hidden="true" /></a>
          </div>
          <div className="hero-benefits" aria-label={t("benefitsLabel")}><span><Check size={15} aria-hidden="true" />{t("compare")}</span><span><Check size={15} aria-hidden="true" />{t("understand")}</span><span><Check size={15} aria-hidden="true" />{t("contact")}</span></div>
          <p className="hero-availability" role="status">{loading ? t("loadingChoices") : loadError ? t("browseMatching") : t("availability", { count: listings.length })}</p>
        </div>
        <figure className="hero-clean-visual">
          <img src="/figma/results/ruko-1.jpeg" alt={t("imageAlt")} width="720" height="800" fetchPriority="high" />
          <figcaption><span>{t("imageCaption")}</span><small>{t("photo")}</small></figcaption>
        </figure>
      </section>

      <section className="landing-map-section" aria-label={t("mapLabel")}>
        <div className="landing-map-shell">
          <div className="landing-map-intro"><div><span>{t("referenceLocation")}</span><h2>{t("mapTitle")}</h2></div><Link href="/pencari/results">{t("viewAll")} <ArrowRight size={17} /></Link></div>
          <div className="map-card">
            <div className="map-card-header"><div><strong>{t("availableListings")}</strong><span>{t("savedData")}</span></div></div>
            {loading ? <p className="landing-map-state" role="status">{t("loadingData")}</p> : loadError ? <p className="landing-map-state" role="alert">{loadError}</p> : listings[0] ? <div className="landing-map-body">
              <iframe title={`Lokasi ${propertyName(listings[0].name)}`} src={`https://www.google.com/maps?q=${listings[0].latitude},${listings[0].longitude}&z=15&output=embed`} loading="lazy" />
              <div className="landing-map-details"><div className="score-section"><div className="score-title"><span>{propertyName(listings[0].name)}</span><strong>{rupiah(listings[0].price * 1000000)} {t("perYear")}</strong><p>{listings[0].address}</p></div><div className="score-circle"><strong>{listings[0].mlStatus === "ready" && listings[0].propora_score != null ? Math.round(listings[0].propora_score ?? 0) : "—"}</strong><span>/100</span></div></div><p className="landing-map-disclaimer">{t("aiScore", { business: listings[0].businessType ?? "—", trend: listings[0].trendKeyword ?? "—" })}</p></div>
            </div> : <p className="landing-map-state">{t("emptyProperties")}</p>}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-section" id="cara-kerja">
        <div className="section-heading">
          <span>{t("stepsKicker")}</span>
          <h2>{t("stepsTitle")}</h2>
          <p>{t("stepsDescription")}</p>
        </div>

        <div className="steps-grid">
          <div className="step-card">
            <div className="step-icon">
              <Icon name="search" size={21} />
            </div>

            <span className="step-number">LANGKAH 01</span>

            <h3>{t("stepLocation")}</h3>
            <p>{t("stepLocationText")}</p>
            <a href="/login">{t("stepLocationAction")}</a>
          </div>

          <div className="step-card">
            <div className="step-icon">
              <Icon name="chart" size={21} />
            </div>

            <span className="step-number">LANGKAH 02</span>

            <h3>{t("stepAnalysis")}</h3>
            <p>{t("stepAnalysisText")}</p>
            <a href="/login">{t("stepAnalysisAction")}</a>
          </div>

          <div className="step-card">
            <div className="step-icon green">
              <Icon name="check" size={21} />
            </div>

            <span className="step-number">LANGKAH 03</span>

            <h3>{t("stepRent")}</h3>
            <p>{t("stepRentText")}</p>
            <a href="/login">{t("stepRentAction")}</a>
          </div>
        </div>
      </section>

      {/* BUSINESS */}
      <section className="business-section" id="pemilik">
        <div className="business-heading">
          <div>
            <span>{t("businessKicker")}</span>
            <h2>{t("businessTitle")}</h2>
          </div>

          <p>{t("businessDescription")}</p>
        </div>

        <div className="business-grid">
          <div className="business-card">
            <div className="business-tag red">
              {t("entrepreneur")}
            </div>

            <h3>{t("seekerTitle")}</h3>
            <p>{t("seekerDescription")}</p>

            <ul>
              <li>
                <Icon name="check" size={14} />
                {t("radiusFilter")}
              </li>

              <li>
                <Icon name="check" size={14} />
                {t("comparison")}
              </li>

              <li>
                <Icon name="check" size={14} />
                {t("directSurvey")}
              </li>
            </ul>

            <a href="/login" className="business-button">
              {t("findNow")} <Icon name="arrow" size={15} />
            </a>
          </div>

          <div className="business-card">
            <div className="business-tag blue">
              {t("ownerTag")}
            </div>

            <h3>{t("ownerTitle")}</h3>
            <p>{t("ownerDescription")}</p>

            <ul>
              <li>
                <Icon name="check" size={14} />
                {t("modelIndex")}
              </li>

              <li>
                <Icon name="check" size={14} />
                {t("tenantTargeting")}
              </li>

              <li>
                <Icon name="check" size={14} />
                {t("transparency")}
              </li>
            </ul>

            <a href="/login" className="business-button light">
              {t("postProperty")}
            </a>
          </div>
        </div>
      </section>

      {/* PROPERTI PICKS */}
      <section className="ruko-section">
        <div className="ruko-heading">
          <div>
            <span>{t("databaseKicker")}</span>
            <h2>{t("availableFromOwners")}</h2>
          </div>

          <a href="/login">{t("viewAll")} →</a>
        </div>

        <div className="ruko-grid">
          {loading ? <p role="status">{t("loadingListings")}</p> : loadError ? <p role="alert">{loadError}</p> : !listings.length ? <p>{t("emptyProperties")}</p> : listings.slice(0, 3).map(item => <RukoCard key={item.id} listingId={item.id} image={item.image} score={item.mlStatus === "ready" && item.propora_score != null ? `${item.propora_score.toFixed(2)}/100` : t("notAnalyzed")} scoreLabel={t("aiPrediction")} title={item.name} location={item.address} price={`${rupiah(item.price * 1000000)} ${t("perYear")}`} area={item.building_area_m2 + " m²"} photoLabel={t("photo")} />)}

        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="footer-brand">
          <Link href="/" className="logo">
            <span className="logo-icon">
              <ProporaLogo />
            </span>

            <span>
              Propora<span>.AI</span>
            </span>
          </Link>

          <p>
            {t("footerDescription")}
          </p>
        </div>

        <div>
          <h4>{t("analyticsKicker")}</h4>
          <Link href="/">{t("exploreAi")}</Link>
          <Link href="/">{t("ownersDevelopers")}</Link>
          <Link href="/">{t("methodology")}</Link>
        </div>

        <div>
          <h4>{t("ecosystem")}</h4>
          <Link href="/">{t("demographic")}</Link>
          <Link href="/">{t("footfall")}</Link>
          <Link href="/">{t("partnership")}</Link>
        </div>

        <div>
          <h4>{t("legal")}</h4>
          <Link href="/">{t("privacy")}</Link>
          <Link href="/">{t("terms")}</Link>
          <Link href="/">{t("financialSecurity")}</Link>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Propora AI.</span>
          <span>{t("coverage")}</span>
        </div>
      </footer>
    </main>
  );
}

function RukoCard({
  listingId,
  image,
  score,
  scoreLabel,
  title,
  location,
  price,
  area,
  photoLabel,
}: {
  listingId: number;
  image: string;
  score: string;
  scoreLabel: string;
  title: string;
  location: string;
  price: string;
  area: string;
  photoLabel: string;
}) {
  return (
    <div className="ruko-card">
      <div className="ruko-image">
        <img src={image} alt={propertyName(title)} />{image.startsWith("/figma/") && <small>{photoLabel}</small>}
        <span>{scoreLabel} {score}</span>
      </div>

      <div className="ruko-info">
        <h3><Link href={`/pencari/results/${listingId}/analysis`}>{propertyName(title)}</Link></h3>
        <p>{location}</p>

        <div className="ruko-price">
          <strong>{price}</strong>
          <span>{area}</span>
        </div>
      </div>
    </div>
  );
}
