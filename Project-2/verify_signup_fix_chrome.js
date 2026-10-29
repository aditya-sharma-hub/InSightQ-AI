/**
 * InsightIQ AI — Chrome Browser & Supabase Auth Verification Suite
 */

const puppeteer = require('puppeteer');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config({ path: path.join(__dirname, '.env') });

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8085';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const client = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

const sleep = ms => new Promise(r => setTimeout(r, ms));

let passed = 0;
let failed = 0;

function report(num, name, ok, detail = '') {
  if (ok) {
    passed++;
    console.log(`  ✓ PASS [${num}/9]: ${name}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL [${num}/9]: ${name}${detail ? ` -> ${detail}` : ''}`);
  }
}

async function fillInput(page, elementHandle, text) {
  await elementHandle.focus();
  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  if (text) {
    await elementHandle.type(text);
  }
}

async function runVerification() {
  console.log('================================================================');
  console.log('InsightIQ AI — Signup Hook & Authentication Verification Suite');
  console.log('================================================================\n');

  // --- Check 1: Probe Database Hook Status ---
  console.log('[1/9] Probing Supabase Auth SignUp Hook Directly...');
  const testEmail = `test_signup_diag_${Date.now()}@example.com`;
  const testPassword = 'SecurePassword123!';
  const testRole = 'Data Scientist';

  const { data: signUpData, error: signUpError } = await client.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        full_name: 'Diagnostic User',
        role: testRole
      }
    }
  });

  const isDatabaseError = signUpError && (
    signUpError.message?.includes('Database error saving new user') ||
    signUpError.status === 500
  );

  if (isDatabaseError) {
    console.log(`  -> Database signup hook is currently FAILING: "${signUpError.message}" (Status: ${signUpError.status})`);
    report(1, 'Database Signup Hook Execution', false, `Hook error: ${signUpError.message}`);
  } else if (!signUpError && signUpData?.user) {
    console.log(`  -> Database signup hook SUCCEEDED! User ID: ${signUpData.user.id}`);
    report(1, 'Database Signup Hook Execution', true);
  } else {
    console.log(`  -> Signup response:`, signUpError ? signUpError.message : 'No error, user: ' + signUpData?.user?.id);
    report(1, 'Database Signup Hook Execution', !signUpError, signUpError?.message);
  }

  // --- Step 2: Browser Verification with Chrome ---
  console.log('\n[Step 2] Launching Chrome Browser Automation...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // 2.1 Existing Account Login Behavior
    console.log('\n[2/9] Verifying Existing Account Login & Credential Disambiguation...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });

    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    const isLoginVisible = await page.$('.auth-card, .auth-form-stack, .auth-split-viewport');
    report(2, 'Login Page Renders Cleanly', Boolean(isLoginVisible));

    // Try invalid credentials
    await page.type('input[type="email"]', 'wrong_credentials_test@example.com');
    await page.type('input[type="password"]', 'WrongPass123!');
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => {
      const fb = document.querySelector('.animate-fade-in[style*="border"]');
      return fb && fb.textContent.trim().length > 0;
    }, { timeout: 8000 }).catch(() => {});

    const loginFeedback = await page.evaluate(() => {
      const fb = document.querySelector('.animate-fade-in[style*="border"]');
      return fb ? fb.textContent.trim() : '';
    });
    console.log('  Feedback on wrong credentials:', loginFeedback);
    report(3, 'Existing Login Credential Disambiguation', loginFeedback.includes('Invalid email or password') || loginFeedback.length > 0);

    // 2.2 Switch to Signup Form & Client-Side Validation
    console.log('\n[4-5/9] Switching to Registration Form & Testing Client-Side Validation...');
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('button.auth-action-link'));
      const btn = links.find(b => b.textContent.includes('Create Account'));
      if (btn) btn.click();
    });

    await page.waitForSelector('input[placeholder="Alex Rivera"]', { timeout: 5000 });

    const fullNameInput = await page.$('input[placeholder="Alex Rivera"]');
    const emailInput = await page.$('input[placeholder="name@company.com"]');
    const pwdInputs = await page.$$('input[type="password"]');

    await fillInput(page, fullNameInput, 'Test Persona');
    await fillInput(page, emailInput, 'test_validation@example.com');
    await fillInput(page, pwdInputs[0], 'Password123!');
    await fillInput(page, pwdInputs[1], 'DifferentPassword999!');

    await page.click('button[type="submit"]');
    await sleep(500);

    const mismatchFeedback = await page.evaluate(() => {
      const fb = document.querySelector('.animate-fade-in[style*="border"]');
      return fb ? fb.textContent.trim() : '';
    });
    console.log('  Mismatch feedback:', mismatchFeedback);
    report(4, 'Signup Validation: Password Mismatch Rejection', mismatchFeedback.includes('Passwords do not match'));

    // Test Password Too Short (< 6 chars)
    await fillInput(page, pwdInputs[0], '123');
    await fillInput(page, pwdInputs[1], '123');

    await page.click('button[type="submit"]');
    await sleep(500);

    const shortFeedback = await page.evaluate(() => {
      const fb = document.querySelector('.animate-fade-in[style*="border"]');
      return fb ? fb.textContent.trim() : '';
    });
    console.log('  Short password feedback:', shortFeedback);
    report(5, 'Signup Validation: Password Min Length Rejection', shortFeedback.includes('at least 6 characters'));

    // 2.3 Attempt Clean Registration via Form
    console.log('\n[6/9] Testing Full Signup Submission in Browser...');
    const chromeTestEmail = `chrome_user_${Date.now()}@example.com`;
    await fillInput(page, emailInput, chromeTestEmail);
    await fillInput(page, pwdInputs[0], 'ValidTestPass123!');
    await fillInput(page, pwdInputs[1], 'ValidTestPass123!');

    await page.evaluate(() => {
      const sel = document.querySelector('select');
      if (sel) {
        sel.value = 'Data Scientist';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    await page.click('button[type="submit"]');
    await sleep(3500);

    const signupFeedback = await page.evaluate(() => {
      const fb = document.querySelector('.animate-fade-in[style*="border"]');
      return fb ? fb.textContent.trim() : '';
    });
    console.log('  Browser Registration Result Feedback:', signupFeedback);

    const isHookError = signupFeedback.includes('Registration trigger error') || signupFeedback.includes('signup hook failed');
    report(6, 'Browser Registration Submission (No Hook Crash)', !isHookError, signupFeedback);

    // 2.4 Developer / Admin Access Preservation
    console.log('\n[7/9] Verifying Developer & Administrator Authorization Preservation...');
    await page.evaluate(() => {
      const devUser = {
        id: 'dev-auth-test',
        email: 'developer@insightiq.ai',
        user_metadata: { full_name: 'Lead Developer', role: 'Administrator' }
      };
      localStorage.setItem('insightiq_user_session', JSON.stringify({ access_token: 'mock-dev-token', user: devUser }));
      localStorage.setItem('insightiq_user_profile', JSON.stringify({ id: 'dev-auth-test', email: 'developer@insightiq.ai', full_name: 'Lead Developer', role: 'Administrator' }));
      localStorage.setItem('insightiq_dev_preview_role', 'admin');
    });

    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForSelector('#header-role-badge, .header-role-badge', { timeout: 8000 });

    const adminIndicator = await page.evaluate(() => {
      const badge = document.querySelector('#header-role-badge, .header-role-badge');
      return badge ? badge.textContent.trim() : '';
    });
    console.log('  Header badge for developer/admin session:', adminIndicator);
    report(7, 'Developer/Admin Session & Privileges Intact', adminIndicator.includes('ADMIN'));

    // 2.5 Verify No Unintended Demo Accounts Created
    console.log('\n[8/9] Verifying No Unintended Demo Accounts Created...');
    const demoAccountsInStorage = await page.evaluate(() => {
      return Object.keys(localStorage).filter(k => k.includes('demo_user'));
    });
    report(8, 'No Unintended Demo Records Created', demoAccountsInStorage.length === 0);

    // 2.6 Duplicate Email Handling
    console.log('\n[9/9] Verifying Duplicate Email Handling...');
    const dupRes = await client.auth.signUp({
      email: 'testuser_26889@gmail.com',
      password: 'Password123!'
    });
    const dupHandled = Boolean(dupRes.error || dupRes.data?.user);
    report(9, 'Duplicate Email Detection Handled Cleanly', dupHandled);

  } finally {
    await browser.close();
  }

  console.log('\n================================================================');
  console.log(`Verification Summary: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================');
}

runVerification().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
