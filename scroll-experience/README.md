# Scroll-driven film — Three.js

A self-contained website section where a video is **scrubbed by scroll**: it plays
forward as you scroll down and rewinds as you scroll up. The clip is decoded into a
GPU texture by [Three.js](https://threejs.org/) and drawn on a full-quad shader, framed
as a rounded panel on a clean gradient background with a hero headline above it.

## Run it

This page uses native ES modules, which browsers refuse to load over `file://`, so it
**must be served over HTTP**. From the repository root:

```sh
python3 -m http.server 8000
# then open http://localhost:8000/scroll-experience/
```

Any static server works (`npx serve`, `http-server`, nginx, GitHub Pages, …).

## How it works

- A tall `#experience` element creates the scroll distance; the `.stage` inside it is
  `position: sticky`, so the headline + panel stay pinned while you scroll.
- Scroll position is mapped to a target time `0 → duration`. Each animation frame the
  shown time is eased toward that target (`displayTime += (target − displayTime) * EASE`),
  which gives forward motion on scroll-down, reverse on scroll-up, with momentum.
- That eased time is written to `video.currentTime`; the decoded frame is uploaded to a
  `THREE.VideoTexture` and rendered. A scrubber bar + timecode reflect progress.
- The panel auto-sizes to the clip's real aspect ratio (read at runtime), and the whole
  stage is measured so it always fits in one screen — desktop down to mobile.

## Customising

| What | Where |
| --- | --- |
| Swap the clip | replace `assets/scene.mp4` (any browser-playable MP4/WebM) |
| Headline / copy | the `.hero` block in `index.html` |
| Gradient | the `--bg` custom property in the `<style>` block |
| Scroll length | `SCROLL_LENGTH` (viewports) in the module script |
| Scrub smoothing | `EASE` (lower = heavier/smoother) |

**Tip:** for the smoothest scrubbing, encode the clip with frequent keyframes, e.g.
`ffmpeg -i in.mp4 -g 1 -c:v libx264 -crf 20 -movflags +faststart assets/scene.mp4`
(a keyframe on every frame makes seeking instant).

## Third-party

`vendor/three.module.min.js` is Three.js r160, bundled locally so the page has **no
runtime CDN dependency**. See `vendor/THREE.LICENSE` (MIT).
