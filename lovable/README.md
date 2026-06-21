# Scroll-driven video section — for Lovable (React + Three.js)

`ScrollVideoSection.tsx` is a **single, self-contained React + TypeScript component**.
The clip scrubs with scroll — forward as you scroll down, reverse as you scroll up —
decoded into a `THREE.VideoTexture` and drawn on a cover shader, framed as a rounded
panel on a clean gradient background with a hero headline.

It needs **no Tailwind config and no external CSS** (all styles are scoped under the
`svs-` prefix), so it drops straight into a Lovable project.

## Add it to Lovable (3 steps)

1. **Add the dependency.** In the Lovable chat, say:
   > Add the npm packages `three` and `@types/three`.

   (Lovable usually also installs it automatically the first time it sees the import.)

2. **Create the component.** Add a new file `src/components/ScrollVideoSection.tsx`
   and paste in the contents of `ScrollVideoSection.tsx` from this folder.

3. **Add your video + use the component.** A ready-to-use clip is included in this
   folder as **`scene.mp4`** (4s, watermark removed, all-keyframe for smooth
   scrubbing) — drop it into the project's `public/` folder (so it's at
   `public/scene.mp4`), or use your own. Then render the section on a page —
   for example in `src/pages/Index.tsx`:

   ```tsx
   import ScrollVideoSection from "@/components/ScrollVideoSection";

   export default function Index() {
     return (
       <main>
         <ScrollVideoSection videoSrc="/scene.mp4" />
       </main>
     );
   }
   ```

That's it. You can place any other content above or below it — the playback progress
is measured from the section's own position on the page, so it behaves as a normal
section in a longer layout.

### Or just paste this prompt into Lovable

> Create `src/components/ScrollVideoSection.tsx` with the code I'm pasting, install
> the `three` and `@types/three` packages, add my video at `public/scene.mp4`, and
> render `<ScrollVideoSection videoSrc="/scene.mp4" />` on the home page.
> *(then paste the contents of `ScrollVideoSection.tsx`)*

## Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `videoSrc` | `string` | `"/scene.mp4"` | Path to your clip in `public/`, or any URL. |
| `eyebrow` | `string` | `"Three.js · Scroll-driven"` | Small label above the headline. |
| `title` | `ReactNode` | "Scroll the story **into motion**" | Headline; pass JSX for custom styling. |
| `subtitle` | `string` | … | Supporting line under the headline. |
| `scrollLength` | `number` | `6` | Page-height multiples of scroll that drive the clip (higher = slower scrub). |
| `ease` | `number` | `0.085` | Scrub smoothing, 0–1 (lower = heavier / smoother). |

```tsx
<ScrollVideoSection
  videoSrc="/my-clip.mp4"
  eyebrow="Our process"
  title={<>Watch it <span style={{ color: "#7be0ff" }}>come together</span></>}
  subtitle="Scroll to play the build, scroll back to rewind."
  scrollLength={7}
  ease={0.08}
/>
```

## Notes

- **Video format:** use a web-standard **H.264/AAC `.mp4`** (or `.webm`). It's served
  from `public/`, so reference it as `/yourfile.mp4`.
- **Smoothest scrubbing:** encode with frequent keyframes so seeking is instant:
  `ffmpeg -i in.mp4 -g 1 -c:v libx264 -crf 20 -movflags +faststart public/scene.mp4`
- **Aspect ratio** is detected at runtime — the panel auto-fits the clip with no
  cropping, and the whole stage is measured to fit one screen (desktop → mobile).
- **Fonts:** the component loads Inter + Space Grotesk from Google Fonts for the exact
  look, and falls back to system fonts if they're blocked.

Verified with `tsc` (React 18 + three r160) and at runtime: forward/reverse scrub is
frame-accurate, it works as a mid-page section, and it cleans up correctly under React
StrictMode (no duplicate WebGL canvas on remount).
