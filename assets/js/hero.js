/* =========================================================
   The Walk — scroll-scrubbed frame sequence for the home hero.
   Frames are drawn to a <canvas>; adjacent frames are cross-faded
   using the fractional scroll position so 50 frames feel continuous.
   ========================================================= */
(() => {
  const walk = document.querySelector('[data-walk]');
  if (!walk) return;

  const canvas = walk.querySelector('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const N = +walk.dataset.frames;
  const base = walk.dataset.src;
  const pad = (n) => String(n).padStart(3, '0');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const preloader = document.querySelector('[data-preloader]');
  const chapters = [...walk.querySelectorAll('[data-chapter]')];
  const railItems = [...walk.querySelectorAll('[data-walk-rail] li')];
  const counter = walk.querySelector('[data-counter]');

  const frames = new Array(N);
  const loaded = new Uint8Array(N);
  let loadedCount = 0;

  /* ---------- static fallback ---------- */
  if (reduce) {
    walk.classList.add('walk--static');
    canvas.remove();
    finishPreloader(true);
    return;
  }

  /* ---------- loading ---------- */
  function load(i) {
    return new Promise((resolve) => {
      if (loaded[i]) return resolve();
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => { frames[i] = img; loaded[i] = 1; loadedCount++; lastDrawn = -1; needsDraw = true; resolve(); };
      img.onerror = resolve;
      img.src = base + pad(i + 1) + '.jpg';
    });
  }
  // Priority: first frame, then a coarse pass (every 5th), then everything else.
  const first = [0];
  const coarse = [];
  for (let i = 5; i < N; i += 5) coarse.push(i);
  coarse.push(N - 1);
  const rest = [];
  for (let i = 0; i < N; i++) if (!first.includes(i) && !coarse.includes(i)) rest.push(i);

  const t0 = performance.now();
  const bar = preloader && preloader.querySelector('.preloader__bar');
  const pct = preloader && preloader.querySelector('[data-pct]');
  const tick = () => {
    const p = Math.min(1, loadedCount / (first.length + coarse.length));
    if (bar) bar.style.setProperty('--p', p);
    if (pct) pct.textContent = Math.round(p * 100) + '%';
  };
  const timer = setInterval(tick, 60);

  load(0)
    .then(() => { resize(); requestDraw(); return Promise.all(coarse.map(load)); })
    .then(() => {
      clearInterval(timer); tick();
      const wait = Math.max(0, 700 - (performance.now() - t0));
      setTimeout(() => finishPreloader(), wait);
      // fill in the remaining frames in small batches
      let k = 0;
      const batch = () => {
        const slice = rest.slice(k, k + 6);
        k += 6;
        if (slice.length) Promise.all(slice.map(load)).then(batch);
      };
      batch();
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

  function nearest(i) {
    if (loaded[i]) return i;
    for (let d = 1; d < N; d++) {
      if (i - d >= 0 && loaded[i - d]) return i - d;
      if (i + d < N && loaded[i + d]) return i + d;
    }
    return -1;
  }

  /* ---------- drawing ---------- */
  let cw = 0, ch = 0, dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    cw = Math.round(canvas.clientWidth * dpr);
    ch = Math.round(canvas.clientHeight * dpr);
    canvas.width = cw;
    canvas.height = ch;
    lastDrawn = -1;
  }

  function cover(img, zoom) {
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const s = Math.max(cw / iw, ch / ih) * zoom;
    const w = iw * s, h = ih * s;
    // keep the vanishing point slightly above centre, where the road meets the buildings
    const x = (cw - w) / 2;
    const y = (ch - h) * 0.46;
    ctx.drawImage(img, x, y, w, h);
  }

  let lastDrawn = -1;
  function draw(p) {
    const f = p * (N - 1);
    if (Math.abs(f - lastDrawn) < 0.002) return;
    const i0 = Math.floor(f);
    const i1 = Math.min(i0 + 1, N - 1);
    const t = f - i0;
    const a = nearest(i0);
    if (a < 0) return;
    const b = nearest(i1);
    // gentle push-in on top of the footage keeps motion alive between frames
    const zoom = 1.02 + p * 0.06;
    ctx.globalAlpha = 1;
    cover(frames[a], zoom);
    if (b >= 0 && b !== a && t > 0.004) {
      ctx.globalAlpha = t;
      cover(frames[b], zoom);
      ctx.globalAlpha = 1;
    }
    lastDrawn = f;
  }

  /* ---------- scroll → progress ---------- */
  let target = 0, current = 0, last = performance.now(), running = true, needsDraw = true;
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

  function updateUI(p) {
    walk.style.setProperty('--p', p.toFixed(4));
    for (const c of chapters) {
      const a = +c.dataset.in, b = +c.dataset.out;
      const fin = c.hasAttribute('data-final');
      const o = (a <= 0 ? 1 : smooth(a - 0.06, a, p)) * (fin ? 1 : 1 - smooth(b, b + 0.06, p));
      c.style.setProperty('--o', o.toFixed(3));
      c.classList.toggle('is-live', o > 0.02);
    }
    railItems.forEach((li) => li.classList.toggle('is-on', p >= +li.dataset.at - 0.001));
    if (counter) counter.textContent = String(Math.round(p * 100)).padStart(2, '0') + '% — ' + (railItems.filter((li) => li.classList.contains('is-on')).pop()?.dataset.name || 'The Road In');
  }

  function requestDraw() { needsDraw = true; }

  function loop(now) {
    const dt = Math.min(64, now - last);
    last = now;
    measure();
    const k = 1 - Math.exp(-dt * 0.011);
    current += (target - current) * k;
    if (Math.abs(target - current) < 0.0002) current = target;
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
