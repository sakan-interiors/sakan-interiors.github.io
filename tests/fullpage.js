// Full-page screenshots of views (reveals off via reduced motion). usage: node fullpage.js <out> <prefix> [wk]
const { chromium, webkit, devices } = require('playwright');
const U = (process.env.PF ? 'file://' + process.env.PF + '/artifact_test/index.html' : 'file:///tmp/claude-0/-home-user/08c2b762-ba25-5ee8-a6d2-91f36c2ae41e/scratchpad/portfolio/artifact_test/index.html') + '';
const [out, pre, eng] = process.argv.slice(2);
(async () => {
  const B = eng === 'wk' ? webkit : chromium;
  const b = eng === 'wk' ? await B.launch() : await B.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  for (const [dev, opts] of [['ph', { ...devices['iPhone 13'], reducedMotion: 'reduce' }], ['dk', { viewport: { width: 1536, height: 824 }, deviceScaleFactor: 1, reducedMotion: 'reduce' }]]) {
    if (eng === 'wk' && dev === 'dk') opts.isMobile = undefined;
    const ctx = await b.newContext(opts); const p = await ctx.newPage();
    await p.goto(U); await p.waitForTimeout(1800);
    await p.screenshot({ path: `${out}/${pre}-${dev}-open.png` });
    for (const v of (process.env.VIEWS || 'home,about,project-02').split(',')) {
      await p.goto('about:blank'); await p.goto(U + '#' + v); await p.waitForTimeout(1500);
      await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise(r => setTimeout(r, 160)); } scrollTo(0, 0); });
      await p.waitForTimeout(1200);
      await p.screenshot({ path: `${out}/${pre}-${dev}-${v}.png`, fullPage: true });
    }
    await ctx.close();
  }
  await b.close();
})();
