/* Verifies the service worker caches the whole app and that it runs with
   the network switched off. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.webmanifest':'application/manifest+json' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; return res.end('not found'); }
  res.setHeader('Content-Type', MIME[path.extname(f)] || 'application/octet-stream');
  res.end(fs.readFileSync(f));
});
await new Promise(r => server.listen(0, r));
const PORT = server.address().port;
const URL_ = `http://127.0.0.1:${PORT}/index.html`;

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('  FAIL: ' + m); } else console.log('  ok: ' + m); };

console.log('\n=== Offline support ===');
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

await page.goto(URL_);
await page.waitForFunction(() => navigator.serviceWorker.controller !== null || navigator.serviceWorker.ready, null, { timeout: 10000 });
const reg = await page.evaluate(async () => {
  const r = await navigator.serviceWorker.ready;
  return !!r.active;
});
ok(reg, 'service worker registers and activates');

const cached = await page.evaluate(async () => {
  const names = await caches.keys();
  const c = await caches.open(names[0]);
  return (await c.keys()).map(r => new URL(r.url).pathname);
});
ok(cached.length >= 13, `service worker precached ${cached.length} files`);
ok(cached.some(p => p.endsWith('/js/bank/cases.js')), 'case study bank is cached');
ok(cached.some(p => p.endsWith('/js/bank/ngn.js')), 'NGN item bank is cached');
ok(cached.some(p => p.endsWith('/css/styles.css')), 'stylesheet is cached');

// now cut the network entirely and reload
await ctx.setOffline(true);
await page.reload();
await page.waitForSelector('#btn-start', { timeout: 10000 });
const stats = await page.locator('#bank-stats').innerText();
ok(/\d+ stand-alone items/.test(stats), 'app boots with the network off: ' + stats.split('.')[0]);

await page.selectOption('#opt-length', 'mini');
await page.click('#btn-start');
await page.waitForSelector('#screen-exam.is-active');
await page.waitForSelector('#item-host .opt, #item-host .matrix, #item-host .cloze, #item-host .hl-text, #item-host .dd-pool, #item-host .bowtie, #item-host .order-list');
ok(true, 'an exam can be started and an item rendered while offline');

await browser.close();
server.close();
console.log(fails === 0 ? '\nOFFLINE CHECKS PASSED\n' : `\n${fails} OFFLINE CHECK(S) FAILED\n`);
process.exit(fails ? 1 : 0);
