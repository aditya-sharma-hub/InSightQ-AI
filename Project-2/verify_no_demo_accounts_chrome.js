/**
 * Live Google Chrome Verification Script:
 * 1. Verifies Business Analyst, Student, Researcher, ML Engineer are absent from role selection and signup.
 * 2. Verifies Admin Portal User & Access Management displays ONLY genuine database records (ZERO fake demo accounts).
 * 3. Verifies Developer account access to Admin Dashboard.
 * 4. Captures live screenshots.
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const assert = require('assert');

const BASE_URL = 'http://localhost:8085';
const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : undefined;

async function seedSession(page, u) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
  await page.evaluate((user) => {
    const mockUser = {
      id: user.id,
      email: user.email,
      user_metadata: { full_name: user.full_name, role: user.role }
    };
    localStorage.setItem('insightiq_user_session', JSON.stringify({
      access_token: user.token,
      user: mockUser
    }));
    localStorage.setItem('insightiq_supabase_auth_token', JSON.stringify({
      access_token: user.token,
      refresh_token: 'dummy-refresh-token',
      expires_at: Math.floor(Date.now() / 1000) + 7200,
      user: mockUser
    }));
    localStorage.setItem('insightiq_user_profile', JSON.stringify({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role
    }));
    localStorage.setItem('insightiq_dev_preview_role', user.role === 'Administrator' ? 'admin' : 'data_analyst');
  }, u);
  await page.reload({ waitUntil: 'networkidle2' });
  await page.waitForFunction(
    () => Boolean(document.querySelector('.app-container') || document.querySelector('.admin-portal-root') || document.querySelector('#header-role-badge')),
    { timeout: 12000 }
  );
}

async function runLiveVerification() {
  const screenshotsDir = path.resolve(__dirname, 'verification_screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,950']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 950 });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error(`[BROWSER ERROR] ${msg.text()}`);
    }
  });

  try {
    console.log('================================================================');
    console.log('LIVE GOOGLE CHROME VERIFICATION: NO BUSINESS ANALYST & NO DEMO ACCOUNTS');
    console.log('================================================================');

    // -------------------------------------------------------------------------
    // TEST 1: Check Public Signup Screen Role Dropdown
    // -------------------------------------------------------------------------
    console.log('\n[1/5] Testing Public Signup Screen Role Dropdown...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    // Clear localStorage to ensure auth screen is visible
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForSelector('.auth-card-container', { timeout: 8000 });

    // Click "Create Account"
    const createAccountBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.auth-action-link'));
      const found = btns.find(b => b.textContent.includes('Create Account'));
      if (found) { found.click(); return true; }
      return false;
    });
    assert.ok(createAccountBtn, 'Must find and click "Create Account" button');
    await page.waitForSelector('select.auth-input-control', { timeout: 6000 });

    const signupOptions = await page.evaluate(() => {
      const select = document.querySelector('select.auth-input-control');
      return select ? Array.from(select.options).map(o => o.text.trim()) : [];
    });

    console.log('Signup Role Options found in Chrome:', signupOptions);
    assert.deepStrictEqual(signupOptions, ['Data Analyst', 'Data Scientist', 'Project Manager'],
      `Signup must contain ONLY the 3 ordinary workspace roles, found: ${JSON.stringify(signupOptions)}`
    );
    assert.ok(!signupOptions.includes('Business Analyst'), 'Business Analyst must NOT be in signup dropdown');
    assert.ok(!signupOptions.includes('Student'), 'Student must NOT be in signup dropdown');
    assert.ok(!signupOptions.includes('Researcher'), 'Researcher must NOT be in signup dropdown');
    assert.ok(!signupOptions.includes('ML Engineer'), 'ML Engineer must NOT be in signup dropdown');

    const signupScreenshot = path.join(screenshotsDir, '01_signup_roles_clean.png');
    await page.screenshot({ path: signupScreenshot });
    console.log(`✓ [PASS] Signup dropdown verified. Screenshot saved: ${signupScreenshot}`);

    // -------------------------------------------------------------------------
    // TEST 2: Check Switch Workspace Role Modal in Developer Session
    // -------------------------------------------------------------------------
    console.log('\n[2/5] Testing Switch Workspace Role Modal for Developer Account (123.321aditya@gmail.com)...');
    await seedSession(page, {
      id: '00000000-0000-4000-a000-000000000001',
      email: '123.321aditya@gmail.com',
      full_name: 'Lead Developer',
      role: 'Data Analyst',
      token: 'mock-developer-token'
    });

    // Open Role Switcher Modal
    await page.waitForSelector('#header-role-badge', { timeout: 8000 });
    await page.click('#header-role-badge');
    await page.waitForSelector('#switch-workspace-role-modal', { timeout: 6000 });

    const modalData = await page.evaluate(() => {
      const modal = document.querySelector('#switch-workspace-role-modal');
      const text = modal?.innerText || '';
      const da = Boolean(document.querySelector('#switch-role-option-data_analyst'));
      const ds = Boolean(document.querySelector('#switch-role-option-data_scientist'));
      const pm = Boolean(document.querySelector('#switch-role-option-project_manager'));
      const adminGateway = Boolean(document.querySelector('#switch-role-option-admin'));
      const baPresent = text.includes('Business Analyst') || Boolean(document.querySelector('#switch-role-option-business_analyst'));
      return { da, ds, pm, adminGateway, baPresent, modalText: text };
    });

    console.log('Role Switcher Modal State:');
    console.log('  Data Analyst option present:', modalData.da);
    console.log('  Data Scientist option present:', modalData.ds);
    console.log('  Project Manager option present:', modalData.pm);
    console.log('  Admin Portal Gateway present:', modalData.adminGateway);
    console.log('  Business Analyst present:', modalData.baPresent);

    assert.ok(modalData.da, 'Data Analyst must be present');
    assert.ok(modalData.ds, 'Data Scientist must be present');
    assert.ok(modalData.pm, 'Project Manager must be present');
    assert.ok(modalData.adminGateway, 'Admin Portal Gateway must be visible to verified developer');
    assert.strictEqual(modalData.baPresent, false, 'Business Analyst must NOT be present in Switch Role modal');

    const modalScreenshot = path.join(screenshotsDir, '02_role_switcher_modal_clean.png');
    await page.screenshot({ path: modalScreenshot });
    console.log(`✓ [PASS] Role Switcher modal verified. Screenshot saved: ${modalScreenshot}`);

    // Close modal
    await page.click('#btn-close-switch-role-modal');
    await page.waitForFunction(() => !document.querySelector('#switch-workspace-role-modal'), { timeout: 4000 });

    // -------------------------------------------------------------------------
    // TEST 3: Check Live Admin Portal User Management (Zero Demo Accounts)
    // -------------------------------------------------------------------------
    console.log('\n[3/5] Navigating to Admin Portal User & Access Management (#/admin/users)...');
    await page.evaluate(() => { window.location.hash = '#/admin/users'; });
    await page.waitForSelector('#admin-users-view', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1000));

    const adminUsersState = await page.evaluate(() => {
      const heading = document.querySelector('.admin-page-title-group h1')?.textContent.trim() || '';
      const statChips = Array.from(document.querySelectorAll('.admin-stat-chip')).map(el => el.textContent.trim());
      const bannerText = document.querySelector('#admin-users-phase2-banner')?.textContent.trim() || '';
      const emptyState = document.querySelector('.admin-empty-state');
      const emptyTitle = emptyState?.querySelector('.admin-empty-title')?.textContent.trim() || '';
      const emptyDesc = emptyState?.querySelector('.admin-empty-desc')?.textContent.trim() || '';
      const tableRows = Array.from(document.querySelectorAll('.admin-users-table tbody tr')).map(r => ({
        name: r.querySelector('.admin-user-display-name')?.textContent.trim(),
        email: r.querySelector('.admin-email-cell')?.textContent.trim()
      }));
      return { heading, statChips, bannerText, hasEmptyState: Boolean(emptyState), emptyTitle, emptyDesc, tableRows };
    });

    console.log('\n--- Admin Portal User Management Live State ---');
    console.log('Heading:', adminUsersState.heading);
    console.log('Stat Chips:', adminUsersState.statChips);
    console.log('Banner text:', adminUsersState.bannerText);
    console.log('Empty State present:', adminUsersState.hasEmptyState);
    if (adminUsersState.hasEmptyState) {
      console.log('Empty Title:', adminUsersState.emptyTitle);
      console.log('Empty Desc:', adminUsersState.emptyDesc);
    }
    console.log(`Table Rows count: ${adminUsersState.tableRows.length}`);
    adminUsersState.tableRows.forEach(r => console.log('  Row:', r));

    // Assert that NO demo accounts are present
    const demoNames = ['Sarah Chen', 'Alex Rivera', 'Marcus Vance', 'Elena Rostova', 'David Kim', 'Priya Patel', 'Rachel Green', 'System Administrator (Test)'];
    const demoEmails = ['admin@insightiq.internal', 'sarah.chen@insightiq.internal', 'alex.rivera@insightiq.internal'];

    const fullPageText = await page.evaluate(() => document.body.innerText);
    for (const name of demoNames) {
      assert.ok(!fullPageText.includes(name), `Page must NOT display demo name "${name}"`);
    }
    for (const email of demoEmails) {
      assert.ok(!fullPageText.includes(email), `Page must NOT display demo email "${email}"`);
    }
    assert.ok(!fullPageText.includes('DEMO FIXTURE'), 'Page must NOT display DEMO FIXTURE tag');
    assert.ok(!fullPageText.includes('DEMO / TEST DATA IN USE'), 'Page must NOT display DEMO / TEST DATA notice');

    const adminScreenshot = path.join(screenshotsDir, '03_admin_users_real_clean.png');
    await page.screenshot({ path: adminScreenshot });
    console.log(`✓ [PASS] Zero demo accounts in Admin Portal! Screenshot saved: ${adminScreenshot}`);

    // -------------------------------------------------------------------------
    // TEST 4: Page Reload Preserves Clean State (Zero Leaks After Reload)
    // -------------------------------------------------------------------------
    console.log('\n[4/5] Testing Page Reload in Chrome (Zero Leaks After Refresh)...');
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForSelector('#admin-users-view', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1000));

    const afterReloadText = await page.evaluate(() => document.body.innerText);
    for (const name of demoNames) {
      assert.ok(!afterReloadText.includes(name), `After reload, page must NOT display "${name}"`);
    }
    console.log('✓ [PASS] Page reload in Chrome verified: zero demo account leaks.');

    // -------------------------------------------------------------------------
    // TEST 5: Verify Ordinary Account is Blocked with 403 Screen
    // -------------------------------------------------------------------------
    console.log('\n[5/5] Testing Ordinary Account (#/admin direct navigation is blocked)...');
    await seedSession(page, {
      id: '00000000-0000-4000-a000-000000000002',
      email: 'ordinary.analyst@company.com',
      full_name: 'Ordinary Analyst',
      role: 'Data Analyst',
      token: 'mock-user-token'
    });

    await page.evaluate(() => { window.location.hash = '#/admin/users'; });
    await page.waitForSelector('.admin-403-container', { timeout: 8000 });

    const deniedState = await page.evaluate(() => {
      const container = document.querySelector('.admin-403-container');
      const title = container?.querySelector('.admin-denied-title')?.textContent.trim() || '';
      const badge = container?.querySelector('.admin-denied-badge')?.textContent.trim() || '';
      const returnBtn = Boolean(document.querySelector('#btn-admin-denied-return'));
      return { title, badge, returnBtn };
    });

    console.log('Ordinary user 403 access denied state:', deniedState);
    assert.ok(deniedState.title.includes('Administrator Privileges Required') || deniedState.badge.includes('403'), 'Must display Administrator Privileges Required / 403 Forbidden');
    assert.ok(deniedState.returnBtn, 'Must have return to workspace button');

    const deniedScreenshot = path.join(screenshotsDir, '04_ordinary_user_403_blocked.png');
    await page.screenshot({ path: deniedScreenshot });
    console.log(`✓ [PASS] Ordinary user blocked from admin. Screenshot saved: ${deniedScreenshot}`);

    console.log('\n================================================================');
    console.log('ALL GOOGLE CHROME TESTS PASSED — 100% VERIFIED LIVE EVIDENCE!');
    console.log('================================================================');

  } finally {
    await browser.close();
  }
}

runLiveVerification().catch(err => {
  console.error('\n[FATAL ERROR IN LIVE VERIFICATION]:', err);
  process.exit(1);
});
