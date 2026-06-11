# 3D model placeholder

The interactive 360° viewer in the hero gallery expects a glTF binary here:

```
assets/models/pedicura-device.glb   ← drop your model with exactly this name
```

## How it behaves

- The `.glb` is **lazy-loaded** — it is only fetched the first time a user
  taps the «360°» toggle, so it never slows down the initial page load.
- While streaming, a shimmering skeleton + spinner is shown.
- If the file is missing or fails to load, the viewer shows a graceful
  fallback message and the photo gallery keeps working as usual.

## Don't have a model yet?

- Test the viewer with any hosted sample, e.g. model-viewer's
  `https://modelviewer.dev/shared-assets/models/Astronaut.glb` —
  set it as `model.src` in `js/config.js` (or the `data-src` attribute of
  `<model-viewer id="mv">` in `index.html`).
- To create one: photogrammetry apps (Polycam, Luma AI, RealityScan) can
  produce a `.glb` from ~30 phone photos of the device. Keep it under
  ~3–5 MB (Draco compression recommended) for fast streaming.
