/* =========================================================
   FISAT — site interactions (header, menus, search, reveals,
   tabs, rails, counters, lightbox, directory filters).
   ========================================================= */
(() => {
  const doc = document.documentElement;
  doc.classList.add('js');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ROOT = document.body.dataset.root || '';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- smooth scroll (Lenis) ---------- */
  let lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new window.Lenis({ lerp: 0.11, wheelMultiplier: 0.9, smoothWheel: true });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  const lockScroll = (on) => {
    if (lenis) on ? lenis.stop() : lenis.start();
    document.body.style.overflow = on ? 'hidden' : '';
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    const t = document.getElementById(a.getAttribute('href').slice(1));
    if (!t) return;
    e.preventDefault();
    const off = -(parseInt(getComputedStyle(doc).getPropertyValue('--header-h')) || 78) - 56;
    lenis ? lenis.scrollTo(t, { offset: off }) : t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    history.replaceState(null, '', a.getAttribute('href'));
  });

  /* ---------- header state ---------- */
  const header = $('[data-header]');
  const walk = $('[data-walk]');
  const hero = $('.page-hero');
  let lastY = window.scrollY;
  function solidAt() {
    if (walk) return walk.offsetTop + walk.offsetHeight - window.innerHeight - 10;
    if (hero) return hero.offsetHeight - (header ? header.offsetHeight : 78) - 10;
    return 10;
  }
  let threshold = solidAt();
  function onScroll() {
    const y = window.scrollY;
    if (!header) return;
    const solid = y > threshold;
    header.classList.toggle('is-solid', solid);
    const hide = solid && y > lastY && y > threshold + 200 && !header.classList.contains('menu-open') && !$('.nav-item.is-open');
    header.classList.toggle('is-hidden', hide);
    document.body.classList.toggle('header-hidden', hide);
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { threshold = solidAt(); onScroll(); });
  onScroll();

  /* ---------- mega menu ---------- */
  const items = $$('.nav-item.has-mega');
  let closeTimer;
  const closeAll = (except) => items.forEach((it) => { if (it !== except) { it.classList.remove('is-open'); $('.nav-link', it).setAttribute('aria-expanded', 'false'); } });
  items.forEach((it) => {
    const btn = $('.nav-link', it);
    const open = () => { clearTimeout(closeTimer); closeAll(it); it.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); };
    it.addEventListener('mouseenter', () => { clearTimeout(closeTimer); closeTimer = setTimeout(open, 70); });
    it.addEventListener('mouseleave', () => { clearTimeout(closeTimer); closeTimer = setTimeout(() => { it.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); }, 160); });
    btn.addEventListener('click', () => (it.classList.contains('is-open') ? closeAll() : open()));
    it.addEventListener('focusout', (e) => { if (!it.contains(e.relatedTarget)) { it.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); } });
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });

  /* ---------- mobile menu ---------- */
  const burger = $('[data-menu-toggle]');
  const mm = $('[data-mobile-menu]');
  if (burger && mm) {
    burger.addEventListener('click', () => {
      const open = !header.classList.contains('menu-open');
      header.classList.toggle('menu-open', open);
      mm.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      lockScroll(open);
    });
  }

  /* ---------- search ---------- */
  const search = $('[data-search]');
  if (search) {
    const input = $('input', search);
    const list = $('.search__results', search);
    let active = 0, results = [];
    const index = (window.FISAT_SEARCH || []).map((r) => ({ ...r, h: (r.t + ' ' + r.s + ' ' + (r.k || '')).toLowerCase() }));
    const render = () => {
      const q = input.value.trim().toLowerCase();
      if (!q) {
        results = index.filter((r) => r.f).slice(0, 8);
      } else {
        const words = q.split(/\s+/);
        results = index
          .map((r) => {
            if (!words.every((w) => r.h.includes(w))) return null;
            const t = r.t.toLowerCase();
            return { r, score: (t.startsWith(q) ? 3 : 0) + (t.includes(q) ? 2 : 0) + (r.f ? 1 : 0) - t.length / 400 };
          })
          .filter(Boolean)
          .sort((a, b) => b.score - a.score)
          .slice(0, 12)
          .map((x) => x.r);
      }
      active = 0;
      list.innerHTML = results.length
        ? results.map((r, i) => `<li><a href="${ROOT}${r.u}" class="${i === 0 ? 'is-active' : ''}"><b>${r.t}</b><span>${r.s}</span></a></li>`).join('')
        : `<li class="search__empty">No pages match “${input.value.replace(/[<>&]/g, '')}”.</li>`;
    };
    const open = () => { search.classList.add('is-open'); lockScroll(true); render(); setTimeout(() => input.focus(), 30); };
    const close = () => { search.classList.remove('is-open'); lockScroll(false); };
    $$('[data-search-open]').forEach((b) => b.addEventListener('click', open));
    search.addEventListener('click', (e) => { if (e.target === search) close(); });
    input.addEventListener('input', render);
    input.addEventListener('keydown', (e) => {
      const links = $$('a', list);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!links.length) return;
        links[active]?.classList.remove('is-active');
        active = (active + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length;
        links[active].classList.add('is-active');
        links[active].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter' && links[active]) {
        window.location.href = links[active].href;
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && search.classList.contains('is-open')) close();
      const typing = /input|textarea|select/i.test(document.activeElement.tagName);
      if (((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) { e.preventDefault(); open(); }
    });
  }

  /* ---------- prose: wrap tables for horizontal scroll ---------- */
  $$('.prose table').forEach((t) => {
    if (t.parentElement.classList.contains('table-wrap')) return;
    const w = document.createElement('div');
    w.className = 'table-wrap';
    t.replaceWith(w);
    w.appendChild(t);
  });
  // broken images (a few originals no longer exist on fisat.ac.in)
  $$('img').forEach((img) => img.addEventListener('error', () => {
    const fig = img.closest('.person');
    if (fig) {
      const name = (fig.querySelector('strong') || {}).textContent || '';
      const initials = name.replace(/^(Dr|Mr|Ms|Mrs|Prof|Lt)\.?\s+/gi, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('');
      const d = document.createElement('div');
      d.className = 'avatar';
      d.textContent = initials;
      img.replaceWith(d);
    } else img.remove();
  }, { once: true }));

  /* ---------- reveal on scroll ---------- */
  const revealEls = $$('[data-reveal], .split-line');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach((el) => io.observe(el));
  } else revealEls.forEach((el) => el.classList.add('is-in'));

  /* ---------- counters ---------- */
  const counters = $$('[data-count]');
  const fmt = (n, dec) => n.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const runCounter = (el) => {
    const end = parseFloat(el.dataset.count);
    const dec = (el.dataset.count.split('.')[1] || '').length;
    const dur = 1800;
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 4);
      el.textContent = fmt(end * e, dec);
      if (k < 1) requestAnimationFrame(step);
    };
    if (reduce) el.textContent = fmt(end, dec); else requestAnimationFrame(step);
  };
  if (counters.length) {
    const cio = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { runCounter(e.target); cio.unobserve(e.target); } }), { threshold: 0.5 });
    counters.forEach((c) => cio.observe(c));
  }

  /* ---------- tabs ---------- */
  $$('[role="tablist"]').forEach((list) => {
    const tabs = $$('[role="tab"]', list);
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) {
          panel.hidden = !on;
          if (on) { panel.classList.remove('is-entering'); void panel.offsetWidth; panel.classList.add('is-entering'); }
        }
      });
      if (focus) tab.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') select(tabs[(i + 1) % tabs.length], true);
        if (e.key === 'ArrowLeft') select(tabs[(i - 1 + tabs.length) % tabs.length], true);
      });
    });
  });

  /* ---------- horizontal rails: buttons + drag ---------- */
  $$('[data-rail]').forEach((rail) => {
    const wrap = rail.closest('[data-rail-wrap]') || rail.parentElement;
    const prev = $('[data-rail-prev]', wrap);
    const next = $('[data-rail-next]', wrap);
    const amount = () => (rail.firstElementChild ? rail.firstElementChild.getBoundingClientRect().width + 18 : 300);
    const update = () => {
      if (prev) prev.disabled = rail.scrollLeft < 8;
      if (next) next.disabled = rail.scrollLeft + rail.clientWidth > rail.scrollWidth - 8;
    };
    prev && prev.addEventListener('click', () => rail.scrollBy({ left: -amount(), behavior: 'smooth' }));
    next && next.addEventListener('click', () => rail.scrollBy({ left: amount(), behavior: 'smooth' }));
    rail.addEventListener('scroll', update, { passive: true });
    update();
    let down = false, sx = 0, sl = 0, moved = 0;
    rail.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; down = true; moved = 0; sx = e.clientX; sl = rail.scrollLeft; });
    window.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - sx;
      moved = Math.max(moved, Math.abs(dx));
      if (moved > 5) rail.classList.add('is-dragging');
      rail.scrollLeft = sl - dx;
    });
    window.addEventListener('pointerup', () => { if (!down) return; down = false; setTimeout(() => rail.classList.remove('is-dragging'), 0); });
    rail.addEventListener('click', (e) => { if (moved > 5) { e.preventDefault(); e.stopPropagation(); } }, true);
  });

  /* ---------- parallax ---------- */
  const par = $$('[data-parallax]');
  if (par.length && !reduce) {
    const update = () => {
      const vh = window.innerHeight;
      par.forEach((el) => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        const k = (r.top + r.height / 2 - vh / 2) / vh;
        el.style.transform = `translate3d(0, ${(k * -parseFloat(el.dataset.parallax || 10)).toFixed(2)}%, 0)`;
      });
      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  /* ---------- lightbox ---------- */
  const lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.innerHTML = '<img alt=""><button aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg></button>';
  document.body.appendChild(lb);
  const lbImg = $('img', lb);
  const closeLb = () => { lb.classList.remove('is-open'); lockScroll(false); };
  lb.addEventListener('click', closeLb);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && lb.classList.contains('is-open')) closeLb(); });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a.zoom, .gallery img, [data-zoom]');
    if (!a) return;
    e.preventDefault();
    lbImg.src = a.getAttribute('href') || a.dataset.zoom || a.currentSrc || a.src;
    lb.classList.add('is-open');
    lockScroll(true);
  });

  /* ---------- directory filter ---------- */
  $$('[data-filter-list]').forEach((wrap) => {
    const q = $('[data-filter-q]', wrap);
    const sel = $('[data-filter-dept]', wrap);
    const cards = $$('[data-name]', wrap);
    const count = $('[data-filter-count]', wrap);
    const empty = $('[data-filter-empty]', wrap);
    const params = new URLSearchParams(location.search);
    if (params.get('q') && q) q.value = params.get('q');
    if (params.get('dept') && sel) sel.value = params.get('dept');
    const run = () => {
      const t = (q ? q.value : '').trim().toLowerCase();
      const d = sel ? sel.value : '';
      let n = 0;
      cards.forEach((c) => {
        const ok = (!t || c.dataset.name.includes(t)) && (!d || c.dataset.dept === d);
        c.hidden = !ok;
        if (ok) n++;
      });
      if (count) count.textContent = n + (n === 1 ? ' person' : ' people');
      if (empty) empty.hidden = n > 0;
    };
    q && q.addEventListener('input', run);
    sel && sel.addEventListener('change', run);
    run();
  });

  /* ---------- department tabs scrollspy ---------- */
  const spy = $('[data-spy]');
  if (spy) {
    const links = $$('a', spy);
    const secs = links.map((a) => document.getElementById(a.hash.slice(1))).filter(Boolean);
    const sio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => a.classList.toggle('is-active', a.hash === '#' + e.target.id));
        const act = links.find((a) => a.classList.contains('is-active'));
        if (act) act.scrollIntoView({ block: 'nearest', inline: 'center' });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach((s) => sio.observe(s));
  }

  /* ---------- mobile section nav select ---------- */
  $$('[data-nav-select]').forEach((s) => s.addEventListener('change', () => { if (s.value) location.href = s.value; }));

  /* ---------- year ---------- */
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
