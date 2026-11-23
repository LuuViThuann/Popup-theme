"use client";

import { useEffect, useRef } from "react";
import { subscribe } from "@/lib/ticker";
import { budget } from "@/lib/perf";

export type SceneHooks<S> = {
  /** Build (or rebuild) state for a canvas of this size. */
  seed: (width: number, height: number) => S;
  /** Paint one frame. The context is already scaled to CSS pixels. */
  draw: (
    ctx: CanvasRenderingContext2D,
    state: S,
    width: number,
    height: number,
    now: number,
    dt: number,
  ) => void;
};

/**
 * Wires a <canvas> to the shared ticker: sizes its backing store to the
 * device pixel ratio allowed by the budget, reseeds on resize, and paints
 * through one subscription.
 *
 * Resize is debounced because a mobile browser fires it continuously while
 * the URL bar collapses, and reseeding a particle field on every one of those
 * frames is far more expensive than the resize itself.
 */
export function useCanvasScene<S>(hooks: SceneHooks<S>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hooksRef = useRef(hooks);
  hooksRef.current = hooks;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const { dpr } = budget();
    let width = 0;
    let height = 0;
    let state: S | null = null;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;

    const measure = () => {
      const host = canvas.parentElement;
      const rect = host?.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect?.width || window.innerWidth));
      const h = Math.max(1, Math.round(rect?.height || window.innerHeight));
      if (w === width && h === height) return;

      width = w;
      height = h;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      state = hooksRef.current.seed(w, h);
    };

    measure();

    const unsubscribe = subscribe((now, dt) => {
      if (!state) return;
      ctx.clearRect(0, 0, width, height);
      hooksRef.current.draw(ctx, state, width, height, now, dt);
    });

    const observer = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(measure, 160);
    });
    if (canvas.parentElement) observer.observe(canvas.parentElement);

    return () => {
      unsubscribe();
      observer.disconnect();
      clearTimeout(resizeTimer);
    };
  }, []);

  return canvasRef;
}
