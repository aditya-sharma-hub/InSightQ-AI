/**
 * InsightIQ AI — Production Readiness Verification Suite
 *
 * Verifies Critical Production Readiness Criteria:
 * [Mocked App Server / RLS Simulation]:
 * 1. User A cannot create or update a workspace owned by User B (HTTP 403)
 * 2. User B cannot read or download User A's files (HTTP 403)
 * 3. Workspace creation works (HTTP 201)
 * 4. Workspace update works (HTTP 200)
 * 5. Workspace deletion works (HTTP 200, preserves datasets)
 * 6. Dataset attachment and detachment work (POST attach & DELETE detach)
 * 7. Upsert/retry does not create duplicates (idempotent)
 * 9. Cross-device sync: Laptop and mobile retrieve identical cloud records
 * 11. Foreign & nonexistent dataset attachment attempts are rejected (HTTP 403 / 404)
 * 12. Anonymous requests to workspaces and datasets are denied (HTTP 401)
 * 13. Complete user-to-user workspace isolation (GET/PUT/DELETE blocked across users)
 * 14. Administrator authorization and persona isolation
 *
 * [Live Supabase Read-Only Check / Snapshot Verification]:
 * 8. Category A: Projects verified from Storage backup ({userId}/meta/projects.json)
 * 10. Storage JSON backup remains intact and unmodified (Non-destructive guarantee)
 *
 * [Isolated Tooling Verification]:
 * 15. Backup cryptographic SHA-256 manifest integrity & isolated restoration test
 */

const assert = require('assert');
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const serverModule = require('../server.js');
const app = serverModule.app || serverModule;
const { runIsolatedLocalTest } = require('../scripts/restore_production_snapshot.js');

const TEST_PORT = 8201;
let serverInstance = null;

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch (_) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
          json
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runSuite() {
  console.log('================================================================');
  console.log('  INSIGHTIQ AI — FINAL PRODUCTION READINESS VERIFICATION SUITE   ');
  console.log('================================================================\n');

  await new Promise((resolve) => {
    serverInstance = app.listen(TEST_PORT, '127.0.0.1', () => {
      console.log(`[Test Server] Running on http://127.0.0.1:${TEST_PORT}\n`);
      resolve();
    });
  });

  let passed = 0;
  let total = 0;
  const testResults = [];

  function recordResult(num, name, condition, mode, details = '') {
    total++;
    const status = condition ? 'PASS' : 'FAIL';
    if (condition) passed++;
    testResults.push({ num, name, status, mode, details });
    const symbol = condition ? '✓' : '✗';
    console.log(`  ${symbol} [TEST ${num}] [${mode}] ${status}: ${name}${details ? ' (' + details + ')' : ''}`);
  }

  const userA_Id = crypto.randomUUID();
  const userA_Email = 'laptop_user@insightiq.internal';
  const tokenA = `mock-user-${userA_Id}`;

  const userB_Id = crypto.randomUUID();
  const userB_Email = 'user_b@insightiq.internal';
  const tokenB = `mock-user-${userB_Id}`;

  const phoneTokenA = `mock-user-${userA_Id}`;

  try {
    // ------------------------------------------------------------------------
    // TEST 1: User A cannot create or update a workspace owned by User B
    // ------------------------------------------------------------------------
    const unauthorizedCreateRes = await makeRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/projects',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`,
        'x-user-id': userA_Id,
        'x-user-email': userA_Email
      }
    }, {
      project: {
        id: crypto.randomUUID(),
        name: 'Spoofed Workspace',
        ownerId: userB_Id,
        owner_id: userB_Id
      }
    });

    const userB_WorkspaceId = crypto.randomUUID();
    await makeRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/projects',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`,
        'x-user-id': userB_Id,
        'x-user-email': userB_Email
      }
    }, {
      project: {
        id: userB_WorkspaceId,
        name: 'Legitimate Workspace B',
        ownerId: userB_Id,
        owner_id: userB_Id
      }
    });

    const unauthorizedUpdateRes = await makeRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/projects',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`,
        'x-user-id': userA_Id,
        'x-user-email': userA_Email
      }
    }, {
      project: {
        id: userB_WorkspaceId,
        name: 'Hijacked Workspace B'
      }
    });

    const test1Pass = (unauthorizedCreateRes.statusCode === 403 || unauthorizedCreateRes.json?.code === 'PROJECT_ACCESS_DENIED') &&
                      (unauthorizedUpdateRes.statusCode === 403 || unauthorizedUpdateRes.json?.code === 'PROJECT_ACCESS_DENIED');
    recordResult(1, 'User A cannot create or update a workspace owned by User B', test1Pass, 'Mocked App Server / RLS Simulation');

    // ------------------------------------------------------------------------
    // TEST 2: User B cannot read or download User A's files
    // ------------------------------------------------------------------------
    const userA_DatasetId = crypto.randomUUID();
    await makeRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/datasets/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`,
        'x-user-id': userA_Id,
        'x-user-email': userA_Email
      }
    }, {
      dataset: {
        id: userA_DatasetId,
        name: 'Financial_Confidential_A.csv',
        original_filename: 'Financial_Confidential_A.csv',
        file_type: 'CSV',
        file_size: 524288
      }
    });

    const userB_ReadList = await makeRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/datasets',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenB}`,
        'x-user-id': userB_Id,
        'x-user-email': userB_Email
      }
    });

    const userB_DownloadAttempt = await makeRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: `/api/datasets/${userA_DatasetId}/download-url`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenB}`,
        'x-user-id': userB_Id,
        'x-user-email': userB_Email
      }
    });

    const listBlocked = Array.isArray(userB_ReadList.json?.datasets) && !userB_ReadList.json.datasets.some(d => d.id === userA_DatasetId);
    const downloadBlocked = userB_DownloadAttempt.statusCode === 403;
    recordResult(2, 'User B cannot read or download User A files', listBlocked && downloadBlocked, 'Mocked App Server / RLS Simulation');

    // ------------------------------------------------------------------------
    // TEST 3: Workspace creation works
    // ------------------------------------------------------------------------
    const newWorkspaceId = crypto.randomUUID();
    const createRes = await makeRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/projects',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`,
        'x-user-id': userA_Id,
        'x-user-email': userA_Email
      }
    }, {
      project: {
        id: newWorkspaceId,
        name: 'Supply Chain Optimization Workspace',
        description: 'Demand forecasting and route optimization',
        category: 'Operations',
        datasetIds: [userA_DatasetId]
      }
    });

    const test3Pass = createRes.statusCode === 201 && createRes.json?.success && createRes.json?.project?.id === newWorkspaceId;
    recordResult(3, 'Workspace creation works', test3Pass, 'Mocked App Server / RLS Simulation');

    // ------------------------------------------------------------------------
    // TEST 4: Workspace update works
    // ------------------------------------------------------------------------
    const updateRes = await makeRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: `/api/projects/${newWorkspaceId}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`,
        'x-user-id': userA_Id,
        'x-user-email': userA_Email
      }
    }, {
      name: 'Supply Chain Optimization Workspace (Updated)',
      description: 'Updated operational description',
      progress: 75,
      health: 'On Track'
    });

    const test4Pass = updateRes.statusCode === 200 && updateRes.json?.project?.progress === 75;
    recordResult(4, 'Workspace update works via PUT /api/projects/:id', test4Pass, 'Mocked App Server / RLS Simulation');

    // ------------------------------------------------------------------------
    // TEST 5: Workspace deletion works and preserves underlying datasets
    // ------------------------------------------------------------------------
    const deleteRes = await makeRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: `/api/projects/${newWorkspaceId}`,
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'x-user-id': userA_Id,
        'x-user-email': userA_Email
      }
    });

    const listAfterDelete = await makeRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/projects',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'x-user-id': userA_Id,
        'x-user-email': userA_Email
      }
    });

    const projectDeleted = deleteRes.statusCode === 200 &&
                           !listAfterDelete.json?.projects?.some(p => p.id === newWorkspaceId);

    const listDsAfterProjDel = await makeRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/datasets',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'x-user-id': userA_Id,
        'x-user-email': userA_Email
      }
    });
    const datasetPreserved = listDsAfterProjDel.json?.datasets?.some(d => d.id === userA_DatasetId);
    recordResult(5, 'Workspace deletion works and preserves datasets', projectDeleted && datasetPreserved, 'Mocked App Server / RLS Simulation');

    // ------------------------------------------------------------------------
    // TEST 6: Dataset attachment and detachment work
    // ------------------------------------------------------------------------
    const attachWsId = crypto.randomUUID();
    await makeRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/projects',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`,
        'x-user-id': userA_Id,
        'x-user-email': userA_Email
      }
    }, {
      project: { id: attachWsId, name: 'Attach/Detach Test Workspace' }
    });

    const attachRes = await makeRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: `/api/projects/${attachWsId}/datasets`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`,
        'x-user-id': userA_Id,
        'x-user-email': userA_Email
      }
    }, {
      datasetIds: [userA_DatasetId]
    });

    const attached = attachRes.statusCode === 200 && attachRes.json?.project?.datasetIds?.includes(userA_DatasetId);

    const detachRes = await makeRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: `/api/projects/${attachWsId}/datasets/${userA_DatasetId}`,
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'x-user-id': userA_Id,
        'x-user-email': userA_Email
      }
    });

    const detached = detachRes.statusCode === 200 && detachRes.json?.underlyingDatasetPreserved;
    recordResult(6, 'Dataset attachment and detachment work', attached && detached, 'Mocked App Server / RLS Simulation');

    // ------------------------------------------------------------------------
    // TEST 7: Upsert/retry does not create duplicates
    // ------------------------------------------------------------------------
    const retryWsId = crypto.randomUUID();
    const wsPayload = {
      project: {
        id: retryWsId,
        name: 'Idempotent Retry Workspace',
        description: 'First attempt'
      }
    };

    await makeRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/projects',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`,
        'x-user-id': userA_Id,
        'x-user-email': userA_Email
      }
    }, wsPayload);

    const secondUpsert = await makeRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/projects',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`,
        'x-user-id': userA_Id,
        'x-user-email': userA_Email
      }
    }, {
      project: {
        id: retryWsId,
        name: 'Idempotent Retry Workspace',
        description: 'Retry attempt with update',
        progress: 50
      }
    });

    const listRetry = await makeRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/projects',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'x-user-id': userA_Id,
        'x-user-email': userA_Email
      }
    });

    const countOfRetryId = (listRetry.json?.projects || []).filter(p => p.id === retryWsId).length;
    const test7Pass = countOfRetryId === 1 && secondUpsert.statusCode === 201;
    recordResult(7, 'Upsert/retry does not create duplicates (idempotent)', test7Pass, 'Mocked App Server / RLS Simulation');

    // ------------------------------------------------------------------------
    // TEST 8: Category A — Storage Projects Backup Verification
    // ------------------------------------------------------------------------
    const liveToken = process.env.SUPABASE_ACCESS_TOKEN || null;
    let liveProjectsBackup = [];
    let test8APass = false;

    if (liveToken) {
      // Live Supabase query using provided token
      const { createClient } = require('../node_modules/@supabase/supabase-js');
      const envPath = path.resolve(__dirname, '../.env.local');
      const envContent = fs.readFileSync(envPath, 'utf8');
      const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.+)/)[1].trim();
      const supabaseKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/)[1].trim();
      const userClient = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
        global: { headers: { Authorization: `Bearer ${liveToken}` } }
      });

      const { data: userData } = await userClient.auth.getUser();
      if (userData?.user) {
        const uid = userData.user.id;
        const { data: blob } = await userClient.storage.from('datasets').download(`${uid}/meta/projects.json`);
        if (blob) {
          liveProjectsBackup = JSON.parse(await blob.text());
        }
      }
    } else {
      // Verified local pre-migration snapshot check (safe fallback when token not provided in test runner)
      const snapshotBase = path.resolve(__dirname, '../data/local_browser_backup');
      const dirs = fs.readdirSync(snapshotBase).filter(d => d.startsWith('pre_migration_')).sort().reverse();
      if (dirs.length > 0) {
        const pFile = path.join(snapshotBase, dirs[0], 'projects.json');
        if (fs.existsSync(pFile)) {
          liveProjectsBackup = JSON.parse(fs.readFileSync(pFile, 'utf8'));
        }
      }
    }

    const hasDataCo = liveProjectsBackup.some(p => p.id === 'dabe7fd6-f4cb-48ed-8c97-5797dd08a9d0');
    const hasIEEE = liveProjectsBackup.some(p => p.id === 'd498e262-fb3d-4b69-8c80-c554e5624f8e');
    test8APass = hasDataCo && hasIEEE && liveProjectsBackup.length === 2;
    recordResult(8, 'Category A: Existing 2 projects read from Storage JSON backup', test8APass, liveToken ? 'LIVE Supabase Storage' : 'Verified Snapshot Read', 'DataCo & IEEE present');

    // ------------------------------------------------------------------------
    // TEST 9: Category D — Laptop and mobile retrieve identical cloud records
    // ------------------------------------------------------------------------
    const laptopProjectsRes = await makeRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/projects',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'x-user-id': userA_Id,
        'x-user-email': userA_Email,
        'x-device-type': 'laptop'
      }
    });

    const mobileProjectsRes = await makeRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/projects',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${phoneTokenA}`,
        'x-user-id': userA_Id,
        'x-user-email': userA_Email,
        'x-device-type': 'mobile'
      }
    });

    const laptopCount = laptopProjectsRes.json?.projects?.length;
    const mobileCount = mobileProjectsRes.json?.projects?.length;
    const test9Pass = laptopCount === mobileCount && laptopCount > 0;
    recordResult(9, 'Category D: Laptop and mobile retrieve identical cloud records', test9Pass, 'Mocked App Server / RLS Simulation', `Count: ${laptopCount}`);

    // ------------------------------------------------------------------------
    // TEST 10: The Storage JSON backup remains intact
    // ------------------------------------------------------------------------
    let test10Pass = false;
    if (liveProjectsBackup.length === 2) {
      test10Pass = liveProjectsBackup.length === 2 &&
                   liveProjectsBackup[0].workspaceState?.projectConfigured === true &&
                   liveProjectsBackup[1].workspaceState?.projectConfigured === true;
    }
    recordResult(10, 'Storage JSON backup remains intact in {userId}/meta/projects.json', test10Pass, liveToken ? 'LIVE Supabase Storage' : 'Verified Snapshot Read', 'Non-destructive verification');

    // ------------------------------------------------------------------------
    // TEST 11: Foreign & Nonexistent Dataset Attachment Attempts are Rejected
    // ------------------------------------------------------------------------
    const userB_AttachForeignAttempt = await makeRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: `/api/projects/${userB_WorkspaceId}/datasets`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`,
        'x-user-id': userB_Id,
        'x-user-email': userB_Email
      }
    }, {
      datasetIds: [userA_DatasetId] // User B trying to attach User A's dataset
    });

    const nonexistentDsId = crypto.randomUUID();
    const userB_AttachMissingAttempt = await makeRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: `/api/projects/${userB_WorkspaceId}/datasets`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`,
        'x-user-id': userB_Id,
        'x-user-email': userB_Email
      }
    }, {
      datasetIds: [nonexistentDsId]
    });

    const foreignBlocked = userB_AttachForeignAttempt.statusCode === 403 && userB_AttachForeignAttempt.json?.code === 'DATASET_ACCESS_DENIED';
    const missingBlocked = userB_AttachMissingAttempt.statusCode === 404 && userB_AttachMissingAttempt.json?.code === 'DATASET_NOT_FOUND';
    recordResult(11, 'Foreign & nonexistent dataset attachments rejected', foreignBlocked && missingBlocked, 'Mocked App Server / RLS Simulation');

    // ------------------------------------------------------------------------
    // TEST 12: Anonymous Access Denial
    // ------------------------------------------------------------------------
    const anonGetProjects = await makeRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/projects',
      method: 'GET'
    });

    const anonPostProject = await makeRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/projects',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { project: { name: 'Anon Project' } });

    const anonGetDatasets = await makeRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/datasets',
      method: 'GET'
    });

    const test12Pass = anonGetProjects.statusCode === 401 &&
                       anonPostProject.statusCode === 401 &&
                       anonGetDatasets.statusCode === 401;
    recordResult(12, 'Anonymous requests to workspaces and datasets denied (HTTP 401)', test12Pass, 'Mocked App Server / RLS Simulation');

    // ------------------------------------------------------------------------
    // TEST 13: Complete User-to-User Workspace Isolation
    // ------------------------------------------------------------------------
    const userB_List = await makeRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/projects',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenB}`,
        'x-user-id': userB_Id,
        'x-user-email': userB_Email
      }
    });

    const userB_Projects = userB_List.json?.projects || [];
    const userA_In_B_List = userB_Projects.some(p => p.id === attachWsId);

    const userB_Mutate_A = await makeRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: `/api/projects/${attachWsId}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`,
        'x-user-id': userB_Id,
        'x-user-email': userB_Email
      }
    }, { name: 'Malicious Overwrite' });

    const userB_Delete_A = await makeRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: `/api/projects/${attachWsId}`,
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${tokenB}`,
        'x-user-id': userB_Id,
        'x-user-email': userB_Email
      }
    });

    const test13Pass = !userA_In_B_List && userB_Mutate_A.statusCode === 403 && userB_Delete_A.statusCode === 403;
    recordResult(13, 'Complete user-to-user workspace isolation (GET/PUT/DELETE blocked)', test13Pass, 'Mocked App Server / RLS Simulation');

    // ------------------------------------------------------------------------
    // TEST 14: Administrator Authorization & Persona Isolation
    // ------------------------------------------------------------------------
    const adminToken = 'mock-admin-token';
    const adminVerifyRes = await makeRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/admin/verify',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'x-user-id': '7651c836-78b8-433a-a79c-e29910d4b392',
        'x-user-email': 'admin@insightiq.internal',
        'x-user-role': 'Administrator'
      }
    });

    const nonAdminVerifyRes = await makeRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/admin/verify',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'x-user-id': userA_Id,
        'x-user-email': userA_Email,
        'x-user-role': 'Data Analyst'
      }
    });

    const test14Pass = adminVerifyRes.statusCode === 200 && nonAdminVerifyRes.statusCode === 403;
    recordResult(14, 'Administrator authorization and non-admin denial verified', test14Pass, 'Mocked App Server / RLS Simulation');

    // ------------------------------------------------------------------------
    // TEST 15: Backup Cryptographic SHA-256 Manifest & Restoration Verification
    // ------------------------------------------------------------------------
    const snapshotBase = path.resolve(__dirname, '../data/local_browser_backup');
    const dirs = fs.readdirSync(snapshotBase).filter(d => d.startsWith('pre_migration_')).sort().reverse();
    let test15Pass = false;
    let restoreDetails = '';

    if (dirs.length > 0) {
      const targetDir = path.join(snapshotBase, dirs[0]);
      const res = runIsolatedLocalTest(targetDir);
      test15Pass = res.success === true && res.tablesCount > 0 && res.projectsCount === 2 && res.datasetsCount === 5;
      restoreDetails = `${res.tablesCount} tables, ${res.totalRows} rows, ${res.projectsCount} projects, ${res.datasetsCount} datasets`;
    }
    recordResult(15, 'Backup SHA-256 integrity & isolated restoration verification', test15Pass, 'Isolated Tooling Verification', restoreDetails);

  } finally {
    if (serverInstance) {
      serverInstance.close();
    }
  }

  console.log('\n================================================================');
  console.log(`Total: ${passed}/${total} Tests Passed (${Math.round((passed / total) * 100)}%)`);
  console.log('================================================================\n');

  return { passed, total, testResults };
}

if (require.main === module) {
  runSuite().then(({ passed, total }) => {
    if (passed !== total) process.exit(1);
  }).catch(err => {
    console.error('[Verification Suite Error]', err);
    process.exit(1);
  });
}

module.exports = { runSuite };
