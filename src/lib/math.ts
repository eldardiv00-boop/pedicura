export const clamp = (v: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, v));

/** Hermite smoothstep between two edges. */
export const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

/** Trapezoidal opacity envelope: ramps up a→b, holds, ramps down c→d. */
export const trapezoid = (
  p: number,
  a: number,
  b: number,
  c: number,
  d: number,
) => Math.min(smoothstep(a, b, p), 1 - smoothstep(c, d, p));

/** Linear interpolation. */
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
