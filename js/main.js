/* 2232.inc — site-wide interactions (hero, scroll type, header menu, reveal) */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Cinematic hero: scale + crossfade "3" + copy fade-in ---
  // The hero is wrapped in a tall .hero-wrap section. While the wrap is in view,
  // the inner .hero-sticky is pinned and its content animates based on how far
  // we've scrolled through the wrap (0 → 1).
  //
  // Progress ranges (p = 0..1 through the wrap): logo scale 0.32→1 and opacity 0.55→1
  // over 0..0.65 (eased), pink "3" 0.55..0.92, JP copy 0.78..0.94, EN copy 0.86..1.
  const heroWrap  = document.querySelector('[data-hero]');
  const heroStack = heroWrap?.querySelector('.hero-stack');
  const heroPink  = heroWrap?.querySelector('.hero-stack__img--pink');
  const heroJp    = heroWrap?.querySelector('.hero-copy .hero__sub-jp');
  const heroEn    = heroWrap?.querySelector('.hero-copy .hero__sub-en');

  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  const renderHero = () => {
    if (!heroWrap || !heroStack) return;
    const rect = heroWrap.getBoundingClientRect();
    const vh = window.innerHeight;
    const total = heroWrap.offsetHeight - vh;
    const traveled = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
    const p = traveled / Math.max(total, 1); // 0..1

    // logo: scale 0.32 → 1, opacity 0.55 → 1 across p 0..0.65 (eased)
    const scaleP = easeInOut(Math.min(p / 0.65, 1));
    const scale  = 0.32 + scaleP * 0.68;
    const op     = 0.55 + scaleP * 0.45;
    heroStack.style.transform = `scale(${scale.toFixed(4)})`;
    heroStack.style.opacity   = op.toFixed(3);

    // pink "3" crossfade: 0 → 1 across p 0.55..0.92 (slow, eased)
    const pinkRaw = Math.min(Math.max((p - 0.55) / 0.37, 0), 1);
    const pinkP   = easeInOut(pinkRaw);
    if (heroPink) heroPink.style.opacity = pinkP.toFixed(3);

    // copy: dramatic staggered fade-in with large rise (easeOutCubic)
    //   JP line  : p 0.78 → 0.94 (16% range)
    //   EN label : p 0.86 → 1.00 (14% range, delayed for stagger)
    const RISE_JP = 36;
    const RISE_EN = 28;
    if (heroJp) {
      const jpRaw = Math.min(Math.max((p - 0.78) / 0.16, 0), 1);
      const jpP   = easeOutCubic(jpRaw);
      heroJp.style.opacity   = jpP.toFixed(3);
      heroJp.style.transform = `translateY(${((1 - jpP) * RISE_JP).toFixed(2)}px)`;
    }
    if (heroEn) {
      const enRaw = Math.min(Math.max((p - 0.86) / 0.14, 0), 1);
      const enP   = easeOutCubic(enRaw);
      heroEn.style.opacity   = enP.toFixed(3);
      heroEn.style.transform = `translateY(${((1 - enP) * RISE_EN).toFixed(2)}px)`;
    }
  };

  if (heroWrap) {
    if (reduceMotion) {
      // render the final state immediately
      heroStack.style.transform = 'scale(1)';
      heroStack.style.opacity = '1';
      if (heroPink) heroPink.style.opacity = '1';
      if (heroJp) { heroJp.style.opacity = '1'; heroJp.style.transform = 'translateY(0)'; }
      if (heroEn) { heroEn.style.opacity = '1'; heroEn.style.transform = 'translateY(0)'; }
    } else {
      let heroTicking = false;
      const heroOnScroll = () => {
        if (!heroTicking) {
          window.requestAnimationFrame(() => { renderHero(); heroTicking = false; });
          heroTicking = true;
        }
      };
      window.addEventListener('scroll', heroOnScroll, { passive: true });
      window.addEventListener('resize', heroOnScroll);
      renderHero();
    }
  }

  // --- Scroll-driven parallax typography ---
  // Each [data-parallax] track is shifted by progress * delta + base,
  // where progress goes 0 → 1 as the section travels through the viewport.
  // Spec note: in a React/Next rebuild this maps directly to
  //   const { scrollYProgress } = useScroll({ target: ref, offset: ['start end','end start'] });
  //   const x = useTransform(scrollYProgress, [0,1], [base, base + delta]);
  const parallaxTracks = document.querySelectorAll('[data-parallax]');
  if (parallaxTracks.length && !reduceMotion) {
    const items = [...parallaxTracks].map((el) => ({
      el,
      section: el.closest('section') || el.parentElement,
      delta: parseFloat(el.dataset.parallax) || 0,
      base: parseFloat(el.dataset.base) || 0,
    }));

    let ticking = false;
    const apply = () => {
      const vh = window.innerHeight;
      for (const { el, section, delta, base } of items) {
        const rect = section.getBoundingClientRect();
        // progress: 0 when section's top hits viewport bottom, 1 when section's bottom leaves viewport top
        const range = vh + rect.height;
        const traveled = vh - rect.top;
        const progress = Math.max(0, Math.min(1, traveled / range));
        const x = base + delta * progress;
        el.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
      }
      ticking = false;
    };

    const onScrollOrResize = () => {
      if (!ticking) {
        window.requestAnimationFrame(apply);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);
    apply();
  } else if (reduceMotion) {
    parallaxTracks.forEach((el) => {
      const base = parseFloat(el.dataset.base) || 0;
      el.style.transform = `translate3d(${base}px, 0, 0)`;
    });
  }

  // --- Header burger toggle ---
  const header = document.querySelector('.header');
  const burger = document.querySelector('.header__burger');
  if (header && burger) {
    const setOpen = (open) => {
      header.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
    };
    burger.setAttribute('aria-expanded', 'false');
    burger.addEventListener('click', () => setOpen(!header.classList.contains('is-open')));
    // close on link tap in mobile overlay
    header.querySelectorAll('.header__nav a').forEach((a) => {
      a.addEventListener('click', () => setOpen(false));
    });
  }

  // --- Scroll reveal ---
  const targets = document.querySelectorAll('.reveal');
  if (targets.length && !reduceMotion && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    targets.forEach((t) => io.observe(t));
  } else {
    targets.forEach((t) => t.classList.add('is-visible'));
  }

  // --- Contact form (dummy submit) ---
  const form = document.querySelector('.contact-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      form.innerHTML = '<p style="font-size:24px;color:var(--ink-muted);padding:32px 0;">Thank you. We&rsquo;ll be in touch.</p>';
    });
  }
})();
