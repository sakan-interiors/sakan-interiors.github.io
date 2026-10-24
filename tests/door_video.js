// Records the opening door on iPhone (WebKit) and computer (Chromium), checks it ends cleanly.
// usage: PF=<site dir> PLAYWRIGHT_BROWSERS_PATH=<pwb> node door_video.js <out_dir> [tap_ms]
const { chromium, webkit, devices } = require('playwright');
const U = 'file://' + process.env.PF + '/artifact_test/index.html';
const out = process.argv[2], tap = +process.argv[3] || 0;
let fails = 0, n = 0;
const ok = (c, msg) => { n++; if (!c) fails++; console.log((c ? 'ok   ' : 'FAIL ') + msg); };
async function run(type, name, opts) {
  const b = type === 'webkit' ? await webkit.launch() : await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await b.newContext({ ...opts, recordVideo: { dir: out + '/v-' + name, size: opts.viewport } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(U);
  if (tap) { await p.waitForTimeout(tap); await p.mouse.click(opts.viewport.width / 2, opts.viewport.height / 3); }
  await p.waitForTimeout(5200 - tap);
  const st = await p.evaluate(() => ({ pre: !!document.querySelector('[data-prehome]'), lock: document.documentElement.classList.contains('no-scroll'),
    view: [...document.querySelectorAll('[data-view]')].find(v => !v.hidden)?.getAttribute('data-view') }));
  ok(!st.pre, `${name}: the opening screen is gone after the walk-in`);
  ok(!st.lock, `${name}: the page scrolls again`);
  ok(st.view === 'home', `${name}: front page shown (${st.view})`);
  if (opts.isMobile) await p.evaluate(() => window.scrollTo(0, 600)); else await p.mouse.wheel(0, 600);
  await p.waitForTimeout(400);
  ok(await p.evaluate(() => scrollY > 100), `${name}: scrolling works`);
  ok(errs.length === 0, `${name}: no errors ${errs.join(' | ')}`);
  await ctx.close(); await b.close();
}
(async () => {
  await run('webkit', 'iphone', { ...devices['iPhone 13'], viewport: { width: 390, height: 664 } });
  await run('chromium', 'computer', { viewport: { width: 1440, height: 810 } });
  console.log(`${n - fails}/${n} passed`);
})();
