const puppeteer = require('puppeteer');

async function debug() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:8080/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  
  const hasEmail = await page.$('input[type="email"]') !== null;
  const hasAside = await page.$('aside') !== null;
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 300));
  console.log({ hasEmail, hasAside, bodyText });
  await browser.close();
}

debug();
