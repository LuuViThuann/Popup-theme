"use client";

import { useEffect, type RefObject } from "react";

/**
 * Publishes the pointer's offset from the element's centre as `--px` / `--py`
 * (in pixels, bounded by `range`). Children opt in by adding `.xm-par` and a
 * `--depth` multiplier, so one listener drives the whole parallax stack.
 */
export function useParallax(
  ref: RefObject<HTMLElement | null>,
  range = 22,
  enabled = true,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let raf = 0;
    let px = 0;
    let py = 0;

    const apply = () => {
      raf = 0;
      el.style.setProperty("--px", px.toFixed(2));
      el.style.setProperty("--py", py.toFixed(2));
    };

    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      px = ((event.clientX - rect.left) / rect.width - 0.5) * 2 * range;
      py = ((event.clientY - rect.top) / rect.height - 0.5) * 2 * range;
      if (!raf) raf = requestAnimationFrame(apply);
    };

    const onLeave = () => {
      px = 0;
      py = 0;
      if (!raf) raf = requestAnimationFrame(apply);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave);

    return () => {
      window.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ref, range, enabled]);
}
