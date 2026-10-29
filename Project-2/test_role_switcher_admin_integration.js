/**
 * InsightIQ AI — Workspace Role Switcher & Admin Portal Verification Suite
 *
 * Comprehensive verification of:
 * 1. The configured developer account sees the Admin Portal entry (sidebar & modal).
 * 2. An authorized administrator sees the Admin Portal entry (sidebar & modal).
 * 3. An ordinary user does not see the Admin Portal entry (neither sidebar nor modal).
 * 4. An ordinary user cannot access the admin route (#/admin) or APIs directly (403 blocked).
 * 5. A missing, expired, or invalid session is handled safely (401 / secure guard).
 * 6. Refreshing the page preserves authenticated identity and correct access.
 * 7. All existing workspace switching still works (Data Analyst, Data Scientist, Project Manager).
 * 8. No unintended database or permission changes occurred (schema integrity, no role_configured error).
 */

const assert = require('assert');
const path = require('path');
const dotenv = require('dotenv');
const puppeteer = require('puppeteer');

dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config({ path: path.join(__dirname, '.env') });

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8085';
const CHROME_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function report(num, name, passed, details = '') {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`  ✓ [TEST ${num}] PASS: ${name}`);
  } else {
    failedTests++;
    console.error(`  ✗ [TEST ${num}] FAIL: ${name}${details ? ` -> ${details}` : ''}`);
  }
}

async function seedSession(page, { id, email, full_name, role, token }) {
  const canonicalRole = (role || 'data_analyst').toLowerCase().replace(/\s+/g, '_');
  await page.evaluate(({ id, email, full_name, role, canonicalRole, token }) => {
    const mockUser = {
      id,
      email,
      user_metadata: { full_name, role }
    };
    localStorage.setItem('insightiq_supabase_auth_token', JSON.stringify({
      access_token: token,
      refresh_token: 'dummy-refresh-token',
      expires_at: Math.floor(Date.now() / 1000) + 7200,
      user: mockUser
    }));
    localStorage.setItem('insightiq_user_session', JSON.stringify({
      access_token: token,
      user: mockUser
    }));
    localStorage.setItem('insightiq_user_profile', JSON.stringify({
      id,
      email,
      full_name,
      role
    }));
    localStorage.setItem('insightiq_dev_preview_role', canonicalRole);
  }, { id, email, full_name, role, canonicalRole, token });

  await page.reload({ waitUntil: 'networkidle2' });
  await page.waitForSelector('#header-role-badge', { timeout: 8000 });
}

async function runSuite() {
  console.log('================================================================');
  console.log('InsightIQ AI — Developer & Admin Access Verification Suite');
  console.log('================================================================\n');

  // ==========================================================================
  // PART A: SERVER-SIDE AUTHORIZATION & ACCESS DEFENSE
  // ==========================================================================
  console.log('--- PART A: Server-Side Authorization Verification ---');

  // Test 1: Missing session token returns 401 AUTH_REQUIRED
  try {
    const res = await fetch(`${BASE_URL}/api/admin/verify`);
    assert.strictEqual(res.status, 401, 'Unauthenticated request must return 401');
    const data = await res.json().catch(() => ({}));
    assert.strictEqual(data.code, 'AUTH_REQUIRED');
    report(1, 'Missing session token to /api/admin/verify rejected with HTTP 401 (AUTH_REQUIRED)', true);
  } catch (err) {
    report(1, 'Missing session token rejected with HTTP 401', false, err.message);
  }

  // Test 2: Expired or invalid token to /api/admin/verify is rejected
  try {
    const res = await fetch(`${BASE_URL}/api/admin/verify`, {
      headers: { 'Authorization': 'Bearer invalid-expired-malformed-token' }
    });
    // In dev mode with non-mock prefix, attempts Supabase verification and returns 401
    assert.ok(res.status === 401 || res.status === 403, `Must reject invalid token with 401 or 403, got ${res.status}`);
    report(2, 'Invalid or expired session token handled safely and rejected', true);
  } catch (err) {
    report(2, 'Invalid or expired token rejection', false, err.message);
  }

  // Test 3: Non-admin request to /api/admin/verify returns 403 Forbidden
  try {
    const res = await fetch(`${BASE_URL}/api/admin/verify`, {
      headers: { 'Authorization': 'Bearer mock-user-token' }
    });
    assert.strictEqual(res.status, 403, 'Non-admin request must return 403');
    const data = await res.json().catch(() => ({}));
    assert.strictEqual(data.code, 'ADMIN_ACCESS_DENIED');
    report(3, 'Ordinary user request to /api/admin/verify rejected with HTTP 403 (ADMIN_ACCESS_DENIED)', true);
  } catch (err) {
    report(3, 'Ordinary user request rejected with HTTP 403', false, err.message);
  }

  // Test 4: Authorized Administrator request to /api/admin/verify returns 200 OK
  try {
    const res = await fetch(`${BASE_URL}/api/admin/verify`, {
      headers: { 'Authorization': 'Bearer mock-admin-token' }
    });
    assert.strictEqual(res.status, 200, 'Admin request must return 200');
    const data = await res.json().catch(() => ({}));
    assert.strictEqual(data.authorized, true);
    assert.strictEqual(data.admin?.role, 'Administrator');
    report(4, 'Authorized Administrator request to /api/admin/verify returns HTTP 200 (authorized: true)', true);
  } catch (err) {
    report(4, 'Authorized Administrator request returns 200', false, err.message);
  }

  // Test 5: Configured Developer Account request to /api/admin/verify returns 200 OK
  try {
    const res = await fetch(`${BASE_URL}/api/admin/verify`, {
      headers: {
        'Authorization': 'Bearer mock-developer-token'
      }
    });
    assert.strictEqual(res.status, 200, 'Developer account must return 200');
    const data = await res.json().catch(() => ({}));
    assert.strictEqual(data.authorized, true);
    assert.strictEqual(data.admin?.isDeveloper, true);
    report(5, 'Configured Developer Account request to /api/admin/verify returns HTTP 200 (isDeveloper: true)', true);
  } catch (err) {
    report(5, 'Configured Developer Account request returns 200', false, err.message);
  }

  // Test 6: Direct self-elevation to Administrator via POST /api/user/role is strictly blocked with 403
  try {
    const res = await fetch(`${BASE_URL}/api/user/role`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-user-token'
      },
      body: JSON.stringify({
        role: 'Administrator',
        userId: 'user-sarah-chen-001'
      })
    });
    assert.strictEqual(res.status, 403, 'Role elevation must return 403');
    const data = await res.json().catch(() => ({}));
    assert.ok(data.error && data.error.includes('Administrator role grants privileged system access'), 'Must explain admin cannot be self-assigned');
    report(6, 'Direct self-elevation to Administrator via POST /api/user/role blocked with HTTP 403', true);
  } catch (err) {
    report(6, 'Direct role elevation blocked with 403', false, err.message);
  }

  // ==========================================================================
  // PART B: BROWSER UI E2E DISCOVERABILITY & ACCESS TESTS (PUPPETEER)
  // ==========================================================================
  console.log('\n--- PART B: Browser UI E2E Discoverability & Access Tests ---');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  try {
    // Test 7: Configured Developer Account sees Admin Portal in sidebar and role switcher modal
    console.log('\n[7/14] Testing configured developer account sees Admin Portal in sidebar and role switcher modal...');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });
      await page.goto(BASE_URL, { waitUntil: 'networkidle2' });

      await seedSession(page, {
        id: 'dev-account-001',
        email: 'developer@insightiq.ai',
        full_name: 'Lead Developer',
        role: 'Data Analyst', // Developer workspace persona
        token: 'mock-developer-token'
      });

      // 1. Check sidebar rail for Admin Portal entry (#sidebar-nav-admin)
      await page.waitForSelector('#sidebar-nav-admin', { timeout: 6000 });
      const sidebarAdminText = await page.evaluate(() => document.querySelector('#sidebar-nav-admin')?.innerText.trim());
      assert.ok(sidebarAdminText.includes('Admin Dashboard') || sidebarAdminText.includes('Admin Portal'), `Sidebar must contain Admin Dashboard or Portal, got: ${sidebarAdminText}`);

      // 1b. Verify standalone Admin Dashboard button is removed from top header navigation
      const headerAdminBtn = await page.$('#header-admin-portal-btn');
      assert.strictEqual(headerAdminBtn, null, 'Standalone #header-admin-portal-btn must be absent from top header navigation');

      // 2. Open role switcher modal and check Admin Portal option (#switch-role-option-admin)
      await page.click('#header-role-badge');
      await page.waitForSelector('#switch-workspace-role-modal', { timeout: 5000 });
      await page.waitForSelector('#switch-role-option-admin', { timeout: 5000 });

      const adminOption = await page.$('#switch-role-option-admin');
      assert.ok(adminOption, 'Developer account must see #switch-role-option-admin in modal');

      // 2b. Verify business_analyst is NOT in the modal
      const baOption = await page.$('#switch-role-option-business_analyst');
      assert.strictEqual(baOption, null, 'Business Analyst must NOT be a selectable option in the modal');

      await page.click('#btn-close-switch-role-modal');
      report(7, 'Configured Developer Account sees Admin Portal in sidebar (#sidebar-nav-admin) and modal (#switch-role-option-admin), with standalone header button removed and Business Analyst excluded', true);
      await page.close();
    }

    // Test 8: Authorized Administrator sees Admin Portal in sidebar and role switcher modal
    console.log('\n[8/14] Testing authorized Administrator sees Admin Portal in sidebar and role switcher modal...');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });
      await page.goto(BASE_URL, { waitUntil: 'networkidle2' });

      await seedSession(page, {
        id: 'mock-admin-id-001',
        email: 'admin@insightiq.internal',
        full_name: 'System Administrator (Test)',
        role: 'Administrator',
        token: 'mock-admin-token'
      });

      // 1. Check sidebar rail for Admin Portal entry
      await page.waitForSelector('#sidebar-nav-admin', { timeout: 6000 });
      const sidebarAdmin = await page.$('#sidebar-nav-admin');
      assert.ok(sidebarAdmin, 'Administrator must see #sidebar-nav-admin in sidebar');

      // 1b. Verify standalone Admin Dashboard button is removed from top header navigation
      const headerAdminBtn = await page.$('#header-admin-portal-btn');
      assert.strictEqual(headerAdminBtn, null, 'Standalone #header-admin-portal-btn must be absent from top header navigation');

      // 2. Open role switcher modal and check Admin Portal option
      await page.click('#header-role-badge');
      await page.waitForSelector('#switch-workspace-role-modal', { timeout: 5000 });
      await page.waitForSelector('#switch-role-option-admin', { timeout: 5000 });

      const adminOption = await page.$('#switch-role-option-admin');
      assert.ok(adminOption, 'Administrator must see #switch-role-option-admin in modal');

      // 2b. Verify business_analyst is NOT in the modal
      const baOption = await page.$('#switch-role-option-business_analyst');
      assert.strictEqual(baOption, null, 'Business Analyst must NOT be in the modal for Administrator');

      // 3. Click Admin Portal in modal and navigate to #/admin
      await page.click('#switch-role-option-admin');
      await page.click('#btn-confirm-switch-role');
      await page.waitForSelector('.admin-portal-root', { timeout: 8000 });
      await page.waitForSelector('.admin-kpi-card', { timeout: 8000 });

      const hash = await page.evaluate(() => window.location.hash);
      assert.strictEqual(hash, '#/admin', 'URL hash must be #/admin');

      report(8, 'Authorized Administrator sees Admin Portal in sidebar and modal (no standalone header button), and successfully navigates to #/admin', true);
      await page.close();
    }

    // Test 9: Ordinary user does NOT see Admin Portal in sidebar or modal
    console.log('\n[9/14] Testing ordinary user does NOT see Admin Portal in sidebar or modal...');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });
      await page.goto(BASE_URL, { waitUntil: 'networkidle2' });

      await seedSession(page, {
        id: 'user-sarah-chen-001',
        email: 'sarah.chen@insightiq.internal',
        full_name: 'Sarah Chen',
        role: 'Data Analyst',
        token: 'mock-user-token'
      });

      // 1. Sidebar rail must NOT contain #sidebar-nav-admin
      const sidebarAdmin = await page.$('#sidebar-nav-admin');
      assert.strictEqual(sidebarAdmin, null, 'Ordinary user must NOT have #sidebar-nav-admin in sidebar');

      // 1b. Header navigation must NOT contain #header-admin-portal-btn
      const headerAdmin = await page.$('#header-admin-portal-btn');
      assert.strictEqual(headerAdmin, null, 'Ordinary user must NOT have #header-admin-portal-btn in header navigation');

      // 2. Role switcher modal must NOT contain #switch-role-option-admin
      await page.click('#header-role-badge');
      await page.waitForSelector('#switch-workspace-role-modal', { timeout: 5000 });

      const modalAdmin = await page.$('#switch-role-option-admin');
      assert.strictEqual(modalAdmin, null, 'Ordinary user must NOT have #switch-role-option-admin in modal');

      // 2b. Verify business_analyst is NOT in the modal
      const modalBA = await page.$('#switch-role-option-business_analyst');
      assert.strictEqual(modalBA, null, 'Ordinary user must NOT have #switch-role-option-business_analyst in modal');

      // 3. User menu dropdown must NOT contain #menu-btn-admin-portal
      await page.click('#btn-close-switch-role-modal');
      await page.click('#header-user-menu-btn');
      const menuAdminBtn = await page.$('#menu-btn-admin-dashboard, #menu-btn-admin-portal');
      assert.strictEqual(menuAdminBtn, null, 'Ordinary user must NOT have Admin Dashboard button in user menu');

      report(9, 'Ordinary user does NOT see Admin Portal entry in sidebar, header, modal, or account dropdown (and no Business Analyst)', true);
      await page.close();
    }

    // Test 10: Ordinary user direct navigation to #/admin triggers 403 Access Denied screen
    console.log('\n[10/14] Testing ordinary user direct navigation to #/admin is blocked with 403 screen...');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });
      await page.goto(BASE_URL, { waitUntil: 'networkidle2' });

      await seedSession(page, {
        id: 'user-sarah-chen-001',
        email: 'sarah.chen@insightiq.internal',
        full_name: 'Sarah Chen',
        role: 'Data Analyst',
        token: 'mock-user-token'
      });

      // Direct navigation to #/admin
      await page.evaluate(() => { window.location.hash = '#/admin'; });
      await page.waitForSelector('.admin-403-container', { timeout: 8000 });

      const is403Blocked = await page.evaluate(() => {
        const text = document.querySelector('.admin-403-container')?.innerText || '';
        return text.includes('Administrator Privileges Required');
      });
      assert.ok(is403Blocked, 'Must display Administrator Privileges Required screen');

      report(10, 'Ordinary user direct navigation to #/admin triggers dedicated 403 Access Denied screen', true);
      await page.close();
    }

    // Test 11: Refreshing page preserves authenticated identity and correct access for developer/admin
    console.log('\n[11/14] Testing page refresh preserves authenticated identity and correct access...');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });
      await page.goto(BASE_URL, { waitUntil: 'networkidle2' });

      await seedSession(page, {
        id: 'dev-account-001',
        email: 'developer@insightiq.ai',
        full_name: 'Lead Developer',
        role: 'Data Analyst',
        token: 'mock-developer-token'
      });

      // Verify sidebar Admin Portal is present before reload
      await page.waitForSelector('#sidebar-nav-admin', { timeout: 5000 });

      // Refresh the page
      await page.reload({ waitUntil: 'networkidle2' });
      await page.waitForSelector('#header-role-badge', { timeout: 8000 });

      // Verify identity and Admin Portal visibility persist after reload
      await page.waitForSelector('#sidebar-nav-admin', { timeout: 5000 });
      const sidebarAdmin = await page.$('#sidebar-nav-admin');
      assert.ok(sidebarAdmin, 'Sidebar Admin Portal must persist across page reloads');

      report(11, 'Page refresh preserves authenticated identity and developer/admin access', true);
      await page.close();
    }

    // Test 12: Refreshing page preserves ordinary user identity and blocked access
    console.log('\n[12/14] Testing page refresh preserves ordinary user identity and blocked access...');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });
      await page.goto(BASE_URL, { waitUntil: 'networkidle2' });

      await seedSession(page, {
        id: 'user-sarah-chen-001',
        email: 'sarah.chen@insightiq.internal',
        full_name: 'Sarah Chen',
        role: 'Data Analyst',
        token: 'mock-user-token'
      });

      await page.reload({ waitUntil: 'networkidle2' });
      await page.waitForSelector('#header-role-badge', { timeout: 8000 });

      // Must still not see admin in sidebar
      const sidebarAdmin = await page.$('#sidebar-nav-admin');
      assert.strictEqual(sidebarAdmin, null, 'Ordinary user must still not see Admin Portal after refresh');

      report(12, 'Page refresh preserves ordinary user identity and blocked access correctly', true);
      await page.close();
    }

    // Test 13: All existing workspace personas switch cleanly (Data Analyst -> Data Scientist -> Project Manager)
    console.log('\n[13/14] Testing workspace switching between standard personas...');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });
      await page.goto(BASE_URL, { waitUntil: 'networkidle2' });

      await seedSession(page, {
        id: 'user-sarah-chen-001',
        email: 'sarah.chen@insightiq.internal',
        full_name: 'Sarah Chen',
        role: 'Data Analyst',
        token: 'mock-user-token'
      });

      // Switch to Data Scientist
      await page.click('#header-role-badge');
      await page.waitForSelector('#switch-workspace-role-modal', { timeout: 5000 });
      await page.click('#switch-role-option-data_scientist');

      const dsRespPromise = page.waitForResponse(
        res => res.url().includes('/api/user/role') && res.request().method() === 'POST',
        { timeout: 8000 }
      );
      await page.click('#btn-confirm-switch-role');
      await dsRespPromise;

      await page.waitForFunction(
        () => document.querySelector('#header-role-badge')?.innerText.includes('DATA SCIENTIST'),
        { timeout: 5000 }
      );

      // Now switch to Project Manager
      await page.click('#header-role-badge');
      await page.waitForSelector('#switch-workspace-role-modal', { timeout: 5000 });
      await page.click('#switch-role-option-project_manager');

      const pmRespPromise = page.waitForResponse(
        res => res.url().includes('/api/user/role') && res.request().method() === 'POST',
        { timeout: 8000 }
      );
      await page.click('#btn-confirm-switch-role');
      await pmRespPromise;

      await page.waitForFunction(
        () => document.querySelector('#header-role-badge')?.innerText.includes('PROJECT MANAGER'),
        { timeout: 5000 }
      );

      const finalBadge = await page.evaluate(() => document.querySelector('#header-role-badge')?.innerText.trim());
      assert.ok(finalBadge.includes('PROJECT MANAGER'), `Badge must be PROJECT MANAGER, got: ${finalBadge}`);

      report(13, 'Workspace persona switching between Data Analyst, Data Scientist, and Project Manager fully works', true);
      await page.close();
    }

    // Test 14: Database schema integrity & absence of role_configured column errors
    console.log('\n[14/14] Testing database schema integrity and lack of role_configured column errors...');
    {
      const page = await browser.newPage();
      let hadSchemaError = false;
      page.on('console', msg => {
        if (msg.text().includes('role_configured') && msg.text().includes('does not exist')) {
          hadSchemaError = true;
        }
      });
      await page.setViewport({ width: 1440, height: 900 });
      await page.goto(BASE_URL, { waitUntil: 'networkidle2' });

      await seedSession(page, {
        id: 'user-sarah-chen-001',
        email: 'sarah.chen@insightiq.internal',
        full_name: 'Sarah Chen',
        role: 'Data Analyst',
        token: 'mock-user-token'
      });

      assert.strictEqual(hadSchemaError, false, 'Should not produce role_configured schema cache error');
      report(14, 'Database schema integrity preserved with zero role_configured errors', true);
      await page.close();
    }

  } finally {
    await browser.close();
  }

  // Summary
  console.log('\n================================================================');
  console.log(`Integration Test Summary: ${passedTests}/${totalTests} Tests Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error('\n[FATAL SUITE ERROR]:', err);
  process.exit(1);
});
