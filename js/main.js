/* ==========================================================================
   Pedicura™ — UI logic (vanilla JS, zero dependencies)
   --------------------------------------------------------------------------
   Modular init functions, each guarded so a missing element never throws.
   GSAP is NOT required here — everything in this file works standalone;
   premium scroll/load animations live in js/animations.js.
   ========================================================================== */

(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const cfg = window.PEDICURA || {};

  const formatPrice = (n) => `${n.toFixed(2)}${cfg.currency || '₪'}`;

  /* ------------------------------------------------------------------
     1 · Announcement bar — gentle rotating messages
  ------------------------------------------------------------------ */
  function initAnnouncements() {
    const items = $$('#announcement .announce-item');
    if (items.length < 2) return;
    let i = 0;
    setInterval(() => {
      items[i].classList.remove('is-active');
      i = (i + 1) % items.length;
      items[i].classList.add('is-active');
    }, cfg.ui?.announcementIntervalMs || 4200);
  }

  /* ------------------------------------------------------------------
     2 · Header — frosted glass after scroll, auto-hide on scroll-down
  ------------------------------------------------------------------ */
  function initHeader() {
    const header = $('#site-header');
    if (!header) return;

    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      const y = window.scrollY;
      header.classList.toggle('is-glass', y > 24);

      const delta = y - lastY;
      if (y > 420 && delta > 8 && !document.body.classList.contains('menu-open')) {
        header.classList.add('is-hidden');
      } else if (delta < -8 || y < 420) {
        header.classList.remove('is-hidden');
      }
      lastY = y;
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });
    update();
  }

  /* ------------------------------------------------------------------
     3 · Mobile menu — slide-in panel with staggered links
  ------------------------------------------------------------------ */
  function initMobileMenu() {
    const menu = $('#mobile-menu');
    const openBtn = $('#menu-open');
    const closeBtn = $('#menu-close');
    if (!menu || !openBtn) return;

    const open = () => {
      menu.classList.remove('hidden');
      requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
      document.body.classList.add('menu-open');
      document.body.style.overflow = 'hidden';
      openBtn.setAttribute('aria-expanded', 'true');
      closeBtn?.focus();
    };

    const close = () => {
      menu.classList.remove('is-open');
      document.body.classList.remove('menu-open');
      document.body.style.overflow = '';
      openBtn.setAttribute('aria-expanded', 'false');
      setTimeout(() => menu.classList.add('hidden'), 420);
      openBtn.focus();
    };

    openBtn.addEventListener('click', open);
    closeBtn?.addEventListener('click', close);
    $('.menu-backdrop', menu)?.addEventListener('click', close);
    $$('a', menu).forEach((a) => a.addEventListener('click', close));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !menu.classList.contains('hidden')) close();
    });
  }

  /* ------------------------------------------------------------------
     4 · Gallery — thumbnail crossfade + photos/3D segmented toggle
  ------------------------------------------------------------------ */
  function initGallery() {
    const stageImg = $('#stage-image');
    const thumbs = $$('#thumbs .thumb-btn');
    if (!stageImg || !thumbs.length) return;

    let swapping = false;
    const swapImage = async (src, label) => {
      if (swapping || stageImg.src === src) return;
      swapping = true;
      stageImg.style.opacity = '0';
      await new Promise((r) => setTimeout(r, 280));
      stageImg.src = src;
      if (label) stageImg.alt = label;
      try { await stageImg.decode(); } catch (_) { /* still show it */ }
      stageImg.style.opacity = '1';
      swapping = false;
    };

    thumbs.forEach((btn) => {
      btn.addEventListener('click', () => {
        thumbs.forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        swapImage(btn.dataset.full, btn.getAttribute('aria-label'));
        showPane('photos'); // selecting a thumb always returns to photo mode
      });
    });

    /* Arrow-key navigation between thumbnails (RTL aware via DOM order) */
    $('#thumbs')?.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const idx = thumbs.indexOf(document.activeElement);
      if (idx === -1) return;
      e.preventDefault();
      // In RTL, ArrowLeft moves forward through DOM order
      const dir = e.key === 'ArrowLeft' ? 1 : -1;
      const next = thumbs[(idx + dir + thumbs.length) % thumbs.length];
      next.focus();
      next.click();
    });

    /* ---- Photos ⇄ 3D segmented control ---- */
    const toggle = $('#media-toggle');
    const segThumb = $('#seg-thumb');
    const segBtns = $$('.seg-btn', toggle || undefined);
    const pane3d = $('#stage-3d');
    const mv = $('#mv');
    const skeleton = $('#mv-skeleton');
    const mvError = $('#mv-error');
    const mvHint = $('#mv-hint');
    let modelRequested = false;

    const positionSegThumb = (btn) => {
      if (!segThumb || !btn) return;
      segThumb.style.left = `${btn.offsetLeft}px`;
      segThumb.style.width = `${btn.offsetWidth}px`;
    };

    function showPane(mode) {
      if (!pane3d) return;
      const is3d = mode === '3d';
      pane3d.classList.toggle('hidden', !is3d);
      segBtns.forEach((b) => {
        const active = b.dataset.media === mode;
        b.setAttribute('aria-selected', String(active));
        b.classList.toggle('text-cream', active);
        b.classList.toggle('text-ink/70', !active);
        if (active) positionSegThumb(b);
      });

      /* Lazy-load the .glb only when the user actually asks for 3D —
         keeps the model entirely off the critical loading path. */
      if (is3d && mv && !modelRequested) {
        modelRequested = true;
        mv.addEventListener('load', () => skeleton?.classList.add('hidden'), { once: true });
        mv.addEventListener('error', () => {
          skeleton?.classList.add('hidden');
          mvHint?.classList.add('hidden');
          if (mvError) {
            mvError.classList.remove('hidden');
            mvError.classList.add('flex');
          }
        }, { once: true });
        /* Fade the drag hint after the first interaction */
        mv.addEventListener('camera-change', (e) => {
          if (e.detail?.source === 'user-interaction' && mvHint) {
            mvHint.style.transition = 'opacity .5s';
            mvHint.style.opacity = '0';
          }
        });
        mv.src = mv.dataset.src || cfg.model?.src;
      }
    }

    segBtns.forEach((b) => b.addEventListener('click', () => showPane(b.dataset.media)));
    window.addEventListener('resize', () => positionSegThumb(segBtns.find((b) => b.getAttribute('aria-selected') === 'true')));
    positionSegThumb(segBtns[0]);
  }

  /* ------------------------------------------------------------------
     5 · Package selector — syncs every price on the page
  ------------------------------------------------------------------ */
  function initPackageSelector() {
    const inputs = $$('#package-selector .pkg-input');
    if (!inputs.length) return;

    const priceCurrent = $('#price-current');
    const priceCompare = $('#price-compare');
    const priceSave = $('#price-save');
    const ctaPrices = $$('[data-cta-price]');

    const apply = (key) => {
      const v = cfg.variants?.[key];
      if (!v) return;
      if (priceCurrent) priceCurrent.textContent = formatPrice(v.price);
      if (priceCompare) priceCompare.textContent = formatPrice(v.compareAt);
      if (priceSave) priceSave.textContent = `חיסכון ${v.save.toFixed(2)}₪`;
      ctaPrices.forEach((el) => (el.textContent = formatPrice(v.price)));
    };

    inputs.forEach((input) => {
      input.addEventListener('change', () => input.checked && apply(input.value));
    });
    apply(inputs.find((i) => i.checked)?.value || 'single');
  }

  /* ------------------------------------------------------------------
     6 · Add to cart — toast feedback + cart badge
     ------------------------------------------------------------------
     Front-end only. To wire to Shopify, swap the body of `addToCart`
     with (numeric id = the tail of the variant GID in js/config.js):

       fetch('/cart/add.js', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ id: 45825935540397, quantity: 1 }),
       });
  ------------------------------------------------------------------ */
  function initAddToCart() {
    const toast = $('#toast');
    const toastVariant = $('#toast-variant');
    const toastPrice = $('#toast-price');
    const cartCount = $('#cart-count');
    let count = 0;
    let hideTimer = null;

    const addToCart = () => {
      const key = $('#package-selector .pkg-input:checked')?.value || 'single';
      const v = cfg.variants?.[key];
      if (!v) return;

      count += 1;
      if (cartCount) {
        cartCount.textContent = String(count);
        cartCount.classList.remove('hidden');
        cartCount.classList.add('grid');
      }

      if (toastVariant) toastVariant.textContent = v.label;
      if (toastPrice) toastPrice.textContent = formatPrice(v.price);
      if (toast) {
        clearTimeout(hideTimer);
        toast.classList.add('is-visible');
        hideTimer = setTimeout(
          () => toast.classList.remove('is-visible'),
          cfg.ui?.toastDurationMs || 4600
        );
      }
    };

    $$('[data-atc]').forEach((btn) => btn.addEventListener('click', addToCart));
  }

  /* ------------------------------------------------------------------
     7 · Sticky mobile buy-bar — shows once the hero CTA scrolls away
  ------------------------------------------------------------------ */
  function initStickyBar() {
    const bar = $('#sticky-bar');
    const sentinel = $('#add-to-cart');
    if (!bar || !sentinel || !('IntersectionObserver' in window)) return;

    new IntersectionObserver(
      ([entry]) => {
        const show = !entry.isIntersecting && entry.boundingClientRect.top < 0;
        bar.classList.toggle('is-visible', show);
        bar.setAttribute('aria-hidden', String(!show));
      },
      { threshold: 0 }
    ).observe(sentinel);
  }

  /* ------------------------------------------------------------------
     8 · FAQ accordion — buttery height animation, one open at a time
  ------------------------------------------------------------------ */
  function initFaq() {
    const items = $$('.faq-item');

    const closeItem = (item) => {
      const panel = $('.faq-panel', item);
      panel.style.height = `${panel.scrollHeight}px`;
      requestAnimationFrame(() => (panel.style.height = '0px'));
      item.classList.remove('is-open');
      $('.faq-trigger', item)?.setAttribute('aria-expanded', 'false');
    };

    const openItem = (item) => {
      const panel = $('.faq-panel', item);
      panel.style.height = `${panel.scrollHeight}px`;
      panel.addEventListener('transitionend', function onEnd(e) {
        if (e.propertyName !== 'height') return;
        if (item.classList.contains('is-open')) panel.style.height = 'auto';
        panel.removeEventListener('transitionend', onEnd);
      });
      item.classList.add('is-open');
      $('.faq-trigger', item)?.setAttribute('aria-expanded', 'true');
    };

    items.forEach((item) => {
      $('.faq-trigger', item)?.addEventListener('click', () => {
        const isOpen = item.classList.contains('is-open');
        items.filter((i) => i.classList.contains('is-open')).forEach(closeItem);
        if (!isOpen) openItem(item);
      });
    });
  }

  /* ------------------------------------------------------------------
     9 · Reviews — reveal the extra batch
  ------------------------------------------------------------------ */
  function initLoadReviews() {
    const btn = $('#load-reviews');
    if (!btn) return;
    btn.addEventListener('click', () => {
      $$('[data-more-review]').forEach((card, i) => {
        card.classList.remove('hidden');
        card.classList.add('flex');
        /* small entrance even without GSAP */
        card.style.opacity = '0';
        card.style.transform = 'translateY(16px)';
        setTimeout(() => {
          card.style.transition = 'opacity .5s ease, transform .6s cubic-bezier(.22,1,.36,1)';
          card.style.opacity = '1';
          card.style.transform = 'none';
        }, 60 * i);
      });
      btn.closest('div')?.classList.add('hidden');
    });
  }

  /* ------------------------------------------------------------------
     10 · Live viewers — subtle, believable drift
  ------------------------------------------------------------------ */
  function initLiveViewers() {
    const el = $('[data-viewers]');
    if (!el) return;
    const { min = 23, max = 31, intervalMs = 9000 } = cfg.ui?.liveViewers || {};
    let value = parseInt(el.textContent, 10) || 27;
    setInterval(() => {
      value = Math.min(max, Math.max(min, value + (Math.random() > 0.5 ? 1 : -1)));
      el.textContent = String(value);
    }, intervalMs);
  }

  /* ------------------------------------------------------------------
     11 · Progress fills (stock + review bars) — CSS transition driven,
          fired on first viewport entry. Independent of GSAP.
  ------------------------------------------------------------------ */
  function initProgressFills() {
    const fills = $$('.stock-fill');
    if (!fills.length) return;
    if (!('IntersectionObserver' in window)) {
      fills.forEach((f) => (f.style.width = `${f.dataset.stock || 0}%`));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          setTimeout(() => (el.style.width = `${el.dataset.stock || 0}%`), 150);
          io.unobserve(el);
        });
      },
      { threshold: 0.4 }
    );
    fills.forEach((f) => io.observe(f));
  }

  /* ------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', () => {
    initAnnouncements();
    initHeader();
    initMobileMenu();
    initGallery();
    initPackageSelector();
    initAddToCart();
    initStickyBar();
    initFaq();
    initLoadReviews();
    initLiveViewers();
    initProgressFills();
  });
})();
