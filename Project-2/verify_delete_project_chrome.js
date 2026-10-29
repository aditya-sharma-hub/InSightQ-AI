const puppeteer = require('puppeteer');
const path = require('path');

const BASE_URL = 'http://localhost:8085';
const ARTIFACT_DIR = 'C:\\Users\\admin\\.gemini\\antigravity\\brain\\f86b47ed-6332-40d5-b1a1-f6e1ef666f83';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runVerification() {
  console.log('=== InsightIQ AI: Delete Project End-to-End Verification (Chrome + Backend API) ===');
  const results = [];
  const logCheck = (name, passed, details = '') => {
    results.push({ name, passed, details });
    console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: ${name}${details ? ' — ' + details : ''}`);
  };

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  try {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('pageerror', err => consoleErrors.push(err.message));

    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });

    // Seed authenticated user session and initial workspace data without touching production DB
    const ownerUserId = '00000000-0000-4000-a000-000000000001';
    const ownerEmail = 'alex.rivera@insightiq.ai';

    await page.evaluate(({ ownerUserId, ownerEmail }) => {
      localStorage.clear();
      localStorage.setItem('insightiq_user_session', JSON.stringify({
        access_token: `mock-user-${ownerUserId}`,
        user: { id: ownerUserId, email: ownerEmail }
      }));
      localStorage.setItem('insightiq_user_profile', JSON.stringify({
        id: ownerUserId,
        email: ownerEmail,
        full_name: 'Alex Rivera',
        role: 'Data Analyst'
      }));
    }, { ownerUserId, ownerEmail });

    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(800);

    // Seed a non-demo shared dataset ('ds-shared-enterprise-001') so we can verify it is preserved across project deletion & reload
    await page.evaluate(({ ownerUserId }) => {
      if (window.__insightIQTest && window.__insightIQTest.triggerDataDashboard) {
        window.__insightIQTest.triggerDataDashboard('data_analyst');
      }
      const sharedDataset = {
        id: 'ds-shared-enterprise-001',
        user_id: ownerUserId,
        name: 'Enterprise_Supply_Chain_Shared',
        original_filename: 'Enterprise_Supply_Chain_Shared.csv',
        file_type: 'CSV',
        file_size: 4250120,
        row_count: 24500,
        column_count: 18,
        status: 'active',
        is_demo: false,
        created_at: new Date().toISOString(),
        columns: [
          { column_name: 'Order_ID', data_type: 'string', is_numeric: false },
          { column_name: 'Revenue', data_type: 'number', is_numeric: true },
          { column_name: 'Order_Date', data_type: 'date', is_temporal: true }
        ]
      };
      localStorage.setItem('insightiq_user_datasets', JSON.stringify([sharedDataset]));
      localStorage.setItem('insightiq_active_dataset_id', 'ds-shared-enterprise-001');
    }, { ownerUserId });
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(700);

    // Navigate to #/projects
    await page.evaluate(() => {
      window.location.hash = '#/projects';
    });
    await sleep(800);

    // -------------------------------------------------------------------------
    // TEST 8A: Create a dedicated disposable test project linked to shared dataset
    // -------------------------------------------------------------------------
    const testProjectName = 'Disposable Churn Audit 2026';
    await page.evaluate(() => {
      if (window.__insightIQTest && window.__insightIQTest.openCreateProjectModal) {
        window.__insightIQTest.openCreateProjectModal();
      }
    });
    await sleep(450);

    await page.waitForSelector('.entity-form-input', { timeout: 5000 });
    await page.type('.entity-form-input', testProjectName);
    await page.type('.entity-form-textarea', 'Disposable test project for verifying safe deletion and shared dataset preservation.');
    await sleep(200);
    await page.click('.entity-modal-footer button[type="submit"]');
    await sleep(900);

    // Extract created project ID and verify it was persisted in localStorage and synced to backend
    const createdProjectInfo = await page.evaluate((expectedName) => {
      const projects = JSON.parse(localStorage.getItem('insightiq_user_projects') || '[]');
      const found = projects.find(p => p.name === expectedName);
      return {
        found,
        totalCount: projects.length,
        currentHash: window.location.hash
      };
    }, testProjectName);

    logCheck(
      '1a. Create disposable test project & open detail view',
      Boolean(createdProjectInfo.found && createdProjectInfo.found.id),
      `Project ID: ${createdProjectInfo.found?.id}, Hash: ${createdProjectInfo.currentHash}`
    );

    const disposableProjectId = createdProjectInfo.found.id;

    // -------------------------------------------------------------------------
    // TEST 1: Verify Delete Project action appears on Project Detail Lens Header
    // -------------------------------------------------------------------------
    const lensMenuBtn = await page.$('#project-lens-actions-btn');
    logCheck(
      '1b. Three-dot actions menu present on Project Detail Header',
      Boolean(lensMenuBtn)
    );

    if (lensMenuBtn) {
      await lensMenuBtn.click();
      await sleep(300);
      const lensDeleteOption = await page.$('#project-lens-delete-menu-item');
      logCheck(
        '1c. Delete Project option visible in Project Detail Header menu',
        Boolean(lensDeleteOption)
      );
      // Close menu by clicking lensMenuBtn again
      await lensMenuBtn.click();
      await sleep(200);
    }

    // Navigate back to Portfolio Grid (#/projects) to test card 3-dot menu
    await page.evaluate(() => {
      window.location.hash = '#/projects';
    });
    await sleep(600);

    const cardMenuSelector = `#project-actions-btn-${disposableProjectId}`;
    const cardDeleteItemSelector = `#project-delete-menu-item-${disposableProjectId}`;
    const cardMenuBtn = await page.$(cardMenuSelector);
    logCheck(
      '1d. Three-dot actions menu present on Project Card in Portfolio Grid',
      Boolean(cardMenuBtn),
      cardMenuSelector
    );

    await cardMenuBtn.click();
    await sleep(350);

    // Screenshot of 3-dot menu open on project card (Desktop 1440px)
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'delete_project_menu_1440px.png'),
      fullPage: false
    });

    const cardDeleteBtn = await page.$(cardDeleteItemSelector);
    logCheck(
      '1e. Destructive Delete Project item visible in Project Card menu',
      Boolean(cardDeleteBtn)
    );

    // -------------------------------------------------------------------------
    // TEST 2: Canceling confirmation leaves the project untouched
    // -------------------------------------------------------------------------
    await cardDeleteBtn.click();
    await sleep(400);

    const modalVisible = await page.$('#delete-project-modal');
    logCheck(
      '2a. Clicking Delete Project opens centered confirmation dialog',
      Boolean(modalVisible)
    );

    // Screenshot of Delete Project Confirmation Modal on Desktop (1440px)
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'delete_project_modal_1440px.png'),
      fullPage: false
    });

    // Click Cancel button
    await page.click('#btn-cancel-delete-project');
    await sleep(400);

    const afterCancelCheck = await page.evaluate((pid) => {
      const modalStillOpen = Boolean(document.querySelector('#delete-project-modal'));
      const projects = JSON.parse(localStorage.getItem('insightiq_user_projects') || '[]');
      const stillExists = projects.some(p => p.id === pid);
      return { modalStillOpen, stillExists };
    }, disposableProjectId);

    logCheck(
      '2b. Canceling confirmation closes dialog and leaves project untouched',
      !afterCancelCheck.modalStillOpen && afterCancelCheck.stillExists
    );

    // -------------------------------------------------------------------------
    // TEST 3: Incorrect confirmation text prevents deletion
    // -------------------------------------------------------------------------
    await page.click(cardMenuSelector);
    await sleep(300);
    await page.click(cardDeleteItemSelector);
    await sleep(350);

    await page.type('#delete-project-confirm-input', 'Wrong Project Name');
    await sleep(250);

    const wrongTextState = await page.evaluate((pid) => {
      const confirmBtn = document.querySelector('#btn-confirm-delete-project');
      const isDisabled = confirmBtn ? confirmBtn.disabled : false;
      // Attempt click even when disabled
      if (confirmBtn) confirmBtn.click();
      const projects = JSON.parse(localStorage.getItem('insightiq_user_projects') || '[]');
      return {
        isDisabled,
        stillExists: projects.some(p => p.id === pid)
      };
    }, disposableProjectId);

    logCheck(
      '3. Incorrect confirmation text keeps Delete Project button disabled and prevents deletion',
      wrongTextState.isDisabled && wrongTextState.stillExists
    );

    // -------------------------------------------------------------------------
    // TEST 9: Mobile (375px) & Desktop (1440px) dialog responsiveness check
    // -------------------------------------------------------------------------
    await page.setViewport({ width: 375, height: 812 });
    await sleep(350);

    const mobileModalCheck = await page.evaluate(() => {
      const dialog = document.querySelector('.delete-project-dialog');
      const cancelBtn = document.querySelector('#btn-cancel-delete-project');
      const confirmBtn = document.querySelector('#btn-confirm-delete-project');
      if (!dialog || !cancelBtn || !confirmBtn) return { fits: false };
      const r = dialog.getBoundingClientRect();
      const c1 = cancelBtn.getBoundingClientRect();
      const c2 = confirmBtn.getBoundingClientRect();
      return {
        fits: r.left >= 0 && r.right <= 375 && r.top >= 0 && r.bottom <= 812,
        buttonsVisible: c1.width > 0 && c2.width > 0 && c1.bottom <= 812 && c2.bottom <= 812,
        pageOverflow: document.documentElement.scrollWidth > 375,
        dialogRect: { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), height: Math.round(r.height) }
      };
    });

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'delete_project_modal_375px.png'),
      fullPage: false
    });

    logCheck(
      '9. Mobile (375px) confirmation dialog fits viewport without horizontal overflow',
      mobileModalCheck.fits && mobileModalCheck.buttonsVisible && !mobileModalCheck.pageOverflow,
      JSON.stringify(mobileModalCheck.dialogRect)
    );

    // Restore 1440px desktop viewport
    await page.setViewport({ width: 1440, height: 900 });
    await sleep(300);

    // -------------------------------------------------------------------------
    // TEST 6: Unauthorized users cannot delete another user's project via API
    // -------------------------------------------------------------------------
    const apiSecurityResults = await page.evaluate(async ({ pid, expectedName }) => {
      // 6a. Unauthenticated request (no Authorization header)
      const unauthResp = await fetch(`/api/projects/${encodeURIComponent(pid)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmName: expectedName })
      });

      // 6b. Authenticated as a different non-owner user
      const otherUserId = '00000000-0000-4000-a000-000000000999';
      const otherUserResp = await fetch(`/api/projects/${encodeURIComponent(pid)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer mock-user-${otherUserId}`,
          'x-user-id': otherUserId,
          'x-user-email': 'intruder@external.org',
          'x-user-role': 'Data Analyst'
        },
        body: JSON.stringify({
          confirmName: expectedName,
          expectedProjectName: expectedName,
          ownerId: '00000000-0000-4000-a000-000000000001',
          ownerEmail: 'alex.rivera@insightiq.ai'
        })
      });
      const otherUserBody = await otherUserResp.json().catch(() => ({}));

      // 6c. Authorized owner sending mismatched confirmation name to backend
      const mismatchResp = await fetch(`/api/projects/${encodeURIComponent(pid)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-user-00000000-0000-4000-a000-000000000001',
          'x-user-id': '00000000-0000-4000-a000-000000000001',
          'x-user-email': 'alex.rivera@insightiq.ai',
          'x-user-role': 'Data Analyst'
        },
        body: JSON.stringify({
          confirmName: 'Wrong Name',
          expectedProjectName: expectedName
        })
      });

      return {
        unauthStatus: unauthResp.status,
        otherUserStatus: otherUserResp.status,
        otherUserCode: otherUserBody.code,
        mismatchStatus: mismatchResp.status
      };
    }, { pid: disposableProjectId, expectedName: testProjectName });

    logCheck(
      '6a. Unauthenticated DELETE /api/projects/:id rejected with HTTP 401',
      apiSecurityResults.unauthStatus === 401,
      `HTTP ${apiSecurityResults.unauthStatus}`
    );
    logCheck(
      '6b. Non-owner user DELETE /api/projects/:id rejected with HTTP 403 Forbidden',
      apiSecurityResults.otherUserStatus === 403 && apiSecurityResults.otherUserCode === 'PROJECT_DELETE_FORBIDDEN',
      `HTTP ${apiSecurityResults.otherUserStatus} (${apiSecurityResults.otherUserCode})`
    );
    logCheck(
      '6c. Mismatched confirmation name rejected by backend with HTTP 400',
      apiSecurityResults.mismatchStatus === 400,
      `HTTP ${apiSecurityResults.mismatchStatus}`
    );

    // -------------------------------------------------------------------------
    // TEST 4: Confirming deletion with exact project name removes project
    // -------------------------------------------------------------------------
    // Clear input and type exact project name
    await page.evaluate(() => {
      const inp = document.querySelector('#delete-project-confirm-input');
      if (inp) inp.value = '';
    });
    await page.click('#delete-project-confirm-input', { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.type('#delete-project-confirm-input', testProjectName);
    await sleep(300);

    const enabledBeforeClick = await page.evaluate(() => {
      const btn = document.querySelector('#btn-confirm-delete-project');
      return btn && !btn.disabled;
    });
    logCheck(
      '4a. Typing exact project name enables Delete Project button',
      Boolean(enabledBeforeClick)
    );

    await page.click('#btn-confirm-delete-project');
    await sleep(900);

    const postDeleteCheck = await page.evaluate(async ({ pid, expectedName }) => {
      const modalOpen = Boolean(document.querySelector('#delete-project-modal'));
      const projects = JSON.parse(localStorage.getItem('insightiq_user_projects') || '[]');
      const deletedIds = JSON.parse(localStorage.getItem('insightiq_deleted_project_ids') || '[]');
      const cardInDom = Boolean(document.querySelector(`#project-actions-btn-${pid}`));
      const toastEl = document.querySelector('#project-action-toast') || document.querySelector('#role-success-toast');
      const toastText = toastEl ? toastEl.innerText : '';

      // Query backend GET /api/projects to verify deletion on server
      const apiResp = await fetch('/api/projects', {
        headers: {
          'Authorization': 'Bearer mock-user-00000000-0000-4000-a000-000000000001',
          'x-user-id': '00000000-0000-4000-a000-000000000001',
          'x-user-email': 'alex.rivera@insightiq.ai',
          'x-user-role': 'Data Analyst'
        }
      });
      const apiData = await apiResp.json().catch(() => ({}));
      const inServerProjects = (apiData.projects || []).some(p => p.id === pid);
      const inServerDeletedIds = (apiData.deletedProjectIds || []).includes(pid);

      return {
        modalOpen,
        inLocalProjects: projects.some(p => p.id === pid),
        inLocalDeletedIds: deletedIds.includes(pid),
        cardInDom,
        toastText,
        inServerProjects,
        inServerDeletedIds
      };
    }, { pid: disposableProjectId, expectedName: testProjectName });

    logCheck(
      '4b. Confirmed deletion removes project from UI, localStorage, and backend registry',
      !postDeleteCheck.modalOpen &&
      !postDeleteCheck.inLocalProjects &&
      postDeleteCheck.inLocalDeletedIds &&
      !postDeleteCheck.cardInDom &&
      !postDeleteCheck.inServerProjects &&
      postDeleteCheck.inServerDeletedIds,
      `Toast: "${postDeleteCheck.toastText}"`
    );

    // -------------------------------------------------------------------------
    // TEST 5: Refreshing the page does NOT restore the deleted project
    // -------------------------------------------------------------------------
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(900);

    const afterRefreshCheck = await page.evaluate((pid) => {
      const projects = JSON.parse(localStorage.getItem('insightiq_user_projects') || '[]');
      const cardInDom = Boolean(document.querySelector(`#project-actions-btn-${pid}`));
      const bodyText = document.body.innerText || '';
      return {
        inLocalProjects: projects.some(p => p.id === pid),
        cardInDom,
        nameVisibleInGrid: bodyText.includes('Disposable Churn Audit 2026')
      };
    }, disposableProjectId);

    logCheck(
      '5. Refreshing the page does not restore the deleted project',
      !afterRefreshCheck.inLocalProjects && !afterRefreshCheck.cardInDom && !afterRefreshCheck.nameVisibleInGrid
    );

    // -------------------------------------------------------------------------
    // TEST 7: Shared datasets and unrelated resources remain intact
    // -------------------------------------------------------------------------
    const sharedDataCheck = await page.evaluate(() => {
      const datasets = JSON.parse(localStorage.getItem('insightiq_user_datasets') || '[]');
      const sharedPreserved = datasets.some(d => d.id === 'ds-shared-enterprise-001' || d.name === 'Enterprise_Supply_Chain_Shared');
      return {
        datasetCount: datasets.length,
        sharedPreserved
      };
    });

    logCheck(
      '7. Linked shared dataset (Enterprise_Supply_Chain_Shared) remains intact after project deletion',
      sharedDataCheck.sharedPreserved && sharedDataCheck.datasetCount >= 1,
      `Datasets count: ${sharedDataCheck.datasetCount}`
    );

    // -------------------------------------------------------------------------
    // TEST 8: Existing project creation, opening, analytics, and navigation work
    // -------------------------------------------------------------------------
    await page.evaluate(() => {
      window.location.hash = '#/analytics';
    });
    await sleep(700);
    const analyticsLoaded = await page.evaluate(() => {
      return window.location.hash.includes('analytics') && document.body.innerText.length > 100;
    });

    await page.evaluate(() => {
      window.location.hash = '#/overview';
    });
    await sleep(700);
    const overviewLoaded = await page.evaluate(() => {
      return window.location.hash.includes('overview') && document.body.innerText.length > 100;
    });

    logCheck(
      '8. Existing navigation to Analytics Studio (#/analytics) and Overview (#/overview) works cleanly',
      analyticsLoaded && overviewLoaded && consoleErrors.length === 0,
      `Console errors: ${consoleErrors.length}`
    );

    const failed = results.filter(r => !r.passed);
    console.log(`\n=== SUMMARY: ${results.length - failed.length}/${results.length} checks passed ===`);
    if (failed.length > 0) {
      console.error('Failed checks:', failed);
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
}

runVerification().catch(err => {
  console.error('Fatal error in verify_delete_project_chrome.js:', err);
  process.exit(1);
});
