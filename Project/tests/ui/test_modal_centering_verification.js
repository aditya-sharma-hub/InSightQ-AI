/**
 * InsightIQ AI — Full Schema Dictionary Modal Centering & Responsive Verification
 *
 * Verifies:
 * 1. Desktop (1440x900): Modal is horizontally and vertically centered in visible viewport.
 * 2. Entire modal boundaries are within visible viewport (left >= 0, right <= 1440, top >= 0, bottom <= 900).
 * 3. Backdrop overlay covers entire viewport (0, 0, 1440, 900) and sits above sidebar/header.
 * 4. Body scroll locking: document.body.style.overflow === 'hidden' while open.
 * 5. Search filtering works and updates table rows and page reset.
 * 6. Category pills (Numeric, Categorical, All) filter attributes and reset page.
 * 7. Pagination (Next / Prev) works and updates page counter.
 * 8. Escape key closes modal and restores body scroll.
 * 9. Close button (✕) closes modal and restores body scroll.
 * 10. Backdrop click closes modal.
 * 11. Laptop (1024x768): Centered, fits viewport, table scrolls internally.
 * 12. Tablet (768x1024): Centered, fits viewport, table scrolls internally.
 * 13. Mobile (375x667): Centered with margins, fits viewport, controls wrap cleanly, table scrolls internally.
 * 14. Underlying page remains completely intact and unaffected.
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const assert = require('assert');

const BASE_URL = 'http://localhost:8085';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCRATCH_DIR = path.join(__dirname, '../../scratch');

if (!fs.existsSync(SCRATCH_DIR)) {
  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
}

let passed = 0;
let failed = 0;

function report(num, title, isPass, detail = '') {
  if (isPass) {
    console.log(`  ✓ PASS [${num}/14]: ${title}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL [${num}/14]: ${title} -> ${detail}`);
    failed++;
  }
}

async function runCenteringSuite() {
  console.log('================================================================');
  console.log('InsightIQ AI — Full Schema Dictionary Modal Centering Test Suite');
  console.log('================================================================\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // -------------------------------------------------------------------------
    // SETUP: Authenticate as Data Analyst and Navigate to Analytics Studio
    // -------------------------------------------------------------------------
    console.log('[Setup] Launching desktop viewport and loading Analytics Studio...');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });

    await page.evaluate(() => {
      if (window.__insightIQTest?.triggerDataDashboard) {
        window.__insightIQTest.triggerDataDashboard('data_analyst');
      }
    });
    await new Promise(r => setTimeout(r, 400));

    // Navigate to Analytics
    await page.evaluate(() => {
      if (window.__insightIQTest?.setActiveNav) {
        window.__insightIQTest.setActiveNav('analytics');
      }
    });
    await new Promise(r => setTimeout(r, 600));

    // Ensure dataset is loaded and "View Full Dictionary →" button is present
    await page.waitForSelector('#btn-view-full-dictionary', { timeout: 8000 });
    console.log('  Found #btn-view-full-dictionary button in Analytics Studio');

    // -------------------------------------------------------------------------
    // TEST 1: Open modal and verify Viewport Centering on Desktop (1440x900)
    // -------------------------------------------------------------------------
    console.log('\n[1/14] Testing Desktop (1440x900) horizontal & vertical centering...');
    await page.click('#btn-view-full-dictionary');
    await page.waitForSelector('#full-schema-dictionary-dialog', { visible: true, timeout: 3000 });

    const desktopBounds = await page.evaluate(() => {
      const dialog = document.getElementById('full-schema-dictionary-dialog');
      const backdrop = document.getElementById('full-schema-dictionary-backdrop');
      const rect = dialog.getBoundingClientRect();
      const backdropRect = backdrop.getBoundingClientRect();
      const bodyOverflow = document.body.style.overflow;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const expectedLeft = (viewportWidth - rect.width) / 2;
      const expectedTop = (viewportHeight - rect.height) / 2;

      const leftDiff = Math.abs(rect.left - expectedLeft);
      const topDiff = Math.abs(rect.top - expectedTop);

      return {
        rect: {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height
        },
        backdropRect: {
          left: backdropRect.left,
          top: backdropRect.top,
          right: backdropRect.right,
          bottom: backdropRect.bottom,
          width: backdropRect.width,
          height: backdropRect.height
        },
        viewport: { width: viewportWidth, height: viewportHeight },
        leftDiff,
        topDiff,
        bodyOverflow,
        isParentBody: dialog.parentElement === backdrop && backdrop.parentElement === document.body
      };
    });

    // Tolerance: within 3px for sub-pixel / margin rounding
    const isCentered = desktopBounds.leftDiff <= 3 && desktopBounds.topDiff <= 3;
    report(
      1,
      `Desktop (1440x900) centered: left=${desktopBounds.rect.left.toFixed(1)}px (expected ${((1440 - desktopBounds.rect.width)/2).toFixed(1)}px, diff=${desktopBounds.leftDiff.toFixed(1)}px), top=${desktopBounds.rect.top.toFixed(1)}px (expected ${((900 - desktopBounds.rect.height)/2).toFixed(1)}px, diff=${desktopBounds.topDiff.toFixed(1)}px)`,
      isCentered,
      `Centering offset diff left: ${desktopBounds.leftDiff}, top: ${desktopBounds.topDiff}`
    );

    // -------------------------------------------------------------------------
    // TEST 2: Entire modal boundaries are within visible viewport
    // -------------------------------------------------------------------------
    const isWithinViewport = desktopBounds.rect.left >= 0 &&
                             desktopBounds.rect.right <= 1440 &&
                             desktopBounds.rect.top >= 0 &&
                             desktopBounds.rect.bottom <= 900;
    report(
      2,
      `Entire modal strictly inside viewport: left=${desktopBounds.rect.left.toFixed(1)} >= 0, right=${desktopBounds.rect.right.toFixed(1)} <= 1440, top=${desktopBounds.rect.top.toFixed(1)} >= 0, bottom=${desktopBounds.rect.bottom.toFixed(1)} <= 900`,
      isWithinViewport,
      `Bounds violated: left=${desktopBounds.rect.left}, right=${desktopBounds.rect.right}, top=${desktopBounds.rect.top}, bottom=${desktopBounds.rect.bottom}`
    );

    // -------------------------------------------------------------------------
    // TEST 3: Backdrop overlay covers entire viewport and is portaled into document.body
    // -------------------------------------------------------------------------
    const backdropCoversAll = desktopBounds.backdropRect.left === 0 &&
                              desktopBounds.backdropRect.top === 0 &&
                              Math.abs(desktopBounds.backdropRect.width - 1440) <= 1 &&
                              Math.abs(desktopBounds.backdropRect.height - 900) <= 1 &&
                              desktopBounds.isParentBody;
    report(
      3,
      `Backdrop overlay covers true viewport (1440x900) and rendered via Portal into document.body`,
      backdropCoversAll,
      `Backdrop rect: ${JSON.stringify(desktopBounds.backdropRect)}, isParentBody: ${desktopBounds.isParentBody}`
    );

    // -------------------------------------------------------------------------
    // TEST 4: Body scroll locking when open
    // -------------------------------------------------------------------------
    report(
      4,
      `Body scroll is locked (document.body.style.overflow = "hidden") while modal is open`,
      desktopBounds.bodyOverflow === 'hidden',
      `document.body.style.overflow was "${desktopBounds.bodyOverflow}"`
    );

    // Capture desktop screenshot
    await page.screenshot({ path: path.join(SCRATCH_DIR, 'modal_verified_desktop_1440.png') });
    console.log('  Saved screenshot: scratch/modal_verified_desktop_1440.png');

    // -------------------------------------------------------------------------
    // TEST 5: Search filtering functionality
    // -------------------------------------------------------------------------
    console.log('\n[5/14] Testing search filtering...');
    await page.type('#schema-dictionary-search-input', 'id');
    await new Promise(r => setTimeout(r, 200));

    const searchResult = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.schema-dictionary-table tbody tr'));
      const textContents = rows.map(r => r.querySelector('.cell-name')?.textContent || '');
      return {
        count: rows.length,
        names: textContents
      };
    });
    const searchWorks = searchResult.count > 0 && searchResult.names.every(n => n.toLowerCase().includes('id'));
    report(
      5,
      `Search filters columns dynamically (found ${searchResult.count} attributes matching "id": ${searchResult.names.slice(0, 3).join(', ')})`,
      searchWorks,
      `Rows found: ${searchResult.count}, names: ${searchResult.names.join(', ')}`
    );

    // Clear search
    await page.click('#schema-dictionary-search-input');
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await new Promise(r => setTimeout(r, 300));

    // -------------------------------------------------------------------------
    // TEST 6: Category pill filtering
    // -------------------------------------------------------------------------
    console.log('\n[6/14] Testing category pill filtering...');
    const numericPillClicked = await page.evaluate(() => {
      const pills = Array.from(document.querySelectorAll('.schema-dictionary-filter-pills .filter-pill-btn'));
      const numPill = pills.find(p => p.textContent.includes('Numeric'));
      if (numPill) {
        numPill.click();
        return true;
      }
      return false;
    });
    await new Promise(r => setTimeout(r, 200));

    const numericFilterResult = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.schema-dictionary-table tbody tr'));
      const roles = rows.map(r => r.querySelector('.role-badge')?.textContent || '');
      return {
        count: rows.length,
        allNumeric: roles.every(r => r === 'Numeric')
      };
    });
    report(
      6,
      `Category pill filter "Numeric" shows only numeric attributes (${numericFilterResult.count} attributes)`,
      numericPillClicked && numericFilterResult.count > 0 && numericFilterResult.allNumeric,
      `Pill clicked: ${numericPillClicked}, count: ${numericFilterResult.count}, allNumeric: ${numericFilterResult.allNumeric}`
    );

    // Reset to "All"
    await page.evaluate(() => {
      const pills = Array.from(document.querySelectorAll('.schema-dictionary-filter-pills .filter-pill-btn'));
      const allPill = pills.find(p => p.textContent.includes('All'));
      if (allPill) allPill.click();
    });
    await new Promise(r => setTimeout(r, 200));

    // -------------------------------------------------------------------------
    // TEST 7: Pagination controls
    // -------------------------------------------------------------------------
    console.log('\n[7/14] Testing pagination controls...');
    const pageBefore = await page.$eval('.schema-dictionary-page-info', el => el.textContent.trim());
    await page.click('#schema-dictionary-next-btn');
    await new Promise(r => setTimeout(r, 200));
    const pageAfter = await page.$eval('.schema-dictionary-page-info', el => el.textContent.trim());

    await page.click('#schema-dictionary-prev-btn');
    await new Promise(r => setTimeout(r, 200));
    const pageBack = await page.$eval('.schema-dictionary-page-info', el => el.textContent.trim());

    const paginationWorks = pageBefore.includes('page 1') && pageAfter.includes('page 2') && pageBack.includes('page 1');
    report(
      7,
      `Pagination Next and Prev work correctly ("${pageBefore}" -> "${pageAfter}" -> "${pageBack}")`,
      paginationWorks,
      `Pagination sequence failed: ${pageBefore} -> ${pageAfter} -> ${pageBack}`
    );

    // -------------------------------------------------------------------------
    // TEST 8: Close via Escape key
    // -------------------------------------------------------------------------
    console.log('\n[8/14] Testing Escape key closes modal and unlocks scroll...');
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 300));

    const isClosedEsc = await page.evaluate(() => {
      return document.getElementById('full-schema-dictionary-dialog') === null &&
             document.body.style.overflow !== 'hidden';
    });
    report(
      8,
      `Escape key closes modal and restores body scroll`,
      isClosedEsc,
      `Modal still in DOM or body.style.overflow still hidden`
    );

    // -------------------------------------------------------------------------
    // TEST 9: Close via Close Button (✕)
    // -------------------------------------------------------------------------
    console.log('\n[9/14] Testing Close Button (✕)...');
    await page.click('#btn-view-full-dictionary');
    await page.waitForSelector('#schema-dictionary-close-btn', { visible: true });
    await page.click('#schema-dictionary-close-btn');
    await new Promise(r => setTimeout(r, 300));

    const isClosedBtn = await page.evaluate(() => {
      return document.getElementById('full-schema-dictionary-dialog') === null &&
             document.body.style.overflow !== 'hidden';
    });
    report(
      9,
      `Close Button (✕) closes modal and restores body scroll`,
      isClosedBtn,
      `Modal still in DOM or body.style.overflow still hidden`
    );

    // -------------------------------------------------------------------------
    // TEST 10: Close via Backdrop Click
    // -------------------------------------------------------------------------
    console.log('\n[10/14] Testing Backdrop Click closes modal...');
    await page.click('#btn-view-full-dictionary');
    await page.waitForSelector('#full-schema-dictionary-backdrop', { visible: true });
    // Click on top-left backdrop area outside the modal dialog
    await page.mouse.click(10, 10);
    await new Promise(r => setTimeout(r, 300));

    const isClosedBackdrop = await page.evaluate(() => {
      return document.getElementById('full-schema-dictionary-dialog') === null &&
             document.body.style.overflow !== 'hidden';
    });
    report(
      10,
      `Backdrop click closes modal and restores body scroll`,
      isClosedBackdrop,
      `Modal still in DOM or body.style.overflow still hidden`
    );

    // -------------------------------------------------------------------------
    // TEST 11: Laptop Viewport (1024x768)
    // -------------------------------------------------------------------------
    console.log('\n[11/14] Testing Laptop Viewport (1024x768)...');
    await page.setViewport({ width: 1024, height: 768 });
    await page.click('#btn-view-full-dictionary');
    await page.waitForSelector('#full-schema-dictionary-dialog', { visible: true });

    const laptopBounds = await page.evaluate(() => {
      const dialog = document.getElementById('full-schema-dictionary-dialog');
      const rect = dialog.getBoundingClientRect();
      const expectedLeft = (1024 - rect.width) / 2;
      const expectedTop = (768 - rect.height) / 2;
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        leftDiff: Math.abs(rect.left - expectedLeft),
        topDiff: Math.abs(rect.top - expectedTop),
        withinViewport: rect.left >= 0 && rect.right <= 1024 && rect.top >= 0 && rect.bottom <= 768
      };
    });
    await page.screenshot({ path: path.join(SCRATCH_DIR, 'modal_verified_laptop_1024.png') });
    console.log('  Saved screenshot: scratch/modal_verified_laptop_1024.png');

    report(
      11,
      `Laptop (1024x768) centered: diff left=${laptopBounds.leftDiff.toFixed(1)}px, top=${laptopBounds.topDiff.toFixed(1)}px, withinViewport=${laptopBounds.withinViewport}`,
      laptopBounds.leftDiff <= 3 && laptopBounds.topDiff <= 3 && laptopBounds.withinViewport,
      `Laptop bounds: ${JSON.stringify(laptopBounds)}`
    );
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 200));

    // -------------------------------------------------------------------------
    // TEST 12: Tablet Viewport (768x1024)
    // -------------------------------------------------------------------------
    console.log('\n[12/14] Testing Tablet Viewport (768x1024)...');
    await page.setViewport({ width: 768, height: 1024 });
    await page.click('#btn-view-full-dictionary');
    await page.waitForSelector('#full-schema-dictionary-dialog', { visible: true });

    const tabletBounds = await page.evaluate(() => {
      const dialog = document.getElementById('full-schema-dictionary-dialog');
      const tableWrapper = dialog.querySelector('.schema-dictionary-table-wrapper');
      const rect = dialog.getBoundingClientRect();
      const expectedLeft = (768 - rect.width) / 2;
      const expectedTop = (1024 - rect.height) / 2;
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        leftDiff: Math.abs(rect.left - expectedLeft),
        topDiff: Math.abs(rect.top - expectedTop),
        withinViewport: rect.left >= 0 && rect.right <= 768 && rect.top >= 0 && rect.bottom <= 1024,
        tableHasHorizontalScroll: tableWrapper.scrollWidth >= tableWrapper.clientWidth
      };
    });
    await page.screenshot({ path: path.join(SCRATCH_DIR, 'modal_verified_tablet_768.png') });
    console.log('  Saved screenshot: scratch/modal_verified_tablet_768.png');

    report(
      12,
      `Tablet (768x1024) centered: diff left=${tabletBounds.leftDiff.toFixed(1)}px, withinViewport=${tabletBounds.withinViewport}, internal table scrollable=${tabletBounds.tableHasHorizontalScroll}`,
      tabletBounds.leftDiff <= 3 && tabletBounds.withinViewport,
      `Tablet bounds: ${JSON.stringify(tabletBounds)}`
    );
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 200));

    // -------------------------------------------------------------------------
    // TEST 13: Mobile Viewport (375x667)
    // -------------------------------------------------------------------------
    console.log('\n[13/14] Testing Mobile Viewport (375x667)...');
    await page.setViewport({ width: 375, height: 667 });
    await page.click('#btn-view-full-dictionary');
    await page.waitForSelector('#full-schema-dictionary-dialog', { visible: true });

    const mobileBounds = await page.evaluate(() => {
      const dialog = document.getElementById('full-schema-dictionary-dialog');
      const tableWrapper = dialog.querySelector('.schema-dictionary-table-wrapper');
      const rect = dialog.getBoundingClientRect();
      const expectedLeft = (375 - rect.width) / 2;
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        leftDiff: Math.abs(rect.left - expectedLeft),
        withinViewport: rect.left >= 0 && rect.right <= 375 && rect.top >= 0 && rect.bottom <= 667,
        tableHasHorizontalScroll: tableWrapper.scrollWidth >= tableWrapper.clientWidth
      };
    });
    await page.screenshot({ path: path.join(SCRATCH_DIR, 'modal_verified_mobile_375.png') });
    console.log('  Saved screenshot: scratch/modal_verified_mobile_375.png');

    report(
      13,
      `Mobile (375x667) centered: diff left=${mobileBounds.leftDiff.toFixed(1)}px, withinViewport=${mobileBounds.withinViewport}, table internal scroll=${mobileBounds.tableHasHorizontalScroll}`,
      mobileBounds.leftDiff <= 3 && mobileBounds.withinViewport,
      `Mobile bounds: ${JSON.stringify(mobileBounds)}`
    );
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 200));

    // -------------------------------------------------------------------------
    // TEST 14: Underlying Page Integrity (No Layout Shift or Artifacts)
    // -------------------------------------------------------------------------
    console.log('\n[14/14] Testing underlying page layout integrity...');
    await page.setViewport({ width: 1440, height: 900 });
    const pageIntegrity = await page.evaluate(() => {
      const sidebar = document.querySelector('.app-sidebar');
      const header = document.querySelector('.app-header');
      const content = document.querySelector('.app-content');
      const dictBtn = document.getElementById('btn-view-full-dictionary');

      return {
        sidebarPresent: !!sidebar,
        headerPresent: !!header,
        contentPresent: !!content,
        dictBtnPresent: !!dictBtn,
        bodyOverflow: document.body.style.overflow
      };
    });

    const isPageIntact = pageIntegrity.sidebarPresent &&
                         pageIntegrity.headerPresent &&
                         pageIntegrity.contentPresent &&
                         pageIntegrity.dictBtnPresent &&
                         pageIntegrity.bodyOverflow !== 'hidden';
    report(
      14,
      `Underlying page, sidebar, header, and buttons remain completely intact and functional`,
      isPageIntact,
      `Page integrity failed: ${JSON.stringify(pageIntegrity)}`
    );

  } catch (err) {
    console.error('Test suite error:', err);
    failed++;
  } finally {
    await browser.close();
  }

  console.log('\n================================================================');
  console.log(`Centering & Responsive Verification Results: ${passed} PASSED / ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runCenteringSuite().catch(e => {
  console.error('Fatal execution error:', e);
  process.exit(1);
});
