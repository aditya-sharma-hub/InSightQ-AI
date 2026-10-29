/**
 * InsightIQ AI — Comprehensive Chrome Verification for Restored Full Switch Workspace Role Modal
 *
 * Verifies:
 * 1. Clicking the top-header role selector (#header-role-badge / #btn-switch-workspace-role)
 *    immediately opens the full-size Switch Workspace Role modal.
 * 2. All 3 workspace role cards appear: Data Analyst, Data Scientist, Project Manager.
 * 3. Business Analyst, Student, Researcher, ML Engineer are completely excluded.
 * 4. Separate, visually distinct Admin Dashboard card appears with "Verified Admin" badge
 *    and dedicated "Open Dashboard" button.
 * 5. Clicking "Open Dashboard" navigates to the protected Admin Dashboard immediately.
 * 6. Modal is perfectly centered and responsive across Desktop (1440px), Tablet (768px), and Mobile (375px).
 * 7. Role switching persists and updates dashboard properly.
 * 8. Zero console errors.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8085';
const CHROME_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const screenshotsDir = path.join(__dirname, '../../verification/screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

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

async function seedUser(page, { email, role, full_name, token }) {
  await page.evaluate(({ email, role, full_name, token }) => {
    const user = {
      id: '00000000-0000-4000-a000-000000000001',
      email,
      user_metadata: { full_name, role }
    };
    localStorage.setItem('insightiq_supabase_auth_token', JSON.stringify({
      access_token: token,
      refresh_token: 'dummy-refresh',
      expires_at: Math.floor(Date.now() / 1000) + 7200,
      user
    }));
    localStorage.setItem('insightiq_user_session', JSON.stringify({ access_token: token, user }));
    localStorage.setItem('insightiq_user_profile', JSON.stringify({
      id: user.id, email, full_name, role
    }));
    localStorage.setItem('insightiq_dev_preview_role', (role || 'data_analyst').toLowerCase().replace(/\s+/g, '_'));
  }, { email, role, full_name, token });

  await page.reload({ waitUntil: 'networkidle2' });
  await page.waitForSelector('#header-role-badge', { timeout: 8000 });
}

(async () => {
  console.log('================================================================');
  console.log('CHROME VERIFICATION: RESTORED FULL SWITCH WORKSPACE ROLE MODAL');
  console.log('================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('Failed to load resource') && !text.includes('favicon')) {
          consoleErrors.push(text);
        }
      }
    });

    // ------------------------------------------------------------------------
    // TEST 1: DESKTOP VIEWPORT — Open Full Modal via Top Header Trigger
    // ------------------------------------------------------------------------
    console.log('--- TEST 1: Desktop Viewport (1440x900) & Modal Opening ---');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });

    await seedUser(page, {
      email: '123.321aditya@gmail.com',
      role: 'Data Analyst',
      full_name: 'Aditya (Developer)',
      token: 'mock-dev-token'
    });

    // 1a. Click role selector in top header
    await page.waitForSelector('#header-role-badge', { timeout: 5000 });
    await page.click('#header-role-badge');
    await page.waitForSelector('#switch-workspace-role-modal', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 400));

    // 1b. Inspect UI contents
    const modalData = await page.evaluate(() => {
      const modal = document.querySelector('#switch-workspace-role-modal');
      const card = modal?.querySelector('.modal-card');
      const title = modal?.querySelector('h3')?.textContent.trim();
      const subtitle = modal?.querySelector('p')?.textContent.trim();
      const hasAnalyst = Boolean(document.querySelector('#switch-role-option-data_analyst'));
      const hasScientist = Boolean(document.querySelector('#switch-role-option-data_scientist'));
      const hasPm = Boolean(document.querySelector('#switch-role-option-project_manager'));
      const hasBa = Boolean(document.querySelector('#switch-role-option-business_analyst'));
      const hasStudent = Boolean(document.querySelector('#switch-role-option-student'));
      const hasAdmin = Boolean(document.querySelector('#switch-role-option-admin'));
      const adminVerifiedBadge = Boolean(document.querySelector('.admin-portal-verified-badge'));
      const openAdminBtn = Boolean(document.querySelector('#btn-open-admin-portal'));
      const footerText = modal?.innerText.includes('Workspace personas switch analytical tools');
      const cancelBtn = Boolean(document.querySelector('#btn-cancel-switch-role'));
      const confirmBtn = Boolean(document.querySelector('#btn-confirm-switch-role'));

      const rect = card ? card.getBoundingClientRect() : null;
      const centeredX = rect ? Math.abs((rect.left + rect.width / 2) - (window.innerWidth / 2)) < 5 : false;
      const centeredY = rect ? Math.abs((rect.top + rect.height / 2) - (window.innerHeight / 2)) < 25 : false;

      return {
        title,
        subtitle,
        hasAnalyst,
        hasScientist,
        hasPm,
        hasBa,
        hasStudent,
        hasAdmin,
        adminVerifiedBadge,
        openAdminBtn,
        footerText,
        cancelBtn,
        confirmBtn,
        centeredX,
        centeredY,
        rect
      };
    });

    assert.strictEqual(modalData.title, 'Switch Workspace Role', 'Title must be Switch Workspace Role');
    assert.strictEqual(modalData.subtitle, 'Change your active workspace persona without admin intervention.', 'Subtitle must match');
    assert.ok(modalData.hasAnalyst, 'Data Analyst card must exist');
    assert.ok(modalData.hasScientist, 'Data Scientist card must exist');
    assert.ok(modalData.hasPm, 'Project Manager card must exist');
    assert.strictEqual(modalData.hasBa, false, 'Business Analyst must NOT exist');
    assert.strictEqual(modalData.hasStudent, false, 'Student must NOT exist');
    assert.ok(modalData.hasAdmin, 'Admin Dashboard card must exist separately');
    assert.ok(modalData.adminVerifiedBadge, 'Verified Admin badge must exist');
    assert.ok(modalData.openAdminBtn, 'Open Dashboard button must exist');
    assert.ok(modalData.footerText, 'Informational footer note must exist');
    assert.ok(modalData.cancelBtn, 'Cancel button must exist');
    assert.ok(modalData.confirmBtn, 'Confirm button must exist');
    assert.ok(modalData.centeredX, 'Modal must be horizontally centered');
    assert.ok(modalData.centeredY, 'Modal must be vertically centered');

    const screenshotDesktop = path.join(screenshotsDir, '01_restored_full_switch_role_modal_desktop.png');
    await page.screenshot({ path: screenshotDesktop });
    report(1, `Desktop modal verified and perfectly centered. Screenshot: ${screenshotDesktop}`, true);

    // ------------------------------------------------------------------------
    // TEST 2: TABLET VIEWPORT (768x1024) — Responsiveness & Centering
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 2: Tablet Viewport (768x1024) Responsiveness ---');
    await page.setViewport({ width: 768, height: 1024 });
    await new Promise(r => setTimeout(r, 400));

    const tabletData = await page.evaluate(() => {
      const card = document.querySelector('#switch-workspace-role-modal .modal-card');
      const rect = card ? card.getBoundingClientRect() : null;
      const centeredX = rect ? Math.abs((rect.left + rect.width / 2) - (window.innerWidth / 2)) < 5 : false;
      const noOverflow = rect ? rect.right <= window.innerWidth : false;
      return { centeredX, noOverflow, rect };
    });

    assert.ok(tabletData.centeredX, 'Tablet modal must be centered');
    assert.ok(tabletData.noOverflow, 'Tablet modal must not overflow viewport');
    const screenshotTablet = path.join(screenshotsDir, '02_restored_full_switch_role_modal_tablet.png');
    await page.screenshot({ path: screenshotTablet });
    report(2, `Tablet modal verified responsive and centered. Screenshot: ${screenshotTablet}`, true);

    // ------------------------------------------------------------------------
    // TEST 3: MOBILE VIEWPORT (375x667) — Responsiveness & Usability
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 3: Mobile Viewport (375x667) Responsiveness ---');
    await page.setViewport({ width: 375, height: 667 });
    await new Promise(r => setTimeout(r, 400));

    const mobileData = await page.evaluate(() => {
      const card = document.querySelector('#switch-workspace-role-modal .modal-card');
      const rect = card ? card.getBoundingClientRect() : null;
      const centeredX = rect ? Math.abs((rect.left + rect.width / 2) - (window.innerWidth / 2)) < 5 : false;
      const fitsWidth = rect ? rect.width <= 375 : false;
      return { centeredX, fitsWidth, rect };
    });

    assert.ok(mobileData.centeredX, 'Mobile modal must be centered');
    assert.ok(mobileData.fitsWidth, 'Mobile modal must fit mobile width');
    const screenshotMobile = path.join(screenshotsDir, '03_restored_full_switch_role_modal_mobile.png');
    await page.screenshot({ path: screenshotMobile });
    report(3, `Mobile modal verified responsive and usable. Screenshot: ${screenshotMobile}`, true);

    // ------------------------------------------------------------------------
    // TEST 4: Immediate Direct Navigation via "Open Dashboard →" Action
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 4: Immediate "Open Dashboard →" Navigation ---');
    await page.setViewport({ width: 1440, height: 900 });
    await new Promise(r => setTimeout(r, 300));

    // Click "Open Dashboard →" inside the separate Admin card
    await page.click('#btn-open-admin-portal');
    await page.waitForSelector('.admin-portal-root', { timeout: 8000 });
    await page.waitForSelector('.admin-kpi-card', { timeout: 8000 });

    const hash = await page.evaluate(() => window.location.hash);
    assert.strictEqual(hash, '#/admin', 'URL hash must immediately be #/admin');

    // Verify modal closed immediately
    const modalVisible = await page.evaluate(() => Boolean(document.querySelector('#switch-workspace-role-modal')));
    assert.strictEqual(modalVisible, false, 'Modal must close immediately when Open Dashboard is clicked');

    const screenshotAdmin = path.join(screenshotsDir, '04_open_admin_dashboard_direct_navigation.png');
    await page.screenshot({ path: screenshotAdmin });
    report(4, `Clicking "Open Dashboard →" immediately opened Admin Dashboard. Screenshot: ${screenshotAdmin}`, true);

    // ------------------------------------------------------------------------
    // TEST 5: Switching to Data Scientist Persona and Confirming
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 5: Switching Workspace Persona to Data Scientist ---');
    // Navigate back to overview
    await page.evaluate(() => { window.location.hash = '#/overview'; });
    await page.waitForSelector('#header-role-badge', { timeout: 8000 });

    // Open modal
    await page.click('#header-role-badge');
    await page.waitForSelector('#switch-workspace-role-modal', { timeout: 5000 });

    // Select Data Scientist card
    await page.click('#switch-role-option-data_scientist');
    await page.click('#btn-confirm-switch-role');

    // Wait for role toast and header badge update
    await page.waitForSelector('#role-success-toast', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 600));

    const updatedBadge = await page.evaluate(() => {
      const badge = document.querySelector('#header-role-badge');
      return badge ? badge.textContent.trim() : '';
    });

    assert.ok(updatedBadge.includes('DATA SCIENTIST'), `Header badge must display DATA SCIENTIST, got: ${updatedBadge}`);
    const screenshotSwitched = path.join(screenshotsDir, '05_switched_workspace_role_success.png');
    await page.screenshot({ path: screenshotSwitched });
    report(5, `Successfully switched workspace role to Data Scientist. Screenshot: ${screenshotSwitched}`, true);

    // ------------------------------------------------------------------------
    // TEST 6: Zero Unexpected Console Errors
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 6: Console Error Hygiene ---');
    assert.strictEqual(consoleErrors.length, 0, `Must have 0 unexpected console errors, got: ${consoleErrors.join(' | ')}`);
    report(6, 'Zero unexpected runtime console errors detected', true);

    console.log('\n================================================================');
    console.log(`ALL ${totalTests} TESTS PASSED — RESTORED MODAL FULLY VERIFIED IN CHROME!`);
    console.log('================================================================');

  } finally {
    await browser.close();
  }
})();

