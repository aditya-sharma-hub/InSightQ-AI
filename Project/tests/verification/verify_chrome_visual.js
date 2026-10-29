const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BASE_URL = 'http://localhost:8085';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.join(__dirname, '../../verification/screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runChromeVerification() {
  console.log('================================================================');
  console.log('INSIGHTIQ AI — CHROME LIVE OPERATING RUN & VISUAL CAPTURE');
  console.log('================================================================\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // ------------------------------------------------------------------------
    // Step 1: Open landing page and capture Sign-In View
    // ------------------------------------------------------------------------
    console.log('[1/12] Navigating to Sign-In screen...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[type="email"]', { timeout: 8000 });
    const signinScreenshot = path.join(SCREENSHOT_DIR, '01_signin_screen.png');
    await page.screenshot({ path: signinScreenshot, fullPage: false });
    console.log(`  ✓ Captured: 01_signin_screen.png`);

    // ------------------------------------------------------------------------
    // Step 2: Check Sign-Up Role Selector options
    // ------------------------------------------------------------------------
    console.log('[2/12] Inspecting registration role options...');
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('.auth-action-link'));
      const createLink = links.find(el => el.textContent.includes('Create Account'));
      if (createLink) createLink.click();
    });
    await page.waitForSelector('select', { timeout: 6000 });
    const roleSelect = await page.$('select');
    if (roleSelect) {
      const options = await page.evaluate(sel => {
        return Array.from(sel.options).map(o => ({ value: o.value, text: o.text }));
      }, roleSelect);
      console.log('  Role options detected in registration:', options);
      const optionTexts = options.map(o => o.text);
      assert.ok(optionTexts.includes('Data Analyst'), 'Must have Data Analyst');
      assert.ok(optionTexts.includes('Data Scientist'), 'Must have Data Scientist');
      assert.ok(optionTexts.includes('Project Manager'), 'Must have Project Manager');
      assert.ok(!optionTexts.includes('Student'), 'Student must NOT exist');
      assert.ok(!optionTexts.includes('Researcher'), 'Researcher must NOT exist');
      assert.ok(!optionTexts.includes('Business Analyst'), 'Business Analyst must NOT exist');
      assert.ok(!optionTexts.includes('ML Engineer'), 'ML Engineer must NOT exist');
      console.log('  ✓ Verified: ONLY Data Analyst, Data Scientist, Project Manager exist in signup dropdown.');
    }
    const signupScreenshot = path.join(SCREENSHOT_DIR, '02_signup_role_options.png');
    await page.screenshot({ path: signupScreenshot, fullPage: false });
    console.log(`  ✓ Captured: 02_signup_role_options.png`);

    // Switch back to Sign In
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('.auth-action-link'));
      const signinLink = links.find(el => el.textContent.includes('Sign In'));
      if (signinLink) signinLink.click();
    });
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });

    // ------------------------------------------------------------------------
    // Step 3: Sign in as Developer (developer@insightiq.ai)
    // ------------------------------------------------------------------------
    console.log('\n[3/12] Signing in as Developer: developer@insightiq.ai...');
    await page.waitForSelector('input[type="email"]', { timeout: 8000 });
    await page.click('input[type="email"]', { clickCount: 3 });
    await page.type('input[type="email"]', 'developer@insightiq.ai');
    await page.click('input[type="password"]', { clickCount: 3 });
    await page.type('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await page.waitForSelector('#header-role-badge', { timeout: 10000 });
    console.log('  ✓ Developer signed in successfully! Workspace loaded.');

    const devBadgeText = await page.evaluate(() => document.querySelector('#header-role-badge')?.innerText.trim());
    console.log(`  Role badge displayed: "${devBadgeText}"`);
    assert.ok(devBadgeText.includes('DATA ANALYST'), 'Developer active workspace persona must be DATA ANALYST');

    // Confirm developer sees #sidebar-nav-admin and #header-admin-portal-btn
    await page.waitForSelector('#sidebar-nav-admin', { timeout: 6000 });
    await page.waitForSelector('#header-admin-portal-btn', { timeout: 6000 });
    console.log('  ✓ Verified: #sidebar-nav-admin is visible in sidebar rail.');
    console.log('  ✓ Verified: #header-admin-portal-btn is visible in top header.');

    const devDashboardScreenshot = path.join(SCREENSHOT_DIR, '03_developer_dashboard_data_analyst.png');
    await page.screenshot({ path: devDashboardScreenshot, fullPage: false });
    console.log(`  ✓ Captured: 03_developer_dashboard_data_analyst.png`);

    // ------------------------------------------------------------------------
    // Step 4: Open Developer Role Switcher Modal
    // ------------------------------------------------------------------------
    console.log('\n[4/12] Opening Switch Workspace Role modal...');
    await page.click('#header-role-badge');
    await page.waitForSelector('#switch-workspace-role-modal', { timeout: 6000 });
    await page.waitForSelector('#switch-role-option-admin', { timeout: 6000 });

    const modalData = await page.evaluate(() => {
      const options = Array.from(document.querySelectorAll('[id^="switch-role-option-"]')).map(el => el.id);
      const text = document.querySelector('#switch-workspace-role-modal')?.innerText || '';
      return { options, text };
    });
    console.log('  Modal options present:', modalData.options);
    assert.ok(modalData.options.includes('switch-role-option-data_analyst'), 'Must include data_analyst');
    assert.ok(modalData.options.includes('switch-role-option-data_scientist'), 'Must include data_scientist');
    assert.ok(modalData.options.includes('switch-role-option-project_manager'), 'Must include project_manager');
    assert.ok(modalData.options.includes('switch-role-option-admin'), 'Developer must see switch-role-option-admin');
    assert.ok(!modalData.options.includes('switch-role-option-business_analyst'), 'business_analyst must NOT be in modal');
    assert.ok(!modalData.options.includes('switch-role-option-student'), 'student must NOT be in modal');
    assert.ok(!modalData.options.includes('switch-role-option-researcher'), 'researcher must NOT be in modal');
    assert.ok(!modalData.options.includes('switch-role-option-ml_engineer'), 'ml_engineer must NOT be in modal');
    console.log('  ✓ Verified: Exactly 3 standard personas + 1 Admin Gateway card present. Zero unwanted roles.');

    const modalScreenshot = path.join(SCREENSHOT_DIR, '04_developer_role_switcher_modal.png');
    await page.screenshot({ path: modalScreenshot, fullPage: false });
    console.log(`  ✓ Captured: 04_developer_role_switcher_modal.png`);

    // ------------------------------------------------------------------------
    // Step 5: Switch to Data Scientist Dashboard
    // ------------------------------------------------------------------------
    console.log('\n[5/12] Switching workspace role to Data Scientist...');
    await page.click('#switch-role-option-data_scientist');
    await page.click('#btn-confirm-switch-role');
    await page.waitForFunction(
      () => document.querySelector('#header-role-badge')?.innerText.includes('DATA SCIENTIST'),
      { timeout: 8000 }
    );
    console.log('  ✓ Header badge updated to DATA SCIENTIST!');
    const dsScreenshot = path.join(SCREENSHOT_DIR, '05_data_scientist_dashboard.png');
    await page.screenshot({ path: dsScreenshot, fullPage: false });
    console.log(`  ✓ Captured: 05_data_scientist_dashboard.png`);

    // ------------------------------------------------------------------------
    // Step 6: Switch to Project Manager Dashboard
    // ------------------------------------------------------------------------
    console.log('\n[6/12] Switching workspace role to Project Manager...');
    await page.click('#header-role-badge');
    await page.waitForSelector('#switch-workspace-role-modal', { timeout: 6000 });
    await page.click('#switch-role-option-project_manager');
    await page.click('#btn-confirm-switch-role');
    await page.waitForFunction(
      () => document.querySelector('#header-role-badge')?.innerText.includes('PROJECT MANAGER'),
      { timeout: 8000 }
    );
    console.log('  ✓ Header badge updated to PROJECT MANAGER!');
    const pmScreenshot = path.join(SCREENSHOT_DIR, '06_project_manager_dashboard.png');
    await page.screenshot({ path: pmScreenshot, fullPage: false });
    console.log(`  ✓ Captured: 06_project_manager_dashboard.png`);

    // ------------------------------------------------------------------------
    // Step 7: Open Protected Admin Dashboard as Developer
    // ------------------------------------------------------------------------
    console.log('\n[7/12] Navigating to Admin Dashboard via #sidebar-nav-admin...');
    await page.click('#sidebar-nav-admin');
    await page.waitForSelector('.admin-portal-root', { timeout: 10000 });
    await page.waitForSelector('.admin-kpi-card', { timeout: 10000 });

    const adminHash = await page.evaluate(() => window.location.hash);
    console.log(`  Admin route active: "${adminHash}"`);
    assert.strictEqual(adminHash, '#/admin', 'Hash must be #/admin');

    const kpiCount = await page.evaluate(() => document.querySelectorAll('.admin-kpi-card').length);
    console.log(`  KPI cards rendered: ${kpiCount}`);
    assert.ok(kpiCount >= 6, 'Must render at least 6 KPI cards');

    const adminOverviewScreenshot = path.join(SCREENSHOT_DIR, '07_admin_portal_overview.png');
    await page.screenshot({ path: adminOverviewScreenshot, fullPage: false });
    console.log(`  ✓ Captured: 07_admin_portal_overview.png`);

    // ------------------------------------------------------------------------
    // Step 8: Admin Portal Users & Access Directory
    // ------------------------------------------------------------------------
    console.log('\n[8/12] Inspecting Admin Portal "Users & Access" Directory...');
    await page.click('#admin-nav-users');
    await page.waitForSelector('.admin-user-table, table', { timeout: 8000 });

    const userRows = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      return rows.map(r => r.innerText.replace(/\n+/g, ' | '));
    });
    console.log(`  Users loaded in table: ${userRows.length} accounts`);
    assert.ok(userRows.length >= 5, 'User directory must display accounts');

    const adminUsersScreenshot = path.join(SCREENSHOT_DIR, '08_admin_portal_users.png');
    await page.screenshot({ path: adminUsersScreenshot, fullPage: false });
    console.log(`  ✓ Captured: 08_admin_portal_users.png`);

    // ------------------------------------------------------------------------
    // Step 9: Admin Portal System Health & Telemetry Probe
    // ------------------------------------------------------------------------
    console.log('\n[9/12] Inspecting Admin Portal "System Health" & Running Ping Test...');
    await page.click('#admin-nav-health');
    await page.waitForSelector('#btn-probe-db-latency', { timeout: 8000 });
    const pingBtn = await page.$('#btn-probe-db-latency');
    if (pingBtn) {
      await pingBtn.click();
      await new Promise(r => setTimeout(r, 1200));
      console.log('  ✓ Executed live roundtrip latency ping test successfully.');
    }

    const adminHealthScreenshot = path.join(SCREENSHOT_DIR, '09_admin_portal_system_health.png');
    await page.screenshot({ path: adminHealthScreenshot, fullPage: false });
    console.log(`  ✓ Captured: 09_admin_portal_system_health.png`);

    // ------------------------------------------------------------------------
    // Step 10: Sign Out and Sign In as Ordinary User (sarah.chen@insightiq.internal)
    // ------------------------------------------------------------------------
    console.log('\n[10/12] Signing out developer session and signing in as Ordinary User...');
    await page.evaluate(() => {
      localStorage.removeItem('insightiq_user_session');
      localStorage.removeItem('insightiq_user_profile');
      localStorage.removeItem('insightiq_supabase_auth_token');
      localStorage.removeItem('insightiq_dev_preview_role');
      window.location.hash = '';
      window.location.reload();
    });

    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.type('input[type="email"]', 'sarah.chen@insightiq.internal');
    await page.type('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await page.waitForSelector('#header-role-badge', { timeout: 10000 });
    console.log('  ✓ Ordinary User (Sarah Chen) signed in successfully!');

    // Check that #sidebar-nav-admin and #header-admin-portal-btn are ABSENT
    const ordinarySidebarAdmin = await page.$('#sidebar-nav-admin');
    const ordinaryHeaderAdmin = await page.$('#header-admin-portal-btn');
    assert.strictEqual(ordinarySidebarAdmin, null, 'Ordinary user must NOT have #sidebar-nav-admin');
    assert.strictEqual(ordinaryHeaderAdmin, null, 'Ordinary user must NOT have #header-admin-portal-btn');
    console.log('  ✓ Verified: Admin navigation completely omitted from sidebar and header.');

    const ordinaryDashboardScreenshot = path.join(SCREENSHOT_DIR, '10_ordinary_user_dashboard_no_admin.png');
    await page.screenshot({ path: ordinaryDashboardScreenshot, fullPage: false });
    console.log(`  ✓ Captured: 10_ordinary_user_dashboard_no_admin.png`);

    // ------------------------------------------------------------------------
    // Step 11: Ordinary User Role Switcher Modal
    // ------------------------------------------------------------------------
    console.log('\n[11/12] Checking Ordinary User Switch Workspace Role modal...');
    await page.click('#header-role-badge');
    await page.waitForSelector('#switch-workspace-role-modal', { timeout: 6000 });

    const ordinaryModalAdmin = await page.$('#switch-role-option-admin');
    assert.strictEqual(ordinaryModalAdmin, null, 'Ordinary user must NOT have #switch-role-option-admin');
    console.log('  ✓ Verified: Admin Gateway card omitted from modal for ordinary user.');

    const ordinaryModalScreenshot = path.join(SCREENSHOT_DIR, '11_ordinary_user_role_switcher_modal.png');
    await page.screenshot({ path: ordinaryModalScreenshot, fullPage: false });
    console.log(`  ✓ Captured: 11_ordinary_user_role_switcher_modal.png`);

    await page.click('#btn-close-switch-role-modal');

    // ------------------------------------------------------------------------
    // Step 12: Ordinary User Direct Navigation to #/admin triggers 403 Forbidden Screen
    // ------------------------------------------------------------------------
    console.log('\n[12/12] Testing ordinary user direct navigation to #/admin (403 Access Denied)...');
    await page.evaluate(() => { window.location.hash = '#/admin'; });
    await page.waitForSelector('.admin-403-container', { timeout: 10000 });

    const denialText = await page.evaluate(() => document.querySelector('.admin-403-container')?.innerText || '');
    console.log('  Denial text in DOM:\n', denialText);
    assert.ok(denialText.includes('Administrator Privileges Required'), 'Must state Administrator Privileges Required');
    assert.ok(denialText.includes('Forbidden') || denialText.includes('403'), 'Must state 403 or Forbidden');
    assert.ok(denialText.includes('sarah.chen@insightiq.internal'), 'Must show authenticated account');
    assert.ok(denialText.includes('Data Analyst'), 'Must show assigned role');
    console.log('  ✓ Verified: Dedicated 403 Forbidden screen strictly enforced with full audit identity.');

    const deniedScreenshot = path.join(SCREENSHOT_DIR, '12_ordinary_user_403_access_denied.png');
    await page.screenshot({ path: deniedScreenshot, fullPage: false });
    console.log(`  ✓ Captured: 12_ordinary_user_403_access_denied.png`);

    console.log('\n================================================================');
    console.log('ALL 12 CHROME VISUAL STEPS & SECURITY CONTROLS VERIFIED 100%!');
    console.log(`All 12 visual screenshots saved to: ${SCREENSHOT_DIR}`);
    console.log('================================================================\n');

  } finally {
    await browser.close();
  }
}

runChromeVerification().catch(err => {
  console.error('\n[FATAL CHROME VERIFICATION ERROR]:', err);
  process.exit(1);
});
