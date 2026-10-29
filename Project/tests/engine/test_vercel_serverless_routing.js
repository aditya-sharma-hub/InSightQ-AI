/**
 * InsightIQ AI — Vercel Serverless Routing & Endpoint Verification Suite
 *
 * Verifies that:
 * 1. `vercel.json` points to explicit `/api/index.js` serverless handler without ambiguous `/api` directory routing.
 * 2. Static files are correctly present in `public/` for native Edge CDN delivery.
 * 3. CORS properly permits `*.vercel.app` production origins and localhost without throwing unhandled exceptions.
 * 4. Express serverless entry point (`api/index.js`) and Express app handle all public, protected,
 *    health, config, SPA fallback, and security-blocked routes.
 */

const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');
const app = require('../../api/index.js');

let passedTests = 0;
let totalTests = 0;

function pass(name) {
  totalTests++;
  passedTests++;
  console.log(`  ✓ [PASS] ${name}`);
}

function fail(name, err) {
  totalTests++;
  console.error(`  ✗ [FAIL] ${name}`);
  console.error(`    Error: ${err.message || err}\n`);
}

async function run() {
  console.log('================================================================');
  console.log('   INSIGHTIQ AI — VERCEL SERVERLESS ROUTING VERIFICATION        ');
  console.log('================================================================\n');

  // 0. Vercel Configuration & Public Directory Structure Integrity
  console.log('>>> [0. Vercel Configuration & Public Directory Integrity]');
  try {
    const vercelJsonPath = path.resolve(__dirname, '../../vercel.json');
    assert(fs.existsSync(vercelJsonPath), 'vercel.json must exist');
    const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));

    assert.strictEqual(vercelConfig.version, 2, 'vercel.json version must be 2');
    assert.strictEqual(vercelConfig.outputDirectory, undefined, 'outputDirectory must NOT override default to prevent Edge routing conflicts');
    assert(Array.isArray(vercelConfig.rewrites), 'rewrites array must be defined');

    // Simulate Vercel routing logic against rewrites table
    function matchRewrite(pathname) {
      for (const r of vercelConfig.rewrites) {
        const regex = new RegExp('^' + r.source + '$');
        if (regex.test(pathname)) {
          return r.destination;
        }
      }
      return null;
    }

    assert.strictEqual(matchRewrite('/api/health'), '/api/index.js', '/api/* must rewrite to /api/index.js');
    assert.strictEqual(matchRewrite('/api/config.js'), '/api/index.js', '/api/config.js must rewrite to /api/index.js');
    assert.strictEqual(matchRewrite('/health'), '/api/index.js', '/health must rewrite to /api/index.js');
    assert.strictEqual(matchRewrite('/config.js'), '/api/index.js', '/config.js must rewrite to /api/index.js');
    assert.strictEqual(matchRewrite('/livez'), '/api/index.js', '/livez must rewrite to /api/index.js');
    assert.strictEqual(matchRewrite('/readyz'), '/api/index.js', '/readyz must rewrite to /api/index.js');
    assert.strictEqual(matchRewrite('/'), '/index.html', '/ must rewrite to /index.html');
    assert.strictEqual(matchRewrite('/dashboard'), '/index.html', '/dashboard must rewrite to /index.html');
    assert.strictEqual(matchRewrite('/analytics'), '/index.html', '/analytics must rewrite to /index.html');

    pass('vercel.json rewrites route to /api/index.js and /index.html without conflicts');

    const publicDir = path.resolve(__dirname, '../../public');
    assert(fs.existsSync(publicDir), 'public/ directory must exist for Vercel CDN');
    assert(fs.existsSync(path.join(publicDir, 'index.html')), 'public/index.html must exist');
    assert(fs.existsSync(path.join(publicDir, 'app.js')), 'public/app.js must exist');
    assert(fs.existsSync(path.join(publicDir, 'styles', 'variables.css')), 'public/styles/variables.css must exist');
    assert(fs.existsSync(path.join(publicDir, 'theme', 'tokens.bridge.js')), 'public/theme/tokens.bridge.js must exist');
    pass('public/ directory contains all required Edge CDN assets');
  } catch (err) {
    fail('Vercel Configuration Integrity Failed', err);
  }

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // 1. Health & Observability Endpoints
    console.log('\n>>> [1. Health & Observability Endpoints]');
    {
      const res = await fetch(`${baseUrl}/health`);
      const body = await res.json();
      assert.strictEqual(res.status, 200, '/health should return 200');
      assert.strictEqual(body.status, 'healthy');
      assert(body.system !== undefined, 'system metrics must be present');
      pass('GET /health returns 200 with diagnostics');
    }
    {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.strictEqual(res.status, 200, '/api/health should return 200');
      pass('GET /api/health alias returns 200');
    }
    {
      const res = await fetch(`${baseUrl}/health/liveness`);
      assert.strictEqual(res.status, 200, '/health/liveness should return 200');
      pass('GET /health/liveness responds 200');
    }
    {
      const res = await fetch(`${baseUrl}/health/readiness`);
      assert.strictEqual(res.status, 200, '/health/readiness should return 200');
      pass('GET /health/readiness responds 200');
    }
    {
      const res = await fetch(`${baseUrl}/livez`);
      assert.strictEqual(res.status, 200, '/livez should return 200');
      pass('GET /livez responds 200');
    }
    {
      const res = await fetch(`${baseUrl}/readyz`);
      assert.strictEqual(res.status, 200, '/readyz should return 200');
      pass('GET /readyz responds 200');
    }

    // 2. Client Configuration & Public Endpoints
    console.log('\n>>> [2. Client Configuration & Public Endpoints]');
    {
      const res = await fetch(`${baseUrl}/api/config`);
      const body = await res.json();
      assert.strictEqual(res.status, 200, '/api/config should return 200');
      assert.strictEqual(body.success, true);
      assert(body.config !== undefined, 'config object must be present');
      assert(body.config.SUPABASE_URL !== undefined, 'SUPABASE_URL must be defined');
      pass('GET /api/config delivers sanitized public configuration');
    }
    {
      const res = await fetch(`${baseUrl}/api/config.js`);
      const text = await res.text();
      assert.strictEqual(res.status, 200, '/api/config.js should return 200');
      assert(res.headers.get('content-type').includes('javascript'), 'Content-type must be javascript');
      assert(text.includes('window.__ENV__'), 'Must inject window.__ENV__ config');
      pass('GET /api/config.js delivers client script for index.html bootstrap');
    }
    {
      const res = await fetch(`${baseUrl}/config.js`);
      const text = await res.text();
      assert.strictEqual(res.status, 200, '/config.js alias should return 200');
      assert(res.headers.get('content-type').includes('javascript'), 'Content-type must be javascript');
      assert(text.includes('window.__ENV__'), 'Must inject window.__ENV__ config');
      pass('GET /config.js alias delivers client script');
    }
    {
      const res = await fetch(`${baseUrl}/api/user/roles`);
      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert(Array.isArray(body.roles), 'roles must be an array');
      pass('GET /api/user/roles delivers platform role definitions');
    }
    {
      const res = await fetch(`${baseUrl}/api/data/formats`);
      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert(body.success === true);
      assert(Array.isArray(body.supportedExtensions), 'Must list supportedExtensions');
      pass('GET /api/data/formats returns supported ingestion formats');
    }
    {
      const res = await fetch(`${baseUrl}/api/catalog`);
      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert(body.success === true);
      pass('GET /api/catalog returns active intelligence catalog');
    }

    // 3. CORS Verification for Production & Local Domains
    console.log('\n>>> [3. CORS Policy Verification]');
    {
      const res = await fetch(`${baseUrl}/api/health`, {
        headers: { Origin: 'https://in-sight-q-ai.vercel.app' }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get('access-control-allow-origin'), 'https://in-sight-q-ai.vercel.app');
      pass('CORS allows *.vercel.app production origin');
    }
    {
      const res = await fetch(`${baseUrl}/api/health`, {
        headers: { Origin: 'http://localhost:8085' }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get('access-control-allow-origin'), 'http://localhost:8085');
      pass('CORS allows localhost origin');
    }
    {
      const res = await fetch(`${baseUrl}/api/health`, {
        headers: { Origin: 'https://unauthorized-domain.com' }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get('access-control-allow-origin'), null);
      pass('CORS safely disallows unauthorized origin without crashing with 500');
    }

    // 4. RBAC & Tenant Authentication Gateways
    console.log('\n>>> [4. RBAC & Tenant Authentication Gateways]');
    {
      const res = await fetch(`${baseUrl}/api/admin/overview`);
      assert.strictEqual(res.status, 401, 'Unauthenticated /api/admin/overview must return 401');
      pass('GET /api/admin/overview blocks unauthenticated callers (401)');
    }
    {
      const res = await fetch(`${baseUrl}/api/admin/users`);
      assert.strictEqual(res.status, 401, 'Unauthenticated /api/admin/users must return 401');
      pass('GET /api/admin/users blocks unauthenticated callers (401)');
    }
    {
      const res = await fetch(`${baseUrl}/api/projects`);
      assert.strictEqual(res.status, 401, 'Unauthenticated /api/projects must return 401');
      pass('GET /api/projects blocks unauthenticated callers (401)');
    }
    {
      const res = await fetch(`${baseUrl}/api/datasets`);
      assert.strictEqual(res.status, 401, 'Unauthenticated /api/datasets must return 401');
      pass('GET /api/datasets blocks unauthenticated callers (401)');
    }

    // 5. Static Asset Delivery & SPA Fallback
    console.log('\n>>> [5. Static Asset Delivery & SPA Fallback via Express Runtime]');
    {
      const res = await fetch(`${baseUrl}/`);
      assert.strictEqual(res.status, 200, 'GET / must return 200');
      const html = await res.text();
      assert(html.includes('Intelligence Engine'), 'GET / must return index.html containing Intelligence Engine');
      pass('GET / serves index.html at root route');
    }
    {
      const res = await fetch(`${baseUrl}/index.html`);
      assert.strictEqual(res.status, 200);
      const html = await res.text();
      assert(html.includes('Intelligence Engine'), 'index.html must contain Intelligence Engine title');
      pass('GET /index.html serves application SPA entrypoint');
    }
    {
      const res = await fetch(`${baseUrl}/app.js`);
      assert.strictEqual(res.status, 200, 'GET /app.js must return 200');
      const js = await res.text();
      assert(js.length > 10000, 'app.js bundle must have substantive content');
      pass('GET /app.js delivers main client application bundle');
    }
    {
      const res = await fetch(`${baseUrl}/styles/variables.css`);
      assert.strictEqual(res.status, 200);
      pass('GET /styles/variables.css delivers design system tokens');
    }
    {
      const res = await fetch(`${baseUrl}/styles/admin.css`);
      assert.strictEqual(res.status, 200);
      pass('GET /styles/admin.css delivers admin layout styles');
    }
    {
      const res = await fetch(`${baseUrl}/theme/tokens.bridge.js`);
      assert.strictEqual(res.status, 200);
      pass('GET /theme/tokens.bridge.js delivers runtime token bridge');
    }
    {
      const res = await fetch(`${baseUrl}/dashboard`);
      assert.strictEqual(res.status, 200);
      const html = await res.text();
      assert(html.includes('Intelligence Engine'), 'SPA fallback must return index.html');
      pass('GET /dashboard SPA fallback route returns index.html');
    }

    // 6. Protected Resource Security Blocking
    console.log('\n>>> [6. Protected System Resource Blocking]');
    {
      const res = await fetch(`${baseUrl}/server.js`);
      assert.strictEqual(res.status, 403, '/server.js must return 403');
      pass('GET /server.js blocked with 403 Forbidden');
    }
    {
      const res = await fetch(`${baseUrl}/package.json`);
      assert.strictEqual(res.status, 403, '/package.json must return 403');
      pass('GET /package.json blocked with 403 Forbidden');
    }
    {
      const res = await fetch(`${baseUrl}/engine/index.js`);
      assert.strictEqual(res.status, 403, '/engine/* must return 403');
      pass('GET /engine/index.js blocked with 403 Forbidden');
    }
    {
      const res = await fetch(`${baseUrl}/tests/engine/test_phase_e_production_readiness.js`);
      assert.strictEqual(res.status, 403, '/tests/* must return 403');
      pass('GET /tests/* blocked with 403 Forbidden');
    }
    {
      const res = await fetch(`${baseUrl}/scripts/db/check_db_tables.js`);
      assert.strictEqual(res.status, 403, '/scripts/* must return 403');
      pass('GET /scripts/* blocked with 403 Forbidden');
    }

  } catch (err) {
    fail('Unexpected Test Error', err);
  } finally {
    server.close();
  }

  console.log('\n================================================================');
  console.log(`   VERCEL SERVERLESS ROUTING SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  if (passedTests === totalTests) {
    console.log('   >>> ALL SERVERLESS API, STATIC, CORS & ROUTE CHECKS FULLY VERIFIED (100%) <<<');
  } else {
    console.log('   >>> FAILURES DETECTED <<<');
  }
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

run();
