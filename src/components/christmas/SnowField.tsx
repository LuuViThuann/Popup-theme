/**
 * The snowfield, built as overlapping drifts rather than a single dome so the
 * ground reads as rolling terrain with depth.
 *
 * It renders in two pieces that sandwich the characters:
 *
 *   <SnowFieldBack />   three drifts, lit progressively brighter toward the
 *                       viewer, that the characters stand in front of
 *   <SnowFieldFront />  one bright drift whose crest crosses just below their
 *                       feet, tucking them into the snow
 *
 * Two details do most of the work. Each drift casts a soft shadow *upward*
 * onto the drift behind it, which is what turns flat bands into volume. And
 * the crest highlight strengthens with proximity - barely there on the far
 * drift, crisp on the front one - so the layers read as distance rather than
 * as contour lines.
 *
 * Both pieces stretch horizontally (`preserveAspectRatio="none"`); the crests
 * are shallow enough that the stretch never reads as distortion, and the
 * highlights use `vector-effect` so it cannot thin them out.
 *
 * <PineCluster /> plants snow-laden conifers at the left and right edges. It
 * is a separate element rather than part of the drifts above precisely
 * because of that horizontal stretch - a stretched hillside still reads as a
 * hillside, a stretched tree does not - so the trees keep their aspect ratio
 * and anchor to their own edge.
 */

type Props = { className?: string };

/** Crest curves, shared between each drift's fill and its highlight. */
const FAR =
  "M0,104 C140,74 300,120 470,96 C640,72 790,38 960,72 C1120,104 1280,120 1440,86";
const MID =
  "M0,170 C160,130 300,180 500,158 C700,136 860,96 1070,142 C1240,180 1340,192 1440,150";
const NEAR =
  "M0,236 C150,200 320,254 560,232 C800,210 960,176 1170,224 C1300,254 1370,262 1440,228";
const FRONT = "M0,46 C230,14 440,66 690,42 C940,18 1160,6 1440,40";

const close = (crest: string, floor: number) =>
  `${crest} L1440,${floor} L0,${floor} Z`;

/** Soft contact shadow thrown up onto whatever sits behind this drift. */
const lift = (blur: number, alpha: number) => ({
  filter: `drop-shadow(0 -${blur * 0.6}px ${blur}px rgba(44,78,124,${alpha}))`,
});

export function SnowFieldBack({ className }: Props) {
  return (
    <svg
      viewBox="0 0 1440 300"
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="xm-drift-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(118,154,196,0.52)" />
          <stop offset="100%" stopColor="rgba(76,110,156,0.22)" />
        </linearGradient>
        <linearGradient id="xm-drift-mid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(172,204,234,0.72)" />
          <stop offset="100%" stopColor="rgba(116,156,200,0.38)" />
        </linearGradient>
        <linearGradient id="xm-drift-near" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(224,239,252,0.95)" />
          <stop offset="100%" stopColor="rgba(164,199,230,0.62)" />
        </linearGradient>
        {/* The moon sits top-right, so its light pools on that side. */}
        <radialGradient id="xm-moonpool" cx="0.72" cy="0.08" r="0.62">
          <stop offset="0%" stopColor="rgba(255,249,228,0.20)" />
          <stop offset="100%" stopColor="rgba(255,249,228,0)" />
        </radialGradient>
      </defs>

      {/* Far drift: no highlight - at this distance a crisp edge would read
          as a contour line rather than as snow. */}
      <path d={close(FAR, 300)} fill="url(#xm-drift-far)" />

      <path d={close(MID, 300)} fill="url(#xm-drift-mid)" style={lift(14, 0.3)} />
      <path
        d={MID}
        fill="none"
        stroke="rgba(226,240,255,0.32)"
        strokeWidth="1.25"
        vectorEffect="non-scaling-stroke"
      />

      <path
        d={close(NEAR, 300)}
        fill="url(#xm-drift-near)"
        style={lift(18, 0.36)}
      />
      <path
        d={NEAR}
        fill="none"
        stroke="rgba(255,255,255,0.68)"
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
      />

      <path d={close(FAR, 300)} fill="url(#xm-moonpool)" />
    </svg>
  );
}

export function SnowFieldFront({ className }: Props) {
  return (
    <svg
      viewBox="0 0 1440 100"
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="xm-drift-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f4faff" />
          <stop offset="55%" stopColor="#dfecf9" />
          <stop offset="100%" stopColor="#c6d9ed" />
        </linearGradient>
      </defs>

      <path
        d={close(FRONT, 100)}
        fill="url(#xm-drift-front)"
        style={lift(20, 0.4)}
      />
      <path
        d={FRONT}
        fill="none"
        stroke="rgba(255,255,255,0.92)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}


/* -------------------------------------------------------------------------- *
 * Pines
 * -------------------------------------------------------------------------- */

/**
 * Tiers from the top down: [apex y, half width, base y] in a 100x200 box.
 * Each apex sits well above the base of the tier above it - without that
 * overlap the tree reads as a stack of separate cones rather than one
 * conifer.
 */
const TIERS: [number, number, number][] = [
  [10, 14, 58],
  [36, 21, 94],
  [64, 28, 128],
  [94, 35, 160],
  [124, 43, 188],
];

/** A tier, drawn with a gently drooping lower edge so it reads as branches. */
function tier(apex: number, hw: number, base: number): string {
  return [
    `M50,${apex}`,
    `L${50 + hw},${base}`,
    `Q${50 + hw * 0.5},${base + 7} 50,${base + 3}`,
    `Q${50 - hw * 0.5},${base + 7} ${50 - hw},${base}`,
    "Z",
  ].join(" ");
}

function Pine({ x, scale, dim }: { x: number; scale: number; dim: number }) {
  return (
    <g
      transform={`translate(${x} 200) scale(${scale}) translate(-50 -200)`}
      opacity={dim}
    >
      <ellipse cx="50" cy="196" rx="44" ry="7" fill="rgba(40,72,116,0.4)" />
      <rect x="45" y="170" width="10" height="30" rx="2" fill="#2b2017" />
      {TIERS.map(([apex, hw, base], i) => {
        const span = base - apex;
        // Snow settles as a cap on the upper third, not over the whole tier.
        const snowBase = apex + span * 0.36;
        const snowHw = hw * 0.42;
        return (
          <g key={i}>
            <path d={tier(apex, hw, base)} fill="url(#xm-pine-body)" />
            <path d={tier(apex, snowHw, snowBase)} fill="url(#xm-pine-snow)" />
          </g>
        );
      })}
    </g>
  );
}

/** [centre x, scale, opacity] - varied so a cluster never looks stamped. */
const LEFT_PINES: [number, number, number][] = [
  [20, 0.84, 0.82],
  [114, 1.18, 0.97],
  [208, 0.6, 0.64],
];
const RIGHT_PINES: [number, number, number][] = [
  [48, 0.64, 0.68],
  [160, 1.1, 0.95],
];

export function PineCluster({
  side,
  className,
}: Props & { side: "left" | "right" }) {
  const pines = side === "left" ? LEFT_PINES : RIGHT_PINES;
  const width = side === "left" ? 260 : 220;

  return (
    <svg
      viewBox={`0 0 ${width} 210`}
      preserveAspectRatio={side === "left" ? "xMinYMax meet" : "xMaxYMax meet"}
      className={className}
      aria-hidden="true"
    >
      <defs>
        {/* The moon is top-right, so the lit face of every tree is its right. */}
        <linearGradient id="xm-pine-body" x1="0" y1="0" x2="1" y2="0.55">
          <stop offset="0%" stopColor="#10362d" />
          <stop offset="100%" stopColor="#246b57" />
        </linearGradient>
        <linearGradient id="xm-pine-snow" x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0%" stopColor="#cbdef1" />
          <stop offset="100%" stopColor="#f6fbff" />
        </linearGradient>
      </defs>
      {pines.map(([x, scale, dim], i) => (
        <Pine key={i} x={x} scale={scale} dim={dim} />
      ))}
    </svg>
  );
}
