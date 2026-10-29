/**
 * InsightIQ AI — Vercel Serverless Routing & Endpoint Verification Suite
 *
 * Verifies that the Vercel serverless entry point (`api/index.js`) and Express app
 * properly handle all required public, protected, static, and security-blocked routes.
 */

const assert = require('assert');
const http = require('http');
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

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // 1. Health & Observability Endpoints
    console.log('>>> [1. Health & Observability Endpoints]');
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

    // 2. Client Configuration & Runtime Deliverables
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

    // 3. Security Boundaries & Authentication Protection
    console.log('\n>>> [3. RBAC & Tenant Authentication Gateways]');
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

    // 4. Static Asset Delivery via Express Runtime
    console.log('\n>>> [4. Static Asset Delivery via Express Handler]');
    {
      const res = await fetch(`${baseUrl}/index.html`);
      assert.strictEqual(res.status, 200);
      const html = await res.text();
      assert(html.includes('Intelligence Engine'), 'index.html must contain Intelligence Engine title');
      pass('GET /index.html serves application SPA entrypoint');
    }
    {
      const res = await fetch(`${baseUrl}/styles/variables.css`);
      assert.strictEqual(res.status, 200);
      pass('GET /styles/variables.css delivers design system tokens');
    }
    {
      const res = await fetch(`${baseUrl}/theme/tokens.bridge.js`);
      assert.strictEqual(res.status, 200);
      pass('GET /theme/tokens.bridge.js delivers runtime token bridge');
    }

    // 5. Protected Resource Security Blocking
    console.log('\n>>> [5. Protected System Resource Blocking]');
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
    console.log('   >>> ALL SERVERLESS API & ROUTE CHECKS FULLY VERIFIED (100%) <<<');
  } else {
    console.log('   >>> FAILURES DETECTED <<<');
  }
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

run();
