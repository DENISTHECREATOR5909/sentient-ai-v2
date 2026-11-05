/* Renders one item of every type in a real browser, builds the correct
   answer through the UI, and verifies it scores 1.0. Also checks that a
   deliberately wrong interaction scores below 1.0. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = 'file://' + path.join(HERE, '..', 'index.html');

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('  FAIL: ' + m); } else console.log('  ok: ' + m); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto(APP);
await page.waitForFunction(() => window.Items && window.NCLEX_BANK);

async function mount(type) {
  return await page.evaluate((t) => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('is-active'));
    document.getElementById('screen-exam').classList.add('is-active');
    const pool = window.NCLEX_BANK.concat(...window.NCLEX_CASES.map(c => c.items));
    const src = pool.filter(q => q.type === t);
    const item = src[Math.floor(Math.random() * src.length)];
    const d = window.Items.prepareItem(item, Math.random);
    window.__d = d;
    window.__r = { value: window.Items.blankResponse(d) };
    window.__complete = false;
    window.Items.render(document.getElementById('item-host'), d, window.__r,
      () => { window.__complete = window.Items.isComplete(d, window.__r.value); });
    return { id: d.srcId, type: d.type };
  }, type);
}
const score = () => page.evaluate(() => window.Items.score(window.__d, window.__r.value).score);
const complete = () => page.evaluate(() => window.Items.isComplete(window.__d, window.__r.value));
const host = page.locator('#item-host');

console.log('\n=== Renderer round trip: build the correct answer through the UI ===');

/* -- multiple choice -- */
{
  const m = await mount('mc');
  const key = await page.evaluate(() => window.__d.answer);
  await host.locator('.opt input[type=radio]').nth(key).check();
  ok(await score() === 1, `multiple choice (${m.id}) scores 1.0 when the key is selected`);
  ok(await page.locator('.opt.is-picked').count() === 1, 'the selected option is visually marked');
}

/* -- select all that apply -- */
{
  const m = await mount('sata');
  const key = await page.evaluate(() => window.__d.answer);
  for (const k of key) await host.locator('.opt input[type=checkbox]').nth(k).check();
  ok(await score() === 1, `SATA (${m.id}) scores 1.0 for the exact key`);
  const distractor = await page.evaluate(() =>
    window.__d.options.map((_, i) => i).find(i => !window.__d.answer.includes(i)));
  await host.locator('.opt input[type=checkbox]').nth(distractor).check();
  const partial = await score();
  ok(partial < 1 && partial > 0, `SATA partial credit applied after adding a distractor (${partial.toFixed(2)})`);
}

/* -- ordered response -- */
{
  const m = await mount('ordered');
  // repeatedly move whichever token belongs at the top into position
  const n = await page.evaluate(() => window.__d.options.length);
  for (let target = 0; target < n; target++) {
    for (let guard = 0; guard < n * 2; guard++) {
      const pos = await page.evaluate(t => window.__r.value.indexOf(t), target);
      if (pos === target) break;
      await host.locator('.tok').nth(pos).locator('.tok-move button').first().click();
    }
  }
  ok(await score() === 1, `ordered response (${m.id}) scores 1.0 once sequenced with the arrow controls`);
  const nums = await host.locator('.tok-num').allInnerTexts();
  ok(nums.join(',') === Array.from({ length: n }, (_, i) => i + 1).join(','), 'step numbers renumber as items move');
}

/* -- ordered response via native drag -- */
{
  await mount('ordered');
  const before = await page.evaluate(() => window.__r.value.slice());
  await host.locator('.tok').nth(0).dragTo(host.locator('.order-list li').nth(2));
  const after = await page.evaluate(() => window.__r.value.slice());
  ok(JSON.stringify(before) !== JSON.stringify(after), 'dragging a step reorders the list');
}

/* -- drag and drop -- */
{
  const m = await mount('dragdrop');
  const key = await page.evaluate(() => ({ tokens: window.__d.tokens, answer: window.__d.answer }));
  for (let i = 0; i < key.tokens.length; i++) {
    await host.locator('.dd-pool .tok', { hasText: key.tokens[i] }).first().click();
    await host.locator('.dd-drop').nth(key.answer[i]).click();
  }
  ok(await complete(), `drag and drop (${m.id}) is complete once every token is placed`);
  ok(await score() === 1, 'drag and drop scores 1.0 for the correct grouping');
  ok(await host.locator('.dd-pool .tok').count() === 0, 'the response pool empties as tokens are placed');
}

/* -- drag and drop via native drag -- */
{
  await mount('dragdrop');
  await host.locator('.dd-pool .tok').first().dragTo(host.locator('.dd-drop').first());
  const placed = await page.evaluate(() => window.__r.value.filter(v => v !== null).length);
  ok(placed === 1, 'a token can also be moved with a real mouse drag');
}

/* -- bow-tie -- */
{
  const m = await mount('bowtie');
  const k = await page.evaluate(() => ({
    actions: window.__d.answer.actions.map(i => window.__d.actions[i]),
    condition: window.__d.conditions[window.__d.answer.condition],
    params: window.__d.answer.params.map(i => window.__d.params[i])
  }));
  const place = async (poolIdx, text, colIdx) => {
    await host.locator('.bt-pool-row').nth(poolIdx).locator('.tok', { hasText: text }).first().click();
    await host.locator('.bowtie > .bt-col').nth(colIdx).locator('.bt-slot:not(.filled)').first().click();
  };
  for (const a of k.actions) await place(0, a, 0);
  await place(1, k.condition, 1);
  for (const p of k.params) await place(2, p, 2);
  ok(await complete(), `bow-tie (${m.id}) is complete once all five boxes are filled`);
  ok(await score() === 1, 'bow-tie scores 1.0 for the correct diagram');
  ok(await host.locator('.bt-slot.filled').count() === 5, 'all five bow-tie boxes show their selection');
}

/* -- bow-tie partial answer is not accepted -- */
{
  await mount('bowtie');
  await host.locator('.bt-pool-row').nth(1).locator('.tok').first().click();
  await host.locator('.bowtie > .bt-col').nth(1).locator('.bt-slot').first().click();
  ok(await complete() === false, 'bow-tie with only the condition chosen is not accepted as complete');
}

/* -- matrix -- */
{
  const m = await mount('matrix');
  const key = await page.evaluate(() => window.__d.answer);
  for (let r = 0; r < key.length; r++) {
    await host.locator('table.matrix tbody tr').nth(r).locator('td.cell input').nth(key[r]).check();
  }
  ok(await score() === 1, `matrix (${m.id}) scores 1.0 when every row matches the key`);
  await host.locator('table.matrix tbody tr').first()
    .locator('td.cell input').nth((key[0] + 1) % (await page.evaluate(() => window.__d.cols.length))).check();
  const p = await score();
  ok(p < 1, `matrix gives partial credit per row (${p.toFixed(2)}) when one row is wrong`);
}

/* -- cloze -- */
{
  const m = await mount('cloze');
  const key = await page.evaluate(() => window.__d.blanks.map(b => b.answer));
  for (let i = 0; i < key.length; i++) {
    await host.locator('.cloze select').nth(i).selectOption(String(key[i]));
  }
  ok(await score() === 1, `cloze (${m.id}) scores 1.0 when every drop-down matches the key`);
  ok(await host.locator('.cloze select.empty').count() === 0, 'answered drop-downs lose the empty styling');
}

/* -- highlight -- */
{
  const m = await mount('highlight');
  const key = await page.evaluate(() => window.__d.answer);
  for (const k of key) await host.locator('.hl-seg').nth(k).click();
  ok(await score() === 1, `highlight (${m.id}) scores 1.0 for the exact set of findings`);
  ok(await host.locator('.hl-seg.is-on').count() === key.length, 'highlighted phrases are visually marked');
  await host.locator('.hl-seg').nth(key[0]).click();
  ok(await host.locator('.hl-seg.is-on').count() === key.length - 1, 'tapping a highlight again removes it');
}

/* -- charts / tabbed medical record -- */
{
  await page.evaluate(() => {
    const k = window.NCLEX_CASES[0];
    const d = window.Items.prepareItem(k.items[0], Math.random);
    d.record = k.record; d.scenario = k.scenario;
    window.__d = d; window.__r = { value: window.Items.blankResponse(d) };
    window.Items.render(document.getElementById('item-host'), d, window.__r, () => {});
  });
  const tabs = await host.locator('.record-tab').count();
  ok(tabs >= 3, `case study medical record renders ${tabs} chart tabs`);
  await host.locator('.record-tab').nth(2).click();
  ok(await host.locator('.record-panel.is-active').count() === 1, 'exactly one chart tab panel is visible at a time');
  const active = await host.locator('.record-tab[aria-selected="true"]').innerText();
  ok(!!active, 'the selected chart tab is marked for assistive technology: ' + active);
}

ok(errors.length === 0, 'no JavaScript errors during renderer tests (' + errors.slice(0, 2).join(' | ') + ')');

await browser.close();
console.log(fails === 0 ? '\nALL RENDERER CHECKS PASSED\n' : `\n${fails} RENDERER CHECK(S) FAILED\n`);
process.exit(fails ? 1 : 0);
