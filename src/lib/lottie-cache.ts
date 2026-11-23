import { SCENE, type SceneKey } from "@/lib/scene";

export type LottieData = Record<string, unknown>;

type Entry = {
  promise: Promise<LottieData>;
  data?: LottieData;
  /** How many animations have been handed this composition. */
  taken: number;
};

const entries = new Map<string, Entry>();

/* -------------------------------------------------------------------------- *
 * Yielding
 *
 * The compositions run from 85KB to 544KB of JSON. Parsing them is a single
 * uninterruptible native call, and firing all of them off together - which is
 * what Promise.all over fetch().json() does - stacks those calls into one
 * long task that blocks the first frame outright. So the fetches still run in
 * parallel (the network likes that) but the parses are drained one at a time
 * with a yield between each, which is what lets the reveal animation keep
 * painting while the rest of the scene is still arriving.
 * -------------------------------------------------------------------------- */

type Scheduler = { yield?: () => Promise<void> };

function breathe(): Promise<void> {
  const s = (globalThis as { scheduler?: Scheduler }).scheduler;
  if (typeof s?.yield === "function") return s.yield();
  return new Promise((resolve) => setTimeout(resolve, 0));
}

type Job = { priority: number; run: () => Promise<void> };

const queue: Job[] = [];
let draining = false;

async function drain() {
  if (draining) return;
  draining = true;
  while (queue.length) {
    // Re-sorted each pass: a later high-priority request (the gift box the
    // curtain is waiting on) must be able to jump a queue of ambient layers
    // that were asked for first.
    queue.sort((a, b) => b.priority - a.priority);
    const job = queue.shift()!;
    await job.run();
    if (queue.length) await breathe();
  }
  draining = false;
}

function enqueue(priority: number, run: () => Promise<void>) {
  queue.push({ priority, run });
  void drain();
}

/* -------------------------------------------------------------------------- */

/**
 * Fetches and parses a composition once, process-wide.
 *
 * `priority` orders the parse queue only - higher goes first. The fetch
 * itself starts immediately either way.
 */
export function loadLottie(src: string, priority = 0): Promise<LottieData> {
  const existing = entries.get(src);
  if (existing) return existing.promise;

  const url = encodeURI(src);
  // Kick the network off now, outside the parse queue.
  const response = fetch(url, { cache: "force-cache" });

  const promise = new Promise<LottieData>((resolve, reject) => {
    enqueue(priority, async () => {
      try {
        const res = await response;
        if (!res.ok) throw new Error(`Lottie ${src} failed: ${res.status}`);
        const data = (await res.json()) as LottieData;
        const entry = entries.get(src);
        if (entry) entry.data = data;
        resolve(data);
      } catch (err) {
        // Let a later mount retry rather than caching the failure forever.
        entries.delete(src);
        reject(err);
      }
    });
  });

  entries.set(src, { promise, taken: 0 });
  return promise;
}

/**
 * The copy to hand to `lottie.loadAnimation`.
 *
 * lottie-web writes its own bookkeeping into the data it is given, so two
 * animations cannot share one object. They *can* share it when there is only
 * ever one animation, which is the case for every composition in this scene -
 * so the first caller gets the parsed object itself and only a second mount
 * of the same source pays for a clone. That matters: structuredClone on the
 * 544KB gallop cycle is tens of milliseconds, and it used to happen on every
 * single layer at once.
 */
export async function takeLottie(
  src: string,
  priority = 0,
): Promise<LottieData> {
  const data = await loadLottie(src, priority);
  const entry = entries.get(src);
  if (!entry) return data;
  entry.taken += 1;
  return entry.taken === 1 ? data : structuredClone(data);
}

/** True once the composition is parsed and a mount would not have to wait. */
export function isLoaded(src: string): boolean {
  return entries.get(src)?.data !== undefined;
}

/**
 * Warms compositions in the order the choreography reaches them.
 *
 * Nothing here is awaited by the curtain except what is passed to
 * `preloadCritical`; the rest lands while the opening act is already playing.
 */
export function preloadScene(keys: SceneKey[], priority = 0) {
  for (const key of keys) void loadLottie(SCENE[key].src, priority).catch(() => {});
}

/** The compositions the first beat cannot start without. */
export function preloadCritical(keys: SceneKey[]): Promise<unknown> {
  return Promise.all(
    keys.map((key) => loadLottie(SCENE[key].src, 100).catch(() => null)),
  );
}
