import { expect, test } from "bun:test";
import { PDFDocument } from "pdf-lib";
import { createPropertyAnalysisPdf } from "../app/lib/property-analysis-pdf";

const property = {
  id: 14, name: "Ruko Uji — Kopi", address: "Semarang", price: 59, building_area_m2: 180,
  facilities: ["Parkir", "Air"], mlStatus: "ready", propora_score: 62.5, potential_label: "sedang",
  latitude: -6.99, longitude: 110.45, demand_score: 77.5, accessibility_score: 38.5,
  property_cost_efficiency_score: 100, growth_score: 0, foot_traffic_score: 38.8,
  flood_safety_score: 65, sentiment_score: 89.4, google_trends_score: 88,
  competition_opportunity_score: 22, status: "available", businessType: "fnb-cafe",
};

test("PDF report is a readable multi-page PDF with stable property metadata", async () => {
  const bytes = await createPropertyAnalysisPdf(property, { ticket: 25000, margin: 50, days: 26 });
  expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
  const pdf = await PDFDocument.load(bytes);
  expect(pdf.getPageCount()).toBeGreaterThanOrEqual(5);
  expect(pdf.getTitle()).toContain("Ruko Uji - Kopi");
  expect(pdf.getPages().every(page => page.getWidth() > 590 && page.getHeight() > 840)).toBe(true);
});

test("PDF supports missing analysis, unfilled assumptions and long text without throwing", async () => {
  const bytes = await createPropertyAnalysisPdf({ ...property, mlStatus: "pending", propora_score: null, description: "Operasional ".repeat(500), facilities: [] });
  const pdf = await PDFDocument.load(bytes);
  expect(pdf.getPageCount()).toBeGreaterThanOrEqual(5);
});

test("Interactive PDF preserves form values and valid internal/external links", async () => {
  const { PDFName, PDFDict, PDFString } = await import("pdf-lib");
  const bytes = await createPropertyAnalysisPdf(property, null, "https://example.test/pencari/results/14/analysis");
  const pdf = await PDFDocument.load(bytes);
  const form = pdf.getForm();
  expect(form.getFields().length).toBe(5);
  form.getCheckBox("survei.1").check();
  form.getTextField("survei.catatan").setText("Periksa akses parkir dan drainase.");
  const saved = await PDFDocument.load(await pdf.save());
  expect(saved.getForm().getCheckBox("survei.1").isChecked()).toBe(true);
  expect(saved.getForm().getTextField("survei.catatan").getText()).toContain("drainase");
  let internal = 0;
  const external = [];
  for (const page of saved.getPages()) {
    for (const ref of page.node.Annots()?.asArray() ?? []) {
      const annotation = saved.context.lookup(ref, PDFDict);
      const action = annotation.lookupMaybe(PDFName.of("A"), PDFDict);
      if (!action) continue;
      const kind = action.lookup(PDFName.of("S"), PDFName).toString();
      if (kind === "/GoTo") internal += 1;
      if (kind === "/URI") external.push(action.lookup(PDFName.of("URI"), PDFString).decodeText());
    }
  }
  expect(internal).toBeGreaterThanOrEqual(6);
  expect(external).toContain("https://example.test/pencari/results/14/analysis");
  expect(external.some(url => url.startsWith("https://www.google.com/maps"))).toBe(true);
});
