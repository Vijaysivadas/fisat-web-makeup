// =========================================================
// FISAT static site generator
//   node _build/build.mjs
// Reads _build/sitemap.json, _build/content/*.html and _build/data/*.json
// and writes plain HTML pages into the project root.
// =========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const B = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(B, '..');
const J = (f) => JSON.parse(fs.readFileSync(path.join(B, f), 'utf8'));
const sitemap = J('sitemap.json');
const D = {
  news: J('data/news.json'),
  events: J('data/events.json'),
  ann: J('data/announcements.json'),
  faculty: J('data/faculty.json'),
  people: J('data/people.json'),
  depts: J('data/departments.json'),
  sizes: J('data/imgsizes.json'),
};

/* ---------- helpers ---------- */
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const strip = (h = '') => h.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#8217;|&rsquo;/g, '’').replace(/\s+/g, ' ').trim();
const prefixFor = (p) => '../'.repeat(p.split('/').length - 1);
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const titleCase = (s) => (s === s.toUpperCase() && /[A-Z]{4}/.test(s) ? s.toLowerCase().replace(/(^|[\s(–—-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()).replace(/\b(Fisat|Ktu|Nba|Naac|Iste|Ieee|Ansys|Fea|Stm32|Mca|Mba|Cse|Ece|Eee|Eie|Ai|Ml|Ug|Pg)\b/g, (w) => w.toUpperCase()).replace(/\bM\.tech\b/g, 'M.Tech').replace(/\bB\.tech\b/g, 'B.Tech') : s);
const firstSentence = (h, max = 190) => {
  const t = strip(h);
  const m = t.match(/^(.{40,}?[.!?])\s/);
  let s = m ? m[1] : t;
  if (s.length > max) s = s.slice(0, max).replace(/\s+\S*$/, '') + '…';
  return s;
};
const initials = (n) => n.replace(/^(Dr|Mr|Ms|Mrs|Prof|Lt)\.?\s+/gi, '').replace(/^(Dr|Mr|Ms|Mrs|Prof|Lt)\.?\s+/gi, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const localImg = (src) => (src || '').replace('{{root}}', '');
const imgOK = (src) => !!src && exists(localImg(src));

/** Resolve {{root}} placeholders and tidy content images for a page */
function fixContent(html, pre) {
  html = html.replace(/<img ([^>]*?)src="\{\{root\}\}(assets\/img\/fisat\/[^"]+)"([^>]*)>/g, (m, a, src, b) => (exists(src) ? `<img ${a}src="${pre}${src}"${b}>` : ''));
  html = html.replace(/<a class="zoom" href="\{\{root\}\}(assets\/img\/fisat\/[^"]+)"/g, (m, src) => (exists(src) ? `<a class="zoom" href="${pre}${src}"` : `<a href="#"`));
  html = html.replace(/\{\{root\}\}/g, pre);
  // the original site sets many headings in ALL CAPS; calm them down
  html = html.replace(/<(h[2-4])>([^<]{4,})<\/\1>/g, (m, tag, text) => `<${tag}>${titleCase(text.trim())}</${tag}>`);
  return html;
}

const ICON = {
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  arrowL: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>',
  chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg>',
  fb: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 8h3V4h-3c-2.8 0-4 1.7-4 4.3V10H7v4h3v8h4v-8h3l1-4h-4V8.6c0-.4.3-.6.7-.6Z"/></svg>',
  yt: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8ZM9.8 15.1V8.9l5.4 3.1-5.4 3.1Z"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.8 3h3.3l-7.2 8.2L22.4 21h-6.6l-5.2-6.8L4.7 21H1.4l7.7-8.8L1 3h6.8l4.7 6.2L17.8 3Zm-1.2 16h1.8L6.5 4.9H4.6L16.6 19Z"/></svg>',
  ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
  ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
};

/* ---------- site structure ---------- */
const pages = [];          // { path, title, section, html }
const byPath = {};
for (const s of sitemap.sections) for (const p of s.pages) { p.section = s; byPath[p.path] = p; }
const DEPT_ORDER = ['cse', 'ece', 'eee', 'eie', 'me', 'ce', 'mba', 'mca', 'sh'];
const depts = DEPT_ORDER.map((c) => D.depts.find((d) => d.code === c));
const deptName = (d) => (d.code === 'mba' ? 'FISAT Business School (MBA)' : d.name);
const SECTION_HERO = {
  about: 'assets/img/campus/main-gemini.webp',
  governance: 'assets/img/campus/frame-gate.webp',
  academics: 'assets/img/campus/frame-arch.webp',
  admissions: 'assets/img/campus/frame-entrance.webp',
  placements: 'assets/img/fisat/2022-07-college1-300x148.webp',
  facilities: 'assets/img/fisat/2022-06-sports-scaled.webp',
  library: 'assets/img/fisat/2022-07-library-scaled.webp',
  'campus-life': 'assets/img/fisat/2022-04-arts-sports.webp',
  research: 'assets/img/fisat/2022-07-fab-1-300x137.webp',
  industry: 'assets/img/fisat/2022-07-industry.webp',
  iqac: 'assets/img/campus/main-gemini.webp',
  compliance: 'assets/img/campus/frame-gate.webp',
  news: 'assets/img/campus/frame-main.webp',
  departments: 'assets/img/campus/frame-arch.webp',
};
/** First large landscape photo in a content fragment — used as that page's hero */
function heroFromContent(html) {
  const re = /src="\{\{root\}\}(assets\/img\/fisat\/[^"]+)"/g;
  let m;
  while ((m = re.exec(html))) {
    const s = D.sizes[m[1]];
    if (!s) continue;
    const [w, h] = s;
    if (w >= 800 && w / h > 1.25 && w / h < 2.9 &&!/click|apply|button|logo|banner-?\d*x|qr/i.test(m[1])) return m[1];
  }
  return null;
}
const heroFor = (key) => (exists(SECTION_HERO[key] || '') ? SECTION_HERO[key] : 'assets/img/campus/main-gemini.webp');

const link = (p) => byPath[p] || { path: p, title: p };
const L = (p, label) => ({ href: p, label: label || link(p).title });

const MEGA = [
  {
    id: 'about', label: 'About', match: ['about', 'governance', 'compliance'],
    cols: [
      { h: 'The Institution', links: sitemap.sections[0].pages.map((p) => L(p.path)) },
      { h: 'Governance', links: sitemap.sections[1].pages.map((p) => L(p.path)) },
      { h: 'Disclosures', links: ['info/nirf.html', 'info/ugc-compliance.html', 'info/mandatory-disclosure.html', 'info/approvals.html', 'info/audited-statements.html', 'info/committees.html', 'info/oia.html'].map((p) => L(p)) },
    ],
    feature: { href: 'about/index.html', img: 'assets/img/campus/main-gemini.webp', title: 'Focus on Excellence', text: 'A centre of excellence in professional education since 2002.' },
  },
  {
    id: 'academics', label: 'Academics', match: ['academics', 'departments'],
    cols: [
      { h: 'Programmes', links: [L('academics/index.html', 'All Programmes'), L('academics/ug-programs.html'), L('academics/pg-programs.html'), L('admissions/index.html', 'Admissions 2027')] },
      { h: 'Departments', links: depts.map((d) => ({ href: `departments/${d.code}.html`, label: deptName(d) })) },
      { h: 'Resources', links: [L('academics/syllabus.html'), L('academics/academic-calendar.html'), L('academics/handbook.html'), L('academics/nptel.html'), L('library/index.html', 'Library'), L('governance/faculty.html')] },
    ],
    feature: { href: 'departments/index.html', img: 'assets/img/campus/frame-arch.webp', title: 'Nine departments', text: 'Engineering, management and computer applications under one arch.' },
  },
  { id: 'admissions', label: 'Admissions', href: 'admissions/index.html', match: ['admissions'] },
  { id: 'placements', label: 'Placements', href: 'placements/index.html', match: ['placements'] },
  {
    id: 'campus', label: 'Campus', match: ['facilities', 'campus-life', 'library'],
    cols: [
      { h: 'Facilities', links: sitemap.sections.find((s) => s.id === 'facilities').pages.map((p) => L(p.path)) },
      { h: 'Campus Life', links: ['campus-life/index.html', 'campus-life/happenings.html', 'campus-life/alumni.html', 'campus-life/student-council.html', 'campus-life/nss.html', 'campus-life/ncc.html', 'campus-life/arts-club.html', 'campus-life/tedx-fisat.html', 'campus-life/ieee.html', 'library/index.html'].map((p) => L(p)) },
      { h: 'Well-being', links: ['campus-life/anti-ragging.html', 'campus-life/grievance-redressal.html', 'campus-life/internal-complaints-committee.html', 'campus-life/counselling-services.html', 'campus-life/medical-care.html', 'campus-life/mentoring-system.html', 'campus-life/rules-and-regulations.html'].map((p) => L(p)) },
    ],
    feature: { href: 'facilities/hostel.html', img: 'assets/img/fisat/2022-06-sports-scaled.webp', title: '40 acres at Hormis Nagar', text: 'Hostels for 1300+, courts, labs, a fleet of buses and more.' },
  },
  {
    id: 'research', label: 'Research', match: ['research', 'industry', 'iqac'],
    cols: [
      { h: 'Research', links: sitemap.sections.find((s) => s.id === 'research').pages.map((p) => L(p.path)) },
      { h: 'Industry & Innovation', links: sitemap.sections.find((s) => s.id === 'industry').pages.map((p) => L(p.path)).concat([L('facilities/idea-lab.html'), L('facilities/centre-for-future-skills.html')]) },
      { h: 'Quality · IQAC', links: ['iqac/index.html', 'iqac/naac.html', 'iqac/nba.html', 'iqac/nirf.html', 'iqac/aqar.html', 'iqac/best-practices.html', 'iqac/strategic-plan.html'].map((p) => L(p)) },
    ],
    feature: { href: 'facilities/idea-lab.html', img: 'assets/img/fisat/2026-03-idea-lab-banner-scaled.webp', title: 'AICTE IDEA Lab', text: '3D printers, laser cutters and a PCB mill for makers.' },
  },
  {
    id: 'news', label: 'News', match: ['news'],
    cols: [{ h: 'Stay informed', links: [L('news/index.html', 'Latest News'), L('news/events.html'), L('news/announcements.html'), L('about/newsletter.html', 'FISATian Herald'), { href: 'https://gallery.fisat.ac.in/', label: 'Photo Gallery', ext: true }] }],
    news: true,
  },
];

/* ---------- chrome ---------- */
function head({ title, description, pre, extraHead = '' }) {
  const t = title === 'Home' ? 'FISAT — Federal Institute of Science And Technology (Autonomous), Angamaly' : `${title} · FISAT`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(t)}</title>
<meta name="description" content="${esc(description || 'Federal Institute of Science And Technology (FISAT), Angamaly — an autonomous engineering and management college accredited by NAAC A+ and NBA.')}">
<meta name="theme-color" content="#100f36">
<link rel="icon" type="image/png" href="${pre}assets/img/brand/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Inter:wght@400..700&display=swap">
<link rel="stylesheet" href="${pre}assets/css/main.css">
<script>document.documentElement.classList.add('js')</script>
${extraHead}</head>`;
}

function header(pre, page) {
  const secId = page.sectionId;
  const latest = D.news.filter((n) => n.image).slice(0, 2);
  const navItems = MEGA.map((m) => {
    const current = m.match.includes(secId) ? ' aria-current="true"' : '';
    if (m.href) return `<li class="nav-item"><a class="nav-link" href="${pre}${m.href}"${current}>${m.label}</a></li>`;
    const cols = m.cols.map((c) => `<div class="mega__col"><h4>${c.h}</h4><ul>${c.links.map((l) => `<li><a href="${l.ext ? l.href : pre + l.href}"${l.ext ? ' target="_blank" rel="noopener"' : ''}${l.href === page.path ? ' aria-current="page"' : ''}>${esc(l.label)}</a></li>`).join('')}</ul></div>`).join('');
    let feature = '';
    if (m.news) {
      feature = latest.map((n) => `<a class="mega__feature" href="${pre}news/${n.slug}.html"><img src="${pre}${localImg(n.image)}" alt="" loading="lazy"><div><b>${esc(titleCase(n.title))}</b><span>${esc(n.date)}</span></div></a>`).join('');
    } else if (m.feature) {
      const f = m.feature;
      feature = `<a class="mega__feature" href="${pre}${f.href}"><img src="${pre}${f.img}" alt="" loading="lazy"><div><b>${f.title}</b><span>${f.text}</span></div></a>`;
    }
    const colsCount = m.news ? 1 : m.cols.length;
    const style = m.news ? ' style="--cols:1;grid-template-columns:1fr 300px 300px"' : ` style="--cols:${colsCount}"`;
    return `<li class="nav-item has-mega"><button class="nav-link" aria-expanded="false"${current}>${m.label}${ICON.chev}</button><div class="mega"><div class="mega__panel"${style}>${cols}${feature}</div></div></li>`;
  }).join('');

  const mobile = MEGA.map((m) => {
    if (m.href) return `<a class="mm-direct" href="${pre}${m.href}">${m.label}</a>`;
    return `<details><summary>${m.label}${ICON.plus}</summary><div class="mm-group">${m.cols.map((c) => `<h5>${c.h}</h5>${c.links.map((l) => `<a href="${l.ext ? l.href : pre + l.href}">${esc(l.label)}</a>`).join('')}`).join('')}</div></details>`;
  }).join('');

  return `<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header" data-header>
  <div class="container nav-wrap">
    <a class="brand" href="${pre}index.html" aria-label="FISAT home">
      <img src="${pre}assets/img/brand/emblem.png" alt="" width="50" height="39">
      <span class="brand__text"><b>FISAT</b><small>Federal Institute of Science And Technology <i>· Autonomous</i></small></span>
    </a>
    <nav class="primary-nav" aria-label="Main"><ul>${navItems}</ul></nav>
    <div class="nav-actions">
      <button class="icon-btn" data-search-open aria-label="Search the site (Ctrl+K)">${ICON.search}</button>
      <a class="nav-login" href="https://intranet.fisat.ac.in/" target="_blank" rel="noopener">Login</a>
      <a class="btn btn--saffron btn--sm" href="${pre}admissions/index.html">Apply 2027 ${ICON.arrow}</a>
      <button class="burger" data-menu-toggle aria-label="Open menu" aria-expanded="false"><span></span><span></span></button>
    </div>
  </div>
</header>
<div class="mobile-menu" data-mobile-menu>
  ${mobile}
  <div class="mm-cta"><a class="btn btn--saffron" href="${pre}admissions/index.html">Apply 2027 ${ICON.arrow}</a><a class="btn btn--ghost" href="https://intranet.fisat.ac.in/" target="_blank" rel="noopener">Intranet Login</a></div>
</div>
<div class="search" data-search role="dialog" aria-modal="true" aria-label="Search FISAT">
  <div class="search__box">
    <label class="search__field">${ICON.search}<span class="sr-only">Search</span><input type="search" placeholder="Search pages, departments, faculty, news…" autocomplete="off"><kbd>Esc</kbd></label>
    <ul class="search__results"></ul>
    <div class="search__hint">↑ ↓ to move · Enter to open · Ctrl + K or / to search anywhere</div>
  </div>
</div>`;
}

function footer(pre) {
  const info = ['campus-life/alumni.html', 'info/ariia-rankings.html', 'info/mandatory-disclosure.html', 'info/approvals.html', 'info/audited-statements.html', 'campus-life/internal-complaints-committee.html', 'campus-life/anti-ragging.html', 'info/2f-status.html'];
  const quick = [['campus-life/grievance-redressal.html'], ['https://gallery.fisat.ac.in/', 'Photo Gallery'], ['https://www.aicte-india.org/feedback/', 'AICTE Feedback'], ['info/committees.html'], ['about/newsletter.html'], ['info/oia.html', 'International Affairs'], ['iqac/index.html', 'IQAC'], ['info/nirf.html', 'NIRF']];
  const explore = ['about/index.html', 'academics/index.html', 'departments/index.html', 'admissions/index.html', 'placements/index.html', 'facilities/index.html', 'research/index.html', 'news/index.html'];
  const li = (p, label) => p.startsWith('http') ? `<li><a href="${p}" target="_blank" rel="noopener">${label}</a></li>` : `<li><a href="${pre}${p}">${esc(label || link(p).title)}</a></li>`;
  return `<footer class="site-footer">
  <div class="container footer-top">
    <div class="footer-brand">
      <img src="${pre}assets/img/brand/emblem.png" alt="FISAT emblem" width="62" height="48">
      <h3>Federal Institute of Science And Technology</h3>
      <p>Hormis Nagar, Mookkannoor P O, Angamaly, Ernakulam Dt., Kerala, India — 683 577</p>
      <div class="chips"><span class="chip">NAAC A+</span><span class="chip">NBA</span><span class="chip">UGC Autonomous</span><span class="chip">AICTE</span><span class="chip">KTU</span><span class="chip">ISO 21001:2018</span></div>
      <div class="footer-contact" style="margin-top:22px">
        <a href="tel:+914842725272">${ICON.phone}0484 2725272</a>
        <a href="mailto:mail@fisat.ac.in">${ICON.mail}mail@fisat.ac.in</a>
        <a href="${pre}about/location.html">${ICON.pin}How to reach the campus</a>
      </div>
      <div class="socials">
        <a href="https://www.facebook.com/fisats/" target="_blank" rel="noopener" aria-label="Facebook">${ICON.fb}</a>
        <a href="https://www.youtube.com/user/fisatofficial" target="_blank" rel="noopener" aria-label="YouTube">${ICON.yt}</a>
        <a href="https://twitter.com/fisatofficial/" target="_blank" rel="noopener" aria-label="X (Twitter)">${ICON.x}</a>
        <a href="https://www.instagram.com/fisat_official/" target="_blank" rel="noopener" aria-label="Instagram">${ICON.ig}</a>
      </div>
    </div>
    <div><h4>Explore</h4><ul>${explore.map((p) => li(p)).join('')}</ul></div>
    <div><h4>Information</h4><ul>${info.map((p) => li(p)).join('')}</ul></div>
    <div><h4>Quick Links</h4><ul>${quick.map(([p, l]) => li(p, l)).join('')}</ul></div>
  </div>
  <div class="footer-word" aria-hidden="true">FISAT</div>
  <div class="container footer-bottom">
    <span>© <span data-year>2026</span> Federal Institute of Science And Technology (FISAT)®. Promoted by FBOAES.</span>
    <span>Approved by AICTE · Affiliated to APJ Abdul Kalam Technological University</span>
  </div>
</footer>`;
}

function scripts(pre, extra = '') {
  return `<script src="${pre}assets/vendor/lenis.min.js" defer></script>
<script src="${pre}assets/js/search-index.js" defer></script>
<script src="${pre}assets/js/main.js" defer></script>
${extra}`;
}

function documentFor(page, mainHtml, opts = {}) {
  const pre = prefixFor(page.path);
  return `${head({ title: page.title, description: opts.description, pre, extraHead: opts.extraHead })}
<body data-root="${pre}" class="${opts.bodyClass || ''}">
${opts.beforeHeader || ''}${header(pre, page)}
<main id="main">
${mainHtml}
</main>
${footer(pre)}
${scripts(pre, opts.scripts)}
</body>
</html>
`;
}

/* ---------- inner page building blocks ---------- */
function pageHero(pre, { title, kicker, crumbs = [], img, intro, extra = '', blur = false }) {
  return `<section class="page-hero${blur ? ' page-hero--blur' : ''}">
  <div class="page-hero__media"><img src="${pre}${img}" alt="" fetchpriority="high"></div>
  <div class="container">
    <ol class="crumbs"><li><a href="${pre}index.html">Home</a></li>${crumbs.map((c) => `<li>${c.href ? `<a href="${pre}${c.href}">${esc(c.label)}</a>` : esc(c.label)}</li>`).join('')}</ol>
    ${kicker ? `<span class="chip">${esc(kicker)}</span>` : ''}
    <h1>${esc(title)}</h1>
    ${intro ? `<p>${intro}</p>` : ''}
    ${extra}
  </div>
</section>`;
}

function sideNav(pre, section, current) {
  const groups = section.groups || [null];
  const body = groups.map((g) => {
    const ps = section.pages.filter((p) => (g ? p.group === g : true));
    if (!ps.length) return '';
    return `${g ? `<h5>${g}</h5>` : ''}<ul>${ps.map((p) => `<li><a href="${pre}${p.path}"${p.path === current ? ' aria-current="page"' : ''}>${esc(p.title)}</a></li>`).join('')}</ul>`;
  }).join('');
  const select = `<div class="side-nav__mobile"><label class="sr-only" for="secnav">In this section</label><select id="secnav" class="select" data-nav-select style="width:100%">${section.pages.map((p) => `<option value="${pre}${p.path}"${p.path === current ? ' selected' : ''}>${esc(p.title)}</option>`).join('')}</select></div>`;
  return { aside: `<aside class="side-nav" aria-label="${esc(section.title)} pages"><span class="side-nav__title">${esc(section.title)}</span>${body}</aside>`, select };
}

function pager(pre, section, current) {
  const ps = section.pages;
  const i = ps.findIndex((p) => p.path === current);
  if (i < 0 || ps.length < 2) return '';
  const prev = ps[i - 1], next = ps[i + 1];
  return `<nav class="container pager" aria-label="More in ${esc(section.title)}">
  ${prev ? `<a href="${pre}${prev.path}"><span>Previous</span><b>${esc(prev.title)}</b></a>` : ''}
  ${next ? `<a class="next" href="${pre}${next.path}"><span>Next</span><b>${esc(next.title)}</b></a>` : ''}
</nav>`;
}

function innerPage(p, bodyHtml, opts = {}) {
  const pre = prefixFor(p.path);
  const section = p.section;
  const nav = section && section.pages.length > 1 ? sideNav(pre, section, p.path) : null;
  const crumbs = opts.crumbs || (section ? [{ label: section.title, href: section.pages[0].path !== p.path ? section.pages[0].path : null }] : []);
  const hero = pageHero(pre, { title: opts.heroTitle || p.title, kicker: opts.kicker || (section && section.title !== p.title ? section.title : ''), crumbs, img: opts.heroImg || heroFor(section ? section.id : 'about'), intro: opts.intro !== undefined ? opts.intro : (section ? section.blurb : ''), extra: opts.heroExtra });
  const wide = opts.wide || !nav;
  const main = `${hero}
<div class="container page-body${wide ? ' page-body--wide' : ''}">
  ${wide ? '' : nav.aside}
  <div class="${opts.raw ? '' : 'prose'}" style="min-width:0">
    ${nav && wide && !opts.noSelect ? '' : ''}${nav ? nav.select : ''}
    ${bodyHtml}
  </div>
</div>
${section ? pager(pre, section, p.path) : ''}`;
  return documentFor({ ...p, sectionId: opts.sectionId || (section && section.id) }, main, { description: opts.description || firstSentence(bodyHtml, 155) || (section && section.blurb) });
}

function write(p, html, meta = {}) {
  const file = path.join(ROOT, p);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  pages.push({ path: p, ...meta });
}

const content = (p) => {
  const f = path.join(B, 'content', p.replace(/\//g, '__'));
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
};

/* ---------- reusable components ---------- */
const personCard = (pre, x) => {
  const img = imgOK(x.img) ? `<img src="${pre}${localImg(x.img)}" alt="${esc(x.name)}" loading="lazy">` : `<div class="avatar" aria-hidden="true">${initials(x.name)}</div>`;
  const metas = Object.entries(x.details || {}).filter(([, v]) => v).map(([k, v]) => `<span class="meta">${esc(k)}: ${esc(v)}</span>`).join('');
  return `<figure class="person"${x.filter ? ` data-name="${esc(x.filter)}" data-dept="${esc(x.dept || '')}"` : ''}>${img}<figcaption><strong>${esc(x.name)}</strong>${x.role ? `<span class="role">${esc(x.role)}</span>` : ''}${x.deptName ? `<span class="meta">${esc(x.deptName)}</span>` : ''}${metas}${x.email ? `<a class="mail" href="mailto:${esc(x.email)}">${esc(x.email)}</a>` : ''}${x.phone && x.phone.replace(/\D/g, '').length >= 8 ? `<span class="meta">${esc(x.phone)}</span>` : ''}</figcaption></figure>`;
};

const dateParts = (d) => {
  // "Tuesday, September 29,2026" or "18/11/2026"
  let m = d.match(/(\w+) (\d+),\s*(\d{4})/);
  if (m) return { day: m[2].padStart(2, '0'), mon: m[1].slice(0, 3), year: m[3] };
  m = d.match(/(\d+)\/(\d+)\/(\d{4})/);
  if (m) return { day: m[1].padStart(2, '0'), mon: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m[2] - 1], year: m[3] };
  return null;
};
const newsCard = (pre, n, href, i = 0) => {
  const dp = dateParts(n.date || '');
  const media = imgOK(n.image)
    ? `<div class="card__media"><img src="${pre}${localImg(n.image)}" alt="" loading="lazy">${dp ? `<div class="card__date"><b>${dp.day}</b><span>${dp.mon} ${dp.year.slice(2)}</span></div>` : ''}</div>`
    : `<div class="card__media card__media--empty"><img src="${pre}assets/img/brand/emblem.png" alt="">${dp ? `<div class="card__date"><b>${dp.day}</b><span>${dp.mon} ${dp.year.slice(2)}</span></div>` : ''}</div>`;
  return `<a class="card" href="${href}" data-reveal style="--d:${i % 4}">${media}<div class="card__body">${n.date && !dp ? `<time>${esc(n.date)}</time>` : n.date ? `<time>${esc(n.date)}</time>` : ''}<h3>${esc(titleCase(n.title))}</h3><span class="link-arrow">Read more ${ICON.arrow}</span></div></a>`;
};

/* ---------- programmes data (from the UG / PG pages) ---------- */
const UG = [
  ['Computer Science & Engineering', 180, true, 'cse'],
  ['Electronics & Communication Engineering', 120, true, 'ece'],
  ['Civil Engineering', 120, true, 'ce'],
  ['Mechanical Engineering', 120, true, 'me'],
  ['Electrical & Electronics Engineering', 60, true, 'eee'],
  ['Electronics & Instrumentation Engineering', 60, true, 'eie'],
  ['Computer Science & Design', 60, false, 'cse'],
];
const PG = [
  ['M.Tech', 'Artificial Intelligence and Data Science', 12, 'cse'],
  ['M.Tech', 'AI and Data Science (Working Professionals)', 15, 'cse'],
  ['M.Tech', 'Power Electronics and Power Systems', 12, 'eee'],
  ['M.Tech', 'VLSI & Embedded Systems', 12, 'ece'],
  ['M.Tech', 'Renewable Energy', 12, 'me'],
  ['M.Tech', 'Renewable Energy (Working Professionals)', 15, 'me'],
  ['M.Tech', 'Structural Engineering & Construction Management', 24, 'ce'],
  ['MBA', 'Master of Business Administration', 120, 'mba'],
  ['MCA', 'Master of Computer Applications', 60, 'mca'],
  ['MCA', 'Integrated MCA', 60, 'mca'],
];
const PHD = ['cse', 'ece', 'eee', 'me', 'ce', 'mca'];

function programmeCards(pre, kind) {
  if (kind === 'ug') return UG.map(([n, seats, nba, code], i) => `<a class="prog" href="${pre}departments/${code}.html" data-reveal style="--d:${i % 4}"><div class="prog__top"><span class="chip">B.Tech</span>${nba ? '<span class="chip chip--saffron">NBA Accredited</span>' : '<span class="chip chip--line">Emerging</span>'}</div><h3>${n}</h3><div class="prog__meta"><div><b>${seats}</b>seats · 4 years</div><span class="prog__arrow">${ICON.arrow}</span></div></a>`).join('');
  if (kind === 'pg') return PG.map(([deg, n, seats, code], i) => `<a class="prog" href="${pre}departments/${code}.html" data-reveal style="--d:${i % 4}"><div class="prog__top"><span class="chip">${deg}</span>${deg === 'MCA' && /Integrated/.test(n) ? '<span class="chip chip--line">5 years</span>' : '<span class="chip chip--line">2 years</span>'}</div><h3>${n}</h3><div class="prog__meta"><div><b>${seats}</b>seats</div><span class="prog__arrow">${ICON.arrow}</span></div></a>`).join('');
  return PHD.map((c, i) => { const d = depts.find((x) => x.code === c); return `<a class="prog" href="${pre}departments/${c}.html" data-reveal style="--d:${i % 4}"><div class="prog__top"><span class="chip">Ph.D</span><span class="chip chip--line">KTU Research Centre</span></div><h3>${deptName(d)}</h3><div class="prog__meta"><div>Doctoral research</div><span class="prog__arrow">${ICON.arrow}</span></div></a>`; }).join('');
}

/* =========================================================
   HOME
   ========================================================= */
function buildHome() {
  const pre = '';
  const p = { path: 'index.html', title: 'Home', sectionId: 'home' };
  const newsLatest = D.news.slice(0, 12);
  const ticker = newsLatest.map((n) => `<a href="news/${n.slug}.html">${esc(titleCase(n.title))}</a>`).join('');
  const quotes = depts.flatMap((d) => d.testimonials.slice(0, 1).map((t) => ({ ...t, dept: d.short }))).filter((t) => t.quote);
  const deptCards = depts.map((d, i) => `<a class="dept-card" href="departments/${d.code}.html"><img src="${localImg(d.banner)}" alt="" loading="lazy"><div class="dept-card__body"><span class="dept-card__code">${esc(d.short)}</span><h3>${esc(deptName(d))}</h3><p>${esc(firstSentence(d.intro, 170))}</p><span class="dept-card__go">Explore department ${ICON.arrow}</span></div></a>`).join('');
  const logos = Array.from({ length: 10 }, (_, i) => `assets/img/fisat/2022-07-slide${i}${i < 2 ? '-1' : ''}.webp`).filter(exists);
  const logoRow = (arr) => arr.map((l) => `<img src="${l}" alt="" loading="lazy">`).join('');
  const gazette = {
    news: D.news.slice(0, 4).map((n, i) => newsCard(pre, n, `news/${n.slug}.html`, i)).join(''),
    events: D.events.slice(0, 4).map((e, i) => newsCard(pre, e, eventHref(pre, e), i)).join(''),
    ann: D.ann.slice(0, 4).map((a, i) => newsCard(pre, a, 'news/announcements.html', i)).join(''),
  };

  const main = `
<section class="walk" data-walk data-frames="240" data-src="assets/images/hero-video/frame-" aria-label="A walk through the FISAT gates">
  <div class="walk__stage">
    <img class="walk__poster" src="assets/images/hero-video/frame-001.jpg" alt="The FISAT entrance arch on the road into Hormis Nagar campus">
    <canvas class="walk__canvas" aria-hidden="true"></canvas>
    <div class="walk__shade"></div>
    <div class="walk__grain"></div>
    <div class="walk__chapters">
      <div class="chapter" data-chapter data-in="0" data-out=".10" data-align="center">
        <div class="chapter__inner">
          <span class="walk-kicker reveal-line">Federal Institute of Science And Technology</span>
          <h1 class="reveal-line">Focus on<br><em>Excellence.</em></h1>
          <p class="walk-lead reveal-line">An autonomous engineering &amp; management campus at Hormis Nagar, Angamaly — where Kerala’s engineers, managers and innovators are made.</p>
        </div>
      </div>
      <div class="chapter" data-chapter data-in=".21" data-out=".34" data-align="left">
        <div class="chapter__inner">
          <span class="walk-kicker reveal-line">Est. 2002 · Promoted by FBOAES</span>
          <h2 class="reveal-line">Step through <em>the arch.</em></h2>
          <p class="walk-lead reveal-line">Founded by the officers of Federal Bank to build a centre of excellence in professional education — on the birthplace of K. P. Hormis.</p>
        </div>
      </div>
      <div class="chapter" data-chapter data-in=".45" data-out=".56" data-align="right">
        <div class="chapter__inner">
          <span class="walk-kicker reveal-line">Accredited &amp; autonomous</span>
          <h2 class="reveal-line">Recognised for <em>quality.</em></h2>
          <div class="walk-badges reveal-line">
            <div class="walk-badge"><b>A+</b><span>NAAC · 3.45 CGPA</span></div>
            <div class="walk-badge"><b>6</b><span>B.Tech programmes · NBA</span></div>
            <div class="walk-badge"><b>2025</b><span>UGC Autonomous status</span></div>
            <div class="walk-badge"><b>ISO</b><span>21001:2018 certified</span></div>
          </div>
        </div>
      </div>
      <div class="chapter" data-chapter data-in=".67" data-out=".78" data-align="left">
        <div class="chapter__inner">
          <span class="walk-kicker reveal-line">Past the gatehouse</span>
          <h2 class="reveal-line">Forty acres of <em>possibility.</em></h2>
          <div class="walk-badges reveal-line">
            <div class="walk-badge"><b>3200+</b><span>Students</span></div>
            <div class="walk-badge"><b>9</b><span>Departments</span></div>
            <div class="walk-badge"><b>1300+</b><span>Hostel residents</span></div>
            <div class="walk-badge"><b>30</b><span>College buses</span></div>
          </div>
        </div>
      </div>
      <div class="chapter" data-chapter data-final data-in=".89" data-out="1" data-align="center">
        <div class="chapter__inner">
          <span class="walk-kicker reveal-line">You have arrived</span>
          <h2 class="reveal-line" style="max-width:none">Welcome to <em>FISAT.</em></h2>
          <div class="walk-ctas reveal-line">
            <a class="btn btn--saffron" href="admissions/index.html">Admissions 2027 ${ICON.arrow}</a>
            <a class="btn btn--glass" href="academics/index.html">Explore programmes</a>
          </div>
        </div>
      </div>
    </div>
    <div class="walk__rail" aria-hidden="true"><ol data-walk-rail>
      <li data-at="0" data-name="The Road In">The Road In</li>
      <li data-at=".22" data-name="The Arch">The Arch</li>
      <li data-at=".6" data-name="The Gatehouse">The Gatehouse</li>
      <li data-at=".86" data-name="Main Block">Main Block</li>
    </ol></div>
    <div class="walk__counter" data-counter aria-hidden="true">00% — The Road In</div>
    <div class="walk__hint" aria-hidden="true"><span>Scroll to walk in</span><i></i></div>
  </div>
</section>

<div class="curtain">
  <div class="ticker" aria-label="Latest news">
    <span class="ticker__label"><i></i><span>Latest</span></span>
    <div class="ticker__track"><div class="ticker__move" style="--dur:${newsLatest.length * 9}s">${ticker}${ticker.replace(/<a /g, '<a tabindex="-1" aria-hidden="true" ')}</div></div>
  </div>

  <section class="section" id="about">
    <div class="container">
      <div class="intro-grid">
        <div>
          <span class="kicker" data-reveal>The Institution</span>
          <h2 class="display" data-reveal style="--d:1">A centre of excellence, built by the officers of <em>Federal Bank.</em></h2>
        </div>
        <div class="intro-copy lead" data-reveal style="--d:2">
          <p>FISAT was established in 2002 by the Federal Bank Officers’ Association Educational Society with one motto — <strong>“Focus on Excellence.”</strong> Over two decades it has carved a niche through its students’ achievements in academics, placements, research and innovation.</p>
          <p>In 2025 the UGC conferred <strong>Autonomous Status</strong> on FISAT for ten years. The institution holds NAAC <strong>A+</strong>, NBA accreditation for six B.Tech programmes and ISO 21001:2018 certification.</p>
          <div class="btn-row"><a class="btn" href="about/index.html">Our story ${ICON.arrow}</a><a class="link-arrow" href="about/vision-mission.html">Vision &amp; Mission ${ICON.arrow}</a></div>
        </div>
      </div>
      <div class="collage">
        <figure class="c1" data-reveal="clip"><img src="assets/img/campus/main-gemini.webp" alt="The FISAT main block with its clock tower and the central lawn" loading="lazy"><figcaption>Main Block · Hormis Nagar</figcaption></figure>
        <figure class="c2" data-reveal="clip" style="--d:2"><img src="assets/img/campus/aerial.webp" alt="Aerial view of the FISAT campus" loading="lazy"><figcaption>40-acre campus</figcaption></figure>
        <figure class="c3" data-reveal="clip" style="--d:3"><img src="assets/img/campus/clock-tower.webp" alt="FISAT clock tower" loading="lazy"><figcaption>The clock tower</figcaption></figure>
        <a class="founder-card" href="about/founder.html" data-reveal style="--d:4"><img src="assets/img/fisat/2022-06-founder.webp" alt=""><div><b>Adv. P. V. Mathew</b><span>Founder Chairman · 1953–2017</span></div></a>
      </div>
    </div>
  </section>

  <section class="section section--dark" aria-label="FISAT in numbers">
    <div class="container">
      <div class="section-head">
        <div><span class="kicker" data-reveal>By the numbers</span><h2 class="h2" data-reveal style="--d:1">Twenty-three years of <em>results.</em></h2></div>
        <a class="link-arrow" href="placements/index.html" data-reveal>See placement records ${ICON.arrow}</a>
      </div>
      <div class="stats">
        <div class="stat" data-reveal><b><span data-count="23">23</span><small>yrs</small></b><span>Legacy since 2002</span></div>
        <div class="stat" data-reveal style="--d:1"><b>₹<span data-count="12">12</span><small>cr+</small></b><span>Worth of scholarships</span></div>
        <div class="stat" data-reveal style="--d:2"><b><span data-count="602">602</span></b><span>Offers · Class of 2026</span></div>
        <div class="stat" data-reveal style="--d:3"><b><span data-count="17.22">17.22</span><small>LPA</small></b><span>Highest package 2026</span></div>
        <div class="stat" data-reveal style="--d:4"><b><span data-count="3200">3,200</span><small>+</small></b><span>Students on campus</span></div>
      </div>
      <div class="accred">
        <div data-reveal><b>NAAC A+</b><span>2nd cycle · 3.45 CGPA</span></div>
        <div data-reveal style="--d:1"><b>NBA</b><span>CSE, ECE, EEE, EIE, ME &amp; CE</span></div>
        <div data-reveal style="--d:2"><b>Autonomous</b><span>UGC, 10 years from 2025</span></div>
        <div data-reveal style="--d:3"><b>AICTE</b><span>Approved, New Delhi</span></div>
        <div data-reveal style="--d:4"><b>KTU</b><span>APJ Abdul Kalam Technological University</span></div>
        <div data-reveal style="--d:5"><b>ISO</b><span>21001:2018 EOMS certified</span></div>
      </div>
    </div>
  </section>

  <section class="section" id="programmes">
    <div class="container">
      <div class="section-head">
        <div><span class="kicker" data-reveal>Academics</span><h2 class="h2" data-reveal style="--d:1">Find your <em>programme.</em></h2><p class="lead" data-reveal style="--d:2">Seven B.Tech programmes, M.Tech, MBA, MCA and doctoral research — affiliated to KTU and approved by AICTE.</p></div>
        <div class="tabs" role="tablist" aria-label="Programme level" data-reveal>
          <button class="tab" role="tab" aria-selected="true" aria-controls="tp-ug" id="tb-ug">Undergraduate</button>
          <button class="tab" role="tab" aria-selected="false" aria-controls="tp-pg" id="tb-pg" tabindex="-1">Postgraduate</button>
          <button class="tab" role="tab" aria-selected="false" aria-controls="tp-phd" id="tb-phd" tabindex="-1">Doctoral</button>
        </div>
      </div>
      <div class="tabpanel prog-grid" id="tp-ug" role="tabpanel" aria-labelledby="tb-ug">${programmeCards(pre, 'ug')}</div>
      <div class="tabpanel prog-grid" id="tp-pg" role="tabpanel" aria-labelledby="tb-pg" hidden>${programmeCards(pre, 'pg')}</div>
      <div class="tabpanel prog-grid" id="tp-phd" role="tabpanel" aria-labelledby="tb-phd" hidden>${programmeCards(pre, 'phd')}</div>
    </div>
  </section>

  <section class="section section--sand" id="departments" data-rail-wrap>
    <div class="container">
      <div class="section-head">
        <div><span class="kicker" data-reveal>Departments</span><h2 class="h2" data-reveal style="--d:1">Nine departments. <em>One campus.</em></h2></div>
        <div class="rail-controls"><button class="round-btn" data-rail-prev aria-label="Previous departments">${ICON.arrowL}</button><button class="round-btn" data-rail-next aria-label="Next departments">${ICON.arrow}</button></div>
      </div>
    </div>
    <div class="rail" data-rail>${deptCards}</div>
  </section>

  <section class="section">
    <div class="container">
      <div class="section-head">
        <div><span class="kicker" data-reveal>Explore</span><h2 class="h2" data-reveal style="--d:1">Have a look at what <em>FISAT offers.</em></h2></div>
        <a class="link-arrow" href="facilities/index.html" data-reveal>All facilities ${ICON.arrow}</a>
      </div>
      <div class="tiles">
        <a class="tile tile--wide" href="campus-life/index.html" data-reveal><img src="assets/img/fisat/2022-06-sports-scaled.webp" alt="" loading="lazy"><div><div><h3>Campus Life</h3><p>Clubs, chapters, fests and a campus many call home for four years.</p></div><span class="prog__arrow">${ICON.arrow}</span></div></a>
        <a class="tile" href="facilities/index.html" data-reveal style="--d:1"><img src="assets/img/fisat/2022-07-fitness.webp" alt="" loading="lazy"><div><div><h3>Facilities</h3><p>Labs, hostels, sports and transport.</p></div><span class="prog__arrow">${ICON.arrow}</span></div></a>
        <a class="tile" href="library/index.html" data-reveal><img src="assets/img/fisat/2022-07-library-scaled.webp" alt="" loading="lazy"><div><div><h3>Library</h3><p>83,650+ volumes and 5,000+ e-journals.</p></div><span class="prog__arrow">${ICON.arrow}</span></div></a>
        <a class="tile tile--wide" href="industry/index.html" data-reveal style="--d:1"><img src="assets/img/fisat/2022-07-industry.webp" alt="" loading="lazy"><div><div><h3>Industry Interaction</h3><p>MoUs, internships, incubation and the Fab Lab — bridging campus and industry.</p></div><span class="prog__arrow">${ICON.arrow}</span></div></a>
      </div>
    </div>
  </section>

  <section class="section section--dark" id="placements">
    <div class="container">
      <div class="place-grid">
        <div>
          <span class="kicker" data-reveal>Placements</span>
          <h2 class="h2" data-reveal style="--d:1">The best of career <em>opportunities.</em></h2>
          <p class="lead" data-reveal style="--d:2;margin-top:18px">One of the biggest placement records among self-financing engineering colleges in Kerala — every student goes through 150+ hours of training before campus recruitment.</p>
          <div class="btn-row" data-reveal style="--d:3;margin-top:30px"><a class="btn btn--light" href="placements/index.html">Placement records ${ICON.arrow}</a></div>
        </div>
        <div class="place-big" data-reveal="scale">
          <div><b><span data-count="602">602</span></b><span>Offers for the Class of 2026</span></div>
          <div><b>₹<span data-count="17.22">17.22</span>L</b><span>Highest package, 2026</span></div>
          <div><b><span data-count="741">741</span></b><span>Offers in 120 companies, 2023</span></div>
          <div><b><span data-count="906">906</span></b><span>Offers in 79 companies, 2022</span></div>
        </div>
      </div>
      <div class="logo-marquee" aria-label="Recruiters">
        <div class="logo-marquee__move">${logoRow(logos.slice(0, 5))}${logoRow(logos.slice(0, 5))}</div>
        <div class="logo-marquee__move rev">${logoRow(logos.slice(5))}${logoRow(logos.slice(5))}</div>
      </div>
    </div>
  </section>

  <section class="section" id="gazette">
    <div class="container">
      <div class="section-head">
        <div><span class="kicker" data-reveal>Campus Gazette</span><h2 class="h2" data-reveal style="--d:1">What’s happening <em>at FISAT.</em></h2></div>
        <div class="tabs" role="tablist" aria-label="Gazette" data-reveal>
          <button class="tab" role="tab" aria-selected="true" aria-controls="gz-news" id="gzt-news">News</button>
          <button class="tab" role="tab" aria-selected="false" aria-controls="gz-events" id="gzt-events" tabindex="-1">Events</button>
          <button class="tab" role="tab" aria-selected="false" aria-controls="gz-ann" id="gzt-ann" tabindex="-1">Announcements</button>
        </div>
      </div>
      <div class="tabpanel" id="gz-news" role="tabpanel" aria-labelledby="gzt-news"><div class="cards">${gazette.news}</div><p style="margin-top:28px"><a class="link-arrow" href="news/index.html">All news ${ICON.arrow}</a></p></div>
      <div class="tabpanel" id="gz-events" role="tabpanel" aria-labelledby="gzt-events" hidden><div class="cards">${gazette.events}</div><p style="margin-top:28px"><a class="link-arrow" href="news/events.html">All events ${ICON.arrow}</a></p></div>
      <div class="tabpanel" id="gz-ann" role="tabpanel" aria-labelledby="gzt-ann" hidden><div class="cards">${gazette.ann}</div><p style="margin-top:28px"><a class="link-arrow" href="news/announcements.html">All announcements ${ICON.arrow}</a></p></div>
    </div>
  </section>

  <section class="section section--sand" id="happenings">
    <div class="container">
      <div class="section-head"><div><span class="kicker" data-reveal>Happenings at FISAT</span><h2 class="h2" data-reveal style="--d:1">A peek into <em>life on campus.</em></h2></div><a class="link-arrow" href="campus-life/happenings.html" data-reveal>View more ${ICON.arrow}</a></div>
      <div class="tiles">
        <a class="tile" href="campus-life/arts-club.html" data-reveal style="min-height:420px"><img src="assets/img/fisat/2022-04-arts-sports.webp" alt="" loading="lazy"><div><div><h3>Arts &amp; Sports</h3><p>Arangu, Bharatham and championship teams.</p></div><span class="prog__arrow">${ICON.arrow}</span></div></a>
        <a class="tile" href="campus-life/nss.html" data-reveal style="--d:1;min-height:420px"><img src="assets/img/fisat/2022-04-social.webp" alt="" loading="lazy"><div><div><h3>Social Commitments</h3><p>NSS, NCC and outreach in Mookkannoor.</p></div><span class="prog__arrow">${ICON.arrow}</span></div></a>
        <a class="tile" href="campus-life/ieee.html" data-reveal style="--d:2;min-height:420px"><img src="assets/img/fisat/2022-04-curricular.webp" alt="" loading="lazy"><div><div><h3>Curricular &amp; Co-Curricular</h3><p>Professional chapters, hackathons and TEDx.</p></div><span class="prog__arrow">${ICON.arrow}</span></div></a>
      </div>
    </div>
  </section>

  <section class="section" id="voices" data-rail-wrap>
    <div class="container">
      <div class="section-head"><div><span class="kicker" data-reveal>Alumni voices</span><h2 class="h2" data-reveal style="--d:1">In their <em>own words.</em></h2></div><div class="rail-controls"><button class="round-btn" data-rail-prev aria-label="Previous">${ICON.arrowL}</button><button class="round-btn" data-rail-next aria-label="Next">${ICON.arrow}</button></div></div>
    </div>
      <div class="quotes" data-rail>${quotes.map((q) => `<article class="quote"><blockquote>${esc(q.quote.length > 420 ? q.quote.slice(0, 420).replace(/\s+\S*$/, '') + '…' : q.quote)}</blockquote><footer>${imgOK(q.img) ? `<img src="${localImg(q.img)}" alt="" loading="lazy">` : ''}<div><b>${esc(q.name)}</b><span>${esc(q.role)} · ${esc(q.dept)}</span></div></footer></article>`).join('')}</div>
  </section>

  <section class="place-band" aria-label="Location">
    <div class="place-band__img" data-parallax="8"><img src="assets/img/fisat/2022-07-ground-1-300x137.webp" alt="Aerial view of the FISAT cricket ground among the palms of Mookkannoor" loading="lazy"></div>
    <div class="container">
      <span class="kicker" style="color:var(--saffron)" data-reveal>Hormis Nagar, Mookkannoor</span>
      <h2 class="display" data-reveal style="--d:1;max-width:16ch;margin-top:16px">A typical Kerala village, <em>an extraordinary campus.</em></h2>
      <div class="distances" data-reveal style="--d:2">
        <div><b>4 km</b><span>from NH-544</span></div>
        <div><b>7 km</b><span>from Angamaly railway station</span></div>
        <div><b>11 km</b><span>from Kochi International Airport</span></div>
      </div>
      <div class="btn-row" data-reveal style="--d:3;margin-top:28px"><a class="btn btn--light" href="about/location.html">How to reach ${ICON.arrow}</a><a class="btn btn--glass" href="https://www.google.com/maps/place/Federal+Institute+of+Science+And+Technology+(FISAT)/@10.2315176,76.4088397,17z" target="_blank" rel="noopener">Open in Maps</a></div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="cta-band" data-reveal="scale">
        <div>
          <span class="kicker" style="color:#1d1206">Admissions open</span>
          <h2 class="h2" style="margin-top:14px">Begin at the gate. <em>Graduate ready.</em></h2>
          <p style="margin-top:16px;max-width:52ch">B.Tech (Autonomous) management quota registration for 2027 is open. We do not have any agents for admission.</p>
          <div class="btn-row" style="margin-top:26px"><a class="btn" href="admissions/index.html">Admission details ${ICON.arrow}</a></div>
        </div>
        <div class="cta-contacts">
          <a href="tel:+917994864517">B.Tech <span>+91 7994 864 517</span></a>
          <a href="tel:+919656927612">M.Tech <span>+91 9656 927 612</span></a>
          <a href="tel:+919495009474">MCA &amp; IMCA <span>+91 94950 09474</span></a>
          <a href="tel:+919656968242">MBA <span>+91 96569 68242</span></a>
        </div>
      </div>
    </div>
  </section>
</div>`;

  const pre0 = `<div class="preloader" data-preloader aria-hidden="true"><div class="preloader__inner"><img src="assets/img/brand/emblem.png" alt=""><div class="preloader__word">FISAT</div><div class="preloader__bar"><i></i></div><div class="preloader__note">Opening the gates · <span data-pct>0%</span></div></div></div>`;
  write('index.html', documentFor(p, main, {
    bodyClass: 'is-home',
    beforeHeader: pre0,
    extraHead: '<link rel="preload" as="image" href="assets/images/hero-video/frame-001.jpg">\n',
    scripts: '<script src="assets/js/hero.js" defer></script>',
  }), { title: 'Home', s: 'FISAT', f: true });
}

function eventHref(pre, e) {
  const n = D.news.find((x) => x.title.trim().toLowerCase() === e.title.trim().toLowerCase());
  return n ? `${pre}news/${n.slug}.html` : `${pre}news/events.html`;
}

/* =========================================================
   GENERIC + CUSTOM INNER PAGES
   ========================================================= */
const CUSTOM = {};

CUSTOM['academic-heads'] = (p) => {
  const pre = prefixFor(p.path);
  const heads = D.people.academicHeads.map((h) => `<article class="person-wide" data-reveal>${imgOK(h.img) ? `<img src="${pre}${localImg(h.img)}" alt="${esc(h.name)}" loading="lazy">` : ''}<div><h3>${esc(h.name)}</h3><span class="role">${esc(h.role)}</span><div class="bio">${fixContent(h.bio, pre)}</div></div></article>`).join('');
  const dh = D.people.deptHeads.map((x) => personCard(pre, { ...x, deptName: x.dept })).join('');
  return innerPage(p, `<h2 class="group-title">Academic Leadership</h2>${heads}<h2 class="group-title">Department Heads</h2><div class="people-grid">${dh}</div>`, { raw: true });
};

CUSTOM['administration'] = (p) => {
  const pre = prefixFor(p.path);
  const groups = [...new Set(D.people.administration.map((x) => x.group))];
  const body = groups.map((g) => { const ps = D.people.administration.filter((x) => x.group === g); return `<h2 class="group-title">${esc(g)} <small>${ps.length} people</small></h2><div class="people-grid">${ps.map((x) => personCard(pre, x)).join('')}</div>`; }).join('');
  return innerPage(p, body, { raw: true, intro: 'The offices that keep the campus running — operations, finance, systems, library, hostels and more.' });
};

CUSTOM['people-behind'] = (p) => {
  const pre = prefixFor(p.path);
  const body = `<p class="lead" style="max-width:70ch">FISAT is administered by the Federal Bank Officers’ Association Educational Society (FBOAES). These are the office bearers and members who steer it.</p><div class="people-grid" style="margin-top:32px">${D.people.peopleBehind.map((x) => personCard(pre, { ...x, email: x.email && x.email !== 'mail@fisat.ac.in' ? x.email : '' })).join('')}</div>`;
  return innerPage(p, body, { raw: true });
};

CUSTOM['faculty'] = (p) => {
  const pre = prefixFor(p.path);
  const opts = depts.map((d) => `<option value="${d.code}">${esc(deptName(d))}</option>`).join('');
  const list = [...D.faculty].sort((a, b) => a.name.replace(/^(Dr|Mr|Ms|Mrs|Prof|Lt)\.?\s+/gi, '').replace(/^(Dr|Mr|Ms|Mrs|Prof|Lt)\.?\s+/gi, '').localeCompare(b.name.replace(/^(Dr|Mr|Ms|Mrs|Prof|Lt)\.?\s+/gi, '').replace(/^(Dr|Mr|Ms|Mrs|Prof|Lt)\.?\s+/gi, '')));
  const cards = list.map((x) => personCard(pre, { ...x, filter: (x.name + ' ' + x.role + ' ' + x.deptName + ' ' + x.email).toLowerCase() })).join('');
  const body = `<div data-filter-list>
  <div class="toolbar"><label class="field">${ICON.search}<span class="sr-only">Search faculty</span><input type="search" placeholder="Search by name, designation or email" data-filter-q></label><select class="select" data-filter-dept aria-label="Department"><option value="">All departments</option>${opts}</select><span class="count" data-filter-count></span></div>
  <div class="people-grid">${cards}</div>
  <div class="empty-state" data-filter-empty hidden>No faculty match your search.</div>
</div>`;
  return innerPage(p, body, { raw: true, wide: true, intro: `${D.faculty.length} faculty members across nine departments. Search by name or filter by department.` });
};

CUSTOM['departments'] = (p) => {
  const pre = prefixFor(p.path);
  const body = `<div class="tiles">${depts.map((d, i) => `<a class="tile" href="${pre}departments/${d.code}.html" data-reveal style="--d:${i % 3};min-height:380px"><img src="${pre}${localImg(d.banner)}" alt="" loading="lazy"><div><div><span class="dept-card__code">${esc(d.short)}</span><h3 style="margin-top:8px">${esc(deptName(d))}</h3><p>${esc(firstSentence(d.intro, 140))}</p></div><span class="prog__arrow">${ICON.arrow}</span></div></a>`).join('')}</div>`;
  return innerPage(p, body, { raw: true, wide: true, heroImg: heroFor('departments'), intro: 'Six engineering departments, FISAT Business School, Computer Applications and Science & Humanities.' });
};

CUSTOM['programmes'] = (p) => {
  const pre = prefixFor(p.path);
  const body = `
<div class="section-head" style="margin-bottom:24px"><div><span class="kicker">Undergraduate</span><h2 class="h2">B.Tech programmes</h2><p class="lead">Affiliated to APJ Abdul Kalam Technological University; 8 semesters. Five of six core programmes accredited by the NBA.</p></div></div>
<div class="prog-grid">${programmeCards(pre, 'ug')}</div>
<div class="section-head" style="margin:72px 0 24px"><div><span class="kicker">Postgraduate</span><h2 class="h2">M.Tech, MBA &amp; MCA</h2><p class="lead">Four-semester postgraduate programmes affiliated to KTU, plus the Integrated MCA.</p></div></div>
<div class="prog-grid">${programmeCards(pre, 'pg')}</div>
<div class="section-head" style="margin:72px 0 24px"><div><span class="kicker">Doctoral</span><h2 class="h2">Ph.D research centres</h2><p class="lead">Departments recognised by KTU as research centres for Ph.D programmes.</p></div></div>
<div class="prog-grid">${programmeCards(pre, 'phd')}</div>`;
  return innerPage(p, body, { raw: true, wide: true });
};

/* news, events, announcements */
CUSTOM['news'] = (p) => {
  const pre = prefixFor(p.path);
  return innerPage(p, `<div class="cards">${D.news.map((n, i) => newsCard(pre, n, `${pre}news/${n.slug}.html`, i)).join('')}</div>`, { raw: true, wide: true, intro: 'Achievements, workshops, admissions and notices from across the campus.' });
};
CUSTOM['events'] = (p) => {
  const pre = prefixFor(p.path);
  return innerPage(p, `<div class="cards">${D.events.map((e, i) => newsCard(pre, e, eventHref(pre, e), i)).join('')}</div>`, { raw: true, wide: true, intro: 'Conferences, workshops, association days and talks.' });
};
CUSTOM['announcements'] = (p) => {
  const pre = prefixFor(p.path);
  return innerPage(p, `<div class="cards">${D.ann.map((a, i) => `<a class="card" href="${pre}${localImg(a.image)}" data-zoom="${pre}${localImg(a.image)}" data-reveal style="--d:${i % 4}"><div class="card__media"><img src="${pre}${localImg(a.image)}" alt="" loading="lazy"></div><div class="card__body"><h3>${esc(a.title)}</h3><span class="link-arrow">View ${ICON.arrow}</span></div></a>`).join('')}</div>`, { raw: true, wide: true, intro: 'Celebrating the people of FISAT — patents, doctorates and distinctions.' });
};

function buildNewsArticles() {
  const sec = sitemap.sections.find((s) => s.id === 'news');
  D.news.forEach((n, i) => {
    const p = { path: `news/${n.slug}.html`, title: titleCase(n.title), section: sec };
    const pre = prefixFor(p.path);
    const more = D.news.filter((x) => x !== n).slice(0, 3).map((x, j) => newsCard(pre, x, `${pre}news/${x.slug}.html`, j)).join('');
    const body = `<article class="article prose">${fixContent(n.body, pre) || `<p>${esc(n.title)}</p>`}</article>
<div class="related"><div class="section-head" style="margin-bottom:24px"><div><span class="kicker">Keep reading</span><h2 class="h3" style="margin-top:10px">More from the campus</h2></div><a class="link-arrow" href="${pre}news/index.html">All news ${ICON.arrow}</a></div><div class="cards">${more}</div></div>`;
    const html = documentFor({ ...p, sectionId: 'news' }, `${pageHero(pre, { title: p.title, crumbs: [{ label: 'News', href: 'news/index.html' }], img: imgOK(n.image) ? localImg(n.image) : heroFor('news'), blur: imgOK(n.image), intro: '', extra: `<div class="article-meta"><span class="chip">News</span><span>${esc(n.date)}</span></div>` })}
<div class="container page-body page-body--wide">${body}</div>`, { description: firstSentence(n.body, 150) || n.title });
    write(p.path, html, { title: p.title, s: 'News' });
  });
}

/* ---------- departments ---------- */
function buildDepartments() {
  const sec = { id: 'departments', title: 'Departments', pages: [] };
  for (const d of depts) {
    const p = { path: `departments/${d.code}.html`, title: deptName(d), sectionId: 'departments' };
    const pre = prefixFor(p.path);
    const S = d.sections;
    const fix = (h) => fixContent(h || '', pre);
    const tabs = [];
    const blocks = [];
    const add = (id, label, html) => { if (!html || strip(html).length < 20) return; tabs.push([id, label]); blocks.push(`<section class="dept-section" id="${id}"><div class="container">${html}</div></section>`); };

    const ugs = UG.filter((u) => u[3] === d.code);
    const pgs = PG.filter((u) => u[3] === d.code);
    const facts = [
      ...ugs.map((u) => [u[1], `B.Tech seats · ${u[0]}`]),
      ...pgs.map((u) => [u[2], `${u[0]} seats · ${u[1]}`]),
      [d.faculty.length || D.faculty.filter((f) => f.dept === d.code).length, 'Faculty members'],
      ...(d.milestones[0] ? [[d.milestones[0].year, 'Established']] : []),
    ];
    add('overview', 'Overview', `<div class="two-col"><div><span class="kicker">About the department</span><h2 class="h2" style="margin-top:14px">${esc(deptName(d))}</h2><div class="facts">${facts.map(([b, s]) => `<div><b>${esc(b)}</b><span>${esc(s)}</span></div>`).join('')}</div></div><div class="prose">${fix(d.intro)}</div></div>${d.milestones.length ? `<h3 class="h3" style="margin-top:56px">Milestones</h3><ol class="timeline">${d.milestones.map((m) => `<li><b>${esc(m.year)}</b><span>${esc(m.text)}</span></li>`).join('')}</ol>` : ''}`);
    if (S.vision) add('vision', 'Vision & Mission', `<span class="kicker">Purpose</span><h2 class="h2">Vision &amp; Mission</h2><div class="prose">${fix(S.vision)}</div>`);
    const progs = ['btech', 'programs', 'mtech', 'mba', 'mba-auto', 'mca', 'imca', 'phd'].filter((k) => S[k] && strip(S[k]).length > 60);
    if (progs.length) {
      const names = { btech: 'B.Tech', programs: 'Programmes Offered', mtech: 'M.Tech', mba: 'MBA', 'mba-auto': 'MBA (Autonomous)', mca: 'MCA (Two Year)', imca: 'Integrated MCA', phd: 'Ph.D' };
      add('programmes', 'Programmes', `<span class="kicker">Study here</span><h2 class="h2">Programmes</h2><div class="accordion">${progs.map((k, i) => `<details${i === 0 ? ' open' : ''}><summary>${names[k]}${ICON.plus}</summary><div class="acc-body prose">${fix(S[k])}</div></details>`).join('')}</div>`);
    }
    if (S.labs) add('labs', 'Labs', `<span class="kicker">Facilities</span><h2 class="h2">Laboratories</h2><div class="prose" style="max-width:none">${fix(S.labs)}</div>`);
    if (d.faculty.length) add('faculty', 'Faculty', `<span class="kicker">People</span><h2 class="h2">Faculty</h2><div class="people-grid">${d.faculty.map((x) => personCard(pre, x)).join('')}</div>`);
    if (S.placement || S.scope) add('careers', 'Careers', `<span class="kicker">Careers</span><h2 class="h2">Placement &amp; scope</h2><div class="two-col">${S.placement ? `<div class="prose"><h3>Placement</h3>${fix(S.placement)}</div>` : ''}${S.scope ? `<div class="prose"><h3>Scope of employment</h3>${fix(S.scope)}</div>` : ''}</div>`);
    if (d.testimonials.length) add('testimonials', 'Testimonials', `<span class="kicker">Alumni</span><h2 class="h2">Testimonials</h2><div class="quotes">${d.testimonials.map((q) => `<article class="quote"><blockquote>${esc(q.quote)}</blockquote><footer>${imgOK(q.img) ? `<img src="${pre}${localImg(q.img)}" alt="" loading="lazy">` : ''}<div><b>${esc(q.name)}</b><span>${esc(q.role)}</span></div></footer></article>`).join('')}</div>`);
    const extraKeys = [['director', "Director's Corner"], ['higher-studies', 'Higher Studies'], ['mous', 'MoUs'], ['student-achievements', 'Student Achievements'], ['events', 'Events'], ['techstaff', 'Technical Staff']].filter(([k]) => S[k] && strip(S[k]).length > 40);
    if (extraKeys.length) add('more', 'More', `<span class="kicker">More from ${esc(d.short)}</span><h2 class="h2">Achievements, MoUs &amp; more</h2><div class="accordion">${extraKeys.map(([k, l]) => `<details><summary>${l}${ICON.plus}</summary><div class="acc-body prose" style="max-width:none">${fix(S[k])}</div></details>`).join('')}</div>`);

    const others = depts.filter((x) => x !== d).slice(0, 8).map((x) => `<a href="${pre}departments/${x.code}.html">${esc(x.short)}</a>`).join('');
    const main = `${pageHero(pre, { title: deptName(d), kicker: 'Department of', crumbs: [{ label: 'Departments', href: 'departments/index.html' }], img: localImg(d.banner), intro: esc(firstSentence(d.intro, 200)) })}
<nav class="dept-tabs" aria-label="On this page" data-spy><div class="container">${tabs.map(([id, l], i) => `<a href="#${id}"${i === 0 ? ' class="is-active"' : ''}>${l}</a>`).join('')}</div></nav>
${blocks.join('\n')}
<section class="section--tight"><div class="container"><span class="kicker">Other departments</span><div class="btn-row" style="margin-top:16px">${depts.filter((x) => x !== d).map((x) => `<a class="chip chip--line" href="${pre}departments/${x.code}.html" style="padding:.6em 1em;font-size:.86rem">${esc(deptName(x))}</a>`).join('')}</div></div></section>`;
    write(p.path, documentFor(p, main, { description: firstSentence(d.intro, 155) }), { title: deptName(d), s: 'Department', f: true, k: d.short });
    void others;
  }
}

/* ---------- generic pages ---------- */
function buildSections() {
  for (const s of sitemap.sections) {
    for (const p of s.pages) {
      if (p.path === 'departments/index.html') { write(p.path, CUSTOM.departments({ ...p, section: sitemap.sections.find((x) => x.id === 'academics') }), { title: p.title, s: 'Academics', f: true }); continue; }
      const custom = p.custom && CUSTOM[p.custom];
      let html;
      if (custom) html = custom(p);
      else {
        const pre = prefixFor(p.path);
        let body = fixContent(content(p.path), pre);
        if (strip(body).length < 10) body = `<p>Details for <strong>${esc(p.title)}</strong> are published by the college office. Please contact <a href="mailto:mail@fisat.ac.in">mail@fisat.ac.in</a> or call 0484 2725272.</p>`;
        html = innerPage(p, body, { heroImg: heroFromContent(content(p.path)) || undefined });
      }
      write(p.path, html, { title: p.title, s: s.title, f: ['about/index.html', 'admissions/index.html', 'placements/index.html', 'academics/index.html', 'facilities/index.html', 'campus-life/index.html', 'governance/faculty.html', 'about/contact.html', 'library/index.html', 'research/index.html', 'news/index.html'].includes(p.path) });
    }
  }
}

/* ---------- search index ---------- */
function writeSearchIndex() {
  const idx = pages.map((p) => ({ t: p.title, s: p.s || '', u: p.path, ...(p.f ? { f: 1 } : {}), ...(p.k ? { k: p.k } : {}) }));
  for (const f of D.faculty) idx.push({ t: f.name, s: 'Faculty · ' + (depts.find((d) => d.code === f.dept)?.short || ''), u: `governance/faculty.html?q=${encodeURIComponent(f.name)}`, k: f.role + ' ' + f.email });
  fs.writeFileSync(path.join(ROOT, 'assets/js/search-index.js'), '/* generated by _build/build.mjs */\nwindow.FISAT_SEARCH=' + JSON.stringify(idx) + ';\n');
}

/* ---------- go ---------- */
buildHome();
buildSections();
buildDepartments();
buildNewsArticles();
writeSearchIndex();
console.log(`Built ${pages.length} pages.`);
