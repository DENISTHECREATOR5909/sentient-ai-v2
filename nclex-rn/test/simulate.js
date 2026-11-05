/* Headless validation of the adaptive engine and item bank.
   Run with: node test/simulate.js   (from the nclex-rn directory) */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

const ROOT = path.join(__dirname, '..');
const sandbox = { window: {}, console, Math, JSON, Date };
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);
['js/bank/moc.js','js/bank/sic.js','js/bank/hpm.js','js/bank/psi.js','js/bank/bcc.js',
 'js/bank/pha.js','js/bank/rrp.js','js/bank/phy.js','js/bank/ngn.js','js/bank/cases.js',
 'js/irt.js','js/items.js'].forEach(f => {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
});
const W = sandbox.window;
const BANK = W.NCLEX_BANK, CASES = W.NCLEX_CASES, IRT = W.IRT, Items = W.Items;

let failures = 0;
function check(cond, msg) { if (!cond) { failures++; console.log('  FAIL: ' + msg); } }

/* ---------------- 1. structural validation ---------------- */
console.log('\n=== 1. Bank structure ===');
const CATS = ['MOC','SIC','HPM','PSI','BCC','PHA','RRP','PHY'];
const all = BANK.concat(...CASES.map(c => c.items));
const seen = new Set();
all.forEach(q => {
  check(!seen.has(q.id), 'duplicate id ' + q.id); seen.add(q.id);
  check(CATS.includes(q.cat), q.id + ' has unknown category ' + q.cat);
  check(typeof q.b === 'number' && q.b >= -3 && q.b <= 3, q.id + ' difficulty out of range');
  check(!!q.stem && !!q.rationale, q.id + ' missing stem or rationale');
  switch (q.type) {
    case 'mc':
      check(q.options.length >= 3, q.id + ' too few options');
      check(Number.isInteger(q.answer) && q.answer < q.options.length, q.id + ' bad key');
      break;
    case 'sata':
      check(q.options.length >= 4, q.id + ' too few options');
      check(q.answer.length >= 2 && q.answer.length < q.options.length, q.id + ' bad SATA key size');
      check(q.answer.every(a => a < q.options.length), q.id + ' SATA key out of range');
      break;
    case 'ordered':
      check(q.options.length >= 3, q.id + ' too few steps'); break;
    case 'matrix':
      check(q.answer.length === q.rows.length, q.id + ' matrix key length');
      check(q.answer.every(a => a < q.cols.length), q.id + ' matrix key out of range');
      break;
    case 'cloze': {
      const n = (q.text.match(/\{\d+\}/g) || []).length;
      check(n === q.blanks.length, q.id + ' cloze placeholder count');
      q.blanks.forEach((b, i) => check(b.answer < b.options.length, q.id + ' blank ' + i + ' key'));
      break;
    }
    case 'highlight':
      check(q.answer.length >= 1 && q.answer.every(a => a < q.segments.length), q.id + ' highlight key');
      break;
    case 'dragdrop':
      check(q.answer.length === q.tokens.length, q.id + ' dragdrop key length');
      check(q.answer.every(a => a < q.buckets.length), q.id + ' dragdrop key out of range');
      break;
    case 'bowtie':
      check(q.answer.actions.length === q.slots.actions, q.id + ' bowtie action count');
      check(q.answer.params.length === q.slots.params, q.id + ' bowtie param count');
      check(q.answer.condition < q.conditions.length, q.id + ' bowtie condition key');
      break;
    default: check(false, q.id + ' unknown type ' + q.type);
  }
});
console.log(`  ${BANK.length} stand-alone items + ${CASES.length} cases (${all.length - BANK.length} linked) = ${all.length} total`);
const byCat = {}; BANK.forEach(q => byCat[q.cat] = (byCat[q.cat]||0)+1);
console.log('  by category: ' + CATS.map(c => c + '=' + byCat[c]).join(' '));
const byType = {}; all.forEach(q => byType[q.type] = (byType[q.type]||0)+1);
console.log('  by type:     ' + Object.entries(byType).map(([k,v]) => k+'='+v).join(' '));
CATS.forEach(c => check(byCat[c] >= 20, 'category ' + c + ' has only ' + byCat[c] + ' items'));
check(all.length >= 200, 'bank has fewer than 200 items');

/* ---------------- 2. scoring round trip ---------------- */
console.log('\n=== 2. Scoring engine ===');
const rng = () => Math.random();
all.forEach(q => {
  const d = Items.prepareItem(q, rng);
  // perfect response must score 1.0
  let perfect;
  switch (d.type) {
    case 'mc': perfect = d.answer; break;
    case 'sata': case 'highlight': perfect = d.answer.slice(); break;
    case 'ordered': perfect = d.options.map((_, i) => i); break;
    case 'matrix': perfect = d.answer.slice(); break;
    case 'cloze': perfect = d.blanks.map(b => b.answer); break;
    case 'dragdrop': perfect = d.answer.slice(); break;
    case 'bowtie': perfect = { actions: d.answer.actions.slice(), condition: d.answer.condition, params: d.answer.params.slice() }; break;
  }
  check(Items.isComplete(d, perfect), d.id + ' perfect response not judged complete');
  check(Items.score(d, perfect).score === 1, d.id + ' perfect response did not score 1.0');
  check(!!Items.describe(d, perfect, true), d.id + ' describe() returned nothing');
  // a deliberately wrong response must score below 1
  let wrong;
  switch (d.type) {
    case 'mc': wrong = (d.answer + 1) % d.options.length; break;
    case 'sata': wrong = d.options.map((_, i) => i).filter(i => !d.answer.includes(i)).slice(0, 1); break;
    case 'highlight': {
      const sel = (d.selectable || d.segments.map((_, i) => i));
      wrong = sel.filter(i => !d.answer.includes(i)).slice(0, 1); break;
    }
    case 'ordered': wrong = d.options.map((_, i) => i).reverse(); break;
    case 'matrix': wrong = d.answer.map((a, i) => (a + 1) % d.cols.length); break;
    case 'cloze': wrong = d.blanks.map(b => (b.answer + 1) % b.options.length); break;
    case 'dragdrop': wrong = d.answer.map(a => (a + 1) % d.buckets.length); break;
    case 'bowtie': wrong = { actions: d.answer.actions.slice(), condition: (d.answer.condition + 1) % d.conditions.length, params: d.answer.params.slice() }; break;
  }
  if (wrong && (!Array.isArray(wrong) || wrong.length)) {
    check(Items.score(d, wrong).score < 1, d.id + ' wrong response still scored 1.0');
  }
});
console.log('  every item: perfect response scores 1.0, wrong response scores < 1.0');

/* ---------------- 3. adaptive simulation ---------------- */
console.log('\n=== 3. Adaptive exam simulation ===');
const BLUEPRINT = { MOC:0.18, SIC:0.13, HPM:0.09, PSI:0.09, BCC:0.09, PHA:0.16, RRP:0.12, PHY:0.14 };

function simulate(trueTheta) {
  const eng = new IRT.CatEngine({ items: BANK, minItems: 75, maxItems: 145, blueprint: BLUEPRINT, rng });
  const delivered = [];
  for (;;) {
    const exhausted = Object.keys(eng.used).length >= BANK.length;
    if (eng.checkStop(false, exhausted)) break;
    const it = eng.selectNext();
    if (!it) { eng.stopReason = 'bank'; break; }
    eng.markUsed(it);
    delivered.push(it);
    // simulate the response under the Rasch model
    const p = IRT.pCorrect(trueTheta, it.b);
    eng.record(it, Math.random() < p ? 1 : 0);
  }
  return { n: eng.delivered, est: eng.est.estimate(), decision: eng.decide(), reason: eng.stopReason, eng, delivered };
}

const levels = [
  { name: 'strong  (theta +1.5)', theta:  1.5, expect: true },
  { name: 'passing (theta +0.7)', theta:  0.7, expect: true },
  { name: 'border  (theta  0.0)', theta:  0.0, expect: null },
  { name: 'weak    (theta -0.7)', theta: -0.7, expect: false },
  { name: 'failing (theta -1.5)', theta: -1.5, expect: false }
];
const REPS = 200;
levels.forEach(L => {
  let passes = 0, lens = [], bias = 0, minL = 999, maxL = 0;
  for (let i = 0; i < REPS; i++) {
    const r = simulate(L.theta);
    if (r.decision.pass) passes++;
    lens.push(r.n); bias += r.est.theta - L.theta;
    minL = Math.min(minL, r.n); maxL = Math.max(maxL, r.n);
    check(r.n >= 75 && r.n <= 145, 'exam length ' + r.n + ' outside 75-145');
    check(new Set(r.delivered.map(d => d.id)).size === r.delivered.length, 'an item was delivered twice');
  }
  const mean = lens.reduce((a,b)=>a+b,0)/REPS;
  const rate = passes / REPS;
  console.log(`  ${L.name}: pass ${(rate*100).toFixed(0).padStart(3)}%  ` +
              `length mean ${mean.toFixed(0).padStart(3)} (${minL}-${maxL})  ` +
              `theta bias ${(bias/REPS >= 0 ? '+' : '')}${(bias/REPS).toFixed(2)}`);
  if (L.expect === true)  check(rate > 0.85, L.name + ' should usually pass, got ' + (rate*100).toFixed(0) + '%');
  if (L.expect === false) check(rate < 0.15, L.name + ' should usually fail, got ' + (rate*100).toFixed(0) + '%');
  if (L.expect === null)  check(rate > 0.25 && rate < 0.75, L.name + ' should be near chance, got ' + (rate*100).toFixed(0) + '%');
});

/* ---------------- 4. content balancing ---------------- */
console.log('\n=== 4. Content balancing across 100 exams ===');
const totals = {}; CATS.forEach(c => totals[c] = 0); let grand = 0;
for (let i = 0; i < 100; i++) {
  const r = simulate((Math.random() * 4) - 2);
  r.delivered.forEach(d => { totals[d.cat]++; grand++; });
}
CATS.forEach(c => {
  const pct = totals[c] / grand, target = BLUEPRINT[c];
  const off = Math.abs(pct - target);
  console.log(`  ${c}: delivered ${(pct*100).toFixed(1)}%  target ${(target*100).toFixed(0)}%  (${off < 0.03 ? 'on plan' : 'off by ' + (off*100).toFixed(1) + ' pts'})`);
  check(off < 0.05, c + ' deviates more than 5 points from the blueprint');
});

/* ---------------- 5. stopping-rule behaviour ---------------- */
console.log('\n=== 5. Stopping rules ===');
const reasons = {};
for (let i = 0; i < 300; i++) {
  const r = simulate((Math.random() * 5) - 2.5);
  reasons[r.reason] = (reasons[r.reason] || 0) + 1;
}
Object.entries(reasons).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
check((reasons['confidence-pass']||0) + (reasons['confidence-fail']||0) > 150,
      'the 95% confidence rule should terminate most exams');

/* short/mini configurations still respect their own bounds */
[{min:25,max:60},{min:15,max:30}].forEach(cfg => {
  for (let i = 0; i < 50; i++) {
    const eng = new IRT.CatEngine({ items: BANK, minItems: cfg.min, maxItems: cfg.max, blueprint: BLUEPRINT, rng });
    const t = (Math.random()*4)-2;
    for (;;) {
      if (eng.checkStop(false, Object.keys(eng.used).length >= BANK.length)) break;
      const it = eng.selectNext(); if (!it) break;
      eng.markUsed(it); eng.record(it, Math.random() < IRT.pCorrect(t, it.b) ? 1 : 0);
    }
    check(eng.delivered >= cfg.min && eng.delivered <= cfg.max,
          `length ${eng.delivered} outside ${cfg.min}-${cfg.max}`);
  }
});
console.log('  short (25-60) and quick (15-30) configurations stay within bounds');

/* ---------------- 6. time-expiry rule ---------------- */
console.log('\n=== 6. Run-out-of-time rule ===');
const e1 = new IRT.CatEngine({ items: BANK, minItems: 75, maxItems: 145, blueprint: BLUEPRINT, rng });
for (let i = 0; i < 40; i++) { const it = e1.selectNext(); e1.markUsed(it); e1.record(it, 1); }
check(e1.checkStop(true, false) && e1.decide().pass === false,
      'time expiry before the 75-item minimum must fail');
console.log('  time expiry before the minimum -> automatic fail');
const e2 = new IRT.CatEngine({ items: BANK, minItems: 75, maxItems: 145, blueprint: BLUEPRINT, rng });
for (let i = 0; i < 80; i++) { const it = e2.selectNext(); e2.markUsed(it); e2.record(it, Math.random() < IRT.pCorrect(1.2, it.b) ? 1 : 0); }
e2.stopReason = null;
check(e2.checkStop(true, false) && e2.decide().rule === 'run-out-of-time',
      'time expiry after the minimum must use the final ability estimate');
console.log('  time expiry after the minimum -> decided on the final ability estimate');

console.log(failures === 0 ? '\nALL CHECKS PASSED\n' : `\n${failures} CHECK(S) FAILED\n`);
process.exit(failures === 0 ? 0 : 1);
