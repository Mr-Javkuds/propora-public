import { createHash } from 'node:crypto';
import artifacts from './artifacts.json' with { type: 'json' };

export const modelVersion = artifacts.version;
export const signalKeys = artifacts.signals;
export function listingFingerprint(listing) {
  return createHash('sha256').update(JSON.stringify({ latitude: listing.latitude, longitude: listing.longitude, price: listing.price, area: listing.area, modelVersion })).digest('hex');
}
const defaults = { 'fnb-cafe': 'kopi', laundry: 'laundry-kiloan', minimarket: 'snack-minuman', barbershop: 'haircut', 'retail-skincare': 'skincare' };
export function distanceMeters(a, b) {
  const rad = Math.PI / 180;
  const sin = Math.sin((a.latitude - b.latitude) * rad / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin((a.longitude - b.longitude) * rad / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(sin), Math.sqrt(Math.max(0, 1 - sin)));
}
export function predictFeatures(features) {
  const contributions = {};
  let score = artifacts.model.intercept;
  for (const key of artifacts.model.feature_columns) {
    const value = features[key];
    if (!Number.isFinite(value)) throw new Error(`Fitur ML tidak valid: ${key}`);
    const contribution = (value - artifacts.model.feature_means[key]) / artifacts.model.feature_stds[key] * artifacts.model.coefficients[key];
    contributions[key] = contribution;
    score += contribution;
  }
  const propora_score = Math.round(Math.max(0, Math.min(100, score)) * 100) / 100;
  return { propora_score, potential_label: propora_score >= 75 ? 'tinggi' : propora_score >= 50 ? 'sedang' : 'rendah', contributions };
}
export function analyzeListing(listing) {
  for (const key of ['latitude', 'longitude', 'price', 'area']) if (!Number.isFinite(listing[key])) throw new Error(`Input listing tidak valid: ${key}`);
  if (listing.price <= 0 || listing.area <= 0) throw new Error('Harga dan luas harus positif.');
  if (listing.latitude < -90 || listing.latitude > 90 || listing.longitude < -180 || listing.longitude > 180) throw new Error('Koordinat properti tidak valid.');
  if (!Number.isInteger(listing.price) || listing.price < 1_000_000 || listing.price > 100_000_000_000 || listing.area < 1 || listing.area > 100000) throw new Error('Harga sewa tahunan atau luas bangunan di luar batas yang didukung.');
  const nearest = artifacts.profiles.map(profile => ({ ...profile, distance: distanceMeters(listing, profile) })).sort((a, b) => a.distance - b.distance);
  if (nearest[0].distance > 10000) throw new Error('Lokasi di luar cakupan data referensi ML Semarang (10 km dari titik referensi terdekat).');
  const variants = [];
  const combinations = [...new Set(artifacts.profiles.map(profile => `${profile.businessType}|${profile.trendKeyword}`))];
  for (const combination of combinations) {
    const [businessType, trendKeyword] = combination.split('|');
    const references = nearest.filter(profile => profile.businessType === businessType && profile.trendKeyword === trendKeyword).slice(0, 3);
    const weights = references.map(profile => 1 / Math.max(25, profile.distance));
    const total = weights.reduce((a, b) => a + b, 0);
    const signals = Object.fromEntries(signalKeys.map(key => [key, references.reduce((sum, profile, index) => sum + profile.signals[key] * weights[index], 0) / total]));
    const unitCost = listing.price / listing.area;
    const costs = artifacts.profiles.map(profile => profile.pricePerM2Year);
    signals.property_cost_efficiency_score = Math.max(0, Math.min(100, 100 * (Math.max(...costs) - unitCost) / (Math.max(...costs) - Math.min(...costs))));
    const features = Object.fromEntries(artifacts.model.feature_columns.map(key => [key, 0]));
    Object.assign(features, signals, { price_total: listing.price, building_area_m2: listing.area, price_per_m2_year: unitCost, [`kecamatan_${nearest[0].kecamatan}`]: 1, [`business_type_${businessType}`]: 1, [`trend_keyword_${trendKeyword}`]: 1, market_scenario_base: 1 });
    const prediction = predictFeatures(features);
    const ordered = [...signalKeys].sort((a, b) => prediction.contributions[b] - prediction.contributions[a]);
    variants.push({ businessType, trendKeyword, ...prediction, signals, features, top_positive_drivers: ordered.slice(0, 3), main_risk_drivers: ordered.slice(-3).reverse() });
  }
  return {
    modelVersion, analyzedAt: new Date().toISOString(),
    inputFingerprint: listingFingerprint(listing),
    kecamatan: nearest[0].kecamatan,
    referenceDistanceMeters: Math.round(nearest[0].distance),
    referencePropertyIds: [...new Set(nearest.map(profile => profile.propertyId))].slice(0, 3),
    dataQuality: 'reference_proxy',
    note: 'Inferensi model terlatih; fitur lingkungan diinterpolasi dari dataset Semarang, data Maps live.',
    variants,
  };
}
export function selectVariant(analysis, businessType = 'fnb-cafe', trendKeyword) {
  if (typeof businessType !== 'string' || !Object.hasOwn(defaults, businessType)) return undefined;
  const business = businessType;
  return analysis.variants.find(item => item.businessType === business && item.trendKeyword === trendKeyword)
    || (trendKeyword === undefined ? analysis.variants.find(item => item.businessType === business && item.trendKeyword === defaults[business]) : undefined);
}
