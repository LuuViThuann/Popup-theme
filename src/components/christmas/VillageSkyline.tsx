/**
 * The horizon: a snowbound village of firs and cottages, read as silhouette.
 *
 * Unlike the drifts in `SnowField`, this cannot be stretched to fit - a
 * squashed roofline is immediately obvious - so it keeps its aspect ratio and
 * scales with the viewport width instead.
 *
 * A pure silhouette would vanish into a night sky, so three things make it
 * legible: a haze band lifts the sky right behind the rooflines, windows are
 * lit warm against all that cold blue, and the chimneys smoke.
 *
 * The canvas runs 100 units below the ground line the village stands on, and
 * that strip is a snow bank drawn last - over the feet of the houses and
 * trees - fading to nothing at the very bottom. Without it the element ends
 * on a dead straight edge across the artwork, which reads as a layering bug
 * rather than as a horizon. Fading out rather than stopping also means the
 * drifts in `SnowField` can take over underneath without a seam, whatever
 * height either one happens to be.
 */

const BASE = 320;
const FLOOR = 420;

/** [centre x, height, half width, fill] */
type PineSpec = [number, number, number, string];
/** [centre x, body width, body height, lit windows] */
type HouseSpec = [number, number, number, boolean];

const BACK_FILL = "#132b45";
const FRONT_FILL = "#091827";

/** The far treeline: smaller, bluer, hazier with distance. */
const BACK_PINES: PineSpec[] = [
  [60, 92, 30, BACK_FILL],
  [152, 70, 24, BACK_FILL],
  [305, 104, 33, BACK_FILL],
  [395, 78, 26, BACK_FILL],
  [560, 96, 31, BACK_FILL],
  [700, 72, 25, BACK_FILL],
  [905, 110, 35, BACK_FILL],
  [1010, 80, 27, BACK_FILL],
  [1180, 90, 29, BACK_FILL],
  [1320, 70, 24, BACK_FILL],
  [1490, 100, 32, BACK_FILL],
  [1605, 76, 26, BACK_FILL],
  [1790, 94, 30, BACK_FILL],
  [1930, 72, 25, BACK_FILL],
  [2090, 106, 34, BACK_FILL],
  [2210, 78, 26, BACK_FILL],
  [2350, 88, 29, BACK_FILL],
];

const FRONT_PINES: PineSpec[] = [
  [20, 150, 46, FRONT_FILL],
  [118, 118, 37, FRONT_FILL],
  [236, 136, 42, FRONT_FILL],
  [470, 128, 40, FRONT_FILL],
  [628, 146, 45, FRONT_FILL],
  [830, 120, 38, FRONT_FILL],
  [1092, 140, 43, FRONT_FILL],
  [1252, 116, 36, FRONT_FILL],
  [1428, 132, 41, FRONT_FILL],
  [1690, 124, 39, FRONT_FILL],
  [1868, 144, 44, FRONT_FILL],
  [2030, 118, 37, FRONT_FILL],
  [2270, 138, 43, FRONT_FILL],
  [2388, 112, 35, FRONT_FILL],
];

const HOUSES: HouseSpec[] = [
  [178, 104, 56, true],
  [372, 88, 48, false],
  [540, 112, 60, true],
  [742, 92, 50, true],
  [968, 104, 54, false],
  [1168, 96, 52, true],
  [1352, 116, 62, true],
  [1548, 90, 48, false],
  [1760, 108, 58, true],
  [1972, 94, 50, true],
  [2158, 112, 60, false],
  [2318, 88, 48, true],
];

/** Chimneys that smoke: [x, y, puff count, period]. */
const SMOKERS: [number, number, number, number][] = [
  [205, 234, 3, 5.2],
  [571, 224, 3, 6.4],
  [1383, 222, 3, 4.8],
  [1791, 230, 3, 5.9],
];

const BANK_CREST =
  "M0,316 C210,298 420,330 690,310 C950,291 1180,326 1460,306 C1700,289 1950,322 2180,306 C2290,298 2350,310 2400,302";
const BANK = `${BANK_CREST} L2400,${FLOOR} L0,${FLOOR} Z`;

function Pine({ spec }: { spec: PineSpec }) {
  const [x, h, w, fill] = spec;
  const top = BASE - h;
  return (
    <g fill={fill}>
      <path
        d={`M${x},${top} L${x + w * 0.5},${top + h * 0.4} L${x - w * 0.5},${top + h * 0.4} Z`}
      />
      <path
        d={`M${x},${top + h * 0.2} L${x + w * 0.75},${top + h * 0.68} L${x - w * 0.75},${top + h * 0.68} Z`}
      />
      <path
        d={`M${x},${top + h * 0.44} L${x + w},${BASE - 10} L${x - w},${BASE - 10} Z`}
      />
    </g>
  );
}

function House({ spec }: { spec: HouseSpec }) {
  const [x, w, h, lit] = spec;
  const bodyTop = BASE - h;
  const peak = bodyTop - h * 0.72;
  const eave = w * 0.16;
  const left = x - w / 2;
  const chimneyX = x + w * 0.2;
  const chimneyTop = bodyTop - h * 0.5;

  return (
    <g>
      {/* Chimney first so the roof overlaps its foot. */}
      <rect
        x={chimneyX}
        y={chimneyTop}
        width={w * 0.14}
        height={h * 0.62}
        fill={FRONT_FILL}
      />
      <rect
        x={chimneyX - 2}
        y={chimneyTop - 5}
        width={w * 0.14 + 4}
        height="6"
        rx="2"
        fill="#dcebf9"
      />

      <rect x={left} y={bodyTop} width={w} height={h} fill={FRONT_FILL} />
      <path
        d={`M${left - eave},${bodyTop + 3} L${x},${peak} L${x + w / 2 + eave},${bodyTop + 3} Z`}
        fill={FRONT_FILL}
      />
      {/* Snow settled along the roof slope. */}
      <path
        d={`M${left - eave},${bodyTop + 3} L${x},${peak} L${x + w / 2 + eave},${bodyTop + 3} L${x + w / 2 + eave - 7},${bodyTop + 3} L${x},${peak + 11} L${left - eave + 7},${bodyTop + 3} Z`}
        fill="#e4f0fb"
      />

      {lit && (
        <g fill="#f7c863" style={{ filter: "drop-shadow(0 0 7px #f7c86399)" }}>
          <rect
            x={left + w * 0.16}
            y={bodyTop + h * 0.26}
            width={w * 0.2}
            height={h * 0.3}
            rx="1.5"
          />
          <rect
            x={left + w * 0.52}
            y={bodyTop + h * 0.26}
            width={w * 0.2}
            height={h * 0.3}
            rx="1.5"
          />
        </g>
      )}
    </g>
  );
}

function Smoke({ spec }: { spec: [number, number, number, number] }) {
  const [x, y, puffs, period] = spec;
  return (
    <g fill="#d6e4f4" style={{ filter: "blur(3.5px)" }}>
      {Array.from({ length: puffs }, (_, i) => (
        <ellipse
          key={i}
          className="xm-smoke"
          cx={x}
          cy={y}
          rx="9"
          ry="7.5"
          style={
            {
              "--dur": `${period}s`,
              "--d": `${(period / puffs) * i}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </g>
  );
}

export default function VillageSkyline({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 2400 420"
      preserveAspectRatio="xMidYMax meet"
      className={className}
      aria-hidden="true"
    >
      <defs>
        {/* Moonlit haze rising off the snow. Without it the silhouettes
            have nothing to sit against and only their snow caps read. */}
        <linearGradient id="xm-village-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(150,186,226,0)" />
          <stop offset="44%" stopColor="rgba(158,196,236,0.14)" />
          <stop offset="70%" stopColor="rgba(186,214,244,0.34)" />
          <stop offset="88%" stopColor="rgba(196,222,248,0.26)" />
          <stop offset="100%" stopColor="rgba(196,222,248,0)" />
        </linearGradient>
        {/* Fades out at the floor so the element has no visible bottom. */}
        <linearGradient id="xm-village-bank" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(188,216,244,0.82)" />
          <stop offset="40%" stopColor="rgba(142,180,220,0.56)" />
          <stop offset="100%" stopColor="rgba(110,148,194,0)" />
        </linearGradient>
      </defs>

      <rect x="0" y="40" width="2400" height="380" fill="url(#xm-village-haze)" />

      {BACK_PINES.map((spec, i) => (
        <Pine key={`b${i}`} spec={spec} />
      ))}
      {SMOKERS.map((spec, i) => (
        <Smoke key={`s${i}`} spec={spec} />
      ))}
      {HOUSES.map((spec, i) => (
        <House key={`h${i}`} spec={spec} />
      ))}
      {FRONT_PINES.map((spec, i) => (
        <Pine key={`f${i}`} spec={spec} />
      ))}

      {/* Snow banked over the feet of everything above. */}
      <path d={BANK} fill="url(#xm-village-bank)" />
      <path
        d={BANK_CREST}
        fill="none"
        stroke="rgba(230,244,255,0.34)"
        strokeWidth="1.25"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
