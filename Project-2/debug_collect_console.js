const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const out = [];
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.setViewport({ width: 1400, height: 900 });

  page.on('console', msg => {
    try {
      out.push(`[console:${msg.type()}] ${msg.text()}`);
    } catch (e) {}
  });
  page.on('pageerror', err => {
    out.push(`[pageerror] ${err.message}`);
  });
  page.on('requestfailed', req => {
    out.push(`[requestfailed] ${req.url()} ${req.failure().errorText}`);
  });

  try {
    await page.goto('http://localhost:8080/', { waitUntil: 'networkidle2', timeout: 30000 });
  } catch (err) {
    out.push(`[goto-error] ${err.message}`);
  }

  // Wait a bit for scripts to run
  await new Promise(r => setTimeout(r, 3000));

  const html = await page.content().catch(() => '');
  fs.writeFileSync('collected_page.html', html);
  await page.screenshot({ path: 'collected_page_screenshot.png', fullPage: true });

  fs.writeFileSync('collected_console.log', out.join('\n'));
  console.log('WROTE: collected_console.log and collected_page.html and collected_page_screenshot.png');
  await browser.close();
})();
