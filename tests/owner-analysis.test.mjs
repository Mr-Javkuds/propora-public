import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeListing, listingFingerprint } from '../app/lib/ml/inference.mjs';
const input = { latitude: -6.98255, longitude: 110.40982, price: 50000000, area: 120 };
test('Owner property data produces analysis for a draft and a published property', () => {
  for (const status of ['draft', 'available']) {
    const analysis = analyzeListing({ ...input, status });
    assert.equal(analysis.inputFingerprint, listingFingerprint(input));
    assert.ok(analysis.variants.length > 0);
    for (const variant of analysis.variants) assert.ok(Number.isFinite(variant.propora_score));
  }
});
test('Missing, blank, invalid and out-of-coverage owner inputs cannot pass readiness', () => {
  for (const key of Object.keys(input)) for (const value of [undefined, '', null, NaN, Infinity]) {
    assert.throws(() => analyzeListing({ ...input, [key]: value }), /tidak valid/);
  }
  for (const patch of [{ price: 0 }, { area: 0 }, { price: 500 }, { area: 100001 }, { latitude: -91 }, { longitude: 181 }, { latitude: 0, longitude: 0 }]) {
    assert.throws(() => analyzeListing({ ...input, ...patch }));
  }
});
test('Editing actual owner inputs changes the analysis fingerprint', () => {
  for (const key of Object.keys(input)) assert.notEqual(listingFingerprint(input), listingFingerprint({ ...input, [key]: input[key] + 0.1 }));
});
