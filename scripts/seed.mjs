import { randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { existsSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase, storeAnalysis } from '../app/lib/sqlite.mjs';
import { analyzeListing, modelVersion } from '../app/lib/ml/inference.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, '.data');
const database = openDatabase(path.join(directory, 'propora.sqlite'));
const reset = process.argv.includes('--reset');
const seedVersion = 'connected-demo-v1';
const password = 'ProporaDemo123!';
const accounts = [
  { id: 'seed-owner-1', email: 'pemilik@propora.demo', role: 'pemilik' },
  { id: 'seed-owner-2', email: 'pemilik2@propora.demo', role: 'pemilik' },
  { id: 'seed-seeker-1', email: 'pencari@propora.demo', role: 'pencari' },
  { id: 'seed-seeker-2', email: 'pencari2@propora.demo', role: 'pencari' },
];
const listings = [
  { id: 1, ownerId: 'seed-owner-1', name: 'Ruko A - Imam Bonjol', address: 'Jl. Imam Bonjol, Semarang Tengah', price: 50000000, area: 120, latitude: -6.98255, longitude: 110.40982 },
  { id: 2, ownerId: 'seed-owner-1', name: 'Ruko Pleburan', address: 'Pleburan Barat, Semarang', price: 75000000, area: 140, latitude: -6.98195, longitude: 110.40874 },
  { id: 3, ownerId: 'seed-owner-2', name: 'Ruko Pemuda', address: 'Jl. Pemuda, Semarang Tengah', price: 85000000, area: 150, latitude: -6.9789, longitude: 110.4149 },
  { id: 4, ownerId: 'seed-owner-2', name: 'Ruko Brumbungan', address: 'Jl. Brumbungan, Semarang Tengah', price: 110000000, area: 160, latitude: -6.98212, longitude: 110.41925 },
  { id: 5, ownerId: 'seed-owner-1', name: 'Ruko Kampus Pleburan', address: 'Koridor Pleburan, Semarang', price: 65000000, area: 110, latitude: -6.97985, longitude: 110.42841 },
];

try {
  database.exec('BEGIN IMMEDIATE');
  if (!reset && database.prepare("SELECT value FROM app_meta WHERE key='seed_version'").get()?.value === seedVersion) {
    database.exec('COMMIT');
    console.log('Seed sudah terpasang. Tidak ada data yang diubah. Gunakan npm run db:reset untuk mulai ulang.');
  } else {
    if (!reset && (Number(database.prepare('SELECT COUNT(*) AS count FROM users').get().count) > 0 || Number(database.prepare('SELECT COUNT(*) AS count FROM listings').get().count) > 0)) throw new Error('Database sudah berisi data. Gunakan npm run db:reset untuk reset eksplisit.');
    if (reset) {
      for (const table of ['messages', 'applications', 'surveys', 'favorites', 'wizard_drafts', 'listing_analyses', 'sessions', 'listings', 'users']) database.exec(`DELETE FROM ${table}`);
      database.exec("DELETE FROM sqlite_sequence WHERE name IN ('listings','messages')");
    }
    const now = new Date().toISOString();
    for (const account of accounts) {
      const salt = randomBytes(16).toString('hex');
      database.prepare('INSERT INTO users VALUES (?,?,?,?,?)').run(account.id, account.email, account.role, scryptSync(password, salt, 64).toString('hex'), salt);
    }
    for (const listing of listings) {
      database.prepare("INSERT INTO listings(id,owner_id,name,address,price,latitude,longitude,area,image,facilities,description,demo_json,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'available',?,?)")
        .run(listing.id, listing.ownerId, listing.name, listing.address, listing.price, listing.latitude, listing.longitude, listing.area, `/figma/results/ruko-${listing.id}.jpeg`, JSON.stringify(['Parkir', 'PDAM', 'Listrik 4400W']), 'Listing contoh milik akun demo Propora.', JSON.stringify({source:'seed',note:'Listing contoh sintetis, bukan properti terverifikasi lapangan'}), now, now);
      storeAnalysis(database, listing.id, analyzeListing(listing));
    }
    const tomorrow = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + 86400000));
    const draft = { proporaWizardData: { businessType: 'Cafe & Kedai Kopi', business: { id: 'cafe', title: 'Cafe & Kedai Kopi', summary: 'Cafe & Kedai Kopi' }, businessName: 'Kopi Selasar', subCategory: 'Kopi', budget: { min: 30, max: 100 }, initialCapital: 120000000, targets: ['Mahasiswa', 'Pekerja'], operationalHours: { open: '09:00', close: '22:00' } }, proporaAreaSearch: { center: 'UDINUS, Semarang', coordinates: [-6.9827, 110.4091], radius: '2 km', areaMode: 'Dekat kampus', filters: [] }, proporaCompareIds: [1, 2], compareProperties: null };
    database.prepare('INSERT INTO wizard_drafts VALUES (?,?,?)').run('seed-seeker-1', JSON.stringify(draft), now);
    database.prepare('INSERT INTO favorites VALUES (?,?)').run('seed-seeker-1', 1);
    database.prepare("INSERT INTO surveys(id,listing_id,seeker_id,date,time,visitors,note,status,created_at,updated_at) VALUES ('seed-survey-1',1,'seed-seeker-1',?,'10:00',2,'Contoh survei dari data awal.','pending',?,?)").run(tomorrow, now, now);
    const tenant = { fullName: 'Pebisnis Demo', phone: '081234567890', email: 'pencari@propora.demo', businessName: 'Kopi Selasar', businessType: 'Cafe & Kedai Kopi' };
    database.prepare("INSERT INTO applications(id,listing_id,seeker_id,tenant_json,start_date,duration,offer,proposal,status,created_at,updated_at) VALUES ('seed-application-1',2,'seed-seeker-1',?,?,1,70000000,'Contoh pengajuan sewa dari data awal.','pending',?,?)").run(JSON.stringify(tenant), tomorrow, now, now);
    database.prepare('INSERT INTO messages(listing_id,seeker_id,sender_id,text,created_at) VALUES (1,?,?,?,?)').run('seed-seeker-1', 'seed-seeker-1', 'Contoh pesan: saya tertarik survei ruko Imam Bonjol.', now);
    database.prepare("INSERT INTO app_meta VALUES ('seed_version',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(seedVersion);
    database.prepare("INSERT INTO app_meta VALUES ('data_revision',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(randomUUID());
    database.exec('COMMIT');
    const legacy = path.join(directory, 'accounts.json');
    if (existsSync(legacy)) unlinkSync(legacy);
    console.log(`${reset ? 'Reset dan seed' : 'Seed'} selesai: 4 akun, 5 listing berpemilik, 5 analisis ML, 1 survei, 1 pengajuan, 1 chat.`);
  }
  console.log(`Model: ${modelVersion}`);
  console.log(accounts.map(account => `${account.role}: ${account.email}`).join('\n'));
  console.log(`Password akun demo: ${password}`);
} catch (error) {
  if (database.isTransaction) database.exec('ROLLBACK');
  console.error(error.message); process.exitCode = 1;
} finally { database.close(); }
