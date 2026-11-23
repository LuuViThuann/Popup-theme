/**
 * One requestAnimationFrame loop for every canvas on the page.
 *
 * The scene paints two particle canvases that sandwich the content. Given a
 * loop each they would schedule two callbacks per frame, each with its own
 * timestamp bookkeeping, and - worse - neither could be stopped while the tab
 * is hidden without duplicating that logic too. One driver keeps the
 * per-frame overhead flat no matter how many layers subscribe, and gives a
 * single place to park the whole scene when nobody is looking at it.
 */

type Frame = (now: number, dt: number) => void;

const subscribers = new Set<Frame>();
let raf = 0;
let last = 0;

function loop(now: number) {
  // Clamp: returning from a backgrounded tab otherwise hands every subscriber
  // a multi-second delta and teleports the particles.
  const dt = last ? Math.min(0.064, (now - last) / 1000) : 0.016;
  last = now;

  for (const fn of subscribers) fn(now, dt);

  raf = subscribers.size ? requestAnimationFrame(loop) : 0;
}

function start() {
  if (raf || !subscribers.size) return;
  if (typeof document !== "undefined" && document.hidden) return;
  last = 0;
  raf = requestAnimationFrame(loop);
}

function stop() {
  if (!raf) return;
  cancelAnimationFrame(raf);
  raf = 0;
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });
}

export function subscribe(fn: Frame): () => void {
  subscribers.add(fn);
  start();
  return () => {
    subscribers.delete(fn);
    if (!subscribers.size) stop();
  };
}
