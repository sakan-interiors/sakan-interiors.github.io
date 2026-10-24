// Photo viewer test on the single-page preview. usage: [WK=1] node viewer_test.js
const { chromium, webkit, devices } = require('playwright');
const U = (process.env.PF ? 'file://' + process.env.PF + '/artifact_test/index.html#project-01' : 'file:///tmp/claude-0/-home-user/08c2b762-ba25-5ee8-a6d2-91f36c2ae41e/scratchpad/portfolio/artifact_test/index.html#project-01') + '';
let fails = 0, n = 0;
const ok = (c, msg) => { n++; if (!c) fails++; console.log((c ? 'ok   ' : 'FAIL ') + msg); };
const state = (p) => p.evaluate(() => {
  const b = document.querySelector('[data-lightbox]'), i = b.querySelector('img'), r = i.getBoundingClientRect();
  return { open: b.classList.contains('is-open'), zoomed: b.classList.contains('is-zoomed'), count: b.querySelector('[data-lightbox-count]').textContent,
           src: (i.currentSrc || i.src).split('/').pop(), w: Math.round(r.width), h: Math.round(r.height), vw: innerWidth, vh: innerHeight };
});

async function run(b, mobile) {
  const dev = mobile ? 'phone' : 'computer';
  const ctx = await b.newContext(mobile ? { ...devices['iPhone 13'] } : { viewport: { width: 1536, height: 824 }, deviceScaleFactor: 1.25 });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(U); await p.waitForTimeout(1200);
  // press the hero photo
  const hero = p.locator('[data-view="project-01"] .p-hero__slide img, [data-view="project-01"] .p-cover img').first();
  const hb = await hero.boundingBox();
  if (mobile) await p.touchscreen.tap(hb.x + hb.width * .4, hb.y + hb.height / 2); else await p.mouse.click(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await p.waitForTimeout(700);
  let s = await state(p);
  ok(s.open, `${dev}: pressing the top photo opens the viewer (${s.count})`);
  ok(s.w <= s.vw && s.h <= s.vh && (s.w > s.vw * .6 || s.h > s.vh * .5), `${dev}: whole photo fits the screen (${s.w}x${s.h} in ${s.vw}x${s.vh})`);
  // zoom in: double-tap on phone, click on computer
  const cx = s.vw / 2, cy = s.vh / 2;
  if (mobile) { await p.touchscreen.tap(cx, cy); await p.waitForTimeout(120); await p.touchscreen.tap(cx, cy); }
  else await p.mouse.click(cx, cy);
  await p.waitForTimeout(2500);
  s = await state(p);
  ok(s.zoomed, `${dev}: ${mobile ? 'double-tap' : 'click'} zooms in`);
  ok(/-3840\.webp$/.test(s.src), `${dev}: zoomed photo uses the 4K file (${s.src})`);
  if (!mobile) {
    await p.mouse.move(cx, cy); await p.mouse.down(); await p.mouse.move(cx - 200, cy - 100, { steps: 6 }); await p.mouse.up();
    const t = await p.evaluate(() => document.querySelector('[data-lightbox] img').style.transform);
    ok(/translate\(-?\d/.test(t) && !/translate\(0px, 0px\)/.test(t), `${dev}: drag pans the zoomed photo (${t})`);
    await p.mouse.click(cx, cy); await p.waitForTimeout(500);
    s = await state(p); ok(!s.zoomed, `${dev}: click again zooms back out`);
    await p.mouse.move(cx + 150, cy); await p.mouse.down(); await p.mouse.move(cx - 150, cy, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(400);
    s = await state(p); ok(s.count.startsWith('2 /'), `${dev}: swipe goes to the next photo (${s.count})`);
  } else {
    await p.touchscreen.tap(cx, cy); await p.waitForTimeout(120); await p.touchscreen.tap(cx, cy); await p.waitForTimeout(600);
    s = await state(p); ok(!s.zoomed, `${dev}: double-tap again zooms back out`);
  }
  await p.locator('[data-lightbox] [data-next]').click(); await p.waitForTimeout(300);
  s = await state(p); ok(/^\d+ \//.test(s.count) && !s.count.startsWith('1 /'), `${dev}: next arrow moves on (${s.count})`);
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  s = await state(p); ok(!s.open, `${dev}: Escape closes the viewer`);
  // gallery and details open it too
  const g = p.locator('[data-view="project-01"] .p-gallery .slide.is-center img, [data-view="project-01"] .p-grid .shot img').first();
  await g.scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
  const gb = await g.boundingBox();
  if (mobile) await p.touchscreen.tap(gb.x + gb.width / 2, gb.y + gb.height / 2); else await p.mouse.click(gb.x + gb.width / 2, gb.y + gb.height / 2);
  await p.waitForTimeout(600); s = await state(p);
  ok(s.open, `${dev}: pressing a gallery photo opens the viewer (${s.count})`);
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  const d = p.locator('[data-view="project-01"] .tone-sand [data-zoom], [data-view="project-01"] .p-grid .shot:last-child [data-zoom]').first();
  await d.scrollIntoViewIfNeeded(); await p.waitForTimeout(400); await d.click(); await p.waitForTimeout(600);
  s = await state(p); ok(s.open, `${dev}: pressing a Details photo opens the viewer (${s.count})`);
  await p.keyboard.press('Escape');
  ok(errs.length === 0, `${dev}: no script errors ${errs.join(' | ')}`);
  await ctx.close();
}

(async () => {
  const b = process.env.WK ? await webkit.launch() : await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  await run(b, false); await run(b, true);
  await b.close();
  console.log(`${n - fails}/${n} passed`); process.exit(fails ? 1 : 0);
})();
