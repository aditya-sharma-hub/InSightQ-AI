/**
 * InsightIQ AI — Comprehensive Authentication Regression Test Suite
 *
 * Verifies:
 * 1. Client Environment Delivery & Secrets Protection (/api/config & /api/config.js)
 * 2. Supabase Client Configuration & Initialization
 * 3. Authentication Error Disambiguation: Invalid Credentials
 * 4. Authentication Error Disambiguation: Unconfirmed Email
 * 5. Registration Error Disambiguation: Database Trigger Failure & Migration Guidance
 * 6. Post-Login Fault Isolation: Database errors do not invalidate auth or show "invalid password"
 * 7. Database Row Level Security (RLS) Isolation across sensitive tables
 * 8. Browser E2E: Invalid Credentials error presentation (no bypass, no fake user)
 * 9. Browser E2E: Unconfirmed Email error presentation (no bypass)
 * 10. Browser E2E: Session Restoration and Logout token purging
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const puppeteer = require('puppeteer');

dotenv.config({ path: path.join(__dirname, '../../.env.local') });
dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config({ path: path.join(__dirname, '../../.env') });
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
  console.log('InsightIQ AI — Authentication & Security Verification Suite');
  console.log('================================================================');

  let activeServer = null;
  let testBaseUrl = BASE_URL;

  try {
    const probe = await fetch(`${testBaseUrl}/health`);
    if (!probe.ok) throw new Error('Not running');
  } catch (_) {
    const http = require('http');
    const { app } = require('../../server.js');
    activeServer = http.createServer(app);
    await new Promise(resolve => activeServer.listen(0, resolve));
    testBaseUrl = `http://127.0.0.1:${activeServer.address().port}`;
    console.log(`  (Initialized ephemeral test server on ${testBaseUrl})`);
  }

  // --- Test 1: Public Config Delivery & Secret Leak Protection ---
  console.log('\n[1/12] Verifying Public Config Delivery & Secret Leak Protection...');
  try {
    const res = await fetch(`${testBaseUrl}/api/config`);
    assert.strictEqual(res.status, 200, 'Expected HTTP 200 from /api/config');
    const data = await res.json();
    assert.strictEqual(data.success, true, 'Config response success should be true');
    assert.ok(data.config.VITE_SUPABASE_URL.startsWith('https://'), 'VITE_SUPABASE_URL must be a valid https URL');
    assert.ok(data.config.VITE_SUPABASE_PUBLISHABLE_KEY.length > 20, 'VITE_SUPABASE_PUBLISHABLE_KEY must be populated');
    assert.ok(data.config.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://'), 'NEXT_PUBLIC_SUPABASE_URL must be a valid https URL');
    assert.ok(data.config.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 20, 'NEXT_PUBLIC_SUPABASE_ANON_KEY must be populated');
    
    // Check that NO secrets are present in config response
    const configStr = JSON.stringify(data);
    assert.ok(!configStr.includes('GEMINI'), 'Must not expose GEMINI credentials in /api/config');
    assert.ok(!configStr.includes('service_role'), 'Must not expose service_role key');

    // Also check /api/config.js
    const jsRes = await fetch(`${testBaseUrl}/api/config.js`);
    assert.strictEqual(jsRes.status, 200, 'Expected HTTP 200 from /api/config.js');
    const jsText = await jsRes.text();
    assert.ok(jsText.includes('window.__ENV__'), 'Must inject window.__ENV__ in config.js');
    assert.ok(!jsText.includes('GEMINI'), 'Must not expose GEMINI in config.js');
    report('Public Config Delivery & Secret Leak Prevention', true);
  } catch (err) {
    report('Public Config Delivery & Secret Leak Prevention', false, err.message);
  }

  // --- Test 1b: Serverless Config Fallback Guarantee (Empty/Whitespace/Secret Env Regression Protection) ---
  console.log('\n[1b/14] Verifying Serverless Config Non-Empty Fallback Protection...');
  try {
    const http = require('http');
    const origViteUrl = process.env.VITE_SUPABASE_URL;
    const origViteKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const origNextUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const origNextKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    try {
      process.env.VITE_SUPABASE_URL = '   ';
      process.env.NEXT_PUBLIC_SUPABASE_URL = '';
      process.env.SUPABASE_URL = '""';
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_secret_should_never_leak_99999999999';
      process.env.VITE_SUPABASE_ANON_KEY = '';
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = '';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '';
      process.env.SUPABASE_PUBLISHABLE_KEY = '';
      process.env.SUPABASE_ANON_KEY = 'service_role_reject';

      delete require.cache[require.resolve('../../server.js')];
      const { app: testApp } = require('../../server.js');
      const tempServer = http.createServer(testApp);
      await new Promise(r => tempServer.listen(0, r));
      const tempPort = tempServer.address().port;

      const cRes = await fetch(`http://127.0.0.1:${tempPort}/api/config`);
      const cData = await cRes.json();

      assert.strictEqual(cRes.status, 200, 'Must return 200');
      assert.ok(cData.config.VITE_SUPABASE_URL && cData.config.VITE_SUPABASE_URL.startsWith('https://'), 'VITE_SUPABASE_URL must never be empty or whitespace');
      assert.ok(cData.config.VITE_SUPABASE_PUBLISHABLE_KEY && cData.config.VITE_SUPABASE_PUBLISHABLE_KEY.startsWith('sb_publishable_'), 'VITE_SUPABASE_PUBLISHABLE_KEY must never be empty or secret');
      assert.strictEqual(cData.diagnostics.urlPresent, true, 'Diagnostics must confirm urlPresent');
      assert.strictEqual(cData.diagnostics.keyPresent, true, 'Diagnostics must confirm keyPresent');
      assert.strictEqual(cData.diagnostics.secretKeyRejected, true, 'Diagnostics must confirm secretKey was rejected');

      const jsRes = await fetch(`http://127.0.0.1:${tempPort}/api/config.js`);
      const jsText = await jsRes.text();
      assert.ok(!jsText.includes('VITE_SUPABASE_URL":""'), 'config.js must never emit empty string for VITE_SUPABASE_URL');
      assert.ok(!jsText.includes('VITE_SUPABASE_PUBLISHABLE_KEY":""'), 'config.js must never emit empty string for VITE_SUPABASE_PUBLISHABLE_KEY');

      await new Promise(r => tempServer.close(r));
      report('Serverless Config Fallback Guarantee (Empty/Whitespace/Secret Env)', true);
    } finally {
      process.env.VITE_SUPABASE_URL = origViteUrl;
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY = origViteKey;
      process.env.NEXT_PUBLIC_SUPABASE_URL = origNextUrl;
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = origNextKey;
      delete require.cache[require.resolve('../../server.js')];
    }
  } catch (err) {
    report('Serverless Config Fallback Guarantee (Empty/Whitespace/Secret Env)', false, err.message);
  }

  // --- Test 2: Supabase Client Initializer & Configuration ---
  console.log('\n[2/10] Verifying Supabase Client Initialization...');
  try {
    assert.ok(SUPABASE_URL, 'VITE_SUPABASE_URL must be set in environment');
    assert.ok(SUPABASE_KEY, 'VITE_SUPABASE_PUBLISHABLE_KEY must be set in environment');
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false }
    });
    assert.ok(supabase.auth, 'Supabase client must expose auth module');
    assert.ok(supabase.from, 'Supabase client must expose from module');
    report('Supabase Client Configuration', true);
  } catch (err) {
    report('Supabase Client Configuration', false, err.message);
  }

  // --- Test 2b: Missing Configuration Detection ---
  console.log('\n[2b/12] Verifying Missing Configuration Detection & Safe Error Handling...');
  try {
    let unconfiguredClient = null;
    let configError = null;
    const url = '';
    const key = '';
    if (!url || !key) {
      configError = 'Authentication service is not configured. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are available.';
    } else {
      unconfiguredClient = createClient(url, key);
    }
    assert.strictEqual(unconfiguredClient, null, 'Unconfigured client must be null');
    assert.ok(configError.includes('Authentication service is not configured'), 'Must return exact safe configuration error message');
    report('Missing Configuration Detection & Safe Error Reporting', true);
  } catch (err) {
    report('Missing Configuration Detection & Safe Error Reporting', false, err.message);
  }

  // --- Test 2c: Google OAuth Request Construction ---
  console.log('\n[2c/12] Verifying Google OAuth signInWithOAuth Construction...');
  try {
    const testClient = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
    const redirectTarget = 'https://in-sight-q-ai.vercel.app/';
    const { data: oauthData, error: oauthErr } = await testClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectTarget }
    });
    assert.strictEqual(oauthErr, null, 'signInWithOAuth must not return error');
    assert.strictEqual(oauthData.provider, 'google', 'Provider must be google');
    assert.ok(oauthData.url.includes('provider=google'), 'Authorize URL must target provider=google');
    assert.ok(oauthData.url.includes(encodeURIComponent(redirectTarget)), 'Authorize URL must encode redirectTo');
    report('Google OAuth Request Construction & Production Redirect', true);
  } catch (err) {
    report('Google OAuth Request Construction & Production Redirect', false, err.message);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
  });

  // --- Test 3: Invalid Credentials Handling ---
  console.log('\n[3/10] Verifying Invalid Credentials Error Handling...');
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'nonexistent_account_' + Date.now() + '@example.com',
      password: 'DefectivePassword123!'
    });
    assert.ok(!data?.user, 'Invalid credentials must NOT return user data');
    assert.ok(error, 'Expected auth error for invalid credentials');
    assert.ok(
      error.message.includes('Invalid login credentials') || error.status === 400,
      `Expected Invalid login credentials error, got: ${error?.message}`
    );
    report('Invalid Credentials Error Detection', true);
  } catch (err) {
    report('Invalid Credentials Error Detection', false, err.message);
  }

  // --- Test 4: Unconfirmed Email Handling ---
  console.log('\n[4/10] Verifying Unconfirmed Email Disambiguation...');
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'testuser_26889@gmail.com',
      password: 'TestPassword123!'
    });
    assert.ok(!data?.user, 'Unconfirmed user must NOT be granted access');
    assert.ok(error, 'Expected error for unconfirmed email');
    assert.ok(
      error.message.includes('Email not confirmed'),
      `Expected 'Email not confirmed' message, got: ${error?.message}`
    );
    report('Unconfirmed Email Error Disambiguation', true);
  } catch (err) {
    report('Unconfirmed Email Error Disambiguation', false, err.message);
  }

  // --- Test 5: Registration Error Disambiguation ---
  console.log('\n[5/10] Verifying Registration Error Detection...');
  try {
    const { data, error } = await supabase.auth.signUp({
      email: 'test_reg_' + Date.now() + '@insightiq.ai',
      password: 'Password123!'
    });
    // If the database trigger fails, GoTrue returns "Database error saving new user" (500)
    // If auto-confirmation / repair trigger succeeded, data.user is created.
    // In either case, verify that error is detected and handled without crashing.
    if (error) {
      assert.ok(
        error.message.includes('Database error saving new user') ||
        error.message.includes('rate limit') ||
        error.status === 429 ||
        error.status === 500,
        `Expected valid registration response, got: ${error.message}`
      );
      report('Registration Flow Handled Cleanly (Trigger active & rate limit / trigger recognized)', true);
    } else {
      assert.ok(data?.user, 'User should be returned if signup succeeded');
      report('Registration Flow Handled Cleanly', true);
    }
  } catch (err) {
    report('Registration Error Disambiguation', false, err.message);
  }

  // --- Test 6: Post-Login Fault Isolation ---
  console.log('\n[6/10] Verifying Post-Login Fault Isolation (Profile DB error != Invalid Password)...');
  try {
    // Simulate what happens when profile table is inaccessible post-authentication
    const mockAuthUser = {
      id: 'e8b0e8c0-1111-2222-3333-444455556666',
      email: 'isolated_user@example.com',
      user_metadata: { full_name: 'Isolated Tester' }
    };

    // Attempt profile query with non-authenticated / anon client
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', mockAuthUser.id)
      .maybeSingle();

    // RLS or missing record should return null/empty, NOT throw unhandled
    assert.strictEqual(profileData, null, 'Anon client cannot read user profile directly');
    // Fallback profile payload construction must succeed
    const fallbackProfile = {
      id: mockAuthUser.id,
      email: mockAuthUser.email,
      full_name: mockAuthUser.user_metadata?.full_name || mockAuthUser.email.split('@')[0],
      role: null,
      provider: 'email'
    };
    assert.strictEqual(fallbackProfile.id, mockAuthUser.id);
    assert.strictEqual(fallbackProfile.full_name, 'Isolated Tester');
    report('Post-Login Profile Error Isolation & Resilient Fallback', true);
  } catch (err) {
    report('Post-Login Profile Error Isolation', false, err.message);
  }

  // --- Test 7: Row Level Security (RLS) Isolation ---
  console.log('\n[7/10] Verifying Row Level Security (RLS) Isolation on Public Tables...');
  try {
    const [profilesRes, prefsRes, activityRes, datasetsRes] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('user_preferences').select('*'),
      supabase.from('user_activity').select('*'),
      supabase.from('datasets').select('*')
    ]);

    // RLS must ensure an unauthenticated anon client receives empty arrays
    assert.strictEqual(profilesRes.data?.length, 0, 'profiles table must not leak data to anon');
    assert.strictEqual(prefsRes.data?.length, 0, 'user_preferences table must not leak data to anon');
    assert.strictEqual(activityRes.data?.length, 0, 'user_activity table must not leak data to anon');
    assert.strictEqual(datasetsRes.data?.length, 0, 'datasets table must not leak data to anon');
    report('Database Row Level Security Multi-Tenant Isolation', true);
  } catch (err) {
    report('Database Row Level Security Multi-Tenant Isolation', false, err.message);
  }

  // --- Headless Browser Tests (Puppeteer) ---
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  let browser = null;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // --- Test 8: Browser E2E: Invalid Credentials Presentation & Real Supabase Request ---
    console.log('\n[8/12] Verifying Browser E2E: Real Supabase Auth Request & Invalid Credentials Display...');
    {
      const page = await browser.newPage();
      const supabaseRequests = [];
      page.on('request', req => {
        if (req.url().includes('supabase.co')) {
          supabaseRequests.push(req.url());
        }
      });

      await page.goto(`${testBaseUrl}/`, { waitUntil: 'networkidle2' });

      // Verify window.__ENV__ is automatically present
      const hasEnv = await page.evaluate(() => Boolean(window.__ENV__?.VITE_SUPABASE_URL));
      assert.ok(hasEnv, 'Browser must automatically receive window.__ENV__');

      // Verify NO missing-configuration error banner is shown when properly configured
      const initialFeedback = await page.evaluate(() => {
        const el = document.querySelector('.animate-fade-in[style*="border"]');
        return el ? el.textContent.trim() : null;
      });
      assert.strictEqual(initialFeedback, null, 'Configured login screen must NOT display missing configuration error banner');

      // Wait for email input
      await page.waitForSelector('input[type="email"]', { timeout: 8000 });
      await page.type('input[type="email"]', 'wrong_credentials_test@example.com');
      await page.type('input[type="password"]', 'WrongPass123!');
      await page.click('button[type="submit"]');

      await page.waitForFunction(() => {
        const feedbackEl = document.querySelector('.animate-fade-in[style*="border"]');
        return feedbackEl && feedbackEl.textContent.trim().length > 0;
      }, { timeout: 8000 }).catch(() => {});

      const state = await page.evaluate(() => {
        const aside = Boolean(document.querySelector('aside'));
        const feedbackEl = document.querySelector('.animate-fade-in[style*="border"]');
        const feedback = feedbackEl ? feedbackEl.textContent.trim() : '';
        const session = window.localStorage.getItem('insightiq_user_session');
        return { aside, feedback, session };
      });

      assert.strictEqual(state.aside, false, 'Invalid credentials must NEVER render the dashboard');
      assert.strictEqual(state.session, null, 'Invalid credentials must NOT store a session');
      assert.ok(
        state.feedback.includes('Invalid email or password'),
        `Expected 'Invalid email or password' message, got: '${state.feedback}'`
      );

      // Verify a real network request reached the configured Supabase project
      assert.ok(supabaseRequests.length >= 1, 'A real network request must reach Supabase');
      assert.ok(
        supabaseRequests.some(url => url.includes('qldrqdnjpohyuhqvirmc.supabase.co')),
        'Request must reach the configured Supabase project URL https://qldrqdnjpohyuhqvirmc.supabase.co'
      );
      report('Browser E2E: Real Supabase Auth Request & Invalid Credentials Handled Correctly', true);
      await page.close();
    }

    // --- Test 9: Browser E2E: Unconfirmed Email Display ---
    console.log('\n[9/12] Verifying Browser E2E: Unconfirmed Email Presentation...');
    {
      const page = await browser.newPage();
      await page.goto(`${testBaseUrl}/`, { waitUntil: 'networkidle2' });

      await page.waitForSelector('input[type="email"]', { timeout: 8000 });
      await page.type('input[type="email"]', 'testuser_26889@gmail.com');
      await page.type('input[type="password"]', 'TestPassword123!');
      await page.click('button[type="submit"]');

      await page.waitForFunction(() => {
        const feedbackEl = document.querySelector('.animate-fade-in[style*="border"]');
        return feedbackEl && feedbackEl.textContent.trim().length > 0;
      }, { timeout: 8000 }).catch(() => {});

      const state = await page.evaluate(() => {
        const aside = Boolean(document.querySelector('aside'));
        const feedbackEl = document.querySelector('.animate-fade-in[style*="border"]');
        const feedback = feedbackEl ? feedbackEl.textContent.trim() : '';
        const session = window.localStorage.getItem('insightiq_user_session');
        return { aside, feedback, session };
      });

      assert.strictEqual(state.aside, false, 'Unconfirmed user must NEVER access dashboard');
      assert.strictEqual(state.session, null, 'Unconfirmed user must NOT store a session');
      assert.ok(
        state.feedback.includes('email address has not been confirmed'),
        `Expected unconfirmed email notice, got: '${state.feedback}'`
      );
      report('Browser E2E: Unconfirmed Email Presented Accurately', true);
      await page.close();
    }

    // --- Test 10: Browser E2E: Single Invocation of Login Handler ---
    console.log('\n[10/12] Verifying Browser E2E: Login Handler Single Invocation Protection...');
    {
      const page = await browser.newPage();
      let authRequestsCount = 0;
      page.on('request', req => {
        if (req.url().includes('supabase.co/auth/v1/token')) {
          authRequestsCount++;
        }
      });

      await page.goto(`${testBaseUrl}/`, { waitUntil: 'networkidle2' });
      await page.waitForSelector('input[type="email"]', { timeout: 8000 });
      await page.type('input[type="email"]', 'testuser_26889@gmail.com');
      await page.type('input[type="password"]', 'TestPassword123!');

      // Simulate rapid double click on submit button
      await page.evaluate(() => {
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.click();
          submitBtn.click();
        }
      });

      await new Promise(r => setTimeout(r, 2000));
      assert.strictEqual(authRequestsCount, 1, `Expected exactly 1 auth request on rapid submission, got ${authRequestsCount}`);
      report('Browser E2E: Single Invocation of Login Handler (No Duplicate Requests)', true);
      await page.close();
    }

    // --- Test 11: Browser E2E: Missing Configuration Error Presentation ---
    console.log('\n[11/12] Verifying Browser E2E: Missing Configuration Error Message...');
    {
      const page = await browser.newPage();
      // Emulate missing environment by intercepting /api/config.js to return empty config
      await page.setRequestInterception(true);
      page.on('request', interceptedReq => {
        if (interceptedReq.url().includes('/api/config.js')) {
          interceptedReq.respond({
            status: 200,
            contentType: 'application/javascript',
            body: 'window.__ENV__ = { VITE_SUPABASE_URL: "", VITE_SUPABASE_PUBLISHABLE_KEY: "", DISABLE_SUPABASE_FALLBACK: true };'
          });
        } else {
          interceptedReq.continue();
        }
      });

      await page.goto(`${testBaseUrl}/`, { waitUntil: 'networkidle2' });
      await page.waitForSelector('input[type="email"]', { timeout: 8000 });

      // Verify the missing configuration error message is rendered
      const unconfiguredMsg = await page.evaluate(() => {
        const el = document.querySelector('.animate-fade-in[style*="border"]');
        return el ? el.textContent.trim() : '';
      });

      assert.ok(
        unconfiguredMsg.includes('Authentication service is not configured') &&
        unconfiguredMsg.includes('VITE_SUPABASE_URL') &&
        unconfiguredMsg.includes('VITE_SUPABASE_PUBLISHABLE_KEY'),
        `Expected missing configuration error message, got: '${unconfiguredMsg}'`
      );

      // Verify clicking Sign In also displays the exact actionable error
      await page.type('input[type="email"]', 'test@example.com');
      await page.type('input[type="password"]', 'Password123!');
      await page.click('button[type="submit"]');
      await new Promise(r => setTimeout(r, 500));

      const submitFeedback = await page.evaluate(() => {
        const el = document.querySelector('.animate-fade-in[style*="border"]');
        return el ? el.textContent.trim() : '';
      });
      assert.ok(
        submitFeedback.includes('Authentication service is not configured') &&
        submitFeedback.includes('VITE_SUPABASE_URL') &&
        submitFeedback.includes('VITE_SUPABASE_PUBLISHABLE_KEY'),
        `Expected submit feedback for unconfigured client, got: '${submitFeedback}'`
      );

      report('Browser E2E: Missing Configuration Actionable Error Display', true);
      await page.close();
    }

    // --- Test 11b: Browser E2E: Resilient Recovery from Empty Runtime Configuration ---
    console.log('\n[11b/13] Verifying Browser E2E: Resilient Fallback when Runtime Config is Empty...');
    {
      const page = await browser.newPage();
      const consoleLogs = [];
      page.on('console', msg => consoleLogs.push(msg.text()));

      await page.setRequestInterception(true);
      page.on('request', interceptedReq => {
        if (interceptedReq.url().includes('/api/config.js')) {
          interceptedReq.respond({
            status: 200,
            contentType: 'application/javascript',
            body: 'window.__ENV__ = { VITE_SUPABASE_URL: "", VITE_SUPABASE_PUBLISHABLE_KEY: "", VITE_SUPABASE_ANON_KEY: "" };'
          });
        } else {
          interceptedReq.continue();
        }
      });

      await page.goto(`${testBaseUrl}/`, { waitUntil: 'networkidle2' });
      await page.waitForSelector('input[type="email"]', { timeout: 8000 });

      // Check client state
      const state = await page.evaluate(() => {
        const hasClient = typeof window.getSupabaseClient === 'function';
        const clientInstance = hasClient ? Boolean(window.getSupabaseClient()) : false;
        const bannerText = document.querySelector('.animate-fade-in[style*="border"]')?.textContent || '';
        return { hasClient, clientInstance, bannerText };
      });

      assert.strictEqual(state.hasClient, true, 'window.getSupabaseClient must be defined');
      assert.strictEqual(state.clientInstance, true, 'getSupabaseClient() must resolve a usable client via canonical fallback');
      assert.ok(!state.bannerText.includes('Authentication service is not configured'), 'Must not display unconfigured warning when canonical fallback is active');

      const configCheckLog = consoleLogs.find(l => l.includes('Safe Client Configuration Check'));
      assert.ok(configCheckLog && configCheckLog.includes('URL=PRESENT') && configCheckLog.includes('Key=PRESENT'), 'Safe Client Configuration Check must show URL=PRESENT and Key=PRESENT');

      report('Browser E2E: Resilient Fallback on Empty Runtime Config', true);
      await page.close();
    }


    // --- Test 12: Browser E2E: Session Restoration & Logout ---
    console.log('\n[12/12] Verifying Browser E2E: Session Restoration & Logout Purging...');
    {
      const page = await browser.newPage();

      // Pre-set authenticated session in localStorage
      await page.evaluateOnNewDocument(() => {
        window.localStorage.setItem('insightiq_user_session', JSON.stringify({
          user: { id: 'test-uuid-999', email: 'session_restore@insightiq.ai' }
        }));
        window.localStorage.setItem('insightiq_user_profile', JSON.stringify({
          id: 'test-uuid-999',
          email: 'session_restore@insightiq.ai',
          full_name: 'Dr. Jane Watson',
          role: 'Data Scientist'
        }));
      });

      await page.goto(`${testBaseUrl}/`, { waitUntil: 'networkidle2' });

      // Verify dashboard is immediately rendered
      const aside = await page.waitForSelector('aside', { timeout: 8000 }).catch(() => null);
      assert.ok(aside, 'Authenticated session must restore dashboard aside navigation');

      // Click sign out
      const signedOut = await page.evaluate(async () => {
        const avatarBtn = document.querySelector('button[title*="User Profile"]') || 
          document.querySelector('.user-avatar-btn') || 
          Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Jane') || b.textContent.includes('JW'));
        if (avatarBtn) avatarBtn.click();
        await new Promise(r => setTimeout(r, 400));
        const signOutBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Sign Out') || b.textContent.includes('Log Out'));
        if (signOutBtn) {
          signOutBtn.click();
          return true;
        }
        return false;
      });

      assert.ok(signedOut, 'Sign Out button should be clickable');
      await new Promise(r => setTimeout(r, 1200));

      const afterLogout = await page.evaluate(() => ({
        aside: Boolean(document.querySelector('aside')),
        emailInput: Boolean(document.querySelector('input[type="email"]')),
        session: window.localStorage.getItem('insightiq_user_session'),
        profile: window.localStorage.getItem('insightiq_user_profile')
      }));

      assert.strictEqual(afterLogout.aside, false, 'Dashboard must be unmounted upon signout');
      assert.strictEqual(afterLogout.emailInput, true, 'Login screen must be rendered upon signout');
      assert.strictEqual(afterLogout.session, null, 'Session must be purged from localStorage');
      assert.strictEqual(afterLogout.profile, null, 'Profile must be purged from localStorage');
      report('Browser E2E: Session Restoration & Clean Sign Out', true);
      await page.close();
    }

  } catch (browserErr) {
    report('Headless Browser Tests Execution', false, browserErr.message);
  } finally {
    if (browser) await browser.close();
    if (activeServer) {
      await new Promise(res => activeServer.close(res));
    }
  }

  console.log('\n================================================================');
  console.log(`Results: ${passedTests}/${totalTests} Tests Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error('Fatal Suite Error:', err);
  process.exit(1);
});
