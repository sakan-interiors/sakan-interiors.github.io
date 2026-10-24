/* Portfolio site behaviour: opening screen, header menus, sliders, hover panels,
   message panel, project filters, galleries and lightbox. No libraries. */
(function () {
  'use strict';
  var html = document.documentElement;
  html.classList.add('js');
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var desktop = window.matchMedia('(min-width: 1024px)');
  var canHover = window.matchMedia('(hover: hover)');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var site = window.SITE || {};
  var spa = !!document.querySelector('[data-spa]');
  // on the single-page preview several pages share one document: only the shown one counts
  var shown = function (el) { return !!el && el.getClientRects().length > 0; };

  /* ---------- Images fade in when loaded ---------- */
  $$('img.fade').forEach(function (img) {
    var done = function () { img.classList.add('is-loaded'); };
    if (img.complete && img.naturalWidth) done();
    else { img.addEventListener('load', done); img.addEventListener('error', done); }
  });

  /* ---------- Reveal on scroll ---------- */
  (function reveal() {
    if (reduced || !('IntersectionObserver' in window)) return;
    var groups = ['.intro .lede', '.quote p', '.quote__link', '.trio__title', '.connect p', '.connect .pills', '.p-info__text', '.p-info__specs',
                  '.contact-grid h1', '.squares .square', '.duo__col', '.trio .item', '.tiles .tile', '.accs .acc', '.fcols',
                  '.intro__line', '.intro__ar', '.philo__art', '.philo__text', '.process__head', '.process__list li', '.places-band__title',
                  '.ccard > *', '.p-grid .shot', '.step__head',
                  '.bhero__name', '.bhero__sub', '.bhero__tag', '.swatches li', '.bhero__photo', '.story > *', '.sec-title', '.step__text', '.step__photo',
                  '.why__item', '.philosophy > *', '.places__list li', '.footer__mark',
                  '.hello__top > *', '.hello__more > *', '.works__head', '.work', '.belief__text > *', '.invite__photo',
                  '.pquote > *'];
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    groups.forEach(function (sel) {
      $$(sel).forEach(function (el) {
        if (el.closest('[data-clone]')) return;
        // items in one row follow each other by 80ms
        var sib = el.parentNode ? $$(':scope > ' + el.tagName.toLowerCase(), el.parentNode).indexOf(el) : 0;
        if (sib > 0 && (/square|item|tile|duo__col|acc/.test(el.className) || el.tagName === 'LI')) el.style.setProperty('--d', Math.min(sib, 4) * 80 + 'ms');
        el.setAttribute('data-reveal', '');
        io.observe(el);
      });
    });
  })();

  /* ---------- SAKAN page: Arabic / English ---------- */
  (function langSwitch() {
    var pages = $$('.sakan[data-lang]');
    if (!pages.length) return;
    function set(lang) {
      pages.forEach(function (pg) {
        pg.setAttribute('data-lang', lang);
        $$('[data-lang-set]', pg).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lang-set') === lang)); });
      });
      try { localStorage.setItem('sakan-lang', lang); } catch (err) { /* private mode: the choice lasts this visit */ }
    }
    var saved = null;
    try { saved = localStorage.getItem('sakan-lang'); } catch (err) { /* no storage */ }
    if (saved === 'en' || saved === 'ar') set(saved);
    $$('[data-lang-set]').forEach(function (b) { b.addEventListener('click', function () { set(b.getAttribute('data-lang-set')); }); });
  })();

  /* ---------- Toast ---------- */
  var toastEl;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2200);
  }

  /* ---------- Opening screen: the house draws itself, its door opens and we walk in ---------- */
  (function prehome() {
    var pre = $('[data-prehome]');
    if (!pre) return;
    if (location.hash.length > 1 || window.scrollY > 0) { pre.remove(); return; }
    html.classList.add('no-scroll');
    var svg = $('svg', pre), lines = $$('.door__dl', svg), grounds = $$('[data-ground]', svg);
    var leaves = $$('[data-leaf]', svg), trims = $$('[data-trim]', svg), light = $('[data-door-light]', svg);
    var mark = $('[data-door-view]'), cover = mark && mark.closest('.cover'), words = $('[data-door-stop]'), rest = null;   // the logo on the front page
    var g = svg.getAttribute('data-door').split(' ').map(Number);
    var CX = g[0], W = g[1], S = g[2], R = g[3], SILL = g[4];
    var HOUSE = svg.getAttribute('data-house').split(' ').map(Number);   // left, roof, right, ground
    var FY = (S - R + SILL) / 2;             // we walk towards the middle of the doorway
    var DIST = 560;                          // how far the eye stands from the door
    var state = 'wait', base = null, t0 = 0;
    var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
    var inOut = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

    // one leaf drawn flat (the left one; the right one is its mirror): outline, panels and handle
    function bez(a, b, c, d, n) {
      var out = [];
      for (var i = 1; i <= n; i++) {
        var t = i / n, u = 1 - t;
        out.push([u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
                  u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]]);
      }
      return out;
    }
    var L = CX - W, M = CX + .4;             // hinge; meeting edge (the leaves overlap a hair, so no light leaks)
    var arc = [[L, S]].concat(bez([L, S], [L, S - .43 * R], [CX - .46 * W, S - .76 * R], [CX, S - R], 16));
    var outline = [[L, SILL]].concat(arc, [[M, S - R], [M, SILL]]);
    var head = [[L + 7, S + 2]];
    arc.forEach(function (p, i) {
      var a = arc[Math.max(i - 1, 0)], b = arc[Math.min(i + 1, arc.length - 1)];
      var tx = b[0] - a[0], ty = b[1] - a[1], l = Math.sqrt(tx * tx + ty * ty);
      var q = [p[0] - ty / l * 7, p[1] + tx / l * 7];
      if (q[0] <= CX - 7) head.push(q);
    });
    head.push([CX - 7, head[head.length - 1][1]], [CX - 7, S + 2]);
    var rect = function (x0, y0, x1, y1) { return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; };
    var trimShapes = [[head, 1], [rect(L + 7, S + 10, CX - 7, S + 72), 1], [rect(L + 7, S + 84, CX - 7, SILL - 10), 1],
                      [[[CX - 5, S + 58], [CX - 5, S + 86]], 0], [[[CX, S - R], [CX, SILL]], 0]];

    // swing a leaf `th` radians inwards about its hinge and see it in perspective
    function leafPath(pts, side, th, closed) {
      var c = Math.cos(th), s = Math.sin(th), d = '';
      for (var i = 0; i < pts.length; i++) {
        var dx = pts[i][0] - L, x = L + dx * c, f = DIST / (DIST + dx * s);
        if (side) x = 2 * CX - x;
        d += (i ? 'L' : 'M') + (CX + (x - CX) * f).toFixed(2) + ' ' + (FY + (pts[i][1] - FY) * f).toFixed(2);
      }
      return d + (closed ? 'Z' : '');
    }
    function drawLeaves(th) {
      var k = Math.sin(th);                  // the leaves darken as they turn from the light
      var col = 'rgb(' + Math.round(81 - 30 * k) + ',' + Math.round(59 - 22 * k) + ',' + Math.round(42 - 16 * k) + ')';
      for (var side = 0; side < 2; side++) {
        leaves[side].setAttribute('d', leafPath(outline, side, th, true));
        leaves[side].style.fill = col;
        trims[side].setAttribute('d', trimShapes.map(function (t) { return leafPath(t[0], side, th, t[1]); }).join(''));
      }
    }

    // the house sits in the middle of the screen, sized to fit; the drawing's view box matches the screen
    function setView(s, x, y) {
      svg.setAttribute('viewBox', x.toFixed(3) + ' ' + y.toFixed(3) + ' ' + (base.vw / s).toFixed(3) + ' ' + (base.vh / s).toFixed(3));
    }
    function layout() {
      var vw = pre.clientWidth || window.innerWidth, vh = pre.clientHeight || window.innerHeight;
      var mid = (HOUSE[1] + HOUSE[3]) / 2, s0 = Math.min(.58 * vh / (HOUSE[3] - HOUSE[1]), .9 * vw / (HOUSE[2] - HOUSE[0]));
      // the name needs room above the roof, and through the open door we should see the front
      // page's first photo, not the words under it: the sill stays above the photo's bottom edge
      var words = $('.door__words', pre), top = words.offsetHeight + Math.min(Math.max(.034 * vh, 18), 34) + .07 * vh;
      var photo = $('[data-door-view]'), stop = $('[data-door-stop]');
      var r = photo && photo.getBoundingClientRect(), low = r && r.height ? (stop ? stop.getBoundingClientRect().top : r.bottom) - 14 : vh * .9;
      var s = Math.max(s0 * .5, Math.min(s0, (low - top) / (SILL - HOUSE[1])));
      var cy = Math.max(top + (mid - HOUSE[1]) * s, Math.min(vh * .55, low - (SILL - mid) * s));
      var x = (HOUSE[0] + HOUSE[2]) / 2 - vw / 2 / s, y = mid - cy / s;
      base = { s: s, x: x, y: y, vw: vw, vh: vh, px: (CX - x) * s, py: (FY - y) * s };
      setView(s, x, y);
      pre.style.setProperty('--roof', ((HOUSE[1] - y) * s).toFixed(1) + 'px');
      pre.style.setProperty('--ground', ((HOUSE[3] - y) * s).toFixed(1) + 'px');
      grounds[0].setAttribute('d', 'M' + CX + ' 500H' + (x - 4).toFixed(1));
      grounds[1].setAttribute('d', 'M' + CX + ' 500H' + (x + vw / s + 4).toFixed(1));
    }

    function start() {
      if (state !== 'wait') return;
      state = 'drawing';
      layout();
      drawLeaves(0);
      if (!reduced) {
        lines.forEach(function (p) {
          var len = p.getTotalLength() + 1;
          p.style.strokeDasharray = len + ' ' + (len + 2);
          p.style.strokeDashoffset = len;
        });
      }
      svg.classList.add('is-ready');
      svg.getBoundingClientRect();
      requestAnimationFrame(function () {
        lines.forEach(function (p) {
          p.style.transition = 'stroke-dashoffset 1.15s cubic-bezier(.77, 0, .175, 1) ' + p.getAttribute('data-d') + 's';
          p.style.strokeDashoffset = '0';
        });
        pre.classList.add('is-on');
      });
      setTimeout(function () { if (state === 'drawing') state = 'ready'; }, 1850);
      setTimeout(go, reduced ? 1600 : 2100);
    }

    function go() {
      if (state === 'drawing' && !reduced) {
        // finish drawing quickly, then open
        state = 'hurry';
        pre.classList.add('is-quick');
        lines.forEach(function (p) { p.style.transition = 'stroke-dashoffset .35s cubic-bezier(.165, .84, .44, 1)'; p.style.strokeDashoffset = '0'; });
        setTimeout(open, 380);
      } else if (state === 'drawing' || state === 'ready') open();
    }

    function open() {
      if (state === 'open' || state === 'done') return;
      state = 'open';
      if (reduced) { pre.classList.add('is-gone'); setTimeout(done, 500); return; }
      lines.forEach(function (p) { p.style.transition = 'none'; p.style.strokeDasharray = 'none'; });
      if (mark) {
        mark.style.transform = '';
        var r = mark.getBoundingClientRect();
        rest = { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
        placeMark(0, 0, base.s);
      }
      // the leaves cover the doorway exactly: cut it open behind them, onto the front page
      var hole = $('[data-hole]', svg).getAttribute('d');
      $$('[data-cut]', svg).forEach(function (p) { p.setAttribute('d', p.getAttribute('d') + hole); });
      pre.classList.add('is-open');
      // walk in until the doorway is well past the edges of the screen
      base.end = Math.max(base.vw / (2 * W), base.vh / (SILL - FY)) * 1.35;
      t0 = performance.now();
      requestAnimationFrame(frame);
    }

    // the logo seen through the doorway: edge-on at first, it turns to face us as the doors open,
    // stays whole inside the doorway as it grows with it, and lands where the front page shows it;
    // the words under it wait until it has landed
    function placeMark(t, walk, s) {
      if (!rest) return;
      var hw = 2 * W * s, hh = (SILL - S + R) * s;          // the doorway on screen; its middle stays at base.px, base.py
      var m = inOut(walk), fit = Math.min(1, .82 * hw / rest.w, .82 * hh / rest.h);
      var turn = 1 - Math.pow(1 - clamp(t / 900), 4);       // ease-out quart
      mark.style.transform = 'translate(' + ((base.px - rest.x) * (1 - m)).toFixed(1) + 'px,' + ((base.py + hh * .04 - rest.y) * (1 - m)).toFixed(1) + 'px)' +
        ' scale(' + fit.toFixed(4) + ') perspective(900px) rotateY(' + (75 * (1 - turn)).toFixed(2) + 'deg)';
      mark.style.opacity = clamp(t / 350).toFixed(3);
      if (words) words.style.opacity = clamp((m - .72) / .28).toFixed(3);
    }

    function frame(now) {
      if (state !== 'open') return;
      var t = now - t0;
      var swing = inOut(clamp(t / 1150));               // the two leaves open
      var walk = clamp((t - 520) / 1250);               // and we walk through
      var k = inOut(walk), s = base.s * Math.pow(base.end / base.s, k);
      drawLeaves(swing * 1.68);
      light.style.opacity = (Math.min(swing * 2.5, 1) * (1 - walk) * .6).toFixed(3);
      setView(s, CX - base.px / s, FY - base.py / s);
      placeMark(t, walk, s);
      pre.style.opacity = walk < .58 ? 1 : (1 - inOut((walk - .58) / .42)).toFixed(3);
      if (t >= 1770) done(); else requestAnimationFrame(frame);
    }

    function done() {
      state = 'done';
      if (rest) { mark.style.transform = ''; mark.style.opacity = ''; if (words) words.style.opacity = ''; cover.classList.add('is-shine'); }
      html.classList.remove('no-scroll');
      pre.remove();
    }

    // start once the fonts are in (or soon anyway), and only while the page is on screen
    function begin() {
      if (document.hidden) { document.addEventListener('visibilitychange', function onShow() { if (!document.hidden) { document.removeEventListener('visibilitychange', onShow); begin(); } }); return; }
      var fonts = document.fonts && document.fonts.ready;
      if (fonts) { fonts.then(start, start); setTimeout(start, 500); } else start();
    }
    begin();
    window.addEventListener('resize', function () { if (state === 'drawing' || state === 'ready') layout(); });
    pre.addEventListener('click', go);
    pre.addEventListener('wheel', function (e) { e.preventDefault(); go(); }, { passive: false });
    var y0 = null;
    pre.addEventListener('touchstart', function (e) { y0 = e.touches[0].clientY; }, { passive: true });
    pre.addEventListener('touchmove', function (e) { if (y0 !== null && y0 - e.touches[0].clientY > 24) go(); }, { passive: true });
    document.addEventListener('keydown', function onKey(e) {
      if (state === 'done') { document.removeEventListener('keydown', onKey); return; }
      if (['Enter', ' ', 'ArrowDown', 'PageDown', 'Escape'].indexOf(e.key) > -1) { e.preventDefault(); go(); }
    });
  })();

  /* ---------- Header: lined after scroll, clear over photos ---------- */
  var header = $('[data-header]');
  var headerUpdate = function () {};
  (function headerState() {
    if (!header) return;
    function update() {
      var y = window.scrollY;
      var clearUntil = $$('[data-header-clear-after]').filter(shown)[0];
      if (!$$('[data-pbar]').some(shown)) header.classList.toggle('is-lined', y > 80 && !clearUntil);
      header.classList.toggle('is-clear', false);
      if (clearUntil) {
        var limit = clearUntil.getBoundingClientRect().bottom + y - header.offsetHeight;
        var foot = $('.site-footer');
        var overFooter = foot && foot.getBoundingClientRect().top <= header.offsetHeight;
        header.classList.toggle('is-clear', y > limit && !overFooter && !html.classList.contains('names-open'));
      }
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
    headerUpdate = update;
  })();

  /* ---------- Mega menu (desktop) ---------- */
  (function mega() {
    var trigger = $('[data-mega-trigger]'), panel = $('[data-mega]');
    if (!trigger || !panel) return;
    var hideT = null;
    function open() {
      if (!desktop.matches) return;
      clearTimeout(hideT);
      panel.classList.add('is-open');
      header.classList.add('is-mega');
      trigger.setAttribute('aria-expanded', 'true');
    }
    function close() {
      hideT = setTimeout(function () {
        panel.classList.remove('is-open');
        header.classList.remove('is-mega');
        trigger.setAttribute('aria-expanded', 'false');
      }, 180);
    }
    trigger.addEventListener('mouseenter', open);
    trigger.addEventListener('focus', open);
    trigger.addEventListener('mouseleave', close);
    panel.addEventListener('mouseenter', function () { clearTimeout(hideT); });
    panel.addEventListener('mouseleave', close);
    panel.addEventListener('focusout', function (e) { if (!panel.contains(e.relatedTarget) && e.relatedTarget !== trigger) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    // category hover filters the project column; project hover swaps the preview
    var preview = $('[data-mega-preview]', panel);
    $$('[data-mega-cat]', panel).forEach(function (btn) {
      btn.addEventListener('mouseenter', function () {
        $$('[data-mega-cat]', panel).forEach(function (b) { b.classList.toggle('is-active', b === btn); });
        var cat = btn.getAttribute('data-mega-cat');
        $$('[data-mega-item]', panel).forEach(function (li) {
          li.hidden = !(cat === 'all' || li.getAttribute('data-type') === cat);
        });
      });
    });
    $$('[data-mega-item] a', panel).forEach(function (a) {
      a.addEventListener('mouseenter', function () {
        if (!preview) return;
        preview.style.opacity = '0';
        var src = a.getAttribute('data-img');
        setTimeout(function () { preview.src = src; preview.style.opacity = '1'; }, 120);
      });
    });
  })();

  /* ---------- Mobile menu ---------- */
  (function mobileMenu() {
    var toggle = $('[data-menu-toggle]'), menu = $('[data-mmenu]');
    if (!toggle || !menu) return;
    function set(open) {
      menu.classList.toggle('is-open', open);
      header.classList.toggle('is-menu', open);
      toggle.setAttribute('aria-expanded', String(open));
      html.classList.toggle('no-scroll', open);
    }
    toggle.addEventListener('click', function () { set(!menu.classList.contains('is-open')); });
    $$('a, [data-panel-open]', menu).forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
    var tabs = $$('[role="tab"]', menu);
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) {
          var on = t === tab;
          t.setAttribute('aria-selected', String(on));
          $('#' + t.getAttribute('aria-controls')).hidden = !on;
        });
      });
    });
  })();

  /* ---------- Back link (phones, inner pages) ---------- */
  var viewSteps = 0;
  $$('[data-back]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (spa) { if (viewSteps > 0) { e.preventDefault(); history.back(); } return; }
      var ref = document.referrer;
      try { if (ref && new URL(ref).origin === location.origin && history.length > 1) { e.preventDefault(); history.back(); } } catch (err) { /* follow the link */ }
    });
  });

  /* ---------- Glide: eased horizontal scroll for slider arrows ---------- */
  // snap is paused while gliding, or it would fight every frame
  function glide(track, left, done) {
    if (reduced) { track.scrollLeft = left; if (done) done(); return; }
    var from = track.scrollLeft, dist = left - from, t0 = null, dur = Math.min(650, 380 + Math.abs(dist) * .15);
    if (track._glide) cancelAnimationFrame(track._glide);
    track.style.scrollSnapType = 'none';
    var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
    function frame(now) {
      if (t0 === null) t0 = now;
      var k = Math.min(1, (now - t0) / dur);
      track.scrollLeft = from + dist * ease(k);
      if (k < 1) track._glide = requestAnimationFrame(frame);
      else { track._glide = null; track.style.scrollSnapType = ''; if (done) done(); }
    }
    track._glide = requestAnimationFrame(frame);
  }

  /* ---------- Centred infinite carousel ---------- */
  function centerCarousel(root) {
    var track = $('[data-track]', root);
    var originals = Array.prototype.slice.call(track.children);
    var n = originals.length;
    if (n < 2) return;
    function clone(el) {
      var c = el.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      c.setAttribute('data-clone', '');
      $$('a, button', c).concat(c.matches('a, button') ? [c] : []).forEach(function (x) { x.tabIndex = -1; });
      $$('img.fade', c).forEach(function (img) { img.classList.add('is-loaded'); });
      return c;
    }
    var before = originals.map(clone), after = originals.map(clone);
    before.forEach(function (c) { track.insertBefore(c, originals[0]); });
    after.forEach(function (c) { track.appendChild(c); });
    var all = function () { return Array.prototype.slice.call(track.children); };
    function centreOf(i) { var s = track.children[i]; return s.offsetLeft + s.offsetWidth / 2 - track.clientWidth / 2; }
    function current() {
      var mid = track.scrollLeft + track.clientWidth / 2, best = 0, bd = Infinity;
      all().forEach(function (s, i) { var d = Math.abs(s.offsetLeft + s.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = i; } });
      return best;
    }
    var target = null;   // slide being glided to, so quick repeated clicks keep counting from it
    function go(i, smooth) {
      i = Math.max(0, Math.min(track.children.length - 1, i));
      if (!smooth) { target = null; track.scrollLeft = centreOf(i); return; }
      target = i;
      glide(track, centreOf(i), function () { target = null; normalise(); });
    }
    function from() { return target !== null ? target : current(); }
    function mark() { var c = current(); all().forEach(function (s, i) { s.classList.toggle('is-center', i === c); }); }
    function normalise() {
      var i = current();
      if (i < n) go(i + n, false); else if (i >= 2 * n) go(i - n, false);
      mark();
    }
    var t = null;
    track.addEventListener('scroll', function () { if (target !== null) return; clearTimeout(t); t = setTimeout(normalise, 140); }, { passive: true });
    var prev = $('[data-prev]', root), next = $('[data-next]', root);
    if (prev) prev.addEventListener('click', function () { go(from() - 1, true); });
    if (next) next.addEventListener('click', function () { go(from() + 1, true); });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(from() - 1, true); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(from() + 1, true); }
    });
    var start = function () { go(n, false); mark(); };
    root._reset = start;
    start();
    window.addEventListener('load', start);
    var rt = null;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { go(current(), false); }, 150); });
    // a drag should not count as a click on the slide
    var downX = 0;
    track.addEventListener('pointerdown', function (e) { downX = e.clientX; });
    track.addEventListener('click', function (e) { if (Math.abs(e.clientX - downX) > 8) { e.preventDefault(); e.stopPropagation(); } }, true);
  }

  /* ---------- Step carousel (three across, one on phones) ---------- */
  function stepCarousel(root) {
    var track = $('[data-track]', root);
    var prev = $('[data-prev]', root), next = $('[data-next]', root);
    function step() {
      var first = track.children[0];
      if (!first) return track.clientWidth;
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return first.getBoundingClientRect().width + gap;
    }
    function atEnd() { return track.scrollLeft + track.clientWidth >= track.scrollWidth - 4; }
    function update() { if (prev) prev.hidden = track.scrollLeft < 4; }
    var stepTo = function (d) { var max = track.scrollWidth - track.clientWidth; glide(track, Math.max(0, Math.min(max, Math.round((track.scrollLeft + d) / step()) * step())), update); };
    if (next) next.addEventListener('click', function () { if (atEnd()) glide(track, 0, update); else stepTo(step()); });
    if (prev) prev.addEventListener('click', function () { stepTo(-step()); });
    track.addEventListener('scroll', update, { passive: true });
    update();
  }
  $$('[data-carousel="center"]').forEach(centerCarousel);
  $$('[data-carousel="step"]').forEach(stepCarousel);

  /* ---------- Duo: hovering one half shows its details on the other half ---------- */
  $$('[data-duo]').forEach(function (duo) {
    var leaveT = null;
    $$('[data-duo-col]', duo).forEach(function (col) {
      col.addEventListener('mouseenter', function () {
        if (!desktop.matches || !canHover.matches) return;
        clearTimeout(leaveT);
        duo.setAttribute('data-active', col.getAttribute('data-duo-col'));
      });
    });
    duo.addEventListener('mouseleave', function () { leaveT = setTimeout(function () { duo.removeAttribute('data-active'); }, 300); });
    duo.addEventListener('mouseenter', function () { clearTimeout(leaveT); });
  });

  /* ---------- Accordions (footer columns, about, contact) ---------- */
  function setAcc(btn, open) {
    btn.setAttribute('aria-expanded', String(open));
    var box = btn.closest('.fcol, .acc');
    if (box) box.classList.toggle('is-open', open);
  }
  $$('[data-acc]').forEach(function (btn) {
    btn.addEventListener('click', function () { setAcc(btn, btn.getAttribute('aria-expanded') !== 'true'); });
  });
  function openAccIn(id) {
    var target = id && document.getElementById(id);
    var head = target && $('[data-acc]', target);
    if (head) setAcc(head, true);
    return target;
  }
  if (location.hash) {
    var hashTarget = openAccIn(location.hash.slice(1));
    if (hashTarget && hashTarget.classList.contains('acc')) setTimeout(function () { window.scrollTo(0, hashTarget.getBoundingClientRect().top + window.scrollY - 90); }, 60);
  }

  /* ---------- Message panel (writes a WhatsApp or email message) ---------- */
  (function messagePanel() {
    var panel = $('[data-panel]'), scrim = $('[data-scrim]');
    if (!panel) return;
    var lastFocus = null;
    function open() {
      lastFocus = document.activeElement;
      panel.classList.add('is-open'); scrim.classList.add('is-open');
      panel.setAttribute('aria-hidden', 'false');
      setTimeout(function () { var f = $('input, select, textarea', panel); if (f) f.focus({ preventScroll: true }); }, 350);
    }
    function close() {
      panel.classList.remove('is-open'); scrim.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    }
    $$('[data-panel-open]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); open(); }); });
    $$('[data-panel-close]').forEach(function (b) { b.addEventListener('click', close); });
    scrim.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('is-open')) close(); });

    var form = $('form', panel);
    var wa = $('[data-send-whatsapp]', panel), mail = $('[data-send-email]', panel);
    function compose() {
      var d = new FormData(form);
      var name = (d.get('name') || '').trim(), phone = (d.get('phone') || '').trim();
      var type = d.get('type') || '', msg = (d.get('message') || '').trim();
      var lines = ['Hello,'];
      if (name) lines.push('My name is ' + name + '.');
      if (type) lines.push('Project: ' + type + '.');
      if (msg) lines.push(msg);
      if (phone) lines.push('Phone: ' + phone);
      return lines.join('\n');
    }
    function refresh() {
      var text = compose();
      wa.href = 'https://wa.me/' + (site.whatsapp || '').replace(/\D/g, '') + '?text=' + encodeURIComponent(text);   // wa.me takes digits only
      if (mail) mail.href = 'mailto:' + site.email + '?subject=' + encodeURIComponent('New project enquiry') + '&body=' + encodeURIComponent(text);
    }
    form.addEventListener('input', refresh);
    form.addEventListener('submit', function (e) { e.preventDefault(); wa.click(); });
    refresh();
  })();

  /* ---------- Copy buttons ---------- */
  function copyText(text, done) {
    var fallback = function () {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta); done(ok);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, fallback);
    else fallback();
  }
  $$('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      copyText(b.getAttribute('data-copy'), function (ok) { toast(ok ? 'Copied' : 'Select the text to copy it'); });
    });
  });
  $$('[data-share]').forEach(function (b) {
    b.addEventListener('click', function () {
      var data = { title: document.title, url: location.href.split('#')[0] };
      if (navigator.share) navigator.share(data).catch(function () {});
      else copyText(data.url, function (ok) { toast(ok ? 'Link copied' : 'Copy the link from the address bar'); });
    });
  });

  /* ---------- Save our number: a contact card file made on the spot ---------- */
  $$('[data-vcard]').forEach(function (b) {
    b.addEventListener('click', function () {
      var c = window.SITE || {};
      var lines = ['BEGIN:VCARD', 'VERSION:3.0', 'FN:SAKAN Interiors', 'ORG:SAKAN Interiors', 'TITLE:Interior design'];
      if (c.phone) lines.push('TEL;TYPE=CELL:' + c.phone);
      if (c.email) lines.push('EMAIL:' + c.email);
      lines.push('URL:' + location.href.split('#')[0], 'END:VCARD');
      var url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/vcard' }));
      var a = document.createElement('a'); a.href = url; a.download = 'SAKAN-Interiors.vcf';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    });
  });

  /* ---------- Projects page: filters, grid size, list by name ---------- */
  (function projects() {
    var list = $('[data-plist]');
    if (!list) return;
    var cards = $$('.pcard', list);
    var filters = $$('[data-filter]');
    function applyFilter(value) {
      filters.forEach(function (f) { f.setAttribute('aria-pressed', String(f.getAttribute('data-filter') === value)); });
      cards.forEach(function (c) { c.classList.toggle('is-hidden', value !== 'all' && c.getAttribute('data-type') !== value); });
      $$('.pnames__row').forEach(function (r) { r.hidden = value !== 'all' && r.getAttribute('data-type') !== value; });
    }
    filters.forEach(function (f) { f.addEventListener('click', function () { applyFilter(f.getAttribute('data-filter')); }); });
    function fromHash() {
      var h = decodeURIComponent(location.hash.slice(1));
      if (h && filters.some(function (f) { return f.getAttribute('data-filter') === h; })) { applyFilter(h); window.scrollTo(0, 0); }
    }
    fromHash();
    window.addEventListener('hashchange', fromHash);

    var ft = $('[data-filters-toggle]'), fl = $('[data-filters]');
    if (ft) ft.addEventListener('click', function () {
      var open = !fl.classList.contains('is-open');
      fl.classList.toggle('is-open', open);
      ft.setAttribute('aria-expanded', String(open));
      ft.textContent = open ? 'Filters −' : 'Filters +';
    });

    var more = $('[data-grid="more"]'), less = $('[data-grid="less"]');
    function maxCols() { return 2; }
    function setCols(c) {
      c = Math.max(1, Math.min(maxCols(), c));
      list.setAttribute('data-cols', String(c));
      more.disabled = c >= maxCols(); less.disabled = c <= 1;
    }
    more.addEventListener('click', function () { setCols(+list.getAttribute('data-cols') + 1); titleFollow(); });
    less.addEventListener('click', function () { setCols(+list.getAttribute('data-cols') - 1); titleFollow(); });
    setCols(1);

    var pt = $('[data-ptitle]'), ptName = $('[data-ptitle-name]'), ptSub = $('[data-ptitle-sub]'), ptLink = $('[data-ptitle-link]');
    function titleFollow() {
      if (!pt) return;
      var mid = window.innerHeight / 2, lr = list.getBoundingClientRect();
      var on = list.getAttribute('data-cols') === '1' && !html.classList.contains('names-open') && lr.top < mid && lr.bottom > mid;
      if (on) {
        for (var k = 0; k < cards.length; k++) {
          var c = cards[k];
          if (c.classList.contains('is-hidden')) continue;
          var r = c.getBoundingClientRect();
          if (r.top < mid && r.bottom > mid) {
            if (ptLink.getAttribute('href') !== c.getAttribute('href')) {
              ptName.textContent = c.getAttribute('data-title');
              ptSub.textContent = c.getAttribute('data-sub');
              ptLink.setAttribute('href', c.getAttribute('href'));
            }
            break;
          }
        }
      }
      pt.classList.toggle('is-on', on);
    }
    window.addEventListener('scroll', titleFollow, { passive: true });
    window.addEventListener('resize', titleFollow);
    filters.forEach(function (f) { f.addEventListener('click', function () { setTimeout(titleFollow, 0); }); });
    titleFollow();

    var namesBtn = $('[data-names-toggle]'), names = $('[data-pnames]'), prevImg = $('[data-pnames-preview]');
    if (namesBtn && names) {
      namesBtn.addEventListener('click', function () {
        var open = !names.classList.contains('is-open');
        names.classList.toggle('is-open', open);
        html.classList.toggle('names-open', open);
        html.classList.toggle('no-scroll', open);
        namesBtn.textContent = open ? 'View by image' : 'View by name';
        namesBtn.setAttribute('aria-expanded', String(open));
        window.dispatchEvent(new Event('scroll'));
        titleFollow();
      });
      $$('.pnames__row', names).forEach(function (row) {
        row.addEventListener('mouseenter', function () {
          if (!prevImg) return;
          $('img', prevImg).src = row.getAttribute('data-img');
          prevImg.classList.add('is-on');
        });
        row.addEventListener('mouseleave', function () { if (prevImg) prevImg.classList.remove('is-on'); });
      });
    }
  })();

  /* ---------- Project page: hero slider + sticky bar ---------- */
  $$('[data-hero]').forEach(function projectHero(hero) {
    var track = $('[data-hero-track]', hero), n = track.children.length, i = 0, count = $('[data-count]', hero.parentNode);
    function show(k) {
      i = (k + n) % n;
      track.style.transform = 'translateX(' + (-100 * i) + '%)';
      if (count) count.textContent = (i + 1) + ' / ' + n;
    }
    $('[data-prev]', hero).addEventListener('click', function () { show(i - 1); });
    $('[data-next]', hero).addEventListener('click', function () { show(i + 1); });
    var x0 = null;
    hero.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    hero.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) show(i + (dx < 0 ? 1 : -1));
      x0 = null;
    });
    hero.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') show(i - 1); if (e.key === 'ArrowRight') show(i + 1); });
  });
  $$('[data-pbar]').forEach(function stickyBar(bar) {
    if (!('IntersectionObserver' in window)) return;
    var sentinel = document.createElement('div');
    sentinel.style.height = '1px';
    bar.parentNode.insertBefore(sentinel, bar);
    if (header && shown(bar)) header.classList.add('is-overlay');
    new IntersectionObserver(function (entries) {
      if (!shown(bar)) return;   // a hidden project view must not steer the header
      var stuck = !entries[0].isIntersecting && entries[0].boundingClientRect.top < 0;
      bar.classList.toggle('is-stuck', stuck);
      if (header) { header.classList.toggle('is-overlay', !stuck); header.classList.toggle('is-lined', stuck); }
    }, { rootMargin: '-' + (header ? header.offsetHeight : 40) + 'px 0px 0px 0px' }).observe(sentinel);
  });

  /* ---------- Before / after ---------- */
  $$('[data-ba]').forEach(function (ba) {
    var input = $('input', ba);
    var set = function () { ba.style.setProperty('--pos', input.value + '%'); };
    input.addEventListener('input', set);
    set();
  });

  /* ---------- Lightbox ---------- */
  (function lightbox() {
    var box = $('[data-lightbox]');
    if (!box) return;
    var stage = $('[data-lightbox-stage]', box), img = $('img', stage), count = $('[data-lightbox-count]', box);
    var group = [], i = 0, lastFocus = null;
    // zoom state: scale and offset of the photo from the centre of the stage
    var s = 1, tx = 0, ty = 0, w = 0, h = 0, MAX = 4, STEP = 2.5;
    function fit() {
      var it = group[i]; if (!it) return;
      var r = stage.getBoundingClientRect(), pad = desktop.matches ? 160 : 0;
      var W = r.width - pad, H = r.height - (desktop.matches ? 120 : 110);
      w = Math.min(W, H * it.ar); h = w / it.ar;
      img.style.width = w + 'px'; img.style.height = h + 'px';
    }
    function clampPan() {
      var r = stage.getBoundingClientRect();
      var mx = Math.max(0, (w * s - r.width) / 2), my = Math.max(0, (h * s - r.height) / 2);
      tx = Math.min(mx, Math.max(-mx, tx)); ty = Math.min(my, Math.max(-my, ty));
    }
    function apply(anim) {
      clampPan();
      img.classList.toggle('is-anim', !!anim);
      img.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + s + ')';
      box.classList.toggle('is-zoomed', s > 1.01);
    }
    function loadFull() {
      var it = group[i];
      if (!it.full || it.fullDone) return;
      it.fullDone = true;
      var pre = new Image();
      pre.onload = function () { if (group[i] === it) { img.srcset = ''; img.src = it.full; } };
      pre.src = it.full;
    }
    // zoom to scale `to`, keeping the screen point (x, y) where it is
    function zoomAt(to, x, y, anim) {
      to = Math.min(MAX, Math.max(1, to));
      var r = stage.getBoundingClientRect(), cx = x - (r.left + r.width / 2), cy = y - (r.top + r.height / 2);
      tx = cx - (cx - tx) * (to / s); ty = cy - (cy - ty) * (to / s); s = to;
      if (s === 1) { tx = 0; ty = 0; }
      apply(anim);
      if (s > 1) loadFull();
    }
    function show(k) {
      i = (k + group.length) % group.length;
      var it = group[i];
      s = 1; tx = 0; ty = 0; apply(false);
      // all sizes of the photo, so the browser picks the sharpest one for the screen
      img.srcset = it.fullDone ? '' : it.srcset; img.sizes = '100vw';
      img.src = it.fullDone ? it.full : it.src; img.alt = it.alt;
      count.textContent = (i + 1) + ' / ' + group.length;
      fit();
    }
    function open(list, k) {
      lastFocus = document.activeElement;
      group = list;
      box.classList.add('is-open'); box.setAttribute('aria-hidden', 'false');
      html.classList.add('no-scroll');
      show(k);
      $('[data-lightbox-close]', box).focus({ preventScroll: true });
    }
    function close() {
      box.classList.remove('is-open'); box.setAttribute('aria-hidden', 'true');
      html.classList.remove('no-scroll');
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    }
    $$('[data-zoom-group]').forEach(function (g) {
      var items = $$('[data-zoom]', g).filter(function (el) { return !el.closest('[data-clone]'); });
      var list = items.map(function (el) {
        return { src: el.getAttribute('src'), srcset: el.getAttribute('srcset') || '', alt: el.getAttribute('alt') || '',
                 full: el.getAttribute('data-full') || '', ar: parseFloat(el.getAttribute('data-ar')) || 4 / 3 };
      });
      $$('[data-zoom]', g).forEach(function (el) {
        el.addEventListener('click', function () {
          var k = Math.max(0, items.indexOf(el.closest('[data-clone]') ? items.filter(function (x) { return x.getAttribute('src') === el.getAttribute('src'); })[0] : el));
          open(list, k);
        });
      });
    });

    // touch and mouse: pinch, double-tap, drag to pan, swipe for the next photo
    var pts = {}, start = null, lastTap = 0, moved = false;
    function list() { return Object.keys(pts).map(function (k) { return pts[k]; }); }
    stage.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      stage.setPointerCapture(e.pointerId);
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      var p = list(); moved = false;
      if (p.length === 1) start = { x: e.clientX, y: e.clientY, tx: tx, ty: ty };
      if (p.length === 2) {
        var d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        start = { d: d, s: s, mx: (p[0].x + p[1].x) / 2, my: (p[0].y + p[1].y) / 2, tx: tx, ty: ty };
      }
    });
    stage.addEventListener('pointermove', function (e) {
      if (!pts[e.pointerId] || !start) return;
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      var p = list();
      if (p.length === 2 && start.d) {
        var d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), to = Math.min(MAX, Math.max(1, start.s * d / start.d));
        var r = stage.getBoundingClientRect(), cx = start.mx - (r.left + r.width / 2), cy = start.my - (r.top + r.height / 2);
        var mx = (p[0].x + p[1].x) / 2 - start.mx, my = (p[0].y + p[1].y) / 2 - start.my;
        s = to; tx = cx - (cx - start.tx) * (to / start.s) + mx; ty = cy - (cy - start.ty) * (to / start.s) + my;
        moved = true; apply(false); if (s > 1) loadFull();
      } else if (p.length === 1 && start.x !== undefined) {
        var dx = e.clientX - start.x, dy = e.clientY - start.y;
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved = true;
        if (s > 1) { tx = start.tx + dx; ty = start.ty + dy; apply(false); }
        else { img.style.transform = 'translateX(' + dx * .6 + 'px)'; }
      }
    });
    function end(e) {
      if (!pts[e.pointerId]) return;
      var was = list().length, p = pts[e.pointerId];
      delete pts[e.pointerId];
      if (was === 2) { start = null; if (s < 1.05) zoomAt(1, 0, 0, true); return; }
      if (!start || start.x === undefined) { start = null; return; }
      var dx = p.x - start.x;
      if (s <= 1.01 && moved) {
        if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1)); else apply(true);
      } else if (!moved) {
        var b = img.getBoundingClientRect(), now = Date.now();
        var onPhoto = e.clientX >= b.left && e.clientX <= b.right && e.clientY >= b.top && e.clientY <= b.bottom;
        if (e.pointerType === 'mouse') { if (onPhoto || s > 1) zoomAt(s > 1.01 ? 1 : STEP, e.clientX, e.clientY, true); else close(); }
        else if (now - lastTap < 300) { zoomAt(s > 1.01 ? 1 : STEP, e.clientX, e.clientY, true); lastTap = 0; }
        else { lastTap = now; if (!onPhoto && s <= 1.01) setTimeout(function () { if (lastTap === now) close(); }, 300); }
      }
      start = null;
    }
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);
    stage.addEventListener('wheel', function (e) {
      e.preventDefault();
      zoomAt(s * (e.deltaY < 0 ? 1.25 : 0.8), e.clientX, e.clientY, false);
    }, { passive: false });
    window.addEventListener('resize', function () { if (box.classList.contains('is-open')) { fit(); apply(false); } });
    $('[data-lightbox-close]', box).addEventListener('click', close);
    $('[data-prev]', box).addEventListener('click', function () { show(i - 1); });
    $('[data-next]', box).addEventListener('click', function () { show(i + 1); });
    document.addEventListener('keydown', function (e) {
      if (!box.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(i - 1);
      if (e.key === 'ArrowRight') show(i + 1);
      if (e.key === '+' || e.key === '=') { var r = stage.getBoundingClientRect(); zoomAt(s * 1.5, r.left + r.width / 2, r.top + r.height / 2, true); }
      if (e.key === '-') { var q = stage.getBoundingClientRect(); zoomAt(s / 1.5, q.left + q.width / 2, q.top + q.height / 2, true); }
    });
  })();

  /* ---------- Back to top & in-page links ---------- */
  $$('[data-to-top]').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); });
  });
  $$('[data-scroll-to]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var t = openAccIn(a.getAttribute('data-scroll-to'));
      if (!t) return;
      e.preventDefault();
      window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 90, behavior: reduced ? 'auto' : 'smooth' });
    });
  });

  /* ---------- Single-page preview: #tokens switch between views ---------- */
  (function router() {
    if (!spa) return;
    var views = $$('[data-view]'), siteEl = $('.site'), current = null;
    var back = $('[data-back]');
    var navLinks = $$('.nav--left .nav-link');
    function pick(token) {
      var view = views.filter(function (v) { return v.getAttribute('data-view') === token; })[0], target = null, filter = null;
      if (!view && token) {
        var el = document.getElementById(token);
        if (el && el.closest('[data-view]')) { view = el.closest('[data-view]'); target = el; }
        else if ($('[data-filter="' + token + '"]')) { view = views.filter(function (v) { return v.getAttribute('data-view') === 'projects'; })[0]; filter = token; }
      }
      return { view: view || views[0], target: target, filter: filter };
    }
    function show(token) {
      var r = pick(token), view = r.view;
      if (view !== current) {
        if (current) viewSteps++;
        views.forEach(function (v) { v.hidden = v !== view; });
        current = view;
        var page = view.getAttribute('data-page'), name = view.getAttribute('data-view');
        siteEl.setAttribute('data-page', page);
        // a project page takes its own colour, header included
        var toned = $('main[data-tone]', view);
        if (toned) html.setAttribute('data-tone', toned.getAttribute('data-tone')); else html.removeAttribute('data-tone');
        document.title = view.getAttribute('data-title');
        if (back) back.hidden = name === 'home';
        navLinks.forEach(function (a) { a.classList.toggle('is-current', a.getAttribute('href') === '#' + name); });
        if (header) { header.classList.remove('is-overlay', 'is-lined', 'is-clear'); if (page === 'project' && desktop.matches) header.classList.add('is-overlay'); }
        window.scrollTo(0, 0);
        requestAnimationFrame(function () {
          $$('[data-carousel="center"]', view).forEach(function (c) { if (c._reset) c._reset(); });
          headerUpdate();
          window.dispatchEvent(new Event('scroll'));
        });
      }
      if (r.target) {
        openAccIn(r.target.id);
        setTimeout(function () { window.scrollTo(0, r.target.getBoundingClientRect().top + window.scrollY - 90); }, 60);
      }
    }
    window.addEventListener('hashchange', function () { show(location.hash.slice(1)); });
    show(location.hash.slice(1) || 'home');
  })();
})();
