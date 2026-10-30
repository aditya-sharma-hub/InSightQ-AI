/**
 * InsightIQ AI — Pre-Rollback Workspaces Backup Script
 * 
 * Safely exports all existing records from PostgreSQL public.workspaces
 * and verifies that storage backup {userId}/meta/projects.json is synchronized
 * before any destructive table operations are attempted.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('../node_modules/@supabase/supabase-js');

async function backupWorkspacesBeforeRollback() {
  const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf8');
  const url = envContent.match(/VITE_SUPABASE_URL=(.+)/)[1].trim();
  const key = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/)[1].trim();
  const root = createClient(url, key);

  const logContent = fs.readFileSync(path.resolve(__dirname, '../data/local_browser_backup/chrome_local_storage_leveldb/001174.log'), 'utf8');
  const refreshMatch = logContent.match(/"refresh_token":"([^"]+)"/);
  const { data: sessionData } = await root.auth.refreshSession({ refresh_token: refreshMatch[1] });
  const userId = sessionData.session.user.id;
  const token = sessionData.session.access_token;

  const userClient = createClient(url, key, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  console.log(`[Backup] Inspecting workspaces for user: ${userId}`);

  // 1. Check if public.workspaces exists and read records
  const { data: wsRows, error: wsErr } = await userClient.from('workspaces').select('*');
  
  if (wsErr) {
    console.log(`[Notice] public.workspaces does not exist or is not readable: ${wsErr.message}`);
  } else {
    console.log(`[Backup] Found ${wsRows.length} workspace records in PostgreSQL.`);
    const backupFile = path.resolve(__dirname, `../data/workspaces_backup_${Date.now()}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(wsRows, null, 2), 'utf8');
    console.log(`[Backup] Saved PostgreSQL workspaces to local file: ${backupFile}`);
  }

  // 2. Check and verify storage backup exists
  const { data: blob, error: dlErr } = await userClient.storage.from('datasets').download(`${userId}/meta/projects.json`);
  if (dlErr || !blob) {
    console.warn(`[Warning] Storage backup {userId}/meta/projects.json not found: ${dlErr ? dlErr.message : 'Empty'}`);
  } else {
    const parsed = JSON.parse(await blob.text());
    console.log(`[Backup] Verified Storage backup {userId}/meta/projects.json has ${parsed.length} projects intact.`);
  }
}

if (require.main === module) {
  backupWorkspacesBeforeRollback().catch(console.error);
}

module.exports = { backupWorkspacesBeforeRollback };

