/**
 * InsightIQ AI — Live Chrome Verification: Standalone Header Admin Button Removal
 *
 * Requirements:
 * 1. The standalone Admin Dashboard button is absent from the top navigation.
 * 2. Clicking the role selector still opens the full modal.
 * 3. The Admin Dashboard card and Open Dashboard button remain visible inside the modal.
 * 4. Open Dashboard still opens the protected Admin Dashboard for an authorized administrator.
 * 5. The header remains correctly aligned at desktop and narrow viewport widths.
 * 6. Capture screenshots of the updated header and open modal.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8085';
const CHROME_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const screenshotsDir = path.join(__dirname, 'verification_screenshots');
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
  console.log('CHROME VERIFICATION: REMOVE ONLY HEADER ADMIN DASHBOARD BUTTON');
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
    // STEP 1: Verify Standalone Admin Button Absent From Top Header Navigation
    // ------------------------------------------------------------------------
    console.log('--- STEP 1: Standalone Header Admin Button Absence Check ---');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });

    await seedUser(page, {
      email: '123.321aditya@gmail.com',
      role: 'Data Analyst',
      full_name: 'Aditya (Developer)',
      token: 'mock-dev-token'
    });

    // 1a. Assert #header-admin-portal-btn does not exist anywhere in header
    const headerAdminBtn = await page.$('#header-admin-portal-btn');
    assert.strictEqual(headerAdminBtn, null, 'Standalone #header-admin-portal-btn must be completely absent from header');

    // 1b. Verify role badge is present in header
    const roleBadge = await page.$('#header-role-badge');
    assert.ok(roleBadge, '#header-role-badge must remain present in header');

    // 1c. Capture header screenshot
    await page.waitForSelector('header.app-header', { timeout: 5000 });
    const headerEl = await page.$('header.app-header');
    const headerScreenshot = path.join(screenshotsDir, 'header_without_admin_btn.png');
    await headerEl.screenshot({ path: headerScreenshot });
    report(1, `Standalone Admin Dashboard button absent from header. Screenshot: ${headerScreenshot}`, true);

    // ------------------------------------------------------------------------
    // STEP 2: Header Alignment & Responsiveness Across Viewports
    // ------------------------------------------------------------------------
    console.log('\n--- STEP 2: Header Layout & Alignment Across Viewports ---');
    for (const vp of [{ w: 1440, h: 900, name: 'Desktop' }, { w: 768, h: 1024, name: 'Tablet' }, { w: 375, h: 667, name: 'Mobile' }]) {
      await page.setViewport({ width: vp.w, height: vp.h });
      await new Promise(r => setTimeout(r, 200));

      const headerLayout = await page.evaluate(() => {
        const header = document.querySelector('header.app-header');
        if (!header) return null;
        const rect = header.getBoundingClientRect();
        const roleBtn = document.querySelector('#header-role-badge');
        const roleRect = roleBtn ? roleBtn.getBoundingClientRect() : null;
        const standaloneBtn = document.querySelector('#header-admin-portal-btn');
        return {
          headerWidth: rect.width,
          roleVisible: Boolean(roleRect && roleRect.width > 0),
          standaloneBtnPresent: Boolean(standaloneBtn),
          noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth
        };
      });

      assert.ok(headerLayout.roleVisible, `Role selector must be visible on ${vp.name}`);
      assert.strictEqual(headerLayout.standaloneBtnPresent, false, `Admin button must be absent on ${vp.name}`);
      assert.ok(headerLayout.noHorizontalOverflow, `No horizontal scroll overflow on ${vp.name}`);
      console.log(`  ✓ Header verified aligned and responsive on ${vp.name} (${vp.w}px)`);
    }
    report(2, 'Header remains correctly aligned with zero overflow across Desktop, Tablet, and Mobile', true);

    // Reset viewport to desktop
    await page.setViewport({ width: 1440, height: 900 });
    await new Promise(r => setTimeout(r, 200));

    // ------------------------------------------------------------------------
    // STEP 3: Clicking Role Selector Opens Full Modal
    // ------------------------------------------------------------------------
    console.log('\n--- STEP 3: Role Selector Opens Full Modal ---');
    await page.click('#header-role-badge');
    await page.waitForSelector('#switch-workspace-role-modal', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 400));

    const modalData = await page.evaluate(() => {
      const modal = document.querySelector('#switch-workspace-role-modal');
      const title = modal?.querySelector('h3')?.textContent.trim();
      const subtitle = modal?.querySelector('p')?.textContent.trim();
      const hasAnalyst = Boolean(document.querySelector('#switch-role-option-data_analyst'));
      const hasScientist = Boolean(document.querySelector('#switch-role-option-data_scientist'));
      const hasPm = Boolean(document.querySelector('#switch-role-option-project_manager'));
      const hasBa = Boolean(document.querySelector('#switch-role-option-business_analyst'));
      const hasAdminCard = Boolean(document.querySelector('#switch-role-option-admin'));
      const verifiedBadge = Boolean(document.querySelector('.admin-portal-verified-badge'));
      const openAdminBtn = Boolean(document.querySelector('#btn-open-admin-portal'));

      return {
        title,
        subtitle,
        hasAnalyst,
        hasScientist,
        hasPm,
        hasBa,
        hasAdminCard,
        verifiedBadge,
        openAdminBtn
      };
    });

    assert.strictEqual(modalData.title, 'Switch Workspace Role', 'Modal title must be Switch Workspace Role');
    assert.strictEqual(modalData.subtitle, 'Change your active workspace persona without admin intervention.');
    assert.ok(modalData.hasAnalyst, 'Data Analyst card must exist in modal');
    assert.ok(modalData.hasScientist, 'Data Scientist card must exist in modal');
    assert.ok(modalData.hasPm, 'Project Manager card must exist in modal');
    assert.strictEqual(modalData.hasBa, false, 'Business Analyst must NOT be in modal');
    assert.ok(modalData.hasAdminCard, 'Separate Admin Dashboard card must remain in modal');
    assert.ok(modalData.verifiedBadge, 'Verified Admin badge must exist in Admin card');
    assert.ok(modalData.openAdminBtn, 'Open Dashboard button must exist in Admin card');

    const modalScreenshot = path.join(screenshotsDir, 'modal_with_admin_card_verified.png');
    await page.screenshot({ path: modalScreenshot });
    report(3, `Full modal verified with all 3 personas and separate Admin card. Screenshot: ${modalScreenshot}`, true);

    // ------------------------------------------------------------------------
    // STEP 4: "Open Dashboard →" Button Opens Protected Admin Dashboard
    // ------------------------------------------------------------------------
    console.log('\n--- STEP 4: "Open Dashboard →" Navigation Verification ---');
    await page.click('#btn-open-admin-portal');
    await page.waitForSelector('.admin-portal-root', { timeout: 8000 });
    await page.waitForSelector('.admin-kpi-card', { timeout: 8000 });

    const currentHash = await page.evaluate(() => window.location.hash);
    assert.strictEqual(currentHash, '#/admin', 'URL hash must be #/admin');

    const adminPortalState = await page.evaluate(() => {
      const brand = document.querySelector('.admin-brand-title')?.textContent.trim() || '';
      const root = Boolean(document.querySelector('.admin-portal-root'));
      const kpis = document.querySelectorAll('.admin-kpi-card').length;
      return { brand, root, kpis };
    });
    assert.ok(adminPortalState.root, 'Admin portal root element must exist');
    assert.ok(adminPortalState.kpis > 0, 'Admin portal KPI cards must render');

    report(4, 'Clicking "Open Dashboard →" inside modal successfully opens protected Admin Dashboard', true);

    // ------------------------------------------------------------------------
    // STEP 5: Zero Unexpected Console Errors
    // ------------------------------------------------------------------------
    console.log('\n--- STEP 5: Console Error Hygiene ---');
    assert.strictEqual(consoleErrors.length, 0, `Must have 0 unexpected console errors, got: ${consoleErrors.join(' | ')}`);
    report(5, 'Zero unexpected runtime console errors detected', true);

    console.log('\n================================================================');
    console.log(`ALL ${totalTests} TESTS PASSED — STANDALONE HEADER BUTTON REMOVED & VERIFIED!`);
    console.log('================================================================');

  } finally {
    await browser.close();
  }
})();
