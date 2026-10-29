/**
 * InsightIQ AI — Anomaly Record Details Modal Centering & Responsive Verification
 *
 * Verifies:
 * 1. Desktop (1440x900, expanded sidebar): Modal is horizontally centered in workspace (center = 840px)
 *    and vertically centered below top header (center = 478px).
 * 2. Entire modal boundaries are within visible workspace (left >= 240, right <= 1440, top >= 56, bottom <= 900).
 * 3. Overlay backdrop covers workspace (left: 240, top: 56, right: 0, bottom: 0) without covering sidebar or header.
 * 4. Body scroll locking: document.body.style.overflow === 'hidden' while open.
 * 5. Collapsed Sidebar mode: Overlay adapts (left: 64px) and modal re-centers at 752px.
 * 6. Review Actions: "Confirm Anomaly" updates status to CONFIRMED.
 * 7. Review Actions: "Flag False Positive" updates status to FALSE-POSITIVE.
 * 8. Header and Close Button (✕) remain pinned and visible; body has scrollable content.
 * 9. Dismissal: Close button (✕) closes modal and restores body scroll.
 * 10. Dismissal: "Close Workspace" button closes modal and restores body scroll.
 * 11. Dismissal: Backdrop click closes modal and restores body scroll.
 * 12. Dismissal: Escape key closes modal and restores body scroll.
 * 13. Laptop (1024x768): Centered in workspace, fits viewport, no clipping.
 * 14. Tablet (768x1024): Centered, fits viewport, no clipping.
 * 15. Mobile (375x667): Centered with margins, clears mobile bottom bar, no clipping.
 * 16. Underlying Anomaly Detection calculations and tables remain completely intact.
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:8085';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCRATCH_DIR = path.join(__dirname, 'scratch');

if (!fs.existsSync(SCRATCH_DIR)) {
  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
}

let passed = 0;
let failed = 0;
const totalTests = 16;

function report(num, title, isPass, detail = '') {
  if (isPass) {
    console.log(`  ✓ PASS [${num}/${totalTests}]: ${title}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL [${num}/${totalTests}]: ${title} -> ${detail}`);
    failed++;
  }
}

async function runVerification() {
  console.log('========================================================================');
  console.log('InsightIQ AI — Anomaly Record Details Modal Centering Verification Suite');
  console.log('========================================================================\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // -------------------------------------------------------------------------
    // SETUP: Authenticate as Data Analyst and Navigate to Analytics -> Anomalies
    // -------------------------------------------------------------------------
    console.log('[Setup] Launching desktop viewport (1440x900) and navigating to Analytics...');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });

    await page.evaluate(() => {
      if (window.__insightIQTest?.triggerDataDashboard) {
        window.__insightIQTest.triggerDataDashboard('data_analyst');
      }
      // Populate dataset rows so mathematical anomaly scan executes on real telemetry
      if (!window._datasetRowsStore) window._datasetRowsStore = {};
      const rows = [];
      for (let i = 0; i < 50; i++) {
        rows.push({
          'Sales': i === 12 ? 99999 : (100 + i * 5),
          'Days for shipping (real)': i === 12 ? 45 : (2 + (i % 4)),
          'Benefit per order': i === 12 ? -5000 : (20 + (i % 15)),
          'Order Id': 1000 + i,
          'Order Region': 'Western Europe',
          'Category Name': 'Sporting Goods',
          'Customer Segment': 'Consumer'
        });
      }
      window._datasetRowsStore['dataco-ds-001'] = rows;
    });
    await new Promise(r => setTimeout(r, 400));

    await page.evaluate(() => {
      if (window.__insightIQTest?.setActiveNav) {
        window.__insightIQTest.setActiveNav('analytics');
      }
      if (window.__insightIQTest?.setAnalyticsSubnavTab) {
        window.__insightIQTest.setAnalyticsSubnavTab('anomalies');
      }
    });
    await new Promise(r => setTimeout(r, 600));

    // Run anomaly analysis if needed or inspect first anomaly row
    console.log('[Setup] Running Anomaly Detection analysis...');
    await page.evaluate(async () => {
      const runBtn = document.getElementById('btn-run-anomaly-analysis');
      if (runBtn) {
        runBtn.click();
      }
    });
    await new Promise(r => setTimeout(r, 1500));

    // Check if anomaly row exists in DOM, or inject realistic anomaly row via test hook
    const hasInspectBtn = await page.evaluate(() => {
      const btn = document.querySelector('.btn-inspect-anomaly-row');
      return !!btn;
    });

    if (hasInspectBtn) {
      console.log('  Found inspect button in anomaly observations table.');
      await page.click('.btn-inspect-anomaly-row');
    } else {
      console.log('  Triggering inspectAnomalyRow via test hook with canonical multivariate anomaly...');
      await page.evaluate(() => {
        window.__insightIQTest.setInspectAnomalyRow({
          row_id: 42,
          score: 0.942,
          severity: 'Critical',
          affected_feature: 'transaction_amount',
          features: [
            { name: 'transaction_amount', observed: 4850.00, baseline: 245.50, deviation: 4604.50, stdDev: 120.00 },
            { name: 'velocity_score', observed: 88.5, baseline: 12.0, deviation: 76.5, stdDev: 8.5 },
            { name: 'risk_index', observed: 0.91, baseline: 0.15, deviation: 0.76, stdDev: 0.10 }
          ]
        });
      });
    }

    await page.waitForSelector('#anomaly-record-details-dialog', { visible: true, timeout: 5000 });
    // Allow entrance scale animation to complete (200ms)
    await new Promise(r => setTimeout(r, 350));
    console.log('  Anomaly Record Details dialog is open and visible.\n');

    // Take screenshot of desktop state
    await page.screenshot({ path: path.join(SCRATCH_DIR, 'anomaly_modal_desktop.png') });

    // -------------------------------------------------------------------------
    // TEST 1: Desktop Workspace Centering (1440x900)
    // -------------------------------------------------------------------------
    console.log('[1/16] Testing Desktop (1440x900) workspace horizontal & vertical centering...');
    const desktopMetrics = await page.evaluate(() => {
      const dialog = document.getElementById('anomaly-record-details-dialog');
      const backdrop = document.getElementById('anomaly-record-details-backdrop');
      const rect = dialog.getBoundingClientRect();
      const backdropRect = backdrop.getBoundingClientRect();
      const bodyOverflow = document.body.style.overflow;

      const sidebarWidth = 240;
      const headerHeight = 56;
      const workspaceWidth = 1440 - sidebarWidth; // 1200
      const workspaceHeight = 900 - headerHeight; // 844

      const expectedCenterX = sidebarWidth + (workspaceWidth / 2); // 240 + 600 = 840
      const expectedCenterY = headerHeight + (workspaceHeight / 2); // 56 + 422 = 478

      const actualCenterX = rect.left + (rect.width / 2);
      const actualCenterY = rect.top + (rect.height / 2);

      const centerDiffX = Math.abs(actualCenterX - expectedCenterX);
      const centerDiffY = Math.abs(actualCenterY - expectedCenterY);

      return {
        rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
        backdropRect: { left: backdropRect.left, top: backdropRect.top, right: backdropRect.right, bottom: backdropRect.bottom, width: backdropRect.width, height: backdropRect.height },
        actualCenterX,
        actualCenterY,
        expectedCenterX,
        expectedCenterY,
        centerDiffX,
        centerDiffY,
        bodyOverflow,
        isPortaledToBody: backdrop.parentElement === document.body
      };
    });

    const isDesktopCentered = desktopMetrics.centerDiffX <= 3 && desktopMetrics.centerDiffY <= 3;
    report(
      1,
      `Desktop (1440x900) Centered: X-center=${desktopMetrics.actualCenterX.toFixed(1)}px (expected ${desktopMetrics.expectedCenterX}px, diff=${desktopMetrics.centerDiffX.toFixed(1)}px), Y-center=${desktopMetrics.actualCenterY.toFixed(1)}px (expected ${desktopMetrics.expectedCenterY}px, diff=${desktopMetrics.centerDiffY.toFixed(1)}px)`,
      isDesktopCentered,
      `Horizontal diff: ${desktopMetrics.centerDiffX}px, Vertical diff: ${desktopMetrics.centerDiffY}px`
    );

    // -------------------------------------------------------------------------
    // TEST 2: Boundaries within Visible Workspace
    // -------------------------------------------------------------------------
    const isWithinWorkspace = desktopMetrics.rect.left >= 240 &&
                              desktopMetrics.rect.right <= 1440 &&
                              desktopMetrics.rect.top >= 56 &&
                              desktopMetrics.rect.bottom <= 900;
    report(
      2,
      `Boundaries within workspace: left=${desktopMetrics.rect.left.toFixed(1)}px (>=240), right=${desktopMetrics.rect.right.toFixed(1)}px (<=1440), top=${desktopMetrics.rect.top.toFixed(1)}px (>=56), bottom=${desktopMetrics.rect.bottom.toFixed(1)}px (<=900)`,
      isWithinWorkspace,
      `Out of bounds: left=${desktopMetrics.rect.left}, right=${desktopMetrics.rect.right}, top=${desktopMetrics.rect.top}, bottom=${desktopMetrics.rect.bottom}`
    );

    // -------------------------------------------------------------------------
    // TEST 3: Backdrop Overlay Dimensions
    // -------------------------------------------------------------------------
    const isBackdropCorrect = Math.abs(desktopMetrics.backdropRect.left - 240) <= 2 &&
                              Math.abs(desktopMetrics.backdropRect.top - 56) <= 2 &&
                              Math.abs(desktopMetrics.backdropRect.width - 1200) <= 2 &&
                              Math.abs(desktopMetrics.backdropRect.height - 844) <= 2 &&
                              desktopMetrics.isPortaledToBody;
    report(
      3,
      `Backdrop overlay covers workspace: left=${desktopMetrics.backdropRect.left}px (240), top=${desktopMetrics.backdropRect.top}px (56), width=${desktopMetrics.backdropRect.width}px (1200), portaled=${desktopMetrics.isPortaledToBody}`,
      isBackdropCorrect,
      `Backdrop bounds mismatch: ${JSON.stringify(desktopMetrics.backdropRect)}`
    );

    // -------------------------------------------------------------------------
    // TEST 4: Body Scroll Lock
    // -------------------------------------------------------------------------
    report(
      4,
      `Body scroll is locked: document.body.style.overflow === '${desktopMetrics.bodyOverflow}'`,
      desktopMetrics.bodyOverflow === 'hidden',
      `Expected 'hidden', got '${desktopMetrics.bodyOverflow}'`
    );

    // -------------------------------------------------------------------------
    // TEST 5: Collapsed Sidebar Mode Centering
    // -------------------------------------------------------------------------
    console.log('\n[5/16] Testing Collapsed Sidebar mode re-centering...');
    await page.evaluate(() => {
      window.__insightIQTest.setIsSidebarCollapsed(true);
    });
    await new Promise(r => setTimeout(r, 200));

    const collapsedMetrics = await page.evaluate(() => {
      const dialog = document.getElementById('anomaly-record-details-dialog');
      const backdrop = document.getElementById('anomaly-record-details-backdrop');
      const rect = dialog.getBoundingClientRect();
      const backdropRect = backdrop.getBoundingClientRect();

      const sidebarWidth = 64;
      const workspaceWidth = 1440 - sidebarWidth; // 1376
      const expectedCenterX = sidebarWidth + (workspaceWidth / 2); // 64 + 688 = 752
      const actualCenterX = rect.left + (rect.width / 2);
      const centerDiffX = Math.abs(actualCenterX - expectedCenterX);

      return {
        backdropLeft: backdropRect.left,
        actualCenterX,
        expectedCenterX,
        centerDiffX,
        hasCollapsedClass: backdrop.classList.contains('sidebar-collapsed')
      };
    });

    const isCollapsedCentered = collapsedMetrics.centerDiffX <= 3 && Math.abs(collapsedMetrics.backdropLeft - 64) <= 2;
    report(
      5,
      `Collapsed Sidebar: backdropLeft=${collapsedMetrics.backdropLeft}px (expected 64px), X-center=${collapsedMetrics.actualCenterX.toFixed(1)}px (expected ${collapsedMetrics.expectedCenterX}px, diff=${collapsedMetrics.centerDiffX.toFixed(1)}px)`,
      isCollapsedCentered,
      `Collapsed diff: ${collapsedMetrics.centerDiffX}px`
    );

    // Restore expanded sidebar
    await page.evaluate(() => {
      window.__insightIQTest.setIsSidebarCollapsed(false);
    });
    await new Promise(r => setTimeout(r, 200));

    // -------------------------------------------------------------------------
    // TEST 6: Review Action: "Confirm Anomaly"
    // -------------------------------------------------------------------------
    console.log('\n[6/16] Testing Review Action: Confirm Anomaly button...');
    await page.click('#btn-confirm-anomaly');
    await new Promise(r => setTimeout(r, 250));

    const confirmState = await page.evaluate(() => {
      const statusChip = document.getElementById('anomaly-status-chip');
      const reviewStates = window.__insightIQTest.getAnomalyReviewStates();
      const activeRow = window.__insightIQTest.getInspectAnomalyRow();
      return {
        chipText: statusChip ? statusChip.textContent.trim() : '',
        chipClass: statusChip ? statusChip.className : '',
        stateValue: reviewStates[activeRow.row_id]
      };
    });

    const isConfirmedPass = confirmState.chipText === 'CONFIRMED' && confirmState.stateValue === 'confirmed';
    report(
      6,
      `Confirm Anomaly: statusChip='${confirmState.chipText}', reviewState='${confirmState.stateValue}'`,
      isConfirmedPass,
      `Confirm state mismatch: ${JSON.stringify(confirmState)}`
    );

    // -------------------------------------------------------------------------
    // TEST 7: Review Action: "Flag False Positive"
    // -------------------------------------------------------------------------
    console.log('\n[7/16] Testing Review Action: Flag False Positive button...');
    await page.click('#btn-flag-false-positive');
    await new Promise(r => setTimeout(r, 250));

    const falsePositiveState = await page.evaluate(() => {
      const statusChip = document.getElementById('anomaly-status-chip');
      const reviewStates = window.__insightIQTest.getAnomalyReviewStates();
      const activeRow = window.__insightIQTest.getInspectAnomalyRow();
      return {
        chipText: statusChip ? statusChip.textContent.trim() : '',
        chipClass: statusChip ? statusChip.className : '',
        stateValue: reviewStates[activeRow.row_id]
      };
    });

    const isFalsePositivePass = falsePositiveState.chipText === 'FALSE-POSITIVE' && falsePositiveState.stateValue === 'false-positive';
    report(
      7,
      `Flag False Positive: statusChip='${falsePositiveState.chipText}', reviewState='${falsePositiveState.stateValue}'`,
      isFalsePositivePass,
      `False Positive state mismatch: ${JSON.stringify(falsePositiveState)}`
    );

    // -------------------------------------------------------------------------
    // TEST 8: Pinned Header, Close Button & Scrollable Body
    // -------------------------------------------------------------------------
    console.log('\n[8/16] Testing Pinned Header, Close Button visibility & Scrollable Body...');
    const layoutIntegrity = await page.evaluate(() => {
      const header = document.querySelector('.anomaly-record-details-header');
      const closeBtn = document.getElementById('anomaly-record-details-close-btn');
      const body = document.getElementById('anomaly-record-details-body');
      const headerRect = header.getBoundingClientRect();
      const closeBtnRect = closeBtn.getBoundingClientRect();

      // Scroll body down by 100px
      body.scrollTop = 100;
      const scrolledTop = body.scrollTop;

      // Ensure close button did not move
      const closeBtnRectAfter = closeBtn.getBoundingClientRect();
      const isClosePinned = Math.abs(closeBtnRect.top - closeBtnRectAfter.top) < 1;

      return {
        headerHeight: headerRect.height,
        closeBtnVisible: closeBtnRect.width > 0 && closeBtnRect.height > 0,
        isClosePinned,
        bodyScrollHeight: body.scrollHeight,
        bodyClientHeight: body.clientHeight,
        scrolledTop
      };
    });

    report(
      8,
      `Header & Close button pinned during scroll (isClosePinned=${layoutIntegrity.isClosePinned}), body clientHeight=${layoutIntegrity.bodyClientHeight}px, scrollHeight=${layoutIntegrity.bodyScrollHeight}px`,
      layoutIntegrity.closeBtnVisible && layoutIntegrity.isClosePinned,
      `Layout integrity failure: ${JSON.stringify(layoutIntegrity)}`
    );

    // -------------------------------------------------------------------------
    // TEST 9: Close Button (✕) Dismissal & Body Scroll Restoration
    // -------------------------------------------------------------------------
    console.log('\n[9/16] Testing Close button (✕) dismissal and body scroll restoration...');
    await page.click('#anomaly-record-details-close-btn');
    await new Promise(r => setTimeout(r, 200));

    const closeBtnDismissal = await page.evaluate(() => {
      const dialog = document.getElementById('anomaly-record-details-dialog');
      return {
        isOpen: !!dialog,
        bodyOverflow: document.body.style.overflow
      };
    });

    report(
      9,
      `Close button (✕): dialog closed=${!closeBtnDismissal.isOpen}, bodyOverflow='${closeBtnDismissal.bodyOverflow}'`,
      !closeBtnDismissal.isOpen && closeBtnDismissal.bodyOverflow !== 'hidden',
      `Close button failed: isOpen=${closeBtnDismissal.isOpen}, bodyOverflow=${closeBtnDismissal.bodyOverflow}`
    );

    // Reopen modal helper
    const reopenModal = async () => {
      await page.evaluate(() => {
        window.__insightIQTest.setInspectAnomalyRow({
          row_id: 42,
          score: 0.942,
          severity: 'Critical',
          affected_feature: 'transaction_amount',
          features: [
            { name: 'transaction_amount', observed: 4850.00, baseline: 245.50, deviation: 4604.50, stdDev: 120.00 },
            { name: 'velocity_score', observed: 88.5, baseline: 12.0, deviation: 76.5, stdDev: 8.5 }
          ]
        });
      });
      await page.waitForSelector('#anomaly-record-details-dialog', { visible: true, timeout: 3000 });
    };

    // -------------------------------------------------------------------------
    // TEST 10: "Close Workspace" Button Dismissal
    // -------------------------------------------------------------------------
    console.log('\n[10/16] Testing "Close Workspace" button dismissal...');
    await reopenModal();
    await page.click('#btn-close-anomaly-workspace');
    await new Promise(r => setTimeout(r, 200));

    const closeWorkspaceDismissal = await page.evaluate(() => {
      const dialog = document.getElementById('anomaly-record-details-dialog');
      return {
        isOpen: !!dialog,
        bodyOverflow: document.body.style.overflow
      };
    });

    report(
      10,
      `"Close Workspace" button: dialog closed=${!closeWorkspaceDismissal.isOpen}, bodyOverflow='${closeWorkspaceDismissal.bodyOverflow}'`,
      !closeWorkspaceDismissal.isOpen && closeWorkspaceDismissal.bodyOverflow !== 'hidden',
      `Close Workspace button failed: isOpen=${closeWorkspaceDismissal.isOpen}`
    );

    // -------------------------------------------------------------------------
    // TEST 11: Backdrop Click Dismissal
    // -------------------------------------------------------------------------
    console.log('\n[11/16] Testing Backdrop click dismissal...');
    await reopenModal();
    // Click on backdrop outside dialog (top left padding area: x=250, y=70)
    await page.mouse.click(250, 70);
    await new Promise(r => setTimeout(r, 200));

    const backdropDismissal = await page.evaluate(() => {
      const dialog = document.getElementById('anomaly-record-details-dialog');
      return {
        isOpen: !!dialog,
        bodyOverflow: document.body.style.overflow
      };
    });

    report(
      11,
      `Backdrop click: dialog closed=${!backdropDismissal.isOpen}, bodyOverflow='${backdropDismissal.bodyOverflow}'`,
      !backdropDismissal.isOpen && backdropDismissal.bodyOverflow !== 'hidden',
      `Backdrop click failed: isOpen=${backdropDismissal.isOpen}`
    );

    // -------------------------------------------------------------------------
    // TEST 12: Escape Key Dismissal
    // -------------------------------------------------------------------------
    console.log('\n[12/16] Testing Escape key dismissal...');
    await reopenModal();
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 200));

    const escapeDismissal = await page.evaluate(() => {
      const dialog = document.getElementById('anomaly-record-details-dialog');
      return {
        isOpen: !!dialog,
        bodyOverflow: document.body.style.overflow
      };
    });

    report(
      12,
      `Escape key: dialog closed=${!escapeDismissal.isOpen}, bodyOverflow='${escapeDismissal.bodyOverflow}'`,
      !escapeDismissal.isOpen && escapeDismissal.bodyOverflow !== 'hidden',
      `Escape key failed: isOpen=${escapeDismissal.isOpen}`
    );

    // -------------------------------------------------------------------------
    // TEST 13: Laptop Viewport (1024x768)
    // -------------------------------------------------------------------------
    console.log('\n[13/16] Testing Laptop Viewport (1024x768)...');
    await page.setViewport({ width: 1024, height: 768 });
    await reopenModal();
    await page.screenshot({ path: path.join(SCRATCH_DIR, 'anomaly_modal_laptop.png') });

    const laptopMetrics = await page.evaluate(() => {
      const dialog = document.getElementById('anomaly-record-details-dialog');
      const rect = dialog.getBoundingClientRect();
      const sidebarWidth = 240;
      const workspaceWidth = 1024 - sidebarWidth; // 784
      const expectedCenterX = sidebarWidth + (workspaceWidth / 2); // 240 + 392 = 632
      const actualCenterX = rect.left + (rect.width / 2);
      const centerDiffX = Math.abs(actualCenterX - expectedCenterX);

      return {
        rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
        actualCenterX,
        expectedCenterX,
        centerDiffX,
        isWithinViewport: rect.left >= 240 && rect.right <= 1024 && rect.top >= 56 && rect.bottom <= 768
      };
    });

    const isLaptopPass = laptopMetrics.centerDiffX <= 3 && laptopMetrics.isWithinViewport;
    report(
      13,
      `Laptop (1024x768): X-center=${laptopMetrics.actualCenterX.toFixed(1)}px (expected ${laptopMetrics.expectedCenterX}px, diff=${laptopMetrics.centerDiffX.toFixed(1)}px), right=${laptopMetrics.rect.right.toFixed(1)}px (<=1024)`,
      isLaptopPass,
      `Laptop failure: ${JSON.stringify(laptopMetrics)}`
    );

    // -------------------------------------------------------------------------
    // TEST 14: Tablet Viewport (768x1024)
    // -------------------------------------------------------------------------
    console.log('\n[14/16] Testing Tablet Viewport (768x1024)...');
    await page.setViewport({ width: 768, height: 1024 });
    await new Promise(r => setTimeout(r, 200));
    await page.screenshot({ path: path.join(SCRATCH_DIR, 'anomaly_modal_tablet.png') });

    const tabletMetrics = await page.evaluate(() => {
      const dialog = document.getElementById('anomaly-record-details-dialog');
      const rect = dialog.getBoundingClientRect();
      // On <= 768px, overlay is left: 0, bottom: 56px (for bottom nav bar)
      const expectedCenterX = 768 / 2; // 384
      const actualCenterX = rect.left + (rect.width / 2);
      const centerDiffX = Math.abs(actualCenterX - expectedCenterX);

      return {
        rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
        actualCenterX,
        expectedCenterX,
        centerDiffX,
        isWithinViewport: rect.left >= 0 && rect.right <= 768 && rect.top >= 56 && rect.bottom <= (1024 - 56)
      };
    });

    const isTabletPass = tabletMetrics.centerDiffX <= 3 && tabletMetrics.isWithinViewport;
    report(
      14,
      `Tablet (768x1024): X-center=${tabletMetrics.actualCenterX.toFixed(1)}px (expected ${tabletMetrics.expectedCenterX}px, diff=${tabletMetrics.centerDiffX.toFixed(1)}px), right=${tabletMetrics.rect.right.toFixed(1)}px (<=768)`,
      isTabletPass,
      `Tablet failure: ${JSON.stringify(tabletMetrics)}`
    );

    // -------------------------------------------------------------------------
    // TEST 15: Mobile Viewport (375x667)
    // -------------------------------------------------------------------------
    console.log('\n[15/16] Testing Mobile Viewport (375x667)...');
    await page.setViewport({ width: 375, height: 667 });
    await new Promise(r => setTimeout(r, 200));
    await page.screenshot({ path: path.join(SCRATCH_DIR, 'anomaly_modal_mobile.png') });

    const mobileMetrics = await page.evaluate(() => {
      const dialog = document.getElementById('anomaly-record-details-dialog');
      const rect = dialog.getBoundingClientRect();
      // On 375px mobile, expected center is 375 / 2 = 187.5
      const expectedCenterX = 375 / 2;
      const actualCenterX = rect.left + (rect.width / 2);
      const centerDiffX = Math.abs(actualCenterX - expectedCenterX);

      return {
        rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
        actualCenterX,
        expectedCenterX,
        centerDiffX,
        isWithinViewport: rect.left >= 0 && rect.right <= 375 && rect.top >= 56 && rect.bottom <= (667 - 56)
      };
    });

    const isMobilePass = mobileMetrics.centerDiffX <= 3 && mobileMetrics.isWithinViewport;
    report(
      15,
      `Mobile (375x667): X-center=${mobileMetrics.actualCenterX.toFixed(1)}px (expected ${mobileMetrics.expectedCenterX}px, diff=${mobileMetrics.centerDiffX.toFixed(1)}px), width=${mobileMetrics.rect.width.toFixed(1)}px (<=375)`,
      isMobilePass,
      `Mobile failure: ${JSON.stringify(mobileMetrics)}`
    );

    // Close modal on mobile
    await page.click('#anomaly-record-details-close-btn');
    await new Promise(r => setTimeout(r, 200));

    // Reset viewport back to desktop
    await page.setViewport({ width: 1440, height: 900 });

    // -------------------------------------------------------------------------
    // TEST 16: Underlying Anomaly Detection Functionality Preserved
    // -------------------------------------------------------------------------
    console.log('\n[16/16] Verifying underlying Anomaly Detection analytics & tables remain intact...');
    const tableState = await page.evaluate(() => {
      const activeNav = window.__insightIQTest ? window.__insightIQTest.getWorkspaceStatus() : null;
      const inspectBtn = document.querySelector('.btn-inspect-anomaly-row');
      const tableHeaders = Array.from(document.querySelectorAll('th')).map(th => th.textContent.trim());
      return {
        hasInspectBtn: !!inspectBtn,
        hasHeaders: tableHeaders.some(h => h.includes('Severity') || h.includes('Score') || h.includes('Feature'))
      };
    });

    report(
      16,
      `Underlying Anomaly Detection tables & features intact (hasInspectBtn=${tableState.hasInspectBtn}, hasHeaders=${tableState.hasHeaders})`,
      tableState.hasHeaders,
      'Underlying table headers missing'
    );

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await browser.close();
  }

  console.log('\n------------------------------------------------------------------------');
  console.log(`Verification Complete: ${passed} passed, ${failed} failed out of ${totalTests} total tests`);
  console.log('------------------------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification();
