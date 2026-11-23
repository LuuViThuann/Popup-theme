"""Downscale the bitmaps embedded in the Lottie compositions.

Two of the scene's compositions are image sequences rather than vector art,
and both ship their frames at the size they were authored at rather than the
size they are drawn at:

    sleigh_fly.json   one 1832x426 true-colour PNG -> drawn at most 300px wide

That is 273KB of base64 the browser has to transfer, parse out of the JSON
and decode before the sleigh can appear, for pixels the scaler then throws
away.

`noel_run_alpha.json` is deliberately not in the list. Its twelve frames look
like the obvious second target at 544KB, but they are already 600x360 palette
PNGs of about 45KB each - re-encoding them as WebP made the file half again
as large, and quantising them harder bought 16% at the cost of banding on the
one character that crosses the whole stage in close-up. They are left alone.

The asset's declared `w`/`h` are deliberately left alone. Lottie sizes an
image layer from those fields and lets the browser scale the decoded bitmap
to fit, so replacing the pixels with a smaller copy changes nothing about the
geometry - it only changes how many pixels had to arrive to produce it.

PNG is swapped for WebP at the same time: these are alpha-keyed frames, which
is the case PNG handles worst and WebP handles well.

Run:  python scripts/shrink-bitmaps.py
Idempotent - a frame already at or under its target is left untouched.
"""

from __future__ import annotations

import base64
import io
import json
import pathlib
import re

LOTTIE = pathlib.Path(__file__).resolve().parent.parent / "public" / "lottie"

# file -> longest edge any frame needs, in device pixels.
# The widest either character is ever drawn is ~300 CSS px; these leave room
# for a 2x display and then some.
TARGETS = {
    "sleigh_fly.json": 820,
}

QUALITY = 82

DATA_URI = re.compile(r"^data:image/(png|jpe?g|webp);base64,(.*)$", re.DOTALL)


def shrink(payload: str, longest: int) -> tuple[str, bool]:
    """Return (data-uri, changed)."""
    from PIL import Image

    match = DATA_URI.match(payload)
    if not match:
        return payload, False

    raw = base64.b64decode(match.group(2))
    image = Image.open(io.BytesIO(raw))
    image = image.convert("RGBA")

    scale = longest / max(image.width, image.height)
    if scale < 1:
        image = image.resize(
            (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
            Image.LANCZOS,
        )
    elif match.group(1) == "webp":
        # Already converted and already small enough.
        return payload, False

    buffer = io.BytesIO()
    image.save(buffer, format="WEBP", quality=QUALITY, method=6)
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/webp;base64,{encoded}", True


def main() -> None:
    for name, longest in TARGETS.items():
        path = LOTTIE / name
        if not path.exists():
            print(f"skip {name}: not found")
            continue

        before = path.stat().st_size
        data = json.loads(path.read_text(encoding="utf-8"))

        touched = 0
        for asset in data.get("assets", []):
            payload = asset.get("p")
            if not isinstance(payload, str) or not payload.startswith("data:"):
                continue
            new, changed = shrink(payload, longest)
            if changed:
                asset["p"] = new
                touched += 1

        if not touched:
            print(f"{name}: already optimised")
            continue

        encoded = json.dumps(data, separators=(",", ":"))
        # A source frame that was already well packed - a palette PNG, say -
        # can come back bigger than it went in. Never trade size for nothing.
        if len(encoded.encode("utf-8")) >= before:
            print(f"{name}: re-encoding would not shrink it; left alone")
            continue

        path.write_text(encoded, encoding="utf-8")
        after = path.stat().st_size
        print(
            f"{name}: {touched} frame(s), "
            f"{before / 1024:.0f}KB -> {after / 1024:.0f}KB "
            f"({100 - after * 100 / before:.0f}% smaller)"
        )


if __name__ == "__main__":
    main()
