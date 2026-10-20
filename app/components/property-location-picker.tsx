"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Navigation, MapPin, LocateFixed, CheckCircle2, Expand, LoaderCircle, Plus, Minus } from "lucide-react";
import { api } from "../lib/marketplace-client";
import { useTranslations } from "next-intl";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import "./property-location-picker.css";

// Firefox restores dynamic disabled states on reload unless autocomplete is off.
// This Firefox button attribute is absent from React's ButtonHTMLAttributes.
const buttonSessionProps = { autoComplete: "off" };

type Place = { latitude: number; longitude: number; label: string };

type Props = { latitude: string; longitude: string; onChange: (latitude: string, longitude: string) => void };

export default function PropertyLocationPicker({ latitude, longitude, onChange }: Props) {
  const t = useTranslations("Owner.form");
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const placePin = useRef<((lat: number, lng: number, emit?: boolean) => void) | null>(null);
  const latest = useRef({ latitude, longitude, onChange });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [locating, setLocating] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [zoom, setZoom] = useState(14);
  const searchRequest = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const selected = latitude.trim() !== "" && longitude.trim() !== "" && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude)) && Math.abs(Number(latitude)) <= 90 && Math.abs(Number(longitude)) <= 180;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; searchRequest.current?.abort(); }; }, []);

  function changeZoom(value: number) {
    if (!map.current) return;
    map.current.stop();
    map.current.setZoom(Math.max(3, Math.min(19, value)), { animate: false });
  }
  function choose(lat: number, lng: number, focusZoom?: number) {
    placePin.current?.(lat, lng);
    if (focusZoom !== undefined) map.current?.setView([lat, lng], focusZoom, { animate: false });
    setPlaces([]); setSearched(false); setFeedback("");
  }
  async function search() {
    if (query.trim().length < 3) { setFeedback(t("mapSearchShort")); return; }
    searchRequest.current?.abort();
    const controller = new AbortController();
    searchRequest.current = controller;
    setSearching(true); setPlaces([]); setSearched(false); setFeedback("");
    try {
      const result = await api<{ places: Place[] }>("/api/owner/location-search?q=" + encodeURIComponent(query.trim()), { signal: controller.signal });
      if (!controller.signal.aborted && mounted.current) { setPlaces(result.places); setSearched(true); }
    } catch { if (!controller.signal.aborted && mounted.current) setFeedback(t("mapSearchError")); }
    finally { if (!controller.signal.aborted && mounted.current) setSearching(false); }
  }
  function locate() {
    if (!navigator.geolocation) { setFeedback(t("mapLocationError")); return; }
    setLocating(true); setFeedback("");
    navigator.geolocation.getCurrentPosition(position => {
      if (!mounted.current) return;
      setLocating(false);
      choose(position.coords.latitude, position.coords.longitude, 17);
    }, () => { if (mounted.current) { setLocating(false); setFeedback(t("mapLocationError")); } }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  }
  useEffect(() => { latest.current = { latitude, longitude, onChange }; }, [latitude, longitude, onChange]);

  useEffect(() => {
    let cancelled = false;
    let resize: ResizeObserver | undefined;
    async function setup() {
      try {
        const L = await import("leaflet");
        if (cancelled || !container.current) return;
        const instance = L.map(container.current, {
          zoomControl: false, scrollWheelZoom: true, touchZoom: true, doubleClickZoom: false,
          minZoom: 3, maxZoom: 19, zoomSnap: 1, zoomDelta: 1,
          wheelPxPerZoomLevel: 160, wheelDebounceTime: 120, zoomAnimation: false,
        }).setView([-6.9827, 110.4091], 14);
        map.current = instance;
        instance.on("zoomend", () => { if (!cancelled) setZoom(instance.getZoom()); });
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).on("tileerror", () => { if (!cancelled) setFailed(true); }).addTo(instance);
        const icon = L.divIcon({ className: "property-location-pin", html: '<span aria-hidden="true"></span>', iconSize: [28, 36], iconAnchor: [14, 36] });
        function select(lat: number, lng: number, emit = true) {
          const longitude = lng >= -180 && lng <= 180 ? lng : ((lng + 180) % 360 + 360) % 360 - 180;
          if (!marker.current) {
            marker.current = L.marker([lat, longitude], { draggable: true, icon }).addTo(instance);
            marker.current.on("dragend", () => {
              const point = marker.current!.getLatLng();
              select(point.lat, point.lng);
            });
          } else marker.current.setLatLng([lat, longitude]);
          if (emit) latest.current.onChange(lat.toFixed(6), longitude.toFixed(6));
        }
        placePin.current = select;
        instance.on("click", event => select(event.latlng.lat, event.latlng.lng));
        // Keyboard users can pan with arrows, then select the map centre with Enter.
        instance.getContainer().addEventListener("keydown", event => {
          if (event.key === "Enter" && event.target === instance.getContainer()) {
            event.preventDefault();
            const center = instance.getCenter();
            select(center.lat, center.lng);
          }
        });
        const initial = latest.current;
        if (initial.latitude.trim() && initial.longitude.trim() && Number.isFinite(Number(initial.latitude)) && Number.isFinite(Number(initial.longitude)) && Math.abs(Number(initial.latitude)) <= 90 && Math.abs(Number(initial.longitude)) <= 180) {
          const point: [number, number] = [Number(initial.latitude), Number(initial.longitude)];
          marker.current = L.marker(point, { draggable: true, icon }).addTo(instance);
          marker.current.on("dragend", () => { const point = marker.current!.getLatLng(); select(point.lat, point.lng); });
          instance.setView(point, 17);
        }
        resize = new ResizeObserver(() => instance.invalidateSize());
        resize.observe(container.current);
        setReady(true);
      } catch { if (!cancelled) setFailed(true); }
    }
    void setup();
    return () => { cancelled = true; resize?.disconnect(); map.current?.remove(); map.current = null; marker.current = null; placePin.current = null; };
  }, []);

  useEffect(() => {
    const lat = Number(latitude), lng = Number(longitude);
    if (ready && map.current && (!latitude.trim() || !longitude.trim())) { marker.current?.remove(); marker.current = null; return; }
    if (!ready || !map.current || !latitude.trim() || !longitude.trim() || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return;
    placePin.current?.(lat, lng, false);
    map.current.panTo([lat, lng], { animate: false });
  }, [latitude, longitude, ready]);

  return <section className={"property-location-picker wide" + (expanded ? " is-expanded" : "")} aria-label={t("mapTitle")}>
    <header className="location-picker-heading"><div><strong>{t("mapTitle")}</strong><p>{t("mapSimpleHint")}</p></div><span className={selected ? "location-badge selected" : "location-badge"}>{selected ? <CheckCircle2 size={14} /> : <MapPin size={14} />}{selected ? t("mapChosen") : t("mapRequired")}</span></header>
    <div className="location-search-bar" role="search" aria-label={t("mapSearchLabel")}>
      <div className="location-search-input"><Search size={18} /><input autoComplete="off" spellCheck={false} aria-label={t("mapSearchLabel")} placeholder={t("mapSearchPlaceholder")} maxLength={200} value={query} onChange={event => { searchRequest.current?.abort(); setSearching(false); setQuery(event.target.value); setPlaces([]); setSearched(false); }} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void search(); } }} /></div>
      <button type="button" {...buttonSessionProps} disabled={!ready || searching} onClick={() => void search()}>{searching ? <LoaderCircle size={16} className="location-spinner" /> : <Search size={16} />}{t("mapSearch")}</button>
    </div>
    {places.length > 0 && <ul className="location-search-results" aria-label={t("mapResults")}>{places.map((place, index) => <li key={index}><button type="button" {...buttonSessionProps} onClick={() => choose(place.latitude, place.longitude, 17)}><MapPin size={18} /><span>{place.label}</span><span aria-hidden="true">↗</span></button></li>)}</ul>}
    {searched && !places.length && <p role="status">{t("mapNoResults")}</p>}
    <div className="location-map-frame">
      <div ref={container} className="property-location-canvas" aria-label={t("mapHint")} />
      <div className="location-map-tools"><button type="button" {...buttonSessionProps} disabled={!ready || locating} onClick={locate}>{locating ? <LoaderCircle size={17} className="location-spinner" /> : <Navigation size={17} />}{t("mapMyLocation")}</button><button type="button" {...buttonSessionProps} aria-label={t("mapExpand")} title={t("mapExpand")} aria-pressed={expanded} onClick={() => setExpanded(current => !current)}><Expand size={17} /></button></div>
      <div className="location-center-target" aria-hidden="true"><span /></div>
      <button type="button" {...buttonSessionProps} className="location-center-button" disabled={!ready} onClick={() => { const center = map.current?.getCenter(); if (center) choose(center.lat, center.lng); }}><LocateFixed size={17} />{t("mapUseCenter")}</button>
      {!ready && !failed && <div className="location-loading" role="status">{t("mapLoading")}</div>}
    </div>
    <div className="location-zoom-bar" role="group" aria-label={t("mapZoomControls")}>
      <button type="button" {...buttonSessionProps} disabled={!ready || zoom <= 3} aria-label={t("mapZoomOut")} title={t("mapZoomOut")} onClick={() => changeZoom((map.current?.getZoom() ?? zoom) - 1)}><Minus size={20} /></button>
      <input autoComplete="off" type="range" min="3" max="19" step="1" value={zoom} disabled={!ready} aria-label={t("mapZoomLevel")} aria-valuetext={t("mapZoomValue", { level: zoom })} onChange={event => changeZoom(Number(event.target.value))} />
      <button type="button" {...buttonSessionProps} disabled={!ready || zoom >= 19} aria-label={t("mapZoomIn")} title={t("mapZoomIn")} onClick={() => changeZoom((map.current?.getZoom() ?? zoom) + 1)}><Plus size={20} /></button>
      <output aria-live="off">{t("mapZoomValue", { level: zoom })}</output>
    </div>
    <p className="location-zoom-hint">{t("mapZoomHint")}</p>
    {failed && <p role="alert">{t("mapError")}</p>}
    {feedback && <p className="location-feedback" role="alert">{feedback}</p>}
    <div className={"location-selection" + (selected ? " has-selection" : "")} role="status"><span className="location-selection-icon">{selected ? <CheckCircle2 size={21} /> : <MapPin size={21} />}</span><div><strong>{selected ? t("mapSavedPoint") : t("mapEmpty")}</strong><p>{selected ? latitude + ", " + longitude : t("mapSelectHint")}</p></div>{selected && <button type="button" {...buttonSessionProps} disabled={!ready} onClick={() => map.current?.panTo([Number(latitude), Number(longitude)], { animate: false })}>{t("mapBackToPin")}</button>}</div>
    <small className="location-search-credit">{t("mapSearchCredit")} <a href="https://photon.komoot.io/" target="_blank" rel="noreferrer">Photon</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a></small>
  </section>;
}
