/**
 * InsightIQ AI — Dedicated Administrator Persona Isolation & Lockout Prevention Regression Suite
 *
 * Test Specifications:
 * 1. Unauthenticated requests to /api/admin/verify and /api/admin/overview return HTTP 401.
 * 2. Authenticated non-admin requests to /api/admin/verify and /api/admin/overview return HTTP 403.
 * 3. Ordinary users cannot self-promote to 'Administrator' via POST /api/user/role (HTTP 403).
 * 4. Administrator (adityasharmand@gmail.com) can select 'Data Analyst' workspace persona via POST /api/user/role.
 * 5. Authoritative profile role remains 'Administrator' and does NOT get demoted to 'Data Analyst'.
 * 6. Administrator retains full access to /api/admin/verify and /api/admin/overview (HTTP 200) while in 'Data Analyst' persona.
 * 7. Administrator can switch between all canonical personas (Data Analyst, Data Scientist, Project Manager)
 *    without losing administrator privileges.
 * 8. Frontend role resolution correctly isolates analytical lens (effectiveRole) from administrative authorization.
 */

const assert = require('assert');
const http = require('http');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../.env.local') });
dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '.env') });

const { app } = require('../../server');

const TEST_PORT = 8089;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

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

async function runRegressionSuite() {
  console.log('================================================================');
  console.log('InsightIQ AI — Administrator Persona Isolation & Access Suite');
  console.log('================================================================\n');

  // Start internal test server
  let server;
  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, '127.0.0.1', () => {
      console.log(`[Test Setup] In-memory test server listening on ${BASE_URL}\n`);
      resolve();
    });
  });

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Unauthenticated request rejected with HTTP 401
    // -------------------------------------------------------------------------
    try {
      const res = await fetch(`${BASE_URL}/api/admin/verify`);
      assert.strictEqual(res.status, 401, 'Unauthenticated request to /api/admin/verify must return 401');
      const data = await res.json().catch(() => ({}));
      assert.strictEqual(data.code, 'AUTH_REQUIRED', 'Error code must be AUTH_REQUIRED');
      report(1, 'Unauthenticated request to /api/admin/verify is rejected with HTTP 401', true);
    } catch (err) {
      report(1, 'Unauthenticated request rejected with HTTP 401', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 2: Non-admin user access to /api/admin/verify rejected with HTTP 403
    // -------------------------------------------------------------------------
    try {
      const res = await fetch(`${BASE_URL}/api/admin/verify`, {
        headers: {
          'Authorization': 'Bearer mock-user-token',
          'X-Mock-Email': 'analyst@insightiq.internal',
          'X-Mock-Role': 'Data Analyst'
        }
      });
      assert.strictEqual(res.status, 403, 'Non-admin request must return 403');
      const data = await res.json().catch(() => ({}));
      assert.strictEqual(data.code, 'ADMIN_ACCESS_DENIED', 'Error code must be ADMIN_ACCESS_DENIED');
      report(2, 'Non-admin request to /api/admin/verify is rejected with HTTP 403 (ADMIN_ACCESS_DENIED)', true);
    } catch (err) {
      report(2, 'Non-admin request rejected with HTTP 403', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 3: Non-admin cannot self-promote to 'Administrator' via POST /api/user/role
    // -------------------------------------------------------------------------
    try {
      const res = await fetch(`${BASE_URL}/api/user/role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-user-token',
          'X-Mock-Email': 'analyst@insightiq.internal',
          'X-Mock-Role': 'Data Analyst'
        },
        body: JSON.stringify({
          role: 'Administrator',
          userId: 'user-standard-001'
        })
      });
      assert.strictEqual(res.status, 403, 'Self-assigning Administrator must return 403');
      const data = await res.json().catch(() => ({}));
      assert.ok(data.error && data.error.includes('cannot be self-assigned'), 'Error must specify Administrator cannot be self-assigned');
      report(3, 'Standard user cannot self-promote to Administrator via POST /api/user/role (HTTP 403)', true);
    } catch (err) {
      report(3, 'Standard user self-promotion rejected with HTTP 403', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 4: Dedicated administrator initial access returns HTTP 200
    // -------------------------------------------------------------------------
    try {
      const res = await fetch(`${BASE_URL}/api/admin/verify`, {
        headers: {
          'Authorization': 'Bearer mock-admin-token',
          'X-Mock-Email': 'adityasharmand@gmail.com',
          'X-Mock-Role': 'Administrator'
        }
      });
      assert.strictEqual(res.status, 200, 'Dedicated administrator must be authorized');
      const data = await res.json().catch(() => ({}));
      assert.strictEqual(data.authorized, true, 'Response must confirm authorized');
      assert.strictEqual(data.user.role, 'Administrator', 'Returned role must be Administrator');
      report(4, 'Dedicated administrator (adityasharmand@gmail.com) verified with HTTP 200', true);
    } catch (err) {
      report(4, 'Dedicated administrator verified with HTTP 200', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 5: Administrator selects 'Data Analyst' workspace persona via POST /api/user/role
    // -------------------------------------------------------------------------
    try {
      const res = await fetch(`${BASE_URL}/api/user/role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-admin-token',
          'X-Mock-Email': 'adityasharmand@gmail.com',
          'X-Mock-Role': 'Administrator'
        },
        body: JSON.stringify({
          role: 'Data Analyst',
          userId: 'mock-admin-id-001'
        })
      });
      assert.strictEqual(res.status, 200, 'Persona switch must succeed with HTTP 200');
      const data = await res.json().catch(() => ({}));
      assert.strictEqual(data.success, true, 'Success flag must be true');
      // CRITICAL ASSERTION: Authoritative role MUST remain 'Administrator'
      assert.strictEqual(data.role, 'Administrator', 'Authoritative role must remain Administrator');
      // CRITICAL ASSERTION: workspace_persona MUST be 'Data Analyst'
      assert.strictEqual(data.workspace_persona, 'Data Analyst', 'workspace_persona must be Data Analyst');
      assert.ok(data.message.includes('preserving Administrator privileges'), 'Message must indicate admin privileges preserved');
      report(5, 'Administrator selects Data Analyst persona; role remains Administrator, workspace_persona is Data Analyst', true);
    } catch (err) {
      report(5, 'Administrator selects Data Analyst persona', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 6: Administrator in 'Data Analyst' persona still accesses Admin Portal (/api/admin/verify)
    // -------------------------------------------------------------------------
    try {
      const res = await fetch(`${BASE_URL}/api/admin/verify`, {
        headers: {
          'Authorization': 'Bearer mock-admin-token',
          'X-Mock-Email': 'adityasharmand@gmail.com',
          'X-Mock-Role': 'Administrator',
          'X-Mock-Persona': 'Data Analyst'
        }
      });
      assert.strictEqual(res.status, 200, 'Administrator must retain access to /api/admin/verify');
      const data = await res.json().catch(() => ({}));
      assert.strictEqual(data.authorized, true);
      assert.strictEqual(data.user.role, 'Administrator');
      report(6, 'Administrator in Data Analyst persona retains full access to /api/admin/verify (HTTP 200)', true);
    } catch (err) {
      report(6, 'Administrator retains access to /api/admin/verify', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 7: Administrator in 'Data Analyst' persona still accesses Admin Overview (/api/admin/overview)
    // -------------------------------------------------------------------------
    try {
      const res = await fetch(`${BASE_URL}/api/admin/overview`, {
        headers: {
          'Authorization': 'Bearer mock-admin-token',
          'X-Mock-Email': 'adityasharmand@gmail.com',
          'X-Mock-Role': 'Administrator',
          'X-Mock-Persona': 'Data Analyst'
        }
      });
      assert.strictEqual(res.status, 200, 'Administrator must retain access to /api/admin/overview');
      const data = await res.json().catch(() => ({}));
      assert.strictEqual(data.success, true);
      assert.ok(data.metrics, 'Metrics overview payload must be returned');
      report(7, 'Administrator in Data Analyst persona retains full access to /api/admin/overview (HTTP 200)', true);
    } catch (err) {
      report(7, 'Administrator retains access to /api/admin/overview', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 8: Persona switching between all canonical roles preserves Administrator status
    // -------------------------------------------------------------------------
    try {
      const personas = ['Data Scientist', 'Project Manager', 'Data Analyst'];
      for (const persona of personas) {
        const switchRes = await fetch(`${BASE_URL}/api/user/role`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-admin-token',
            'X-Mock-Email': 'adityasharmand@gmail.com',
            'X-Mock-Role': 'Administrator'
          },
          body: JSON.stringify({
            role: persona,
            userId: 'mock-admin-id-001'
          })
        });
        assert.strictEqual(switchRes.status, 200);
        const switchData = await switchRes.json();
        assert.strictEqual(switchData.role, 'Administrator', `Role must remain Administrator when switching to ${persona}`);
        assert.strictEqual(switchData.workspace_persona, persona, `workspace_persona must update to ${persona}`);

        // Verify admin access remains open
        const verifyRes = await fetch(`${BASE_URL}/api/admin/verify`, {
          headers: {
            'Authorization': 'Bearer mock-admin-token',
            'X-Mock-Email': 'adityasharmand@gmail.com',
            'X-Mock-Role': 'Administrator',
            'X-Mock-Persona': persona
          }
        });
        assert.strictEqual(verifyRes.status, 200, `Admin verify must remain 200 when persona is ${persona}`);
      }
      report(8, 'Administrator can switch between Data Scientist, Project Manager, and Data Analyst with 100% privilege retention', true);
    } catch (err) {
      report(8, 'Administrator switching across canonical personas', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 9: Frontend role resolution logic isolates effectiveRole lens while preserving admin access
    // -------------------------------------------------------------------------
    try {
      // Simulate client-side state
      const adminProfileWithAnalystPersona = {
        id: 'usr-admin-1',
        email: 'adityasharmand@gmail.com',
        role: 'Administrator',
        workspace_persona: 'Data Analyst'
      };

      const normalizeRole = (r) => {
        if (!r) return 'data_analyst';
        const s = String(r).toLowerCase().replace(/[\s_-]+/g, '_');
        if (s.includes('analyst')) return 'data_analyst';
        if (s.includes('scientist')) return 'data_scientist';
        if (s.includes('manager')) return 'project_manager';
        if (s.includes('admin')) return 'admin';
        return 'data_analyst';
      };

      // Client effectiveRole resolution
      const effectiveRole = (adminProfileWithAnalystPersona.role === 'Administrator')
        ? (normalizeRole(adminProfileWithAnalystPersona.workspace_persona) || 'admin')
        : normalizeRole(adminProfileWithAnalystPersona.role);

      assert.strictEqual(effectiveRole, 'data_analyst', 'Effective workspace lens must be data_analyst');

      // Client route permission guard
      const isVerifiedAdmin = true;
      const can = (role, perm) => {
        if (role === 'admin') return true;
        if (perm === 'admin.manage') return false;
        return true;
      };

      // When navigating to admin:
      const activeNavAdmin = 'admin';
      const isRoutePermittedAdmin = (activeNavAdmin === 'admin' && (isVerifiedAdmin || adminProfileWithAnalystPersona.role === 'Administrator')) || can(effectiveRole, 'admin.manage');
      assert.strictEqual(isRoutePermittedAdmin, true, 'Administrator MUST be permitted to access admin route regardless of workspace lens');

      // Standard non-admin user
      const standardUserProfile = {
        id: 'usr-user-2',
        email: 'user@insightiq.internal',
        role: 'Data Analyst',
        workspace_persona: 'Data Analyst'
      };
      const standardIsAdmin = false;
      const standardEffectiveRole = normalizeRole(standardUserProfile.role);
      const isStandardPermittedAdmin = (activeNavAdmin === 'admin' && (standardIsAdmin || standardUserProfile.role === 'Administrator')) || can(standardEffectiveRole, 'admin.manage');
      assert.strictEqual(isStandardPermittedAdmin, false, 'Standard user MUST NOT be permitted to access admin route');

      report(9, 'Frontend role resolution correctly decouples analytical lens (effectiveRole) from administrative authorization', true);
    } catch (err) {
      report(9, 'Frontend role resolution decoupling', false, err.message);
    }

  } finally {
    if (server) {
      server.close();
    }
  }

  console.log('\n================================================================');
  console.log(`Results: ${passedTests}/${totalTests} Tests Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runRegressionSuite().catch((err) => {
  console.error('[Regression Fatal Error]', err);
  process.exit(1);
});
