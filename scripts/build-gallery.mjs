// Build /gallery/ (list) and /gallery/<key>.html (detail) from the AtRun works data.
//
// Usage:
//   cd scripts && npm i
//   node build-gallery.mjs [path/to/atrun-implementation]
//
// Source of truth is AtRun's docs/atrun-handoff/works.json and its captures.
// Re-run after works are added there; images are copied into assets/gallery/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDefaultJapaneseParser } from 'budoux';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.resolve(
  process.argv[2] ||
    path.join(process.env.HOME, 'Desktop/work-agents/tmp/atrun-implementation'),
);
const ORIGIN = 'https://2232.co.jp';
const TODAY = new Date().toISOString().slice(0, 10);

const works = JSON.parse(
  fs.readFileSync(path.join(SRC, 'docs/atrun-handoff/works.json'), 'utf8'),
);
// Descriptions are rewritten for 2232 so they don't duplicate AtRun's text.
// New works must get an entry in gallery-text.json before the build passes.
const rewritten = JSON.parse(
  fs.readFileSync(path.join(SITE, 'scripts/gallery-text.json'), 'utf8'),
);
const missing = works.filter((w) => !rewritten[w.key]).map((w) => w.key);
if (missing.length) {
  console.error(`gallery-text.json に未リライトの実績があります: ${missing.join(', ')}`);
  process.exit(1);
}
for (const w of works) w.text = rewritten[w.key];
const parser = loadDefaultJapaneseParser();

const esc = (v) =>
  String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
// Same rule as AtRun's Text.astro: ⏎ = line break, BudouX phrases joined by <wbr>.
const jp = (v) =>
  String(v)
    .split('⏎')
    .map((line) => parser.parse(line).map(esc).join('<wbr>'))
    .join('<br>');
const plain = (v) => String(v).replace(/⏎/g, '');
const pad = (n) => String(n).padStart(2, '0');

// ---------- Assets ----------
const thumbDir = path.join(SITE, 'assets/gallery/thumbs');
const fullDir = path.join(SITE, 'assets/gallery/full');
fs.mkdirSync(thumbDir, { recursive: true });
fs.mkdirSync(fullDir, { recursive: true });
for (const w of works) {
  fs.copyFileSync(
    path.join(SRC, 'public/assets/captures/thumbs', `${w.key}.webp`),
    path.join(thumbDir, `${w.key}.webp`),
  );
  fs.copyFileSync(
    path.join(SRC, 'public', w.capture),
    path.join(fullDir, `${w.key}${path.extname(w.capture)}`),
  );
}
const fullSrc = (w) => `/assets/gallery/full/${w.key}${path.extname(w.capture)}`;

// ---------- Shared shell ----------
const GTM_HEAD = `  <!-- Google Tag Manager -->
  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','GTM-WJV3VNJS');</script>
  <!-- End Google Tag Manager -->`;

const head = ({ title, description, url, image, jsonld }) => `<!DOCTYPE html>
<html lang="ja">
<head>
${GTM_HEAD}
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="canonical" href="${url}" />

  <!-- Favicon -->
  <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${url}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:locale" content="ja_JP" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${image}" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&family=Cormorant+Garamond:ital,wght@1,400;1,500&family=Noto+Sans+JP:wght@300;400;500&display=swap" rel="stylesheet" />

  <link rel="stylesheet" href="/css/style.css" />
${jsonld.map((j) => `  <script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n')}
</head>
<body>
  <!-- Google Tag Manager (noscript) -->
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-WJV3VNJS"
  height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
  <!-- End Google Tag Manager (noscript) -->
  <div class="grain" aria-hidden="true"></div>

  <header class="header">
    <a href="/" class="header__logo" aria-label="2232.inc">
      <img src="/assets/logo-white.svg" alt="2232.inc" class="header__logo-img" />
    </a>
    <button class="header__burger" aria-label="Menu" type="button">
      <span></span><span></span>
    </button>
    <nav class="header__nav" aria-label="Global">
      <a href="/about.html">About</a>
      <a href="/gallery/" class="is-active">Gallery</a>
    </nav>
  </header>
`;

const foot = `
  <footer class="footer">
    <p class="footer__brand" aria-label="2232.inc">
      <img src="/assets/logo-3-lime.svg" alt="2232.inc" class="footer__brand-img" />
    </p>
    <div class="footer__sns">
      <a href="/gallery/">Gallery</a>
    </div>
    <p class="footer__copy">© 2026 2232.inc — All Rights Reserved</p>
  </footer>

  <script src="/js/main.js"></script>
</body>
</html>
`;

const ARROW_OUT = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 12 12 4M4 4h8v8" stroke="currentColor" stroke-width="1.5"/></svg>`;

// Filter groups on the list page, keyed by the first tag (= site type).
const GROUPS = [
  ['recruit', 'Recruit', ['採用サイト', '採用ブランディング']],
  ['corporate', 'Corporate', ['コーポレートサイト']],
  ['brand', 'Brand', ['ブランドサイト', '製品サイト']],
  ['service', 'Service', ['サービスサイト', 'ECサイト']],
  ['campaign', 'Campaign', ['キャンペーン', 'キャンペーンサイト', '周年サイト', 'イベントサイト']],
  ['media', 'Media', ['オウンドメディア', '学校サイト']],
];
const groupOf = (w) =>
  (GROUPS.find(([, , t]) => t.includes(w.tags[0])) || ['others', 'Others'])[0];
const groupCount = (key) => works.filter((w) => groupOf(w) === key).length;

const tags = (w) =>
  `<span class="gallery-meta">${w.tags.map((t) => `<span>${esc(t)}</span>`).join('')}</span>`;

const PERSON = {
  '@type': 'Person',
  '@id': `${ORIGIN}/about.html#yuto-takegishi`,
  name: '竹岸勇人',
  alternateName: ['Yuto Takegishi', 'たけぎし　ゆうと'],
};

// Editorial rhythm for the Visual view (from the AIDesigner run 373b4bfa):
// [column span, column start, top offset px, large caption]. Repeats every 18 works.
// js/gallery.js re-applies it to the visible works when a filter is active.
const RHYTHM = [
  [9, 4, 0, 1], [4, 1, 0, 0], [6, 7, 128, 0], [8, 3, 64, 1], [6, 1, 0, 0], [4, 9, 96, 0],
  [8, 5, 32, 1], [4, 1, 64, 0], [6, 7, 160, 0], [7, 1, 64, 1], [4, 9, 32, 0], [5, 3, 96, 0],
  [5, 8, 48, 0], [8, 1, 128, 1], [3, 10, 96, 0], [6, 4, 128, 0], [7, 6, 64, 1], [8, 2, 96, 1],
];

// ---------- List ----------
const listUrl = `${ORIGIN}/gallery/`;
const listHtml =
  head({
    title: 'Gallery — 2232.inc（株式会社2232）| 竹岸勇人（たけぎし　ゆうと）の制作実績',
    description: `2232.inc（株式会社2232）代表 竹岸勇人（たけぎし　ゆうと / Yuto Takegishi）がプロデュースしたWebサイトの制作実績${works.length}件。採用サイト、コーポレートサイト、ブランドサイト、キャンペーンサイトなど。`,
    url: listUrl,
    image: `${ORIGIN}/assets/gallery/thumbs/${works[0].key}.webp`,
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Gallery — 2232.inc',
        url: listUrl,
        author: PERSON,
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: works.length,
          itemListElement: works.map((w, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${ORIGIN}/gallery/${w.key}.html`,
            name: plain(w.name),
          })),
        },
      },
    ],
  }) +
  `
  <main>
    <section class="container gallery-intro">
      <p class="about-intro__label">Gallery</p>
      <h1 class="gallery-intro__title">Selected <em>works.</em><span class="gallery-intro__count"><span data-gallery-count>${works.length}</span><small>Projects</small></span></h1>
      <p class="gallery-intro__lead" lang="ja">${jp('竹岸勇人（たけぎし　ゆうと）がプロデュースしたWebサイトの一部です。')}</p>
    </section>

    <section class="container gallery-list" data-gallery>
      <div class="gallery-bar">
        <div class="gallery-filter" role="group" aria-label="種類で絞り込む">
          <button type="button" class="gallery-filter__btn is-active" data-filter="all" aria-pressed="true">All<sup>${works.length}</sup></button>
${GROUPS.map(([key, label]) => `          <button type="button" class="gallery-filter__btn" data-filter="${key}" aria-pressed="false">${label}<sup>${groupCount(key)}</sup></button>`).join('\n')}
        </div>
        <div class="gallery-view" role="group" aria-label="表示の切り替え">
          <button type="button" class="gallery-view__btn is-active" data-view="visual" aria-pressed="true">Visual</button>
          <button type="button" class="gallery-view__btn" data-view="index" aria-pressed="false">Index</button>
        </div>
      </div>

      <ul class="gallery-visual" data-gallery-visual>
${works
  .map((w, i) => {
    const [span, start, mt, large] = RHYTHM[i % RHYTHM.length];
    return `        <li class="gallery-visual__item${large ? ' is-large' : ''}" data-group="${groupOf(w)}" style="--span:${span};--start:${start};--mt:${mt}px">
          <a class="gallery-work" href="/gallery/${w.key}.html">
            <span class="gallery-work__media"><img src="/assets/gallery/thumbs/${w.key}.webp" alt="${esc(plain(w.name))}" width="640" height="400" loading="${i < 4 ? 'eager' : 'lazy'}" decoding="async" /></span>
            <span class="gallery-work__caption">
              <span class="gallery-work__num">${pad(i + 1)}</span>
              <span class="gallery-work__text">
                <span class="gallery-work__title">${jp(w.name)}</span>
                ${tags(w)}
              </span>
            </span>
          </a>
        </li>`;
  })
  .join('\n')}
      </ul>

      <ol class="gallery-index" data-gallery-index hidden>
${works
  .map(
    (w, i) => `        <li data-group="${groupOf(w)}">
          <a class="gallery-index__row" href="/gallery/${w.key}.html" data-preview="/assets/gallery/thumbs/${w.key}.webp">
            <span class="gallery-index__num">${pad(i + 1)}</span>
            <span class="gallery-index__title">${jp(w.name)}</span>
            <span class="gallery-index__cat">${esc(w.tags[0])}</span>
            <span class="gallery-index__ind">${esc(w.tags.slice(1).join(' / '))}</span>
          </a>
        </li>`,
  )
  .join('\n')}
      </ol>
      <div class="gallery-preview" data-gallery-preview aria-hidden="true"><img alt="" width="640" height="400" /></div>
    </section>
  </main>
` +
  foot.replace('</body>', `  <script src="/js/gallery.js"></script>
</body>`);

fs.mkdirSync(path.join(SITE, 'gallery'), { recursive: true });
// Remove detail pages for works that no longer exist.
for (const f of fs.readdirSync(path.join(SITE, 'gallery'))) {
  if (f !== 'index.html' && !works.some((w) => `${w.key}.html` === f)) {
    fs.unlinkSync(path.join(SITE, 'gallery', f));
  }
}
fs.writeFileSync(path.join(SITE, 'gallery/index.html'), listHtml);

// ---------- Detail ----------
works.forEach((w, i) => {
  const prev = works[(i - 1 + works.length) % works.length];
  const next = works[(i + 1) % works.length];
  const url = `${ORIGIN}/gallery/${w.key}.html`;
  const name = plain(w.name);
  const link = w.button && w.url;
  const html =
    head({
      title: `${name} — Gallery | 2232.inc（株式会社2232）`,
      description: plain(w.text),
      url,
      image: `${ORIGIN}/assets/gallery/thumbs/${w.key}.webp`,
      jsonld: [
        {
          '@context': 'https://schema.org',
          '@type': 'CreativeWork',
          name,
          description: plain(w.text),
          url,
          image: `${ORIGIN}${fullSrc(w)}`,
          keywords: w.tags.join(', '),
          creator: PERSON,
          ...(link ? { sameAs: w.url } : {}),
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: '2232.inc', item: `${ORIGIN}/` },
            { '@type': 'ListItem', position: 2, name: 'Gallery', item: listUrl },
            { '@type': 'ListItem', position: 3, name, item: url },
          ],
        },
      ],
    }) +
    `
  <main>
    <article class="gallery-detail">
      <header class="container gallery-detail__head">
        <nav class="gallery-detail__crumb" aria-label="パンくず">
          <a href="/gallery/">Gallery</a><span aria-hidden="true">/</span><span>${esc(w.tags[0])}</span>
        </nav>
        <div class="gallery-detail__plate">
          <p class="gallery-detail__num" aria-label="No.${pad(i + 1)}">${pad(i + 1)}</p>
          <div class="gallery-detail__heading">
            <h1 class="gallery-detail__title">${jp(w.name)}</h1>
            ${tags(w)}
          </div>
        </div>
      </header>

      <figure class="container gallery-detail__capture">
        <img src="${fullSrc(w)}" alt="${esc(name)}" width="${w.width}" height="${w.height}" decoding="async" fetchpriority="high" />
      </figure>

      <section class="container gallery-detail__info">
        <p class="gallery-detail__text">${jp(w.text)}</p>
        <dl class="about-info__grid gallery-detail__spec">
          <dt>Category</dt><dd>${esc(w.tags[0])}</dd>${
            w.tags[1] ? `
          <dt>Industry</dt><dd>${esc(w.tags.slice(1).join(' / '))}</dd>` : ''
          }
          <dt>Role</dt><dd>${esc(w.role)}<span class="about-info__jp">Produce</span></dd>${
            link
              ? `
          <dt>Website</dt><dd><a class="gallery-detail__link" href="${esc(w.url)}" target="_blank" rel="noopener noreferrer">サイトを見る ${ARROW_OUT}</a></dd>`
              : ''
          }
        </dl>
      </section>

      <nav class="container gallery-next" aria-label="ほかの実績">
        <a class="gallery-next__main" href="/gallery/${next.key}.html">
          <span class="gallery-next__label">Next project</span>
          <span class="gallery-next__num">${pad(((i + 1) % works.length) + 1)}</span>
          <span class="gallery-next__name">${jp(next.name)}</span>
          <span class="gallery-next__thumb"><img src="/assets/gallery/thumbs/${next.key}.webp" alt="" width="640" height="400" loading="lazy" decoding="async" /></span>
        </a>
        <div class="gallery-next__sub">
          <a href="/gallery/${prev.key}.html" class="gallery-next__prev"><span class="gallery-next__arrow" aria-hidden="true">←</span><small>Prev</small>${jp(prev.name)}</a>
          <a href="/gallery/" class="closing__cta">All works</a>
        </div>
      </nav>
    </article>
  </main>
` +
    foot;
  fs.writeFileSync(path.join(SITE, 'gallery', `${w.key}.html`), html);
});

// ---------- Sitemap ----------
const smPath = path.join(SITE, 'sitemap.xml');
const sm = fs.readFileSync(smPath, 'utf8');
const keep = [...sm.matchAll(/<url>[\s\S]*?<\/url>/g)]
  .map((m) => m[0])
  .filter((u) => !u.includes('/gallery/'));
const entry = (loc, priority) => `<url>
    <loc>${loc}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>
  </url>`;
const urls = [
  ...keep,
  entry(listUrl, '0.8'),
  ...works.map((w) => entry(`${ORIGIN}/gallery/${w.key}.html`, '0.6')),
];
fs.writeFileSync(
  smPath,
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.join('\n  ')}
</urlset>
`,
);

console.log(`gallery: ${works.length} works → gallery/index.html + ${works.length} detail pages`);
