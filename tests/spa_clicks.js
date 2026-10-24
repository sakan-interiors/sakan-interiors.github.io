// Click test for the single-page preview (artifact_test). usage: node spa_clicks.js
const { chromium, webkit } = require('playwright');
const U = (process.env.PF ? 'file://' + process.env.PF + '/artifact_test/index.html' : 'file:///tmp/claude-0/-home-user/08c2b762-ba25-5ee8-a6d2-91f36c2ae41e/scratchpad/portfolio/artifact_test/index.html') + '';
const view = (p) => p.evaluate(() => { const v = [...document.querySelectorAll('[data-view]')].find(v => !v.hidden); return v && v.getAttribute('data-view'); });
let fails = 0, n = 0;
const ok = (c, msg) => { n++; if (!c) fails++; console.log((c ? 'ok   ' : 'FAIL ') + msg); };

async function run(b, mobile) {
  const dev = mobile ? 'phone' : 'computer';
  const ctx = await b.newContext(mobile
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
    : { viewport: { width: 1536, height: 824 }, deviceScaleFactor: 1.25 });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(U); await p.waitForTimeout(800);
  ok(await p.locator('[data-prehome]').isVisible(), `${dev}: opening screen shows`);
  await p.locator('[data-prehome]').click(); await p.waitForTimeout(2600);
  ok(!(await p.locator('[data-prehome]').isVisible()), `${dev}: opening screen leaves on click`);
  ok(await view(p) === 'home', `${dev}: home view`);
  const slider = await p.locator('[data-view="home"] .hero-slider').count();
  if (slider) {
    const c = await p.evaluate(() => { const s = document.querySelector('[data-view="home"] .hero-slider .slide.is-center'); if (!s) return null; const r = s.getBoundingClientRect(); return { x: r.left, w: r.width, t: s.textContent.trim() }; });
    ok(c && Math.abs(c.x + c.w / 2 - (mobile ? 195 : 768)) < 3, `${dev}: slider centre slide is centred (${c && c.t})`);
    await p.locator('[data-view="home"] .hero-slider .slide.is-center').click(); await p.waitForTimeout(700);
    ok((await view(p) || '').startsWith('project-'), `${dev}: centre slide opens its project (${await view(p)})`);
  } else {
    const cv = await p.evaluate(() => { const r = document.querySelector('[data-view="home"] .cover').getBoundingClientRect(); return { w: r.width, b: r.bottom, vw: innerWidth, vh: innerHeight }; });
    ok(cv.w === cv.vw && Math.abs(cv.b - cv.vh) < 2, `${dev}: cover photo fills the first screen (${cv.w}x${cv.b} in ${cv.vw}x${cv.vh})`);
    const card = p.locator('[data-view="home"] .work').nth(2);
    await card.scrollIntoViewIfNeeded(); await card.click(); await p.waitForTimeout(700);
    ok(await view(p) === 'project-03', `${dev}: third project card opens project 03 (${await view(p)})`);
  }
  const rel = p.locator('[data-view]:not([hidden]) .tone-blush a.item, [data-view]:not([hidden]) a.p-next').first();
  const before = await view(p);
  await rel.scrollIntoViewIfNeeded(); await rel.click({ force: true }); await p.waitForTimeout(700);
  ok(await view(p) !== before && (await view(p) || '').startsWith('project-'), `${dev}: the link to another project opens it (${await view(p)})`);
  for (const t of ['projects', 'about', 'contact', 'home']) {
    await p.evaluate(t => { location.hash = t; }, t); await p.waitForTimeout(400);
    ok(await view(p) === t, `${dev}: #${t} shows its view`);
  }
  await p.evaluate(() => { location.hash = 'projects'; }); await p.waitForTimeout(400);
  await p.locator('[data-view="projects"] .pcard, [data-view="projects"] .work').first().click({ force: true }); await p.waitForTimeout(600);
  ok((await view(p) || '').startsWith('project-'), `${dev}: projects card opens a project`);
  await p.goBack(); await p.waitForTimeout(500);
  ok(await view(p) === 'projects', `${dev}: browser back returns to projects`);
  ok(errs.length === 0, `${dev}: no script errors ${errs.join(' | ')}`);
  await ctx.close();
}

(async () => {
  const b = process.env.WK ? await webkit.launch() : await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  await run(b, false); await run(b, true);
  await b.close();
  console.log(`${n - fails}/${n} passed`); process.exit(fails ? 1 : 0);
})();
