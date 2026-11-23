"use client";

import { useCanvasScene } from "@/hooks/useCanvasScene";
import { budget } from "@/lib/perf";
import { glowSprite } from "@/lib/sprites";

type Star = {
  x: number;
  y: number;
  r: number;
  base: number;
  phase: number;
  speed: number;
};
type Orb = {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  tint: number;
  alpha: number;
};
type Shot = {
  x: number;
  y: number;
  len: number;
  vx: number;
  vy: number;
  life: number;
};

type State = {
  stars: Star[];
  orbs: Orb[];
  orbArt: HTMLCanvasElement[];
  /** Reused every frame so the twinkle buckets never allocate. */
  buckets: Star[][];
  shot: Shot | null;
  nextShot: number;
};

const TINTS = ["240, 198, 120", "190, 222, 255", "232, 120, 140"];

/** Star alpha is quantised into this many groups, one fill() each. */
const BUCKETS = 7;

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * Ambient canvas behind the Lottie layers: twinkling stars, drifting bokeh
 * orbs and the occasional shooting star.
 *
 * The picture is unchanged from the original; what changed is how it is
 * drawn. The bokeh used to build a fresh `createRadialGradient` per orb per
 * frame - the single most expensive way to draw a soft circle - and each of
 * up to 230 stars took its own `beginPath`/`arc`/`fill`. Here the orbs are
 * one cached sprite blitted with `globalAlpha`, and the stars are grouped
 * into seven alpha buckets and filled seven times in total. The frame loop
 * itself is shared with every other canvas on the page.
 */
export default function Starfield({ className }: { className?: string }) {
  const ref = useCanvasScene<State>({
    seed(width, height) {
      const b = budget();
      const area = width * height;
      // The original counts, kept: this is the same sky.
      const starCount = Math.round(Math.min(b.stars, area / 5200));
      const orbCount = Math.round(Math.min(b.bokeh, area / 42000));

      return {
        stars: Array.from({ length: starCount }, () => ({
          x: Math.random() * width,
          y: Math.random() * height * 0.82,
          r: rand(0.35, 1.5),
          base: rand(0.18, 0.78),
          phase: Math.random() * Math.PI * 2,
          speed: rand(0.6, 2.1),
        })),
        orbs: Array.from({ length: orbCount }, () => ({
          x: Math.random() * width,
          y: Math.random() * height,
          r: rand(14, 58),
          vx: rand(-5, 5),
          vy: rand(-14, -3),
          tint: [0, 1, 0, 2][Math.floor(Math.random() * 4)],
          alpha: rand(0.05, 0.16),
        })),
        orbArt: TINTS.map((t) => glowSprite(96, t)),
        buckets: Array.from({ length: BUCKETS }, () => []),
        shot: null,
        nextShot: 2600,
      };
    },

    draw(ctx, s, width, height, now, dt) {
      const still = budget().reduced;

      /* Bokeh first - it reads as depth behind the stars. */
      if (s.orbs.length) {
        ctx.globalCompositeOperation = "lighter";
        for (const o of s.orbs) {
          if (!still) {
            o.x += o.vx * dt;
            o.y += o.vy * dt;
            if (o.y + o.r < 0) {
              o.y = height + o.r;
              o.x = Math.random() * width;
            }
            if (o.x < -o.r) o.x = width + o.r;
            else if (o.x > width + o.r) o.x = -o.r;
          }
          ctx.globalAlpha = o.alpha;
          ctx.drawImage(
            s.orbArt[o.tint],
            o.x - o.r,
            o.y - o.r,
            o.r * 2,
            o.r * 2,
          );
        }
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
      }

      /* Stars, grouped by twinkle brightness. */
      for (const bucket of s.buckets) bucket.length = 0;
      for (const star of s.stars) {
        const a = still
          ? star.base
          : star.base *
            (0.55 + 0.45 * Math.sin(now * 0.001 * star.speed + star.phase));
        const slot = Math.min(
          BUCKETS - 1,
          Math.max(0, Math.round(a * (BUCKETS - 1))),
        );
        s.buckets[slot].push(star);
      }
      for (let i = 1; i < BUCKETS; i++) {
        const bucket = s.buckets[i];
        if (!bucket.length) continue;
        ctx.fillStyle = `rgba(255, 252, 240, ${(i / (BUCKETS - 1)) * 0.78})`;
        ctx.beginPath();
        for (const star of bucket) {
          ctx.moveTo(star.x + star.r, star.y);
          ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        }
        ctx.fill();
      }

      /* Shooting star. */
      if (!still) {
        s.nextShot -= dt * 1000;
        if (!s.shot && s.nextShot <= 0) {
          const speed = rand(620, 920);
          s.shot = {
            x: rand(0, width * 0.55),
            y: rand(0, height * 0.32),
            len: rand(90, 190),
            vx: speed,
            vy: speed * rand(0.22, 0.42),
            life: 1,
          };
          s.nextShot = rand(5200, 11000);
        }
        const shot = s.shot;
        if (shot) {
          shot.x += shot.vx * dt;
          shot.y += shot.vy * dt;
          shot.life -= dt * 0.85;
          const tailX = shot.x - shot.len;
          const tailY = shot.y - shot.len * (shot.vy / shot.vx);
          const trail = ctx.createLinearGradient(shot.x, shot.y, tailX, tailY);
          const a = Math.max(0, shot.life);
          trail.addColorStop(0, `rgba(255, 250, 225, ${0.9 * a})`);
          trail.addColorStop(1, "rgba(255, 250, 225, 0)");
          ctx.strokeStyle = trail;
          ctx.lineWidth = 2;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(shot.x, shot.y);
          ctx.lineTo(tailX, tailY);
          ctx.stroke();
          if (shot.life <= 0 || shot.x > width + 200) s.shot = null;
        }
      }
    },
  });

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
