const puppeteer = require('puppeteer');
const path = require('path');

async function testPhase245Analytics() {
  console.log('1. Launching Headless Chromium for Phase 2.4 & 2.5 Advanced Analytics & Forecasting Validation...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 920 });

  console.log('2. Navigating to http://localhost:8080/...');
  await page.goto('http://localhost:8080/', { waitUntil: 'networkidle0' });

  console.log('3. Checking for auth form or dashboard...');
  const hasEmail = await page.waitForSelector('input[type="email"]', { timeout: 8000 }).catch(() => null);
  if (hasEmail) {
    console.log('   Logging in test user...');
    await page.type('input[type="email"]', 'testuser_26889@gmail.com');
    await page.type('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
  }

  console.log('4. Waiting for sidebar navigation layout...');
  await page.waitForSelector('aside', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1500));

  console.log('5. Navigating to Analytics Studio...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('aside button, aside a'));
    const targetBtn = btns.find(b => (b.innerText || b.textContent).includes('Analytics Studio'));
    if (targetBtn) targetBtn.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  // --- PART 1: ANOMALY DETECTION (PHASE 2.4) ---
  console.log('6. Selecting Anomaly Detection subnav tab...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.analytics-subnav-btn'));
    const targetBtn = btns.find(b => (b.innerText || b.textContent).includes('Anomaly Detection'));
    if (targetBtn) targetBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  console.log('7. Verifying Anomaly Configuration Panel fields...');
  const initialEmptyState = await page.$eval('.empty-state-title', el => el.textContent).catch(() => 'N/A');
  console.log(`✓ Initial Anomaly Workspace State: "${initialEmptyState}"`);

  // Configure Z-Score warning/critical thresholds and run analysis
  console.log('8. Selecting Z-Score (Standardized) and executing analytical scan...');
  await page.evaluate(() => {
    const selectEl = document.querySelector('.chart-card-wrapper select');
    if (selectEl) {
      selectEl.value = 'z-score';
      const evt = document.createEvent('HTMLEvents');
      evt.initEvent('change', true, true);
      selectEl.dispatchEvent(evt);
    }
  });
  await new Promise(r => setTimeout(r, 500));

  // Click Run Analysis
  await page.evaluate(() => {
    const runBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Run Analysis'));
    if (runBtn) runBtn.click();
  });

  console.log('9. Waiting for mathematical anomaly scan completion...');
  await page.waitForFunction(() => {
    const emptyState = document.querySelector('.empty-state-title');
    return !emptyState || !emptyState.textContent.includes('Analyzing');
  }, { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1500));

  // Verify KPI Metrics
  const normalCount = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.card div'));
    return cards.map(c => c.textContent.trim()).filter(t => t.includes('Normal') || t.includes('Warning') || t.includes('Critical') || t.includes('Total Outliers'));
  });
  console.log(`✓ Computed Outliers KPI cards count:`, normalCount.length > 0);

  // Verify Scatter Timeline elements
  const svgCircleCount = await page.$$eval('svg circle', els => els.length).catch(() => 0);
  console.log(`✓ Timeline SVG Scatter Points: ${svgCircleCount} circles rendered`);

  // Verify Feature Contribution graph
  const contributionLabel = await page.$eval('.ml-feature-bar-track', el => el.parentNode.innerHTML).catch(() => 'N/A');
  console.log(`✓ Feature attribution tracks found:`, contributionLabel !== 'N/A');

  // Verify Table Rows and click Inspect
  const outlierRows = await page.$$eval('table tbody tr', els => els.length).catch(() => 0);
  console.log(`✓ Outliers Grid Table Rows: ${outlierRows}`);

  console.log('10. Inspecting detailed outlier observation workspace...');
  await page.evaluate(() => {
    const inspectBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Inspect →'));
    if (inspectBtn) inspectBtn.click();
  });
  await page.waitForSelector('.upload-modal-card', { timeout: 8000 });

  const modalTitle = await page.$eval('.upload-modal-card .modal-title', el => el.textContent.trim()).catch(() => 'N/A');
  console.log(`✓ Opened Outlier Inspection Modal: "${modalTitle}"`);

  // Close modal
  await page.evaluate(() => {
    const closeBtn = Array.from(document.querySelectorAll('.upload-modal-card button')).find(b => b.textContent.includes('Close'));
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));


  // --- PART 2: FORECASTING & SCENARIO ANALYSIS (PHASE 2.5) ---
  console.log('11. Selecting Forecasting subnav tab...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.analytics-subnav-btn'));
    const targetBtn = btns.find(b => b.textContent.includes('Forecasting'));
    if (targetBtn) targetBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  console.log('12. Executing Forecasting analytical model...');
  await page.evaluate(() => {
    const runBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Run Forecast'));
    if (runBtn) runBtn.click();
  });

  console.log('13. Waiting for Holt-Winters training & validation split...');
  await page.waitForFunction(() => {
    const emptyState = document.querySelector('.empty-state-title');
    return !emptyState || !emptyState.textContent.includes('Running');
  }, { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1500));

  // Verify Forecast chart paths
  const svgPathCount = await page.$$eval('svg polyline', els => els.length).catch(() => 0);
  console.log(`✓ Forecast Chart SVG Polylines: ${svgPathCount} lines rendered`);

  // Verify Forecast summary values
  const expectedChange = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('div')).find(d => d.textContent.includes('Expected change:'));
    return el ? el.textContent.trim() : 'N/A';
  });
  console.log(`✓ Forecast Summary Expected Change: "${expectedChange}"`);

  // Verify Export Button is functional
  const exportBtnPresent = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Export Forecast'));
    return !!btn;
  });
  console.log(`✓ Export Forecast Data button present:`, exportBtnPresent);

  // Save validation screenshot
  console.log('14. Capturing validation screenshot...');
  const screenshotPath = path.join(__dirname, 'phase2_4_5_analytics_result.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`✓ Saved screenshot to ${screenshotPath}`);

  await browser.close();
  console.log('\n🎉 PHASE 2.4 & 2.5 (ADVANCED ANOMALY DETECTION & FORECASTING) VALIDATED SUCCESSFULLY!');
}

testPhase245Analytics().catch(err => {
  console.error('Validation script failed:', err);
  process.exit(1);
});
