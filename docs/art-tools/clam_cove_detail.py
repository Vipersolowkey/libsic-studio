# Clam Cove: gives the smooth "plastic block" rocks and sand a real surface.
#   rocks: bumps and cracks lit from the sun side, mottled colour (algae, coralline pink, ochre), darker creases
#          where a rock meets the sand, a light rim on top edges, and small clusters of polyps and sponges growing on them
#   sand:  ripples that get finer toward the back, grain, tiny shell bits
#   water: the near haze is thinner so the front keeps its contrast; the day jellyfish are easier to see
# Reads the untouched pictures from SRC and writes the new ones to OUT. Run again any time: it always starts from SRC.
import sys, numpy as np
from PIL import Image, ImageDraw, ImageFilter
SRC, OUT = sys.argv[1], sys.argv[2]
SUN = np.array([0.55, -0.83])  # light comes from the upper right, where the sun glimmer is

def load(n): return np.asarray(Image.open(f'{SRC}/{n}.webp').convert('RGBA')).astype(np.float32) / 255
def save(n, a, q=86): Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA').save(f'{OUT}/{n}.webp', quality=q, method=6)
def up(grid, w, h): return np.asarray(Image.fromarray(grid.astype(np.float32), 'F').resize((w, h), Image.BICUBIC))
def fbm(w, h, cell, octaves, rng, ridged=False):
    out = np.zeros((h, w), np.float32); amp, total = 1.0, 0.0
    for _ in range(octaves):
        g = rng.random((max(2, int(h / cell) + 2), max(2, int(w / cell) + 2)))
        n = up(g, w, h)
        if ridged: n = 1 - np.abs(2 * n - 1)
        out += n * amp; total += amp; amp *= 0.5; cell = max(1.5, cell / 2)
    return out / total
def blur(a, r): return np.asarray(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8), 'L').filter(ImageFilter.GaussianBlur(r))).astype(np.float32) / 255

PATCHES = [((0.86, 0.56, 0.66), 0.34), ((0.80, 0.63, 0.36), 0.30), ((0.38, 0.60, 0.46), 0.34), ((0.20, 0.38, 0.48), 0.30), ((0.62, 0.50, 0.74), 0.24)]
GROWTH = [(1.0, 0.62, 0.70), (1.0, 0.74, 0.38), (0.98, 0.90, 0.55), (0.72, 0.60, 0.95), (0.55, 0.92, 0.80), (1.0, 0.52, 0.42)]

def rock(name, seed, strength=1.0, growth=0, scale=1.0):
    rng = np.random.default_rng(seed)
    im = load(name); h, w = im.shape[:2]; rgb, a = im[..., :3].copy(), im[..., 3]
    # 1. a height map: big lumps, small bumps, and thin cracks
    height = fbm(w, h, 70 * scale, 4, rng) * 1.0 + fbm(w, h, 14 * scale, 3, rng) * 0.42 + fbm(w, h, 4 * scale, 2, rng) * 0.14
    cracks = fbm(w, h, 46 * scale, 3, rng, ridged=True) ** 7
    height -= cracks * 0.55
    gy, gx = np.gradient(height)
    lit = (gx * SUN[0] + gy * SUN[1]) * -1
    lit = lit / (np.abs(lit).std() + 1e-6)
    shade = 1 + np.clip(lit * 0.11 * strength, -0.32, 0.30)
    shade *= 1 - cracks * 0.45 * strength                       # cracks are dark
    shade *= 1 + (fbm(w, h, 110 * scale, 3, rng) - 0.5) * 0.36 * strength   # broad light and dark areas
    # 2. mottled colour, keeping the shading of the picture
    lum = rgb.mean(axis=2, keepdims=True)
    orig_lum = im[..., :3].mean(axis=2).copy()
    for colour, amount in PATCHES:
        m = fbm(w, h, 90 * scale, 4, rng)
        m = np.clip((m - 0.56) * 8, 0, 1)[..., None] * amount * 0.75 * strength
        rgb = rgb * (1 - m) + np.array(colour) * (0.2 + lum * 1.25) * m
    # 3. volume: darker toward the bottom and just inside the outline, a light rim on edges that face the sun
    inner = blur(a, 9 * scale)
    occl = 1 - np.clip((1 - inner) * a, 0, 1) * 0.42 * strength
    yy = np.linspace(0, 1, h)[:, None]
    foot = 1 - np.clip((yy - 0.72) / 0.28, 0, 1) * 0.22 * strength
    sx, sy = int(round(SUN[0] * 3)), int(round(SUN[1] * 3))
    shifted = np.roll(np.roll(a, -sy, axis=0), -sx, axis=1)
    rim = np.clip(a - shifted, 0, 1) * a
    rim = blur(rim, 0.8) * 0.55 * strength
    before = (rgb.mean(axis=2) * a).sum() / (a.sum() + 1e-6)
    rgb = rgb * (shade * occl * foot)[..., None]
    after = (rgb.mean(axis=2) * a).sum() / (a.sum() + 1e-6)
    rgb = rgb * (before / after * 1.04)                       # as bright as the picture was, only no longer flat
    rgb = rgb + (np.array([0.82, 0.97, 1.0]) - rgb) * rim[..., None]
    # 4. life on the rock: clusters of polyps and little sponges
    if growth:
        K = 2
        over = Image.new('RGBA', (w * K, h * K), (0, 0, 0, 0)); d = ImageDraw.Draw(over)
        ys, xs = np.nonzero(a > 0.97)
        mine = [GROWTH[i] for i in rng.choice(len(GROWTH), 3, replace=False)]   # each rock has its own few kinds
        for _ in range(growth):
            i = rng.integers(len(xs)); cx, cy = xs[i], ys[i]
            col = np.array(mine[rng.integers(3)]) * 0.72 + 0.2; spread = rng.uniform(5, 14) * scale
            for _ in range(int(rng.integers(4, 14))):
                x, y = cx + rng.normal(0, spread), cy + rng.normal(0, spread * 0.6)
                xi, yi = int(x), int(y)
                if not (0 <= xi < w and 0 <= yi < h) or a[yi, xi] < 0.97: continue
                r = rng.uniform(1.1, 3.2) * scale; l = float(np.clip(rgb[yi, xi].mean() * 1.25 + 0.3, 0.35, 1.0))
                c = tuple(int(v * 255 * l) for v in col); dark = tuple(int(v * 0.5) for v in c)
                d.ellipse([(x - r + 0.9) * K, (y - r + 1.0) * K, (x + r + 0.9) * K, (y + r + 1.0) * K], fill=dark + (120,))
                d.ellipse([(x - r) * K, (y - r) * K, (x + r) * K, (y + r) * K], fill=c + (215,))
                d.ellipse([(x - r * 0.1) * K, (y - r * 0.75) * K, (x + r * 0.6) * K, (y - r * 0.05) * K], fill=(255, 255, 255, 95))
        o = np.asarray(over.resize((w, h), Image.LANCZOS)).astype(np.float32) / 255
        rgb = rgb * (1 - o[..., 3:]) + o[..., :3] * o[..., 3:]
    im[..., :3] = rgb; save(name, im)

def sand(name, seed, front=False):
    rng = np.random.default_rng(seed)
    im = load(name); h, w = im.shape[:2]; rgb, a = im[..., :3].copy(), im[..., 3]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    depth = 0.25 + 0.75 * (yy / h) if not front else np.ones_like(yy)   # ripples are small far away and wide up close
    warp = fbm(w, h, 120, 3, rng) * 60 + fbm(w, h, 30, 2, rng) * 10
    phase = (yy / (5.5 * depth) + warp / (7 * depth) + xx * 0.012)
    ripple = np.sin(phase * 2 * np.pi / 2.2)
    ripple = np.sign(ripple) * np.abs(ripple) ** 0.6
    shade = 1 + ripple * 0.085 * (0.55 + 0.45 * depth)
    shade *= 1 + (fbm(w, h, 160, 3, rng) - 0.5) * 0.22           # broad patches
    grain = rng.normal(0, 0.035, (h, w)).astype(np.float32)
    rgb = rgb * shade[..., None] + grain[..., None]
    spots = rng.random((h, w)) > 0.9985                          # tiny shell bits and dark grains
    tone = np.where(rng.random((h, w)) > 0.5, 1.32, 0.62)
    rgb = np.where(spots[..., None], rgb * tone[..., None], rgb)
    im[..., :3] = rgb; save(name, im)

def fade(name, factor):
    im = load(name); im[..., 3] = np.clip(im[..., 3] * factor, 0, 1); save(name, im)

rock('arch', 11, 1.0, growth=38)
rock('reef_c1', 12, 1.0, growth=7); rock('reef_c2', 13, 1.0, growth=14); rock('reef_c3', 14, 1.0, growth=6)
rock('reef_r1', 15, 1.0, growth=8); rock('reef_r2', 16, 0.9, growth=16); rock('reef_l1', 17, 1.0, growth=8)
rock('reef_mid', 18, 0.38, scale=0.7); rock('reef_mid2', 19, 0.26, scale=0.6)
rock('reef_far', 20, 0.16, scale=0.5); rock('reef_far0', 21, 0.1, scale=0.45)
sand('sand', 31); sand('sand_front', 32, front=True)
fade('fog_2', 0.6); fade('fog_1', 0.9)
for j in ('jelly_1_bell', 'jelly_1_tent', 'jelly_2_bell', 'jelly_2_tent', 'jelly_3_bell', 'jelly_3_tent'): fade(j, 1.7)
