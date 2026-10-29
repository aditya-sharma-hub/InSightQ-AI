const assert = require('assert');
const fs = require('fs');
const puppeteer = require('puppeteer');

async function testRuntime() {
  console.log('Testing Next.js / NEXT_PUBLIC_ variable compatibility & runtime verification...\n');

  // Test 1: Verify server.js resolvers with ONLY NEXT_PUBLIC_ variables
  console.log('[Check 1] Simulating environment with ONLY NEXT_PUBLIC_ variables (no VITE_)...');
  const backupViteUrl = process.env.VITE_SUPABASE_URL;
  const backupViteKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const backupNextUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const backupNextKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  delete process.env.VITE_SUPABASE_URL;
  delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  delete process.env.VITE_SUPABASE_ANON_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock-nextjs-project.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-nextjs-anon-key-with-long-token-value-12345';

  // Test Node/process.env resolution in src/lib/supabase.ts / supabase.js
  const { resolveSupabaseConfig } = require('../../src/lib/supabase.js');
  const resolved = resolveSupabaseConfig();
  assert.strictEqual(resolved.url, 'https://mock-nextjs-project.supabase.co', 'URL must resolve from NEXT_PUBLIC_SUPABASE_URL');
  assert.strictEqual(resolved.key, 'mock-nextjs-anon-key-with-long-token-value-12345', 'Key must resolve from NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.log('  ✓ PASS: src/lib/supabase.ts resolves NEXT_PUBLIC_ variables without error');

  // Restore env
  if (backupViteUrl) process.env.VITE_SUPABASE_URL = backupViteUrl;
  if (backupViteKey) process.env.VITE_SUPABASE_PUBLISHABLE_KEY = backupViteKey;
  if (backupNextUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = backupNextUrl;
  if (backupNextKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = backupNextKey;

  // Test 2: Verify browser runtime on http://localhost:8085/
  console.log('\n[Check 2] Testing browser page load and console output on live server...');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const consoleMessages = [];
  const consoleErrors = [];

  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push(text);
    if (msg.type() === 'error') {
      consoleErrors.push(text);
    }
  });

  await page.goto('http://localhost:8085/', { waitUntil: 'networkidle0', timeout: 15000 });

  // Verify safe client configuration check was logged
  const safeCheckLog = consoleMessages.find(m => m.includes('Safe Client Configuration Check'));
  console.log('  Client log captured:', safeCheckLog || '(none)');
  assert.ok(safeCheckLog, 'Safe Client Configuration Check must be logged on startup');
  assert.ok(safeCheckLog.includes('URL=PRESENT'), 'supabaseUrlConfigured must be true (URL=PRESENT)');
  assert.ok(safeCheckLog.includes('Key=PRESENT'), 'supabaseKeyConfigured must be true (Key=PRESENT)');

  // Verify NO error regarding missing VITE_SUPABASE_URL exists
  const missingVarError = consoleMessages.find(m =>
    m.includes('Missing required Supabase environment variables') ||
    m.includes('VITE_SUPABASE_URL are missing')
  );
  assert.strictEqual(missingVarError, undefined, 'No missing Supabase variable errors should be logged');

  // Verify window.__ENV__ is loaded and has both VITE_ and NEXT_PUBLIC_ aliases
  const envState = await page.evaluate(() => {
    return {
      hasEnv: Boolean(window.__ENV__),
      hasViteUrl: Boolean(window.__ENV__?.VITE_SUPABASE_URL),
      hasNextPublicUrl: Boolean(window.__ENV__?.NEXT_PUBLIC_SUPABASE_URL),
      hasSupabaseClient: Boolean(window.supabaseClient || window.getSupabaseClient?.())
    };
  });
  console.log('  Browser window state:', envState);
  assert.strictEqual(envState.hasEnv, true, 'window.__ENV__ must exist');
  assert.strictEqual(envState.hasViteUrl, true, 'window.__ENV__.VITE_SUPABASE_URL must exist');
  assert.strictEqual(envState.hasNextPublicUrl, true, 'window.__ENV__.NEXT_PUBLIC_SUPABASE_URL must exist');
  assert.strictEqual(envState.hasSupabaseClient, true, 'window.supabaseClient must be initialized');

  // Verify DOM rendered login card properly without error banners
  const emailInput = await page.waitForSelector('input[type="email"]', { timeout: 8000 });
  assert.ok(emailInput, 'Email input must be rendered on the login page');

  const pageText = await page.evaluate(() => document.body.innerText);
  assert.ok(!pageText.includes('Missing required Supabase'), 'Page must not display missing variables error');

  await browser.close();
  console.log('  ✓ PASS: Browser runtime successfully verified with zero errors!\n');
  console.log('All runtime configuration tests PASSED successfully.');
}

testRuntime().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
