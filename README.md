# FISAT — website redesign

A static rebuild of [fisat.ac.in](https://fisat.ac.in/) in plain HTML, CSS and JavaScript. There's no backend and no framework.

The home page opens on a scroll-driven walk through the FISAT gates: scrolling scrubs a 50-frame sequence on a canvas, past the arch and the gatehouse to the main block.

## Quick start

You need [Node.js](https://nodejs.org/) 18 or newer. There are no dependencies to install.

```bash
npm start          # rebuild every page, then serve at http://127.0.0.1:5173
npm run build      # rebuild pages only
npm run serve      # serve only (add -- --port 8080 for another port)
```

Opening `index.html` straight from disk also works, but a local server is closer to how the site behaves once deployed.

## Project layout

| Path | What |
| --- | --- |
| `index.html` | Home page with the walk-in hero |
| `about/` `governance/` `academics/` `departments/` `admissions/` `placements/` `facilities/` `library/` `campus-life/` `research/` `industry/` `iqac/` `info/` `news/` | All inner pages (generated) |
| `assets/css/main.css` | Design system and every component |
| `assets/js/hero.js` | Frame-sequence engine: scroll → canvas, cross-fading adjacent frames |
| `assets/js/main.js` | Header, mega menu, search (Ctrl+K), reveals, tabs, rails, lightbox, faculty filter |
| `assets/js/search-index.js` | Search index (generated) |
| `assets/images/hero-video/` | The 50 hero frames |
| `assets/images/` | Original campus photos |
| `assets/img/fisat/` | Images from fisat.ac.in, resized to WebP |
| `assets/img/campus/` `assets/img/brand/` | Prepared campus photos, emblem and favicon |
| `assets/vendor/lenis.min.js` | Smooth-scroll library, bundled locally |
| `_build/build.mjs` | Page generator (templates for every page type) |
| `_build/serve.mjs` | Zero-dependency local preview server |
| `_build/sitemap.json` | Sections, pages, menus and old-URL mapping |
| `_build/content/` | Cleaned page content, one HTML fragment per page |
| `_build/data/` | Structured data: departments, faculty, people, news, events |

## Editing content

The pages are generated so that the header, footer, menus and search stay consistent across all ~170 of them. Don't edit the generated `.html` files directly; edit the sources and rebuild:

- **Page text:** `_build/content/<section>__<page>.html`
- **Departments, faculty, news, people:** `_build/data/*.json`
- **Adding a page or changing the menus:** `_build/sitemap.json`
- **Layouts and components:** `_build/build.mjs`, `assets/css/main.css`

Then run `npm run build`. Commit the sources and the regenerated pages together.

## Deploying

The repository root is the website, so any static host works.

- **GitHub Pages:** go to *Settings → Pages → Deploy from a branch*, then pick `main` and `/ (root)`. `.nojekyll` makes Pages serve every file as-is.
- **Netlify / Vercel / Cloudflare Pages:** no build command is needed and the publish directory is the repo root. Or set the build command to `npm run build`.

## Repository conventions

- `.gitattributes` stores text with LF line endings and marks images as binary. It also flags generated and vendored files so GitHub diffs and language stats stay readable.
- `.editorconfig` gives every editor the same encoding, line endings and indentation.
- `.gitignore` excludes OS/editor clutter, `node_modules`, logs, caches and `.env` files.

## Credits

Content, photographs and logos belong to the Federal Institute of Science And Technology (FISAT) and were sourced from fisat.ac.in for this redesign. Smooth scrolling uses [Lenis](https://github.com/darkroomengineering/lenis) (MIT).
