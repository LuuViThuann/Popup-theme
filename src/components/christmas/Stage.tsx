"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import LottieLayer, { type LottieHandle } from "./LottieLayer";
import Starfield from "./Starfield";
import Countdown from "./Countdown";
import { PineCluster, SnowFieldBack, SnowFieldFront } from "./SnowField";
import VillageSkyline from "./VillageSkyline";
import { SCENE } from "@/lib/scene";
import { budget } from "@/lib/perf";
import { useParallax } from "@/hooks/useParallax";

/* -------------------------------------------------------------------------- *
 * Choreography, in seconds from the moment the curtain parts.
 *
 *   Act 1  Santa sweeps across a starlit dark and drops a present, which
 *          lands with a ring of light, rocks, and bursts open
 *   Act 2  its light floods the stage and the scene lights up
 *   Act 3  the greeting sets, the reindeer and snowmen are already running
 *   Act 4  the ambient loops take over; Santa comes round again later
 *
 * These doubles as the build schedule: each Lottie layer is constructed at
 * its own cue rather than at mount, so the setup cost is spread across the
 * opening instead of landing in the same frames as the reveal.
 * -------------------------------------------------------------------------- */
const T = {
  /* Act 1: Santa sweeps across the dark and lets a present go. */
  sweep: 0.1,
  giftDrop: 1.1,
  giftLand: 1.9,
  /* The box rocks on landing, then its lid pops ~0.93s later (frame 55.5 of
     the composition at speed 2). Bloom and veil are cued to that pop. */
  bloom: 2.8,
  veil: 2.85,
  heroOut: 3.15,

  sky: 3.1,
  garland: 3.2,
  garlandStep: 0.08,
  snow: 3.25,
  drift: 3.35,
  ridge: 3.45,

  script: 3.75,
  word: 4.0,
  wordStep: 0.05,
  rule: 4.5,
  blurb: 4.63,
  countdown: 4.75,

  /* The ground team is built just before the veil lifts... */
  dash: 2.75,
  skySleigh: 5.9,
  /* He has only just flown off in Act 1, so his pass over the finished
     scene is held back until he can plausibly come round again. */
  santa: 9.5,
} as const;

/** Act 1 Santa's crossing, start to finish. */
const SWEEP_S = 2.6;
/** Playback rate of the gift box - its rocking anticipation is ~0.9s at 2x. */
const GIFT_SPEED = 2;

/* Sparks thrown up when the box lands: [angle deg, distance px, size px]. */
const SPARKS: [number, number, number][] = [
  [-172, 120, 5],
  [-158, 90, 3],
  [-145, 140, 4],
  [-128, 70, 3],
  [-115, 115, 5],
  [-100, 150, 3],
  [-80, 135, 4],
  [-64, 85, 3],
  [-50, 125, 5],
  [-36, 95, 3],
  [-22, 140, 4],
  [-8, 110, 3],
];

/* Act 1 sky: [left %, top %, size px, twinkle period s]. */
const ACT1_STARS: [number, number, number, number][] = [
  [8, 14, 2, 3.1], [17, 38, 1.5, 4.2], [24, 9, 2.5, 3.6], [31, 62, 1.5, 4.8],
  [38, 22, 2, 2.9], [46, 7, 1.5, 3.9], [57, 31, 2, 4.4], [63, 12, 2.5, 3.3],
  [71, 48, 1.5, 4.6], [78, 19, 2, 3.0], [86, 36, 1.5, 4.1], [92, 10, 2.5, 3.7],
  [12, 72, 1.5, 4.5], [88, 68, 2, 3.4], [52, 78, 1.5, 4.9], [4, 46, 2, 3.8],
];

/*
 * ...and its crossing is already under way by then: the path clock is wound
 * back by DASH_LEAD seconds, so when the scene lights up the sleigh is
 * mid-frame with the snowmen right behind it, instead of both still waiting
 * off-frame right. The veil hides everything before that moment.
 */
const DASH_LEAD = 5.5;

/** Once past this the opening is over and no element still needs a layer. */
const SETTLE_MS = (T.skySleigh + 4) * 1000;

const WORD = "CHRISTMAS".split("");

/* Every other bulb is dropped on narrow screens - see the garland markup. */
const GARLAND = [3, 13, 23, 33, 43, 53, 63, 73, 83, 93];

/** Dust shed behind the sleigh: [offset %, size px, delay s]. */
const TRAIL: [number, number, number][] = [
  [16, 7, 0],
  [22, 5, 0.25],
  [12, 4, 0.5],
  [26, 6, 0.75],
  [18, 3, 1.05],
];

/**
 * The sleigh's width and the snowmen's head start are expressed in the same
 * units on purpose: the chase offset is derived from the sleigh's width, so
 * the pair always falls in behind its tail instead of overlapping it on
 * narrow viewports.
 */
const SLEIGH_W = "clamp(182px, 21cqw, 300px)";
const SNOWMEN_W = "clamp(132px, 15cqw, 238px)";
const CHASE_GAP = `calc(${SLEIGH_W} + clamp(26px, 3.5cqw, 68px))`;

function v(vars: Record<string, string | number>) {
  return vars as CSSProperties;
}

/* -------------------------------------------------------------------------- */

export default function Stage() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [heroGone, setHeroGone] = useState(false);
  const [settled, setSettled] = useState(false);

  // Stage is only ever rendered in the browser - the popup mounts it from an
  // effect - so reading the device budget during render is safe here.
  const b = budget();

  useParallax(stageRef, 20, b.pointer);

  // Release the hero box once it has dissolved into its own burst.
  useEffect(() => {
    const id = setTimeout(() => setHeroGone(true), (T.heroOut + 1.2) * 1000);
    return () => clearTimeout(id);
  }, []);

  /*
   * The box is built straight away - it has to be on screen while it falls -
   * but held on its first frame until it lands. Whichever comes last, the
   * composition being ready or the landing, is what starts it.
   */
  const giftRef = useRef<LottieHandle | null>(null);
  const gift = useRef({ ready: false, landed: false });
  const openGift = useCallback(() => {
    // Under reduced motion the layer parks on a single frame; leave it there.
    if (budget().reduced) return;
    if (gift.current.ready && gift.current.landed) giftRef.current?.play();
  }, []);
  useEffect(() => {
    const id = setTimeout(() => {
      gift.current.landed = true;
      openGift();
    }, T.giftLand * 1000);
    return () => clearTimeout(id);
  }, [openGift]);

  /*
   * Once the opening has played out, drop the compositor layers the reveal
   * needed. `will-change` on two dozen elements - several of them full-bleed -
   * is a large, permanent GPU allocation, and after the animations that
   * justified it have finished it buys nothing but memory pressure. On a
   * phone that pressure is what pushes the whole scene back to software
   * rasterisation.
   */
  useEffect(() => {
    const id = setTimeout(() => setSettled(true), SETTLE_MS);
    return () => clearTimeout(id);
  }, []);

  return (
    <div
      ref={stageRef}
      className={`xm-stage xm-grain relative isolate h-full w-full overflow-hidden bg-night-900 ${
        settled ? "xm-settled" : ""
      }`}
    >
      {/* ── Sky ─────────────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        data-rv="fade"
        style={v({ "--d": `${T.sky}s` })}
        className="absolute inset-0 z-0"
      >
        <span
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(130% 95% at 50% 118%, #15324a 0%, #0b1b32 32%, #070d1c 62%, #04060d 100%)",
          }}
        />
      </div>

      {/* Aurora ribbons */}
      <div
        aria-hidden="true"
        data-rv="fade"
        style={v({ "--d": `${T.sky}s` })}
        className="absolute inset-0 z-[1] overflow-hidden"
      >
        <span
          className="xm-aurora absolute -top-[22%] -left-[14%] h-[58%] w-[62%] rounded-full blur-[90px]"
          style={v({
            "--dur": "26s",
            background:
              "radial-gradient(circle, rgba(17,96,74,0.46) 0%, rgba(17,96,74,0) 70%)",
          })}
        />
        <span
          className="xm-aurora absolute -top-[16%] right-[-10%] h-[52%] w-[54%] rounded-full blur-[90px]"
          style={v({
            "--dur": "21s",
            animationDelay: "-8s",
            background:
              "radial-gradient(circle, rgba(141,19,39,0.44) 0%, rgba(141,19,39,0) 70%)",
          })}
        />
        <span
          className="xm-aurora absolute top-[18%] left-[32%] h-[44%] w-[46%] rounded-full blur-[110px]"
          style={v({
            "--dur": "31s",
            animationDelay: "-14s",
            background:
              "radial-gradient(circle, rgba(187,133,36,0.3) 0%, rgba(187,133,36,0) 70%)",
          })}
        />
      </div>

      {/* Moon */}
      <div
        aria-hidden="true"
        className="xm-par absolute top-[8%] right-[9%] z-[2]"
        style={v({ "--depth": 0.22 })}
      >
        <div
          data-rv="fade"
          style={v({ "--d": `${T.sky + 0.1}s` })}
          className="relative"
        >
          <span className="xm-halo absolute inset-[-150%] rounded-full bg-gold-300/14 blur-3xl" />
          <span className="absolute inset-[-55%] rounded-full bg-gold-100/10 blur-2xl" />
          <span className="relative block h-14 w-14 rounded-full bg-[radial-gradient(circle_at_34%_30%,#fffaf0_0%,#f6e6bd_48%,#d9bd7f_100%)] shadow-[0_0_60px_18px_rgba(246,230,189,0.18)] sm:h-[72px] sm:w-[72px]" />
        </div>
      </div>

      {/* Stars, bokeh, shooting stars */}
      <div
        aria-hidden="true"
        data-rv="fade"
        style={v({ "--d": `${T.sky}s` })}
        className="absolute inset-0 z-[3]"
      >
        <Starfield className="absolute inset-0 h-full w-full" />
      </div>

      {/* Distant peaks, pushed well back so the village in front of them
          stays the thing the eye lands on. */}
      <div
        aria-hidden="true"
        data-rv="fade"
        style={v({ "--d": `${T.ridge}s`, "--depth": 0.08 })}
        className="xm-par absolute inset-x-0 bottom-[22%] z-[5]"
      >
        <svg
          viewBox="0 0 1200 160"
          preserveAspectRatio="none"
          className="h-[52px] w-full text-night-800/55 sm:h-[76px]"
          fill="currentColor"
        >
          <path d="M0 160V96l48-26 34 18 30-40 36 24 44-10 26 22 40-34 34 28 48-14 30 26 42-44 38 36 46-18 32 26 44-32 36 30 48-12 30 24 42-40 38 34 46-16 34 24 44-30 36 28 48-10 30 22V160z" />
        </svg>
      </div>

      {/*
        The village on the horizon, sat so its ground line lands on the far
        drift's crest. Both are wave shapes on independently sized canvases,
        so the offset is derived rather than eyeballed - a fixed percentage
        drifts out of register as the viewport changes and the village ends
        up either floating above the snow or sunk into it:

          far crest  = snowfield height * (300-104)/300
                     = clamp(160px,26vh,270px) * 0.653
          ground line = village height * (420-320)/420
                     = 17.5cqw * 0.238
      */}
      <div
        aria-hidden="true"
        data-rv="fade"
        style={v({
          "--d": `${T.ridge}s`,
          "--depth": 0.14,
          bottom: "calc(clamp(104px, 17vh, 176px) - 4.17cqw)",
        })}
        className="xm-par absolute inset-x-0 z-[6]"
      >
        <VillageSkyline className="block h-auto w-full" />
      </div>

      {/* ── Snowfall behind the content ───────────────────────────── */}
      <div
        aria-hidden="true"
        data-rv="fade"
        style={v({ "--d": `${T.snow}s` })}
        className="absolute inset-0 z-[7]"
      >
        <LottieLayer
          src={SCENE.snow.src}
          renderer="svg"
          preserveAspectRatio="xMidYMid slice"
          className="h-full w-full opacity-50"
          style={{ filter: "blur(1.4px)" }}
          speed={0.62}
          delay={T.snow}
          priority={60}
          pauseOffscreen={false}
        />
      </div>

      {/* A second team, far off and high - atmospheric perspective does the
          work of telling it apart from Santa's own pass below. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[9%] left-0 z-[8] w-full"
      >
        <div
          className="xm-fly w-[170px] sm:w-[240px] lg:w-[300px]"
          style={v({ "--dur": "26s", "--d": `${T.skySleigh}s` })}
        >
          <LottieLayer
            src={SCENE.sleigh.src}
            renderer="svg"
            className="h-full w-full opacity-40"
            style={{
              filter: "blur(1.1px) saturate(0.55) brightness(0.8)",
            }}
            speed={0.9}
            delay={T.skySleigh}
            priority={20}
          />
        </div>
      </div>

      {/* ── Santa's pass ────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[13] overflow-hidden"
      >
        <div
          className="xm-santa absolute top-0 left-0 w-[clamp(118px,18cqw,228px)]"
          style={v({ "--dur": "27s", "--d": `${T.santa}s` })}
        >
          {/* Dust shed along the path, behind the sleigh */}
          {TRAIL.map(([top, size, delay], i) => (
            <span
              key={i}
              className="xm-trail absolute rounded-full bg-gold-300"
              style={v({
                "--d": `${delay}s`,
                top: `${top}%`,
                right: "4%",
                width: `${size}px`,
                height: `${size}px`,
                boxShadow: "0 0 12px 3px rgba(246,214,133,0.65)",
              })}
            />
          ))}
          <div
            className="xm-float"
            style={v({ "--dur": "2.6s", "--amp": "-10px" })}
          >
            {/*
              1,774 shape nodes, and his arc only occupies the first third of
              a 27s cycle. The off-screen pause in LottieLayer is what keeps
              the other two thirds free.
            */}
            <LottieLayer
              src={SCENE.santa.src}
              renderer="canvas"
              className="h-full w-full drop-shadow-[0_18px_34px_rgba(0,0,0,0.5)]"
              delay={T.santa}
              priority={30}
            />
          </div>
        </div>
      </div>

      {/* ── Garland of bulbs ────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="xm-par pointer-events-none absolute inset-x-0 top-0 z-[30] h-[84px] sm:h-[110px] lg:h-[124px]"
        style={v({ "--depth": 0.4 })}
      >
        <svg
          viewBox="0 0 1200 70"
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-0 h-[40px] w-full sm:h-[50px]"
        >
          <path
            d="M0 6 C 150 54, 330 54, 480 16 S 810 52, 960 30 S 1120 6, 1200 24"
            fill="none"
            stroke="rgba(246,230,189,0.26)"
            strokeWidth="2"
            data-rv="line"
            style={v({ "--d": `${T.garland}s`, transformOrigin: "left center" })}
          />
        </svg>

        {GARLAND.map((left, i) => (
          <div
            key={left}
            data-rv="drop"
            style={v({
              "--d": `${T.garland + i * T.garlandStep}s`,
              left: `${left}%`,
            })}
            className={`absolute top-[-20px] -translate-x-1/2 ${
              i % 2 === 1 ? "hidden sm:block" : ""
            }`}
          >
            <div
              className="xm-bulb relative h-[62px] w-[62px] sm:h-[84px] sm:w-[84px] lg:h-[98px] lg:w-[98px]"
              style={v({
                "--sway": `${4.6 + (i % 3) * 0.7}s`,
                "--d": `${i * 0.24}s`,
              })}
            >
              <span
                className="xm-glow-pulse absolute inset-[18%] rounded-full blur-xl"
                style={v({
                  "--dur": `${3 + (i % 4) * 0.45}s`,
                  "--d": `${i * 0.33}s`,
                  background:
                    i % 2 === 0
                      ? "radial-gradient(circle, rgba(246,214,133,0.75) 0%, rgba(246,214,133,0) 70%)"
                      : "radial-gradient(circle, rgba(232,80,100,0.65) 0%, rgba(232,80,100,0) 70%)",
                })}
              />
              <LottieLayer
                src={SCENE.bulb.src}
                renderer="svg"
                className="relative h-full w-full"
                speed={0.7 + (i % 3) * 0.12}
                delay={T.garland + i * 0.22}
                priority={70}
                pauseOffscreen={false}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ── Snow field ──────────────────────────────────────────────────── */}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 z-[9]">
        <div data-rv="ground" style={v({ "--d": `${T.drift}s` })}>
          <SnowFieldBack className="block h-[clamp(160px,26vh,270px)] w-full" />
        </div>
      </div>

      {/* Reindeer dashing across the snow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[4%] left-0 z-[10] w-full"
      >
        <div
          className="xm-dash"
          style={v({
            "--dur": "19s",
            "--d": `${T.dash - DASH_LEAD}s`,
            width: SLEIGH_W,
          })}
        >
          <LottieLayer
            src={SCENE.run.src}
            renderer="canvas"
            className="h-full w-full"
            style={{
              filter:
                "drop-shadow(0 10px 18px rgba(4,10,24,0.45)) saturate(1.06)",
            }}
            delay={T.dash}
            priority={65}
          />
        </div>
      </div>

      {/* The snowmen, bounding along after it. Same duration and delay as the
          sleigh above, so the gap between them never changes. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[4%] left-0 z-[10] w-full"
      >
        <div
          className="xm-chase"
          style={v({
            "--dur": "19s",
            "--d": `${T.dash - DASH_LEAD}s`,
            "--gap": CHASE_GAP,
            width: SNOWMEN_W,
          })}
        >
          <div className="xm-hop" style={v({ "--dur": "0.62s" })}>
            {/* The art is drawn facing right - noses and scarf tail both read
                that way - so it is mirrored to face the direction of travel.
                The flip lives on the Lottie element, not on .xm-hop, whose
                own transform is driven by the hop animation. */}
            <LottieLayer
              src={SCENE.snowmen.src}
              renderer="svg"
              className="h-full w-full drop-shadow-[0_10px_16px_rgba(4,10,24,0.4)]"
              style={{ transform: "scaleX(-1)" }}
              delay={T.dash}
              priority={64}
            />
          </div>
        </div>
      </div>

      {/* Pines at both edges. They come after the characters so the sleigh
          slips behind them on its way off-frame, and their trunks are buried
          by the foreground drift below. */}
      <div
        aria-hidden="true"
        data-rv="ground"
        style={v({ "--d": `${T.ridge}s`, "--depth": 0.3 })}
        className="xm-par pointer-events-none absolute inset-x-0 bottom-[1.5%] z-[11]"
      >
        <PineCluster
          side="left"
          className="absolute bottom-0 left-0 block h-[clamp(96px,18vh,250px)] w-[clamp(132px,22cqw,320px)]"
        />
        <PineCluster
          side="right"
          className="absolute right-0 bottom-0 block h-[clamp(86px,16vh,222px)] w-[clamp(112px,18cqw,260px)]"
        />
      </div>

      {/* Foreground drift - its crest crosses just below the characters'
          feet, so they are tucked into the snow rather than sitting on it. */}
      <div
        aria-hidden="true"
        data-rv="ground"
        style={v({ "--d": `${T.drift + 0.12}s`, "--depth": -0.08 })}
        className="xm-par absolute inset-x-0 bottom-0 z-[12]"
      >
        <SnowFieldFront className="block h-[clamp(56px,9vh,100px)] w-full" />
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="xm-noscroll relative z-[20] flex h-full w-full flex-col items-center justify-center overflow-y-auto px-5 pt-[96px] pb-[clamp(96px,17vh,180px)] text-center sm:px-10 sm:pt-[124px] lg:pt-[150px]">
        <div
          className="xm-par flex max-w-[min(760px,92%)] flex-col items-center"
          style={v({ "--depth": -0.18 })}
        >
          <p
            data-rv="rise"
            style={v({ "--d": `${T.script}s` })}
            className="xm-flicker font-script text-[clamp(2.1rem,5.6vw,3.5rem)] leading-[0.82] text-gold-300 drop-shadow-[0_6px_26px_rgba(230,189,99,0.4)]"
          >
            Merry
          </p>

          <h1
            className="mt-1 font-display text-[clamp(1.75rem,6.3vw,4.1rem)] leading-[1.06] font-bold tracking-[0.1em] sm:mt-2"
            style={{ perspective: "700px" }}
          >
            <span className="sr-only">Merry Christmas</span>
            <span aria-hidden="true" className="xm-gold-text inline-flex">
              {WORD.map((letter, i) => (
                <span
                  key={`${letter}-${i}`}
                  data-rv="letter"
                  style={v({ "--d": `${T.word + i * T.wordStep}s` })}
                  className="inline-block"
                >
                  {letter}
                </span>
              ))}
            </span>
          </h1>

          <div
            data-rv="fade"
            style={v({ "--d": `${T.rule}s` })}
            className="mt-3 mb-3 flex w-full max-w-[420px] items-center gap-3 sm:mt-5 sm:mb-4"
          >
            <span
              data-rv="line"
              style={v({ "--d": `${T.rule}s`, transformOrigin: "right center" })}
              className="h-px flex-1 bg-gradient-to-r from-transparent to-gold-500/55"
            />
            <svg
              viewBox="0 0 24 24"
              className="xm-spin-slow h-3.5 w-3.5 text-gold-300"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9L4.9 19.1" />
            </svg>
            <span
              data-rv="line"
              style={v({ "--d": `${T.rule}s`, transformOrigin: "left center" })}
              className="h-px flex-1 bg-gradient-to-l from-transparent to-gold-500/55"
            />
          </div>

          <p
            data-rv="rise"
            style={v({ "--d": `${T.blurb}s` })}
            className="max-w-[46ch] font-sans text-[13px] leading-relaxed text-balance text-ice-300/70 sm:text-[15px]"
          >
            Chúc bạn một mùa Giáng sinh ấm áp, ngập tràn yêu thương và những
            điều bất ngờ. Đêm nay, ông già Noel đã lên đường — và món quà dành
            riêng cho bạn đang chờ được mở.
          </p>

          <div className="mt-4 sm:mt-5">
            <p
              data-rv="fade"
              style={v({ "--d": `${T.countdown - 0.08}s` })}
              className="mb-2.5 font-sans text-[9px] tracking-[0.34em] text-ice-300/40 uppercase sm:text-[10px]"
            >
              Đếm ngược đến Giáng sinh
            </p>
            <Countdown baseDelay={T.countdown} />
          </div>
        </div>
      </div>

      {/* ── Snowfall in front, for depth ────────────────────────────────── */}
      <div
        aria-hidden="true"
        data-rv="fade"
        style={v({ "--d": `${T.snow + 0.4}s`, "--depth": 0.6 })}
        className="xm-par pointer-events-none absolute inset-[-6%] z-[26]"
      >
        <LottieLayer
          src={SCENE.snow.src}
          renderer="svg"
          preserveAspectRatio="xMidYMid slice"
          className="h-full w-full opacity-30"
          style={{ filter: "blur(2.6px)" }}
          speed={1.05}
          delay={T.snow + 0.8}
          priority={55}
          pauseOffscreen={false}
        />
      </div>

      {/* ── Act 1: Santa's drop, and the light the box lets out ─────────── */}
      {/*
        Geometry shared by the pieces below, as custom properties so the
        sweep, the release point and the landing all stay in register at
        every card size:
          --sw  Santa's width
          --gw  the gift element's width. The box only fills the middle ~37%
                of its square canvas (the rest is headroom for the confetti),
                so its base sits ~18% of --gw below the element's centre.
      */}
      {!heroGone && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[50] grid place-items-center"
          style={v({
            "--sw": "clamp(150px, 20cqw, 280px)",
            "--gw": "clamp(300px, 46cqw, 620px)",
          })}
        >
          {/* The dark the scene opens in - a deep night rather than flat
              black, with its own sky that lifts away with it. */}
          <div
            className="xm-veil absolute inset-0"
            style={v({
              "--d": `${T.veil}s`,
              background:
                "radial-gradient(120% 90% at 50% 42%, #0c1a33 0%, #070e1f 48%, #03050b 100%)",
            })}
          >
            {ACT1_STARS.map(([left, top, size, period], i) => (
              <span
                key={i}
                className="xm-twinkle absolute rounded-full bg-ice-100"
                style={v({
                  left: `${left}%`,
                  top: `${top}%`,
                  width: `${size}px`,
                  height: `${size}px`,
                  "--dur": `${period}s`,
                  "--d": `${-i * 0.37}s`,
                  boxShadow: "0 0 6px 1px rgba(230,240,255,0.55)",
                })}
              />
            ))}
          </div>

          {/* Santa's crossing. His dust trails off the back of the sleigh. */}
          <div
            className="xm-sweep absolute top-0 left-0"
            style={v({
              "--dur": `${SWEEP_S}s`,
              "--d": `${T.sweep}s`,
              width: "var(--sw)",
            })}
          >
            {TRAIL.map(([top, size, delay], i) => (
              <span
                key={i}
                className="xm-trail absolute rounded-full bg-gold-300"
                style={v({
                  "--d": `${delay * 0.6}s`,
                  top: `${top + 30}%`,
                  right: "2%",
                  width: `${size + 1}px`,
                  height: `${size + 1}px`,
                  boxShadow: "0 0 14px 4px rgba(246,214,133,0.7)",
                })}
              />
            ))}
            <LottieLayer
              src={SCENE.santa.src}
              renderer="canvas"
              className="h-full w-full drop-shadow-[0_0_28px_rgba(246,214,133,0.28)]"
              priority={100}
              pauseOffscreen={false}
            />
          </div>

          {/* A pool of light marks the landing spot, brightening as the box
              falls into it. */}
          <span
            className="xm-landing-glow absolute left-1/2 rounded-[50%]"
            style={v({
              "--d": `${T.giftDrop}s`,
              "--dur": `${T.giftLand - T.giftDrop + 0.5}s`,
              "--out": `${T.bloom}s`,
              top: "calc(50% + var(--gw) * 0.17)",
              width: "calc(var(--gw) * 0.62)",
              height: "calc(var(--gw) * 0.12)",
              background:
                "radial-gradient(closest-side, rgba(255,232,170,0.55) 0%, rgba(230,189,99,0.22) 55%, transparent 100%)",
            })}
          />

          {/* Shockwave rings and sparks thrown up on impact. */}
          {[0, 0.12].map((lag) => (
            <span
              key={lag}
              className="xm-ring absolute left-1/2 rounded-[50%] border border-gold-300/80"
              style={v({
                "--d": `${T.giftLand + lag}s`,
                top: "calc(50% + var(--gw) * 0.185)",
                width: "calc(var(--gw) * 0.34)",
                height: "calc(var(--gw) * 0.07)",
                boxShadow:
                  "0 0 18px 2px rgba(246,214,133,0.45), inset 0 0 12px rgba(246,214,133,0.35)",
              })}
            />
          ))}
          {SPARKS.map(([angle, dist, size], i) => (
            <span
              key={i}
              className="xm-spark absolute left-1/2 rounded-full bg-gold-100"
              style={v({
                "--d": `${T.giftLand + (i % 3) * 0.03}s`,
                "--a": `${angle}deg`,
                "--r": `${dist}px`,
                top: "calc(50% + var(--gw) * 0.18)",
                width: `${size}px`,
                height: `${size}px`,
                boxShadow: "0 0 10px 2px rgba(246,214,133,0.8)",
              })}
            />
          ))}

          {/* The burst */}
          <span
            className="xm-bloom absolute h-[46%] w-[46%] rounded-full"
            style={v({
              "--d": `${T.bloom}s`,
              background:
                "radial-gradient(circle, rgba(255,250,232,0.95) 0%, rgba(246,214,133,0.62) 32%, rgba(230,189,99,0.18) 58%, transparent 74%)",
            })}
          />

          {/*
            The box: it falls from the sleigh (outer), squashes on landing
            (middle), and finally dissolves into its own burst (inner). Three
            wrappers because each owns its own transform.
          */}
          <div
            className="xm-gift-drop relative"
            style={v({
              "--d": `${T.giftDrop}s`,
              "--dur": `${T.giftLand - T.giftDrop}s`,
              // Released from the sack as the sleigh passes just right of
              // centre - see the 38% stop of `xm-sweep`.
              "--from-x": "6cqw",
              "--from-y": "calc(var(--sw) * 0.62 - 37cqh)",
              width: "var(--gw)",
            })}
          >
            <div
              className="xm-gift-land"
              style={v({ "--d": `${T.giftLand}s` })}
            >
              <div
                className="xm-hero-out"
                style={v({ "--d": `${T.heroOut}s` })}
              >
                <LottieLayer
                  ref={giftRef}
                  src={SCENE.gift.src}
                  renderer="svg"
                  loop={false}
                  autoplay={false}
                  speed={GIFT_SPEED}
                  priority={100}
                  pauseOffscreen={false}
                  onReady={() => {
                    gift.current.ready = true;
                    openGift();
                  }}
                  className="h-full w-full drop-shadow-[0_26px_50px_rgba(0,0,0,0.6)]"
                  style={{ transform: "translateY(-12.6%)" }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Finishing passes ────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[40]"
        style={{
          background:
            "radial-gradient(118% 88% at 50% 44%, transparent 42%, rgba(2,4,10,0.5) 82%, rgba(2,4,10,0.78) 100%)",
        }}
      />
    </div>
  );
}
