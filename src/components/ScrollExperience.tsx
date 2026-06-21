import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { clamp, smoothstep, trapezoid } from "../lib/math";

/* -------------------------------------------------------------------------- */
/*  Frame sequence config                                                     */
/* -------------------------------------------------------------------------- */
const FRAME_COUNT = 92;
const IMG_W = 1920;
const IMG_H = 1080;
const framePath = (i: number) =>
  `${import.meta.env.BASE_URL}frames/frame_${String(i).padStart(3, "0")}.webp`;

/* Component callouts, timed to the exploded-view reveal (scroll progress). */
const CALLOUTS = [
  {
    range: [0.28, 0.36, 0.46, 0.54] as const,
    kicker: "Brushless core",
    title: "A motor tuned for silence",
    body: "High-torque brushless drive delivers salon-grade speed with near-zero vibration.",
  },
  {
    range: [0.5, 0.58, 0.66, 0.74] as const,
    kicker: "Smart control",
    title: "Reads your pressure, in real time",
    body: "An onboard sensor and OLED readout adapt intensity the instant skin resists.",
  },
  {
    range: [0.7, 0.78, 0.84, 0.9] as const,
    kicker: "All-day cell",
    title: "Weeks of care, one USB-C charge",
    body: "A dense lithium cell and fast USB-C charging keep Pedicura ready whenever you are.",
  },
];

export default function ScrollExperience() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Overlay refs (animated imperatively to avoid per-frame React renders)
  const heroRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const outroRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const calloutRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [loaded, setLoaded] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const imgAspect = IMG_W / IMG_H;

    /* ------------------------- renderer (webgl → 2d) ----------------------- */
    type Mode = "webgl" | "2d";
    let mode: Mode = "webgl";

    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let camera: THREE.OrthographicCamera | null = null;
    let texture: THREE.Texture | null = null;
    let material: THREE.MeshBasicMaterial | null = null;
    let mesh: THREE.Mesh | null = null;
    let ctx2d: CanvasRenderingContext2D | null = null;

    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
      });
      renderer.setPixelRatio(dpr);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setClearColor(0x000000, 0);

      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);

      texture = new THREE.Texture();
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;

      material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
      mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
      scene.add(mesh);
    } catch {
      // WebGL unavailable — gracefully fall back to a 2D-canvas scrubber
      mode = "2d";
      ctx2d = canvas.getContext("2d");
    }

    /* ----------------------- shared draw / fit state ----------------------- */
    let viewW = 0;
    let viewH = 0;
    let planeW = 0;
    let planeH = 0;
    let portraitBias = 0; // max downward shift on portrait (px)
    let offsetY = 0; // current downward shift, eased out as the reveal plays
    let currentImg: HTMLImageElement | null = null;

    const paint = (img: HTMLImageElement) => {
      currentImg = img;
      if (mode === "webgl" && renderer && scene && camera && texture) {
        texture.image = img;
        texture.needsUpdate = true;
        mesh?.position.set(0, -offsetY, 0);
        renderer.render(scene, camera);
      } else if (ctx2d) {
        ctx2d.clearRect(0, 0, viewW, viewH);
        ctx2d.drawImage(
          img,
          (viewW - planeW) / 2,
          (viewH - planeH) / 2 + offsetY,
          planeW,
          planeH,
        );
      }
    };

    const repaint = () => {
      if (currentImg) {
        paint(currentImg);
      } else if (mode === "webgl" && renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    };

    const fit = () => {
      viewW = canvas.clientWidth;
      viewH = canvas.clientHeight;
      if (viewW === 0 || viewH === 0) return;

      const viewAspect = viewW / viewH;
      // Portrait viewports "contain" (keep every exploded part visible);
      // landscape viewports "cover" for a seamless full-bleed hero.
      const contain = viewAspect < 1;
      portraitBias = contain ? viewH * 0.14 : 0;
      offsetY = portraitBias;
      if (contain) {
        if (viewAspect > imgAspect) {
          planeH = viewH;
          planeW = viewH * imgAspect;
        } else {
          planeW = viewW;
          planeH = viewW / imgAspect;
        }
      } else if (viewAspect > imgAspect) {
        planeW = viewW;
        planeH = viewW / imgAspect;
      } else {
        planeH = viewH;
        planeW = viewH * imgAspect;
      }

      if (mode === "webgl" && renderer && camera && mesh) {
        renderer.setSize(viewW, viewH, false);
        camera.left = -viewW / 2;
        camera.right = viewW / 2;
        camera.top = viewH / 2;
        camera.bottom = -viewH / 2;
        camera.updateProjectionMatrix();
        mesh.scale.set(planeW, planeH, 1);
        mesh.position.set(0, -offsetY, 0);
      } else if (ctx2d) {
        canvas.width = Math.round(viewW * dpr);
        canvas.height = Math.round(viewH * dpr);
        ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      repaint();
    };

    /* ------------------------------ preloading ----------------------------- */
    const images: HTMLImageElement[] = [];
    let loadedCount = 0;
    let firstDrawn = false;

    const onOneLoaded = (i: number, img: HTMLImageElement) => {
      loadedCount += 1;
      setLoaded(loadedCount);
      if (!firstDrawn && i === 0) {
        firstDrawn = true;
        fit();
        paint(img);
      }
      if (loadedCount >= FRAME_COUNT) setReady(true);
    };

    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.decoding = "async";
      images[i] = img;
      const done = () => onOneLoaded(i, img);
      img.onerror = done; // don't stall the loader on a hiccup
      img.src = framePath(i);
      // Fully decode each frame up front. Otherwise the browser may decode a
      // 1080p WebP the first time it's shown mid-scroll, which is the main
      // source of scroll-scrub jank.
      if (typeof img.decode === "function") {
        img.decode().then(done).catch(() => {
          if (img.complete) done();
          else img.onload = done;
        });
      } else {
        img.onload = done;
      }
    }

    /* ---------------------------- scroll progress -------------------------- */
    const computeProgress = () => {
      const rect = section.getBoundingClientRect();
      const dist = section.offsetHeight - window.innerHeight;
      if (dist <= 0) return 0;
      return clamp(-rect.top / dist);
    };

    const setOpacity = (
      el: HTMLElement | null,
      opacity: number,
      translateY = 0,
    ) => {
      if (!el) return;
      el.style.opacity = opacity.toFixed(3);
      el.style.transform = `translate3d(0, ${translateY.toFixed(1)}px, 0)`;
      el.style.pointerEvents = opacity > 0.5 ? "auto" : "none";
    };

    const updateOverlay = (p: number) => {
      const heroOut = smoothstep(0.04, 0.16, p);
      setOpacity(heroRef.current, 1 - heroOut, -34 * heroOut);
      if (hintRef.current)
        hintRef.current.style.opacity = (1 - smoothstep(0, 0.07, p)).toFixed(3);

      CALLOUTS.forEach((c, i) => {
        const op = trapezoid(p, c.range[0], c.range[1], c.range[2], c.range[3]);
        setOpacity(calloutRefs.current[i], op, (1 - op) * 14);
      });

      const outro = smoothstep(0.9, 0.985, p);
      setOpacity(outroRef.current, outro, (1 - outro) * 18);

      if (barRef.current)
        barRef.current.style.transform = `scaleX(${p.toFixed(4)})`;
    };

    /* ------------------------------ animation ------------------------------ */
    let raf = 0;
    let current = 0;
    let lastIdx = -1;
    let lastT = performance.now();

    const drawFrame = (idx: number) => {
      const img = images[idx];
      if (img && img.complete && img.naturalWidth > 0) paint(img);
    };

    const loop = (t: number) => {
      const p = computeProgress();
      updateOverlay(p);
      // Product rests low at the hero (room for copy), then rises to center
      // as the exploded reveal plays.
      offsetY = portraitBias * (1 - smoothstep(0, 0.2, p));
      const target = p * (FRAME_COUNT - 1);
      // Frame-rate-independent damping: the scrub tracks the scroll tightly
      // (less perceived lag) and feels identical at 60 and 120 Hz.
      const dt = Math.min((t - lastT) / 16.667, 3);
      lastT = t;
      current += (target - current) * (1 - Math.pow(1 - 0.2, dt));
      if (Math.abs(target - current) < 0.004) current = target;
      const idx = clamp(Math.round(current), 0, FRAME_COUNT - 1);
      if (idx !== lastIdx) {
        drawFrame(idx);
        lastIdx = idx;
      }
      raf = requestAnimationFrame(loop);
    };

    const onResize = () => fit();
    window.addEventListener("resize", onResize);
    fit();

    const cleanup = () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      material?.dispose();
      mesh?.geometry.dispose();
      texture?.dispose();
      renderer?.dispose();
    };

    if (prefersReduced) {
      // No scroll-scrubbing: show a representative exploded frame; copy stays put.
      updateOverlay(0);
      const staticIdx = Math.round(FRAME_COUNT * 0.7);
      offsetY = 0;
      const t = window.setInterval(() => {
        if (loadedCount >= FRAME_COUNT) {
          drawFrame(staticIdx);
          window.clearInterval(t);
        }
      }, 120);
      return () => {
        window.clearInterval(t);
        cleanup();
      };
    }

    raf = requestAnimationFrame(loop);
    return cleanup;
  }, []);

  const pct = Math.round((loaded / FRAME_COUNT) * 100);

  return (
    <section
      ref={sectionRef}
      className="relative h-[420vh]"
      aria-label="Pedicura product reveal"
    >
      {/* Pinned stage */}
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* Three.js (WebGL) canvas — falls back to 2D canvas automatically.
            White backdrop matches the white-background frames in every viewport
            (incl. portrait "contain" letterboxing). */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block h-full w-full bg-white"
        />

        {/* Top scroll-progress bar */}
        <div className="absolute inset-x-0 top-0 z-30 h-[3px] bg-transparent">
          <div
            ref={barRef}
            className="h-full origin-left bg-gradient-to-r from-accent-400 to-accent-700"
            style={{ transform: "scaleX(0)" }}
          />
        </div>

        {/* Hero copy */}
        <div className="pointer-events-none absolute inset-0 z-20 flex items-start pt-24 sm:items-center sm:pt-0">
          <div
            ref={heroRef}
            className="mx-auto w-full max-w-6xl px-6 will-change-transform sm:px-10"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-900/10 bg-white/60 px-3.5 py-1.5 text-xs font-medium tracking-wide text-zinc-600 backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
              Pedicura · Generation 02
            </span>
            <h1 className="mt-6 max-w-3xl text-balance text-5xl font-extrabold leading-[0.95] tracking-tightest text-zinc-900 sm:text-7xl lg:text-8xl">
              Beauty,{" "}
              <span className="font-serif italic font-normal gradient-text">
                engineered
              </span>{" "}
              to the core.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-600 sm:text-xl">
              The electric pedicure tool that brings the salon home — precision
              brushless power, smart pressure sensing, and a finish you can feel.
            </p>
            <div className="pointer-events-auto mt-9 flex flex-wrap items-center gap-4">
              <a
                href="#reserve"
                className="group inline-flex items-center gap-2 rounded-full bg-zinc-900 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-zinc-900/10 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-zinc-800 hover:shadow-xl"
              >
                Reserve yours
                <svg
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M3 8h10M9 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
              <a
                href="#how"
                className="inline-flex items-center gap-2 rounded-full border border-zinc-900/15 bg-white/50 px-7 py-3.5 text-sm font-semibold text-zinc-800 backdrop-blur-md transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/80"
              >
                See how it works
              </a>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div
          ref={hintRef}
          className="pointer-events-none absolute inset-x-0 bottom-7 z-20 flex flex-col items-center gap-2 text-zinc-500"
        >
          <span className="text-[11px] font-medium uppercase tracking-[0.2em]">
            Scroll to disassemble
          </span>
          <svg
            className="h-5 w-5 animate-bounce"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12 5v14M6 13l6 6 6-6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Timed component callouts */}
        {CALLOUTS.map((c, i) => (
          <div
            key={c.kicker}
            className="pointer-events-none absolute inset-x-0 bottom-16 z-20 flex justify-center px-6 sm:bottom-20"
          >
            <div
              ref={(el) => {
                calloutRefs.current[i] = el;
              }}
              className="w-full max-w-md rounded-2xl border border-zinc-900/10 bg-white/70 p-5 text-center opacity-0 shadow-xl shadow-zinc-900/5 backdrop-blur-md will-change-transform"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-600">
                {c.kicker}
              </span>
              <h3 className="mt-1.5 text-xl font-bold tracking-tight text-zinc-900">
                {c.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">
                {c.body}
              </p>
            </div>
          </div>
        ))}

        {/* Outro line */}
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div ref={outroRef} className="px-6 text-center opacity-0">
            <h2 className="text-balance text-4xl font-extrabold tracking-tightest text-zinc-900 sm:text-6xl">
              Every component,
              <br />
              <span className="gradient-text">considered.</span>
            </h2>
            <a
              href="#reserve"
              className="pointer-events-auto mt-7 inline-flex items-center gap-2 rounded-full bg-zinc-900 px-7 py-3.5 text-sm font-semibold text-white shadow-lg transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-zinc-800"
            >
              Reserve yours
            </a>
          </div>
        </div>
      </div>

      {/* Loading veil */}
      <div
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#fafafa] transition-opacity duration-700 ${
          ready ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
        aria-hidden={ready}
      >
        <div className="text-sm font-medium tracking-wide text-zinc-500">
          Pedicura
        </div>
        <div className="mt-4 h-[3px] w-44 overflow-hidden rounded-full bg-zinc-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-400 to-accent-700 transition-[width] duration-200 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-3 text-xs tabular-nums text-zinc-400">{pct}%</div>
      </div>
    </section>
  );
}
