"""
Santa Claus.json is a finished 1920x1280 scene - night sky, forest, moon, a
snow drift and a "merry christmas" lockup - with Santa's sleigh tracking
across it. Dropped into the popup it reads as a rectangular picture pasted
into the corner.

This extracts just the sleigh and emits santa_fly.json:

  * keeps only the character layers (the sleigh rig and its "HO HO HO")
  * freezes the baked-in right-to-left travel, so the flight path can be
    authored in CSS where it can swoop, bank and scale
  * crops the canvas to the character, which makes the Lottie element's box
    the character's box - no guessing at offsets when positioning it

Run:  python scripts/make-santa-flight.py
"""

from __future__ import annotations

import json
import os

SRC = os.path.join("public", "lottie", "Santa Claus.json")
DST = os.path.join("public", "lottie", "santa_fly.json")

# ind values of the sleigh rig: the root ("Layer 9"), the body and its limbs,
# plus the three "HO" text layers parented to the hat. Everything else is
# scenery: moon, trees, sky, snow drift and the wordmark.
CHARACTER = set(range(1, 13))
ROOT_IND = 4

# In the source scene the sleigh rides the bottom edge and its underside is
# clipped by the canvas. Lifting it clear is what makes it usable airborne.
LIFT = 260

# Character bounds within the canvas once the travel is frozen and lifted,
# measured by rendering every 30th frame and scanning for non-background
# pixels, plus a 16px margin. Re-measure if the source art changes.
CROP = {"x": 391, "y": 195, "w": 1087, "h": 1015}


def main() -> None:
    with open(SRC, encoding="utf-8") as fh:
        comp = json.load(fh)

    comp["layers"] = [l for l in comp["layers"] if l.get("ind") in CHARACTER]
    comp["nm"] = "Santa flight"

    root = next(l for l in comp["layers"] if l.get("ind") == ROOT_IND)
    pos = root["ks"]["p"]

    if pos.get("a"):
        keys = pos["k"]
        first, last = keys[0]["s"], keys[-1]["s"]
        midpoint = [(a + b) / 2 for a, b in zip(first, last)]
        midpoint[1] -= LIFT
        pos["a"] = 0
        pos["k"] = midpoint
        print(f"froze travel {first[:2]} -> {last[:2]} at {midpoint[:2]}")

    # Crop: shift the one root layer, then shrink the canvas around it.
    pos["k"] = [
        pos["k"][0] - CROP["x"],
        pos["k"][1] - CROP["y"],
        *pos["k"][2:],
    ]
    comp["w"], comp["h"] = CROP["w"], CROP["h"]

    with open(DST, "w", encoding="utf-8") as fh:
        json.dump(comp, fh, separators=(",", ":"))

    print(f"layers  : {len(comp['layers'])} kept")
    print(f"canvas  : {CROP['w']}x{CROP['h']}")
    print(
        f"{os.path.getsize(SRC) / 1024:.0f} KB -> {os.path.getsize(DST) / 1024:.0f} KB"
    )


if __name__ == "__main__":
    main()
