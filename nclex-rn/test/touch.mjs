import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import path from 'path';
import { fileURLToPath } from 'url';
const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = 'file://' + path.join(DIR, 'nclex-rn-practice-exam.html');
const browser = await chromium.launch();
const problems = [];

for (const name of ['iPhone 13', 'iPhone SE', 'Pixel 5', 'iPad (gen 7)', 'Galaxy Tab S4']) {
  const d = devices[name];
  if (!d) { console.log('  (no profile for ' + name + ')'); continue; }
  const ctx = await browser.newContext({ ...d });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  let note = '';
  try {
    await page.goto(APP);
    await page.waitForSelector('#btn-start', { timeout: 5000 });

    // TAP, not click - real touch events
    await page.locator('#opt-length').selectOption('mini');
    await page.locator('#btn-start').tap();
    await page.waitForSelector('#screen-exam.is-active', { timeout: 5000 });

    // is the question actually visible and not covered?
    const box = await page.locator('#item-host').boundingBox();
    if (!box || box.height < 40) throw new Error('question area has no height (' + JSON.stringify(box) + ')');
    const covered = await page.evaluate(() => {
      const h = document.getElementById('item-host');
      const r = h.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + 30;
      const top = document.elementFromPoint(x, y);
      return top && !h.contains(top) && top !== h ? (top.id || top.className || top.tagName) : null;
    });
    if (covered) throw new Error('question area covered by: ' + covered);

    // tap through items using touch only
    let n = 0;
    while (await page.locator('#screen-exam.is-active').count()) {
      if (++n > 45) throw new Error('did not terminate');
      const h = page.locator('#item-host');
      const type = await h.locator('.q-type').evaluate(e => e.textContent);
      if (type === 'Multiple choice') await h.locator('.opt .opt-txt').first().tap();
      else if (type === 'Select all that apply') { await h.locator('.opt .opt-txt').first().tap(); }
      else if (type === 'Highlight') await h.locator('.hl-seg:not(.hl-static)').first().tap();
      else if (type === 'Matrix / grid') {
        const rows = await h.locator('table.matrix tbody tr').count();
        for (let i = 0; i < rows; i++) await h.locator('table.matrix tbody tr').nth(i).locator('td.cell').first().tap();
      } else if (type === 'Drop-down cloze') {
        const c = await h.locator('.cloze select').count();
        for (let i = 0; i < c; i++) await h.locator('.cloze select').nth(i).selectOption('0');
      } else if (type === 'Drag and drop') {
        for (let g = 0; g < 25 && await h.locator('.dd-pool .tok').count(); g++) {
          await h.locator('.dd-pool .tok').first().tap();
          await h.locator('.dd-drop').first().tap();
        }
      } else if (type === 'Bow-tie') {
        for (let g = 0; g < 25; g++) {
          const e = h.locator('.bt-slot:not(.filled)');
          if (!await e.count()) break;
          const col = await e.first().evaluate(el => [...el.closest('.bowtie').children].indexOf(el.closest('.bt-col')));
          const t = h.locator('.bt-pool-row').nth(col).locator('.tok').first();
          if (!await t.count()) break;
          await t.tap(); await e.first().tap();
        }
      } else if (type === 'Ordered response') {
        const dn = h.locator('.tok-move button').nth(1);
        if (await dn.count()) await dn.tap();
      }
      if (!await page.locator('#btn-next').isEnabled()) throw new Error('Next stayed disabled on a ' + type + ' item');
      await page.locator('#btn-next').tap();
      if (await page.locator('#modal:not([hidden])').count()) await page.locator('#modal-actions .btn').last().tap();
    }
    await page.waitForSelector('#screen-report.is-active', { timeout: 5000 });
    note = n + ' items ok';
  } catch (e) {
    problems.push(name + ': ' + e.message.split('\n')[0]);
    note = 'FAIL - ' + e.message.split('\n')[0];
  }
  if (errs.length) { problems.push(name + ' errors: ' + errs.join(' | ')); note += ' | ' + errs.join(' | '); }
  console.log(`  ${d.viewport.width}x${d.viewport.height} ${name.padEnd(16)} ${note}`);
  await ctx.close();
}
await browser.close();
console.log('\n' + (problems.length ? problems.length + ' PROBLEM(S)' : 'no problems on touch'));
