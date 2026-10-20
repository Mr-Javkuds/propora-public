"use client";

import { useLocale } from "next-intl";
import { translate } from "../../../components/global-locale-translator";
import { useState } from "react";
import type { MlRecommendation, MlSignalKey } from "../../../lib/propora-ml-demo";

import { radarAxes as axes } from "./business-analysis";

const colors = ["#792d35", "#287b65", "#4269a3", "#a06a13", "#8551a1", "#137b8b", "#b25322", "#5a7131"];
const format = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

function point(index: number, radius: number) {
  const angle = index * Math.PI * 2 / axes.length - Math.PI / 2;
  return [260 + Math.cos(angle) * radius, 250 + Math.sin(angle) * radius];
}
function score(property: MlRecommendation, key: MlSignalKey) {
  const value = property[key];
  return property.mlStatus === "ready" && value != null && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
}

export default function ComparisonRadar({ properties }: { properties: MlRecommendation[] }) {
  const locale = useLocale() as "id" | "en" | "zh";
  const [hiddenIds, setHiddenIds] = useState<number[]>([]);
  const visible = properties.filter(property => !hiddenIds.includes(property.id));
  return (
    <section className="compare-business-section compare-radar" id="grafik-radar" aria-labelledby="radar-heading">
      <div className="compare-analysis-heading"><p className="seeker-page-eyebrow">GAMBARAN FAKTOR LOKASI</p><h2 id="radar-heading">Bandingkan kekuatan tiap lokasi.</h2><p>Semakin jauh titik dari pusat, semakin mendukung penilaian faktor tersebut. Semua sumbu memakai skala yang sama, 0–100.</p></div>
      <div className="compare-radar-layout">
        <svg viewBox="0 0 520 500" role="img" aria-labelledby="radar-title radar-description">
          <title id="radar-title">Grafik radar faktor lokasi properti pilihan</title><desc id="radar-description">{visible.length} properti ditampilkan pada sembilan faktor lokasi. Nilai lebih tinggi berarti penilaian lebih mendukung, termasuk keamanan banjir. Rincian angka tersedia pada tabel di bawah.</desc>
          {[20, 40, 60, 80, 100].map(level => <g key={level}><polygon points={axes.map((_, index) => point(index, level * 1.65).join(",")).join(" ")} fill="none" stroke="#dce4de" /><text x="266" y={250 - level * 1.65 + 12} className="radar-scale">{level}</text></g>)}
          {axes.map((axis, index) => { const [x, y] = point(index, 205); const [endX, endY] = point(index, 165); return <g key={axis.key}><line x1="260" y1="250" x2={endX} y2={endY} stroke="#dce4de" /><text x={x} y={y} textAnchor="middle" className="radar-axis">{translate(axis.label, locale).split(" ").map((word, line) => <tspan x={x} dy={line ? 14 : 0} key={line}>{word}</tspan>)}</text></g>; })}
          {properties.map((property, index) => {
            if (hiddenIds.includes(property.id)) return null;
            const values = axes.map(axis => score(property, axis.key));
            const complete = values.every(value => value !== null);
            const color = colors[index % colors.length];
            return <g key={property.id}>{complete && <polygon points={values.map((value, axisIndex) => point(axisIndex, (value ?? 0) * 1.65).join(",")).join(" ")} stroke={color} strokeWidth="2.5" strokeDasharray={index >= colors.length ? "6 3" : undefined} fill={color} fillOpacity="0.06" />}{values.map((value, axisIndex) => { if (value === null) return null; const [x, y] = point(axisIndex, value * 1.65); return <circle cx={x} cy={y} r="3.5" fill={color} key={axes[axisIndex].key}><title>{property.name} · {axes[axisIndex].label}: {format.format(value)}/100</title></circle>; })}</g>;
          })}
          {!visible.length && <text x="260" y="250" textAnchor="middle" className="radar-axis">Pilih properti pada legenda</text>}
        </svg>
        <div className="compare-radar-legend"><h3>Tampilkan properti</h3><p>Klik nama untuk menampilkan atau menyembunyikan garis.</p>{properties.map((property, index) => <button key={property.id} type="button" aria-pressed={!hiddenIds.includes(property.id)} onClick={() => setHiddenIds(current => current.includes(property.id) ? current.filter(id => id !== property.id) : [...current, property.id])}><span className="radar-swatch" style={{ background: colors[index % colors.length] }} /><span><strong>Pilihan {index + 1} · {property.name}</strong><small>{axes.filter(axis => score(property, axis.key) !== null).length}/9 faktor tersedia</small></span></button>)}<p className="compare-radar-note">Skor keamanan banjir yang lebih tinggi berarti kondisi dinilai lebih aman. Data yang belum tersedia tidak digambar sebagai nol; garis tertutup hanya muncul jika seluruh faktor tersedia. Bentuk grafik bukan prediksi omzet atau persentase keberhasilan usaha.</p></div>
      </div>
      <details className="compare-method"><summary>Lihat angka di balik grafik</summary><div className="compare-table-wrap"><table className="compare-table"><caption>Data faktor untuk grafik radar</caption><thead><tr><th scope="col">Faktor lokasi</th>{properties.map(property => <th scope="col" key={property.id}>{property.name}</th>)}</tr></thead><tbody>{axes.map(axis => <tr key={axis.key}><th scope="row">{axis.label}</th>{properties.map(property => {const value = score(property, axis.key);return <td key={property.id}>{value === null ? "Belum tersedia" : `${format.format(value)}/100`}</td>;})}</tr>)}</tbody></table></div></details>
    </section>
  );
}
