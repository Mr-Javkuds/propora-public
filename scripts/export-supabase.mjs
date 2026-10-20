// Export a consistent SQLite snapshot as SQL for the Supabase SQL editor.
// Custom hashes and sessions are excluded; only verified synthetic demo credentials are recreated.
import { DatabaseSync } from 'node:sqlite';
import { randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
const db = new DatabaseSync('.data/propora.sqlite', { readOnly: true });
mkdirSync('.data', { recursive: true });
const mapPath = '.data/supabase-id-map.json';
const ids = existsSync(mapPath) ? JSON.parse(readFileSync(mapPath, 'utf8').replace(/^\uFEFF/, '')) : {};
const uuid = id => ids[id] ??= /^[0-9a-f-]{36}$/i.test(id) ? id : randomUUID();
const q = value => value === null ? 'null' : typeof value === 'number' ? String(value) : `'${String(value).replaceAll("'", "''")}'`;
let sql = 'begin;\n';
db.exec('BEGIN');
for (const user of db.prepare('select * from users').all()) {
  const id = uuid(user.id);
  // Only the four synthetic seed accounts have a known demo password. Never guess real passwords.
  const demo = ['pemilik@propora.demo','pemilik2@propora.demo','pencari@propora.demo','pencari2@propora.demo'].includes(user.email)
    && timingSafeEqual(scryptSync('ProporaDemo123!',user.salt,64),Buffer.from(user.password_hash,'hex'));
  const password = demo ? "extensions.crypt('ProporaDemo123!',extensions.gen_salt('bf'))" : "''";
  sql += `insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change) values('00000000-0000-0000-0000-000000000000',${q(id)},'authenticated','authenticated',${q(user.email)},${password},${demo ? 'now()' : 'null'}, '{"provider":"email","providers":["email"]}',${q(JSON.stringify({role:user.role}))}::jsonb,now(),now(),'','','','') on conflict(id) do nothing;\n`;
  sql += `insert into auth.identities(provider_id,user_id,identity_data,provider,created_at,updated_at) values(${q(id)},${q(id)},${q(JSON.stringify({sub:id,email:user.email,email_verified:demo,phone_verified:false}))}::jsonb,'email',now(),now()) on conflict(provider_id,provider) do nothing;\n`;
}
for (const table of ['listings','listing_analyses','favorites','wizard_drafts','surveys','applications','messages']) {
  for (const row of db.prepare(`select * from ${table}`).all()) {
    for (const key of ['owner_id','user_id','seeker_id','sender_id']) if (row[key]) row[key] = uuid(row[key]);
    if (['surveys','applications'].includes(table)) row.id = uuid(row.id);
    sql += `insert into public.${table} (${Object.keys(row).join(',')}) values (${Object.values(row).map(q).join(',')}) on conflict do nothing;\n`;
  }
}
db.exec('COMMIT');
db.close();
sql += "select setval('public.listings_id_seq',coalesce((select max(id) from public.listings),1));\nselect setval('public.messages_id_seq',coalesce((select max(id) from public.messages),1));\ncommit;\n";
writeFileSync(mapPath, JSON.stringify(ids,null,2));
writeFileSync('.data/supabase-import.sql',sql);
console.log('Created .data/supabase-import.sql and stable ID map. Keep these private. Existing records are preserved on rerun; real accounts require password recovery.');
