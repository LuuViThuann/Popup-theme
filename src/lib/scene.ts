/**
 * Manifest of the Lottie compositions used by the Christmas popup.
 *
 * `bytes` is the on-disk size, kept as documentation of what each layer costs
 * to fetch.
 */
export type SceneAsset = {
  src: string;
  bytes: number;
};

export const SCENE = {
  /** Full-bleed snowfall, 1500x800, ~10s loop. */
  snow: { src: "/lottie/Snow.json", bytes: 130981 },
  /**
   * Santa waving from a sleigh full of presents, 1087x1015, ~6s loop.
   * Cut from the full `Santa Claus.json` scene by
   * `scripts/make-santa-flight.py`: the scenery and the baked-in travel are
   * stripped so the sleigh can fly a path authored in CSS, and the canvas is
   * cropped to the character so its box is its silhouette.
   */
  santa: { src: "/lottie/santa_fly.json", bytes: 482107 },
  /**
   * Three reindeer pulling Santa's sleigh, 1832x426, 5s loop.
   * Rebuilt from `santa sleigh.json` by `scripts/make-sleigh-flight.py`:
   * that file's own composition mirrors and crushes the art to a smear, so
   * only the artwork survives, re-wrapped at its native size.
   */
  sleigh: { src: "/lottie/sleigh_fly.json", bytes: 61586 },
  /** Gift box bursting open with confetti, 700x700, ~3.6s. */
  gift: { src: "/lottie/Gift Box.json", bytes: 129051 },
  /** Hanging bulb with twinkling stars, 500x500 - repeated into a garland. */
  bulb: { src: "/lottie/day_bong.json", bytes: 32331 },
  /**
   * Two snowmen, 854x750, ~5s loop - they bound along after the sleigh.
   * Cut from `happy holidays.json` by `scripts/make-snowmen.py`: that file is
   * a greeting card whose wordmark and particle field would fight the page's
   * own, so only the characters survive, cropped to their silhouette.
   */
  snowmen: { src: "/lottie/snowmen_run.json", bytes: 87165 },
  /**
   * Reindeer + sleigh gallop cycle, 1000x600, 0.75s loop.
   * The shipped `noel_run.json` is a JPEG frame sequence on a solid white
   * canvas, which cannot sit on the night sky. `scripts/make-transparent-run.py`
   * keys that canvas out and re-emits it as this file - smaller *and* alpha.
   */
  run: { src: "/lottie/noel_run_alpha.json", bytes: 557337 },
} as const satisfies Record<string, SceneAsset>;

export type SceneKey = keyof typeof SCENE;

/**
 * The curtain waits on this and nothing else.
 *
 * Act 1 is a single gift box in the dark, so the box is the only composition
 * that has to exist before the greeting can open. Blocking on the whole scene
 * - 1.6MB of JSON, most of it for characters that do not appear for another
 * two to four seconds - is what made the first screen take as long as it did.
 */
export const CRITICAL: SceneKey[] = ["gift"];

/**
 * Everything else, in the order the choreography reaches it. These are warmed
 * behind the opening act, so each one is parsed and waiting by the time its
 * cue arrives.
 */
export const DEFERRED: SceneKey[] = [
  "bulb",
  "snow",
  "santa",
  "sleigh",
  "snowmen",
  "run",
];

/** Christmas Day of the next upcoming year, in the visitor's own timezone. */
export function nextChristmas(from: Date = new Date()): Date {
  const target = new Date(from.getFullYear(), 11, 25, 0, 0, 0, 0);
  if (target.getTime() <= from.getTime()) {
    target.setFullYear(target.getFullYear() + 1);
  }
  return target;
}
