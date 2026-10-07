/* =========================================================
   The Walk — scroll-scrubbed frame sequence for the home hero.
   Frames are drawn to a <canvas>; while scrolling, adjacent frames are
   cross-faded by the fractional scroll position, and once scrolling
   stops the walk glides onto the nearest whole frame so the resting
   picture is a single sharp frame, never a blend of two.
   Each JPEG is decoded off the main thread into an ImageBitmap ahead
   of the scroll position, so a draw never waits on a decode (drawing
   an <img> decodes it on the main thread, which stutters the scrub).
   ========================================================= */
(() => {
  const walk = document.querySelector('[data-walk]');
  if (!walk) return;

  const canvas = walk.querySelector('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const N = +walk.dataset.frames;
  const base = walk.dataset.src;
  const pad = (n) => String(n).padStart(3, '0');
  const url = (i) => base + pad(i + 1) + '.jpg';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const preloader = document.querySelector('[data-preloader]');
  const chapters = [...walk.querySelectorAll('[data-chapter]')];
  const railItems = [...walk.querySelectorAll('[data-walk-rail] li')];
  const counter = walk.querySelector('[data-counter]');

  // gentle push-in on top of the footage keeps motion alive between frames
  const Z0 = 1.02, Z1 = 1.08;

  const sources = new Array(N);   // fetched JPEG as a Blob (an <img> where fetch is unavailable, e.g. file://)
  const bitmaps = new Array(N);   // decoded crops: { bmp, gen, sx, sy, sw, sh } in source pixels
  const pending = new Uint8Array(N);
  let loadedCount = 0;
  let IW = 0, IH = 0;             // natural frame size
  let onReady;
  const ready = new Promise((r) => (onReady = r));

  // how much decoded footage may stay in memory around the scroll position
  const dm = navigator.deviceMemory; // GB, Chromium only
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const BUDGET = (dm ? (dm >= 8 ? 512 : dm >= 4 ? 320 : 160) : coarsePointer ? 160 : 320) * 1048576;
  const radius = (bytes) => Math.max(3, Math.floor(BUDGET / bytes / 2));

  /* ---------- static fallback ---------- */
  if (reduce) {
    walk.classList.add('walk--static');
    canvas.remove();
    finishPreloader(true);
    return;
  }
  // the poster <img> underneath shows until the first frame is painted
  canvas.style.visibility = 'hidden';

  /* ---------- loading ---------- */
  function load(i) {
    if (sources[i]) return Promise.resolve();
    return fetch(url(i))
      .then((r) => (r.ok ? r.blob() : Promise.reject(r.status)))
      .catch(() => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url(i);
      }))
      .then((src) => { sources[i] = src; loadedCount++; pump(); }, () => {});
  }

  // natural size comes from the JPEG header; an unattached <img> is never decoded
  function measureFrames() {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { IW = img.naturalWidth; IH = img.naturalHeight; resolve(); };
      img.onerror = resolve;
      img.src = url(0);
    });
  }

  // Priority: first frame, then a coarse pass of ~12 frames spread over the walk (the loader
  // waits for these), then ever finer passes so the whole walk fills in evenly.
  const first = [0];
  const stride = Math.max(1, Math.round(N / 12));
  const coarse = [];
  for (let i = stride; i < N; i += stride) coarse.push(i);
  if (coarse[coarse.length - 1] !== N - 1) coarse.push(N - 1);
  const rest = [];
  const queued = new Uint8Array(N);
  first.concat(coarse).forEach((i) => (queued[i] = 1));
  for (let s = stride >> 1; ; s >>= 1) {
    const step = Math.max(1, s);
    for (let i = 0; i < N; i += step) if (!queued[i]) { queued[i] = 1; rest.push(i); }
    if (step === 1) break;
  }

  const t0 = performance.now();
  const bar = preloader && preloader.querySelector('.preloader__bar');
  const pct = preloader && preloader.querySelector('[data-pct]');
  const tick = () => {
    const p = Math.min(1, loadedCount / (first.length + coarse.length));
    if (bar) bar.style.setProperty('--p', p);
    if (pct) pct.textContent = Math.round(p * 100) + '%';
  };
  const timer = setInterval(tick, 60);

  const coarseDone = Promise.all([measureFrames(), load(0)])
    .then(() => { resize(); requestDraw(); return Promise.all(coarse.map(load)); });
  coarseDone.then(() => {
    clearInterval(timer); tick();
    // fill in the remaining frames in small batches
    let k = 0;
    const batch = () => {
      const slice = rest.slice(k, k + 6);
      k += 6;
      if (slice.length) Promise.all(slice.map(load)).then(batch);
    };
    batch();
  });
  // lift the loader once the coarse pass is in and a frame is decoded
  Promise.all([coarseDone, ready]).then(() => {
    const wait = Math.max(0, 700 - (performance.now() - t0));
    setTimeout(() => finishPreloader(), wait);
  });
  // never trap the visitor behind the loader
  setTimeout(() => finishPreloader(), 6000);

  function finishPreloader(instant) {
    if (!preloader || preloader.classList.contains('is-done')) return;
    preloader.classList.add('is-done');
    document.documentElement.classList.add('is-loaded');
    if (instant) preloader.remove();
    else setTimeout(() => preloader.remove(), 1200);
  }

  /* ---------- decoding ---------- */
  let crop = null, gen = 0, planTimer = 0;
  let center = 0, dir = 1, busy = 0, R = N;
  const MAX_BUSY = (navigator.hardwareConcurrency || 4) >= 8 ? 4 : 2;

  // Decode only the part of the frame visible at the widest zoom, at the resolution the
  // tightest zoom needs, so every draw is a near 1:1 copy whatever the source resolution.
  function plan() {
    if (!IW || !cw) return;
    const s0 = Math.max(cw / IW, ch / IH) * Z0;
    const sw = Math.min(IW, Math.ceil(cw / s0) + 2);
    const sh = Math.min(IH, Math.ceil(ch / s0) + 2);
    const k = Math.min(1, (cw * Z1 / Z0) / sw);
    crop = {
      sx: Math.floor((IW - sw) / 2), sy: Math.floor((IH - sh) * 0.46), sw, sh,
      w: Math.round(sw * k), h: Math.round(sh * k),
    };
    R = radius(crop.w * crop.h * 4);
    gen++;
    pump();
  }

  // next frame to decode: nearest the scroll position, looking ahead in the scroll direction first
  function next() {
    for (let d = 0; d <= R; d++) {
      for (const i of [center + d * dir, center - d * dir]) {
        if (i < 0 || i >= N || !sources[i] || pending[i]) continue;
        if (!bitmaps[i] || bitmaps[i].gen !== gen) return i;
      }
    }
    return -1;
  }

  function pump() {
    while (crop && busy < MAX_BUSY) {
      const i = next();
      if (i < 0) return;
      decode(i);
    }
  }

  function decode(i) {
    const c = crop, g = gen, src = sources[i];
    busy++;
    pending[i] = 1;
    createImageBitmap(src, c.sx, c.sy, c.sw, c.sh, { resizeWidth: c.w, resizeHeight: c.h, resizeQuality: 'high' })
      .catch(() => createImageBitmap(src, c.sx, c.sy, c.sw, c.sh))
      .then((bmp) => {
        if (bitmaps[i]) bitmaps[i].bmp.close();
        bitmaps[i] = { bmp, gen: g, sx: c.sx, sy: c.sy, sw: c.sw, sh: c.sh };
        // engines that ignore the resize options hand back bigger bitmaps; size the window from reality
        if (g === gen) R = radius(bmp.width * bmp.height * 4);
        if (i === want0 || i === want1 || !painted) { lastDrawn = -1; needsDraw = true; }
        onReady();
      }, () => {})
      .finally(() => { busy--; pending[i] = 0; evict(); pump(); });
  }

  // release frames that drifted out of the window (with slack so small reversals don't thrash)
  function evict() {
    for (let i = 0; i < N; i++) {
      if (bitmaps[i] && Math.abs(i - center) > R + 2) { bitmaps[i].bmp.close(); bitmaps[i] = null; }
    }
  }

  function nearest(i) {
    if (bitmaps[i]) return i;
    for (let d = 1; d < N; d++) {
      if (i - d >= 0 && bitmaps[i - d]) return i - d;
      if (i + d < N && bitmaps[i + d]) return i + d;
    }
    return -1;
  }

  /* ---------- drawing ---------- */
  let cw = 0, ch = 0, dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    // mobile URL-bar show/hide fires resize without changing the svh-sized stage
    if (w === cw && h === ch && crop) return;
    cw = w;
    ch = h;
    canvas.width = cw;
    canvas.height = ch;
    // resizing resets context state; ask for the good filter
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    lastDrawn = -1;
    // re-decode at the new size once resizing settles; meanwhile the old bitmaps are scaled
    clearTimeout(planTimer);
    if (crop) planTimer = setTimeout(plan, 150);
    else plan();
  }

  // where the whole frame sits on the canvas at a given zoom
  function place(zoom) {
    const s = Math.max(cw / IW, ch / IH) * zoom;
    // keep the vanishing point slightly above centre, where the road meets the buildings
    return { s, x: (cw - IW * s) / 2, y: (ch - IH * s) * 0.46 };
  }

  function paint(b, at) {
    ctx.drawImage(b.bmp, at.x + b.sx * at.s, at.y + b.sy * at.s, b.sw * at.s, b.sh * at.s);
  }

  let lastDrawn = -1, want0 = 0, want1 = 0, painted = false;
  function draw(p) {
    let f = p * (N - 1);
    const c = Math.round(f);
    // settled on a frame: draw it alone, not 99.9% of it over its neighbour
    if (Math.abs(f - c) < 0.001) f = c;
    if (c !== center) { dir = c > center ? 1 : -1; center = c; evict(); pump(); }
    if (Math.abs(f - lastDrawn) < 0.002 || !IW) return;
    const i0 = Math.floor(f);
    const i1 = Math.min(i0 + 1, N - 1);
    const t = f - i0;
    want0 = i0;
    want1 = i1;
    const a = nearest(i0);
    if (a < 0) return;
    const b = nearest(i1);
    const at = place(Z0 + p * (Z1 - Z0));
    ctx.globalAlpha = 1;
    paint(bitmaps[a], at);
    if (b >= 0 && b !== a && t > 0.004) {
      ctx.globalAlpha = t;
      paint(bitmaps[b], at);
      ctx.globalAlpha = 1;
    }
    lastDrawn = f;
    if (!painted) { painted = true; canvas.style.visibility = ''; }
  }

  /* ---------- scroll → progress ---------- */
  let target = 0, current = 0, last = performance.now(), lastMove = 0, running = true, needsDraw = true;
  function measure() {
    const rect = walk.getBoundingClientRect();
    const vh = window.innerHeight;
    const scrub = Math.max(1, walk.offsetHeight - vh * 2);
    target = Math.min(1, Math.max(0, -rect.top / scrub));
  }

  const smooth = (e0, e1, x) => {
    const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  };

  // only write what changed: each style write re-styles that element's subtree
  const lastO = chapters.map(() => '');
  let lastCount = '';
  function updateUI(p) {
    walk.style.setProperty('--p', p.toFixed(4));
    chapters.forEach((c, k) => {
      const a = +c.dataset.in, b = +c.dataset.out;
      const fin = c.hasAttribute('data-final');
      // 0.05 fade windows; chapter ranges are spaced so two chapters never overlap
      const o = (a <= 0 ? 1 : smooth(a - 0.05, a, p)) * (fin ? 1 : 1 - smooth(b, b + 0.05, p));
      const v = o.toFixed(3);
      if (v === lastO[k]) return;
      lastO[k] = v;
      c.style.setProperty('--o', v);
      c.classList.toggle('is-live', o > 0.02);
    });
    railItems.forEach((li) => li.classList.toggle('is-on', p >= +li.dataset.at - 0.001));
    if (counter) {
      const s = String(Math.round(p * 100)).padStart(2, '0') + '% — ' + (railItems.filter((li) => li.classList.contains('is-on')).pop()?.dataset.name || 'The Road In');
      if (s !== lastCount) counter.textContent = lastCount = s;
    }
  }

  function requestDraw() { needsDraw = true; }

  function loop(now) {
    const dt = Math.min(64, now - last);
    last = now;
    const before = target;
    measure();
    if (target !== before) lastMove = now;
    // While scrolling, follow the scroll closely (Lenis already smooths the wheel, a second heavy
    // ease is what made the footage drift on in slow motion). Once the scroll has been still for a
    // moment, glide onto the nearest whole frame so the walk comes to rest on one sharp frame.
    const settled = now - lastMove > 120;
    const goal = settled ? Math.round(target * (N - 1)) / (N - 1) : target;
    const k = 1 - Math.exp(-dt * 0.025);
    current += (goal - current) * k;
    if (Math.abs(goal - current) < 0.00005) current = goal;
    if (needsDraw || current !== lastP) {
      draw(current);
      updateUI(current);
      lastP = current;
      needsDraw = false;
    }
    if (running) requestAnimationFrame(loop);
  }
  let lastP = -1;

  // Pause the loop when the walk is fully off-screen.
  const io = new IntersectionObserver(([e]) => {
    const was = running;
    running = e.isIntersecting;
    if (running && !was) { last = performance.now(); requestAnimationFrame(loop); }
  }, { rootMargin: '100px 0px' });
  io.observe(walk);

  window.addEventListener('resize', () => { resize(); requestDraw(); }, { passive: true });
  resize();
  updateUI(0);
  requestAnimationFrame(loop);
})();
