/* 2232.inc — Gallery list: category filter, Visual / Index view, cursor preview */
(() => {
  const root = document.querySelector('[data-gallery]');
  if (!root) return;

  const filterButtons = root.querySelectorAll('[data-filter]');
  const viewButtons = root.querySelectorAll('[data-view]');
  const visual = root.querySelector('[data-gallery-visual]');
  const index = root.querySelector('[data-gallery-index]');
  // Visual view shows the works in a random order on every visit.
  // Plate numbers stay with each work (they match the detail pages); Index keeps number order.
  const visualItems = [...visual.children];
  for (let i = visualItems.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [visualItems[i], visualItems[j]] = [visualItems[j], visualItems[i]];
  }
  visual.append(...visualItems);
  visualItems.slice(0, 4).forEach((li) => li.querySelector('img')?.setAttribute('loading', 'eager'));
  const indexItems = [...index.children];
  const count = document.querySelector('[data-gallery-count]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Same rhythm as scripts/build-gallery.mjs, re-applied to the visible works only
  // so a filtered list keeps the editorial layout instead of leaving holes.
  const RHYTHM = [
    [9, 4, 0, 1], [4, 1, 0, 0], [6, 7, 128, 0], [8, 3, 64, 1], [6, 1, 0, 0], [4, 9, 96, 0],
    [8, 5, 32, 1], [4, 1, 64, 0], [6, 7, 160, 0], [7, 1, 64, 1], [4, 9, 32, 0], [5, 3, 96, 0],
    [5, 8, 48, 0], [8, 1, 128, 1], [3, 10, 96, 0], [6, 4, 128, 0], [7, 6, 64, 1], [8, 2, 96, 1],
  ];

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

  // Index view inverts the whole page (see html.is-inverted in style.css).
  const applyView = (view) => {
    visual.hidden = view !== 'visual';
    index.hidden = view !== 'index';
    document.documentElement.classList.toggle('is-inverted', view === 'index');
    press(viewButtons, 'view', view);
  };

  // State lives in the hash: #recruit, #index, #recruit/index
  const readHash = () => {
    const parts = location.hash.slice(1).split('/');
    const f = parts.find((p) => p && p !== 'index' && root.querySelector(`[data-filter="${p}"]`)) || 'all';
    const v = parts.includes('index') ? 'index' : 'visual';
    return [f, v];
  };
  const writeHash = () => {
    const f = root.querySelector('[data-filter].is-active')?.dataset.filter || 'all';
    const v = root.querySelector('[data-view].is-active')?.dataset.view || 'visual';
    const hash = [f !== 'all' ? f : '', v === 'index' ? 'index' : '']
      .filter(Boolean)
      .join('/');
    history.replaceState(null, '', hash ? `#${hash}` : location.pathname);
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

  const [initialFilter, initialView] = readHash();
  applyFilter(initialFilter); // also lays out the shuffled order
  if (initialView !== 'visual') applyView(initialView);

  // Visual view: rise in once when each work enters the viewport.
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        });
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    visualItems.forEach((li) => {
      li.classList.add('is-pending');
      io.observe(li);
    });
  }

  // Visual view: scroll parallax. From the moment a work enters the bottom of the
  // viewport it lags behind the scroll at its own random speed, so the thumbnails drift
  // down irregularly. Offsets are only ever downward (never up into the filter bar) and
  // capped so neighbours don't collide. Applied to the inner link so the li keeps its
  // true position for measuring (and for the reveal transition).
  if (!reduce) {
    const amp = window.matchMedia('(max-width: 768px)').matches ? 0.5 : 1;
    const MAX_SHIFT = 140;
    const works = visualItems.map((li) => ({
      li,
      el: li.querySelector('.gallery-work'),
      speed: 0.06 + Math.random() * 0.16, // 0.06–0.22 px per px scrolled since entering
    }));
    const onScreen = new Set();
    let ticking = false;
    const pio = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const w = works.find((x) => x.li === e.target);
          if (e.isIntersecting) onScreen.add(w);
          else onScreen.delete(w);
        });
        request(); // place works that just came into range
      },
      { rootMargin: '50% 0px' },
    );
    works.forEach((w) => pio.observe(w.li));
    const render = () => {
      ticking = false;
      if (visual.hidden) return;
      const vh = window.innerHeight;
      onScreen.forEach(({ li, el, speed }) => {
        const travelled = Math.max(0, vh - li.getBoundingClientRect().top);
        const y = Math.min(MAX_SHIFT * amp, travelled * speed * amp);
        el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
      });
    };
    function request() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(render);
      }
    }
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    viewButtons.forEach((b) => b.addEventListener('click', request));
    filterButtons.forEach((b) => b.addEventListener('click', request));
    request();
  }

  // Index view: screenshot follows the cursor (pointer devices only).
  const preview = root.querySelector('[data-gallery-preview]');
  const previewImg = preview?.querySelector('img');
  if (!preview || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  let x = 0;
  let y = 0;
  let px = 0;
  let py = 0;
  let raf = 0;
  const tick = () => {
    px += (x - px) * (reduce ? 1 : 0.15);
    py += (y - py) * (reduce ? 1 : 0.15);
    preview.style.transform = `translate3d(${px + 24}px, ${py + 24}px, 0)`;
    raf = Math.abs(x - px) + Math.abs(y - py) > 0.5 ? requestAnimationFrame(tick) : 0;
  };
  index.addEventListener('mousemove', (e) => {
    x = e.clientX;
    y = e.clientY;
    if (!raf) raf = requestAnimationFrame(tick);
  });
  index.querySelectorAll('[data-preview]').forEach((row) => {
    row.addEventListener('mouseenter', () => {
      previewImg.src = row.dataset.preview;
      preview.classList.add('is-on');
    });
    row.addEventListener('mouseleave', () => preview.classList.remove('is-on'));
  });
})();
