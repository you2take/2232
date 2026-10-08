/* 2232.inc — Gallery list: random order, category filter, Visual / Index view,
   reveal on enter, scroll parallax, Index cursor preview.
   Markup comes from scripts/build-gallery.mjs. */
(() => {
  const root = document.querySelector('[data-gallery]');
  if (!root) return;

  const html = document.documentElement;
  const filterButtons = root.querySelectorAll('[data-filter]');
  const viewButtons = root.querySelectorAll('[data-view]');
  const visual = root.querySelector('[data-gallery-visual]');
  const index = root.querySelector('[data-gallery-index]');
  const indexItems = [...index.children];
  const count = document.querySelector('[data-gallery-count]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrow = window.matchMedia('(max-width: 768px)');

  // Editorial layout pattern [column span, column start, top offset px, large caption],
  // written once by the generator. Re-applied to the visible works so a shuffled or
  // filtered list keeps the rhythm instead of leaving holes.
  const RHYTHM = JSON.parse(visual.dataset.rhythm);

  // Visual view shows the works in a random order on every visit. Plate numbers stay
  // with each work (they match the detail pages); Index keeps number order.
  const visualItems = [...visual.children];
  for (let i = visualItems.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [visualItems[i], visualItems[j]] = [visualItems[j], visualItems[i]];
  }
  visual.append(...visualItems);

  const press = (buttons, attr, value) => {
    buttons.forEach((b) => {
      const on = b.dataset[attr] === value;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    });
  };

  const applyFilter = (key) => {
    let n = 0;
    visualItems.forEach((li) => {
      const show = key === 'all' || li.dataset.group === key;
      li.hidden = !show;
      if (!show) return;
      const [span, start, mt, large] = RHYTHM[n % RHYTHM.length];
      li.style.setProperty('--span', span);
      li.style.setProperty('--start', start);
      li.style.setProperty('--mt', `${mt}px`);
      li.classList.toggle('is-large', Boolean(large));
      n++;
    });
    indexItems.forEach((li) => {
      li.hidden = !(key === 'all' || li.dataset.group === key);
    });
    press(filterButtons, 'filter', key);
    if (count) count.textContent = String(n);
  };

  // Index view inverts the whole page (html.is-inverted in style.css). `instant` skips
  // the 600ms theme transition when the state comes from the URL rather than a click.
  const applyView = (view, instant = false) => {
    if (instant) html.classList.add('is-instant');
    visual.hidden = view !== 'visual';
    index.hidden = view !== 'index';
    html.classList.toggle('is-inverted', view === 'index');
    press(viewButtons, 'view', view);
    if (instant) requestAnimationFrame(() => requestAnimationFrame(() => html.classList.remove('is-instant')));
  };

  // State lives in the hash: #recruit, #index, #recruit/index
  const readHash = () => {
    const parts = location.hash.slice(1).split('/');
    const filter = parts.find((p) => p && p !== 'index' && root.querySelector(`[data-filter="${p}"]`)) || 'all';
    const view = parts.includes('index') ? 'index' : 'visual';
    return [filter, view];
  };
  const writeHash = () => {
    const filter = root.querySelector('[data-filter].is-active')?.dataset.filter || 'all';
    const view = root.querySelector('[data-view].is-active')?.dataset.view || 'visual';
    const hash = [filter !== 'all' ? filter : '', view === 'index' ? 'index' : ''].filter(Boolean).join('/');
    history.replaceState(null, '', hash ? `#${hash}` : location.pathname + location.search);
  };
  const applyHash = (instant) => {
    const [filter, view] = readHash();
    applyFilter(filter);
    applyView(view, instant);
  };

  filterButtons.forEach((b) =>
    b.addEventListener('click', () => {
      applyFilter(b.dataset.filter);
      writeHash();
    }),
  );
  viewButtons.forEach((b) =>
    b.addEventListener('click', () => {
      applyView(b.dataset.view);
      writeHash();
    }),
  );
  window.addEventListener('hashchange', () => applyHash(false));
  applyHash(true); // also lays out the shuffled order

  if (!reduce && 'IntersectionObserver' in window) setupMotion();

  function setupMotion() {
    // Visual view: reveal once when each work enters the viewport (wipe + caption rise, see CSS).
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    visualItems.forEach((li) => {
      li.classList.add('is-pending');
      io.observe(li);
    });

    // Visual view: scroll parallax. From the moment a work enters the bottom of the
    // viewport it lags behind the scroll at its own random speed, so the thumbnails drift
    // down irregularly. Offsets are only ever downward (never up into the filter bar) and
    // capped so neighbours don't collide (half on narrow screens). Applied to the inner link
    // so the li keeps its true position for measuring.
    const MAX_SHIFT = 140;
    const works = new Map(
      visualItems.map((li) => [li, { el: li.querySelector('.gallery-work'), speed: 0.06 + Math.random() * 0.16 }]),
    );
    const onScreen = new Set();
    let ticking = false;
    const render = () => {
      ticking = false;
      if (visual.hidden) return;
      const vh = window.innerHeight;
      const amp = narrow.matches ? 0.5 : 1;
      onScreen.forEach((li) => {
        const { el, speed } = works.get(li);
        const travelled = Math.max(0, vh - li.getBoundingClientRect().top);
        const y = Math.min(MAX_SHIFT, travelled * speed) * amp;
        el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
      });
    };
    const request = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(render);
    };
    const pio = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => (e.isIntersecting ? onScreen.add(e.target) : onScreen.delete(e.target)));
        request(); // place works that just came into range (also after filter / view changes)
      },
      { rootMargin: '50% 0px' },
    );
    visualItems.forEach((li) => pio.observe(li));
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
  }

  // Index view: screenshot follows the cursor (pointer devices only).
  const preview = root.querySelector('[data-gallery-preview]');
  if (!preview || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const previewImg = new Image(640, 400);
  previewImg.alt = '';
  preview.append(previewImg);

  let x = 0;
  let y = 0;
  let px = 0;
  let py = 0;
  let raf = 0;
  const place = () => {
    preview.style.transform = `translate3d(${px + 24}px, ${py + 24}px, 0)`;
  };
  const ease = reduce ? 1 : 0.15;
  const tick = () => {
    px += (x - px) * ease;
    py += (y - py) * ease;
    place();
    raf = Math.abs(x - px) + Math.abs(y - py) > 0.5 ? requestAnimationFrame(tick) : 0;
  };
  index.addEventListener('mousemove', (e) => {
    x = e.clientX;
    y = e.clientY;
    if (!raf) raf = requestAnimationFrame(tick);
  });
  index.querySelectorAll('[data-preview]').forEach((row) => {
    row.addEventListener('mouseenter', (e) => {
      if (!preview.classList.contains('is-on')) {
        // Start at the cursor instead of easing in from the corner.
        x = px = e.clientX;
        y = py = e.clientY;
        place();
      }
      previewImg.src = row.dataset.preview;
      preview.classList.add('is-on');
    });
    row.addEventListener('mouseleave', () => preview.classList.remove('is-on'));
  });
})();
