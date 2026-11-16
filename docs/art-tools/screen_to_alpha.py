"""Turns "screen" glow pictures into ordinary see-through pictures.

A glow layer used to be drawn with the blend mode "screen": the graphics card had to read what was already drawn
below it and mix the two, once per glow, for every redraw. That reading is the most expensive step of drawing a room
(about two thirds of the work in Rainy Night Study).

Screen mixes like this, per colour channel (b = what is below, s = the glow, both 0..1):
    result = b * (1 - s) + s
An ordinary see-through picture with colour c and opacity a mixes like this:
    result = b * (1 - a) + c * a
So with a = the brightest channel of the glow and c = s / a, the second line gives the same light with no reading
back. The only difference: below a coloured glow, the weaker channels of the background are dimmed a touch more,
which makes the glow very slightly richer. A picture converted once is not changed by a second run.

That dimming shows where a strongly coloured glow lies over something bright, so six big glows keep the exact
"screen" mixing in the seed (the lamp light on the desk in Rainy Night Study; the window light, light beams, bloom,
moonlight and shelf lamp glow in Golden Hour Loft; the far light shafts in Clam Cove). Do not convert those.

Usage (from the repo root), with the list of screen layers taken from the seed BEFORE its blend is removed:
    python3 docs/art-tools/screen_to_alpha.py client/public/scenes/night-study/c_wall_lamp.webp ...
"""
import sys

import numpy as np
from PIL import Image


def convert(path):
    picture = np.asarray(Image.open(path).convert('RGBA')).astype(np.float32) / 255
    glow = picture[..., :3] * picture[..., 3:4]  # the light the picture adds, counting its own see-through parts
    opacity = glow.max(axis=2, keepdims=True)
    colour = np.where(opacity > 0, glow / np.maximum(opacity, 1e-6), 0)
    out = np.concatenate([colour, opacity], axis=2)
    Image.fromarray(np.round(out * 255).astype(np.uint8), 'RGBA').save(path, 'WEBP', quality=92, method=6, exact=True)


if __name__ == '__main__':
    for path in sys.argv[1:]:
        convert(path)
        print('converted', path)
