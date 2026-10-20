"use client";

import { useState } from "react";
import { Crosshair, MapPin, Minus, Navigation, Plus } from "lucide-react";
import type { MlRecommendation } from "../../lib/propora-ml-demo";
import "./results-map.css";

type ResultsMapProps = {
  center: { lat: number; lng: number; label: string };
  focusedProperty?: MlRecommendation;
  onReset: () => void;
  onOpenProperty: (id: number) => void;
};

function hasCoordinates(property: MlRecommendation) {
  return Number.isFinite(property.latitude) && Math.abs(property.latitude) <= 90
    && Number.isFinite(property.longitude) && Math.abs(property.longitude) <= 180;
}

export default function ResultsMap({ center, focusedProperty, onReset, onOpenProperty }: ResultsMapProps) {
  const [view, setView] = useState<{ id?: number; zoom: number }>({ zoom: 14 });
  const [satellite, setSatellite] = useState(false);
  const focused = focusedProperty && hasCoordinates(focusedProperty) ? focusedProperty : undefined;
  const zoom = view.id === focused?.id ? view.zoom : focused ? 16 : 14;
  const location = focused ? { lat: focused.latitude, lng: focused.longitude, label: focused.name } : center;
  const mapUrl = `https://www.google.com/maps?q=${location.lat},${location.lng}&z=${zoom}&t=${satellite ? "k" : "m"}&output=embed`;

  function resetView() {
    onReset();
    setView({ zoom: 14 });
  }

  return (
    <section id="peta-Properti" className="results-map property-map" aria-label="Peta lokasi Properti">
      <header className="property-map-toolbar">
        <div className="property-map-heading"><span><MapPin size={17} />AREA PENCARIAN</span><h2>{center.label}</h2></div>
        <div className="property-map-style" role="group" aria-label="Tampilan peta">
          <button type="button" aria-pressed={!satellite} onClick={() => setSatellite(false)}>Peta</button>
          <button type="button" aria-pressed={satellite} onClick={() => setSatellite(true)}>Satelit</button>
        </div>
      </header>

      <div className="property-map-canvas">
        <iframe allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={mapUrl} title={`Peta ${location.label}`} />
        <div className="property-map-controls" role="group" aria-label="Kontrol peta">
          <button type="button" aria-label="Kembali ke area pencarian" title="Kembali ke area pencarian" onClick={resetView}><Crosshair size={18} /></button>
          <div><button type="button" aria-label="Perbesar peta" title="Perbesar peta" disabled={zoom >= 20} onClick={() => setView({ id: focused?.id, zoom: zoom + 1 })}><Plus size={18} /></button><button type="button" aria-label="Perkecil peta" title="Perkecil peta" disabled={zoom <= 5} onClick={() => setView({ id: focused?.id, zoom: zoom - 1 })}><Minus size={18} /></button></div>
        </div>
      </div>

      <div className="property-map-location" aria-live="polite">
        <div><span>{focused ? "LOKASI Properti DIPILIH" : "TITIK PUSAT PENCARIAN"}</span><strong>{location.label}</strong></div>
        {focused ? <button type="button" onClick={() => onOpenProperty(focused.id)}>Lihat detail <span aria-hidden="true">→</span></button> : <a href={`https://www.google.com/maps?q=${location.lat},${location.lng}`} target="_blank" rel="noopener noreferrer" aria-label="Buka area pencarian di Google Maps"><Navigation size={16} />Google Maps</a>}
      </div>


    </section>
  );
}
