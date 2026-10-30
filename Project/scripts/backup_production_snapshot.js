/**
 * InsightIQ AI — READ-ONLY pre-migration production snapshot.
 *
 * Exports (as the authenticated user, so RLS applies) every table the workspace migration
 * touches or depends on, the raw {userId}/meta/projects.json, and a recursive listing of the
 * user's Storage objects. Writes ONLY to local disk; performs no insert/update/delete/upload.
 * Output goes to data/local_browser_backup/pre_migration_<timestamp>/ (already git-ignored; contains PII).
 *
 * A manifest.json records row counts and SHA-256 of every file so the backup can be verified
 * (node scripts/backup_production_snapshot.js --verify <dir>).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('../node_modules/@supabase/supabase-js');

const TABLES = ['profiles', 'datasets', 'dataset_columns', 'dataset_quality', 'dataset_versions',
  'dataset_statistics', 'user_preferences', 'user_activity'];
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

async function listRecursive(client, bucket, prefix, acc = []) {
  let offset = 0;
  for (;;) {
    const { data, error } = await client.storage.from(bucket).list(prefix, { limit: 1000, offset });
    if (error) throw new Error(`storage list ${prefix}: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const e of data) {
      const full = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.id === null) await listRecursive(client, bucket, full, acc);
      else acc.push({ path: full, size: e.metadata?.size ?? null, mimetype: e.metadata?.mimetype ?? null,
        etag: e.metadata?.eTag ?? null, updated_at: e.updated_at ?? null });
    }
    if (data.length < 1000) break;
    offset += 1000;
  }
  return acc;
}

function verify(dir) {
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  let ok = true;
  for (const [file, meta] of Object.entries(manifest.files)) {
    const buf = fs.readFileSync(path.join(dir, file));
    const good = sha(buf) === meta.sha256;
    if (!good) ok = false;
    console.log(`${good ? 'OK  ' : 'BAD '} ${file} (${meta.rows ?? '-'} rows)`);
  }
  console.log(ok ? 'BACKUP VERIFIED' : 'BACKUP CORRUPT');
  process.exit(ok ? 0 : 1);
}

async function main() {
  const vi = process.argv.indexOf('--verify');
  if (vi !== -1) return verify(process.argv[vi + 1]);

  const env = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf8');
  const url = env.match(/VITE_SUPABASE_URL=(.+)/)[1].trim();
  const key = env.match(/VITE_SUPABASE_ANON_KEY=(.+)/)[1].trim();
  const root = createClient(url, key);
  const log = fs.readFileSync(path.resolve(__dirname, '../data/local_browser_backup/chrome_local_storage_leveldb/001174.log'), 'utf8');
  const rt = log.match(/"refresh_token":"([^"]+)"/)[1];
  const { data: s, error } = await root.auth.refreshSession({ refresh_token: rt });
  if (error) throw new Error('auth: ' + error.message);
  const uid = s.session.user.id;
  const c = createClient(url, key, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${s.session.access_token}` } } });

  const dir = path.resolve(__dirname, `../data/local_browser_backup/pre_migration_${new Date().toISOString().replace(/[:.]/g, '-')}`);
  fs.mkdirSync(dir, { recursive: true });
  const files = {};
  const put = (name, obj, rows) => {
    const buf = Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2), 'utf8');
    fs.writeFileSync(path.join(dir, name), buf);
    files[name] = { sha256: sha(buf), bytes: buf.length, rows };
    console.log(`  saved ${name} (${rows ?? '-'} rows)`);
  };

  for (const t of TABLES) {
    const all = []; let from = 0;
    for (;;) {
      const { data, error: e } = await c.from(t).select('*').order('id', { ascending: true }).range(from, from + 999);
      if (e) { console.log(`  skip ${t}: ${e.code} ${e.message}`); break; }
      all.push(...data); if (data.length < 1000) { put(`${t}.json`, all, all.length); break; } from += 1000;
    }
  }
  const { data: blob, error: be } = await c.storage.from('datasets').download(`${uid}/meta/projects.json`);
  if (be || !blob) throw new Error('projects.json download failed: ' + (be && be.message));
  const raw = await blob.text();
  put('projects.json', raw, JSON.parse(raw).length);
  const objs = await listRecursive(c, 'datasets', uid);
  put('storage_objects_datasets.json', objs, objs.length);

  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ created_at: new Date().toISOString(), user_id: uid, files }, null, 2));
  console.log(`\nSnapshot written to ${dir}\nRe-verify with: node scripts/backup_production_snapshot.js --verify "${dir}"`);
}

main().catch((e) => { console.error('[snapshot error]', e.message); process.exit(1); });

