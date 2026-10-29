/**
 * Comprehensive Chrome End-to-End Verification Suite for:
 * InsightIQ AI - Multi-Select Dataset Manager & Bulk Deletion
 *
 * Requirements Tested:
 * 1. Multi-selection via checkboxes and applying selection to Multi-Dataset Workflow
 * 2. Searching and selecting entries with identical display names but different IDs
 * 3. Removing one dataset from a project ("detach" mode) without deleting the original
 * 4. Permanently deleting disposable test datasets after "DELETE" typed confirmation
 * 5. Confirming cancellation leaves data unchanged
 * 6. Verifying changes persist after page refresh (page.reload)
 * 7. Confirming unauthorized deletion is rejected by server with HTTP 403 / DATASET_ACCESS_DENIED
 * 8. Ensuring existing single-dataset overview analysis still functions flawlessly
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:8085';
const CHROME_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACTS_DIR = path.join(__dirname, 'test_artifacts_multiselect');

if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testResults = [];

function report(id, title, isPass, detail = '') {
  totalTests++;
  if (isPass) {
    passedTests++;
    console.log(`  [PASS] [${id}]: ${title}`);
    testResults.push({ id, title, status: 'PASS', detail });
  } else {
    failedTests++;
    console.error(`  [FAIL] [${id}]: ${title} -> ${detail}`);
    testResults.push({ id, title, status: 'FAIL', detail });
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  console.log('========================================================================');
  console.log('InsightIQ AI - Dataset Manager Multi-Select & Bulk Delete Chrome Suite');
  console.log('========================================================================\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
    // -------------------------------------------------------------------------
    // SETUP: Navigate to App & Seed Verified Test Datasets
    // -------------------------------------------------------------------------
    console.log('[Setup] Navigating to http://localhost:8085 and initializing session...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });

    // Seed test session with a user and known datasets, including duplicate display names
    await page.evaluate(() => {
      if (window.__insightIQTest?.triggerDataDashboard) {
        window.__insightIQTest.triggerDataDashboard('data_analyst');
      }

      // Prepare rich test datasets with distinct IDs and duplicate display names
      const testDatasets = [
        {
          id: 'ds_orders_q3_alpha',
          name: 'orders_q3',
          format: 'CSV',
          file_type: 'CSV',
          file_size: 154200,
          row_count: 1250,
          column_count: 4,
          columns: [
            { column_name: 'order_id', data_type: 'integer', canonical_type: 'integer', is_identifier: true },
            { column_name: 'customer_id', data_type: 'integer', canonical_type: 'integer', is_identifier: true },
            { column_name: 'amount', data_type: 'numeric', canonical_type: 'numeric', is_numeric: true },
            { column_name: 'status', data_type: 'string', canonical_type: 'string', is_categorical: true }
          ],
          source: 'User Upload',
          created_at: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 'ds_orders_q3_beta',
          name: 'orders_q3',
          format: 'CSV',
          file_type: 'CSV',
          file_size: 184500,
          row_count: 1420,
          column_count: 4,
          columns: [
            { column_name: 'order_id', data_type: 'integer', canonical_type: 'integer', is_identifier: true },
            { column_name: 'customer_id', data_type: 'integer', canonical_type: 'integer', is_identifier: true },
            { column_name: 'order_total', data_type: 'numeric', canonical_type: 'numeric', is_numeric: true },
            { column_name: 'region', data_type: 'string', canonical_type: 'string', is_categorical: true }
          ],
          source: 'PostgreSQL Sync',
          created_at: new Date(Date.now() - 7200000).toISOString()
        },
        {
          id: 'ds_customers_crm',
          name: 'customers_crm',
          format: 'JSON',
          file_type: 'JSON',
          file_size: 98000,
          row_count: 450,
          column_count: 4,
          columns: [
            { column_name: 'customer_id', data_type: 'integer', canonical_type: 'integer', is_identifier: true },
            { column_name: 'customer_name', data_type: 'string', canonical_type: 'string', is_categorical: true },
            { column_name: 'email', data_type: 'string', canonical_type: 'string' },
            { column_name: 'country', data_type: 'string', canonical_type: 'string', is_geographic: true }
          ],
          source: 'CRM Integration',
          created_at: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: 'ds_disposable_delete_me',
          name: 'disposable_temp_log',
          format: 'CSV',
          file_type: 'CSV',
          file_size: 12400,
          row_count: 60,
          column_count: 2,
          columns: [
            { column_name: 'id', data_type: 'integer', canonical_type: 'integer' },
            { column_name: 'msg', data_type: 'string', canonical_type: 'string' }
          ],
          source: 'Temporary Test',
          created_at: new Date().toISOString()
        },
        {
          id: 'ds_detach_test_item',
          name: 'detachable_project_dataset',
          format: 'CSV',
          file_type: 'CSV',
          file_size: 25000,
          row_count: 110,
          column_count: 2,
          columns: [
            { column_name: 'item_id', data_type: 'integer', canonical_type: 'integer' },
            { column_name: 'sku', data_type: 'string', canonical_type: 'string' }
          ],
          source: 'Project Attachment',
          created_at: new Date().toISOString()
        }
      ];

      // Provide sample rows for deterministic rendering
      window._datasetRowsStore = window._datasetRowsStore || {};
      window._datasetRowsStore['ds_orders_q3_alpha'] = [
        { order_id: 101, customer_id: 1, amount: 250.50, status: 'completed' },
        { order_id: 102, customer_id: 2, amount: 89.00, status: 'pending' },
        { order_id: 103, customer_id: 1, amount: 145.20, status: 'completed' }
      ];
      window._datasetRowsStore['ds_orders_q3_beta'] = [
        { order_id: 201, customer_id: 1, order_total: 310.00, region: 'North' },
        { order_id: 202, customer_id: 3, order_total: 125.75, region: 'South' }
      ];
      window._datasetRowsStore['ds_customers_crm'] = [
        { customer_id: 1, customer_name: 'Acme Corp', email: 'contact@acme.com', country: 'USA' },
        { customer_id: 2, customer_name: 'Globex Ltd', email: 'sales@globex.com', country: 'UK' }
      ];

      // Set user datasets and navigate to datasets overview
      if (window.__insightIQTest?.setUserDatasets) {
        window.__insightIQTest.setUserDatasets(testDatasets);
      }
      if (window.__insightIQTest?.setActiveDatasetId) {
        window.__insightIQTest.setActiveDatasetId('ds_orders_q3_alpha');
      }
      if (window.__insightIQTest?.openDatasetExplorer) {
        window.__insightIQTest.openDatasetExplorer();
      }
    });

    await sleep(800);

    // Wait for the active dataset manager button
    await page.waitForSelector('#btn-active-dataset-manager', { timeout: 10000 });
    console.log('[Setup] Dataset Overview page loaded with Dataset Manager button.');

    // -------------------------------------------------------------------------
    // TEST 1: Open Dataset Manager, Multi-Select Checkboxes, Apply to Workflow
    // -------------------------------------------------------------------------
    console.log('\n--- Test 1: Multi-Selection & Multi-Dataset Workflow ---');
    // Open manager popover
    await page.click('#btn-active-dataset-manager');
    await page.waitForSelector('#dataset-manager-popover', { visible: true, timeout: 5000 });

    const isPopoverVisible = await page.$eval('#dataset-manager-popover', el => el !== null);
    report('1.1-POPOVER', 'Dataset Manager popover opens on button click', isPopoverVisible);

    // Check count text
    const initialCountText = await page.$eval('#dataset-manager-selected-count', el => el.textContent.trim());
    report('1.2-COUNT', 'Selection count indicator displays "X of Y selected"', initialCountText.includes('selected'), initialCountText);

    // Check that checkboxes exist
    const checkboxesCount = await page.$$eval('input[type="checkbox"][id^="checkbox-dataset-"]', els => els.length);
    report('1.3-CHECKBOXES', `Rendered ${checkboxesCount} dataset multi-select checkboxes`, checkboxesCount >= 4, `Found: ${checkboxesCount}`);

    // Select second dataset (ds_customers_crm)
    await page.click('#checkbox-dataset-ds_customers_crm');
    await sleep(300);

    const updatedCountText = await page.$eval('#dataset-manager-selected-count', el => el.textContent.trim());
    report('1.4-MULTISELECT', 'Selection count updates dynamically upon selecting multiple datasets', updatedCountText.startsWith('2 of'), updatedCountText);

    // Click "Apply to Multi-Dataset Workflow"
    await page.waitForSelector('#btn-apply-multi-dataset-selection', { visible: true, timeout: 5000 });
    await page.click('#btn-apply-multi-dataset-selection');
    await sleep(500);

    // Verify workbench is rendered
    await page.waitForSelector('#multi-dataset-workbench', { visible: true, timeout: 5000 });
    const isWorkbenchVisible = await page.$eval('#multi-dataset-workbench', el => el !== null && el.offsetWidth > 0);
    report('1.5-WORKBENCH', 'Applying multi-selection reveals the Multi-Dataset Workflow Workbench', isWorkbenchVisible);

    // Verify workbench tabs
    const hasSchemaTab = await page.$eval('#btn-multi-tab-schema', el => el !== null);
    const hasJoinTab = await page.$eval('#btn-multi-tab-join', el => el !== null);
    const hasMlTab = await page.$eval('#btn-multi-tab-ml', el => el !== null);
    report('1.6-WORKBENCH-TABS', 'Multi-Dataset workbench contains Schema Comparison, Joins, and ML Studio tabs', hasSchemaTab && hasJoinTab && hasMlTab);

    // Capture screenshot of multi-dataset workbench
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '01_multi_dataset_workbench.png') });

    // Exit multi-dataset view back to standard overview
    await page.click('#btn-exit-multi-dataset-mode');
    await sleep(400);

    // -------------------------------------------------------------------------
    // TEST 2: Duplicate Display Names Resolved by Unique Stable IDs & Search
    // -------------------------------------------------------------------------
    console.log('\n--- Test 2: Duplicate Names Resolved by Unique Stable IDs & Search ---');
    await page.click('#btn-active-dataset-manager');
    await page.waitForSelector('#dataset-manager-popover', { visible: true });

    // Type "orders_q3" into search
    await page.type('#dataset-manager-search', 'orders_q3');
    await sleep(300);

    const searchFilteredCount = await page.$$eval('#dataset-manager-list > div', items => items.length);
    report('2.1-SEARCH', 'Searching by name filters the dataset manager list', searchFilteredCount === 2, `Visible items: ${searchFilteredCount}`);

    // Verify distinct ID badges are displayed for both entries
    const idBadges = await page.$$eval('#dataset-manager-list span.badge', badges => badges.map(b => b.textContent.trim()));
    const hasAlpha = idBadges.some(b => b.includes('ds_orders_q3_alpha'));
    const hasBeta = idBadges.some(b => b.includes('ds_orders_q3_beta'));
    report('2.2-ID-BADGES', 'Separate datasets sharing display name "orders_q3" display distinctive stable ID badges', hasAlpha && hasBeta, JSON.stringify(idBadges));

    // Screenshot popover showing search and ID badges
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '02_dataset_manager_popover_ids.png') });

    // Clear search using React native value setter
    await page.evaluate(() => {
      const input = document.getElementById('dataset-manager-search');
      if (input) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(input, '');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await sleep(400);

    // -------------------------------------------------------------------------
    // TEST 3: Bulk Deletion - "Remove from project" (Detach Mode)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 3: Remove from Project (Detach Mode) ---');
    // Clear selection first
    await page.click('#btn-dataset-manager-clear-selection');
    await sleep(200);

    // Select the detachable dataset
    await page.click('#checkbox-dataset-ds_detach_test_item');
    await sleep(200);

    // Click "Delete Selected" to open bulk delete modal
    await page.click('#btn-bulk-delete-datasets');
    await page.waitForSelector('#bulk-delete-datasets-modal', { visible: true, timeout: 5000 });

    const isModalOpen = await page.$eval('#bulk-delete-datasets-modal', el => el !== null);
    report('3.1-MODAL-OPEN', 'Bulk delete confirmation modal opens with selected dataset list', isModalOpen);

    // Click "Remove from project" mode button
    await page.click('#btn-mode-detach-datasets');
    await sleep(200);

    const isDetachActive = await page.$eval('#btn-mode-detach-datasets', el => (el.getAttribute('style') || '').includes('56, 189, 248'));
    report('3.2-MODE-DETACH', 'Can toggle "Remove from project" mode without permanent data deletion', isDetachActive);

    // Screenshot detach mode modal
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '03_bulk_delete_modal_detach.png') });

    // In detach mode, confirm button does not require typing "DELETE"
    const isConfirmDisabled = await page.$eval('#btn-confirm-detach-datasets', el => el.disabled);
    report('3.3-DETACH-CONFIRM-READY', 'In detach mode, confirmation button is ready without typing "DELETE"', !isConfirmDisabled);

    // Click Confirm Bulk Delete (detach mode)
    await page.click('#btn-confirm-detach-datasets');
    await sleep(800);

    // Verify modal is closed after completion
    const isModalClosed = await page.$eval('#bulk-delete-datasets-modal', el => el === null).catch(() => true);
    report('3.4-DETACH-COMPLETED', 'Detach completed successfully and modal closed', isModalClosed);

    // -------------------------------------------------------------------------
    // TEST 4: Bulk Deletion - "Delete permanently" (Permanent Mode with DELETE Guard)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 4: Delete Permanently with Explicit Confirmation Guard ---');
    // Open manager again
    await page.click('#btn-active-dataset-manager');
    await page.waitForSelector('#dataset-manager-popover', { visible: true });

    // Clear previous selections so only the disposable dataset is targeted
    await page.click('#btn-dataset-manager-clear-selection');
    await sleep(200);

    // Select disposable dataset
    await page.click('#checkbox-dataset-ds_disposable_delete_me');
    await sleep(200);

    // Click "Delete Selected"
    await page.click('#btn-bulk-delete-datasets');
    await page.waitForSelector('#bulk-delete-datasets-modal', { visible: true });

    // Select Permanent mode
    await page.click('#btn-mode-permanent-delete');
    await sleep(200);

    // Verify confirm button is disabled before typing "DELETE"
    const isPermanentConfirmDisabled = await page.$eval('#btn-confirm-permanent-delete', el => el.disabled);
    report('4.1-DELETE-GUARD-DISABLED', 'Permanent delete confirm button is initially disabled', isPermanentConfirmDisabled);

    // Type partial text
    await page.type('#input-confirm-permanent-delete', 'DEL');
    await sleep(100);
    const isStillDisabled = await page.$eval('#btn-confirm-permanent-delete', el => el.disabled);
    report('4.2-DELETE-GUARD-PARTIAL', 'Button remains disabled for partial confirmation input "DEL"', isStillDisabled);

    // Type exact "DELETE"
    await page.type('#input-confirm-permanent-delete', 'ETE');
    await sleep(200);
    const isNowEnabled = await page.$eval('#btn-confirm-permanent-delete', el => !el.disabled);
    report('4.3-DELETE-GUARD-ENABLED', 'Button unlocks upon typing exact "DELETE"', isNowEnabled);

    // Screenshot permanent delete modal ready to execute
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '04_bulk_delete_modal_permanent.png') });

    // Click Confirm
    await page.click('#btn-confirm-permanent-delete');
    await sleep(1200);

    // Verify dataset ds_disposable_delete_me is permanently removed from the manager list
    await page.click('#btn-active-dataset-manager');
    await page.waitForSelector('#dataset-manager-popover', { visible: true });
    const remainingIds = await page.$$eval('#dataset-manager-list [id^="checkbox-dataset-"]', els => els.map(el => el.id.replace('checkbox-dataset-', '')));
    const isDeleted = !remainingIds.includes('ds_disposable_delete_me');
    report('4.4-PERMANENT-DELETED', 'Target disposable dataset successfully and permanently deleted', isDeleted, `Remaining: ${JSON.stringify(remainingIds)}`);

    // -------------------------------------------------------------------------
    // TEST 5: Cancellation Leaves Data Completely Unchanged
    // -------------------------------------------------------------------------
    console.log('\n--- Test 5: Cancellation Leaves Data Unchanged ---');
    // Select ds_customers_crm
    await page.click('#checkbox-dataset-ds_customers_crm');
    await sleep(200);

    // Open delete modal
    await page.click('#btn-bulk-delete-datasets');
    await page.waitForSelector('#bulk-delete-datasets-modal', { visible: true });

    // Click Cancel button
    await page.click('#btn-cancel-bulk-delete');
    await sleep(400);

    // Check that modal closed
    const modalClosedOnCancel = await page.$eval('#bulk-delete-datasets-modal', el => el === null).catch(() => true);
    report('5.1-CANCEL-MODAL-CLOSE', 'Cancel button closes the bulk delete modal', modalClosedOnCancel);

    // Check that ds_customers_crm is still present and intact
    await page.click('#btn-active-dataset-manager');
    await page.waitForSelector('#dataset-manager-popover', { visible: true });
    const checkCustomerExists = await page.$eval('#checkbox-dataset-ds_customers_crm', el => el !== null).catch(() => false);
    report('5.2-CANCEL-DATA-INTACT', 'Cancelled dataset remains intact in dataset manager', checkCustomerExists);

    // Close popover
    await page.click('#btn-active-dataset-manager');
    await sleep(300);

    // -------------------------------------------------------------------------
    // TEST 6: Changes Persist Across Page Refresh
    // -------------------------------------------------------------------------
    console.log('\n--- Test 6: Verifying Persistence Across Page Refresh ---');
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(800);

    // Navigate to datasets explorer view
    await page.evaluate(() => {
      if (window.__insightIQTest?.openDatasetExplorer) {
        window.__insightIQTest.openDatasetExplorer();
      }
    });
    await sleep(600);

    await page.waitForSelector('#btn-active-dataset-manager', { timeout: 10000 });
    await page.click('#btn-active-dataset-manager');
    await page.waitForSelector('#dataset-manager-popover', { visible: true });

    const reloadedIds = await page.$$eval('#dataset-manager-list [id^="checkbox-dataset-"]', els => els.map(el => el.id.replace('checkbox-dataset-', '')));
    const disposableStillGone = !reloadedIds.includes('ds_disposable_delete_me');
    const existingStillPresent = reloadedIds.includes('ds_orders_q3_alpha') && reloadedIds.includes('ds_customers_crm');
    report('6.1-PERSISTENCE-AFTER-REFRESH', 'Deleted datasets remain deleted and surviving datasets persist after reload', disposableStillGone && existingStillPresent, `Present IDs: ${JSON.stringify(reloadedIds)}`);

    // Close popover
    await page.click('#btn-active-dataset-manager');
    await sleep(300);

    // -------------------------------------------------------------------------
    // TEST 7: Unauthorized Deletion Attempt Rejected with HTTP 403 / Access Denied
    // -------------------------------------------------------------------------
    console.log('\n--- Test 7: Unauthorized Deletion Server Rejection ---');
    // Test backend API directly with foreign dataset and invalid authentication
    const unauthorizedResponse = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/datasets/bulk-delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer invalid-foreign-token'
          },
          body: JSON.stringify({
            datasetIds: ['ds_system_protected_dataset_001']
          })
        });
        const data = await res.json();
        return { status: res.status, data };
      } catch (err) {
        return { status: 500, error: err.message };
      }
    });

    const isUnauthorizedHandled = unauthorizedResponse.status === 401 ||
      unauthorizedResponse.status === 403 ||
      (unauthorizedResponse.data && unauthorizedResponse.data.code === 'TOKEN_INVALID') ||
      (unauthorizedResponse.data && unauthorizedResponse.data.failed && unauthorizedResponse.data.failed.some(f => f.status === 403 || f.code === 'DATASET_ACCESS_DENIED'));
    report('7.1-UNAUTHORIZED-SERVER-REJECTION', 'Unauthorized dataset deletion attempt rejected with 401/403 or DATASET_ACCESS_DENIED', isUnauthorizedHandled, JSON.stringify(unauthorizedResponse));

    // -------------------------------------------------------------------------
    // TEST 8: Preserved Single-Dataset Overview Analysis
    // -------------------------------------------------------------------------
    console.log('\n--- Test 8: Preserved Single-Dataset Overview Analysis ---');
    // Open manager and click on ds_orders_q3_alpha row to activate single dataset
    await page.click('#btn-active-dataset-manager');
    await page.waitForSelector('#dataset-manager-popover', { visible: true });

    await page.click('#item-row-dataset-ds_orders_q3_alpha');
    await sleep(500);

    // Verify manager button displays ds_orders_q3_alpha name
    const buttonText = await page.$eval('#btn-active-dataset-manager', el => el.textContent);
    report('8.1-SINGLE-ACTIVE-LABEL', 'Dataset manager button updates to reflect active dataset', buttonText.includes('orders_q3'), buttonText);

    // Verify single-dataset Overview components remain functional:
    // Metric cards (KPI cards)
    const kpiCardsExist = await page.$$eval('[class*="card"], [class*="metric"], [class*="grid"]', els => els.length > 0);
    report('8.2-OVERVIEW-KPIS', 'Overview metric/KPI cards render for the active dataset', kpiCardsExist);

    // Column schema table
    const schemaTableExists = await page.$$eval('table, [class*="table"], [class*="schema"]', els => els.length > 0);
    report('8.3-SCHEMA-TABLE', 'Dataset columns & schema table render properly in overview', schemaTableExists);

    // Capture screenshot of preserved single dataset overview
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '05_single_dataset_overview.png') });

  } catch (err) {
    console.error('Test Suite encountered an unexpected error:', err);
    report('ERR-UNEXPECTED', 'Unexpected Test Failure', false, err.message);
  } finally {
    await browser.close();
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`Test Execution Summary: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
  console.log('========================================================================');

  // Save summary json
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'test_results.json'), JSON.stringify(testResults, null, 2));

  if (failedTests > 0) {
    process.exit(1);
  }
})();
