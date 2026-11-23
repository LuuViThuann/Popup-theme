"""
`happy holidays.json` is a greeting card: two snowmen under a "Happy Holidays"
wordmark, a ringing bell, and a field of drifting particles.

The popup already has its own wordmark and its own snowfall, so this keeps
only the pair of snowmen and emits snowmen_run.json:

  * drops the particle layers from the root composition
  * drops the wordmark, the bell and the null that drives them
  * crops the canvas to the characters, so the Lottie element's box is their
    silhouette and CSS can place them against the sleigh precisely

Run:  python scripts/make-snowmen.py
"""

from __future__ import annotations

import json
import os

SRC = os.path.join("public", "lottie", "happy holidays.json")
DST = os.path.join("public", "lottie", "snowmen_run.json")

CONTENT_REF = "comp_0"
# Inside comp_0: 1 is the null driving the pair, 2 and 3 are the two snowmen,
# 4 and 5 their ground shadows. 6 is the null for the wordmark, 7 the wordmark
# itself and 8 the bell.
KEEP_IN_CONTENT = {1, 2, 3, 4, 5}

# Character bounds within the 1000x1000 canvas, measured by rendering every
# 15th frame and scanning for non-background pixels, plus a 12px margin.
# Re-measure if the source art changes.
CROP = {"x": 85, "y": 221, "w": 854, "h": 750}


def main() -> None:
    with open(SRC, encoding="utf-8") as fh:
        comp = json.load(fh)

    # Root: keep the one precomp layer that holds the characters.
    comp["layers"] = [l for l in comp["layers"] if l.get("refId") == CONTENT_REF]
    comp["nm"] = "Snowmen"

    content = next(a for a in comp["assets"] if a.get("id") == CONTENT_REF)
    content["layers"] = [
        l for l in content["layers"] if l.get("ind") in KEEP_IN_CONTENT
    ]
    comp["assets"] = [content]

    # Crop by shifting the single root layer, then shrinking the canvas.
    root = comp["layers"][0]
    pos = root["ks"]["p"]
    pos["k"] = [pos["k"][0] - CROP["x"], pos["k"][1] - CROP["y"], *pos["k"][2:]]
    comp["w"], comp["h"] = CROP["w"], CROP["h"]

    with open(DST, "w", encoding="utf-8") as fh:
        json.dump(comp, fh, separators=(",", ":"))

    print(f"kept    : {len(content['layers'])} character layers")
    print(f"canvas  : {CROP['w']}x{CROP['h']}")
    print(
        f"{os.path.getsize(SRC) / 1024:.0f} KB -> {os.path.getsize(DST) / 1024:.0f} KB"
    )


if __name__ == "__main__":
    main()
