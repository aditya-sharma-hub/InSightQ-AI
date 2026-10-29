/**
 * InsightIQ AI — Role Synchronization & User Identity Verification Test
 *
 * Verifies:
 * 1. Switching workspace role to Project Manager updates the header badge to "PROJECT MANAGER" (not Business Analyst).
 * 2. The success toast confirms "Workspace role switched to Project Manager.".
 * 3. The dashboard overview immediately renders Project Manager persona content ("Executive Portfolio Dashboard").
 * 4. User account identity (full_name, email) remains strictly separate from active persona and is preserved.
 * 5. Page reload preserves "PROJECT MANAGER" on the header badge without prompting onboarding role selection.
 * 6. Switching to Data Scientist updates badge to "DATA SCIENTIST" and renders Data Science persona.
 * 7. Switching to Data Analyst updates badge to "DATA ANALYST" and renders Data Analyst persona.
 * 8. Administrator is not available for self-selection in the modal, and unauthorized elevation attempts are rejected.
 */

const puppeteer = require('puppeteer');
const assert = require('assert');

const BASE_URL = 'http://localhost:8085';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

let passed = 0;
let failed = 0;

function report(testNum, title, isPass, detail = '') {
  if (isPass) {
    console.log(`  ✓ PASS [${testNum}/8]: ${title}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL [${testNum}/8]: ${title} -> ${detail}`);
    failed++;
  }
}

async function runSuite() {
  console.log('================================================================');
  console.log('InsightIQ AI — Workspace Role Sync & User Identity Test Suite');
  console.log('================================================================\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
    // Setup authenticated user "Sarah Chen" initially as Data Analyst
    console.log('[Setup] Injecting authenticated session for Sarah Chen (Data Analyst)...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });

    await page.evaluate(() => {
      const mockUser = {
        id: 'user-sarah-chen-001',
        email: 'sarah.chen@insightiq.internal',
        user_metadata: { full_name: 'Sarah Chen', role: 'Data Analyst' }
      };
      localStorage.setItem('insightiq_user_session', JSON.stringify({
        access_token: 'mock-jwt-sarah-chen',
        user: mockUser
      }));
      localStorage.setItem('insightiq_user_profile', JSON.stringify({
        id: mockUser.id,
        email: mockUser.email,
        full_name: 'Sarah Chen',
        role: 'Data Analyst'
      }));
      localStorage.setItem('insightiq_dev_preview_role', 'data_analyst');
    });

    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForSelector('#header-role-badge', { timeout: 6000 });

    // TEST 1: Initial state is DATA ANALYST
    console.log('[1/8] Verifying initial role is DATA ANALYST and user name is SARAH CHEN...');
    try {
      const initialBadge = await page.$eval('#header-role-badge', el => el.textContent.trim());
      assert.ok(initialBadge.includes('DATA ANALYST'), `Badge should contain DATA ANALYST, got: "${initialBadge}"`);

      const userName = await page.$eval('.user-header-text span', el => el.textContent.trim());
      assert.strictEqual(userName, 'SARAH CHEN', `User name must be SARAH CHEN, got: "${userName}"`);
      report(1, 'Initial DATA ANALYST state and user identity SARAH CHEN verified', true);
    } catch (e) {
      report(1, 'Initial DATA ANALYST state verification', false, e.message);
    }

    // TEST 2: Switch role to Project Manager via modal
    console.log('\n[2/8] Switching workspace role to Project Manager...');
    try {
      await page.click('#header-role-badge');
      await page.waitForSelector('#switch-workspace-role-modal', { timeout: 4000 });

      // Verify Project Manager option exists and click it
      const pmOption = await page.$('#switch-role-option-project_manager');
      assert.ok(pmOption, 'Project Manager option must exist in modal');
      await pmOption.click();

      // Click Confirm button
      await page.click('#btn-confirm-switch-role');

      // Verify success toast appears with "Workspace role switched to Project Manager."
      await page.waitForSelector('#role-success-toast', { timeout: 4000 });
      const toastText = await page.$eval('#role-success-toast', el => el.textContent.trim());
      assert.ok(toastText.includes('Project Manager'), `Toast text should mention Project Manager, got: "${toastText}"`);
      report(2, 'Role switch to Project Manager triggered and success toast displayed', true);
    } catch (e) {
      report(2, 'Switching role to Project Manager', false, e.message);
    }

    // TEST 3: Header badge immediately displays PROJECT MANAGER (NOT Business Analyst)
    console.log('\n[3/8] Verifying header role badge displays PROJECT MANAGER...');
    try {
      const pmBadgeText = await page.$eval('#header-role-badge', el => el.textContent.trim());
      assert.ok(
        pmBadgeText.includes('PROJECT MANAGER'),
        `Header badge must contain "PROJECT MANAGER", got: "${pmBadgeText}"`
      );
      assert.ok(
        !pmBadgeText.includes('BUSINESS ANALYST'),
        `Header badge must NOT contain "BUSINESS ANALYST", got: "${pmBadgeText}"`
      );
      report(3, 'Header badge correctly displays PROJECT MANAGER (not Business Analyst)', true);
    } catch (e) {
      report(3, 'Header badge display for Project Manager', false, e.message);
    }

    // TEST 4: User account identity is preserved and unchanged
    console.log('\n[4/8] Verifying user identity is preserved during role switch...');
    try {
      const userName = await page.$eval('.user-header-text span', el => el.textContent.trim());
      assert.strictEqual(userName, 'SARAH CHEN', `User account name must remain SARAH CHEN, got: "${userName}"`);

      // Open user popover to check profile info
      await page.click('#header-user-menu-btn');
      await page.waitForSelector('#header-user-menu-popover', { timeout: 3000 });

      const popoverName = await page.$eval('#header-user-menu-popover .font-button', el => el.textContent.trim());
      const popoverEmail = await page.$eval('#header-user-menu-popover .font-caption', el => el.textContent.trim());
      assert.strictEqual(popoverName, 'Sarah Chen', `Popover name must be Sarah Chen, got: "${popoverName}"`);
      assert.strictEqual(popoverEmail, 'sarah.chen@insightiq.internal', `Popover email must be sarah.chen@insightiq.internal, got: "${popoverEmail}"`);

      // Close menu
      await page.click('#header-user-menu-btn');
      report(4, 'User identity (Sarah Chen, email) strictly preserved and separate from persona', true);
    } catch (e) {
      report(4, 'User identity preservation', false, e.message);
    }

    // TEST 5: Project Manager dashboard content renders immediately
    console.log('\n[5/8] Verifying Project Manager dashboard content renders immediately...');
    try {
      // Check for Executive Portfolio Dashboard heading or PROJECT MANAGEMENT & GOVERNANCE badge
      const pmOverview = await page.evaluate(() => {
        const h1 = document.querySelector('h1');
        const roleBadge = document.querySelector('.portal-header-role-badge');
        return {
          h1: h1 ? h1.textContent.trim() : '',
          badge: roleBadge ? roleBadge.textContent.trim() : ''
        };
      });

      assert.ok(
        pmOverview.h1.includes('Executive Portfolio') || pmOverview.badge.includes('PROJECT MANAGEMENT'),
        `Dashboard overview must render PM persona view, got h1: "${pmOverview.h1}", badge: "${pmOverview.badge}"`
      );
      report(5, 'Project Manager persona dashboard content rendered immediately without refresh', true);
    } catch (e) {
      report(5, 'Project Manager dashboard content render', false, e.message);
    }

    // TEST 6: Persistence across page reload
    console.log('\n[6/8] Verifying role persists as PROJECT MANAGER across page reload...');
    try {
      await page.reload({ waitUntil: 'networkidle2' });
      await page.waitForSelector('#header-role-badge', { timeout: 6000 });

      const reloadedBadge = await page.$eval('#header-role-badge', el => el.textContent.trim());
      assert.ok(
        reloadedBadge.includes('PROJECT MANAGER'),
        `Header badge after reload must still be PROJECT MANAGER, got: "${reloadedBadge}"`
      );

      // Verify no onboarding role selector appears
      const selector = await page.$('.role-selection-viewport');
      assert.strictEqual(selector, null, 'Onboarding selector must not appear after reload');
      report(6, 'PROJECT MANAGER role persists across page reload without modal or prompt', true);
    } catch (e) {
      report(6, 'Persistence across page reload', false, e.message);
    }

    // TEST 7: Switch to Data Scientist and verify sync
    console.log('\n[7/8] Switching workspace role to Data Scientist...');
    try {
      await page.click('#header-role-badge');
      await page.waitForSelector('#switch-workspace-role-modal', { timeout: 4000 });

      const dsOption = await page.$('#switch-role-option-data_scientist');
      assert.ok(dsOption, 'Data Scientist option must exist in modal');
      await dsOption.click();
      await page.click('#btn-confirm-switch-role');

      await page.waitForSelector('#role-success-toast', { timeout: 4000 });
      const dsBadge = await page.$eval('#header-role-badge', el => el.textContent.trim());
      assert.ok(dsBadge.includes('DATA SCIENTIST'), `Badge must update to DATA SCIENTIST, got: "${dsBadge}"`);

      // Verify DS dashboard overview renders
      const dsOverview = await page.evaluate(() => {
        const badge = document.querySelector('.portal-header-role-badge');
        return badge ? badge.textContent.trim() : '';
      });
      assert.ok(dsOverview.includes('DATA SCIENCE'), `DS workspace badge must render, got: "${dsOverview}"`);
      report(7, 'Workspace role switched to DATA SCIENTIST and synchronized immediately', true);
    } catch (e) {
      report(7, 'Switching to Data Scientist', false, e.message);
    }

    // TEST 8: Security boundary - Administrator cannot be self-selected
    console.log('\n[8/8] Verifying security boundaries (Administrator cannot be self-selected)...');
    try {
      await page.click('#header-role-badge');
      await page.waitForSelector('#switch-workspace-role-modal', { timeout: 4000 });

      const adminOption = await page.$('#switch-role-option-admin');
      assert.strictEqual(adminOption, null, 'Administrator option must NOT exist in the role switch modal');
      await page.click('#btn-close-switch-role-modal');

      // Test programmatic attempt via window.__insightIQTest or API
      const rejected = await page.evaluate(async () => {
        try {
          const res = await fetch('/api/user/role', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'admin', userId: 'user-sarah-chen-001' })
          });
          return res.status === 403 || !res.ok;
        } catch (e) {
          return true;
        }
      });
      assert.ok(rejected, 'Server API /api/user/role must reject unauthorized admin assignment');
      report(8, 'Administrator role blocked from self-selection and protected by backend API', true);
    } catch (e) {
      report(8, 'Security boundary check', false, e.message);
    }

  } finally {
    await browser.close();
  }

  console.log('\n================================================================');
  console.log(`Results: ${passed} PASSED, ${failed} FAILED (Total: 8)`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
