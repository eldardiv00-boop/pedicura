# Pedicura™ — Premium Product Page

A ground-up, luxury-grade rebuild of the live product page
[`pedicura.co.il/product?variant=single`](https://www.pedicura.co.il/product?variant=single):
same section flow and content intent, radically upgraded design execution —
editorial typography, generous whitespace, GPU-accelerated micro-interactions,
GSAP scroll choreography and an interactive 3D product viewer.

**Stack:** HTML5 · Tailwind CSS · vanilla JS · GSAP 3 + ScrollTrigger · `<model-viewer>` — no build step required.

## Run it

```bash
# any static server works; for example:
npx serve .          # or: python3 -m http.server 8000
```

Open `http://localhost:3000` (or `:8000`). RTL Hebrew, fully responsive.

## Project structure

```
index.html            Full page — every section, commented, with an inline SVG icon sprite
css/custom.css        Design tokens, fluid type scale, keyframes, premium effects
css/input.css         Tailwind entry for the production build (instructions inside)
tailwind.config.js    Brand tokens for the Tailwind CLI (mirrors the inline CDN config)
js/config.js          ★ Product data, prices, real Shopify variant GIDs, asset/model paths
js/main.js            UI logic: header, gallery, 3D toggle, package selector, cart, FAQ…
js/animations.js      GSAP/ScrollTrigger motion layer (auto-disables on reduced motion)
assets/models/        Drop `pedicura-device.glb` here for the 360° viewer (see its README)
```

## Section map (mirrors the reference site's flow)

| # | Section | Premium upgrade |
|---|---------|-----------------|
| 0 | Announcement bar | Auto-rotating offers with soft cross-fade |
| 1 | Header / nav | Frosted-glass on scroll, hides on scroll-down, animated link underlines, full-screen staggered mobile menu |
| 2 | Hero / purchase | Masked word-by-word H1 reveal, photo gallery + lazy 360° viewer with skeleton, package selector cards, live-viewers pill, animated stock bar, magnetic CTA |
| 3 | «בין שתינו» empathy | Editorial serif headline with gradient highlight |
| 4 | «המדע מאחורי» 01–04 | Hover-tinted numbered list + sticky parallax figure |
| 5 | Tech specs | Floating product with scroll-scrubbed rotation, glowing spec cards |
| 6 | How it works | 3-step image cards with slow-zoom hovers |
| 7 | What's in the box | Checklist cards + gift banner |
| 8 | Comparison table | Highlighted brand column, RTL-sticky criteria column |
| 9 | Reviews | Score summary with count-up, rating distribution bars, CSS marquee of quotes, verified-purchase cards, load-more |
| 10 | FAQ | Buttery height-animated accordion |
| 11 | Finale | Dark plum + gold closing CTA with grain texture |
| 12 | Extras | Sticky mobile buy-bar, add-to-cart toast, JSON-LD product schema |

## Swapping in your own assets

- **Images** — all imagery currently points at the store's own Shopify CDN
  files (`cdn.shopify.com/...?width=NNN`). Replace the `src`/`data-full`
  URLs in `index.html`; sizes are requested via the `width` query param.
- **3D model** — drop a `.glb` at `assets/models/pedicura-device.glb`
  (details in `assets/models/README.md`). It only loads when the user opens
  the 360° tab.
- **Prices / packages** — edit `js/config.js`; every price on the page
  (hero, CTA, sticky bar, toast) updates from there.

## Wiring the cart to Shopify

The CTA currently shows a front-end toast. The real variant IDs are already
in `js/config.js`; to make it live on a Shopify storefront, replace the body
of `addToCart()` in `js/main.js` with:

```js
fetch('/cart/add.js', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: 45825935540397, quantity: 1 }), // numeric tail of the variant GID
});
```

## Production notes

- Swap the Tailwind Play CDN for a compiled stylesheet before going live —
  exact commands are at the top of `css/input.css`.
- All animations use `transform`/`opacity` only, scroll reveals fire once,
  and the whole motion layer turns itself off for `prefers-reduced-motion`
  users or if the GSAP CDN fails — content is never hidden.
- Below-the-fold images are `loading="lazy"`; the hero image is
  `fetchpriority="high"`; fonts and CDNs are preconnected.

## Fidelity notes

Sections 1–5 were mapped 1:1 from the reference page (structure, copy,
prices, package options, badges, stock bar). The reference page could not be
crawled from this environment beyond that point, so the remaining sections
(how-it-works, box contents, comparison, reviews, FAQ, finale) follow the
standard flow of this page type — trim or reorder freely; each section is an
independent, clearly-commented block in `index.html`.
