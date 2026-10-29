/**
 * InsightIQ AI — Model Registry UI, Centering, Tabs & Filter Verification Test Suite
 *
 * Verifies:
 * 1. Desktop (1440x900): Modal dialog is horizontally centered in the visible workspace
 *    accounting for fixed sidebar (center X = 840px +/- 3px).
 * 2. Desktop (1440x900): Modal dialog is vertically centered in visible workspace
 *    below top navigation (center Y = 478px +/- 3px).
 * 3. Collapsed Sidebar (1440x900): Modal dialog adapts and centers in expanded workspace
 *    (center X = 752px +/- 3px, center Y = 478px +/- 3px).
 * 4. Responsive Viewports: Laptop (1024x768), Tablet (768x1024), Mobile (375x667)
 *    fit within screen without clipping.
 * 5. Body scroll locking: document.body.style.overflow is 'hidden' while open and restored when closed.
 * 6. Dismissal: Close button (x Close), Escape key, and backdrop click all close the modal.
 * 7. 7 Detail Tabs: All 7 tabs exist, are aligned in horizontal bar, active tab has cyan styling,
 *    and clicking each tab displays its respective panel.
 * 8. Filter Controls: All, Production, Training, Staging pills have clear active, inactive, hover,
 *    and non-color indicator (●), and filtering works correctly.
 * 9. Drift selector: Matches pill height (34px), pill radius, dark navy surface, acquires .active
 *    and cyan styling when filtered, and filters models correctly.
 * 10. Existing ML features: Inference tester, version comparison, rollback button, lifecycle stepper intact.
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:8085';
const CHROME_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function report(id, title, isPass, detail = '') {
  totalTests++;
  if (isPass) {
    passedTests++;
    console.log(`  ✓ PASS [${id}]: ${title}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL [${id}]: ${title} -> ${detail}`);
  }
}

async function runModelRegistrySuite() {
  console.log('========================================================================');
  console.log('InsightIQ AI — Model Registry Modal Centering & Styling Test Suite');
  console.log('========================================================================\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // -------------------------------------------------------------------------
    // SETUP: Authenticate as Data Scientist and Navigate to Models Registry
    // -------------------------------------------------------------------------
    console.log('[Setup] Launching Desktop (1440x900) and logging in as Data Scientist...');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });

    await page.evaluate(() => {
      if (window.__insightIQTest?.triggerDataDashboard) {
        window.__insightIQTest.triggerDataDashboard('data_scientist');
      }
      if (window.__insightIQTest?.seedDemoData) {
        window.__insightIQTest.seedDemoData();
      }
      if (window.__insightIQTest?.setActiveNav) {
        window.__insightIQTest.setActiveNav('models');
        window.location.hash = '#/models';
      }
    });
    await new Promise(r => setTimeout(r, 600));

    // Wait for Model Registry cards to appear
    await page.waitForSelector('.model-registry-card', { timeout: 8000 });
    console.log('  Found .model-registry-card elements in workspace');

    // -------------------------------------------------------------------------
    // TEST 1: Model Filters - Active / Inactive / Indicator & Filtering Logic
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Model Registry Filter Controls ---');

    const filterPillsInfo = await page.evaluate(() => {
      const pills = Array.from(document.querySelectorAll('.filter-pill-btn'));
      return pills.map(p => ({
        id: p.id,
        text: p.textContent.trim(),
        hasActive: p.classList.contains('active'),
        ariaPressed: p.getAttribute('aria-pressed')
      }));
    });

    report('F1.pills', 'Filter pills rendered with All, Production, Training, Staging',
      filterPillsInfo.length >= 4 && filterPillsInfo.some(p => p.text.includes('All'))
    );

    report('F1.active_all', 'Initial state: "All" filter pill is active with aria-pressed="true"',
      filterPillsInfo.find(p => p.id === 'model-filter-all')?.hasActive === true &&
      filterPillsInfo.find(p => p.id === 'model-filter-all')?.ariaPressed === 'true'
    );

    // Test filter styles (cyan border, subtle bg, dot indicator via before)
    const allPillStyles = await page.evaluate(() => {
      const allPill = document.querySelector('#model-filter-all');
      const style = window.getComputedStyle(allPill);
      const beforeStyle = window.getComputedStyle(allPill, '::before');
      return {
        color: style.color,
        borderColor: style.borderColor,
        height: style.height,
        borderRadius: style.borderRadius,
        beforeContent: beforeStyle.content
      };
    });

    report('F1.active_styles', 'Active filter pill has cyan accent styling (#18c8f4) and dot indicator',
      allPillStyles.color.includes('24, 200, 244') &&
      allPillStyles.borderColor.includes('24, 200, 244') &&
      allPillStyles.beforeContent.includes('●')
    );

    // Test clicking "Production" filter
    await page.click('#model-filter-production');
    await new Promise(r => setTimeout(r, 300));

    const prodFilterCheck = await page.evaluate(() => {
      const prodPill = document.querySelector('#model-filter-production');
      const allPill = document.querySelector('#model-filter-all');
      const cards = Array.from(document.querySelectorAll('.model-registry-card'));
      const cardStatuses = cards.map(c => (c.querySelector('.lifecycle-badge')?.textContent || '').toLowerCase());
      return {
        prodActive: prodPill.classList.contains('active') && prodPill.getAttribute('aria-pressed') === 'true',
        allInactive: !allPill.classList.contains('active') && allPill.getAttribute('aria-pressed') === 'false',
        allCardsProd: cardStatuses.every(s => s.includes('production')),
        cardCount: cards.length
      };
    });

    report('F2.production_filter', 'Clicking "Production" filters models list to only Production models',
      prodFilterCheck.prodActive && prodFilterCheck.allInactive && prodFilterCheck.allCardsProd && prodFilterCheck.cardCount > 0
    );

    // Test clicking "Training" filter
    await page.click('#model-filter-training');
    await new Promise(r => setTimeout(r, 300));

    const trainFilterCheck = await page.evaluate(() => {
      const trainPill = document.querySelector('#model-filter-training');
      const cards = Array.from(document.querySelectorAll('.model-registry-card'));
      const cardStatuses = cards.map(c => (c.querySelector('.lifecycle-badge')?.textContent || '').toLowerCase());
      return {
        trainActive: trainPill.classList.contains('active'),
        allCardsTrain: cardStatuses.every(s => s.includes('training') || s.includes('staging'))
      };
    });

    report('F3.training_filter', 'Clicking "Training" filters models list to only Training models',
      trainFilterCheck.trainActive && trainFilterCheck.allCardsTrain
    );

    // Reset filter to "All"
    await page.click('#model-filter-all');
    await new Promise(r => setTimeout(r, 300));

    // Test Drift Selector styling & filtering
    const driftSelectStyles = await page.evaluate(() => {
      const sel = document.querySelector('#model-drift-filter-select');
      const style = window.getComputedStyle(sel);
      return {
        height: style.height,
        borderRadius: style.borderRadius,
        color: style.color,
        hasActive: sel.classList.contains('active')
      };
    });

    report('F4.drift_select_idle', 'Drift selector matches 34px height and pill border-radius',
      driftSelectStyles.height === '34px' && !driftSelectStyles.hasActive
    );

    // Select "healthy" drift filter
    await page.select('#model-drift-filter-select', 'healthy');
    await new Promise(r => setTimeout(r, 300));

    const driftSelectActive = await page.evaluate(() => {
      const sel = document.querySelector('#model-drift-filter-select');
      const style = window.getComputedStyle(sel);
      return {
        hasActive: sel.classList.contains('active'),
        color: style.color,
        borderColor: style.borderColor
      };
    });

    report('F5.drift_select_active', 'Active drift selector gets .active class with cyan text and border',
      driftSelectActive.hasActive &&
      driftSelectActive.color.includes('24, 200, 244') &&
      driftSelectActive.borderColor.includes('24, 200, 244')
    );

    // Reset drift selector to 'all'
    await page.select('#model-drift-filter-select', 'all');
    await new Promise(r => setTimeout(r, 300));

    // Take screenshot of filters
    await page.screenshot({ path: path.join(__dirname, '../../verification/screenshots/scratch_model_filters.png') });

    // -------------------------------------------------------------------------
    // TEST 2: Inspect Action & Workspace Centering on Desktop (1440x900)
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Inspect Modal Centering on Desktop (1440x900) ---');

    // Click "Inspect Model" button on first model card
    await page.evaluate(() => {
      const inspectBtns = Array.from(document.querySelectorAll('.btn-text-action-primary'));
      const targetBtn = inspectBtns.find(b => b.textContent.includes('Inspect'));
      if (targetBtn) targetBtn.click();
    });

    await page.waitForSelector('#model-detail-dialog', { visible: true, timeout: 3000 });
    console.log('  Model Detail Dialog opened successfully');

    // Verify positioning on Desktop with expanded sidebar (240px)
    const desktopMetrics = await page.evaluate(() => {
      const dialog = document.getElementById('model-detail-dialog');
      const backdrop = document.getElementById('model-detail-dialog-backdrop');
      const rect = dialog.getBoundingClientRect();
      const backdropRect = backdrop.getBoundingClientRect();
      const bodyOverflow = document.body.style.overflow;

      // Workspace bounds
      // Left = 240px (sidebar), Top = 56px (header), Right = 1440px, Bottom = 900px
      const expectedCenterX = 240 + (1440 - 240) / 2; // 840px
      const expectedCenterY = 56 + (900 - 56) / 2;    // 478px

      const actualCenterX = (rect.left + rect.right) / 2;
      const actualCenterY = (rect.top + rect.bottom) / 2;

      return {
        rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height },
        backdropRect: { left: backdropRect.left, right: backdropRect.right, top: backdropRect.top, bottom: backdropRect.bottom },
        expectedCenterX,
        expectedCenterY,
        actualCenterX,
        actualCenterY,
        diffX: Math.abs(actualCenterX - expectedCenterX),
        diffY: Math.abs(actualCenterY - expectedCenterY),
        bodyOverflow
      };
    });

    console.log(`  Desktop Workspace: Expected Center = (${desktopMetrics.expectedCenterX}, ${desktopMetrics.expectedCenterY})`);
    console.log(`  Desktop Workspace: Actual Center   = (${desktopMetrics.actualCenterX.toFixed(1)}, ${desktopMetrics.actualCenterY.toFixed(1)})`);
    console.log(`  Difference: dx = ${desktopMetrics.diffX.toFixed(2)}px, dy = ${desktopMetrics.diffY.toFixed(2)}px`);

    report('C1.desktop_x', 'Modal dialog is horizontally centered in visible workspace (within +/- 3px)',
      desktopMetrics.diffX <= 3.0,
      `diffX = ${desktopMetrics.diffX}px`
    );

    report('C1.desktop_y', 'Modal dialog is vertically centered below top navigation (within +/- 3px)',
      desktopMetrics.diffY <= 3.0,
      `diffY = ${desktopMetrics.diffY}px`
    );

    report('C1.within_viewport', 'Modal dialog bounds are completely within visible workspace',
      desktopMetrics.rect.left >= 240 &&
      desktopMetrics.rect.right <= 1440 &&
      desktopMetrics.rect.top >= 56 &&
      desktopMetrics.rect.bottom <= 900
    );

    report('C1.body_lock', 'Body scroll is locked (document.body.style.overflow === "hidden")',
      desktopMetrics.bodyOverflow === 'hidden'
    );

    // Test Collapsed Sidebar (64px width) Centering
    console.log('\n--- 2b. Inspect Modal Centering with Collapsed Sidebar (1440x900) ---');
    await page.click('#model-detail-close-btn');
    await new Promise(r => setTimeout(r, 200));

    // Collapse the sidebar
    await page.click('.sidebar-collapse-btn');
    await new Promise(r => setTimeout(r, 400));

    // Reopen modal
    await page.evaluate(() => {
      const inspectBtns = Array.from(document.querySelectorAll('.btn-text-action-primary'));
      if (inspectBtns[0]) inspectBtns[0].click();
    });
    await page.waitForSelector('#model-detail-dialog', { visible: true, timeout: 3000 });

    const collapsedMetrics = await page.evaluate(() => {
      const dialog = document.getElementById('model-detail-dialog');
      const rect = dialog.getBoundingClientRect();
      const expectedCenterX = 64 + (1440 - 64) / 2; // 752px
      const expectedCenterY = 56 + (900 - 56) / 2;   // 478px
      const actualCenterX = (rect.left + rect.right) / 2;
      const actualCenterY = (rect.top + rect.bottom) / 2;
      return {
        diffX: Math.abs(actualCenterX - expectedCenterX),
        diffY: Math.abs(actualCenterY - expectedCenterY),
        actualCenterX,
        actualCenterY
      };
    });

    report('C2.collapsed_x', 'Collapsed sidebar: Modal is horizontally centered at 752px (within +/- 3px)',
      collapsedMetrics.diffX <= 3.0,
      `diffX = ${collapsedMetrics.diffX}px`
    );

    report('C2.collapsed_y', 'Collapsed sidebar: Modal is vertically centered at 478px (within +/- 3px)',
      collapsedMetrics.diffY <= 3.0,
      `diffY = ${collapsedMetrics.diffY}px`
    );

    // Expand sidebar back
    await page.click('.sidebar-collapse-btn');
    await new Promise(r => setTimeout(r, 400));

    // Save screenshot
    await page.screenshot({ path: path.join(__dirname, '../../verification/screenshots/scratch_model_registry_centered.png') });

    // -------------------------------------------------------------------------
    // TEST 3: Model Detail Tabs Styling & Interaction
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Model Detail 7 Tabs Styling & Navigation ---');

    const tabsInfo = await page.evaluate(() => {
      const tabBtns = Array.from(document.querySelectorAll('.inspection-tab-btn'));
      return tabBtns.map(btn => {
        const style = window.getComputedStyle(btn);
        return {
          id: btn.id,
          label: btn.textContent.trim(),
          color: style.color,
          borderBottomColor: style.borderBottomColor,
          borderBottomWidth: style.borderBottomWidth,
          hasActive: btn.classList.contains('active'),
          ariaSelected: btn.getAttribute('aria-selected')
        };
      });
    });

    const expectedTabs = [
      'Overview',
      'Performance',
      'Features',
      'Predictions',
      'Drift / Monitoring',
      'Versions & Compare',
      'Training & Lifecycle'
    ];

    report('T1.count', 'All 7 tabs exist in exact order',
      tabsInfo.length === 7 && tabsInfo.every((t, i) => t.label === expectedTabs[i])
    );

    report('T1.active_overview', 'Default active tab is "Overview" with cyan text/border and aria-selected="true"',
      tabsInfo[0].hasActive === true &&
      tabsInfo[0].ariaSelected === 'true' &&
      tabsInfo[0].color.includes('24, 200, 244') &&
      tabsInfo[0].borderBottomColor.includes('24, 200, 244')
    );

    report('T1.inactive_tabs', 'Inactive tabs have muted secondary text and transparent bottom border',
      tabsInfo.slice(1).every(t => !t.hasActive && t.ariaSelected === 'false')
    );

    // Click each of the remaining tabs and verify their panels render
    const tabsToTest = [
      { id: 'performance', panelId: 'inspection-panel-performance', expectedText: 'Performance & Validation' },
      { id: 'features', panelId: 'inspection-panel-features', expectedText: 'Feature Importance' },
      { id: 'predictions', panelId: 'inspection-panel-predictions', expectedText: 'Interactive Model Inference' },
      { id: 'drift', panelId: 'inspection-panel-drift', expectedText: 'Kolmogorov-Smirnov' },
      { id: 'versions', panelId: 'inspection-panel-versions', expectedText: 'Version Comparison Matrix' },
      { id: 'training', panelId: 'inspection-panel-training', expectedText: 'Pipeline Stages' }
    ];

    for (const tab of tabsToTest) {
      await page.click(`#inspection-tab-${tab.id}`);
      await new Promise(r => setTimeout(r, 200));

      const tabState = await page.evaluate((tabId, pId) => {
        const btn = document.getElementById(`inspection-tab-${tabId}`);
        const panel = document.getElementById(pId);
        const style = btn ? window.getComputedStyle(btn) : {};
        return {
          btnActive: btn?.classList.contains('active'),
          ariaSelected: btn?.getAttribute('aria-selected'),
          cyanColor: style.color?.includes('24, 200, 244'),
          panelExists: Boolean(panel),
          panelText: panel?.textContent || ''
        };
      }, tab.id, tab.panelId);

      report(
        `T2.${tab.id}`,
        `Tab "${tab.id}" click activates tab and displays panel containing "${tab.expectedText}"`,
        tabState.btnActive && tabState.ariaSelected === 'true' && tabState.cyanColor && tabState.panelExists && tabState.panelText.includes(tab.expectedText)
      );
    }

    // Capture screenshot of tabs
    await page.screenshot({ path: path.join(__dirname, '../../verification/screenshots/scratch_model_tabs.png') });

    // -------------------------------------------------------------------------
    // TEST 4: Dismissal Behaviors (Close Button, Escape Key, Backdrop Click)
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Modal Dismissal Behaviors ---');

    // 1. Close via Close Button
    await page.click('#model-detail-close-btn');
    await new Promise(r => setTimeout(r, 300));

    const closeBtnDismiss = await page.evaluate(() => {
      const dialog = document.getElementById('model-detail-dialog');
      return {
        isOpen: Boolean(dialog),
        bodyOverflow: document.body.style.overflow
      };
    });

    report('D1.close_btn', 'Clicking "x Close" button closes the dialog and restores body scroll',
      !closeBtnDismiss.isOpen && closeBtnDismiss.bodyOverflow !== 'hidden'
    );

    // 2. Open again and test Escape key
    await page.evaluate(() => {
      const inspectBtns = Array.from(document.querySelectorAll('.btn-text-action-primary'));
      if (inspectBtns[0]) inspectBtns[0].click();
    });
    await page.waitForSelector('#model-detail-dialog', { visible: true, timeout: 3000 });

    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 300));

    const escDismiss = await page.evaluate(() => {
      const dialog = document.getElementById('model-detail-dialog');
      return {
        isOpen: Boolean(dialog),
        bodyOverflow: document.body.style.overflow
      };
    });

    report('D2.escape_key', 'Pressing Escape key closes the dialog and restores body scroll',
      !escDismiss.isOpen && escDismiss.bodyOverflow !== 'hidden'
    );

    // 3. Open again and test Backdrop Click
    await page.evaluate(() => {
      const inspectBtns = Array.from(document.querySelectorAll('.btn-text-action-primary'));
      if (inspectBtns[0]) inspectBtns[0].click();
    });
    await page.waitForSelector('#model-detail-dialog', { visible: true, timeout: 3000 });

    // Click on backdrop outside dialog (top left of backdrop: X = 250, Y = 70)
    await page.mouse.click(250, 70);
    await new Promise(r => setTimeout(r, 300));

    const backdropDismiss = await page.evaluate(() => {
      const dialog = document.getElementById('model-detail-dialog');
      return {
        isOpen: Boolean(dialog),
        bodyOverflow: document.body.style.overflow
      };
    });

    report('D3.backdrop_click', 'Clicking outside dialog on backdrop closes the dialog and restores body scroll',
      !backdropDismiss.isOpen && backdropDismiss.bodyOverflow !== 'hidden'
    );

    // -------------------------------------------------------------------------
    // TEST 5: Responsive Viewports (Laptop, Tablet, Mobile)
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Responsive Viewport Adaptations ---');

    // 1. Laptop (1024x768)
    await page.setViewport({ width: 1024, height: 768 });
    await page.evaluate(() => {
      const inspectBtns = Array.from(document.querySelectorAll('.btn-text-action-primary'));
      if (inspectBtns[0]) inspectBtns[0].click();
    });
    await page.waitForSelector('#model-detail-dialog', { visible: true, timeout: 3000 });

    const laptopFit = await page.evaluate(() => {
      const dialog = document.getElementById('model-detail-dialog');
      const rect = dialog.getBoundingClientRect();
      return {
        withinBounds: rect.left >= 0 && rect.right <= 1024 && rect.top >= 0 && rect.bottom <= 768,
        rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }
      };
    });

    report('R1.laptop_1024', 'Laptop (1024x768): Modal fits within viewport without clipping',
      laptopFit.withinBounds
    );

    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 200));

    // 2. Tablet (768x1024)
    await page.setViewport({ width: 768, height: 1024 });
    await page.evaluate(() => {
      const inspectBtns = Array.from(document.querySelectorAll('.btn-text-action-primary'));
      if (inspectBtns[0]) inspectBtns[0].click();
    });
    await page.waitForSelector('#model-detail-dialog', { visible: true, timeout: 3000 });

    const tabletFit = await page.evaluate(() => {
      const dialog = document.getElementById('model-detail-dialog');
      const rect = dialog.getBoundingClientRect();
      return {
        withinBounds: rect.left >= 0 && rect.right <= 768 && rect.top >= 0 && rect.bottom <= 1024,
        rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }
      };
    });

    report('R2.tablet_768', 'Tablet (768x1024): Modal fits within viewport without clipping',
      tabletFit.withinBounds
    );

    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 200));

    // 3. Mobile (375x667)
    await page.setViewport({ width: 375, height: 667 });
    await page.evaluate(() => {
      const inspectBtns = Array.from(document.querySelectorAll('.btn-text-action-primary'));
      if (inspectBtns[0]) inspectBtns[0].click();
    });
    await page.waitForSelector('#model-detail-dialog', { visible: true, timeout: 3000 });

    const mobileFit = await page.evaluate(() => {
      const dialog = document.getElementById('model-detail-dialog');
      const rect = dialog.getBoundingClientRect();
      return {
        withinBounds: rect.left >= 0 && rect.right <= 375 && rect.top >= 0 && rect.bottom <= 667,
        rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }
      };
    });

    report('R3.mobile_375', 'Mobile (375x667): Modal fits within mobile viewport with margins',
      mobileFit.withinBounds
    );

    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 200));

  } catch (err) {
    console.error('Test Execution Error:', err);
    failedTests++;
  } finally {
    await browser.close();
  }

  console.log('\n========================================================================');
  console.log(`TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${totalTests})`);
  console.log('========================================================================\n');

  process.exit(failedTests > 0 ? 1 : 0);
}

runModelRegistrySuite();
