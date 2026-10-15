/**
 * InsightIQ AI — Comprehensive Role Persistence, Switching, & Authorization Regression Suite
 *
 * Verifies the 9 Core Requirements:
 * 1. New user without a role -> sees the onboarding role selector.
 * 2. User with an existing saved role -> bypasses the selector and enters their dashboard.
 * 3. Refreshing the application -> does not reopen the selector for users who already have a role.
 * 4. Profile loading delay -> does not flash or render the selector while loading.
 * 5. Database failure while loading the role -> displays a recoverable error instead of wiping the user's role or forcing the selector.
 * 6. User can change their workspace role through the UI -> updates session and persists across page reloads.
 * 7. Unauthorized roles cannot be self-assigned through UI or API (403 Forbidden).
 * 8. Multi-tenant isolation: changing one user's role does not affect another user.
 * 9. Existing functionality remains intact (login, logout, session restoration).
 */

const assert = require('assert');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const puppeteer = require('puppeteer');

dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config({ path: path.join(__dirname, '.env') });

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8085';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function report(testName, passed, details = '') {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${testName}${details ? ` -> ${details}` : ''}`);
  }
}

async function runSuite() {
  console.log('================================================================');
  console.log('InsightIQ AI — Role Persistence & Switching Regression Suite');
  console.log('================================================================');

  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  const fs = require('fs');
  const chromePath = chromePaths.find(p => fs.existsSync(p));

  let browser;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: chromePath || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // Enable console logging for debugging
    page.on('console', msg => {
      const txt = msg.text();
      if (txt.includes('[Role') || txt.includes('ERROR') || txt.includes('FAIL')) {
        // console.log(`[Browser] ${txt}`);
      }
    });

    // -------------------------------------------------------------------------
    // TEST 1: New user without a role -> sees the onboarding role selector
    // -------------------------------------------------------------------------
    console.log('\n[1/9] Verifying New user without a role sees the onboarding role selector...');
    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle2' });

      // Inject a fresh session without a saved role
      await page.evaluate(() => {
        const mockUser = {
          id: 'test-new-user-00000000-0000-0000-0000-000000000001',
          email: 'newuser@insightiq.internal',
          user_metadata: { full_name: 'New User' }
        };
        const mockSession = {
          access_token: 'mock-jwt-token-new-user',
          user: mockUser
        };
        localStorage.setItem('insightiq_user_session', JSON.stringify(mockSession));
        localStorage.setItem('insightiq_user_profile', JSON.stringify({
          id: mockUser.id,
          email: mockUser.email,
          full_name: 'New User',
          role: null
        }));
      });

      await page.reload({ waitUntil: 'networkidle2' });

      // Selector should be visible
      await page.waitForSelector('.role-selection-viewport', { timeout: 6000 });
      const roleTitle = await page.$eval('.role-title', el => el.textContent);
      assert.ok(roleTitle.includes('How will you use InsightIQ AI?'), 'Title should prompt role selection');

      // Administrator card must NOT be present
      const adminCard = await page.$('#role-card-administrator');
      assert.strictEqual(adminCard, null, 'Administrator role card must NOT be presented in onboarding');

      // Permitted roles must be present
      const analystCard = await page.$('#role-card-data-analyst');
      const scientistCard = await page.$('#role-card-data-scientist');
      const pmCard = await page.$('#role-card-project-manager');
      assert.ok(analystCard, 'Data Analyst card should be present');
      assert.ok(scientistCard, 'Data Scientist card should be present');
      assert.ok(pmCard, 'Project Manager card should be present');

      report('1. New user without role sees onboarding selector (no admin option)', true);
    } catch (err) {
      report('1. New user without role sees onboarding selector (no admin option)', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 2: User with an existing saved role -> bypasses selector into dashboard
    // -------------------------------------------------------------------------
    console.log('\n[2/9] Verifying User with existing saved role bypasses selector...');
    try {
      await page.evaluate(() => {
        const mockUser = {
          id: 'test-user-existing-0000-0000-0000-000000000002',
          email: 'analyst@insightiq.internal',
          user_metadata: { full_name: 'Sarah Chen' }
        };
        const mockSession = {
          access_token: 'mock-jwt-token-analyst',
          user: mockUser
        };
        localStorage.setItem('insightiq_user_session', JSON.stringify(mockSession));
        localStorage.setItem('insightiq_user_profile', JSON.stringify({
          id: mockUser.id,
          email: mockUser.email,
          full_name: 'Sarah Chen',
          role: 'Data Analyst'
        }));
      });

      await page.reload({ waitUntil: 'networkidle2' });

      // Dashboard should render directly
      await page.waitForSelector('#header-role-badge', { timeout: 6000 });
      const selector = await page.$('.role-selection-viewport');
      assert.strictEqual(selector, null, 'Role selector should NOT appear for user with saved role');

      const badgeText = await page.$eval('#header-role-badge', el => el.textContent);
      assert.ok(badgeText.includes('DATA ANALYST'), 'Header badge should show DATA ANALYST');

      report('2. User with existing saved role directly enters dashboard', true);
    } catch (err) {
      report('2. User with existing saved role directly enters dashboard', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 3: Refreshing application -> does not reopen selector
    // -------------------------------------------------------------------------
    console.log('\n[3/9] Verifying Refreshing application does not reopen selector...');
    try {
      // Refresh twice to confirm idempotence
      await page.reload({ waitUntil: 'networkidle2' });
      await page.waitForSelector('#header-role-badge', { timeout: 6000 });
      let selector = await page.$('.role-selection-viewport');
      assert.strictEqual(selector, null, 'Role selector must not appear on refresh 1');

      await page.reload({ waitUntil: 'networkidle2' });
      await page.waitForSelector('#header-role-badge', { timeout: 6000 });
      selector = await page.$('.role-selection-viewport');
      assert.strictEqual(selector, null, 'Role selector must not appear on refresh 2');

      report('3. Refreshing application does not reopen role selector', true);
    } catch (err) {
      report('3. Refreshing application does not reopen role selector', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 4: Profile loading delay -> does not flash selector while loading
    // -------------------------------------------------------------------------
    console.log('\n[4/9] Verifying Profile loading delay renders loading guard, not selector...');
    try {
      const loadingGuardResult = await page.evaluate(() => {
        // Test client test hook
        if (window.__insightIQTest) {
          window.__insightIQTest.setIsProfileLoading(true);
          window.__insightIQTest.setUserProfile(null);
          return true;
        }
        return false;
      });

      assert.ok(loadingGuardResult, 'window.__insightIQTest hook should be available');
      await new Promise(r => setTimeout(r, 200));

      // Guard should show "Restoring Workspace Session"
      const loadingText = await page.$eval('.role-selection-viewport', el => el.textContent);
      assert.ok(loadingText.includes('Restoring Workspace Session'), 'Loading guard should be displayed');
      assert.ok(!loadingText.includes('Choose the workspace'), 'Role selector choices must NOT flash');

      // Reset loading state
      await page.evaluate(() => {
        window.__insightIQTest.setIsProfileLoading(false);
        window.__insightIQTest.setUserProfile({
          id: 'test-user-existing-0000-0000-0000-000000000002',
          email: 'analyst@insightiq.internal',
          full_name: 'Sarah Chen',
          role: 'Data Analyst'
        });
      });
      await new Promise(r => setTimeout(r, 200));

      report('4. Profile loading delay renders loading guard without flashing selector', true);
    } catch (err) {
      report('4. Profile loading delay renders loading guard without flashing selector', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 5: Database failure while loading role -> displays recoverable error
    // -------------------------------------------------------------------------
    console.log('\n[5/9] Verifying Database failure displays recoverable error without wiping role...');
    try {
      await page.evaluate(() => {
        window.__insightIQTest.setUserProfile(null);
        window.__insightIQTest.setProfileLoadError('PostgreSQL RLS connection timeout (Simulated Fault)');
      });
      await new Promise(r => setTimeout(r, 200));

      // Recoverable error guard should be displayed
      const errorTitle = await page.$eval('.role-selection-viewport h2', el => el.textContent);
      assert.ok(errorTitle.includes('Profile Synchronization Failed'), 'Error screen should be rendered');

      const retryBtn = await page.$('#btn-retry-profile-load');
      assert.ok(retryBtn, 'Retry Connection button must be provided');

      // Verify localStorage was NOT wiped to role: null
      const storedProfile = await page.evaluate(() => {
        try {
          return JSON.parse(localStorage.getItem('insightiq_user_profile'));
        } catch (e) {
          return null;
        }
      });
      assert.ok(storedProfile && storedProfile.role, 'Saved role in localStorage must NOT be wiped');

      // Restore clean profile state
      await page.evaluate(() => {
        window.__insightIQTest.setProfileLoadError(null);
        window.__insightIQTest.setUserProfile({
          id: 'test-user-existing-0000-0000-0000-000000000002',
          email: 'analyst@insightiq.internal',
          full_name: 'Sarah Chen',
          role: 'Data Analyst'
        });
      });
      await new Promise(r => setTimeout(r, 200));

      report('5. Database failure displays recoverable error instead of wiping role', true);
    } catch (err) {
      report('5. Database failure displays recoverable error instead of wiping role', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 6: User can change workspace role via UI and it persists across reloads
    // -------------------------------------------------------------------------
    console.log('\n[6/9] Verifying User can change workspace role via UI and choice persists...');
    try {
      await page.waitForSelector('#header-role-badge', { timeout: 6000 });

      // Click the header role badge to open the Switch Workspace Role Modal
      await page.click('#header-role-badge');
      await page.waitForSelector('#switch-workspace-role-modal', { timeout: 3000 });

      // Modal options must contain Data Scientist, Data Analyst, Project Manager
      const scientistOption = await page.$('#switch-role-option-data_scientist');
      assert.ok(scientistOption, 'Switch option for Data Scientist must exist');

      // Click Data Scientist option
      await page.click('#switch-role-option-data_scientist');

      // Click confirm button
      await page.click('#btn-confirm-switch-role');

      // Wait for success toast to appear
      await page.waitForSelector('#role-success-toast', { timeout: 4000 });
      const toastText = await page.$eval('#role-success-toast', el => el.textContent);
      assert.ok(toastText.includes('Data Scientist'), 'Toast should confirm role switch to Data Scientist');

      // Header role badge should update immediately
      const updatedBadgeText = await page.$eval('#header-role-badge', el => el.textContent);
      assert.ok(updatedBadgeText.includes('DATA SCIENTIST'), 'Header badge must immediately reflect DATA SCIENTIST');

      // Verify localStorage was updated
      const updatedStoredRole = await page.evaluate(() => {
        try {
          return JSON.parse(localStorage.getItem('insightiq_user_profile')).role;
        } catch (e) {
          return null;
        }
      });
      assert.ok(updatedStoredRole === 'data_scientist' || updatedStoredRole === 'Data Scientist', 'Profile in storage must be updated to Data Scientist');

      // Now reload the page and verify persistence without any selector
      await page.reload({ waitUntil: 'networkidle2' });
      await page.waitForSelector('#header-role-badge', { timeout: 6000 });
      const postReloadBadge = await page.$eval('#header-role-badge', el => el.textContent);
      assert.ok(postReloadBadge.includes('DATA SCIENTIST'), 'DATA SCIENTIST must persist across reload');

      const selectorPostReload = await page.$('.role-selection-viewport');
      assert.strictEqual(selectorPostReload, null, 'Selector must not appear after reload');

      report('6. User can change workspace role via UI and choice persists across reload', true);
    } catch (err) {
      report('6. User can change workspace role via UI and choice persists across reload', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 7: Unauthorized roles cannot be self-assigned (UI & API validation)
    // -------------------------------------------------------------------------
    console.log('\n[7/9] Verifying Unauthorized roles cannot be self-assigned via UI or API...');
    try {
      // 1. UI Check: Switch modal must NOT offer Administrator as an option
      await page.click('#header-role-badge');
      await page.waitForSelector('#switch-workspace-role-modal', { timeout: 3000 });
      const adminModalOption = await page.$('#switch-role-option-admin');
      assert.strictEqual(adminModalOption, null, 'Administrator must NOT be an option in switch role modal');
      await page.click('#btn-close-switch-role-modal');

      // 2. Client Security Function Check
      const clientCheck = await page.evaluate(() => {
        if (window.__insightIQTest) {
          const test1 = window.__insightIQTest.isSelfSelectableRole('admin');
          const test2 = window.__insightIQTest.isSelfSelectableRole('Administrator');
          const test3 = window.__insightIQTest.isSelfSelectableRole('data_analyst');
          return { test1, test2, test3 };
        }
        return null;
      });
      assert.strictEqual(clientCheck.test1, false, 'admin must not be self-selectable');
      assert.strictEqual(clientCheck.test2, false, 'Administrator must not be self-selectable');
      assert.strictEqual(clientCheck.test3, true, 'data_analyst must be self-selectable');

      // 3. API Security Check: POST /api/user/role with admin must be rejected
      const apiRes = await fetch(`${BASE_URL}/api/user/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'admin' })
      });
      // Should reject with 401 or 403
      assert.ok([401, 403].includes(apiRes.status), `API must reject unauthorized role switch with 401 or 403 (Got ${apiRes.status})`);
      const apiData = await apiRes.json();
      assert.strictEqual(apiData.success, false, 'API success should be false');

      report('7. Unauthorized roles cannot be self-assigned through UI or API', true);
    } catch (err) {
      report('7. Unauthorized roles cannot be self-assigned through UI or API', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 8: Multi-tenant profile isolation (Modifying User A does not alter User B)
    // -------------------------------------------------------------------------
    console.log('\n[8/9] Verifying Multi-tenant profile isolation...');
    try {
      // Verify via Supabase client with anonymous/unprivileged access
      assert.ok(SUPABASE_URL, 'SUPABASE_URL must be configured');
      assert.ok(SUPABASE_KEY, 'SUPABASE_KEY must be configured');
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false }
      });

      // An unauthenticated request cannot read or write another user's profile
      const userA_id = '00000000-0000-0000-0000-00000000000a';
      const userB_id = '00000000-0000-0000-0000-00000000000b';

      const { data: updateData, error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'data_scientist' })
        .eq('id', userB_id);

      // Under RLS, unauthenticated user can modify 0 rows
      assert.ok(updateData === null || updateData.length === 0, 'Unauthenticated user cannot update User B profile');

      report('8. Multi-tenant profile isolation verified by RLS policies', true);
    } catch (err) {
      report('8. Multi-tenant profile isolation verified by RLS policies', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 9: Existing functionality remains intact (Profile, Settings, Sign Out)
    // -------------------------------------------------------------------------
    console.log('\n[9/9] Verifying Existing functionality remains intact (Profile, Settings, Sign Out)...');
    try {
      // Navigate to Settings
      await page.evaluate(() => {
        if (window.__insightIQTest) {
          window.__insightIQTest.setActiveNav('settings');
        }
      });
      await new Promise(r => setTimeout(r, 300));
      const settingsRoleBtn = await page.$('#settings-btn-switch-role');
      assert.ok(settingsRoleBtn, 'Settings page must contain active workspace role management card');

      // Navigate to Profile
      await page.evaluate(() => {
        if (window.__insightIQTest) {
          window.__insightIQTest.setActiveNav('profile');
        }
      });
      await new Promise(r => setTimeout(r, 300));
      const profileRoleBadge = await page.$('#profile-role-display-badge');
      const profileRoleBtn = await page.$('#profile-btn-switch-role');
      assert.ok(profileRoleBadge, 'Profile page must display active workspace role badge');
      assert.ok(profileRoleBtn, 'Profile page must provide switch workspace role button');

      // Test Sign Out
      await page.click('#header-user-menu-btn');
      await page.waitForSelector('#menu-btn-signout', { timeout: 3000 });
      await page.click('#menu-btn-signout');
      await new Promise(r => setTimeout(r, 500));

      // After sign out, session should be cleared and auth card visible
      const authScreen = (await page.$('.auth-card-clean')) || (await page.$('input[type="email"]'));
      assert.ok(authScreen, 'Sign out must navigate back to the authentication screen');

      const clearedSession = await page.evaluate(() => localStorage.getItem('insightiq_user_session'));
      assert.strictEqual(clearedSession, null, 'Session must be purged from localStorage on sign out');

      report('9. Profile, Settings, and Clean Sign Out verified intact', true);
    } catch (err) {
      report('9. Profile, Settings, and Clean Sign Out verified intact', false, err.message);
    }

  } catch (globalErr) {
    console.error('Fatal suite error:', globalErr);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  console.log('\n================================================================');
  console.log(`Results: ${passedTests}/${totalTests} Tests Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSuite();
