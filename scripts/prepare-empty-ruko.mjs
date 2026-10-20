// Run trained ML locally before producing a transactional Supabase replacement.
// Usage: node scripts/prepare-empty-ruko.mjs <owner UUID> <second owner UUID>
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { analyzeListing, listingFingerprint, modelVersion, predictFeatures } from '../app/lib/ml/inference.mjs';
import artifacts from '../app/lib/ml/artifacts.json' with { type: 'json' };

const owners = process.argv.slice(2);
assert.equal(owners.length, 2, 'Provide two existing owner UUIDs.');
assert.ok(owners.every(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)));
for (const fixture of artifacts.fixtures) assert.equal(predictFeatures(fixture.features).propora_score, fixture.expectedScore);
const locations = [...new Map(artifacts.profiles.map(p => [p.propertyId, p])).values()];
const streets = ['Thamrin', 'Gajah Mada', 'Mutiara Arteri', 'Brumbungan', 'Pemuda', 'Prof. Soedarto', 'Ngesrep Timur', 'Sendangmulyo', 'Banjarsari', 'Bulusan', 'Tembalang', 'Pleburan', 'Sriwijaya', 'Majapahit', 'Pedurungan', 'Supriyadi', 'Setiabudi', 'Banyumanik', 'Ngesrep', 'Jatingaleh', 'Candi', 'Kaliwiru'];
const stamp = new Date().toISOString();
const rows = Array.from({ length: 34 }, (_, index) => {
  const reference = locations[index % locations.length];
  const repeat = index >= locations.length;
  const area = 60 + (index * 17 % 19) * 10;
  const price = Math.round(area * (300000 + (index * 7 % 18) * 30000) / 1000000) * 1000000;
  const listing = {
    id: index + 1, owner_id: owners[index % owners.length],
    name: `Ruko Kosong ${streets[index % streets.length]} ${repeat ? 'B' : 'A'}`,
    address: `Koridor ${streets[index % streets.length]}, ${reference.kecamatan}, Semarang`,
    price, area, latitude: reference.latitude + (repeat ? 0.00065 : 0), longitude: reference.longitude + (repeat ? -0.00055 : 0),
    image: `/figma/results/ruko-${index % 5 + 1}.jpeg`,
    facilities: JSON.stringify(['Parkir', 'PDAM', index % 2 ? 'Listrik 4400W' : 'Listrik 5500W', ...(index % 3 === 0 ? ['Toilet'] : [])]),
    description: 'Ruko kosong siap disewa. Rekomendasi usaha dihitung menggunakan model ML lokal.',
    status: 'available', demo_json: JSON.stringify({ source: 'empty-ruko-34-local-ml', synthetic: true, referencePropertyId: reference.propertyId, occupancy: 'empty', photo: 'reused-demo-illustration' }),
    created_at: stamp, updated_at: stamp,
  };
  const fullAnalysis = analyzeListing(listing);
  assert.equal(fullAnalysis.inputFingerprint, listingFingerprint(listing));
  assert.equal(fullAnalysis.variants.length, 24);
  for (const variant of fullAnalysis.variants) {
    assert.ok(Number.isFinite(variant.propora_score) && variant.propora_score >= 0 && variant.propora_score <= 100);
    assert.equal(predictFeatures(variant.features).propora_score, variant.propora_score);
  }
  // Serving uses scores/signals/drivers. Keep full features and contributions in the local audit artifact.
  const result = { ...fullAnalysis, variants: fullAnalysis.variants.map(({ features, contributions, ...variant }) => variant) };
  return { listing, fullAnalysis, analysis: { listing_id: listing.id, model_version: modelVersion, input_fingerprint: result.inputFingerprint, analyzed_at: result.analyzedAt, result_json: JSON.stringify(result) } };
});
const q = value => typeof value === 'number' ? String(value) : `'${String(value).replaceAll("'", "''")}'`;
let sql = `begin;\nlock table public.listings in access exclusive mode;\n`;
sql += `do $$ begin if (select count(*) from public.users where id in (${owners.map(q).join(',')}) and role='pemilik') <> 2 then raise exception 'Expected owners missing'; end if; end $$;\n`;
for (const table of ['application_documents', 'messages', 'applications', 'surveys', 'favorites', 'wizard_drafts', 'listing_analyses', 'listings']) sql += `delete from public.${table};\n`;
for (const { listing, analysis } of rows) {
  for (const [table, row] of [['listings', listing], ['listing_analyses', analysis]]) sql += `insert into public.${table} (${Object.keys(row).join(',')}) values (${Object.values(row).map(q).join(',')});\n`;
}
sql += `select setval(pg_get_serial_sequence('public.listings','id'),34,true);\n`;
sql += `do $$ begin if (select count(*) from public.listings) <> 34 or (select count(*) from public.listing_analyses) <> 34 or exists(select 1 from public.listings where status <> 'available') then raise exception 'Replacement validation failed'; end if; end $$;\ncommit;\n`;
mkdirSync('.data', { recursive: true });
writeFileSync('.data/empty-ruko-34.json', JSON.stringify({ modelVersion, generatedAt: stamp, rows }));
writeFileSync('.data/empty-ruko-34.sql', sql);
const summary = { listings: rows.length, analyses: rows.length, variants: rows.reduce((n, r) => n + r.fullAnalysis.variants.length, 0), businessTypes: [...new Set(rows[0].fullAnalysis.variants.map(v => v.businessType))], modelVersion, districts: [...new Set(rows.map(r => r.fullAnalysis.kecamatan))], priceRange: [Math.min(...rows.map(r => r.listing.price)), Math.max(...rows.map(r => r.listing.price))], sqlBytes: Buffer.byteLength(sql) };
writeFileSync('.data/empty-ruko-34-summary.json', JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
