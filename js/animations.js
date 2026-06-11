/* ==========================================================================
   Pedicura™ — premium motion layer (GSAP 3 + ScrollTrigger)
   --------------------------------------------------------------------------
   Principles:
   · transform / opacity only → GPU-composited, no layout thrash
   · every scroll reveal fires once (`once: true`) — cheap after first pass
   · `prefers-reduced-motion` users (and any GSAP-load failure) get the page
     fully visible with zero animation — content is never hostage to motion
   · `html.anim-on` (added below, same tick as gsap.set) activates the CSS
     pre-hide states in css/custom.css, so there is no flash of motion
   ========================================================================== */

(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.matchMedia('(max-width: 1023px)').matches;

  /* Counters are useful feedback even without GSAP — tiny rAF fallback */
  const runCounterFallback = () => {
    document.querySelectorAll('[data-counter]').forEach((el) => {
      const target = parseFloat(el.dataset.counter || '0');
      const decimals = parseInt(el.dataset.decimals || '0', 10);
      el.textContent = target.toFixed(decimals) + (el.dataset.suffix || '');
    });
  };

  /* Bail out gracefully: no GSAP (offline/CDN block) or reduced motion */
  if (!window.gsap || !window.ScrollTrigger || reduceMotion) {
    runCounterFallback();
    return; // .anim-on is never added → CSS keeps everything visible
  }

  gsap.registerPlugin(ScrollTrigger);

  try {
    /* Activate CSS pre-hide states in the same synchronous tick as the
       initial gsap.set calls — no chance of a half-hidden paint. */
    document.documentElement.classList.add('anim-on');

    /* ================================================================
       1 · HERO ENTRANCE — cinematic staggered load
    ================================================================ */
    const heroTl = gsap.timeline({ defaults: { ease: 'power4.out' } });

    /* Headline words rise out of their clip masks.
       fromTo + immediateRender pins the start state in the same tick,
       cleanly replacing the CSS pre-hide (html.anim-on .w-inner). */
    heroTl.fromTo('.w-inner',
      { yPercent: 112, y: 0 },
      { yPercent: 0, duration: 1.05, stagger: 0.085, immediateRender: true },
      0.15
    );

    /* Media stage: soft clip + scale reveal */
    const stage = document.querySelector('[data-hero-media]');
    if (stage) {
      heroTl.fromTo(stage,
        { opacity: 0, clipPath: 'inset(6% 6% 6% 6% round 2rem)', scale: 0.97 },
        { opacity: 1, clipPath: 'inset(0% 0% 0% 0% round 2rem)', scale: 1, duration: 1.25, ease: 'expo.out' },
        0.1
      );
    }

    /* Buy-box elements cascade in */
    heroTl.fromTo('[data-hero-fade]',
      { opacity: 0, y: 26 },
      { opacity: 1, y: 0, duration: 0.85, stagger: 0.07, immediateRender: true },
      0.45
    );

    /* Thumbnails pop in last */
    heroTl.fromTo('[data-hero-thumbs] .thumb-btn',
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.05, immediateRender: true },
      0.9
    );

    /* ================================================================
       2 · SCROLL REVEALS — generic [data-reveal] system
       Variants: (default) up · "zoom" · "fade"
    ================================================================ */
    document.querySelectorAll('[data-reveal]').forEach((el) => {
      const kind = el.dataset.reveal || 'up';
      const from =
        kind === 'zoom' ? { opacity: 0, scale: 0.93, y: 24 } :
        kind === 'fade' ? { opacity: 0 } :
                          { opacity: 0, y: 36 };

      gsap.fromTo(el, from, {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
    });

    /* ================================================================
       3 · HEADER — ScrollTrigger handles nothing here (main.js owns it);
           kept separate so motion and logic never fight.
    ================================================================ */

    /* ================================================================
       4 · SCIENCE — slow parallax drift inside the sticky figure
    ================================================================ */
    const parallaxImg = document.querySelector('[data-parallax]');
    const parallaxWrap = document.querySelector('[data-parallax-wrap]');
    if (parallaxImg && parallaxWrap && !isMobile) {
      gsap.fromTo(parallaxImg,
        { yPercent: -7 },
        {
          yPercent: 7,
          ease: 'none',
          scrollTrigger: { trigger: parallaxWrap, start: 'top bottom', end: 'bottom top', scrub: 0.6 },
        }
      );
    }

    /* ================================================================
       5 · TECH — product gently rotates as you scroll past
           (the idle float is pure CSS: .float-slow)
    ================================================================ */
    const techRotate = document.querySelector('[data-tech-rotate]');
    if (techRotate) {
      gsap.fromTo(techRotate,
        { rotation: isMobile ? -3 : -7 },
        {
          rotation: isMobile ? 3 : 7,
          ease: 'none',
          scrollTrigger: { trigger: techRotate, start: 'top bottom', end: 'bottom top', scrub: 0.8 },
        }
      );
    }

    /* ================================================================
       6 · COUNTERS — 4.8 rating, 83% stock, etc.
    ================================================================ */
    document.querySelectorAll('[data-counter]').forEach((el) => {
      const target = parseFloat(el.dataset.counter || '0');
      const decimals = parseInt(el.dataset.decimals || '0', 10);
      const suffix = el.dataset.suffix || '';
      const state = { v: 0 };

      ScrollTrigger.create({
        trigger: el,
        start: 'top 90%',
        once: true,
        onEnter: () =>
          gsap.to(state, {
            v: target,
            duration: 1.6,
            ease: 'power2.out',
            onUpdate: () => (el.textContent = state.v.toFixed(decimals) + suffix),
          }),
      });
    });

    /* ================================================================
       7 · MAGNETIC CTAs — desktop fine-pointer only
    ================================================================ */
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      document.querySelectorAll('[data-magnetic]').forEach((btn) => {
        const strength = 8;
        const xTo = gsap.quickTo(btn, 'x', { duration: 0.4, ease: 'power3.out' });
        const yTo = gsap.quickTo(btn, 'y', { duration: 0.4, ease: 'power3.out' });

        btn.addEventListener('mousemove', (e) => {
          const r = btn.getBoundingClientRect();
          xTo(((e.clientX - r.left) / r.width - 0.5) * strength * 2);
          yTo(((e.clientY - r.top) / r.height - 0.5) * strength);
        });
        btn.addEventListener('mouseleave', () => { xTo(0); yTo(0); });
      });
    }
  } catch (err) {
    /* Any animation failure → make everything visible immediately */
    document.documentElement.classList.remove('anim-on');
    runCounterFallback();
    // eslint-disable-next-line no-console
    console.warn('[pedicura] animations disabled:', err);
  }
})();
