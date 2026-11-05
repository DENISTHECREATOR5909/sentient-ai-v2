import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import path from 'path';
import { fileURLToPath } from 'url';
const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = 'file://' + path.join(DIR, 'nclex-rn-practice-exam.html');
const b = await chromium.launch();
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('  FAIL: ' + m); } else console.log('  ok: ' + m); };

// scripting disabled, exactly like a file-manager preview
const noJs = await b.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
const p1 = await noJs.newPage();
await p1.goto(APP);
ok(await p1.locator('.js-warning').isVisible(), 'with scripts off, the warning banner is shown');
const txt = await p1.locator('.js-warning').innerText();
ok(/Open in Safari/.test(txt), 'banner tells an iPhone user how to open it properly');
ok(await p1.locator('#btn-start').isVisible(), 'the start screen still renders underneath');
await noJs.close();

// scripting on: banner must never appear
const yesJs = await b.newContext({ viewport: { width: 390, height: 844 } });
const p2 = await yesJs.newPage();
const seen = [];
await p2.goto(APP);
await p2.waitForSelector('#btn-start');
ok(!(await p2.locator('.js-warning').isVisible()), 'with scripts on, the banner is hidden');
ok(await p2.evaluate(() => document.documentElement.getAttribute('data-js')) === 'ready',
   'the app marks itself booted');
await p2.waitForTimeout(4300);
ok(!(await p2.locator('.js-warning').isVisible()), 'banner stays hidden after the watchdog window');
await yesJs.close();
await b.close();
console.log(fails ? `\n${fails} FAILED\n` : '\nNO-SCRIPT CHECKS PASSED\n');
process.exit(fails ? 1 : 0);
