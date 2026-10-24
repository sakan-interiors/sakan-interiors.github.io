// Records the opening on a phone-sized screen with Chromium's screencast (clean JPEG frames),
// then writes them out at a steady 30 fps. usage: PF=<site> node door_cast.js <out_dir> [w h]
const { chromium } = require('playwright');
const fs = require('fs');
const out = process.argv[2], W = +process.argv[3] || 390, H = +process.argv[4] || 844;
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: W < 700, hasTouch: W < 700 });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const cdp = await ctx.newCDPSession(p);
  const frames = [];
  cdp.on('Page.screencastFrame', async (f) => { frames.push({ t: f.metadata.timestamp, data: f.data }); try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch (e) {} });
  await p.goto('about:blank');
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W * 2, maxHeight: H * 2, everyNthFrame: 1 });
  await p.goto('file://' + process.env.PF + '/artifact_test/index.html');
  await p.waitForTimeout(7000);
  await cdp.send('Page.stopScreencast');
  await b.close();
  const real = frames.filter(f => f.data.length > 2000);
  const t0 = real[0].t, end = real[real.length - 1].t;
  let k = 0, n = 0;
  for (let t = t0; t <= end; t += 1 / 30) {
    while (k + 1 < real.length && real[k + 1].t <= t) k++;
    fs.writeFileSync(`${out}/${String(n++).padStart(4, '0')}.jpg`, Buffer.from(real[k].data, 'base64'));
  }
  console.log(real.length, 'frames captured,', n, 'written,', (end - t0).toFixed(1), 's; errors:', errs.join(' | ') || 'none');
})();
