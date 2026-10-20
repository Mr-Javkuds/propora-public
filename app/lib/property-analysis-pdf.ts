import { PDFDocument, PDFString, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { MlRecommendation } from "./propora-ml-demo";
import { buildSwot, businessInsights, overallMeaning, radarAxes, rentScenario, surveySteps, type RentAssumptions } from "../pencari/area/compare/business-analysis";
import { listingLabels } from "./marketplace-types";

const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const clean = (value: string) => value.normalize("NFKC").replace(/[\u2010-\u2015]/g, "-").replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\u00a0/g, " ").replace(/[^\x20-\x7e\xa0-\xff\n]/g, " ");
const ink = rgb(.15, .2, .17);
const muted = rgb(.39, .44, .41);
const accent = rgb(.47, .18, .21);
const lineColor = rgb(.86, .89, .87);
const pale = rgb(.95, .97, .95);
const white = rgb(1, 1, 1);

export async function createPropertyAnalysisPdf(property: MlRecommendation, assumptions: RentAssumptions | null = null, reportUrl?: string) {
  const document = await PDFDocument.create();
  document.setTitle(`Analisis properti - ${clean(property.name)}`);
  document.setAuthor("Propora.AI");
  document.setLanguage("id-ID");
  const normal = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const form = document.getForm();
  let page!: PDFPage;
  let y = 0;
  const width = 499;
  const created = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
  const sections: { title: string; page: PDFPage }[] = [];
  const contentsLinks: { page: PDFPage; y: number; index: number }[] = [];

  function newPage() {
    page = document.addPage([595.28, 841.89]);
    page.drawText("Propora.AI", { x: 48, y: 800, size: 12, font: bold, color: accent });
    page.drawText("LAPORAN LOKASI & USAHA", { x: 345, y: 800, size: 9, font: normal, color: muted });
    page.drawLine({ start: { x: 48, y: 785 }, end: { x: 547, y: 785 }, color: lineColor, thickness: 1 });
    y = 760;
  }
  function wrap(value: string, font: PDFFont, size: number, maxWidth = width) {
    const lines: string[] = [];
    for (const paragraph of clean(value).split("\n")) {
      let line = "";
      for (const word of paragraph.split(/\s+/)) {
        let chunk = "";
        const chunks: string[] = [];
        for (const char of word) {
          if (font.widthOfTextAtSize(chunk + char, size) > maxWidth) { chunks.push(chunk); chunk = ""; }
          chunk += char;
        }
        chunks.push(chunk);
        for (const part of chunks) {
          const next = line ? `${line} ${part}` : part;
          if (font.widthOfTextAtSize(next, size) > maxWidth && line) { lines.push(line); line = part; }
          else line = next;
        }
      }
      lines.push(line);
    }
    return lines;
  }
  function text(value: string, size = 10, strong = false, x = 48, maxWidth = width) {
    const font = strong ? bold : normal;
    const height = size * 1.5;
    for (const line of wrap(value, font, size, maxWidth)) {
      if (y < 66 + height) newPage();
      page.drawText(line, { x, y, size, font, color: strong ? ink : muted });
      y -= height;
    }
    y -= 8;
  }
  function heading(value: string) {
    if (y < 135) newPage();
    text(value, 14, true);
  }
  function section(title: string) {
    newPage();
    sections.push({ title, page });
    text(title, 19, true);
  }
  function link(source: PDFPage, x: number, bottom: number, w: number, h: number, target: PDFPage | string) {
    const action = typeof target === "string"
      ? { Type: "Action", S: "URI", URI: PDFString.of(target) }
      : { Type: "Action", S: "GoTo", D: [target.ref, "Fit"] };
    const annotation = document.context.obj({ Type: "Annot", Subtype: "Link", Rect: [x, bottom, x + w, bottom + h], Border: [0, 0, 0], A: action });
    source.node.addAnnot(document.context.register(annotation));
  }
  function table(headers: string[], rows: string[][], widths: number[], size = 9.5, compact = false) {
    const leading = size * 1.45;
    const padding = compact ? 8 : 20;
    function tableHeader() {
      const lines = headers.map((label, index) => wrap(label, bold, size, widths[index] - 20));
      const height = Math.max(...lines.map(items => items.length)) * leading + 20;
      if (y - height < 110) newPage();
      let x = 48;
      lines.forEach((items, index) => {
        page.drawRectangle({ x, y: y - height, width: widths[index], height, color: accent });
        items.forEach((value, line) => page.drawText(value, { x: x + 10, y: y - 13 - line * leading, font: bold, size, color: white }));
        x += widths[index];
      });
      y -= height;
    }
    tableHeader();
    rows.forEach((row, rowIndex) => {
      const cells = row.map((value, index) => wrap(value, normal, size, widths[index] - 20));
      const total = Math.max(...cells.map(cell => cell.length));
      if (total * leading + padding > y - 76 && total * leading + padding < 600) {
        newPage();
        tableHeader();
      }
      let offset = 0;
      while (offset < total) {
        if (y < 110) { newPage(); tableHeader(); }
        const count = Math.min(total - offset, Math.max(1, Math.floor((y - 76 - padding) / leading)));
        const height = count * leading + padding;
        let x = 48;
        cells.forEach((cell, index) => {
          page.drawRectangle({ x, y: y - height, width: widths[index], height, color: rowIndex % 2 ? white : pale, borderColor: lineColor, borderWidth: .5 });
          cell.slice(offset, offset + count).forEach((value, line) => page.drawText(value, { x: x + 10, y: y - 14 - line * leading, size, font: normal, color: ink }));
          x += widths[index];
        });
        y -= height;
        offset += count;
        if (offset < total) { newPage(); tableHeader(); }
      }
    });
    y -= 18;
  }

  newPage();
  const contentsPage = page;
  text("Analisis lokasi & usaha", 24, true);
  text(property.name, 17, true);
  text(property.address);
  text(`Dibuat ${created} WIB | ID properti ${property.id}`, 9);
  const metrics = [["SEWA TAHUNAN", money(property.price * 1_000_000)], ["LUAS BANGUNAN", `${property.building_area_m2} m2`], ["PREDIKSI AI", property.mlStatus === "ready" && property.propora_score != null ? `${property.propora_score.toLocaleString("id-ID", { maximumFractionDigits: 1 })}/100` : "Belum tersedia"]];
  metrics.forEach(([label, value], index) => {
    const x = 48 + index * 170;
    page.drawRectangle({ x, y: y - 66, width: 159, height: 66, color: pale, borderColor: lineColor, borderWidth: .6 });
    page.drawText(label, { x: x + 12, y: y - 18, size: 8, font: normal, color: muted });
    page.drawText(clean(value), { x: x + 12, y: y - 43, size: 12, font: bold, color: accent });
  });
  y -= 90;
  heading("Apa artinya untuk usaha Anda?");
  text(overallMeaning(property));
  text("Angka membantu menilai lokasi, bukan menjamin keberhasilan usaha. Pastikan kondisi bangunan, pelanggan sekitar, dan seluruh biaya melalui survei.");
  heading("Jelajahi laporan");
  const titles = ["1. Ringkasan properti & biaya", "2. Grafik radar & skor lokasi", "3. Tabel analisis SWOT", "4. Faktor lokasi & tindakan", "5. Perhitungan biaya sewa", "6. Checklist survei & catatan"];
  titles.forEach((title, index) => {
    page.drawRectangle({ x: 48, y: y - 27, width, height: 29, color: index % 2 ? white : pale });
    page.drawText(title, { x: 60, y: y - 17, size: 10, font: bold, color: accent });
    contentsLinks.push({ page, y: y - 27, index });
    y -= 34;
  });
  y -= 8;
  text("Klik judul bagian untuk berpindah halaman. Checklist dan catatan di akhir laporan dapat diisi pada pembaca PDF yang mendukung formulir. Simpan ulang PDF untuk menyimpan perubahan.", 9);

  section(titles[0]);
  table(["Informasi properti", "Keterangan"], [
    ["Nama properti", property.name], ["Alamat", property.address],
    ["Status", property.status ? listingLabels[property.status] : "Belum tersedia"],
    ["Sewa per tahun", money(property.price * 1_000_000)],
    ["Setara per bulan", `${money(property.price * 1_000_000 / 12)}. Untuk perencanaan biaya, bukan pilihan cicilan.`],
    ["Luas bangunan", `${property.building_area_m2} m2. Ukur kembali luas efektif saat survei.`],
    ["Sewa per luas", property.building_area_m2 > 0 ? `${money(property.price * 1_000_000 / property.building_area_m2)} / m2 / tahun` : "Belum dapat dihitung"],
    ["Fasilitas tercantum", property.facilities.join(", ") || "Belum diisi pemilik"],
  ], [145, 354], 9.5, true);
  heading("Catatan pemilik");
  text(property.description || "Deskripsi belum tersedia.");
  heading("Prioritas sebelum menyewa");
  text("Biaya sewa menjadi komitmen tetap. Pastikan luas efektif sesuai alur pelayanan, penyimpanan, dan pelanggan. Hitung juga deposit, renovasi, utilitas, serta biaya pembukaan usaha.");
  table(["Dasar analisis", "Keterangan"], [
    ["Kategori usaha", property.businessType || "Belum tersedia"],
    ["Fokus produk", property.trendKeyword || "Belum tersedia"],
    ["Versi analisis", property.modelVersion || "Belum tersedia"],
    ["Waktu analisis", property.analyzedAt ? new Date(property.analyzedAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB" : "Belum tersedia"],
  ], [145, 354], 9.5, true);
  text("Prediksi AI memakai data pendukung. Skor bukan persentase keberhasilan usaha. Omzet aktual, jumlah pelanggan, pangsa pasar, dan waktu balik modal belum tersedia.", 9);

  section(titles[1]);
  text("Skala 0-100. Semakin jauh dari pusat, semakin mendukung penilaian faktor. Skor keamanan banjir yang tinggi berarti kondisi dinilai lebih aman.");
  const cy = y - 170;
  const cx = 297;
  const radius = 115;
  const position = (index: number, length: number) => {
    const angle = Math.PI / 2 - index * 2 * Math.PI / radarAxes.length;
    return { x: cx + Math.cos(angle) * length, y: cy + Math.sin(angle) * length };
  };
  for (const level of [20, 40, 60, 80, 100]) {
    radarAxes.forEach((_, index) => page.drawLine({ start: position(index, radius * level / 100), end: position((index + 1) % radarAxes.length, radius * level / 100), color: rgb(.85, .89, .86), thickness: .6 }));
    page.drawText(String(level), { x: cx + 4, y: cy + radius * level / 100 - 10, size: 7, font: normal, color: muted });
  }
  const values = radarAxes.map(axis => {
    const value = property[axis.key];
    return property.mlStatus === "ready" && value != null && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
  });
  radarAxes.forEach((axis, index) => {
    page.drawLine({ start: { x: cx, y: cy }, end: position(index, radius), color: rgb(.85, .89, .86), thickness: .6 });
    const label = position(index, radius + 30);
    clean(axis.label).split(" ").forEach((word, line) => page.drawText(word, { x: label.x - normal.widthOfTextAtSize(word, 8) / 2, y: label.y - line * 10, size: 8, font: normal, color: muted }));
    const value = values[index];
    if (value !== null) {
      const dot = position(index, radius * value / 100);
      page.drawCircle({ x: dot.x, y: dot.y, size: 2.5, color: accent });
      const next = values[(index + 1) % values.length];
      if (values.every(item => item !== null) && next !== null) page.drawLine({ start: dot, end: position((index + 1) % values.length, radius * next / 100), color: accent, thickness: 2 });
    }
  });
  y = cy - 190;
  table(["Faktor lokasi", "Skor prediksi AI"], radarAxes.map((axis, index) => [axis.label, values[index] === null ? "Belum tersedia" : values[index]?.toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "/100"]), [354, 145], 9, true);
  text("Data yang belum tersedia tidak dianggap nol. Garis tertutup hanya digambar jika seluruh faktor tersedia.", 9);


  section(titles[2]);
  text("Kekuatan dan kelemahan menilai properti. Peluang dan ancaman menilai lingkungan usaha. Seluruhnya adalah analisis awal yang perlu diperiksa saat survei.");
  const swot = buildSwot(property, []);
  const points = (items: typeof swot.strengths) => items.map((point, index) => `${index + 1}. ${point.title}\n${point.detail}\nDasar: ${point.source}`).join("\n\n");
  table(["S - Kekuatan", "W - Kelemahan"], [[points(swot.strengths), points(swot.weaknesses)]], [249.5, 249.5]);
  table(["O - Peluang", "T - Ancaman"], [[points(swot.opportunities), points(swot.threats)]], [249.5, 249.5]);

  section(titles[3]);
  text("Baca kesimpulan bersama tindakan yang disarankan. Skor yang belum tersedia tidak dianggap nol.");
  table(["Faktor & dasar", "Makna bagi usaha", "Tindakan saat survei"], businessInsights(property).map(insight => [
    `${insight.title}\n\n${insight.evidence}`, insight.interpretation, insight.action,
  ]), [130, 185, 184]);

  section(titles[4]);
  const result = assumptions ? rentScenario(property.price * 1_000_000, assumptions.ticket, assumptions.margin, assumptions.days) : null;
  if (assumptions && result) {
    table(["Asumsi pengguna", "Nilai"], [["Rata-rata transaksi", money(assumptions.ticket)], ["Margin kotor", `${assumptions.margin}%`], ["Hari buka per bulan", String(assumptions.days)]], [249.5, 249.5]);
    heading(`${result.dailyTransactions} transaksi per hari buka`);
    text(`Setara penjualan ${money(Math.ceil(result.monthlySales))} per bulan untuk menghasilkan margin kotor yang menutup sewa.`);
  } else text("Belum dihitung karena asumsi usaha belum diisi lengkap. Isi nilai transaksi, margin kotor, dan hari buka pada halaman analisis, lalu unduh ulang laporan.");
  table(["Yang dihitung", "Yang belum termasuk"], [["Penjualan yang menghasilkan margin kotor untuk menutup sewa saja.", "Gaji, listrik, pemasaran, pajak, penyusutan, dan biaya lainnya."]], [249.5, 249.5]);
  heading("Cara membaca hasil");
  text("Rumus: sewa tahunan / 12 / margin kotor / nilai transaksi / hari buka. Transaksi dibulatkan ke atas. Margin kotor adalah bagian penjualan setelah biaya langsung produk.");
  text("Ini bukan titik impas usaha dan bukan prediksi omzet atau waktu balik modal. Hasil mengikuti asumsi yang Anda isi pada aplikasi.");

  section(titles[5]);
  text("Centang setelah pemeriksaan selesai. Gunakan kolom catatan untuk mencatat temuan, biaya tambahan, dan pertanyaan bagi pemilik. Simpan salinan PDF setelah mengisi.");
  surveySteps.forEach((step, index) => {
    const detailLines = wrap(step.detail, normal, 10, 467);
    if (y < 110 + detailLines.length * 15) newPage();
    const checkbox = form.createCheckBox(`survei.${index + 1}`);
    checkbox.addToPage(page, { x: 48, y: y - 4, width: 16, height: 16, borderColor: accent, borderWidth: 1 });
    text(`${index + 1}. ${step.title}`, 11, true, 80, 467);
    text(step.detail, 10, false, 80, 467);
    y -= 10;
  });
  if (y < 245) newPage();
  heading("Catatan survei Anda");
  const notes = form.createTextField("survei.catatan");
  notes.enableMultiline();
  notes.addToPage(page, { x: 48, y: y - 112, width, height: 112, borderColor: lineColor, borderWidth: 1, backgroundColor: pale });
  notes.setFontSize(10);
  y -= 136;
  if (reportUrl && /^https?:\/\//.test(reportUrl)) {
    page.drawText("Buka halaman analisis properti", { x: 48, y, font: bold, size: 10, color: accent });
    link(page, 48, y - 4, 240, 18, reportUrl);
    y -= 26;
  }
  page.drawText("Buka lokasi di Google Maps", { x: 48, y, font: bold, size: 10, color: accent });
  link(page, 48, y - 4, 240, 18, `https://www.google.com/maps?q=${property.latitude},${property.longitude}`);
  form.updateFieldAppearances(normal);

  contentsLinks.forEach(item => {
    const target = sections[item.index].page;
    item.page.drawText(String(document.getPages().indexOf(target) + 1), { x: 520, y: item.y + 10, size: 10, font: bold, color: accent });
    link(item.page, 48, item.y, width, 29, target);
  });
  const pages = document.getPages();
  pages.forEach((sheet, index) => {
    sheet.drawLine({ start: { x: 48, y: 45 }, end: { x: 547, y: 45 }, color: lineColor, thickness: .5 });
    sheet.drawText(`Propora.AI | Analisis awal - perlu survei | ${index + 1} / ${pages.length}`, { x: 48, y: 30, size: 8, font: normal, color: muted });
    if (index > 0) {
      sheet.drawText("Kembali ke daftar isi", { x: 430, y: 30, size: 8, font: bold, color: accent });
      link(sheet, 425, 25, 122, 18, contentsPage);
    }
  });
  return document.save();
}
