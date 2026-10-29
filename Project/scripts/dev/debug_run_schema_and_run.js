const puppeteer = require('puppeteer');

async function clickByText(page, selector, text) {
  return page.evaluate((selector, text) => {
    const nodes = Array.from(document.querySelectorAll(selector || 'button, a'));
    const node = nodes.find(n => (n.innerText || n.textContent || '').trim().includes(text));
    if (node) { node.click(); return true; }
    return false;
  }, selector, text);
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 920 });

  console.log('Opening app...');
  await page.goto('http://localhost:8080/', { waitUntil: 'networkidle2', timeout: 60000 });

  await new Promise(r => setTimeout(r, 2500));

  console.log('Navigating to Analytics Studio...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('aside button, aside a, nav button, nav a, header button, header a'));
    const targetBtn = btns.find(b => (b.innerText || b.textContent || '').includes('Analytics Studio'));
    if (targetBtn) targetBtn.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  // Anomaly tab
  console.log('Clicking Anomaly Detection tab...');
  await clickByText(page, null, 'Anomaly Detection');
  await new Promise(r => setTimeout(r, 1200));

  // If unsupported, click Make dataset compatible
  const madeCompat = await clickByText(page, 'button', 'Make dataset compatible');
  if (madeCompat) {
    console.log('Opened Schema Assist modal...');
    await page.waitForSelector('.upload-modal-card select', { timeout: 8000 });
    // choose first column
    await page.select('.upload-modal-card select', (await page.$$eval('.upload-modal-card select option', opts => opts.map(o => o.value)))[1]);
    // choose numeric
    await page.select('.upload-modal-card select:nth-of-type(2)', 'numeric');
    // click Apply
    await clickByText(page, 'button', 'Apply');
    await new Promise(r => setTimeout(r, 1500));
  }

  // Click Run Analysis
  console.log('Triggering Run Analysis...');
  await clickByText(page, 'button', 'Run Analysis');
  await new Promise(r => setTimeout(r, 4000));

  // Try to open an inspect modal if present
  await clickByText(page, 'button', 'Inspect →');
  await new Promise(r => setTimeout(r, 1000));

  // Forecasting tab
  console.log('Switching to Forecasting tab...');
  await clickByText(page, null, 'Forecasting');
  await new Promise(r => setTimeout(r, 1000));

  const madeCompatF = await clickByText(page, 'button', 'Make dataset compatible');
  if (madeCompatF) {
    console.log('Opened Schema Assist for Forecasting...');
    await page.waitForSelector('.upload-modal-card select', { timeout: 8000 });
    // choose first column
    await page.select('.upload-modal-card select', (await page.$$eval('.upload-modal-card select option', opts => opts.map(o => o.value)))[1]);
    // choose temporal
    await page.select('.upload-modal-card select:nth-of-type(2)', 'temporal');
    await clickByText(page, 'button', 'Apply');
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log('Triggering Run Forecast Analysis...');
  await clickByText(page, 'button', 'Run Forecast Analysis');
  await new Promise(r => setTimeout(r, 5000));

  // Capture screenshot
  await page.screenshot({ path: 'schema_assist_run_result.png', fullPage: true });
  console.log('Saved screenshot schema_assist_run_result.png');

  await browser.close();
  console.log('Done');
})();
