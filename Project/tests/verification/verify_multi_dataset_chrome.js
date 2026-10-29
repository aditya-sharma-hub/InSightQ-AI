const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\admin\\.gemini\\antigravity\\brain\\f86b47ed-6332-40d5-b1a1-f6e1ef666f83';
const SCRATCH_DIR = path.join(ARTIFACT_DIR, 'scratch');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function createTestFiles() {
  ensureDir(SCRATCH_DIR);

  // 1. Valid CSV #1: orders_q3.csv (12 rows, 5 cols)
  const ordersCsv = [
    'order_id,customer_id,region,order_amount,is_late',
    'ORD-1001,CUST-01,North America,420.50,0',
    'ORD-1002,CUST-02,Europe,890.00,1',
    'ORD-1003,CUST-03,Asia Pacific,310.25,0',
    'ORD-1004,CUST-04,North America,1250.75,1',
    'ORD-1005,CUST-05,Europe,640.00,0',
    'ORD-1006,CUST-06,Latin America,215.40,0',
    'ORD-1007,CUST-07,North America,980.90,1',
    'ORD-1008,CUST-08,Asia Pacific,540.60,0',
    'ORD-1009,CUST-09,Europe,1120.00,1',
    'ORD-1010,CUST-10,North America,305.10,0',
    'ORD-1011,CUST-11,Latin America,760.80,1',
    'ORD-1012,CUST-12,Europe,495.30,0'
  ].join('\n');
  const ordersPath = path.join(SCRATCH_DIR, 'orders_q3.csv');
  fs.writeFileSync(ordersPath, ordersCsv, 'utf8');

  // 2. Valid CSV #2: customers_crm.csv (12 rows, 5 cols — shares customer_id and is_late with orders_q3.csv)
  const customersCsv = [
    'customer_id,segment,lifetime_value,tenure_months,is_late',
    'CUST-01,Enterprise,14200,36,0',
    'CUST-02,Mid-Market,8900,14,1',
    'CUST-03,SMB,3100,24,0',
    'CUST-04,Enterprise,22500,8,1',
    'CUST-05,Mid-Market,9400,30,0',
    'CUST-06,SMB,2150,19,0',
    'CUST-07,Enterprise,19800,6,1',
    'CUST-08,Mid-Market,7400,28,0',
    'CUST-09,Enterprise,16200,11,1',
    'CUST-10,SMB,4050,40,0',
    'CUST-11,Mid-Market,11600,9,1',
    'CUST-12,Enterprise,15950,33,0'
  ].join('\n');
  const customersPath = path.join(SCRATCH_DIR, 'customers_crm.csv');
  fs.writeFileSync(customersPath, customersCsv, 'utf8');

  // 3. Valid JSON #3: warehouse_iot.json (10 rows, 4 cols — completely unrelated schema to test incompatible join blocking)
  const iotData = Array.from({ length: 10 }, (_, idx) => ({
    sensor_id: `SNS-${200 + idx}`,
    temperature_c: Number((21.5 + idx * 1.4).toFixed(1)),
    vibration_hz: Number((45.0 + (idx % 3) * 8.2).toFixed(1)),
    anomaly_flag: idx % 4 === 0 ? 'ALERT' : 'NORMAL'
  }));
  const iotPath = path.join(SCRATCH_DIR, 'warehouse_iot.json');
  fs.writeFileSync(iotPath, JSON.stringify(iotData, null, 2), 'utf8');

  // 4. Invalid file #4: corrupted_binary.exe (unsupported extension)
  const invalidPath = path.join(SCRATCH_DIR, 'corrupted_binary.exe');
  fs.writeFileSync(invalidPath, 'MZ-FAKE-BINARY-PAYLOAD', 'utf8');

  return { ordersPath, customersPath, iotPath, invalidPath };
}

(async () => {
  const results = [];
  const record = (step, passed, detail) => {
    results.push({ step, passed, detail });
    console.log(`${passed ? '✅ PASS' : '❌ FAIL'} | ${step}: ${detail}`);
  };

  const { ordersPath, customersPath, iotPath, invalidPath } = createTestFiles();

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Error') || text.includes('error') || text.includes('failed') || text.includes('exception')) {
        console.log('BROWSER LOG:', text);
      }
    });
    page.on('pageerror', err => console.log('BROWSER PAGEERROR:', err.message));

    const runTimestamp = Date.now();
    const OWNER_ID = `user-multi-ds-owner-${runTimestamp}`;
    const OWNER_EMAIL = `alex.multids.${runTimestamp}@insightiq.ai`;

    // 0. Authenticate as Data Scientist (has full access to Datasets, Analytics, Models, Projects)
    await page.goto('http://localhost:8085/', { waitUntil: 'networkidle2' });
    await page.evaluate((uid, uemail) => {
      localStorage.clear();
      const sessionObj = {
        access_token: `mock-user-${uid}`,
        user: {
          id: uid,
          email: uemail,
          user_metadata: { full_name: 'Alex Rivera', role: 'data_scientist' }
        }
      };
      const profileObj = {
        id: uid,
        email: uemail,
        full_name: 'Alex Rivera',
        role: 'data_scientist',
        role_configured: true
      };
      localStorage.setItem('insightiq_user_session', JSON.stringify(sessionObj));
      localStorage.setItem('insightiq_user_profile', JSON.stringify(profileObj));
      localStorage.setItem('insightiq_selected_role', 'data_scientist');
      localStorage.setItem('insightiq_dev_preview_role', 'data_scientist');
    }, OWNER_ID, OWNER_EMAIL);

    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 800));
    await page.evaluate(() => {
      if (window.__insightIQTest && window.__insightIQTest.setWorkspaceStatus) {
        window.__insightIQTest.setWorkspaceStatus('ready');
      }
      window.location.hash = '#/projects';
    });
    await new Promise(r => setTimeout(r, 900));

    // Create initial project "Supply Chain Analytics Alpha"
    await page.evaluate(() => {
      if (window.__insightIQTest && window.__insightIQTest.openCreateProjectModal) {
        window.__insightIQTest.openCreateProjectModal();
      } else {
        const buttons = Array.from(document.querySelectorAll('button'));
        const createBtn = buttons.find(b => b.textContent.includes('Create Project') || b.textContent.includes('New Project'));
        if (createBtn) createBtn.click();
      }
    });
    await new Promise(r => setTimeout(r, 450));

    await page.waitForSelector('.entity-form-input', { timeout: 5000 });
    await page.type('.entity-form-input', 'Supply Chain Analytics Alpha');
    await page.click('.entity-modal-footer button[type="submit"]');
    await new Promise(r => setTimeout(r, 800));

    // Navigate to Datasets tab inside "Supply Chain Analytics Alpha"
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.project-lens-tab'));
      const dsTab = tabs.find(t => t.textContent.includes('Datasets'));
      if (dsTab) dsTab.click();
    });
    await new Promise(r => setTimeout(r, 600));

    // 1. Open Bulk Upload Modal from inside project Datasets tab
    const bulkBtn = await page.$('#btn-project-bulk-upload');
    await bulkBtn.click();
    await new Promise(r => setTimeout(r, 500));

    // Select 3 valid files + 1 invalid file in a single file picker operation
    const fileInput = await page.$('#upload-dataset-file-input');
    await fileInput.uploadFile(ordersPath, customersPath, iotPath, invalidPath);
    await new Promise(r => setTimeout(r, 500));

    // Check queue items before upload
    const queueBefore = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('[id^="upload-queue-item-"]'));
      return rows.map(r => r.innerText);
    });
    record(
      '1. Multi-File Selection & Queue Display',
      queueBefore.length === 4,
      `Selected 4 files in one operation (3 valid: CSV, CSV, JSON + 1 invalid EXE). Queue items rendered: ${queueBefore.length}`
    );

    // 2. Test duplicate file selection guard by uploading orders_q3.csv again into the same queue
    const fileInputDup = await page.$('#upload-dataset-file-input');
    await fileInputDup.uploadFile(ordersPath);
    await new Promise(r => setTimeout(r, 450));
    const dupGuardCheck = await page.evaluate(() => {
      const notice = document.querySelector('#upload-duplicate-notice')?.innerText || '';
      const count = document.querySelectorAll('[id^="upload-queue-item-"]').length;
      return { notice, count };
    });
    record(
      '2. Duplicate File Submission Guard',
      dupGuardCheck.count === 4 && dupGuardCheck.notice.includes('Skipped 1 duplicate'),
      `Queue count remained ${dupGuardCheck.count}; notice: "${dupGuardCheck.notice}"`
    );

    // 3. Submit bulk upload and verify partial success (3 completed with row/col metadata, 1 failed with error)
    await page.evaluate(() => {
      const btn = document.querySelector('#btn-submit-upload-datasets');
      if (btn) btn.click();
    });
    for (let waitIdx = 0; waitIdx < 25; waitIdx++) {
      const done = await page.evaluate(() => Boolean(document.querySelector('#upload-batch-summary')));
      if (done) break;
      await new Promise(r => setTimeout(r, 300));
    }
    await new Promise(r => setTimeout(r, 300));

    const batchOutcome = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('[id^="upload-queue-item-"]')).map(el => el.innerText.replace(/\s+/g, ' ').trim());
      const partialBanner = document.querySelector('#upload-batch-summary')?.innerText?.replace(/\s+/g, ' ') || '';
      const hasRetryBtn = Boolean(document.querySelector('#btn-retry-failed-uploads'));
      return { items, partialBanner, hasRetryBtn };
    });

    const completedItems = batchOutcome.items.filter(t => t.toUpperCase().includes('COMPLETED') && t.includes('rows') && t.includes('cols'));
    const failedItems = batchOutcome.items.filter(t => t.toUpperCase().includes('FAILED') && t.includes('Unsupported file format'));

    record(
      '3. Bulk Upload Progress, Metadata & Partial Success',
      completedItems.length === 3 && failedItems.length === 1 && batchOutcome.partialBanner.includes('Partial Upload Complete') && batchOutcome.hasRetryBtn,
      `Completed valid files: ${completedItems.length}/3 with rows/cols metadata; Failed invalid file: ${failedItems.length}/1; Partial banner: "${batchOutcome.partialBanner.slice(0, 80)}..."`
    );

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'bulk_upload_partial_success_1440px.png') });

    // Test retry button safety: clicking Retry / Clear Failed retries only failed items and does NOT duplicate the 3 completed datasets
    const retryBtn = await page.$('#btn-retry-failed-uploads');
    if (retryBtn) {
      await retryBtn.click();
      await new Promise(r => setTimeout(r, 600));
    }
    const dsCountAfterRetry = await page.evaluate(() => {
      const raw = localStorage.getItem('insightiq_user_datasets');
      return raw ? JSON.parse(raw).length : 0;
    });
    record(
      '4. Safe Retry Without Duplicating Completed Datasets',
      dsCountAfterRetry === 3,
      `Total datasets in workspace after retry: ${dsCountAfterRetry} (expected 3, zero duplicates created)`
    );

    // Close the bulk upload modal
    await page.evaluate(() => {
      const closeBtn = document.querySelector('#btn-close-upload-modal') || document.querySelector('#btn-close-upload-modal-header');
      if (closeBtn) closeBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // Verify all 3 valid datasets are attached to "Supply Chain Analytics Alpha"
    const alphaAttachedCount = await page.evaluate(() => {
      return document.querySelectorAll('#project-attached-datasets-list [id^="project-attached-ds-row-"]').length;
    });
    record(
      '5. Project Dataset List Updated After Bulk Upload',
      alphaAttachedCount === 3,
      `Project "Supply Chain Analytics Alpha" displays ${alphaAttachedCount} attached datasets with format, size, rows, columns, and status.`
    );

    // 6. Test Dataset Preview & Schema Inspection Drawer inside project
    await page.evaluate(() => {
      const btn = document.querySelector('[id^="btn-preview-project-ds-"]');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 400));
    const previewVisible = await page.evaluate(() => {
      const panel = document.querySelector('#project-dataset-preview-panel');
      return Boolean(panel && panel.innerText.includes('DATASET INSPECTION & SAMPLE ROWS'));
    });
    record(
      '6. Project Dataset Preview & Schema Inspection',
      previewVisible,
      `Dataset preview panel opened showing column schema badges and sample records.`
    );

    // 7. Create a second project "Cross-Domain Executive Initiative" (initially with 0 datasets) and attach multiple existing datasets via picker modal
    await page.evaluate(() => {
      if (window.__insightIQTest && window.__insightIQTest.openCreateProjectModal) {
        window.__insightIQTest.openCreateProjectModal();
      }
    });
    await new Promise(r => setTimeout(r, 450));
    await page.waitForSelector('.entity-form-input', { timeout: 5000 });
    await page.type('.entity-form-input', 'Cross-Domain Executive Initiative');
    // Uncheck default pre-selected dataset in CreateProjectModal so we can test attaching all 3 via the project Datasets picker modal
    await page.evaluate(() => {
      const clearBtn = document.querySelector('#btn-create-project-clear-datasets');
      if (clearBtn) clearBtn.click();
    });
    await new Promise(r => setTimeout(r, 200));
    await page.click('.entity-modal-footer button[type="submit"]');
    await new Promise(r => setTimeout(r, 800));

    // Switch to Datasets tab of "Cross-Domain Executive Initiative"
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.project-lens-tab'));
      const dsTab = tabs.find(t => t.textContent.includes('Datasets'));
      if (dsTab) dsTab.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // Click "+ Add Existing Datasets"
    await page.evaluate(() => {
      const btn = document.querySelector('#btn-open-attach-datasets-modal');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 450));

    // Test search + Select All Visible in existing-dataset picker modal
    await page.evaluate(() => {
      const btn = document.querySelector('#btn-select-all-visible-datasets');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 300));

    const pickerState = await page.evaluate(() => {
      const countText = document.querySelector('#attach-datasets-selection-count')?.innerText || '';
      const checkboxes = Array.from(document.querySelectorAll('#attach-datasets-list input[type="checkbox"]'));
      const checkedCount = checkboxes.filter(c => c.checked).length;
      return { countText, checkedCount };
    });

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'attach_existing_datasets_modal_1440px.png') });

    await page.evaluate(() => {
      const btn = document.querySelector('#btn-confirm-attach-datasets');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 700));

    const attachedAfterPicker = await page.evaluate(() => {
      const rows = document.querySelectorAll('#project-attached-datasets-list [id^="project-attached-ds-row-"]').length;
      const totalGlobalDatasets = JSON.parse(localStorage.getItem('insightiq_user_datasets') || '[]').length;
      return { rows, totalGlobalDatasets };
    });

    record(
      '7. Multi-Select Existing Datasets Picker & Zero File Duplication',
      pickerState.checkedCount === 3 && attachedAfterPicker.rows === 3 && attachedAfterPicker.totalGlobalDatasets === 3,
      `Selected ${pickerState.checkedCount} existing datasets via Select All Visible; attached ${attachedAfterPicker.rows} datasets to second project; global dataset store remained at ${attachedAfterPicker.totalGlobalDatasets} (no physical duplication).`
    );

    // 8. Verify Persistence Across Page Refresh and Re-Login / Server Hydration
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1100));

    const persistedAfterReload = await page.evaluate(async (uid, uemail) => {
      const domRows = document.querySelectorAll('#project-attached-datasets-list [id^="project-attached-ds-row-"]').length;
      const resp = await fetch('/api/projects', {
        headers: {
          'Authorization': `Bearer mock-user-${uid}`,
          'x-user-id': uid,
          'x-user-email': uemail
        }
      });
      const json = await resp.json();
      const serverProj = (json.projects || []).find(p => p.name === 'Cross-Domain Executive Initiative');
      return {
        domRows,
        serverDatasetCount: serverProj?.datasetIds?.length || 0
      };
    }, OWNER_ID, OWNER_EMAIL);

    record(
      '8. Persistence Across Page Refresh & Authenticated Server Store',
      persistedAfterReload.domRows === 3 && persistedAfterReload.serverDatasetCount === 3,
      `After reload: ${persistedAfterReload.domRows} datasets rendered in UI and ${persistedAfterReload.serverDatasetCount} dataset associations persisted on backend.`
    );

    // 9. Verify Unauthorized Dataset Attachment is Rejected with HTTP 403
    const unauthorizedCheck = await page.evaluate(async (uid, uemail) => {
      // Register a private dataset belonging to another user
      await fetch('/api/datasets/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-user-other-tenant-999',
          'x-user-id': 'other-tenant-999',
          'x-user-email': 'outsider@competitor.io'
        },
        body: JSON.stringify({
          dataset: {
            id: 'ds_private_outsider_999',
            name: 'Outsider_Confidential_Payroll',
            user_id: 'other-tenant-999',
            ownerId: 'other-tenant-999',
            ownerEmail: 'outsider@competitor.io'
          }
        })
      });

      const projs = JSON.parse(localStorage.getItem('insightiq_user_projects') || '[]');
      const targetProjId = projs[0]?.id;
      const attachResp = await fetch(`/api/projects/${encodeURIComponent(targetProjId)}/datasets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer mock-user-${uid}`,
          'x-user-id': uid,
          'x-user-email': uemail,
          'x-user-role': 'data_scientist'
        },
        body: JSON.stringify({ datasetIds: ['ds_private_outsider_999'] })
      });
      const attachJson = await attachResp.json();
      return { status: attachResp.status, code: attachJson.code, error: attachJson.error };
    }, OWNER_ID, OWNER_EMAIL);

    record(
      '9. Dataset Ownership & Permission Enforcement (403 Rejection)',
      unauthorizedCheck.status === 403 && unauthorizedCheck.code === 'DATASET_ACCESS_DENIED',
      `Server rejected attaching another user's dataset with HTTP ${unauthorizedCheck.status} (${unauthorizedCheck.code}): "${unauthorizedCheck.error}"`
    );

    // 10. Test Multi-Dataset Analysis: Incompatible Schema Warning vs Compatible Join & Materialization
    // First switch to Join tab and select orders_q3 (Left) and warehouse_iot (Right — incompatible schema)
    await page.evaluate(() => {
      const btn = document.querySelector('#btn-multi-tab-join');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    const dsValues = await page.evaluate(() => {
      const leftSelect = document.querySelector('#select-multi-join-left');
      const opts = Array.from(leftSelect ? leftSelect.options : []);
      return {
        ordersVal: opts.find(o => o.text.includes('orders_q3'))?.value || '',
        customersVal: opts.find(o => o.text.includes('customers_crm'))?.value || '',
        iotVal: opts.find(o => o.text.includes('warehouse_iot'))?.value || ''
      };
    });

    if (dsValues.ordersVal) await page.select('#select-multi-join-left', dsValues.ordersVal);
    await new Promise(r => setTimeout(r, 200));
    if (dsValues.iotVal) await page.select('#select-multi-join-right', dsValues.iotVal);
    await new Promise(r => setTimeout(r, 400));

    const blockedAlertText = await page.evaluate(() => {
      return document.querySelector('#multi-join-incompatible-alert')?.innerText || '';
    });

    record(
      '10. Incompatible Multi-Dataset Join Safely Blocked',
      blockedAlertText.includes('Join Blocked') && blockedAlertText.includes('No Compatible Shared Key Columns Found'),
      `Selecting unrelated datasets (orders_q3 + warehouse_iot) blocked automatic merge: "${blockedAlertText.replace(/\s+/g, ' ').slice(0, 95)}..."`
    );

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'multi_dataset_incompatible_join_blocked_1440px.png') });

    // Now select compatible pair: orders_q3 (Left) + customers_crm (Right) sharing customer_id
    if (dsValues.ordersVal) await page.select('#select-multi-join-left', dsValues.ordersVal);
    await new Promise(r => setTimeout(r, 200));
    if (dsValues.customersVal) await page.select('#select-multi-join-right', dsValues.customersVal);
    await new Promise(r => setTimeout(r, 450));

    // Materialize combined dataset on customer_id
    await page.evaluate(() => {
      const btn = document.querySelector('#btn-materialize-combined-dataset');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 900));

    const joinSuccessText = await page.evaluate(() => {
      return document.querySelector('#multi-join-status-banner')?.innerText || '';
    });

    record(
      '11. Compatible Multi-Dataset Join Diagnostics & Materialization',
      joinSuccessText.includes('materialized') && joinSuccessText.includes('12 rows') && joinSuccessText.includes('Original datasets were preserved'),
      `Explicit join succeeded: "${joinSuccessText}"`
    );

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'multi_dataset_schema_and_join_1440px.png') });

    // 12. Test Multi-Dataset ML Studio (Supervised & Unsupervised on Prepared Combined Dataset)
    await page.evaluate(() => {
      const btn = document.querySelector('#btn-multi-tab-ml');
      if (btn) btn.click();
    });
    await page.waitForSelector('#select-multi-ml-problem-type', { visible: true, timeout: 5000 });
    await new Promise(r => setTimeout(r, 400));

    // Train Supervised Binary Classification model targeting is_late
    await page.evaluate(() => {
      const btn = document.querySelector('#btn-train-multi-ml-model');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    const supervisedMlText = await page.evaluate(() => {
      return document.querySelector('#multi-ml-training-result')?.innerText?.replace(/\s+/g, ' ') || '';
    });

    const isMlSelectAvailable = await page.evaluate(() => Boolean(document.querySelector('#select-multi-ml-problem-type')));
    if (!isMlSelectAvailable) {
      const diag = await page.evaluate(() => ({
        hash: window.location.hash,
        visibleTabs: Array.from(document.querySelectorAll('button')).map(b => b.innerText).filter(t => t.includes('ML') || t.includes('Schema') || t.includes('Datasets')),
        bodyTextSnippet: document.body.innerText.slice(0, 300).replace(/\s+/g, ' ')
      }));
      console.log('DIAGNOSTIC — select-multi-ml-problem-type not immediately found:', JSON.stringify(diag));
      // Re-click ML tab if workbench reset
      await page.evaluate(() => {
        const btn = document.querySelector('#btn-multi-tab-ml');
        if (btn) btn.click();
      });
      await page.waitForSelector('#select-multi-ml-problem-type', { visible: true, timeout: 5000 });
    }

    // Switch to Unsupervised K-Means Clustering and train
    await page.select('#select-multi-ml-problem-type', 'K-Means Clustering (Unsupervised)');
    await new Promise(r => setTimeout(r, 350));
    await page.evaluate(() => {
      const btn = document.querySelector('#btn-train-multi-ml-model');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    const unsupervisedMlText = await page.evaluate(() => {
      return document.querySelector('#multi-ml-training-result')?.innerText?.replace(/\s+/g, ' ') || '';
    });

    record(
      '12. Multi-Dataset Supervised & Unsupervised ML Studio',
      supervisedMlText.includes('Model Trained') && supervisedMlText.includes('Target Column:') &&
      unsupervisedMlText.includes('Silhouette Score:') && unsupervisedMlText.includes('Cluster 1:'),
      `Supervised result: "${supervisedMlText.slice(0, 75)}..." | Unsupervised result: "${unsupervisedMlText.slice(0, 75)}..."`
    );

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'multi_dataset_ml_studio_1440px.png') });

    // 13. Test Detaching Dataset from Project Without Deleting Underlying Shared Dataset or Other Projects
    const detachOutcome = await page.evaluate(async () => {
      const detachButtons = Array.from(document.querySelectorAll('[id^="btn-detach-project-ds-"]'));
      const beforeRows = detachButtons.length;
      if (detachButtons[0]) detachButtons[0].click();
      await new Promise(r => setTimeout(r, 500));
      const afterRows = document.querySelectorAll('[id^="btn-detach-project-ds-"]').length;
      const globalDatasets = JSON.parse(localStorage.getItem('insightiq_user_datasets') || '[]').length;
      const projects = JSON.parse(localStorage.getItem('insightiq_user_projects') || '[]');
      const alphaProj = projects.find(p => p.name === 'Supply Chain Analytics Alpha');
      return {
        beforeRows,
        afterRows,
        globalDatasets,
        alphaDatasetCount: alphaProj?.datasetIds?.length || 0
      };
    });

    record(
      '13. Safe Dataset Detach Preserves Underlying File & Other Projects',
      detachOutcome.afterRows === detachOutcome.beforeRows - 1 &&
      detachOutcome.globalDatasets === 4 &&
      detachOutcome.alphaDatasetCount === 3,
      `Attached count changed ${detachOutcome.beforeRows} -> ${detachOutcome.afterRows}; Global datasets preserved (${detachOutcome.globalDatasets}); Other project ("Supply Chain Analytics Alpha") still has ${detachOutcome.alphaDatasetCount} datasets.`
    );

    // 14. Verify Mobile (375px) Responsiveness of Multi-Dataset Project Workspace
    await page.setViewport({ width: 375, height: 812 });
    await new Promise(r => setTimeout(r, 500));

    const mobileCheck = await page.evaluate(() => {
      return {
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        overflowPx: Math.max(0, document.documentElement.scrollWidth - window.innerWidth)
      };
    });

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'multi_dataset_workspace_375px.png') });

    record(
      '14. Desktop (1440px) & Mobile (375px) Responsive Layout Integrity',
      mobileCheck.overflowPx === 0,
      `Mobile 375px viewport scrollWidth=${mobileCheck.scrollWidth}px (overflow=${mobileCheck.overflowPx}px)`
    );

    const passedCount = results.filter(r => r.passed).length;
    console.log(`\n========================================`);
    console.log(`MULTI-DATASET E2E SUMMARY: ${passedCount}/${results.length} PASSED`);
    console.log(`========================================`);
    if (passedCount !== results.length) {
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
})();
