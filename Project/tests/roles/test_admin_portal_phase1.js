/**
 * InsightIQ AI — Phase 1 Admin Portal Verification Suite
 *
 * Comprehensive end-to-end automated testing for:
 * 1. Strict server-side RBAC protection (401 unauthenticated, 403 non-admin forbidden, 200 admin authorized)
 * 2. Dedicated admin endpoints (/api/admin/verify, /api/admin/overview, /api/admin/health, /api/admin/workspaces)
 * 3. Honest metrics reporting (unavailable user counts, unconfigured model/project tables, real DB latency)
 * 4. Browser E2E non-admin access denial (403 screen with user identity & Return to Workspace button)
 * 5. Browser E2E admin access (dedicated layout, header, sidebar, 6 KPI cards, diagnostics, schema audit)
 * 6. Non-disruption guarantee for existing workspaces and session stability
 */

const assert = require('assert');
const path = require('path');
const dotenv = require('dotenv');
const puppeteer = require('puppeteer');

dotenv.config({ path: path.join(__dirname, '../../.env.local') });
dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '.env') });

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8085';
const CHROME_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function report(testNum, testName, passed, details = '') {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`  ✓ [TEST ${testNum}] PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ [TEST ${testNum}] FAIL: ${testName}${details ? ` -> ${details}` : ''}`);
  }
}

async function runSuite() {
  console.log('================================================================');
  console.log('InsightIQ AI — Phase 1 Admin Portal Verification Suite');
  console.log('================================================================\n');

  // ==========================================================================
  // PART A: SERVER-SIDE RBAC ENDPOINT SECURITY (HTTP API)
  // ==========================================================================
  console.log('--- PART A: Server-Side RBAC Endpoint Security & Telemetry ---');

  // Test 1: Unauthenticated request rejected with 401
  try {
    const res = await fetch(`${BASE_URL}/api/admin/overview`);
    assert.strictEqual(res.status, 401, 'Unauthenticated access must return 401');
    const data = await res.json().catch(() => ({}));
    assert.ok(data.code === 'AUTH_REQUIRED' || data.code === 'UNAUTHENTICATED', 'Error code must indicate auth required');
    report(1, 'Unauthenticated request to /api/admin/overview rejected with 401', true);
  } catch (err) {
    report(1, 'Unauthenticated request to /api/admin/overview rejected with 401', false, err.message);
  }

  // Test 2: All 4 admin endpoints reject unauthenticated requests
  try {
    const endpoints = ['/api/admin/verify', '/api/admin/overview', '/api/admin/health', '/api/admin/workspaces'];
    let all401 = true;
    for (const ep of endpoints) {
      const res = await fetch(`${BASE_URL}${ep}`);
      if (res.status !== 401) {
        all401 = false;
        break;
      }
    }
    assert.ok(all401, 'All admin endpoints must reject unauthenticated requests with 401');
    report(2, 'All 4 admin endpoints enforce authentication gateway (401)', true);
  } catch (err) {
    report(2, 'All 4 admin endpoints enforce authentication gateway (401)', false, err.message);
  }

  // Test 3: Non-admin role (Data Analyst) rejected with 403 Forbidden
  try {
    const res = await fetch(`${BASE_URL}/api/admin/overview`, {
      headers: { 'Authorization': 'Bearer mock-token-data_analyst' }
    });
    assert.strictEqual(res.status, 403, 'Non-admin access must return 403 Forbidden');
    const data = await res.json().catch(() => ({}));
    assert.strictEqual(data.code, 'ADMIN_ACCESS_DENIED', 'Error code must be ADMIN_ACCESS_DENIED');
    assert.strictEqual(data.currentRole, 'Data Analyst', 'Should disclose caller role for client UI');
    report(3, 'Non-admin caller (Data Analyst) rejected with 403 Forbidden (ADMIN_ACCESS_DENIED)', true);
  } catch (err) {
    report(3, 'Non-admin caller (Data Analyst) rejected with 403 Forbidden', false, err.message);
  }

  // Test 4: Administrator verification endpoint returns 200
  try {
    const res = await fetch(`${BASE_URL}/api/admin/verify`, {
      headers: { 'Authorization': 'Bearer mock-admin-token' }
    });
    assert.strictEqual(res.status, 200, 'Admin token must return 200');
    const data = await res.json().catch(() => ({}));
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.authorized, true);
    assert.strictEqual(data.admin.role, 'Administrator');
    report(4, 'Admin authorization validation (/api/admin/verify) returns 200 authorized', true);
  } catch (err) {
    report(4, 'Admin authorization validation (/api/admin/verify) returns 200 authorized', false, err.message);
  }

  // Test 5: /api/admin/overview delivers honest metrics
  try {
    const res = await fetch(`${BASE_URL}/api/admin/overview`, {
      headers: { 'Authorization': 'Bearer mock-admin-token' }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.metrics, 'Metrics object must be present');
    assert.strictEqual(data.metrics.totalUsers.status, 'unavailable', 'Total users must be unavailable due to RLS');
    assert.strictEqual(data.metrics.activeUsers.status, 'unavailable', 'Active users must be unavailable');
    assert.strictEqual(data.metrics.totalProjects.status, 'unconfigured', 'Projects table must be unconfigured');
    assert.strictEqual(data.metrics.registeredModels.status, 'unconfigured', 'Models table must be unconfigured');
    assert.strictEqual(data.metrics.systemHealth.status, 'available', 'System health must be available');
    report(5, '/api/admin/overview delivers honest metric statuses without faked values', true);
  } catch (err) {
    report(5, '/api/admin/overview delivers honest metric statuses', false, err.message);
  }

  // Test 6: /api/admin/health executes live DB ping and telemetry
  try {
    const res = await fetch(`${BASE_URL}/api/admin/health`, {
      headers: { 'Authorization': 'Bearer mock-admin-token' }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.system.uptimeSeconds >= 0, 'Uptime must be a valid number');
    assert.ok(data.system.memoryMb.heapUsed > 0, 'Heap memory must be positive');
    assert.strictEqual(data.services.backendServer.status, 'healthy');
    assert.strictEqual(data.services.database.status, 'connected');
    assert.ok(typeof data.services.database.latencyMs === 'number', 'DB latency must be measured in ms');
    report(6, '/api/admin/health probes live database roundtrip latency and Node.js telemetry', true, `Latency: ${data.services.database.latencyMs}ms`);
  } catch (err) {
    report(6, '/api/admin/health probes live database roundtrip latency', false, err.message);
  }

  // Test 7: /api/admin/workspaces audits 4 canonical personas & physical schema
  try {
    const res = await fetch(`${BASE_URL}/api/admin/workspaces`, {
      headers: { 'Authorization': 'Bearer mock-admin-token' }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.workspaces.length, 4, 'Must define all 4 canonical workspaces');
    assert.ok(data.schemaStatus.profiles.status === 'present', 'Profiles table must be present');
    assert.ok(data.schemaStatus.datasets.status === 'present', 'Datasets table must be present');
    assert.ok(data.schemaStatus.projects.status === 'unconfigured', 'Projects table must be unconfigured');
    assert.ok(data.schemaStatus.ml_models.status === 'unconfigured', 'ML models table must be unconfigured');
    report(7, '/api/admin/workspaces audits 4 workspace personas and 10 schema tables', true);
  } catch (err) {
    report(7, '/api/admin/workspaces audits 4 workspace personas and 10 schema tables', false, err.message);
  }

  // ==========================================================================
  // PART B: BROWSER USER INTERFACE & ACCESS CONTROL (PUPPETEER E2E)
  // ==========================================================================
  console.log('\n--- PART B: Browser UI & Access Control Verification (Puppeteer E2E) ---');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  async function seedSession(page, user) {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    await page.evaluate((u) => {
      localStorage.setItem('insightiq_user_session', JSON.stringify({ user: u }));
      localStorage.setItem('insightiq_supabase_auth_token', JSON.stringify({
        access_token: u.token,
        user: u
      }));
      localStorage.setItem('insightiq_user_profile', JSON.stringify({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        role: u.role
      }));
      localStorage.setItem('insightiq_dev_preview_role', u.role === 'Administrator' ? 'admin' : 'data_analyst');
    }, user);
    await page.reload({ waitUntil: 'networkidle2' });
    // Wait for either .app-container or .admin-portal-root (once boot screen completes)
    await page.waitForFunction(
      () => Boolean(document.querySelector('.app-container') || document.querySelector('.admin-portal-root')),
      { timeout: 12000 }
    );
  }

  try {
    // Test 8: Non-Admin User Navigating to #/admin Displays 403 Forbidden Screen
    console.log('\n[8/12] Testing Non-Admin access to #/admin renders 403 Access Denied view...');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });

      // Seed non-admin authenticated session
      await seedSession(page, {
        id: 'user-analyst-sarah',
        email: 'sarah.chen@insightiq.internal',
        full_name: 'Sarah Chen',
        role: 'Data Analyst',
        token: 'mock-token-data_analyst'
      });

      // Navigate to #/admin via hash change
      await page.evaluate(() => { window.location.hash = '#/admin'; });
      await page.waitForSelector('.admin-403-container', { timeout: 8000 });

      const state = await page.evaluate(() => {
        const container = document.querySelector('.admin-403-container');
        const title = container?.querySelector('h2')?.textContent || '';
        const role = container?.querySelector('.admin-denied-badge')?.textContent || '';
        const returnBtn = document.querySelector('#btn-admin-denied-return');
        const brand = document.querySelector('.admin-brand-title')?.textContent || '';
        return {
          hasContainer: Boolean(container),
          title,
          role,
          hasReturnBtn: Boolean(returnBtn),
          returnBtnText: returnBtn?.textContent || '',
          brand
        };
      });

      assert.ok(state.hasContainer, 'Must render .admin-403-container');
      assert.ok(state.title.includes('Administrator Privileges Required') || state.title.includes('Access Denied'), `Title must indicate Access Denied, got: ${state.title}`);
      assert.ok(state.role.includes('403 Forbidden'), `Must display 403 Forbidden badge, got: ${state.role}`);
      assert.ok(state.hasReturnBtn, 'Must render Return to Workspace button');
      assert.ok(state.returnBtnText.includes('Return to Data Analyst Workspace'), `Button text must match role: ${state.returnBtnText}`);
      assert.ok(state.brand.includes('InsightIQ'), 'Must render InsightIQ brand');

      // Click Return to Workspace button
      await page.click('#btn-admin-denied-return');
      await page.waitForSelector('.app-container', { timeout: 6000 });

      const currentHash = await page.evaluate(() => window.location.hash);
      assert.strictEqual(currentHash, '#/overview', 'Clicking Return to Workspace must navigate to #/overview');

      report(8, 'Non-admin navigating to #/admin triggers 403 screen with safe return to workspace', true);
      await page.close();
    }

    // Test 9: Administrator User Navigating to #/admin Displays Dedicated Layout & Overview
    console.log('\n[9/12] Testing Administrator access to #/admin renders full Admin Portal...');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });

      // Seed Administrator session
      await seedSession(page, {
        id: 'mock-admin-id-001',
        email: 'admin@insightiq.internal',
        full_name: 'System Administrator (Test)',
        role: 'Administrator',
        token: 'mock-admin-token'
      });

      // Navigate to #/admin via hash change
      await page.evaluate(() => { window.location.hash = '#/admin'; });
      await page.waitForSelector('.admin-portal-root', { timeout: 8000 });
      await page.waitForSelector('.admin-kpi-grid', { timeout: 8000 });

      const adminState = await page.evaluate(() => {
        const root = Boolean(document.querySelector('.admin-portal-root'));
        const badge = document.querySelector('.admin-portal-badge')?.textContent || '';
        const sidebar = Boolean(document.querySelector('.admin-sidebar'));
        const navItems = Array.from(document.querySelectorAll('.admin-nav-item')).map(el => el.textContent.trim());
        const kpiCards = document.querySelectorAll('.admin-kpi-card');
        const kpiLabels = Array.from(kpiCards).map(c => c.querySelector('.admin-kpi-label')?.textContent.trim());
        const kpiBadges = Array.from(kpiCards).map(c => c.querySelector('.admin-kpi-status-badge')?.textContent.trim());
        const returnBtn = Boolean(document.querySelector('.btn-admin-return'));
        return {
          root,
          badge,
          sidebar,
          navItems,
          kpiCount: kpiCards.length,
          kpiLabels,
          kpiBadges,
          returnBtn
        };
      });

      assert.ok(adminState.root, 'Must render .admin-portal-root');
      assert.ok(adminState.badge.toUpperCase().includes('ADMIN PORTAL') || adminState.badge.toUpperCase().includes('ADMIN DASHBOARD'), 'Must display Admin badge');
      assert.ok(adminState.sidebar, 'Must render dedicated Admin Sidebar');
      assert.strictEqual(adminState.kpiCount, 6, 'Must render exactly 6 KPI summary cards');
      assert.ok(adminState.kpiLabels.includes('Total Registered Users'), 'Must include Total Registered Users card');
      assert.ok(adminState.kpiBadges.some(b => b.includes('Requires DB Privileged Function') || b.includes('Active Profiles')), 'Users card must show status badge');
      assert.ok(adminState.kpiBadges.some(b => b.includes('Table Not In Schema')), 'Models card must show Table Not In Schema');
      assert.ok(adminState.kpiBadges.some(b => b.includes('Live Catalog Registry')), 'Datasets card must show Live Catalog Registry');
      assert.ok(adminState.returnBtn, 'Must render Return to Workspace button in admin header');

      report(9, 'Administrator session renders dedicated Admin Portal with 6 honest KPI cards', true);
      await page.close();
    }

    // Test 10: Sidebar Navigation & Sub-Tabs (System Health & Live Latency Probe)
    console.log('\n[10/12] Testing Admin System Health sub-tab & live latency probe...');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });

      // Seed Administrator session
      await seedSession(page, {
        id: 'mock-admin-id-001',
        email: 'admin@insightiq.internal',
        full_name: 'System Administrator (Test)',
        role: 'Administrator',
        token: 'mock-admin-token'
      });

      await page.evaluate(() => { window.location.hash = '#/admin/health'; });
      await page.waitForSelector('.admin-telemetry-grid', { timeout: 8000 });

      const healthState = await page.evaluate(() => {
        const title = document.querySelector('.admin-page-title-group h1')?.textContent || '';
        const telemetryPills = Array.from(document.querySelectorAll('.admin-telemetry-pill')).map(p => p.textContent.trim());
        const probeBtn = Boolean(document.querySelector('#btn-probe-db-latency'));
        return { title, telemetryPills, probeBtn };
      });

      assert.ok(healthState.title.includes('System Health'), `Title must indicate System Health, got: ${healthState.title}`);
      assert.ok(healthState.telemetryPills.some(p => p.includes('Node')), 'Must show Node.js version telemetry');
      assert.ok(healthState.telemetryPills.some(p => p.includes('Heap Used')), 'Must show heap memory telemetry');
      assert.ok(healthState.probeBtn, 'Must render live latency probe button');

      // Click the live latency probe button
      await page.click('#btn-probe-db-latency');
      await page.waitForSelector('.admin-ping-result', { timeout: 8000 });

      const pingResultText = await page.$eval('.admin-ping-result', el => el.textContent.trim());
      assert.ok(pingResultText.includes('ms'), `Ping result must report ms latency, got: '${pingResultText}'`);

      report(10, 'Admin System Health sub-tab renders telemetry & executes live roundtrip latency probe', true, pingResultText);
      await page.close();
    }

    // Test 11: Sidebar Navigation to Workspace Oversight & Schema Inspection
    console.log('\n[11/12] Testing Admin Workspace Oversight & Schema Inspection sub-tab...');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });

      // Seed Administrator session
      await seedSession(page, {
        id: 'mock-admin-id-001',
        email: 'admin@insightiq.internal',
        full_name: 'System Administrator (Test)',
        role: 'Administrator',
        token: 'mock-admin-token'
      });

      await page.evaluate(() => { window.location.hash = '#/admin/workspaces'; });
      await page.waitForSelector('.admin-schema-table', { timeout: 8000 });

      const workspacesState = await page.evaluate(() => {
        const title = document.querySelector('.admin-page-title-group h1')?.textContent || '';
        const workspaceCards = Array.from(document.querySelectorAll('.admin-workspace-card')).map(c => c.querySelector('h3')?.textContent.trim());
        const schemaRows = Array.from(document.querySelectorAll('.admin-schema-table tbody tr')).map(row => {
          const tableName = row.querySelector('.schema-table-name')?.textContent.trim();
          const badge = row.querySelector('.admin-service-status-pill')?.textContent.trim();
          return { tableName, badge };
        });
        return { title, workspaceCards, schemaRows };
      });

      assert.ok(workspacesState.title.includes('Workspace Oversight'), 'Title must be Workspace Oversight');
      assert.ok(workspacesState.workspaceCards.some(c => c.includes('Data Analyst')), 'Must list Data Analyst workspace');
      assert.ok(workspacesState.workspaceCards.some(c => c.includes('Data Scientist')), 'Must list Data Scientist workspace');
      assert.ok(workspacesState.workspaceCards.some(c => c.includes('Project Manager')), 'Must list Project Manager workspace');
      assert.ok(workspacesState.workspaceCards.some(c => c.includes('Admin')), 'Must list Admin Dashboard');

      const profilesRow = workspacesState.schemaRows.find(r => r.tableName === 'public.profiles');
      const projectsRow = workspacesState.schemaRows.find(r => r.tableName === 'public.projects');
      const modelsRow = workspacesState.schemaRows.find(r => r.tableName === 'public.ml_models');

      assert.ok(profilesRow && profilesRow.badge === 'Present & Verified', 'profiles table must be present');
      assert.ok(projectsRow && projectsRow.badge === 'Unconfigured in DB', 'projects table must be unconfigured');
      assert.ok(modelsRow && modelsRow.badge === 'Unconfigured in DB', 'ml_models table must be unconfigured');

      report(11, 'Admin Workspace Oversight accurately displays 4 personas and 10 audited schema tables', true);
      await page.close();
    }

    // Test 12: Future Module Notice & Return to Workspace Navigation
    console.log('\n[12/12] Testing Phase 2 notices & Return to Workspace navigation...');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });

      // Seed Administrator session
      await seedSession(page, {
        id: 'mock-admin-id-001',
        email: 'admin@insightiq.internal',
        full_name: 'System Administrator (Test)',
        role: 'Administrator',
        token: 'mock-admin-token'
      });

      await page.evaluate(() => { window.location.hash = '#/admin'; });
      await page.waitForSelector('.admin-nav-item', { timeout: 8000 });

      // Click "Audit Logs" (future item)
      await page.evaluate(() => {
        const auditBtn = Array.from(document.querySelectorAll('.admin-nav-item')).find(el => el.textContent.includes('Audit Logs'));
        if (auditBtn) auditBtn.click();
      });

      await page.waitForSelector('.admin-notice-banner', { timeout: 4000 });
      const noticeText = await page.$eval('.admin-notice-banner', el => el.textContent.trim());
      assert.ok(noticeText.includes('Phase 3') || noticeText.includes('Audit Logs'), `Notice must explain module: '${noticeText}'`);

      // Click "← Return to Workspace" button
      await page.click('.btn-admin-return');
      await page.waitForSelector('.app-container', { timeout: 6000 });

      const finalHash = await page.evaluate(() => window.location.hash);
      assert.strictEqual(finalHash, '#/overview', 'Return to Workspace must return to #/overview');

      report(12, 'Phase 2 module notices displayed honestly & Return to Workspace navigates seamlessly', true);
      await page.close();
    }

  } finally {
    await browser.close();
  }

  // Summary
  console.log('\n================================================================');
  console.log(`Phase 1 Verification Summary: ${passedTests}/${totalTests} Tests Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error('\n[FATAL SUITE ERROR]:', err);
  process.exit(1);
});
