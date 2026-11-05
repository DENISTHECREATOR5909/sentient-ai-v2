// Wrap artifact.html the way the artifact host does, then confirm it runs.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import path from 'path';
import { fileURLToPath } from 'url';
const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
import fs from 'fs';
const inner = fs.readFileSync(path.join(DIR, 'artifact.html'), 'utf8');
const wrapped = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>:root{color-scheme:light dark}body{margin:0;font:14px system-ui;background:#faf9f7}img{max-width:100%}[hidden]{display:none!important}</style>
${inner.slice(0, inner.indexOf('</style>') + 8)}</head><body>${inner.slice(inner.indexOf('</style>') + 8)}</body></html>`;
fs.writeFileSync('/tmp/wrapped.html', wrapped);

const b = await chromium.launch();
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('  FAIL: ' + m); } else console.log('  ok: ' + m); };

for (const [label, opts] of [
  ['light host', { colorScheme: 'light', viewport: { width: 1280, height: 900 } }],
  ['dark host',  { colorScheme: 'dark',  viewport: { width: 1280, height: 900 } }],
  ['phone',      { colorScheme: 'dark',  viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }]
]) {
  const ctx = await b.newContext(opts);
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('requestfailed', r => { if (!r.url().startsWith('data:')) errs.push('req ' + r.url()); });
  await p.goto('file:///tmp/wrapped.html');
  await p.waitForSelector('#btn-start', { timeout: 5000 });
  const bg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const ink = await p.evaluate(() => getComputedStyle(document.querySelector('.start-head h1')).color);
  ok(bg === 'rgb(244, 246, 248)', `${label}: body paints its own light ground (${bg})`);
  ok(ink === 'rgb(27, 27, 27)', `${label}: heading keeps its dark ink (${ink})`);
  ok(!(await p.locator('.js-warning').isVisible()), `${label}: app booted, no warning banner`);
  // form controls must not pick up the host's dark UA styling
  await p.locator('#opt-length').selectOption('mini');
  await p.locator('#btn-start').click();
  await p.waitForSelector('#screen-exam.is-active', { timeout: 5000 });
  const sc = await p.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
  ok(sc === 'light', `${label}: color-scheme pinned to light (${sc}) so radios and selects stay legible`);
  ok(errs.length === 0, `${label}: no errors or failed requests (${errs.slice(0,2).join(' | ')})`);
  if (label === 'phone') await p.screenshot({ path: '/tmp/artifact-phone.png' });
  if (label === 'dark host') await p.screenshot({ path: '/tmp/artifact-dark.png' });
  await ctx.close();
}
await b.close();
console.log(fails ? `\n${fails} FAILED\n` : '\nARTIFACT WRAP CHECKS PASSED\n');
process.exit(fails ? 1 : 0);
