/**
 * InsightIQ AI — Production Backup & Snapshot Utility
 *
 * Purpose:
 * Performs an authenticated, non-destructive, read-only backup of all database tables,
 * storage metadata, project definitions ({userId}/meta/projects.json), and physical dataset
 * payload files from Supabase Storage.
 *
 * Safety & Security Guarantees:
 * - READ-ONLY: Never executes INSERT, UPDATE, DELETE, or DROP against production.
 * - SAFE AUTHENTICATION: Never scrapes browser logs or LevelDB files.
 * - Accepts short-lived explicit session tokens via `--token <token>` or `SUPABASE_ACCESS_TOKEN` env var,
 *   or service role key via `--service-key <key>` or `SUPABASE_SERVICE_ROLE_KEY`.
 * - Never logs, prints, or persists credentials to console, log files, or version control.
 * - Computes SHA-256 hashes for all database records, project JSON, and storage payloads.
 * - Generates a verifiable `manifest.json` containing row counts, byte sizes, storage paths, and SHA-256 hashes.
 * - Supports instant cryptographic verification via `node scripts/backup_production_snapshot.js --verify <dir>`.
 *
 * Usage:
 *   # Safe token-based backup (recommended for production snapshot)
 *   SUPABASE_ACCESS_TOKEN="<token>" node scripts/backup_production_snapshot.js
 *   # Or via explicit CLI argument:
 *   node scripts/backup_production_snapshot.js --token "<token>"
 *   # Verification:
 *   node scripts/backup_production_snapshot.js --verify "data/local_browser_backup/pre_migration_<timestamp>"
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('../node_modules/@supabase/supabase-js');

const TABLES = [
  'profiles',
  'datasets',
  'dataset_columns',
  'dataset_quality',
  'dataset_versions',
  'dataset_statistics',
  'user_preferences',
  'user_activity',
  'workspaces'
];

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

/**
 * Recursively list all storage objects under a bucket prefix
 */
async function listStorageRecursive(client, bucket, prefix = '', acc = []) {
  let offset = 0;
  for (;;) {
    const { data, error } = await client.storage.from(bucket).list(prefix, { limit: 1000, offset });
    if (error) {
      console.warn(`[Storage List Warning] prefix "${prefix}": ${error.message}`);
      break;
    }
    if (!data || data.length === 0) break;
    for (const item of data) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) {
        await listStorageRecursive(client, bucket, fullPath, acc);
      } else {
        acc.push({
          path: fullPath,
          size: item.metadata?.size ?? item.size ?? null,
          mimetype: item.metadata?.mimetype ?? null,
          etag: item.metadata?.eTag ?? null,
          updated_at: item.updated_at ?? null
        });
      }
    }
    if (data.length < 1000) break;
    offset += 1000;
  }
  return acc;
}

/**
 * Verify a previously generated backup snapshot against its manifest
 */
function verifySnapshot(targetDir) {
  const manifestPath = path.join(targetDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error(`[Verification Error] manifest.json not found in ${targetDir}`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  console.log('================================================================');
  console.log(`  VERIFYING BACKUP SNAPSHOT: ${path.basename(targetDir)}`);
  console.log(`  Created At: ${manifest.created_at}`);
  console.log(`  User ID:    ${manifest.user_id || 'N/A'}`);
  console.log('================================================================\n');

  let allValid = true;
  let fileCount = 0;

  for (const [relPath, meta] of Object.entries(manifest.files)) {
    fileCount++;
    const fullFilePath = path.join(targetDir, relPath);
    if (!fs.existsSync(fullFilePath)) {
      console.error(`  ✗ MISSING: ${relPath}`);
      allValid = false;
      continue;
    }

    const fileBuf = fs.readFileSync(fullFilePath);
    const actualHash = sha256(fileBuf);
    const hashMatch = actualHash === meta.sha256;
    const sizeMatch = fileBuf.length === meta.bytes;

    if (hashMatch && sizeMatch) {
      const rowInfo = meta.rows !== undefined && meta.rows !== null ? ` (${meta.rows} rows)` : '';
      const sizeInfo = ` [${(meta.bytes / 1024).toFixed(1)} KB]`;
      console.log(`  ✓ OK   ${relPath}${rowInfo}${sizeInfo}`);
    } else {
      console.error(`  ✗ CORRUPT: ${relPath} (expected sha256: ${meta.sha256.slice(0, 10)}..., actual: ${actualHash.slice(0, 10)}...)`);
      allValid = false;
    }
  }

  console.log('\n----------------------------------------------------------------');
  if (allValid) {
    console.log(`  ✓ ALL ${fileCount} FILES VERIFIED: BACKUP IS CRYPTOGRAPHICALLY VALID`);
    console.log('----------------------------------------------------------------\n');
    return true;
  } else {
    console.error(`  ✗ BACKUP VERIFICATION FAILED: INTEGRITY MISMATCH DETECTED`);
    console.log('----------------------------------------------------------------\n');
    process.exit(1);
  }
}

/**
 * Main snapshot execution
 */
async function main() {
  const verifyArgIndex = process.argv.indexOf('--verify');
  if (verifyArgIndex !== -1) {
    const dirToVerify = process.argv[verifyArgIndex + 1];
    if (!dirToVerify) {
      console.error('Usage: node scripts/backup_production_snapshot.js --verify <directory>');
      process.exit(1);
    }
    verifySnapshot(path.resolve(dirToVerify));
    return;
  }

  // Load environment variables
  const envPath = path.resolve(__dirname, '../.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local file not found at ' + envPath);
  }
  const envContent = fs.readFileSync(envPath, 'utf8');
  const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)/);
  const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/);

  if (!urlMatch || !keyMatch) {
    throw new Error('Supabase URL or Anon Key missing from .env.local');
  }

  const supabaseUrl = urlMatch[1].trim();
  const supabaseAnonKey = keyMatch[1].trim();

  // Parse credentials from CLI flags or environment variables
  let token = process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_AUTH_TOKEN || null;
  let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || null;
  let explicitUserId = process.env.SUPABASE_USER_ID || null;

  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '--token' && process.argv[i + 1]) {
      token = process.argv[i + 1];
      i++;
    } else if (process.argv[i] === '--service-key' && process.argv[i + 1]) {
      serviceKey = process.argv[i + 1];
      i++;
    } else if (process.argv[i] === '--user-id' && process.argv[i + 1]) {
      explicitUserId = process.argv[i + 1];
      i++;
    }
  }

  if (!token && !serviceKey) {
    console.error('\n================================================================');
    console.error('  SAFE AUTHENTICATION REQUIRED');
    console.error('================================================================');
    console.error('No session token or service key was provided.');
    console.error('For security, automated scraping of browser logs and LevelDB is disabled.\n');
    console.error('Please provide a short-lived token using either:');
    console.error('  1. Environment variable: SUPABASE_ACCESS_TOKEN="<token>" node scripts/backup_production_snapshot.js');
    console.error('  2. CLI argument:         node scripts/backup_production_snapshot.js --token "<token>"');
    console.error('  3. Service Role Key:     SUPABASE_SERVICE_ROLE_KEY="<key>" node scripts/backup_production_snapshot.js\n');
    console.error('Never commit tokens or write them to persistent unencrypted log files.');
    console.error('================================================================\n');
    process.exit(1);
  }

  let client;
  let userId = explicitUserId;

  if (serviceKey) {
    client = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    if (!userId) {
      userId = '051cf8bc-5891-4040-b04d-6954825bdbc2'; // Canonical Data Analyst owner
    }
    console.log(`[Auth] Using Service Role Key. Target User: ${userId}`);
  } else {
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: userData, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      throw new Error(`Authentication token invalid or expired: ${userErr ? userErr.message : 'Unknown user'}`);
    }
    userId = userData.user.id;
    client = authClient;
    console.log(`[Auth] Authenticated as User: ${userId}`);
  }

  // Create timestamped snapshot directory inside data/local_browser_backup (git-ignored)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const snapshotDir = path.resolve(__dirname, `../data/local_browser_backup/pre_migration_${timestamp}`);
  fs.mkdirSync(snapshotDir, { recursive: true });

  const manifest = {
    created_at: new Date().toISOString(),
    user_id: userId,
    files: {},
    dataset_summary: {
      records_count: 0,
      storage_files_downloaded: 0,
      storage_files_missing: 0
    }
  };

  const saveFile = (relName, content, rows = null, extraMeta = {}) => {
    const buf = Buffer.isBuffer(content)
      ? content
      : Buffer.from(typeof content === 'string' ? content : JSON.stringify(content, null, 2), 'utf8');
    const fullPath = path.join(snapshotDir, relName);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, buf);

    manifest.files[relName] = {
      sha256: sha256(buf),
      bytes: buf.length,
      rows: rows,
      ...extraMeta
    };
    console.log(`  ✓ Saved ${relName} (${rows !== null ? `${rows} rows, ` : ''}${(buf.length / 1024).toFixed(1)} KB)`);
  };

  console.log(`\n[Step 1/4] Dumping database tables for user ${userId}...`);
  let datasetRows = [];

  for (const table of TABLES) {
    const rows = [];
    let from = 0;
    const batchSize = 1000;

    for (;;) {
      let query = client.from(table).select('*').range(from, from + batchSize - 1);
      // Attempt ordering if id column exists
      try { query = query.order('id', { ascending: true }); } catch (_) {}

      const { data, error } = await query;
      if (error) {
        console.log(`  ℹ Table public.${table} skipped or not queryable: ${error.message}`);
        break;
      }
      rows.push(...(data || []));
      if (!data || data.length < batchSize) break;
      from += batchSize;
    }

    if (rows.length > 0 || table === 'datasets' || table === 'profiles') {
      saveFile(`${table}.json`, rows, rows.length, { type: 'table_dump', table });
      if (table === 'datasets') {
        datasetRows = rows;
      }
    }
  }

  manifest.dataset_summary.records_count = datasetRows.length;

  console.log(`\n[Step 2/4] Downloading project metadata from Storage...`);
  const projectStoragePath = `${userId}/meta/projects.json`;
  const { data: projectBlob, error: projectErr } = await client.storage
    .from('datasets')
    .download(projectStoragePath);

  if (projectBlob) {
    const projectText = await projectBlob.text();
    const parsedProjects = JSON.parse(projectText);
    saveFile('projects.json', projectText, Array.isArray(parsedProjects) ? parsedProjects.length : 1, {
      type: 'projects_metadata',
      storage_path: projectStoragePath
    });
  } else {
    console.warn(`  ℹ Project metadata ${projectStoragePath} not found in storage: ${projectErr?.message}`);
  }

  console.log(`\n[Step 3/4] Listing all storage objects in "datasets" bucket...`);
  const userObjects = await listStorageRecursive(client, 'datasets', userId);
  saveFile('storage_objects_datasets.json', userObjects, userObjects.length, {
    type: 'storage_catalog',
    bucket: 'datasets'
  });

  console.log(`\n[Step 4/4] Preserving physical dataset files from Storage...`);
  for (const ds of datasetRows) {
    if (!ds.storage_path) {
      console.log(`  ℹ Dataset "${ds.name}" (${ds.id}) has no storage_path. Skipping payload download.`);
      continue;
    }

    const { data: fileBlob, error: fileErr } = await client.storage
      .from('datasets')
      .download(ds.storage_path);

    if (fileErr || !fileBlob) {
      console.warn(`  ⚠ Dataset file missing from storage for "${ds.name}": ${ds.storage_path} (${fileErr?.message || 'Empty payload'})`);
      manifest.dataset_summary.storage_files_missing++;
      continue;
    }

    const arrayBuf = await fileBlob.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuf);
    const relDest = path.join('storage_files', ds.storage_path);

    saveFile(relDest, fileBuffer, null, {
      type: 'storage_payload',
      storage_path: ds.storage_path,
      dataset_id: ds.id,
      dataset_name: ds.name,
      file_size: fileBuffer.length
    });
    manifest.dataset_summary.storage_files_downloaded++;
  }

  // Write finalized manifest.json
  const manifestBuf = Buffer.from(JSON.stringify(manifest, null, 2), 'utf8');
  fs.writeFileSync(path.join(snapshotDir, 'manifest.json'), manifestBuf);
  console.log(`\n  ✓ Wrote manifest.json with ${Object.keys(manifest.files).length} files recorded.`);

  console.log('\n================================================================');
  console.log('  PRODUCTION SNAPSHOT COMPLETE');
  console.log(`  Snapshot Directory: ${snapshotDir}`);
  console.log('  To verify snapshot:');
  console.log(`  node scripts/backup_production_snapshot.js --verify "${snapshotDir}"`);
  console.log('================================================================\n');
}

if (require.main === module) {
  main().catch((err) => {
    console.error('\n[Snapshot Error]', err.message);
    process.exit(1);
  });
}

module.exports = {
  verifySnapshot,
  listStorageRecursive,
  sha256
};
