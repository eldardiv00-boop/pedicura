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

## Notes

- The previous browser game that lived in this repo is preserved under
  [`legacy/`](./legacy) and is no longer part of the build.
