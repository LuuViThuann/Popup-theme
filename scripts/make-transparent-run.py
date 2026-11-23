"""
noel_run.json ships as 12 JPEG frames, so it carries a solid white background
that cannot be dropped onto the night sky. This rebuilds it as
noel_run_alpha.json with the background keyed out:

  * flood-fill white from the frame border (so Santa's beard and the fur trim,
    which are white but enclosed, survive)
  * erode + feather the resulting matte to eat the JPEG fringe
  * downscale the bitmaps (they render ~240px wide, 1000px is wasted bytes)
    while leaving the declared asset size alone so every layer transform in
    the composition keeps working untouched

Run:  python scripts/make-transparent-run.py
"""

from __future__ import annotations

import base64
import io
import json
import os

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

SRC = os.path.join("public", "lottie", "noel_run.json")
DST = os.path.join("public", "lottie", "noel_run_alpha.json")

# The canvas is a clean 254 spike. Santa's beard and the fur trim sit around
# 240-246, so keying on the value alone separates the two - and unlike a
# border flood fill it also clears enclosed canvas, such as the gap between
# the two reins and the hollow of the sleigh's curl.
CANVAS = 253
NEUTRAL = 4
# Pixels this close to the canvas are treated as JPEG ringing and feathered.
FRINGE_PX = 3
RAMP_FROM = 250.0
RAMP_WIDTH = 14.0
# Fraction of the original bitmap resolution to keep.
SCALE = 0.6


def key_out_background(img: Image.Image) -> Image.Image:
    rgb = np.asarray(img.convert("RGB")).astype(np.int16)
    lo = rgb.min(axis=2)
    hi = rgb.max(axis=2)
    canvas = (lo >= CANVAS) & ((hi - lo) <= NEUTRAL)

    # Only the ring around the canvas gets a soft alpha; everything further in
    # stays fully opaque. Eroding instead would delete the hair-thin reins.
    ramp = np.clip((RAMP_FROM - lo) / RAMP_WIDTH, 0.0, 1.0)
    fringe = ndimage.binary_dilation(canvas, iterations=FRINGE_PX) & ~canvas
    alpha = np.where(fringe, ramp, 1.0) * ~canvas

    matte = Image.fromarray((alpha * 255).astype(np.uint8), mode="L")
    matte = matte.filter(ImageFilter.GaussianBlur(0.4))

    out = img.convert("RGB")
    out.putalpha(matte)
    return out


def main() -> None:
    with open(SRC, encoding="utf-8") as fh:
        comp = json.load(fh)

    before = os.path.getsize(SRC)
    kept = 0

    for asset in comp.get("assets", []):
        payload = asset.get("p")
        if not isinstance(payload, str) or not payload.startswith("data:image"):
            continue

        raw = base64.b64decode(payload.split(",", 1)[1])
        frame = Image.open(io.BytesIO(raw))
        full_w, full_h = frame.size

        frame = key_out_background(frame)
        frame = frame.resize(
            (round(full_w * SCALE), round(full_h * SCALE)), Image.LANCZOS
        )

        # Palette + alpha keeps these cartoon frames small; RGBA is the
        # fallback if quantising ever costs more than it saves.
        quantised = frame.quantize(colors=200, method=Image.FASTOCTREE)
        buf_q, buf_rgba = io.BytesIO(), io.BytesIO()
        quantised.save(buf_q, format="PNG", optimize=True)
        frame.save(buf_rgba, format="PNG", optimize=True)
        best = min(buf_q, buf_rgba, key=lambda b: b.getbuffer().nbytes)

        data = best.getvalue()
        kept += len(data)
        asset["p"] = "data:image/png;base64," + base64.b64encode(data).decode()
        asset["e"] = 1
        # Declared size stays at the original so layer transforms still line up.
        asset["w"], asset["h"] = full_w, full_h

    with open(DST, "w", encoding="utf-8") as fh:
        json.dump(comp, fh, separators=(",", ":"))

    after = os.path.getsize(DST)
    print(f"frames  : {kept / 1024:.0f} KB of PNG")
    print(f"{SRC} -> {DST}")
    print(f"{before / 1024:.0f} KB -> {after / 1024:.0f} KB")


if __name__ == "__main__":
    main()
