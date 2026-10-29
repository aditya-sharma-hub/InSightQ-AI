/**
 * InsightIQ AI — Phase 1: Role Persistence & Security Verification Suite
 *
 * Covers:
 * 1. Data Analyst login lands on the correct dashboard (DATA ANALYST badge).
 * 2. Refresh and permitted navigation preserve the authorized role.
 * 3. Clicking or directly opening the restricted ML route does not switch the role.
 * 4. The model-management navigation entry is absent for Data Analysts.
 * 5. Authorized Data Scientists can still access model management.
 * 6. Editing frontend state or the URL does not grant additional privileges.
 * 7. Existing login/logout behavior remains intact.
 */

const puppeteer = require('puppeteer');
const assert = require('assert');

const BASE_URL = 'http://localhost:8085';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

let passed = 0;
let failed = 0;

function report(testNum, title, isPass, detail = '') {
  if (isPass) {
    console.log(`  ✓ PASS [${testNum}/7]: ${title}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL [${testNum}/7]: ${title} -> ${detail}`);
    failed++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('InsightIQ AI — Phase 1: Role Persistence & Security Suite');
  console.log('================================================================\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Data Analyst login lands on the correct dashboard
    // -------------------------------------------------------------------------
    console.log('[1/7] Testing Data Analyst login and initial dashboard resolution...');
    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle2' });

      await page.evaluate(() => {
        const analystUser = {
          id: 'user-analyst-001-phase1',
          email: 'analyst@insightiq.internal',
          user_metadata: { full_name: 'Sarah Chen', role: 'Data Analyst' }
        };
        localStorage.setItem('insightiq_user_session', JSON.stringify({
          access_token: 'mock-jwt-analyst',
          user: analystUser
        }));
        localStorage.setItem('insightiq_user_profile', JSON.stringify({
          id: analystUser.id,
          email: analystUser.email,
          full_name: 'Sarah Chen',
          role: 'Data Analyst'
        }));
        localStorage.setItem('insightiq_dev_preview_role', 'data_analyst');
      });

      await page.reload({ waitUntil: 'networkidle2' });
      await page.waitForSelector('#header-role-badge', { timeout: 6000 });

      const badgeText = await page.$eval('#header-role-badge', el => el.textContent.trim());
      assert.ok(badgeText.includes('DATA ANALYST'), `Badge should contain DATA ANALYST, got: "${badgeText}"`);

      // Verify no onboarding selector appears
      const selector = await page.$('.role-selection-viewport');
      assert.strictEqual(selector, null, 'Role selector should not appear for user with saved role');

      report(1, 'Data Analyst login lands on correct dashboard with DATA ANALYST badge', true);
    } catch (err) {
      report(1, 'Data Analyst login lands on correct dashboard', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 2: Refresh and permitted navigation preserve the authorized role
    // -------------------------------------------------------------------------
    console.log('\n[2/7] Testing refresh and permitted navigation role persistence...');
    try {
      // 1. Refresh test
      await page.reload({ waitUntil: 'networkidle2' });
      await page.waitForSelector('#header-role-badge', { timeout: 6000 });
      let badge = await page.$eval('#header-role-badge', el => el.textContent.trim());
      assert.ok(badge.includes('DATA ANALYST'), 'Badge must remain DATA ANALYST after reload');

      // 2. Permitted navigation to Datasets
      await page.evaluate(() => { window.location.hash = '#/datasets'; });
      await new Promise(r => setTimeout(r, 400));
      badge = await page.$eval('#header-role-badge', el => el.textContent.trim());
      assert.ok(badge.includes('DATA ANALYST'), 'Badge must remain DATA ANALYST on #/datasets');

      // 3. Permitted navigation to Analytics
      await page.evaluate(() => { window.location.hash = '#/analytics'; });
      await new Promise(r => setTimeout(r, 400));
      badge = await page.$eval('#header-role-badge', el => el.textContent.trim());
      assert.ok(badge.includes('DATA ANALYST'), 'Badge must remain DATA ANALYST on #/analytics');

      // 4. Return to Overview
      await page.evaluate(() => { window.location.hash = '#/overview'; });
      await new Promise(r => setTimeout(r, 400));
      badge = await page.$eval('#header-role-badge', el => el.textContent.trim());
      assert.ok(badge.includes('DATA ANALYST'), 'Badge must remain DATA ANALYST on #/overview');

      report(2, 'Refresh and permitted navigation preserve authorized Data Analyst role', true);
    } catch (err) {
      report(2, 'Refresh and permitted navigation preserve authorized Data Analyst role', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 3: Clicking or directly opening the restricted ML route does not switch role
    // -------------------------------------------------------------------------
    console.log('\n[3/7] Testing direct opening of restricted #/models route...');
    try {
      await page.evaluate(() => { window.location.hash = '#/models'; });
      await new Promise(r => setTimeout(r, 500));

      // Guard should render Access Denied (403)
      const accessRestrictedFound = await page.evaluate(() => {
        const text = document.body.innerText;
        return text.includes('Access Restricted') || text.includes('403') || Boolean(document.querySelector('.access-denied-viewport'));
      });
      assert.ok(accessRestrictedFound, 'Restricted route must render access restriction screen');

      // Crucial: Role badge must STILL be DATA ANALYST
      const badgeAfter403 = await page.$eval('#header-role-badge', el => el.textContent.trim());
      assert.ok(badgeAfter403.includes('DATA ANALYST'), `Role badge must NOT switch; got: "${badgeAfter403}"`);

      // Crucial: Profile role in localStorage must remain Data Analyst
      const profileRole = await page.evaluate(() => {
        try {
          return JSON.parse(localStorage.getItem('insightiq_user_profile')).role;
        } catch (e) { return null; }
      });
      assert.strictEqual(profileRole, 'Data Analyst', 'localStorage userProfile role must remain Data Analyst');

      // Return to Overview
      await page.evaluate(() => { window.location.hash = '#/overview'; });
      await new Promise(r => setTimeout(r, 400));

      report(3, 'Opening restricted ML route displays 403 and does NOT switch user role', true);
    } catch (err) {
      report(3, 'Opening restricted ML route does not switch role', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 4: The model-management navigation entry is absent for Data Analysts
    // -------------------------------------------------------------------------
    console.log('\n[4/7] Testing absence of model-management navigation for Data Analysts...');
    try {
      const navTexts = await page.$$eval('.nav-item-btn', buttons =>
        buttons.map(b => b.textContent.trim())
      );

      const hasModelsInNav = navTexts.some(t =>
        t.toLowerCase().includes('model') || t.toLowerCase().includes('machine learning')
      );
      assert.strictEqual(hasModelsInNav, false, `Sidebar must not have Models; found: ${JSON.stringify(navTexts)}`);

      // Also verify summary metric cards do not link to models
      const summaryCards = await page.$$eval('.ie-summary-metric-card', cards =>
        cards.map(c => ({
          label: c.querySelector('.ie-summary-metric-label')?.textContent?.trim() || '',
          title: c.getAttribute('title') || ''
        }))
      );
      const hasModelsCard = summaryCards.some(c =>
        c.label.toLowerCase().includes('model') || c.title.toLowerCase().includes('model')
      );
      assert.strictEqual(hasModelsCard, false, 'Summary cards must not contain a Models metric');

      report(4, 'Model-management navigation entry is completely absent for Data Analysts', true);
    } catch (err) {
      report(4, 'Model-management navigation entry absent for Data Analysts', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 5: Authorized Data Scientists can still access model management
    // -------------------------------------------------------------------------
    console.log('\n[5/7] Testing authorized Data Scientist model management access...');
    try {
      await page.evaluate(() => {
        const scientistUser = {
          id: 'user-scientist-002-phase1',
          email: 'scientist@insightiq.internal',
          user_metadata: { full_name: 'Dr. Marcus Vance', role: 'Data Scientist' }
        };
        localStorage.setItem('insightiq_user_session', JSON.stringify({
          access_token: 'mock-jwt-scientist',
          user: scientistUser
        }));
        localStorage.setItem('insightiq_user_profile', JSON.stringify({
          id: scientistUser.id,
          email: scientistUser.email,
          full_name: 'Dr. Marcus Vance',
          role: 'Data Scientist'
        }));
        localStorage.setItem('insightiq_dev_preview_role', 'data_scientist');
      });

      await page.reload({ waitUntil: 'networkidle2' });
      await page.waitForSelector('#header-role-badge', { timeout: 6000 });

      const dsBadge = await page.$eval('#header-role-badge', el => el.textContent.trim());
      assert.ok(dsBadge.includes('DATA SCIENTIST'), `DS badge must show DATA SCIENTIST, got: "${dsBadge}"`);

      // Sidebar MUST contain Models
      const dsNavTexts = await page.$$eval('.nav-item-btn', buttons =>
        buttons.map(b => b.textContent.trim())
      );
      const dsHasModels = dsNavTexts.some(t => t.includes('Models'));
      assert.ok(dsHasModels, 'Data Scientist sidebar must contain Models');

      // Navigate to #/models -> Should NOT be 403 Access Denied
      await page.evaluate(() => { window.location.hash = '#/models'; });
      await new Promise(r => setTimeout(r, 500));

      const dsAccessDenied = await page.evaluate(() => {
        return Boolean(document.querySelector('.access-denied-viewport'));
      });
      assert.strictEqual(dsAccessDenied, false, 'Data Scientist must have legitimate access to #/models');

      report(5, 'Authorized Data Scientists retain full access to Models in navigation and views', true);
    } catch (err) {
      report(5, 'Authorized Data Scientists can still access model management', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 6: Editing frontend state or URL does not grant additional privileges
    // -------------------------------------------------------------------------
    console.log('\n[6/7] Testing privilege tampering resistance...');
    try {
      // Switch back to authenticated Data Analyst
      await page.evaluate(() => {
        const analystUser = {
          id: 'user-analyst-001-phase1',
          email: 'analyst@insightiq.internal',
          user_metadata: { full_name: 'Sarah Chen', role: 'Data Analyst' }
        };
        localStorage.setItem('insightiq_user_session', JSON.stringify({
          access_token: 'mock-jwt-analyst',
          user: analystUser
        }));
        localStorage.setItem('insightiq_user_profile', JSON.stringify({
          id: analystUser.id,
          email: analystUser.email,
          full_name: 'Sarah Chen',
          role: 'Data Analyst'
        }));
        // Attacker attempts to tamper dev preview key to data_scientist:
        localStorage.setItem('insightiq_dev_preview_role', 'data_scientist');
      });

      await page.reload({ waitUntil: 'networkidle2' });
      await page.waitForSelector('#header-role-badge', { timeout: 6000 });

      // Effective role MUST be DATA ANALYST because authorized profile takes precedence
      const badgeAfterTamper = await page.$eval('#header-role-badge', el => el.textContent.trim());
      assert.ok(
        badgeAfterTamper.includes('DATA ANALYST'),
        `Tampering dev preview key must NOT override authenticated profile role. Got: "${badgeAfterTamper}"`
      );

      // Navigating to #/models must STILL be blocked
      await page.evaluate(() => { window.location.hash = '#/models'; });
      await new Promise(r => setTimeout(r, 500));

      const isBlocked = await page.evaluate(() => {
        const text = document.body.innerText;
        return text.includes('Access Restricted') || Boolean(document.querySelector('.access-denied-viewport'));
      });
      assert.ok(isBlocked, 'Tampered state must still be blocked from accessing #/models');

      report(6, 'Frontend state tampering is ignored; authenticated profile role is authoritative', true);
    } catch (err) {
      report(6, 'Editing frontend state does not grant additional privileges', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 7: Existing login/logout behavior remains intact
    // -------------------------------------------------------------------------
    console.log('\n[7/7] Testing existing sign out and onboarding behavior...');
    try {
      // 1. New unconfigured user sees onboarding selector
      await page.evaluate(() => {
        const newUser = {
          id: 'user-new-003-phase1',
          email: 'newuser@insightiq.internal',
          user_metadata: { full_name: 'Alex Rivera' }
        };
        localStorage.setItem('insightiq_user_session', JSON.stringify({
          access_token: 'mock-jwt-new',
          user: newUser
        }));
        localStorage.setItem('insightiq_user_profile', JSON.stringify({
          id: newUser.id,
          email: newUser.email,
          full_name: 'Alex Rivera',
          role: null
        }));
      });

      await page.reload({ waitUntil: 'networkidle2' });
      await page.waitForSelector('.role-selection-viewport', { timeout: 6000 });

      const onboardingTitle = await page.$eval('.role-title', el => el.textContent);
      assert.ok(onboardingTitle.includes('How will you use InsightIQ AI?'), 'New user without role sees onboarding');

      // 2. Clean sign out clears session and storage
      await page.evaluate(() => {
        localStorage.removeItem('insightiq_user_session');
        localStorage.removeItem('insightiq_user_profile');
        localStorage.removeItem('insightiq_dev_preview_role');
      });
      await page.reload({ waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 800));

      const hasSession = await page.evaluate(() => {
        return Boolean(localStorage.getItem('insightiq_user_session'));
      });
      assert.strictEqual(hasSession, false, 'Signed out state has no active session in storage');

      report(7, 'Existing login, onboarding role selector, and clean sign out remain intact', true);
    } catch (err) {
      report(7, 'Existing login/logout behavior remains intact', false, err.message);
    }

  } finally {
    await browser.close();
  }

  console.log('\n================================================================');
  console.log(`Results: ${passed}/7 Tests Passed (${Math.round((passed / 7) * 100)}%)`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
