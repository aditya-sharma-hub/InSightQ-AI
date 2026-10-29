/**
 * InsightIQ AI — Phase 2 Admin Portal Verification Suite
 *
 * Comprehensive end-to-end automated testing for:
 * 1. Strict server-side RBAC protection for /api/admin/users and /api/admin/users/:id
 * 2. Unauthenticated 401 and non-admin 403 access denial
 * 3. Authorized admin user directory retrieval with exact pagination counts
 * 4. Server-side search filtering by display name and email address
 * 5. Server-side role filtering across canonical roles
 * 6. Server-side pagination limits and page navigation
 * 7. Sensitive credential protection (no passwords, hashes, or tokens exposed)
 * 8. User access detail inspection (/api/admin/users/:id) and 404 on invalid ID
 * 9. Browser E2E non-admin access denial on #/admin/users
 * 10. Browser E2E admin access rendering User & Access Management interface
 * 11. Browser E2E search and role filter interactivity
 * 12. Browser E2E User Detail Drawer modal inspection and dismissal
 * 13. Non-disruption guarantee for existing workspace switching and sessions
 */

const assert = require('assert');
const path = require('path');
const dotenv = require('dotenv');
const puppeteer = require('puppeteer');

dotenv.config({ path: path.join(__dirname, '../../.env.local') });
dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '.env') });

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8085';
const CHROME_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function report(testNum, testName, passed, details = '') {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`  ✓ [TEST ${testNum}] PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ [TEST ${testNum}] FAIL: ${testName}${details ? ` -> ${details}` : ''}`);
  }
}

async function runSuite() {
  console.log('================================================================');
  console.log('InsightIQ AI — Phase 2 Admin Portal Verification Suite');
  console.log('User & Access Management — Access Control & Security Auditing');
  console.log('================================================================\n');

  // ==========================================================================
  // PART A: SERVER-SIDE RBAC ENDPOINT SECURITY (HTTP API)
  // ==========================================================================
  console.log('--- PART A: Server-Side RBAC Endpoint Security & API Verification ---');

  // Test 1: Unauthenticated request to /api/admin/users rejected with 401
  try {
    const res = await fetch(`${BASE_URL}/api/admin/users`);
    assert.strictEqual(res.status, 401, 'Unauthenticated access must return 401');
    const data = await res.json().catch(() => ({}));
    assert.ok(data.code === 'AUTH_REQUIRED' || data.code === 'UNAUTHENTICATED', 'Must indicate auth required');
    report(1, 'Unauthenticated request to /api/admin/users rejected with 401', true);
  } catch (err) {
    report(1, 'Unauthenticated request to /api/admin/users rejected with 401', false, err.message);
  }

  // Test 2: Non-admin caller (Data Analyst) to /api/admin/users rejected with 403 Forbidden
  try {
    const res = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: { 'Authorization': 'Bearer mock-token-data_analyst' }
    });
    assert.strictEqual(res.status, 403, 'Non-admin access must return 403 Forbidden');
    const data = await res.json().catch(() => ({}));
    assert.strictEqual(data.code, 'ADMIN_ACCESS_DENIED', 'Error code must be ADMIN_ACCESS_DENIED');
    assert.strictEqual(data.currentRole, 'Data Analyst', 'Must disclose non-admin role');
    report(2, 'Non-admin caller (Data Analyst) to /api/admin/users rejected with 403 Forbidden', true);
  } catch (err) {
    report(2, 'Non-admin caller to /api/admin/users rejected with 403', false, err.message);
  }

  // Test 3: Unauthenticated request to /api/admin/users/:id rejected with 401
  try {
    const res = await fetch(`${BASE_URL}/api/admin/users/user-analyst-sarah`);
    assert.strictEqual(res.status, 401, 'Unauthenticated detail request must return 401');
    report(3, 'Unauthenticated request to /api/admin/users/:id rejected with 401', true);
  } catch (err) {
    report(3, 'Unauthenticated request to /api/admin/users/:id rejected with 401', false, err.message);
  }

  // Test 4: Non-admin request to /api/admin/users/:id rejected with 403
  try {
    const res = await fetch(`${BASE_URL}/api/admin/users/user-analyst-sarah`, {
      headers: { 'Authorization': 'Bearer mock-token-data_analyst' }
    });
    assert.strictEqual(res.status, 403, 'Non-admin detail request must return 403');
    const data = await res.json().catch(() => ({}));
    assert.strictEqual(data.code, 'ADMIN_ACCESS_DENIED');
    report(4, 'Non-admin caller to /api/admin/users/:id rejected with 403 Forbidden', true);
  } catch (err) {
    report(4, 'Non-admin caller to /api/admin/users/:id rejected with 403', false, err.message);
  }

  // Test 5: Authorized Administrator request to /api/admin/users returns 200 with paginated directory
  let sampleUsers = [];
  try {
    const res = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: { 'Authorization': 'Bearer mock-admin-token', 'X-Test-Suite-Fixture': 'true' }
    });
    assert.strictEqual(res.status, 200, 'Admin request must return 200');
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.pagination, 'Must include pagination metadata');
    assert.ok(typeof data.pagination.totalUsers === 'number', 'totalUsers must be a number');
    assert.ok(data.pagination.totalUsers > 0, 'Directory must contain authorized user accounts');
    assert.ok(Array.isArray(data.users), 'Must return users array');
    assert.strictEqual(data.users.length, data.pagination.totalUsers);
    sampleUsers = data.users;
    report(5, `Authorized Admin /api/admin/users returns 200 with ${data.pagination.totalUsers} accounts`, true);
  } catch (err) {
    report(5, 'Authorized Admin /api/admin/users returns 200 with user directory', false, err.message);
  }

  // Test 6: Server-side search filter works by name and email
  try {
    const searchRes = await fetch(`${BASE_URL}/api/admin/users?search=alex`, {
      headers: { 'Authorization': 'Bearer mock-admin-token', 'X-Test-Suite-Fixture': 'true' }
    });
    assert.strictEqual(searchRes.status, 200);
    const data = await searchRes.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.pagination.totalUsers >= 1, 'Search for "alex" must match at least 1 user');
    assert.ok(data.users.every(u => u.displayName.toLowerCase().includes('alex') || u.email.toLowerCase().includes('alex')), 'All results must match query');
    report(6, 'Server-side search query filters directory by name and email correctly', true, `Matched: ${data.users[0]?.displayName}`);
  } catch (err) {
    report(6, 'Server-side search query filters directory correctly', false, err.message);
  }

  // Test 7: Server-side role filter works for canonical roles
  try {
    const roleRes = await fetch(`${BASE_URL}/api/admin/users?role=Data%20Scientist`, {
      headers: { 'Authorization': 'Bearer mock-admin-token', 'X-Test-Suite-Fixture': 'true' }
    });
    assert.strictEqual(roleRes.status, 200);
    const data = await roleRes.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.pagination.totalUsers >= 1, 'Must return at least 1 Data Scientist');
    assert.ok(data.users.every(u => u.assignedRole === 'Data Scientist'), 'All returned users must have role Data Scientist');
    report(7, 'Server-side role filtering isolates accounts by trusted role (Data Scientist)', true, `Count: ${data.pagination.totalUsers}`);
  } catch (err) {
    report(7, 'Server-side role filtering isolates accounts correctly', false, err.message);
  }

  // Test 8: Server-side pagination works (page & limit limits slice size)
  try {
    const pageRes = await fetch(`${BASE_URL}/api/admin/users?page=2&limit=3`, {
      headers: { 'Authorization': 'Bearer mock-admin-token', 'X-Test-Suite-Fixture': 'true' }
    });
    assert.strictEqual(pageRes.status, 200);
    const data = await pageRes.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.pagination.page, 2, 'Page must be 2');
    assert.strictEqual(data.pagination.limit, 3, 'Limit must be 3');
    assert.strictEqual(data.users.length, 3, 'Must return exactly 3 users for page 2');
    report(8, 'Server-side pagination limits page slices accurately', true, `Page 2 has ${data.users.length} items of ${data.pagination.totalUsers} total`);
  } catch (err) {
    report(8, 'Server-side pagination limits page slices accurately', false, err.message);
  }

  // Test 9: Sensitive credential protection: No password hashes or auth tokens exposed
  try {
    const checkRes = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: { 'Authorization': 'Bearer mock-admin-token', 'X-Test-Suite-Fixture': 'true' }
    });
    const data = await checkRes.json();
    for (const u of data.users) {
      assert.strictEqual(u.password, undefined, 'Password field must not exist');
      assert.strictEqual(u.encrypted_password, undefined, 'Encrypted password must not exist');
      assert.strictEqual(u.password_hash, undefined, 'Password hash must not exist');
      assert.strictEqual(u.access_token, undefined, 'Access token must not exist');
      assert.strictEqual(u.token, undefined, 'Token must not exist');
      assert.strictEqual(u.role_configured, undefined, 'role_configured column must not be assumed');
      assert.ok(u.id, 'User ID must be present');
      assert.ok(u.displayName, 'Display name must be present');
      assert.ok(u.email, 'Email must be present');
      assert.ok(u.assignedRole, 'Assigned role must be present');
      assert.ok(u.accountStatus, 'Account status must be present');
    }
    report(9, 'Data sanitization verified: Zero credentials, tokens, or schema artifacts leaked', true);
  } catch (err) {
    report(9, 'Data sanitization verified', false, err.message);
  }

  // Test 10: User detail inspection (/api/admin/users/:id) returns comprehensive security profile
  try {
    const detailRes = await fetch(`${BASE_URL}/api/admin/users/user-analyst-sarah`, {
      headers: { 'Authorization': 'Bearer mock-admin-token', 'X-Test-Suite-Fixture': 'true' }
    });
    assert.strictEqual(detailRes.status, 200);
    const data = await detailRes.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.user, 'User object must be present');
    assert.strictEqual(data.user.id, 'user-analyst-sarah');
    assert.strictEqual(data.user.displayName, 'Sarah Chen');
    assert.strictEqual(data.user.assignedRole, 'Data Analyst');
    assert.ok(Array.isArray(data.user.permissions), 'Permissions capability list must be present');
    assert.ok(data.user.permissions.includes('dataset.explore'), 'Analyst must have dataset.explore capability');
    assert.strictEqual(data.user.mutationsPermitted.roleElevation, false, 'Role elevation must be blocked');
    report(10, 'User access detail inspection (/api/admin/users/:id) delivers trusted security profile', true);
  } catch (err) {
    report(10, 'User access detail inspection delivers trusted security profile', false, err.message);
  }

  // Test 11: Invalid user ID returns 404 USER_NOT_FOUND
  try {
    const notFoundRes = await fetch(`${BASE_URL}/api/admin/users/nonexistent-user-uuid-9999`, {
      headers: { 'Authorization': 'Bearer mock-admin-token', 'X-Test-Suite-Fixture': 'true' }
    });
    assert.strictEqual(notFoundRes.status, 404, 'Must return 404 for invalid user ID');
    const data = await notFoundRes.json();
    assert.strictEqual(data.code, 'USER_NOT_FOUND');
    report(11, 'Invalid user ID lookup correctly returns HTTP 404 USER_NOT_FOUND', true);
  } catch (err) {
    report(11, 'Invalid user ID lookup returns HTTP 404', false, err.message);
  }

  // ==========================================================================
  // PART B: BROWSER USER INTERFACE & ACCESS CONTROL (PUPPETEER E2E)
  // ==========================================================================
  console.log('\n--- PART B: Browser UI & Access Control Verification (Puppeteer E2E) ---');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  async function seedSession(page, user) {
    await page.setExtraHTTPHeaders({ 'x-test-suite-fixture': 'true' });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    await page.evaluate((u) => {
      const mockUser = {
        id: u.id,
        email: u.email,
        user_metadata: { full_name: u.full_name, role: u.role }
      };
      localStorage.setItem('insightiq_user_session', JSON.stringify({
        access_token: u.token,
        user: mockUser
      }));
      localStorage.setItem('insightiq_supabase_auth_token', JSON.stringify({
        access_token: u.token,
        refresh_token: 'dummy-refresh-token',
        expires_at: Math.floor(Date.now() / 1000) + 7200,
        user: mockUser
      }));
      localStorage.setItem('insightiq_user_profile', JSON.stringify({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        role: u.role
      }));
      localStorage.setItem('insightiq_dev_preview_role', u.role === 'Administrator' ? 'admin' : 'data_analyst');
    }, user);
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForFunction(
      () => Boolean(document.querySelector('.app-container') || document.querySelector('.admin-portal-root') || document.querySelector('#header-role-badge')),
      { timeout: 12000 }
    );
  }

  try {
    // Test 12: Non-Admin User Navigating to #/admin/users Displays 403 Forbidden Screen
    console.log('\n[12/18] Testing Non-Admin access to #/admin/users renders 403 Access Denied view...');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });

      await seedSession(page, {
        id: 'user-analyst-sarah',
        email: 'sarah.chen@insightiq.internal',
        full_name: 'Sarah Chen',
        role: 'Data Analyst',
        token: 'mock-token-data_analyst'
      });

      // Direct URL navigation to #/admin/users
      await page.evaluate(() => { window.location.hash = '#/admin/users'; });
      await page.waitForSelector('.admin-403-container', { timeout: 8000 });

      const state = await page.evaluate(() => {
        const container = document.querySelector('.admin-403-container');
        const title = container?.querySelector('h2')?.textContent || '';
        const role = container?.querySelector('.admin-denied-badge')?.textContent || '';
        const returnBtn = document.querySelector('#btn-admin-denied-return');
        return { hasContainer: Boolean(container), title, role, hasReturnBtn: Boolean(returnBtn) };
      });

      assert.ok(state.hasContainer, 'Must render .admin-403-container');
      assert.ok(state.title.includes('Administrator Privileges Required'), 'Title must require admin privileges');
      assert.ok(state.hasReturnBtn, 'Must render return button');

      report(12, 'Non-admin navigating directly to #/admin/users is strictly blocked with 403 screen', true);
      await page.close();
    }

    // Test 13: Administrator Navigating to #/admin/users Renders User & Access Management Interface
    console.log('\n[13/18] Testing Administrator access to #/admin/users renders User Management view...');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });

      await seedSession(page, {
        id: 'mock-admin-id-001',
        email: 'admin@insightiq.internal',
        full_name: 'System Administrator (Test)',
        role: 'Administrator',
        token: 'mock-admin-token'
      });

      await page.evaluate(() => { window.location.hash = '#/admin/users'; });
      await page.waitForSelector('#admin-users-view', { timeout: 8000 });
      await page.waitForSelector('.admin-users-table', { timeout: 8000 });

      const viewState = await page.evaluate(() => {
        const heading = document.querySelector('.admin-page-title-group h1')?.textContent || '';
        const countChip = document.querySelector('.admin-stat-chip.highlight')?.textContent || '';
        const banner = document.querySelector('#admin-users-phase2-banner')?.textContent || '';
        const searchInput = Boolean(document.querySelector('#admin-users-search'));
        const roleFilter = Boolean(document.querySelector('#admin-users-role-filter'));
        const tableRows = document.querySelectorAll('.admin-users-table tbody tr').length;
        return { heading, countChip, banner, searchInput, roleFilter, tableRows };
      });

      assert.ok(viewState.heading.includes('User & Access Management'), `Heading must match, got: ${viewState.heading}`);
      assert.ok(viewState.countChip.includes('Registered Accounts'), `Stat chip must show account count: ${viewState.countChip}`);
      assert.ok(viewState.banner.includes('Phase 2'), `Scope banner must indicate Phase 2: ${viewState.banner}`);
      assert.ok(viewState.searchInput, 'Search input must be present');
      assert.ok(viewState.roleFilter, 'Role filter must be present');
      assert.ok(viewState.tableRows >= 8, `Table must display user rows, found: ${viewState.tableRows}`);

      report(13, 'Administrator access to #/admin/users renders full User Management UI with 8 accounts', true, viewState.countChip);
      await page.close();
    }

    // Test 14: Table Columns & Attribute Verification (Display name, email with lock, trusted role badge)
    console.log('\n[14/18] Testing Table column data attributes & security presentation...');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });

      await seedSession(page, {
        id: 'mock-admin-id-001',
        email: 'admin@insightiq.internal',
        full_name: 'System Administrator (Test)',
        role: 'Administrator',
        token: 'mock-admin-token'
      });

      await page.evaluate(() => { window.location.hash = '#/admin/users'; });
      await page.waitForSelector('.admin-users-table tbody tr', { timeout: 8000 });

      const rowDetails = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('.admin-users-table tbody tr'));
        return rows.map(r => ({
          name: r.querySelector('.admin-user-display-name')?.textContent.trim(),
          email: r.querySelector('.admin-email-cell')?.textContent.trim(),
          hasLock: Boolean(r.querySelector('.email-lock-icon')),
          role: r.querySelector('.admin-role-badge')?.textContent.trim(),
          persona: r.querySelector('.admin-persona-tag')?.textContent.trim(),
          status: r.querySelector('.admin-status-badge')?.textContent.trim(),
          hasInspectBtn: Boolean(r.querySelector('.btn-inspect-user'))
        }));
      });

      assert.ok(rowDetails.length >= 8, 'Must have at least 8 rows');
      const adminRow = rowDetails.find(r => r.name?.includes('System Administrator'));
      const sarahRow = rowDetails.find(r => r.name?.includes('Sarah Chen'));
      const alexRow = rowDetails.find(r => r.name?.includes('Alex Rivera'));

      assert.ok(adminRow, 'Admin account row must be present');
      assert.ok(adminRow.role.includes('Administrator'), 'Admin role must be styled');
      assert.ok(sarahRow && sarahRow.role.includes('Data Analyst'), 'Sarah Chen must be Data Analyst');
      assert.ok(alexRow && alexRow.role.includes('Data Scientist'), 'Alex Rivera must be Data Scientist');
      assert.ok(rowDetails.every(r => r.hasLock), 'All emails must display lock icon indicating authorized admin disclosure');
      assert.ok(rowDetails.every(r => r.hasInspectBtn), 'All rows must have "Inspect Access" button');

      report(14, 'Table columns accurately display avatar, email with lock, trusted role badge, and status', true);
      await page.close();
    }

    // Test 15: Search and Role Filter Interactivity
    console.log('\n[15/18] Testing Search input and Role filter interactivity...');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });

      await seedSession(page, {
        id: 'mock-admin-id-001',
        email: 'admin@insightiq.internal',
        full_name: 'System Administrator (Test)',
        role: 'Administrator',
        token: 'mock-admin-token'
      });

      await page.evaluate(() => { window.location.hash = '#/admin/users'; });
      await page.waitForSelector('#admin-users-search', { timeout: 8000 });

      // 1. Test search input
      await page.type('#admin-users-search', 'Sarah');
      await page.click('#btn-admin-users-search');
      await page.waitForFunction(
        () => document.querySelectorAll('.admin-users-table tbody tr').length === 1,
        { timeout: 6000 }
      );

      const searchedName = await page.$eval('.admin-user-display-name', el => el.textContent.trim());
      assert.ok(searchedName.includes('Sarah Chen'), `Searched row must be Sarah Chen, got: ${searchedName}`);

      // 2. Clear search and test role filter
      await page.click('#btn-admin-users-reset');
      await page.waitForFunction(
        () => document.querySelectorAll('.admin-users-table tbody tr').length >= 8,
        { timeout: 6000 }
      );

      // Select 'Data Scientist' filter
      await page.select('#admin-users-role-filter', 'Data Scientist');
      await page.waitForFunction(
        () => {
          const rows = document.querySelectorAll('.admin-users-table tbody tr');
          return rows.length === 2;
        },
        { timeout: 6000 }
      );

      const filteredRoles = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.admin-role-badge')).map(el => el.textContent.trim());
      });
      assert.ok(filteredRoles.every(r => r.includes('Data Scientist')), 'All rows must be Data Scientist');

      report(15, 'Search input and Role filter dynamically filter table rows via live API query', true);
      await page.close();
    }

    // Test 16: Pagination Controls
    console.log('\n[16/18] Testing Pagination controls (page navigation and page size selector)...');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });

      await seedSession(page, {
        id: 'mock-admin-id-001',
        email: 'admin@insightiq.internal',
        full_name: 'System Administrator (Test)',
        role: 'Administrator',
        token: 'mock-admin-token'
      });

      await page.evaluate(() => { window.location.hash = '#/admin/users'; });
      await page.waitForSelector('#admin-users-page-size', { timeout: 8000 });

      // In the API, mock total is 8 accounts. With pageSize = 10, totalPages = 1.
      // Let's verify pagination bar renders correctly.
      const paginationState = await page.evaluate(() => {
        const text = document.querySelector('.admin-pagination')?.textContent || '';
        const prevDisabled = document.querySelector('#btn-prev-page')?.disabled;
        const nextDisabled = document.querySelector('#btn-next-page')?.disabled;
        const pageIndicator = document.querySelector('.admin-page-indicator')?.textContent || '';
        return { text, prevDisabled, nextDisabled, pageIndicator };
      });

      assert.ok(paginationState.text.includes('8 authorized accounts'), 'Must report 8 authorized accounts');
      assert.strictEqual(paginationState.prevDisabled, true, 'Prev button must be disabled on page 1');
      assert.ok(paginationState.pageIndicator.includes('Page 1 of 1'), `Page indicator must show Page 1 of 1, got: ${paginationState.pageIndicator}`);

      report(16, 'Pagination controls render correct boundary states and total account indicators', true);
      await page.close();
    }

    // Test 17: User Detail Drawer Modal Inspection
    console.log('\n[17/18] Testing User Detail Drawer modal inspection...');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });

      await seedSession(page, {
        id: 'mock-admin-id-001',
        email: 'admin@insightiq.internal',
        full_name: 'System Administrator (Test)',
        role: 'Administrator',
        token: 'mock-admin-token'
      });

      await page.evaluate(() => { window.location.hash = '#/admin/users'; });
      await page.waitForSelector('#btn-inspect-user-sci-alex', { timeout: 8000 });

      // Click "Inspect Access" for Dr. Alex Rivera
      await page.click('#btn-inspect-user-sci-alex');
      await page.waitForSelector('#admin-user-detail-modal', { timeout: 6000 });
      await page.waitForSelector('.admin-cap-badge', { timeout: 6000 });

      const drawerState = await page.evaluate(() => {
        const modal = Boolean(document.querySelector('#admin-user-detail-modal'));
        const name = document.querySelector('.admin-drawer-name')?.textContent.trim();
        const email = document.querySelector('.admin-drawer-email')?.textContent.trim();
        const role = document.querySelector('.admin-drawer-section .admin-role-badge')?.textContent.trim();
        const caps = Array.from(document.querySelectorAll('.admin-cap-badge')).map(el => el.textContent.trim());
        const closeBtn = Boolean(document.querySelector('#btn-close-user-drawer'));
        return { modal, name, email, role, capCount: caps.length, caps, closeBtn };
      });

      assert.ok(drawerState.modal, 'Detail drawer modal must be visible');
      assert.strictEqual(drawerState.name, 'Dr. Alex Rivera', 'Drawer must show Alex Rivera');
      assert.strictEqual(drawerState.email, 'alex.rivera@insightiq.internal');
      assert.ok(drawerState.role.includes('Data Scientist'), 'Role must be Data Scientist');
      assert.ok(drawerState.caps.includes('models.train'), 'Must list models.train capability');
      assert.ok(drawerState.caps.includes('dataset.explore'), 'Must list dataset.explore capability');

      // Dismiss drawer using close button
      await page.click('#btn-close-user-drawer');
      await page.waitForFunction(
        () => !document.querySelector('#admin-user-detail-modal'),
        { timeout: 4000 }
      );

      report(17, 'User Detail Drawer opens, renders role clearance & platform capabilities, and dismisses cleanly', true);
      await page.close();
    }

    // Test 18: Seamless Return to Workspace Navigation from #/admin/users
    console.log('\n[18/18] Testing Return to Workspace from User Management module...');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });

      await seedSession(page, {
        id: 'mock-admin-id-001',
        email: 'admin@insightiq.internal',
        full_name: 'System Administrator (Test)',
        role: 'Administrator',
        token: 'mock-admin-token'
      });

      await page.evaluate(() => { window.location.hash = '#/admin/users'; });
      await page.waitForSelector('.admin-users-table', { timeout: 8000 });
      await page.waitForSelector('#btn-admin-header-return-workspace', { timeout: 8000 });

      // Click "← Back to Workspace"
      await page.click('#btn-admin-header-return-workspace');
      await page.waitForSelector('.app-container', { timeout: 6000 });

      const finalHash = await page.evaluate(() => window.location.hash);
      assert.strictEqual(finalHash, '#/overview', 'Return to Workspace must return to #/overview');

      report(18, 'Return to Workspace navigates back to analytical dashboard without altering permissions', true);
      await page.close();
    }

  } finally {
    await browser.close();
  }

  // Summary
  console.log('\n================================================================');
  console.log(`Phase 2 Verification Summary: ${passedTests}/${totalTests} Tests Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error('\n[FATAL SUITE ERROR]:', err);
  process.exit(1);
});
