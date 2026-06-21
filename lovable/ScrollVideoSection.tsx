import { useEffect, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";

/**
 * ScrollVideoSection
 * ------------------
 * A scroll-driven film section: the clip plays forward as you scroll down and
 * rewinds as you scroll up. The video is decoded into a THREE.VideoTexture and
 * drawn on a full-quad cover shader, framed as a rounded panel on a clean
 * gradient background with a hero headline above it.
 *
 * Drop-in for Lovable (React + Vite + TS). No Tailwind config or external CSS
 * required — all styles are scoped below. Put your clip in /public and pass its
 * path as `videoSrc` (defaults to "/scene.mp4").
 */

type ScrollVideoSectionProps = {
  /** Path or URL to the clip. Put your file in /public, e.g. "/scene.mp4". */
  videoSrc?: string;
  eyebrow?: string;
  title?: ReactNode;
  subtitle?: string;
  /** How many viewport-heights of scrolling drive the clip (higher = slower). */
  scrollLength?: number;
  /** Scrub smoothing, 0..1 (lower = heavier / smoother). */
  ease?: number;
};

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap";

export default function ScrollVideoSection({
  videoSrc = "/scene.mp4",
  eyebrow = "Three.js · Scroll-driven",
  title = (
    <>
      Scroll the story{" "}
      <span
        style={{
          background: "linear-gradient(100deg,#8b7bff,#7be0ff)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        into motion
      </span>
    </>
  ),
  subtitle = "Every frame is bound to your scroll. Roll down to play it forward — roll back up to rewind.",
  scrollLength = 6,
  ease = 0.085,
}: ScrollVideoSectionProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const filmRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const tcurRef = useRef<HTMLElement>(null);
  const tdurRef = useRef<HTMLSpanElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // Load the display fonts once (optional; degrades to system fonts).
  useEffect(() => {
    if (document.getElementById("svs-fonts")) return;
    const link = document.createElement("link");
    link.id = "svs-fonts";
    link.rel = "stylesheet";
    link.href = FONT_HREF;
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    const video = videoRef.current;
    const panel = panelRef.current;
    const film = filmRef.current;
    const root = rootRef.current;
    const stage = stageRef.current;
    const hero = heroRef.current;
    const scrubber = scrubberRef.current;
    const cue = cueRef.current;
    const bar = barRef.current;
    if (!mount || !video || !panel || !film || !root || !stage || !hero || !scrubber || !cue || !bar) return;

    setReady(false);
    setFailed(false);
    video.muted = true; // required for autoplay/seek policies

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance" });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x05060d, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.Camera(); // quad drawn directly in clip space

    const texture = new THREE.VideoTexture(video);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const uniforms = {
      uTex: { value: texture },
      uTexAspect: { value: 16 / 9 },
      uPanelAspect: { value: 16 / 9 },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
      `,
      fragmentShader: `
        precision highp float;
        uniform sampler2D uTex;
        uniform float uTexAspect;
        uniform float uPanelAspect;
        varying vec2 vUv;
        void main() {
          vec2 s = (uPanelAspect > uTexAspect)
            ? vec2(1.0, uTexAspect / uPanelAspect)
            : vec2(uPanelAspect / uTexAspect, 1.0);
          vec2 uv = (vUv - 0.5) * s + 0.5;
          gl_FragColor = vec4(texture2D(uTex, uv).rgb, 1.0);
        }
      `,
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    quad.frustumCulled = false;
    scene.add(quad);

    // Fit the clip's aspect inside the space left over by the headline + chrome.
    let videoAspect = 16 / 9;
    const layoutPanel = () => {
      const cs = getComputedStyle(stage);
      const padV = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      const gap = parseFloat(cs.rowGap) || 0;
      const chrome =
        hero.offsetHeight + scrubber.offsetHeight + cue.offsetHeight + padV + gap * 2 + 18 + 8;
      const availH = Math.max(150, window.innerHeight - chrome);
      const availW = Math.min(window.innerWidth * 0.92, 1080);
      let w = availW;
      let h = w / videoAspect;
      if (h > availH) { h = availH; w = h * videoAspect; }
      w = Math.round(w); h = Math.round(h);
      film.style.width = `${w}px`;
      panel.style.height = `${h}px`;
      renderer.setSize(w, h, true);
      uniforms.uPanelAspect.value = w / h;
    };

    let duration = 0;
    let targetTime = 0;
    let displayTime = 0;
    let isReady = false;
    const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);
    const fmt = (s: number) => `${isFinite(s) ? s.toFixed(1) : "0.0"}s`;

    const onReady = () => {
      if (isReady) return;
      isReady = true;
      duration = video.duration && isFinite(video.duration) ? video.duration : 5;
      if (video.videoWidth && video.videoHeight) {
        videoAspect = video.videoWidth / video.videoHeight;
        uniforms.uTexAspect.value = videoAspect;
        layoutPanel();
      }
      if (tdurRef.current) tdurRef.current.textContent = fmt(duration);
      video.pause();
      try { video.currentTime = 0; } catch { /* ignore */ }
      setReady(true);
    };
    const onError = () => setFailed(true);

    video.addEventListener("loadeddata", onReady);
    video.addEventListener("canplay", onReady);
    video.addEventListener("error", onError);

    layoutPanel();
    window.addEventListener("resize", layoutPanel);

    // iOS/Safari often need one play→pause before frame-accurate seeking works.
    let primed = false;
    const prime = () => {
      if (primed) return;
      primed = true;
      const p = video.play();
      if (p && typeof p.then === "function") p.then(() => video.pause()).catch(() => {});
      else video.pause();
    };
    const primeEvents: string[] = ["pointerdown", "touchstart", "wheel", "keydown"];
    primeEvents.forEach((ev) =>
      window.addEventListener(ev, prime as EventListener, { once: true, passive: true })
    );

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);

      // Progress from this section's position, so it works anywhere on the page.
      const rect = root.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const progress = total > 0 ? clamp01(-rect.top / total) : 0;
      targetTime = progress * duration;

      // Ease the shown time toward the target → forward on down, reverse on up.
      displayTime += (targetTime - displayTime) * ease;

      if (isReady && duration > 0) {
        const t = Math.min(Math.max(displayTime, 0), duration - 0.001);
        if (!video.seeking && Math.abs(video.currentTime - t) > 0.015) {
          try { video.currentTime = t; } catch { /* ignore */ }
        }
        texture.needsUpdate = true;
      }

      cue.style.opacity = String(clamp01(1 - progress / 0.05));
      bar.style.transform = `scaleX(${progress.toFixed(4)})`;
      if (tcurRef.current) tcurRef.current.textContent = fmt(displayTime);

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(tick);

    video.load();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", layoutPanel);
      primeEvents.forEach((ev) => window.removeEventListener(ev, prime as EventListener));
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("canplay", onReady);
      video.removeEventListener("error", onError);
      texture.dispose();
      material.dispose();
      quad.geometry.dispose();
      renderer.dispose();
      renderer.domElement.parentNode?.removeChild(renderer.domElement);
    };
  }, [videoSrc, ease, scrollLength]);

  return (
    <section ref={rootRef} className="svs-root" style={{ height: `${scrollLength * 100}vh` }}>
      <style>{CSS}</style>

      <div ref={stageRef} className="svs-stage">
        <header ref={heroRef} className="svs-hero">
          <span className="svs-eyebrow">{eyebrow}</span>
          <h1 className="svs-title">{title}</h1>
          <p className="svs-sub">{subtitle}</p>
        </header>

        <div ref={filmRef} className="svs-film">
          <div ref={panelRef} className={`svs-panel${ready ? " is-ready" : ""}`}>
            <div ref={mountRef} className="svs-webgl" aria-hidden="true" />
          </div>
          <div ref={scrubberRef} className="svs-scrubber">
            <div className="svs-track"><div ref={barRef} className="svs-bar" /></div>
            <div className="svs-time">
              <b ref={tcurRef}>0.0s</b> / <span ref={tdurRef}>0.0s</span>
            </div>
          </div>
        </div>

        <div ref={cueRef} className="svs-cue"><span className="svs-mouse" /> Scroll to play</div>

        {!ready && !failed && (
          <div className="svs-overlay"><div className="svs-spinner" /><span>Loading film…</span></div>
        )}
        {failed && (
          <div className="svs-overlay svs-fallback">
            <p>This experience needs a WebGL-capable browser and a playable video.</p>
          </div>
        )}
      </div>

      <video ref={videoRef} className="svs-clip" playsInline muted preload="auto">
        <source src={videoSrc} type="video/mp4" />
      </video>
    </section>
  );
}

const CSS = `
.svs-root {
  position: relative;
  --svs-bg:
    radial-gradient(1200px 820px at 75% 8%, #2c2466 0%, rgba(44,36,102,0) 56%),
    radial-gradient(1100px 820px at 12% 92%, #103a54 0%, rgba(16,58,84,0) 58%),
    linear-gradient(165deg, #0d0f20 0%, rgba(7,9,19,0.5) 55%, #04050b 100%),
    #06070f;
}
.svs-stage {
  position: sticky; top: 0; height: 100vh; overflow: hidden;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: clamp(16px, 2.6vh, 30px);
  padding: clamp(14px, 3vh, 34px) clamp(16px, 4vw, 40px);
  text-align: center; color: #f4f5fb;
  font-family: "Inter", system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  background: var(--svs-bg);
}
.svs-hero { max-width: min(92vw, 680px); }
.svs-eyebrow {
  display: inline-block; font-size: clamp(11px, 1.05vw, 13px);
  letter-spacing: 0.32em; text-transform: uppercase; color: #8b7bff;
  margin: 0 0 14px; font-weight: 600;
}
.svs-title {
  font-family: "Space Grotesk", "Inter", system-ui, sans-serif; font-weight: 700;
  font-size: clamp(1.85rem, 4.4vw, 3.6rem); line-height: 1.04; letter-spacing: -0.02em;
  margin: 0; text-wrap: balance;
}
.svs-sub {
  margin: 16px auto 0; max-width: 46ch; font-size: clamp(0.95rem, 1.4vw, 1.12rem);
  line-height: 1.55; color: rgba(244,245,251,0.6);
}
.svs-film { position: relative; }
.svs-film::before {
  content: ""; position: absolute; inset: -8% -6%; z-index: -1; border-radius: 40px;
  background: radial-gradient(60% 60% at 50% 50%, rgba(139,123,255,0.28), transparent 70%);
  filter: blur(40px);
}
.svs-panel {
  position: relative; margin: 0 auto; border-radius: clamp(12px, 1.4vw, 20px);
  overflow: hidden; background: #05060d; opacity: 0;
  transform: translateY(14px) scale(0.985);
  transition: opacity 0.9s ease, transform 0.9s cubic-bezier(0.2,0.7,0.2,1);
  box-shadow: 0 1px 0 rgba(255,255,255,0.08) inset,
              0 40px 90px -30px rgba(0,0,0,0.85),
              0 0 0 1px rgba(255,255,255,0.06);
}
.svs-panel.is-ready { opacity: 1; transform: none; }
.svs-panel::after {
  content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.07);
  background: linear-gradient(180deg, rgba(255,255,255,0.06), transparent 22%);
}
.svs-webgl, .svs-webgl canvas { display: block; width: 100%; height: 100%; }
.svs-scrubber {
  width: 100%; display: flex; align-items: center; gap: 16px; margin-top: 18px;
  font-variant-numeric: tabular-nums;
}
.svs-track {
  position: relative; flex: 1; height: 3px; border-radius: 3px;
  background: rgba(255,255,255,0.12); overflow: hidden;
}
.svs-bar {
  position: absolute; inset: 0; transform-origin: 0 50%; transform: scaleX(0);
  border-radius: 3px; background: linear-gradient(90deg, #8b7bff, #7be0ff);
  box-shadow: 0 0 12px rgba(123,224,255,0.55);
}
.svs-time { font-size: 12px; letter-spacing: 0.12em; color: rgba(244,245,251,0.3); white-space: nowrap; }
.svs-time b { color: #f4f5fb; font-weight: 600; }
.svs-cue {
  display: flex; align-items: center; gap: 12px; font-size: 12px;
  letter-spacing: 0.22em; text-transform: uppercase; color: rgba(244,245,251,0.6);
}
.svs-mouse {
  width: 21px; height: 33px; flex: none; border: 1.5px solid rgba(244,245,251,0.5);
  border-radius: 11px; position: relative;
}
.svs-mouse::after {
  content: ""; position: absolute; left: 50%; top: 7px; width: 3px; height: 7px;
  margin-left: -1.5px; border-radius: 2px; background: #f4f5fb;
  animation: svs-wheel 1.6s ease-in-out infinite;
}
@keyframes svs-wheel {
  0% { opacity: 0; transform: translateY(-4px); }
  40% { opacity: 1; }
  100% { opacity: 0; transform: translateY(9px); }
}
.svs-clip { position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.svs-overlay {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  flex-direction: column; gap: 18px; background: var(--svs-bg);
  font-size: 13px; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(244,245,251,0.6);
}
.svs-spinner {
  width: 34px; height: 34px; border: 2px solid rgba(244,245,251,0.18);
  border-top-color: #8b7bff; border-radius: 50%; animation: svs-spin 0.9s linear infinite;
}
@keyframes svs-spin { to { transform: rotate(360deg); } }
.svs-fallback { text-transform: none; letter-spacing: normal; padding: 24px; text-align: center; }
.svs-fallback p { max-width: 40ch; line-height: 1.6; }
@media (prefers-reduced-motion: reduce) {
  .svs-panel { transition: opacity 0.4s ease; transform: none; }
  .svs-mouse::after { animation: none; }
}
`;
