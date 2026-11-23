/**
 * Pre-rendered particle art.
 *
 * The bokeh orbs behind the stars are the same soft circle over and over.
 * Building one with a fresh `createRadialGradient` every frame for every orb
 * - which is what the field used to do - is the most expensive way there is
 * to draw a blurred dot. Rendered once into an offscreen canvas and replayed
 * with `drawImage`, the same field costs one textured blit per orb.
 */

const cache = new Map<string, HTMLCanvasElement>();

function surface(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  return [c, c.getContext("2d")!];
}

/** Soft coloured orb, for the bokeh drifting behind the stars. */
export function glowSprite(size: number, rgb: string): HTMLCanvasElement {
  const key = `glow:${size}:${rgb}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const [canvas, ctx] = surface(size);
  const c = size / 2;
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
  grad.addColorStop(0, `rgba(${rgb}, 1)`);
  grad.addColorStop(0.45, `rgba(${rgb}, 0.35)`);
  grad.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  cache.set(key, canvas);
  return canvas;
}
