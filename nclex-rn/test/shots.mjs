import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import path from 'path';
import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = 'file://' + path.join(HERE, '..', 'index.html');
const OUT = process.argv[2] || '/tmp/shots';
import fs from 'fs'; fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
const page = await ctx.newPage();
await page.goto(APP);
await page.screenshot({ path: OUT + '/1-start.png', fullPage: true });

await page.selectOption('#opt-length', 'mini');
await page.click('#btn-start');
await page.waitForSelector('#screen-exam.is-active');

async function mountType(t) {
  await page.evaluate((t) => {
    const pool = window.NCLEX_BANK.concat(...window.NCLEX_CASES.map(c => c.items));
    const src = pool.filter(q => q.type === t);
    const item = src[0];
    const d = window.Items.prepareItem(item, () => 0.5);
    if (t === 'bowtie') { d.scenario = item.scenario; }
    window.__d = d;
    const r = { value: window.Items.blankResponse(d) };
    window.Items.render(document.getElementById('item-host'), d, r, () => {});
  }, t);
}
await mountType('mc');
await page.screenshot({ path: OUT + '/2-mc.png' });
await mountType('bowtie');
await page.screenshot({ path: OUT + '/3-bowtie.png' });
await mountType('matrix');
await page.screenshot({ path: OUT + '/4-matrix.png' });

// a case study item with the chart
await page.evaluate(() => {
  const k = window.NCLEX_CASES[0];
  const d = window.Items.prepareItem(k.items[0], () => 0.5);
  d.record = k.record; d.scenario = k.scenario; d.scenarioLabel = 'Case study — ' + k.title;
  d.caseTitle = k.title; d.caseIndex = 1; d.caseTotal = 6; d.caseStep = k.items[0].step;
  const b = document.getElementById('case-banner');
  b.hidden = false;
  b.innerHTML = '<b>Case study: ' + k.title + '</b>  —  part 1 of 6  ·  ' + k.items[0].step;
  window.Items.render(document.getElementById('item-host'), d, { value: window.Items.blankResponse(d) }, () => {});
});
await page.screenshot({ path: OUT + '/5-case.png' });

// finish a quick exam to reach the report
await page.goto(APP);
await page.evaluate(() => localStorage.clear());
await page.selectOption('#opt-length', 'mini');
await page.click('#btn-start');
await page.waitForSelector('#screen-exam.is-active');
let n = 0;
while (await page.locator('#screen-exam.is-active').count() && n < 40) {
  const d = await page.evaluate(() => JSON.parse(localStorage.getItem('nclex.cat.session.v1')).current.item);
  const host = page.locator('#item-host');
  const good = Math.random() < 0.7;
  if (d.type === 'mc') await host.locator('.opt input').nth(good ? d.answer : (d.answer + 1) % d.options.length).check();
  else if (d.type === 'sata') for (const k of (good ? d.answer : d.answer.slice(0, 1))) await host.locator('.opt input[type=checkbox]').nth(k).check();
  else if (d.type === 'highlight') for (const k of d.answer) await host.locator('.hl-seg').nth(k).click();
  else if (d.type === 'matrix') for (let i = 0; i < d.answer.length; i++) await host.locator('table.matrix tbody tr').nth(i).locator('td.cell input').nth(good ? d.answer[i] : 0).check();
  else if (d.type === 'cloze') for (let i = 0; i < d.blanks.length; i++) await host.locator('.cloze select').nth(i).selectOption(String(good ? d.blanks[i].answer : 0));
  else if (d.type === 'dragdrop') for (let i = 0; i < d.tokens.length; i++) { await host.locator('.dd-pool .tok', { hasText: d.tokens[i] }).first().click(); await host.locator('.dd-drop').nth(good ? d.answer[i] : 0).click(); }
  else if (d.type === 'bowtie') { for (let g = 0; g < 20; g++) { const e = host.locator('.bt-slot:not(.filled)'); if (!await e.count()) break; const col = await e.first().evaluate(el => [...el.closest('.bowtie').children].indexOf(el.closest('.bt-col'))); const tk = host.locator('.bt-pool-row').nth(col).locator('.tok').first(); if (!await tk.count()) break; await tk.click(); await e.first().click(); } }
  await page.waitForFunction(() => !document.getElementById('btn-next').disabled, null, { timeout: 5000 });
  await page.click('#btn-next'); n++;
  if (await page.locator('#modal:not([hidden])').count()) await page.locator('#modal-actions .btn').last().click();
}
await page.waitForSelector('#screen-report.is-active');
await page.screenshot({ path: OUT + '/6-report.png', fullPage: true });
await page.locator('.btn:has-text("Review every question")').click();
await page.waitForSelector('#screen-review.is-active');
await page.locator('.rf:has-text("Expand all")').click();
await page.screenshot({ path: OUT + '/7-review.png', clip: { x: 0, y: 0, width: 1280, height: 1400 }, fullPage: true });

// mobile
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const mp = await m.newPage();
await mp.goto(APP);
await mp.selectOption('#opt-length', 'mini');
await mp.click('#btn-start');
await mp.waitForSelector('#screen-exam.is-active');
await mp.evaluate(() => {
  const pool = window.NCLEX_BANK.filter(q => q.type === 'sata');
  const d = window.Items.prepareItem(pool[0], () => 0.5);
  window.Items.render(document.getElementById('item-host'), d, { value: window.Items.blankResponse(d) }, () => {});
});
await mp.screenshot({ path: OUT + '/8-mobile.png' });
await browser.close();
console.log('screenshots in ' + OUT);
