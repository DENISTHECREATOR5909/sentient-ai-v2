/* End-to-end UI test: drives a full adaptive exam in a real browser,
   answering every item type, then checks the report and review screens. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = 'file://' + path.join(HERE, '..', 'index.html');

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('  FAIL: ' + m); } else console.log('  ok: ' + m); };

const browser = await chromium.launch();

async function runExam(page, { length, cases, viewport }) {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto(APP);
  await page.waitForSelector('#btn-start');
  await page.selectOption('#opt-length', length);
  await page.selectOption('#opt-time', '18000');
  await page.fill('#opt-name', 'Test Candidate');
  if (!cases) await page.uncheck('#opt-cases');
  await page.click('#btn-start');
  await page.waitForSelector('#screen-exam.is-active');

  const typesSeen = new Set();
  let n = 0;
  while (await page.locator('#screen-exam.is-active').count()) {
    if (n > 200) throw new Error('exam did not terminate');
    await page.waitForSelector('#item-host .q-type');
    const type = await page.locator('#item-host .q-type').evaluate(el => el.textContent);
    typesSeen.add(type);

    // the Next button must be disabled until the item is answered
    if (type !== 'Ordered response') {
      const disabled = await page.locator('#btn-next').isDisabled();
      if (!disabled) throw new Error('Next enabled before answering a ' + type + ' item');
    }
    await answer(page, type);
    await page.waitForFunction(() => !document.getElementById('btn-next').disabled, null, { timeout: 5000 });
    await page.click('#btn-next');
    n++;
    await page.waitForTimeout(5);
    // a modal (optional break) would block progress
    if (await page.locator('#modal:not([hidden])').count()) {
      await page.locator('#modal-actions .btn').last().click();
    }
  }
  return { n, typesSeen, errors };
}

async function answer(page, type) {
  const host = page.locator('#item-host');
  switch (type) {
    case 'Multiple choice':
      await host.locator('.opt input[type=radio]').first().check();
      break;
    case 'Select all that apply': {
      const boxes = host.locator('.opt input[type=checkbox]');
      const c = await boxes.count();
      await boxes.nth(0).check();
      if (c > 2) await boxes.nth(2).check();
      break;
    }
    case 'Ordered response': {
      // exercise the move buttons, then submit whatever order results
      const downs = host.locator('.tok-move button:nth-child(2)');
      if (await downs.count() > 1) await downs.first().click();
      break;
    }
    case 'Drag and drop': {
      // tap a token then tap a bucket, repeatedly, until the pool is empty
      for (let guard = 0; guard < 20; guard++) {
        const pool = host.locator('.dd-pool .tok');
        if (!(await pool.count())) break;
        await pool.first().click();
        await host.locator('.dd-drop').first().click();
      }
      break;
    }
    case 'Bow-tie': {
      for (let guard = 0; guard < 20; guard++) {
        const empty = host.locator('.bt-slot:not(.filled)');
        if (!(await empty.count())) break;
        const slot = empty.first();
        // work out which pool this slot belongs to by column order
        const col = await slot.evaluate(el => {
          const cols = [...el.closest('.bowtie').children];
          return cols.indexOf(el.closest('.bt-col'));
        });
        const rows = host.locator('.bt-pool-row');
        const tok = rows.nth(col).locator('.tok').first();
        if (!(await tok.count())) break;
        await tok.click();
        await slot.click();
      }
      break;
    }
    case 'Matrix / grid': {
      const rows = host.locator('table.matrix tbody tr');
      const rc = await rows.count();
      for (let i = 0; i < rc; i++) await rows.nth(i).locator('td.cell input').first().check();
      break;
    }
    case 'Drop-down cloze': {
      const sels = host.locator('.cloze select');
      const sc = await sels.count();
      for (let i = 0; i < sc; i++) await sels.nth(i).selectOption('0');
      break;
    }
    case 'Highlight':
      await host.locator('.hl-seg:not(.hl-static)').first().click();
      break;
    default:
      throw new Error('unhandled item type: ' + type);
  }
}

/* ---------- 1. full desktop run, all item types ---------- */
console.log('\n=== UI: full adaptive exam (desktop, 1280x900) ===');
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const r = await runExam(page, { length: 'full', cases: true });
  ok(r.errors.length === 0, 'no JavaScript errors (' + r.errors.slice(0, 2).join(' | ') + ')');
  ok(r.n >= 75 && r.n <= 145, `exam delivered ${r.n} items, within 75-145`);
  console.log('  item types encountered: ' + [...r.typesSeen].join(', '));
  ok(r.typesSeen.size >= 6, 'at least six distinct item types were delivered');

  await page.waitForSelector('#screen-report.is-active');
  const verdict = await page.locator('.verdict h1').innerText();
  ok(/PASS|FAIL|No decision/.test(verdict), 'score report shows a verdict: "' + verdict + '"');
  ok(await page.locator('#traj').count() === 1, 'ability trajectory chart rendered');
  const rows = await page.locator('table.breakdown').first().locator('tbody tr').count();
  ok(rows === 8, 'category breakdown lists all 8 client need categories');
  const pills = await page.locator('.pill').count();
  ok(pills > 0, 'categories carry above/near/below ratings');

  // review mode
  await page.locator('.btn:has-text("Review every question")').click();
  await page.waitForSelector('#screen-review.is-active');
  const cards = await page.locator('.rev-item').count();
  ok(cards === r.n, `review mode lists all ${r.n} delivered items`);
  await page.locator('.rev-head').first().click();
  ok(await page.locator('.rev-item.open .rationale').count() > 0, 'rationale is shown when an item is expanded');
  ok(await page.locator('.rev-item.open .ans-box, .rev-item.open .opts').count() > 0, 'answer key is shown');
  await page.locator('.rf:has-text("Missed")').click();
  const missed = await page.locator('.rev-item').count();
  ok(missed <= cards, `"Missed" filter narrows the list (${missed} of ${cards})`);
  await ctx.close();
}

/* ---------- 2. mobile run ---------- */
console.log('\n=== UI: mobile viewport (390x844, touch) ===');
{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2
  });
  const page = await ctx.newPage();
  const r = await runExam(page, { length: 'mini', cases: true });
  ok(r.errors.length === 0, 'no JavaScript errors on mobile (' + r.errors.slice(0, 2).join(' | ') + ')');
  ok(r.n >= 15 && r.n <= 30, `quick-check session delivered ${r.n} items, within 15-30`);
  await page.waitForSelector('#screen-report.is-active');
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(overflow <= 1, 'report page does not scroll horizontally on a 390px viewport (overflow ' + overflow + 'px)');
  await ctx.close();
}

/* ---------- 3. chrome: timer, calculator, HUD, resume ---------- */
console.log('\n=== UI: exam chrome ===');
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(APP);
  await page.selectOption('#opt-length', 'mini');
  await page.click('#btn-start');
  await page.waitForSelector('#screen-exam.is-active');

  const t0 = await page.locator('#v-time').innerText();
  ok(/^0[45]:\d\d:\d\d$/.test(t0), 'timer starts at the 5-hour exam limit (' + t0 + ')');
  await page.waitForTimeout(1600);
  const t1 = await page.locator('#v-time').innerText();
  ok(t1 !== t0, 'timer counts down (' + t0 + ' -> ' + t1 + ')');

  ok(await page.locator('#hud').isVisible(), 'live ability panel is visible');
  const theta0 = await page.locator('#hud-theta').innerText();
  ok(/^-?\d\.\d\d$/.test(theta0), 'ability estimate is displayed in logits (' + theta0 + ')');

  await page.click('#btn-calc');
  ok(await page.locator('#calc').isVisible(), 'on-screen calculator opens');
  for (const k of ['7', '×', '8', '=']) await page.locator('#calc-pad button', { hasText: new RegExp('^' + k.replace('×', '×') + '$') }).click();
  ok(await page.locator('#calc-display').innerText() === '56', 'calculator computes 7 x 8 = 56');
  await page.click('#calc-close');

  // answer one item, then reload and resume
  const type = await page.locator('#item-host .q-type').evaluate(el => el.textContent);
  await answer(page, type);
  await page.click('#btn-next');
  await page.waitForTimeout(50);
  const itemNo = await page.locator('#v-item').innerText();
  await page.reload();
  await page.waitForSelector('#resume-box:not([hidden])');
  ok(true, 'an interrupted exam is offered for resume after a reload');
  await page.click('#btn-resume');
  await page.waitForSelector('#screen-exam.is-active');
  ok(await page.locator('#v-item').innerText() === itemNo, 'resume returns to item ' + itemNo);

  await page.click('#btn-quit');
  await page.locator('#modal-actions .btn-danger').click();
  await page.waitForSelector('#screen-report.is-active');
  ok(/No decision/.test(await page.locator('.verdict h1').innerText()),
     'ending early yields no pass/fail prediction');
  await ctx.close();
}


/* ---------- 4. a competent candidate answers correctly and passes ---------- */
console.log('\n=== UI: competent candidate answers from the scoring key ===');
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(APP);
  await page.selectOption('#opt-length', 'full');
  await page.click('#btn-start');
  await page.waitForSelector('#screen-exam.is-active');

  let n = 0;
  while (await page.locator('#screen-exam.is-active').count()) {
    if (n > 200) throw new Error('exam did not terminate');
    await page.waitForSelector('#item-host .q-type');
    // The app persists the item in flight, so the test can read its key from
    // localStorage instead of the application exposing test hooks.
    const d = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('nclex.cat.session.v1')).current.item);
    await answerCorrectly(page, d);
    await page.waitForFunction(() => !document.getElementById('btn-next').disabled, null, { timeout: 5000 });
    await page.click('#btn-next');
    n++;
    if (await page.locator('#modal:not([hidden])').count()) {
      await page.locator('#modal-actions .btn').last().click();
    }
  }
  await page.waitForSelector('#screen-report.is-active');
  const verdict = await page.locator('.verdict h1').innerText();
  const theta = await page.locator('.stat .v').nth(1).innerText();
  ok(errs.length === 0, 'no JavaScript errors (' + errs.slice(0, 2).join(' | ') + ')');
  ok(/PASS/.test(verdict), `answering every item correctly yields "${verdict}" after ${n} items`);
  ok(n === 75, 'a clearly competent candidate stops at the 75-item minimum');
  ok(parseFloat(theta) > 0, 'final ability estimate is above the 0.00 passing standard (' + theta + ')');
  const correct = await page.locator('.stat .v').nth(3).innerText();
  ok(correct.startsWith(String(n)), `all ${n} items scored fully correct (${correct})`);
  await ctx.close();
}

async function answerCorrectly(page, d) {
  const host = page.locator('#item-host');
  switch (d.type) {
    case 'mc':
      await host.locator('.opt input[type=radio]').nth(d.answer).check(); break;
    case 'sata':
      for (const k of d.answer) await host.locator('.opt input[type=checkbox]').nth(k).check();
      break;
    case 'highlight':
      for (const k of d.answer) await host.locator('.hl-seg').nth(k).click();
      break;
    case 'ordered': {
      const nOpt = d.options.length;
      for (let target = 0; target < nOpt; target++) {
        for (let guard = 0; guard < nOpt * 2; guard++) {
          const nums = await host.locator('.tok-txt').allTextContents();
          const pos = nums.indexOf(d.options[target]);
          if (pos === target) break;
          await host.locator('.tok').nth(pos).locator('.tok-move button').first().click();
        }
      }
      break;
    }
    case 'matrix':
      for (let r = 0; r < d.answer.length; r++) {
        await host.locator('table.matrix tbody tr').nth(r).locator('td.cell input').nth(d.answer[r]).check();
      }
      break;
    case 'cloze':
      for (let i = 0; i < d.blanks.length; i++) {
        await host.locator('.cloze select').nth(i).selectOption(String(d.blanks[i].answer));
      }
      break;
    case 'dragdrop':
      for (let i = 0; i < d.tokens.length; i++) {
        await host.locator('.dd-pool .tok', { hasText: d.tokens[i] }).first().click();
        await host.locator('.dd-drop').nth(d.answer[i]).click();
      }
      break;
    case 'bowtie': {
      const place = async (poolIdx, text, colIdx) => {
        await host.locator('.bt-pool-row').nth(poolIdx).locator('.tok', { hasText: text }).first().click();
        await host.locator('.bowtie > .bt-col').nth(colIdx).locator('.bt-slot:not(.filled)').first().click();
      };
      for (const i of d.answer.actions) await place(0, d.actions[i], 0);
      await place(1, d.conditions[d.answer.condition], 1);
      for (const i of d.answer.params) await place(2, d.params[i], 2);
      break;
    }
    default: throw new Error('unhandled type ' + d.type);
  }
}

await browser.close();
console.log(fails === 0 ? '\nALL UI CHECKS PASSED\n' : `\n${fails} UI CHECK(S) FAILED\n`);
process.exit(fails ? 1 : 0);
