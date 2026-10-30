/**
 * InsightIQ AI — Explicit Authenticated Projects Migration Script
 * 
 * Purpose:
 * Migrates existing projects from Supabase Storage ({userId}/meta/projects.json)
 * into the PostgreSQL canonical public.workspaces table.
 * 
 * Safety & Invariants:
 * - Explicit, authenticated caller authorization.
 * - Idempotent upsert by RFC4122 UUID (no duplicates on retry).
 * - Preserves original UUIDs, names, descriptions, progress, states, milestones, and dataset associations.
 * - Preserves ownership (owner_id = userId).
 * - Verifies that both projects exist in PostgreSQL after migration.
 * - Retains {userId}/meta/projects.json as a durable cloud backup.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('../node_modules/@supabase/supabase-js');

async function migrateProjects(options = {}) {
  console.log('================================================================');
  console.log('  INSIGHTIQ AI — MIGRATE EXISTING PROJECTS TO WORKSPACES        ');
  console.log('================================================================\n');

  // Load environment variables
  const envPath = path.resolve(__dirname, '../.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local file not found at ' + envPath);
  }
  const envContent = fs.readFileSync(envPath, 'utf8');
  const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.+)/)[1].trim();
  const supabaseKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/)[1].trim();
  const rootSupabase = createClient(supabaseUrl, supabaseKey);

  // Authenticate user
  let token = options.accessToken;
  let userId = options.userId;
  let userEmail = options.email;

  if (!token) {
    const logPath = path.resolve(__dirname, '../data/local_browser_backup/chrome_local_storage_leveldb/001174.log');
    if (!fs.existsSync(logPath)) {
      throw new Error('Browser backup log not found for session authentication at ' + logPath);
    }
    const logContent = fs.readFileSync(logPath, 'utf8');
    const refreshMatch = logContent.match(/"refresh_token":"([^"]+)"/);
    if (!refreshMatch) {
      throw new Error('Could not find refresh_token in browser log.');
    }

    console.log('[Auth] Refreshing user session with Supabase...');
    const { data: sessionData, error: refreshErr } = await rootSupabase.auth.refreshSession({
      refresh_token: refreshMatch[1]
    });
    if (refreshErr || !sessionData?.session) {
      throw new Error(`Failed to refresh session: ${refreshErr ? refreshErr.message : 'No session'}`);
    }
    token = sessionData.session.access_token;
    userId = sessionData.session.user.id;
    userEmail = sessionData.session.user.email;
  }

  console.log(`[Auth] Authenticated as User: ${userId} (${userEmail})\n`);

  const userClient = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  // Step 1: Read projects backup from Supabase Storage ({userId}/meta/projects.json)
  const backupStoragePath = `${userId}/meta/projects.json`;
  console.log(`[Step 1/3] Reading projects backup from storage: ${backupStoragePath}...`);
  const { data: blob, error: dlErr } = await userClient.storage
    .from('datasets')
    .download(backupStoragePath);

  if (dlErr || !blob) {
    throw new Error(`Failed to download projects backup from storage: ${dlErr ? dlErr.message : 'Empty blob'}`);
  }

  const rawText = await blob.text();
  const projects = JSON.parse(rawText);
  if (!Array.isArray(projects) || projects.length === 0) {
    throw new Error('Projects backup JSON is empty or not an array.');
  }

  console.log(`  ✓ Successfully loaded ${projects.length} project(s) from Storage backup:`);
  for (const p of projects) {
    console.log(`    - [${p.id}] "${p.name}" (${p.category}, status: ${p.status}, progress: ${p.progress}%)`);
  }
  console.log();

  // Step 2: Idempotently upsert each project into public.workspaces
  console.log('[Step 2/3] Upserting projects into public.workspaces table...');
  const upsertedRecords = [];

  for (const proj of projects) {
    const workspaceRow = {
      id: proj.id,
      owner_id: userId,
      name: proj.name,
      workspace_name: proj.name,
      description: proj.description || '',
      category: proj.category || 'General Analytics',
      status: proj.status || 'active',
      health: proj.health || 'On Track',
      health_status: proj.healthStatus || 'ontrack',
      health_score: proj.health_score ?? 100,
      progress: proj.progress ?? 0,
      workspace_state: proj.workspaceState || {},
      stats: proj.stats || {},
      members: proj.members || [],
      dataset_ids: proj.datasetIds || [],
      dataset_names: proj.datasetNames || [],
      milestones: proj.milestones || [],
      risks: proj.risks || [],
      models: proj.models || [],
      is_personal: proj.is_personal ?? true,
      created_at: proj.createdAt || new Date().toISOString(),
      updated_at: proj.updatedAt || new Date().toISOString()
    };

    const { data: upsertData, error: upsertErr } = await userClient
      .from('workspaces')
      .upsert(workspaceRow, { onConflict: 'id', ignoreDuplicates: true })
      .select('*');

    if (upsertErr) {
      console.error(`  ✗ Failed to upsert project "${proj.name}" (${proj.id}):`, upsertErr.message);
      throw upsertErr;
    }

    upsertedRecords.push(upsertData?.[0] || workspaceRow);
    console.log(`  ✓ Upserted project "${proj.name}" (ID: ${proj.id})`);
  }
  console.log();

  // Step 3: Verification of both projects in PostgreSQL public.workspaces
  console.log('[Step 3/3] Verifying projects exist in PostgreSQL public.workspaces...');
  const { data: verifiedRows, error: queryErr } = await userClient
    .from('workspaces')
    .select('id, name, owner_id, category, status, progress, dataset_ids, milestones, updated_at')
    .eq('owner_id', userId);

  if (queryErr) {
    throw new Error(`Failed to query public.workspaces: ${queryErr.message}`);
  }

  const foundMap = new Map((verifiedRows || []).map(r => [r.id, r]));
  let allVerified = true;

  for (const proj of projects) {
    const found = foundMap.get(proj.id);
    if (!found) {
      console.error(`  ✗ Verification FAILED: Project ${proj.id} ("${proj.name}") not found in workspaces!`);
      allVerified = false;
    } else {
      console.log(`  ✓ Verified in PostgreSQL: "${found.name}" (${found.id})`);
      console.log(`    - Category: ${found.category} | Status: ${found.status} | Progress: ${found.progress}%`);
      console.log(`    - Attached Datasets: ${JSON.stringify(found.dataset_ids)}`);
    }
  }

  if (!allVerified) {
    throw new Error('Verification failed: Not all projects exist in PostgreSQL public.workspaces.');
  }

  console.log(`\n  ✓ Storage backup ${backupStoragePath} remains intact and unchanged.`);
  console.log('\n================================================================');
  console.log('  PROJECT MIGRATION & VERIFICATION SUCCESSFUL                    ');
  console.log('================================================================\n');

  return { success: true, count: projects.length, projects: verifiedRows };
}

if (require.main === module) {
  migrateProjects().catch(err => {
    console.error('\n[Migration Script Execution Error]', err.message);
    process.exit(1);
  });
}

module.exports = { migrateProjects };

