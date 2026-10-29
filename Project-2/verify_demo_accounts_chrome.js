/**
 * Chrome Verification Script: Audit Demo Accounts in Admin User Management
 * Captures live browser screenshots and verifies UI labeling for demo accounts.
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

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

async function runAudit() {
  const screenshotsDir = path.resolve(__dirname, 'verification_screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const launchOptions = {
    headless: 'new',
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,950']
  };

  console.log('Launching browser with Chrome path:', CHROME_PATH || 'Bundled Chromium');
  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 950 });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error(`[BROWSER ERROR] ${msg.text()}`);
    }
  });

  try {
    // 1. Seed session as Developer / Administrator Account
    console.log('[1/4] Seeding authenticated developer/admin session...');
    await seedSession(page, {
      id: 'mock-admin-id-001',
      email: 'admin@insightiq.internal',
      full_name: 'System Administrator (Test)',
      role: 'Administrator',
      token: 'mock-admin-token'
    });

    // 2. Navigate to Admin Users page
    console.log('[2/4] Navigating to #/admin/users...');
    await page.evaluate(() => { window.location.hash = '#/admin/users'; });
    await page.waitForSelector('#admin-users-view', { timeout: 10000 });
    await page.waitForSelector('.admin-users-table tbody tr', { timeout: 10000 });
    await page.waitForFunction(() => document.querySelectorAll('.admin-users-table tbody tr').length >= 8, { timeout: 8000 });

    // Verify UI components on the main table view
    const auditInfo = await page.evaluate(() => {
      const statChips = Array.from(document.querySelectorAll('.admin-stat-chip')).map(el => el.textContent.trim());
      const bannerText = document.querySelector('#admin-users-phase2-banner')?.textContent.trim() || '';
      const rows = Array.from(document.querySelectorAll('.admin-users-table tbody tr')).map(r => ({
        name: r.querySelector('.admin-user-display-name')?.textContent.trim(),
        email: r.querySelector('.admin-email-cell')?.textContent.trim(),
        role: r.querySelector('.admin-role-badge')?.textContent.trim(),
        persona: r.querySelector('.admin-persona-tag')?.textContent.trim(),
        hasDemoTag: Boolean(r.querySelector('.admin-demo-tag'))
      }));
      return { statChips, bannerText, rows };
    });

    console.log('\n--- Live Page Audit Results ---');
    console.log('Stat Chips:', auditInfo.statChips);
    console.log('Banner text excerpt:', auditInfo.bannerText.substring(0, 160) + '...');
    console.log(`Found ${auditInfo.rows.length} rows in users table:`);
    auditInfo.rows.forEach((r, idx) => {
      console.log(`  [${idx + 1}] ${r.name} | Role: ${r.role} | Persona: ${r.persona} | HasDemoTag: ${r.hasDemoTag}`);
    });

    // Capture main table screenshot
    const mainScreenshotPath = path.join(screenshotsDir, 'admin_users_demo_audited.png');
    await page.screenshot({ path: mainScreenshotPath, fullPage: false });
    console.log(`\nScreenshot saved: ${mainScreenshotPath}`);

    // 3. Open User Detail Drawer for Dr. Alex Rivera
    console.log('\n[3/4] Inspecting access drawer for Dr. Alex Rivera (#btn-inspect-user-sci-alex)...');
    await page.click('#btn-inspect-user-sci-alex');
    await page.waitForSelector('#admin-user-detail-modal', { timeout: 6000 });
    await page.waitForSelector('.admin-drawer-field', { timeout: 6000 });

    const drawerInfo = await page.evaluate(() => {
      const name = document.querySelector('.admin-drawer-name')?.textContent.trim();
      const fields = Array.from(document.querySelectorAll('.admin-drawer-field')).map(f => ({
        label: f.querySelector('.admin-drawer-label')?.textContent.trim(),
        value: f.querySelector('.admin-drawer-value')?.textContent.trim()
      }));
      return { name, fields };
    });

    console.log('Drawer inspect target:', drawerInfo.name);
    console.log('Drawer fields:', drawerInfo.fields);

    // Capture drawer screenshot
    const drawerScreenshotPath = path.join(screenshotsDir, 'admin_user_drawer_demo_audited.png');
    await page.screenshot({ path: drawerScreenshotPath, fullPage: false });
    console.log(`Screenshot saved: ${drawerScreenshotPath}`);

    // 4. Also inspect Elena Rostova to ensure @data_analyst is displayed
    console.log('\n[4/4] Verifying Elena Rostova drawer and closing...');
    await page.click('#btn-close-user-drawer');
    await page.waitForFunction(() => !document.querySelector('#admin-user-detail-modal'), { timeout: 4000 });

    await page.click('#btn-inspect-user-ba-elena');
    await page.waitForSelector('#admin-user-detail-modal', { timeout: 6000 });

    const elenaDrawerInfo = await page.evaluate(() => {
      const personaSection = document.querySelector('.admin-drawer-section:nth-of-type(3)')?.textContent.trim();
      return personaSection;
    });
    console.log('Elena Rostova Persona section:', elenaDrawerInfo);

    console.log('\n================================================================');
    console.log('CHROME VERIFICATION COMPLETE — All evidence captured successfully!');
    console.log('================================================================');

  } finally {
    await browser.close();
  }
}

runAudit().catch(err => {
  console.error('[FATAL]:', err);
  process.exit(1);
});
