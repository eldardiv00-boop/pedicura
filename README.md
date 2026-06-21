# Pedicura — Landing Page

A premium, modern landing page for the **Pedicura** electric pedicure tool,
featuring a **scroll-driven Three.js exploded-view reveal**. Built with
React + Vite + TypeScript + Tailwind CSS, optimized for Lovable.

## The scroll experience

The hero is a Three.js `<canvas>` that scrubs a 92-frame image sequence
(`public/frames/`) mapped to scroll position:

- Scroll **down** plays the product disassembly forward.
- Scroll **up** reverses it smoothly.
- Frame index is damped (`lerp`) for buttery, lag-free scrubbing, and the
  texture is only re-uploaded to the GPU when the frame actually changes.
- Layout fits **cover** on landscape and **contain** on portrait so every
  exploded component stays visible on phones.
- Respects `prefers-reduced-motion` (shows a static frame, no scrubbing).

The frames were extracted from the source product video; the original
Gemini watermark in the bottom-right corner was removed during extraction.

## Develop

```sh
npm install
npm run dev      # http://localhost:8080
```

## Build

```sh
npm run build
npm run preview
```

## Structure

```
index.html                 Vite entry + fonts
public/frames/             92 WebP frames of the exploded-view animation
src/
  App.tsx                  Page composition
  components/
    ScrollExperience.tsx   Three.js scroll-driven frame scrubber + hero
    Navbar.tsx             Sticky blur navigation
    Features.tsx           Stats strip + bento feature grid
    Reserve.tsx            Email reservation CTA
    Footer.tsx
    icons.tsx              Inline SVG icon set (no emoji)
  lib/math.ts              clamp / smoothstep / trapezoid / lerp helpers
```

## Import into Lovable

This project uses Lovable's native stack (Vite + React + TypeScript + Tailwind),
so it imports cleanly via GitHub two-way sync:

1. In Lovable, connect your GitHub account and grant access to this repo.
2. **New Project → Import from GitHub**, then select this repo and the
   `main` branch.

Notes for the import:

- The dev server runs on port **8080** (`vite.config.ts`), matching Lovable.
- `base` is only set to `/pedicura/` under GitHub Actions; locally and inside
  Lovable it stays `/`, so the preview works at the root.
- Frame asset URLs use `import.meta.env.BASE_URL`, so they resolve correctly
  regardless of the deploy path.
- The hero animation in `src/components/ScrollExperience.tsx` is hand-written
  Three.js/WebGL. It builds and runs fine, but prompt-driven edits to that
  specific file may be less reliable than to the standard React/Tailwind parts.

## Notes

- The previous browser game that lived in this repo is preserved under
  [`legacy/`](./legacy) and is no longer part of the build.
