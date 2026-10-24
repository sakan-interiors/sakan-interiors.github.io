// Real screenshots during the door opening (not video). usage: PF=<site> node door_shots.js <out_dir>
const { webkit, chromium, devices } = require('playwright');
const U = 'file://' + process.env.PF + '/artifact_test/index.html';
(async () => {
  const out = process.argv[2];
  for (const [name, type, opts] of [['ip', 'webkit', devices['iPhone 13']], ['pc', 'chromium', { viewport: { width: 1440, height: 810 } }]]) {
    const b = type === 'webkit' ? await webkit.launch() : await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
    const p = await (await b.newContext(opts)).newPage();
    await p.goto(U);
    await p.waitForFunction(() => document.querySelector('.prehome.is-open'), null, { timeout: 8000, polling: 16 });
    const t0 = Date.now();
    for (let i = 0; i < 12; i++) {
      if (!(await p.evaluate(() => !!document.querySelector('[data-prehome]')))) break;
      await p.screenshot({ path: `${out}/${name}-${String(i).padStart(2, '0')}.png` });
      console.log(name, i, Date.now() - t0, 'ms');
    }
    await b.close();
  }
})();
