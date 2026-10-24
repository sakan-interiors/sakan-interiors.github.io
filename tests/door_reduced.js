// Opening screen with "reduce motion" on: shows the house, then fades to the front page.
const { webkit, devices } = require('playwright');
(async () => {
  const b = await webkit.launch();
  const p = await (await b.newContext({ ...devices['iPhone 13'], reducedMotion: 'reduce' })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.env.PF + '/artifact_test/index.html'); await p.waitForTimeout(900);
  await p.screenshot({ path: process.argv[2] + '/reduced.png' });
  const mid = await p.evaluate(() => ({ pre: !!document.querySelector('[data-prehome]'), dash: [...document.querySelectorAll('.door__dl')].some(l => l.style.strokeDasharray && l.style.strokeDasharray !== 'none') }));
  await p.waitForTimeout(2000);
  const end = await p.evaluate(() => ({ pre: !!document.querySelector('[data-prehome]'), lock: document.documentElement.classList.contains('no-scroll') }));
  console.log('house shown:', mid.pre, '| no line drawing:', !mid.dash, '| gone after:', !end.pre, '| scroll free:', !end.lock, '| errors:', errs.join(' | ') || 'none');
  await b.close();
})();
