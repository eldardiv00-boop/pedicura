/* ==========================================================================
   Pedicura™ — central configuration
   --------------------------------------------------------------------------
   Single source of truth for product data, pricing and swappable assets.
   Swap any asset here (or in the matching <img> tags) without touching logic.
   Variant IDs are the REAL Shopify variant GIDs from shop.pedicura.co.il,
   so wiring the CTA to /cart/add later is a one-liner (see js/main.js).
   ========================================================================== */

window.PEDICURA = {
  currency: '₪',

  product: {
    title: 'מארז פדיקור מבית Pedicura™',
    ratingValue: 4.8,
    reviewCount: 2400,
  },

  /* Package options shown in the hero buy-box.
     `id` = Shopify variant GID · numeric part is what /cart/add expects. */
  variants: {
    single: {
      id: 'gid://shopify/ProductVariant/45825935540397',
      label: 'יחידה בודדת',
      price: 199.9,
      compareAt: 249.9,
      save: 50,
    },
    pair: {
      id: 'gid://shopify/ProductVariant/45920517521581',
      label: 'זוג מושלם',
      price: 349.8,
      compareAt: 499.8,
      save: 150,
    },
  },

  /* 3D viewer — drop your .glb at assets/models/pedicura-device.glb
     (or point `src` at any hosted model to test, e.g. the model-viewer
     sample: https://modelviewer.dev/shared-assets/models/Astronaut.glb) */
  model: {
    src: 'assets/models/pedicura-device.glb',
    alt: 'דגם תלת־ממדי של מכשיר הפדיקור Pedicura',
  },

  /* UI behaviour knobs */
  ui: {
    liveViewers: { min: 23, max: 31, intervalMs: 9000 },
    stockPercent: 83, // "אזל ב-83%"
    announcementIntervalMs: 4200,
    toastDurationMs: 4600,
  },
};
