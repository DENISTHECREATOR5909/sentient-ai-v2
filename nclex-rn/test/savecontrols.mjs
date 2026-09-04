import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import path from 'path';
import { fileURLToPath } from 'url';
const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
import fs from 'fs';
function wrap(file, out) {
  const inner = fs.readFileSync(file, 'utf8');
  const i = inner.indexOf('</style>') + 8;
  fs.writeFileSync(out, `<!doctype html><html><head><meta charset="utf-8">${inner.slice(0, i)}</head><body>${inner.slice(i)}</body></html>`);
}
wrap(path.join(DIR, 'artifact.html'), '/tmp/w-artifact.html');

const b = await chromium.launch();
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('  FAIL: ' + m); } else console.log('  ok: ' + m); };

async function toReport(page, url) {
  await page.goto(url);
  await page.waitForSelector('#btn-start');
  await page.selectOption('#opt-length', 'mini');
  await page.click('#btn-start');
  await page.waitForSelector('#screen-exam.is-active');
  let n = 0;
  while (await page.locator('#screen-exam.is-active').count()) {
    if (++n > 45) throw new Error('no end');
    const d = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('nclex.cat.session.v1')).current.item; } catch (e) { return null; } });
    const h = page.locator('#item-host');
    const t = await h.locator('.q-type').evaluate(e => e.textContent);
    if (t === 'Multiple choice') await h.locator('.opt .opt-txt').first().click();
    else if (t === 'Select all that apply') await h.locator('.opt .opt-txt').first().click();
    else if (t === 'Highlight') await h.locator('.hl-seg:not(.hl-static)').first().click();
    else if (t === 'Matrix / grid') { const r = await h.locator('table.matrix tbody tr').count(); for (let i=0;i<r;i++) await h.locator('table.matrix tbody tr').nth(i).locator('td.cell').first().click(); }
    else if (t === 'Drop-down cloze') { const c = await h.locator('.cloze select').count(); for (let i=0;i<c;i++) await h.locator('.cloze select').nth(i).selectOption('0'); }
    else if (t === 'Drag and drop') { for (let g=0;g<25 && await h.locator('.dd-pool .tok').count();g++){ await h.locator('.dd-pool .tok').first().click(); await h.locator('.dd-drop').first().click(); } }
    else if (t === 'Bow-tie') { for (let g=0;g<25;g++){ const e=h.locator('.bt-slot:not(.filled)'); if(!await e.count())break; const col=await e.first().evaluate(el=>[...el.closest('.bowtie').children].indexOf(el.closest('.bt-col'))); const tk=h.locator('.bt-pool-row').nth(col).locator('.tok').first(); if(!await tk.count())break; await tk.click(); await e.first().click(); } }
    await page.click('#btn-next');
    if (await page.locator('#modal:not([hidden])').count()) await page.locator('#modal-actions .btn').last().click();
  }
  await page.waitForSelector('#screen-report.is-active');
}

console.log('\n=== hosted (artifact) build ===');
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  await toReport(p, 'file:///tmp/w-artifact.html');
  ok(await p.locator('.btn:has-text("Download results")').count() === 0, 'no JSON download button (the viewer blocks downloads)');
  ok(await p.locator('.btn:has-text("Print")').count() === 0, 'no print button');
  ok(await p.locator('.btn:has-text("Review every question")').count() === 1, 'review button still offered');
  ok(await p.locator('.btn:has-text("Start a new exam")').count() === 1, 'new exam button still offered');
  ok(/downloadable single-file version/.test(await p.locator('#report-host').innerText()), 'report explains where saving is available');
  await p.locator('.btn:has-text("Review every question")').click();
  await p.waitForSelector('#screen-review.is-active');
  ok(await p.locator('.rev-item').count() > 0, 'review works on the hosted build');
  await ctx.close();
}

console.log('\n=== downloadable single-file build ===');
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await toReport(p, 'file://' + path.join(DIR, 'nclex-rn-practice-exam.html'));
  ok(await p.locator('.btn:has-text("Download results")').count() === 1, 'JSON download button still present');
  ok(await p.locator('.btn:has-text("Print")').count() === 1, 'print button still present');
  const dl = p.waitForEvent('download', { timeout: 5000 });
  await p.locator('.btn:has-text("Download results")').click();
  const f = await dl;
  ok(/nclex-practice-results\.json/.test(f.suggestedFilename()), 'download actually fires: ' + f.suggestedFilename());
  await ctx.close();
}
await b.close();
console.log(fails ? `\n${fails} FAILED\n` : '\nSAVE-CONTROL CHECKS PASSED\n');
process.exit(fails ? 1 : 0);
