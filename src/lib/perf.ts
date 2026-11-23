/**
 * Environment facts the scene needs at runtime.
 *
 * Deliberately narrow. An earlier version of this file scaled the particle
 * counts, the bulb count and the film grain by a guessed device tier, which
 * is a fine way to hit a frame budget and the wrong trade here: the scene is
 * meant to look the same everywhere, so the only things read from the device
 * are the two the user has actually expressed a preference about (reduced
 * motion, pointer type) and the backing-store scale, which is capped exactly
 * where the original canvas capped it.
 *
 * Detection runs once, lazily, on first use - it touches `window`, so it must
 * not run during render on the server.
 */

export type Budget = {
  /** Canvas backing-store multiplier, capped at 2 as the original did. */
  dpr: number;
  /** Original cap on the star field; the count still scales with area. */
  stars: number;
  /** Original cap on the bokeh orbs. */
  bokeh: number;
  reduced: boolean;
  /** Pointer parallax only has anything to respond to with a real pointer. */
  pointer: boolean;
};

let cached: Budget | null = null;

function detect(): Budget {
  const mq = (q: string) =>
    typeof window !== "undefined" && window.matchMedia(q).matches;

  return {
    dpr: Math.min(
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
      2,
    ),
    stars: 230,
    bokeh: 26,
    reduced: mq("(prefers-reduced-motion: reduce)"),
    pointer: mq("(hover: hover) and (pointer: fine)"),
  };
}

export function budget(): Budget {
  if (!cached) cached = detect();
  return cached;
}
