import test from 'node:test';
import assert from 'node:assert/strict';
import { businessInsights, buildSwot, overallMeaning, rentScenario } from '../app/pencari/area/compare/business-analysis.ts';

const property = {
  mlStatus: 'ready', propora_score: 82, potential_label: 'tinggi',
  price: 18, building_area_m2: 60, facilities: ['Air'],
  demand_score: 90, accessibility_score: 80, property_cost_efficiency_score: 85,
  growth_score: 0, foot_traffic_score: 90, flood_safety_score: 65,
  sentiment_score: 75, google_trends_score: 70, competition_opportunity_score: 22,
};

test('Missing analysis is not interpreted as a zero score or a business weakness', () => {
  const missing = businessInsights({ ...property, demand_score: null, mlStatus: 'unavailable' });
  assert.equal(missing.length, 9);
  assert.ok(missing.every(item => item.tone === 'neutral' && /belum tersedia/i.test(item.evidence)));
  assert.match(overallMeaning({ ...property, mlStatus: 'unavailable' }), /belum dapat dinilai/);
});

test('Zero growth and low competition opportunity have cautious, distinct business meanings', () => {
  const insights = businessInsights(property);
  const growth = insights.find(item => item.key === 'growth_score');
  const competition = insights.find(item => item.key === 'competition_opportunity_score');
  assert.equal(growth.tone, 'caution');
  assert.match(growth.evidence, /0\/100/);
  assert.match(growth.action, /tidak membuktikan/);
  assert.equal(competition.tone, 'caution');
  assert.match(competition.interpretation, /pembeda usaha/g);
  assert.match(competition.action, /tidak menunjukkan jumlah pesaing/);
  assert.equal(businessInsights({ ...property, demand_score: 101 })[0].tone, 'neutral');
});

test('SWOT distinguishes physical tradeoffs and does not treat unlisted facilities as absent', () => {
  const alternative = { ...property, price: 40, building_area_m2: 110, facilities: ['Air', 'Parkir'] };
  const swot = buildSwot(property, alternative);
  assert.ok(swot.strengths.some(point => point.title.includes('sewa lebih ringan')));
  assert.ok(swot.weaknesses.some(point => point.title.includes('ruang lebih terbatas')));
  assert.ok(swot.weaknesses.some(point => point.detail.includes('bukan berarti fasilitas pasti tidak ada')));
  assert.ok(swot.threats.some(point => point.detail.includes('pembeda usaha')));
  assert.ok(swot.opportunities.every(point => point.source.includes('perlu dicek saat survei')));
});

test('Rent-only scenario accounts for gross margin, rounds transactions up, and rejects invalid inputs', () => {
  assert.deepEqual(rentScenario(18_000_000, 25_000, 50, 26), { monthlySales: 3_000_000, dailyTransactions: 5 });
  assert.equal(rentScenario(18_000_000, 25_000, 100, 30).monthlySales, 1_500_000);
  for (const args of [[18e6, 0, 50, 26], [18e6, 25e3, 0, 26], [18e6, 25e3, 101, 26], [18e6, 25e3, 50, 32], [18e6, 25e3, 50, 2.5], [NaN, 25e3, 50, 26]]) {
    assert.equal(rentScenario(...args), null);
  }
});

test('Standalone and multi-property SWOT do not require a pair', () => {
  const standalone = buildSwot(property, []);
  assert.ok(standalone.strengths.some(point => point.title === 'Fasilitas pendukung tercantum'));
  assert.ok(buildSwot({ ...property, facilities: [] }, []).strengths.some(point => point.title === 'Belum ada ruko pembanding'));
  const multiple = buildSwot(property, [{ ...property, price: 40, building_area_m2: 110 }, { ...property, price: 50, building_area_m2: 90 }]);
  assert.ok(multiple.strengths.some(point => point.title.includes('sewa lebih ringan')));
  assert.ok(multiple.weaknesses.some(point => point.title.includes('ruang lebih terbatas')));
});
