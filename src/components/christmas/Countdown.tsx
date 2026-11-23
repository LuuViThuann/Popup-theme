"use client";

import { useEffect, useState } from "react";
import { nextChristmas } from "@/lib/scene";

type Parts = { days: number; hours: number; minutes: number; seconds: number };

const UNITS: { key: keyof Parts; label: string; pad: number }[] = [
  { key: "days", label: "Ngày", pad: 2 },
  { key: "hours", label: "Giờ", pad: 2 },
  { key: "minutes", label: "Phút", pad: 2 },
  { key: "seconds", label: "Giây", pad: 2 },
];

function split(ms: number): Parts {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/**
 * Live countdown to the next 25 December in the visitor's own timezone.
 * Rendered empty on the server so the markup never disagrees with the client
 * clock, then filled on mount.
 */
export default function Countdown({ baseDelay = 0 }: { baseDelay?: number }) {
  const [parts, setParts] = useState<Parts | null>(null);

  useEffect(() => {
    const target = nextChristmas().getTime();
    const tick = () => setParts(split(target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-stretch gap-2 sm:gap-3">
      {UNITS.map((unit, i) => {
        const value = parts ? parts[unit.key] : null;
        const text =
          value === null ? "--" : String(value).padStart(unit.pad, "0");
        return (
          <div
            key={unit.key}
            data-rv="pop"
            style={{ "--d": `${baseDelay + i * 0.09}s` } as React.CSSProperties}
            className="relative flex min-w-[62px] flex-col items-center gap-0.5 overflow-hidden rounded-xl border border-gold-500/25 bg-white/[0.045] px-2.5 py-2 backdrop-blur-md sm:min-w-[82px] sm:rounded-2xl sm:px-4 sm:py-3"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-gold-300/70 to-transparent"
            />
            <span
              key={text}
              className="xm-tick font-mono text-xl leading-none font-semibold tabular-nums text-gold-100 sm:text-3xl"
            >
              {text}
            </span>
            <span className="text-[9px] tracking-[0.22em] text-ice-300/55 uppercase sm:text-[10px]">
              {unit.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
