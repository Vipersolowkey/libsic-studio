# Golden Hour Loft, night: less flat purple. The cool shade is lifted where light falls (around the shelf lamp, and on the
# desk under the window), and the moonlight and lamp glow layers are made stronger.
import numpy as np, sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
def load(n): return np.asarray(Image.open(f'{src}/{n}.webp').convert('RGBA')).astype(np.float32) / 255
def save(n, a): Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA').save(f'{out}/{n}.webp', quality=88, method=6)
sh = load('n1_nightshade'); h, w = sh.shape[:2]
y, x = np.mgrid[0:h, 0:w]; x = x / w; y = y / h
def blob(cx, cy, rx, ry): return np.exp(-(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2))
lamp = blob(0.875, 0.36, 0.13, 0.22) * 0.75 + blob(0.86, 0.72, 0.16, 0.12) * 0.35      # around the shelf lamp, and its spill on the desk
moon = blob(0.42, 0.76, 0.34, 0.11) * 0.38                                             # the desk under the window
warm = np.array([1.0, 0.86, 0.66]); cool = np.array([0.80, 0.88, 1.0])
rgb = sh[..., :3]
rgb = rgb + (warm - rgb) * lamp[..., None] + (cool - rgb) * moon[..., None] * (1 - lamp[..., None])
rgb = rgb + (1 - rgb) * 0.10                                                           # the whole shade a touch lighter
sh[..., :3] = rgb; save('n1_nightshade', sh)
m = load('n2_moonlight'); m[..., 3] = np.clip(m[..., 3] * 1.7, 0, 1); save('n2_moonlight', m)
l = load('n3_lamp'); l[..., 3] = np.clip(l[..., 3] * 1.45, 0, 1); save('n3_lamp', l)
