/* Confirms the single-file build runs a complete exam on its own. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import path from 'path';
import { fileURLToPath } from 'url';
const APP = 'file://' + path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'nclex-rn-practice-exam.html');
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('  FAIL: ' + m); } else console.log('  ok: ' + m); };

console.log('\n=== Single-file build ===');
const browser = await chromium.launch();
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
page.on('requestfailed', r => errs.push('request failed: ' + r.url()));
const external = [];
page.on('request', r => { if (!r.url().startsWith('file:')) external.push(r.url()); });

await page.goto(APP);
await page.waitForSelector('#btn-start');
ok(external.length === 0, 'the page makes no network requests at all');
const stats = await page.locator('#bank-stats').innerText();
ok(/297 total/.test(stats), 'full item bank is embedded: ' + stats.split('.')[0]);

await page.selectOption('#opt-length', 'mini');
await page.click('#btn-start');
await page.waitForSelector('#screen-exam.is-active');
let n = 0;
while (await page.locator('#screen-exam.is-active').count()) {
  if (n++ > 60) throw new Error('did not terminate');
  await page.waitForSelector('#item-host .q-type');
  const d = await page.evaluate(() => JSON.parse(localStorage.getItem('nclex.cat.session.v1')).current.item);
  const host = page.locator('#item-host');
  if (d.type === 'mc') await host.locator('.opt input').first().check();
  else if (d.type === 'sata' || d.type === 'highlight') {
    if (d.type === 'sata') await host.locator('.opt input[type=checkbox]').first().check();
    else await host.locator('.hl-seg:not(.hl-static)').first().click();
  } else if (d.type === 'matrix') {
    const rows = await host.locator('table.matrix tbody tr').count();
    for (let i = 0; i < rows; i++) await host.locator('table.matrix tbody tr').nth(i).locator('td.cell input').first().check();
  } else if (d.type === 'cloze') {
    for (let i = 0; i < d.blanks.length; i++) await host.locator('.cloze select').nth(i).selectOption('0');
  } else if (d.type === 'dragdrop') {
    for (let g = 0; g < 20 && await host.locator('.dd-pool .tok').count(); g++) {
      await host.locator('.dd-pool .tok').first().click();
      await host.locator('.dd-drop').first().click();
    }
  } else if (d.type === 'bowtie') {
    for (let g = 0; g < 20; g++) {
      const empty = host.locator('.bt-slot:not(.filled)');
      if (!await empty.count()) break;
      const col = await empty.first().evaluate(el => [...el.closest('.bowtie').children].indexOf(el.closest('.bt-col')));
      const tok = host.locator('.bt-pool-row').nth(col).locator('.tok').first();
      if (!await tok.count()) break;
      await tok.click(); await empty.first().click();
    }
  }
  await page.waitForFunction(() => !document.getElementById('btn-next').disabled, null, { timeout: 5000 });
  await page.click('#btn-next');
  if (await page.locator('#modal:not([hidden])').count()) await page.locator('#modal-actions .btn').last().click();
}
await page.waitForSelector('#screen-report.is-active');
ok(true, `single file delivered a complete ${n}-item exam and produced a score report`);
await page.locator('.btn:has-text("Review every question")').click();
await page.waitForSelector('#screen-review.is-active');
ok(await page.locator('.rev-item').count() === n, 'review mode works in the single-file build');
ok(errs.length === 0, 'no errors or failed requests (' + errs.slice(0, 2).join(' | ') + ')');
await browser.close();
console.log(fails === 0 ? '\nSTANDALONE CHECKS PASSED\n' : `\n${fails} STANDALONE CHECK(S) FAILED\n`);
process.exit(fails ? 1 : 0);
