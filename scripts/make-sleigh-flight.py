"""
`santa sleigh.json` carries one piece of usable art - a 1832x426 Santa sleigh
pulled by three reindeer - wrapped in a composition that is unusable as
shipped: seven of its eight layers are 4x4 placeholder stubs, and the root
layer applies a scale of (-14.9%, 16.2%), mirroring the team and shrinking it
to a smear inside a 960x480 frame.

This re-wraps that artwork in a clean composition the size of the image, with
a gentle rock so it reads as flying rather than sliding. The cross-screen
travel is left to CSS, where the path can be authored against the card.

Run:  python scripts/make-sleigh-flight.py
"""

from __future__ import annotations

import json
import os

SRC = os.path.join("public", "lottie", "santa sleigh.json")
DST = os.path.join("public", "lottie", "sleigh_fly.json")

ART_ID = "image_5"
FPS = 30
FRAMES = 150


def rock(width: int, height: int) -> dict:
    """A slow bank plus a shallow bob, looping seamlessly over FRAMES."""
    cx, cy = width / 2, height / 2
    quarter = FRAMES / 4
    ease_out = {"x": [0.4], "y": [1]}
    ease_in = {"x": [0.6], "y": [0]}

    def swing(values: list[float], axis: str) -> list[dict]:
        keys = []
        for i, value in enumerate(values):
            frame = round(i * quarter)
            point = [cx, cy + value, 0] if axis == "y" else [value]
            keys.append({"t": frame, "s": point, "o": ease_in, "i": ease_out})
        keys[-1].pop("o", None)
        keys[-1].pop("i", None)
        return keys

    return {
        "o": {"a": 0, "k": 100},
        "r": {"a": 1, "k": swing([-1.6, 1.4, -1.6, 1.4, -1.6], "r")},
        "p": {"a": 1, "k": swing([0, -9, 0, 9, 0], "y")},
        "a": {"a": 0, "k": [cx, cy, 0]},
        "s": {"a": 0, "k": [100, 100, 100]},
    }


def main() -> None:
    with open(SRC, encoding="utf-8") as fh:
        source = json.load(fh)

    art = next(a for a in source["assets"] if a.get("id") == ART_ID)
    width, height = art["w"], art["h"]

    comp = {
        "v": source.get("v", "5.7.4"),
        "fr": FPS,
        "ip": 0,
        "op": FRAMES,
        "w": width,
        "h": height,
        "nm": "Santa sleigh flight",
        "ddd": 0,
        "assets": [art],
        "layers": [
            {
                "ddd": 0,
                "ind": 1,
                "ty": 2,
                "nm": "Santa sleigh",
                "refId": ART_ID,
                "ks": rock(width, height),
                "ao": 0,
                "ip": 0,
                "op": FRAMES,
                "st": 0,
                "bm": 0,
            }
        ],
    }

    with open(DST, "w", encoding="utf-8") as fh:
        json.dump(comp, fh, separators=(",", ":"))

    print(f"canvas  : {width}x{height} @ {FPS}fps, {FRAMES} frames")
    print(
        f"{os.path.getsize(SRC) / 1024:.0f} KB -> {os.path.getsize(DST) / 1024:.0f} KB"
    )


if __name__ == "__main__":
    main()
