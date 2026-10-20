import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeListing, listingFingerprint, modelVersion, predictFeatures, selectVariant } from '../app/lib/ml/inference.mjs';
import artifacts from '../app/lib/ml/artifacts.json' with { type: 'json' };
import { openDatabase, storeAnalysis } from '../app/lib/sqlite.mjs';

const listing = { latitude: -6.98255, longitude: 110.40982, price: 50000000, area: 120 };
test('Node predictions match independent Python model fixtures for all business types', () => {
  assert.equal(artifacts.fixtures.length, 5);
  for (const fixture of artifacts.fixtures) assert.equal(predictFeatures(fixture.features).propora_score, fixture.expectedScore, fixture.scenarioId);
});
test('Listing inference produces all business/trend variants with explicit proxy provenance', () => {
  const analysis = analyzeListing(listing);
  assert.equal(analysis.variants.length, 24);
  assert.equal(analysis.modelVersion, modelVersion);
  assert.equal(analysis.dataQuality, 'reference_proxy');
  assert.equal(analysis.referencePropertyIds.length, 3);
  assert.ok(analysis.note.includes('bukan data Maps live'));
  for (const variant of analysis.variants) assert.ok(variant.propora_score >= 0 && variant.propora_score <= 100);
  assert.equal(selectVariant(analysis, 'laundry').businessType, 'laundry');
  assert.equal(selectVariant(analysis, 'fnb-cafe', 'matcha').trendKeyword, 'matcha');
  assert.equal(selectVariant(analysis, 'clinic'), undefined);
  assert.equal(selectVariant(analysis, 'fnb-cafe', 'not-in-model'), undefined);
});
test('ML fingerprint tracks coordinates price area and model version, not display copy', () => {
  assert.equal(listingFingerprint(listing), listingFingerprint({ ...listing, name: 'Different name' }));
  for (const field of ['price', 'area', 'latitude', 'longitude']) assert.notEqual(listingFingerprint(listing), listingFingerprint({ ...listing, [field]: listing[field] + 1 }));
  assert.notEqual(selectVariant(analyzeListing(listing)).propora_score, selectVariant(analyzeListing({ ...listing, price: 90000000 })).propora_score);
});
test('Inference rejects missing inputs and locations outside coverage', () => {
  assert.throws(() => analyzeListing({ ...listing, latitude: NaN }), /tidak valid/);
  assert.throws(() => analyzeListing({ ...listing, area: 0 }), /positif/);
  assert.throws(() => analyzeListing({ ...listing, latitude: 0, longitude: 0 }), /cakupan/);
});
test('Stored inference has an owned listing foreign key and remains unchanged on reads', () => {
  const database = openDatabase(':memory:');
  try {
    database.prepare("INSERT INTO users VALUES ('owner','owner@example.test','pemilik','hash','salt')").run();
    database.prepare("INSERT INTO listings(id,owner_id,name,address,price,latitude,longitude,area,image,status,created_at,updated_at) VALUES (1,'owner','Ruko','Semarang',50000000,-6.98255,110.40982,120,'/figma/results/ruko-1.jpeg','available','now','now')").run();
    const analysis = analyzeListing(listing);
    storeAnalysis(database, 1, analysis);
    const saved = database.prepare('SELECT * FROM listing_analyses WHERE listing_id=1').get();
    assert.equal(saved.model_version, modelVersion);
    assert.equal(saved.input_fingerprint, analysis.inputFingerprint);
    assert.deepEqual(JSON.parse(saved.result_json), analysis);
    assert.throws(() => storeAnalysis(database, 999, analysis), /FOREIGN KEY/);
  } finally { database.close(); }
});
