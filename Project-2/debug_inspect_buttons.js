const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 920 });
  await page.goto('http://localhost:8080/', { waitUntil: 'networkidle0' });
  await page.waitForSelector('aside', { timeout: 10000 }).catch(() => null);
  await page.evaluate(() => { const btns = Array.from(document.querySelectorAll('aside button, aside a')); const target = btns.find(b => (b.innerText||b.textContent).includes('Analytics Studio')); if (target) target.click(); });
  await new Promise(r=>setTimeout(r,2000));
  const matches = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.map(b => ({ text: (b.innerText||b.textContent).trim(), visible: !!(b.offsetWidth||b.offsetHeight||b.getClientRects().length) }));
  });
  const inspectButtons = matches.filter(m => m.text.includes('Inspect →'));
  console.log('Total buttons found:', matches.length);
  console.log('Inspect button matches:', inspectButtons.length);
  console.log('First 30 button texts:', matches.slice(0,30).map(m=>m.text));
  await browser.close();
})();
