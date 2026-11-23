"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Stage from "./Stage";
import { preloadCritical, preloadScene } from "@/lib/lottie-cache";
import { CRITICAL, DEFERRED } from "@/lib/scene";

type Phase = "loading" | "open" | "closing" | "closed";

/**
 * How long the dark screen may hold waiting for the gift box. Past this the
 * greeting opens anyway and the box fades in late: a stage that has begun
 * without one prop reads far better than a black screen that will not end.
 */
const MAX_WAIT_MS = 2200;

export default function ChristmasPopup() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [mounted, setMounted] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const reopenRef = useRef<HTMLButtonElement | null>(null);

  // Nothing to show before the stage exists.
  const visible = phase === "open" || phase === "closing";

  /*
   * Act 1 is a single gift box in the dark, so the box is the only thing the
   * curtain has to wait for. The characters that follow - nearly 1.4MB of
   * composition between them - are warmed in the background and parsed one at
   * a time behind the opening, each arriving before its own cue.
   *
   * Waiting on the whole scene is what made the first screen take as long as
   * it did, and it bought nothing: the stage is still black when most of it
   * finishes loading.
   */
  useEffect(() => {
    let alive = true;

    const open = () => {
      if (!alive) return;
      alive = false;
      setMounted(true);
      setPhase("open");
    };

    void preloadCritical(CRITICAL).then(open);
    preloadScene(DEFERRED);

    const bail = setTimeout(open, MAX_WAIT_MS);
    return () => {
      alive = false;
      clearTimeout(bail);
    };
  }, []);

  const close = useCallback(() => {
    setPhase((current) => (current === "open" ? "closing" : current));
  }, []);

  const reopen = useCallback(() => {
    setPhase("open");
    setMounted(true);
  }, []);

  // Let the exit animation finish before the popup leaves the tree.
  useEffect(() => {
    if (phase !== "closing") return;
    const id = setTimeout(() => setPhase("closed"), 620);
    return () => clearTimeout(id);
  }, [phase]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, close]);

  // The popup owns the viewport while it is up.
  useEffect(() => {
    if (!visible) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [visible]);

  // Move focus with the popup so keyboard users are never stranded.
  useEffect(() => {
    if (phase === "open") cardRef.current?.focus({ preventScroll: true });
    if (phase === "closed") reopenRef.current?.focus({ preventScroll: true });
  }, [phase]);

  return (
    <>
      {phase === "loading" && (
        <div
          className="fixed inset-0 z-[60] bg-night-900"
          role="status"
          aria-live="polite"
        >
          <span className="sr-only">Đang chuẩn bị thiệp Giáng sinh</span>
        </div>
      )}

      {visible && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Lời chúc Giáng sinh"
        >
          <div
            ref={cardRef}
            tabIndex={-1}
            className={`relative h-full w-full outline-none ${
              phase === "closing" ? "xm-popup-out" : "xm-popup-in"
            } ${phase === "open" ? "is-live" : ""}`}
          >
            {mounted && <Stage />}

            <button
              type="button"
              onClick={close}
              aria-label="Đóng thiệp Giáng sinh"
              className="xm-ring absolute top-4 right-4 z-45 grid h-10 w-10 place-items-center rounded-full border border-gold-500/25 bg-night-900/55 text-ice-300/70 backdrop-blur-md transition-all duration-400 hover:scale-105 hover:border-gold-300/60 hover:text-gold-100 sm:top-7 sm:right-7 sm:h-11 sm:w-11"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {phase === "closed" && (
        <button
          ref={reopenRef}
          type="button"
          onClick={reopen}
          className="xm-btn xm-ring fixed right-5 bottom-5 z-50 inline-flex h-12 items-center gap-2.5 rounded-full border border-gold-500/35 bg-night-800/85 px-5 font-sans text-sm font-medium text-gold-100 shadow-[0_18px_44px_-14px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:right-8 sm:bottom-8"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 text-gold-300"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
          </svg>
          Mở lại thiệp
        </button>
      )}
    </>
  );
}
