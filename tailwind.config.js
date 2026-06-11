/**
 * Pedicura™ — Tailwind configuration
 * ----------------------------------
 * Used by the Tailwind CLI for a production build (see README.md).
 * NOTE: the same token object is inlined in <head> of index.html for the
 * Play-CDN preview — keep both in sync when editing tokens.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './js/**/*.js'],
  theme: {
    extend: {
      /* ---- Brand palette: porcelain neutrals + deep plum + metallic gold ---- */
      colors: {
        ink: '#171120',          // near-black plum — primary text & CTA
        cream: '#FCFBF8',        // warm porcelain page background
        plum: {
          50:  '#FAF7FD',
          100: '#F4EEFB',
          200: '#E9DEF7',
          300: '#D6C2EF',
          400: '#B795E0',
          500: '#9A6ED1',
          600: '#7E52BD',
          700: '#67419E',
          800: '#4B2F75',
          900: '#332050',
          950: '#211438',
        },
        gold: {
          300: '#EBCF9C',
          400: '#DDB66E',
          500: '#CE9D4C',
          600: '#B98538',
        },
      },
      /* ---- Typography: editorial Hebrew serif + clean geometric sans ---- */
      fontFamily: {
        display: ['"Frank Ruhl Libre"', 'Georgia', 'serif'],
        body: ['Heebo', 'system-ui', 'sans-serif'],
      },
      /* ---- Soft, expensive shadows (no harsh black) ---- */
      boxShadow: {
        soft: '0 2px 20px -4px rgba(35, 22, 68, 0.08)',
        card: '0 1px 2px rgba(35, 22, 68, 0.04), 0 10px 28px -10px rgba(35, 22, 68, 0.12)',
        lift: '0 18px 44px -14px rgba(35, 22, 68, 0.22)',
        glow: '0 0 0 1px rgba(126, 82, 189, 0.14), 0 14px 44px -10px rgba(126, 82, 189, 0.38)',
        'inner-ring': 'inset 0 0 0 1px rgba(35, 22, 68, 0.06)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.75rem',
      },
      maxWidth: {
        page: '78rem',
      },
      transitionTimingFunction: {
        luxe: 'cubic-bezier(0.22, 1, 0.36, 1)', // expo-style ease-out
      },
      zIndex: {
        60: '60',
        70: '70',
        80: '80',
      },
    },
  },
  plugins: [],
};
