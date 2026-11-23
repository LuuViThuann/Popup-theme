"use client";

import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type Ref,
} from "react";
import type { AnimationItem } from "lottie-web";
import { takeLottie } from "@/lib/lottie-cache";
import { budget } from "@/lib/perf";

export type LottieHandle = {
  play: () => void;
  pause: () => void;
  /** Rewind to frame 0 and play again - used for the click-to-reopen gift. */
  replay: () => void;
  instance: () => AnimationItem | null;
};

type Props = {
  src: string;
  /** `svg` keeps vector art crisp; `canvas` is far cheaper for heavy comps. */
  renderer?: "svg" | "canvas";
  loop?: boolean | number;
  autoplay?: boolean;
  speed?: number;
  /** Seconds to wait after the curtain parts before this layer is built. */
  delay?: number;
  /**
   * Parse-queue priority. Layers whose cue comes first should outrank the
   * ones that do not appear for another two seconds.
   */
  priority?: number;
  /**
   * Hold the animation while its box is outside the viewport. The flight
   * paths spend much of their cycle parked off-frame, and rendering a
   * 1,774-shape composition nobody can see is the most wasteful thing on
   * the stage. Turn it off for anything whose box never leaves the screen.
   */
  pauseOffscreen?: boolean;
  className?: string;
  style?: CSSProperties;
  preserveAspectRatio?: string;
  ariaLabel?: string;
  onReady?: () => void;
  ref?: Ref<LottieHandle>;
};

export default function LottieLayer({
  src,
  renderer = "svg",
  loop = true,
  autoplay = true,
  speed = 1,
  delay = 0,
  priority = 0,
  pauseOffscreen = true,
  className,
  style,
  preserveAspectRatio = "xMidYMid meet",
  ariaLabel,
  onReady,
  ref,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<AnimationItem | null>(null);
  const [ready, setReady] = useState(false);

  // Latest-value refs: the mount effect reads these asynchronously, long after
  // render, and they must not force the animation to be rebuilt.
  const speedRef = useRef(speed);
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    speedRef.current = speed;
    onReadyRef.current = onReady;
  });

  useImperativeHandle(
    ref,
    (): LottieHandle => ({
      play: () => animRef.current?.play(),
      pause: () => animRef.current?.pause(),
      replay: () => animRef.current?.goToAndPlay(0, true),
      instance: () => animRef.current,
    }),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    let startTimer: ReturnType<typeof setTimeout> | undefined;
    let observer: IntersectionObserver | undefined;

    /*
     * Three independent reasons to hold the animation, tracked separately so
     * one releasing does not override another still holding. The old code
     * resumed on tab focus unconditionally, which could restart a layer that
     * had deliberately been stopped.
     */
    let onScreen = !pauseOffscreen;
    let wanted = false;

    const sync = () => {
      const anim = animRef.current;
      if (!anim) return;
      const shouldRun =
        wanted && onScreen && !document.hidden && !budget().reduced;
      if (shouldRun) anim.play();
      else anim.pause();
    };

    async function build() {
      if (cancelled || !hostRef.current) return;

      const [{ default: lottie }, data] = await Promise.all([
        import("lottie-web"),
        takeLottie(src, priority),
      ]);
      if (cancelled || !hostRef.current) return;

      const reduced = budget().reduced;

      const anim = lottie.loadAnimation({
        container: hostRef.current,
        renderer,
        loop: reduced ? false : loop,
        autoplay: false,
        animationData: data,
        rendererSettings: {
          preserveAspectRatio,
          progressiveLoad: renderer === "svg",
          clearCanvas: renderer === "canvas",
          hideOnTransparent: true,
        },
      });

      animRef.current = anim;
      anim.setSpeed(speedRef.current);

      // Keep one painted frame even when motion is suppressed, so the scene
      // never shows an empty hole where a character should be.
      anim.goToAndStop(reduced ? anim.totalFrames * 0.5 : 0, true);

      setReady(true);
      onReadyRef.current?.();

      wanted = autoplay;
      sync();
    }

    /*
     * The build itself is deferred to the layer's cue. Constructing every
     * composition the moment the stage mounts stacks all of that DOM and
     * canvas setup into the same few frames as the reveal animation; spread
     * across the choreography, each one lands in a quiet moment instead.
     */
    const host = hostRef.current;
    if (host && pauseOffscreen && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          onScreen = entries.some((e) => e.isIntersecting);
          sync();
        },
        // A little margin so a character starts moving just before it slides
        // into frame rather than snapping to life on the edge.
        { rootMargin: "12%" },
      );
      observer.observe(host);
    }

    startTimer = setTimeout(
      () => {
        void build().catch(() => {
          // A missing composition degrades to an empty layer rather than an
          // error boundary swallowing the whole popup.
        });
      },
      Math.max(0, delay) * 1000,
    );

    const onVisibility = () => sync();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      observer?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      animRef.current?.destroy();
      animRef.current = null;
    };
  }, [
    src,
    renderer,
    loop,
    autoplay,
    delay,
    priority,
    pauseOffscreen,
    preserveAspectRatio,
  ]);

  useEffect(() => {
    animRef.current?.setSpeed(speed);
  }, [speed]);

  return (
    <div
      ref={hostRef}
      className={className}
      style={{
        ...style,
        opacity: ready ? (style?.opacity ?? 1) : 0,
        transition: "opacity 700ms var(--ease-soft)",
      }}
      role={ariaLabel ? "img" : "presentation"}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    />
  );
}
