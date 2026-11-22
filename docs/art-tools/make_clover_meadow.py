"""Builds the Clover Hill Meadow room (the lily pond cottage) from one finished cartoon picture.

Usage (from the repo root):
    python docs/art-tools/make_clover_meadow.py docs/art-tools/clover_meadow_source.webp

The source picture is the hand-inked pond scene with the passengers taken out of the boat
(docs/art-tools/clover_remove_characters.py does that step once). This script then
  * cuts the foreground out of it: the two big trees, the grass in the corners and the little boat,
  * paints the ground behind each cut-out, so the layers can move apart for the mouse parallax,
  * makes a night version of every layer (deep blue, a moon, stars, a glowing cabin window),
  * writes the WebP layers to client/public/scenes/clover-meadow and the seed api/src/seed/cloverMeadow.js.
It needs only numpy, Pillow and opencv-python-headless.
"""
import os, sys, json
import numpy as np
import cv2
from PIL import Image, ImageDraw

SRC = sys.argv[1] if len(sys.argv) > 1 else 'docs/art-tools/clover_meadow_source.webp'
DST = sys.argv[2] if len(sys.argv) > 2 else 'client/public/scenes/clover-meadow'
SEED = sys.argv[3] if len(sys.argv) > 3 else 'api/src/seed/cloverMeadow.js'
SLUG = 'clover-meadow'
os.makedirs(DST, exist_ok=True)
for f in os.listdir(DST):
    if f.endswith('.webp'):
        os.remove(os.path.join(DST, f))

im = np.asarray(Image.open(SRC).convert('RGB').resize((1920, 1080), Image.LANCZOS))
# the source is a soft video frame: a gentle sharpening brings the ink lines back
_blur = cv2.GaussianBlur(im, (0, 0), 1.6)
im = np.clip(im.astype(np.float32) + 0.7 * (im.astype(np.float32) - _blur.astype(np.float32)), 0, 255).astype(np.uint8)
H, W = im.shape[:2]
f = im.astype(np.float32)
R, G, B = f[..., 0], f[..., 1], f[..., 2]
hsv = cv2.cvtColor(im, cv2.COLOR_RGB2HSV).astype(np.float32)
HUE, S, V = hsv[..., 0] * 2, hsv[..., 1] / 255, hsv[..., 2] / 255
YY, XX = np.mgrid[0:H, 0:W]


def poly(pts):
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).polygon(pts, fill=255)
    return np.asarray(m) > 0


def clean(m, minarea=300, close=7):
    """close small gaps, drop specks, fill holes"""
    m = m.astype(np.uint8) * 255
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((close, close), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    out = np.zeros_like(m)
    for i in range(1, n):
        if st[i, 4] >= minarea:
            out[lab == i] = 255
    pad = cv2.copyMakeBorder(out, 1, 1, 1, 1, cv2.BORDER_CONSTANT, value=0)
    inv = 255 - pad
    mk = np.zeros((inv.shape[0] + 2, inv.shape[1] + 2), np.uint8)
    cv2.floodFill(inv, mk, (0, 0), 0)
    return ((pad | inv)[1:-1, 1:-1]) > 0


# ---------- cut-outs, found by colour inside a rough area
dark = (V < 0.60) & (G >= B - 10)
yellow = (HUE > 40) & (HUE < 80) & (S > 0.55) & (V > 0.6)
reg = poly([(1215, 0), (1920, 0), (1920, 700), (1860, 700), (1860, 420), (1700, 400), (1700, 345), (1215, 345)])
M = {}
M['tree_right'] = clean((dark | yellow) & reg)
reg = poly([(0, 0), (440, 0), (440, 150), (330, 175), (112, 186), (70, 300), (0, 300)])
M['tree_left'] = clean(((V < 0.62) | yellow) & reg)
plant = ((HUE > 45) & (HUE < 150) & (V < 0.78) & (S > 0.3)) | (V < 0.25) | ((R > G + 8) & (V < 0.7)) | ((S < 0.22) & (V < 0.7) & (V > 0.3))
M['grass_left'] = clean((plant | yellow) & poly([(0, 760), (300, 760), (300, 1080), (0, 1080)]))
M['grass_right'] = clean((plant | yellow) & poly([(1720, 880), (1920, 880), (1920, 1080), (1720, 1080)]))
boat_area = np.zeros((H, W), bool)
boat_area[822:962, 850:1620] = True
wood = (R > G + 4) | (V < 0.30)
cream = (R > 205) & (G > 185) & (B > 110) & (B < R - 20)
M['boat'] = clean((wood | cream) & boat_area, 150, 9)

cut = np.zeros((H, W), bool)
for m in M.values():
    cut |= m

# ---------- the picture behind the cut-outs: the cut-outs are painted over from their surroundings
hole = cv2.dilate(cut.astype(np.uint8) * 255, np.ones((15, 15), np.uint8))
small = cv2.resize(im, (W // 2, H // 2), interpolation=cv2.INTER_AREA)
hs = cv2.resize(hole, (W // 2, H // 2), interpolation=cv2.INTER_NEAREST)
filled = cv2.inpaint(small, hs, 9, cv2.INPAINT_TELEA)
filled = cv2.resize(filled, (W, H), interpolation=cv2.INTER_CUBIC)
hf = cv2.GaussianBlur((hole > 0).astype(np.float32), (0, 0), 3)[..., None]
back = (im * (1 - hf) + filled * hf).astype(np.float32)
# the little dashes above the empty boat (the passengers' last marks) are painted out
back[826:842, 995:1460] = back[822:824, 995:1460].mean(0)[None]

# ---------- sun glints on the water: bright streaks become their own layer that drifts, the pond below is calmer
water = (G > R + 25) & (HUE > 150) & (HUE < 195) & (S > 0.2) & (YY > 600) & (~(hole > 0))
water = cv2.erode(water.astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
Lw = back.mean(-1)
hi = np.clip((Lw - cv2.GaussianBlur(Lw, (0, 0), 14)) / 16 - 0.12, 0, 1) * water
hi = cv2.GaussianBlur(hi, (0, 0), 1.5)
calm = cv2.GaussianBlur(back, (0, 0), 9)
back_c = back * (1 - hi[..., None] * 0.9) + calm * (hi[..., None] * 0.9)
back_c = np.clip(back_c, 0, 255)
glint_col = np.clip(back * 1.08 + 8, 0, 255)

# ---------- the night: a deep blue grade, a moon and stars in the sky, a warm cabin window
def grade(img):
    c = np.clip(img / 255.0, 0, 1)
    lum = c.mean(-1, keepdims=True)
    n = (c ** 1.0) * np.array([0.34, 0.50, 0.92])
    n = n + np.array([0.02, 0.05, 0.11]) * (1 - lum)
    g = n.mean(-1, keepdims=True)
    n = g + (n - g) * 1.25          # a little more colour
    return np.clip(n * 255, 0, 255)


bk = np.clip(back_c, 0, 255)
bV = bk.max(-1) / 255.0
sky = (bk[..., 2] > bk[..., 1] + 2) & (bV > 0.78) & (YY < 470)
sky |= (bk[..., 0] > 225) & (bk[..., 1] > 225) & (bk[..., 2] > 225) & (YY < 470)
sky = cv2.morphologyEx(sky.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
sky = cv2.dilate(sky, np.ones((3, 3), np.uint8)) > 0
ty = np.clip(YY / 420.0, 0, 1)[..., None]
sky_col = (np.array([14, 22, 62]) * (1 - ty) + np.array([54, 70, 128]) * ty).astype(np.float32)
mx, my = 1100, 150
d = np.sqrt((XX - mx) ** 2 + (YY - my) ** 2)
sky_col = sky_col + (np.exp(-d / 180)[..., None] * np.array([40, 44, 60]))
disc = np.clip((62 - d) / 2.0, 0, 1)
bite = np.clip((56 - np.sqrt((XX - mx - 30) ** 2 + (YY - my + 14) ** 2)) / 2.0, 0, 1)
crescent = np.clip(disc - bite, 0, 1)[..., None]
sky_col = sky_col * (1 - crescent) + np.array([252, 240, 206]) * crescent
rs = np.random.RandomState(8)
stars = np.zeros((H, W), np.float32)
for _ in range(360):
    sx, sy = rs.randint(0, W), int(abs(rs.randn()) * 150 + rs.rand() * 70)
    if sy < 440:
        r = rs.choice([1, 1, 2])
        stars[max(0, sy - r):sy + r + 1, max(0, sx - r):sx + r + 1] = rs.uniform(0.35, 1.0)
stars = np.clip(cv2.GaussianBlur(stars, (0, 0), 0.9) * 3.2, 0, 1)
sky_col = np.clip(sky_col, 0, 255)
night_back = grade(back_c)
sm = cv2.GaussianBlur(sky.astype(np.float32), (0, 0), 1.2)[..., None]
night_back = night_back * (1 - sm) + sky_col * sm
_w = ((G > R + 25) & (HUE > 150) & (HUE < 195) & (YY > 600)).astype(np.float32)
_w = cv2.GaussianBlur(_w, (0, 0), 3)
_sheen = np.clip(1 - (YY - 600) / 480.0, 0, 1) ** 1.4
night_back = night_back + (_w * _sheen)[..., None] * np.array([16.0, 30.0, 52.0])
# the cabin window: the panes light up
pane = (YY > 368) & (YY < 462) & (XX > 262) & (XX < 352) & (V > 0.38) & (S < 0.5) & (B > R - 10)
pane = cv2.dilate(pane.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
pm = cv2.GaussianBlur(pane.astype(np.float32), (0, 0), 1.0)[..., None]
night_back = night_back * (1 - pm) + np.array([255, 214, 130]) * pm
glow_xy = (305, 418)


def save_webp(arr, name, alpha=None, scale=1, crop=None, q=92):
    """arr is HxWx3 float, alpha HxW float 0..1 (None = opaque). Returns the layer's box in percent."""
    rgb = np.clip(arr, 0, 255).astype(np.uint8)
    if alpha is None:
        img = Image.fromarray(rgb, 'RGB')
        box = None
    else:
        a = (np.clip(alpha, 0, 1) * 255).astype(np.uint8)
        if crop is None:
            ys, xs = np.where(a > 3)
            x0, y0, x1, y1 = max(0, xs.min() - 4), max(0, ys.min() - 4), min(W, xs.max() + 5), min(H, ys.max() + 5)
        else:
            x0, y0, x1, y1 = crop
        img = Image.fromarray(np.dstack([rgb, a]), 'RGBA').crop((x0, y0, x1, y1))
        box = {'x': round(x0 / W * 100, 2), 'y': round(y0 / H * 100, 2), 'width': round((x1 - x0) / W * 100, 2), 'height': round((y1 - y0) / H * 100, 2)}
    if scale > 1:
        img = img.resize((max(8, img.width // scale), max(6, img.height // scale)), Image.LANCZOS)
    path = os.path.join(DST, name + '.webp')
    img.save(path, 'WEBP', quality=q, method=5)
    return box, os.path.getsize(path)


def soft_alpha(m):
    """a cut-out mask with one pixel of soft edge; the colours come from the picture itself"""
    m = cv2.erode(m.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(np.float32)
    return cv2.GaussianBlur(m, (0, 0), 0.9)


layers = []
total = 0


def add(name, fn, arr, alpha=None, depth=0.5, extra=None, scale=1, q=92, crop=None):
    global total
    box, size = save_webp(arr, fn, alpha, scale, crop, q)
    total += size
    e = {'name': name, 'image': f'/scenes/{SLUG}/{fn}.webp', 'depth': depth}
    if box:
        e['box'] = box
    e.update(extra or {})
    layers.append(e)
    return e


# opaque pond picture, day and night
add('lily pond and cabin', 'pond', back_c, None, 0.12, {'light': True}, q=92)
add('moonlit pond and cabin', 'pond_night', night_back, None, 0.12, {'night': True}, q=90)
# water glints that slide slowly
ga = np.clip(hi * 1.15, 0, 1)
add('sun glints', 'glints', glint_col, ga, 0.2, {'light': True, 'anim': {'name': 'drift', 'distance': 2.2, 'duration': 24}}, q=80)
add('moon glints', 'glints_night', grade(glint_col) * 1.25 + 12, ga * 0.75, 0.2, {'night': True, 'anim': {'name': 'drift', 'distance': 2.2, 'duration': 24}}, q=80)
# the cabin window glow, only at night
gx, gy = glow_xy
d2 = ((XX - gx) / 170.0) ** 2 + ((YY - gy) / 120.0) ** 2
ga2 = np.clip(np.exp(-d2 * 2.4) * 0.85, 0, 1)
glow = np.dstack([np.full((H, W), 255.0), np.full((H, W), 196.0), np.full((H, W), 96.0)])
add('cabin window glow', 'glow_window', glow, ga2, 0.12, {'night': True, 'anim': {'name': 'pulse', 'duration': 5}}, scale=4, q=80, crop=(80, 250, 540, 600))


def cutout(name, key, depth, anim=None, slug=None):
    a = soft_alpha(M[key])
    nm = slug or key
    ex = {'light': True}
    exn = {'night': True}
    if anim:
        ex['anim'] = anim
        exn['anim'] = anim
    # a common crop box, so day and night pictures sit in the same place
    ys, xs = np.where(a > 0.01)
    crop = (max(0, xs.min() - 4), max(0, ys.min() - 4), min(W, xs.max() + 5), min(H, ys.max() + 5))
    add(name, nm, im.astype(np.float32), a, depth, ex, crop=crop)
    # the bright pixels along the outline (leftovers of the sky) are inked over, so no pale halo shows at night
    mk = M[key].astype(np.uint8)
    band = (mk > 0) & (cv2.erode(mk, np.ones((7, 7), np.uint8)) == 0) & (V > 0.45)
    band = cv2.GaussianBlur(band.astype(np.float32), (0, 0), 0.8)[..., None]
    ng = grade(im.astype(np.float32))
    ng = ng * (1 - band * 0.92) + np.array([12.0, 10.0, 18.0]) * (band * 0.92)
    add(name + ' at night', nm + '_night', ng, a, depth, exn, crop=crop)


# ---------- things that make the night alive
def sprite_layer(draw_fn, w, h, x, y, ss=4):
    """draw a small picture at 4x size, shrink it, and put it on a full-size transparent frame"""
    img = Image.new('RGBA', (w * ss, h * ss), (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(img), ss)
    img = img.resize((w, h), Image.LANCZOS)
    a = np.zeros((H, W), np.float32)
    c = np.zeros((H, W, 3), np.float32)
    arr = np.asarray(img).astype(np.float32)
    a[y:y + h, x:x + w] = arr[..., 3] / 255
    c[y:y + h, x:x + w] = arr[..., :3]
    return c, a


INK = (44, 34, 34, 255)


def radio_pic(d, ss, lit):
    """a little tabletop radio drawn the way the painting draws things: seen from above and a bit from the right, thin brown ink lines, flat warm fills"""
    k = ss
    ink = (58, 40, 36, 255)
    lw = int(3.0 * k)
    def P(pts):
        return [(x * k, y * k) for x, y in pts]
    def poly(pts, fill):
        d.polygon(P(pts), fill=fill)
        d.line(P(pts + [pts[0]]), fill=ink, width=lw, joint='curve')
    d.polygon(P([(2, 123), (126, 123), (156, 110), (30, 110)]), fill=(70, 50, 56, 120))                  # shadow on the planks
    d.line(P([(124, 50), (146, 9)]), fill=ink, width=int(2.4 * k))                                         # antenna
    d.ellipse([143 * k, 4 * k, 151 * k, 12 * k], fill=(206, 78, 58, 255), outline=ink, width=int(1.6 * k))
    poly([(122, 57), (142, 42), (142, 103), (122, 118)], (150, 94, 92, 255))                                # right side, in the shade
    poly([(18, 57), (122, 57), (142, 42), (38, 42)], (250, 196, 132, 255))                                  # top, lit by the sun
    d.line(P([(60, 49), (64, 33), (108, 33), (112, 46)]), fill=ink, width=int(5 * k), joint='curve')       # handle
    d.line(P([(60, 49), (64, 33), (108, 33), (112, 46)]), fill=(206, 150, 96, 255), width=int(2 * k), joint='curve')
    poly([(18, 57), (122, 57), (122, 118), (18, 118)], (222, 128, 82, 255))                                 # front
    d.polygon(P([(21, 60), (119, 60), (119, 66), (21, 66)]), fill=(240, 160, 106, 255))                     # light edge along the top of the front
    d.polygon(P([(21, 108), (119, 108), (119, 115), (21, 115)]), fill=(186, 100, 64, 255))                   # shade along the bottom
    cream = (242, 226, 190, 255)
    d.ellipse([26 * k, 66 * k, 72 * k, 112 * k], fill=cream, outline=ink, width=int(2 * k))                  # speaker
    for r in (17, 11, 5):
        d.ellipse([(49 - r) * k, (89 - r) * k, (49 + r) * k, (89 + r) * k], outline=(170, 122, 84, 255), width=int(1.6 * k))
    for yy in (74, 80, 86, 92, 98, 104):
        d.line(P([(34, yy), (64, yy)]), fill=(206, 176, 136, 255), width=int(0.9 * k))
    win = (255, 228, 124, 255) if lit else (250, 238, 196, 255)
    d.rounded_rectangle([80 * k, 68 * k, 114 * k, 82 * k], 3 * k, fill=win, outline=ink, width=int(1.8 * k))     # dial window
    d.line(P([(96, 70), (96, 80)]), fill=(200, 62, 50, 255), width=int(1.8 * k))
    for cx in (88, 105):
        d.ellipse([(cx - 6) * k, 90 * k, (cx + 6) * k, 102 * k], fill=cream, outline=ink, width=int(1.8 * k))   # knobs
        d.line(P([(cx, 92), (cx + 1, 97)]), fill=ink, width=int(1.4 * k))
    for fx in (26, 104):
        d.rectangle([fx * k, 118 * k, (fx + 11) * k, 123 * k], fill=ink)                                       # feet


def lantern_pic(d, ss, lit):
    k = ss
    glass = (255, 214, 104, 255) if lit else (236, 226, 190, 255)
    d.line([(22 * k, 6 * k), (22 * k, 14 * k)], fill=INK, width=int(3 * k))
    d.ellipse([16 * k, 0, 28 * k, 9 * k], outline=INK, width=int(2.5 * k))
    d.polygon([(6 * k, 24 * k), (38 * k, 24 * k), (30 * k, 12 * k), (14 * k, 12 * k)], fill=(86, 62, 48, 255), outline=INK)
    d.rectangle([8 * k, 24 * k, 36 * k, 60 * k], fill=glass, outline=INK, width=int(3 * k))
    if lit:
        d.ellipse([14 * k, 32 * k, 30 * k, 54 * k], fill=(255, 250, 214, 255))
    d.line([(22 * k, 24 * k), (22 * k, 60 * k)], fill=INK, width=int(2 * k))
    d.rectangle([5 * k, 60 * k, 39 * k, 67 * k], fill=(86, 62, 48, 255), outline=INK, width=int(2.5 * k))


# ---------- things a visitor can put in the room (Decorate): pictures drawn the way the painting draws, day and night
INK2 = (58, 40, 36, 255)
CATALOG = []
SURFACES = [
    # the dock, the grassy shore and the water; drawAt is filled in once the layers are known
    {'key': 'dock', 'area': {'x': 13, 'y': 53, 'width': 26, 'height': 9}, 'perspective': {'farY': 53, 'nearY': 62, 'farScale': 0.85, 'nearScale': 1.15}},
    {'key': 'shore', 'area': {'x': 40, 'y': 53.5, 'width': 40, 'height': 4.5}, 'perspective': {'farY': 53.5, 'nearY': 58, 'farScale': 0.85, 'nearScale': 1.0}},
    {'key': 'water', 'area': {'x': 4, 'y': 63, 'width': 90, 'height': 30}, 'perspective': {'farY': 63, 'nearY': 93, 'farScale': 0.6, 'nearScale': 1.2}},
]
os.makedirs(DST, exist_ok=True)


def item_sprite(key, label, surface, cx, cy, w, h, fn, scale=(0.6, 1.8), anim=None, unique=False, in_default=False, rs=5, hit=False):
    """draw a little object at 4x, put it on the stage with its contact point at (cx, cy) pixels, and register it in the catalog.
    The canvas is w x h, the contact point is at (w/2, h-8) inside it."""
    x0, y0 = cx - w // 2, cy - (h - 8)
    box = None
    for lit, (suffix, flag) in ((False, ('', 'light')), (True, (' at night', 'night'))):
        c, a = sprite_layer(lambda d, k: fn(d, k, lit), w, h, x0, y0)
        c = c + np.random.RandomState(rs).randn(H, W, 1).astype(np.float32) * 4.0      # a little paper grain, like the painting's fills
        if lit:
            c = grade(c) * 0.55 + c * 0.45
        ex = {flag: True, 'item': key}
        if anim:
            ex['anim'] = dict(anim)
        e = add(label + suffix, key + ('_night' if lit else ''), c, a, 0.12, ex, q=92)
        box = e['box']
    # the tray picture: the object alone, cropped, small
    img = Image.new('RGBA', (w * 4, h * 4), (0, 0, 0, 0))
    fn(ImageDraw.Draw(img), 4, False)
    bb = img.getchannel('A').point(lambda v: 255 if v > 90 else 0).getbbox()
    img = img.crop(bb)
    sc = 110.0 / max(img.size)
    img = img.resize((max(8, int(img.width * sc)), max(8, int(img.height * sc))), Image.LANCZOS)
    img.save(os.path.join(DST, key + '_thumb.webp'), 'WEBP', quality=88, method=5)
    CATALOG.append({'key': key, 'label': label, 'surface': surface, 'home': {'x': round(cx / W * 100, 2), 'y': round(cy / H * 100, 2)},
                    'bounds': dict(box), 'thumb': f'/scenes/{SLUG}/{key}_thumb.webp', 'flippable': False, 'unique': unique, 'inDefault': in_default,
                    'scale': {'min': scale[0], 'max': scale[1]}})


def wob(d, k, lit, cx, cy, rx, ry):
    """pale rings on the water around a floating thing"""
    d.ellipse([(cx - rx) * k, (cy - ry) * k, (cx + rx) * k, (cy + ry) * k], outline=(236, 248, 246, 190), width=int(2.2 * k))
    d.ellipse([(cx - rx * 0.66) * k, (cy - ry * 0.66) * k, (cx + rx * 0.66) * k, (cy + ry * 0.66) * k], outline=(236, 248, 246, 120), width=int(1.6 * k))


def flower_pot(d, k, lit):
    P = lambda pts: [(x * k, y * k) for x, y in pts]
    lw = int(2.6 * k)
    d.polygon(P([(18, 112), (80, 112), (94, 105), (36, 105)]), fill=(70, 50, 56, 110))
    for sx, sy in ((30, 44), (48, 30), (66, 48), (40, 58), (58, 60)):                       # stems
        d.line(P([(48, 74), (sx, sy + 8)]), fill=(84, 128, 62, 255), width=int(3 * k))
    for lx, ly, r in ((34, 66, 9), (62, 68, 9), (48, 56, 8)):                                # leaves
        d.ellipse([(lx - r) * k, (ly - r * 0.6) * k, (lx + r) * k, (ly + r * 0.6) * k], fill=(120, 176, 84, 255), outline=INK2, width=int(1.8 * k))
    d.polygon(P([(26, 80), (70, 80), (64, 112), (32, 112)]), fill=(206, 112, 72, 255)); d.line(P([(26, 80), (32, 112), (64, 112), (70, 80)]), fill=INK2, width=lw, joint='curve')
    d.polygon(P([(30, 84), (38, 84), (42, 110), (36, 110)]), fill=(228, 142, 96, 255))
    d.rounded_rectangle([22 * k, 70 * k, 74 * k, 82 * k], 3 * k, fill=(226, 132, 88, 255), outline=INK2, width=lw)
    d.ellipse([27 * k, 71 * k, 69 * k, 79 * k], fill=(96, 68, 52, 255))
    for fx, fy, r, kind in ((30, 40, 9, 'w'), (48, 24, 10, 'w'), (66, 44, 9, 'w'), (40, 56, 6, 'b'), (59, 58, 6, 'b')):
        col = (250, 246, 236, 255) if kind == 'w' else (116, 150, 226, 255)
        for ang in range(0, 360, 60):
            px, py = fx + np.cos(np.radians(ang)) * r * 0.78, fy + np.sin(np.radians(ang)) * r * 0.78
            d.ellipse([(px - r * 0.52) * k, (py - r * 0.52) * k, (px + r * 0.52) * k, (py + r * 0.52) * k], fill=col, outline=INK2, width=int(1.5 * k))
        d.ellipse([(fx - r * 0.38) * k, (fy - r * 0.38) * k, (fx + r * 0.38) * k, (fy + r * 0.38) * k], fill=(248, 204, 72, 255), outline=INK2, width=int(1.4 * k))


def basket(d, k, lit):
    P = lambda pts: [(x * k, y * k) for x, y in pts]
    lw = int(2.8 * k)
    d.polygon(P([(8, 90), (112, 90), (124, 78), (22, 78)]), fill=(70, 50, 56, 110))
    d.line(P([(32, 52), (60, 16), (88, 52)]), fill=INK2, width=int(6 * k), joint='curve')
    d.line(P([(32, 52), (60, 16), (88, 52)]), fill=(176, 126, 74, 255), width=int(2.6 * k), joint='curve')
    d.polygon(P([(14, 50), (106, 50), (98, 88), (22, 88)]), fill=(204, 154, 92, 255)); d.line(P([(14, 50), (22, 88), (98, 88), (106, 50)]), fill=INK2, width=lw, joint='curve')
    for yy in range(58, 88, 8):
        d.line(P([(17 + (yy - 50) * 0.2, yy), (103 - (yy - 50) * 0.2, yy)]), fill=(168, 118, 68, 255), width=int(1.6 * k))
    d.polygon(P([(98, 50), (106, 50), (98, 88), (92, 88)]), fill=(168, 114, 76, 255))
    d.polygon(P([(10, 44), (110, 44), (112, 54), (8, 54)]), fill=(214, 90, 74, 255)); d.line(P([(10, 44), (110, 44), (112, 54), (8, 54), (10, 44)]), fill=INK2, width=lw, joint='curve')
    for i, x in enumerate(range(14, 106, 14)):                                                # checked cloth
        d.rectangle([x * k, 45 * k, (x + 7) * k, 53 * k], fill=(250, 240, 226, 255) if i % 2 == 0 else (214, 90, 74, 255))
    d.polygon(P([(10, 44), (110, 44), (104, 36), (16, 36)]), fill=(240, 196, 120, 255)); d.line(P([(10, 44), (16, 36), (104, 36), (110, 44)]), fill=INK2, width=lw, joint='curve')


def watering_can(d, k, lit):
    P = lambda pts: [(x * k, y * k) for x, y in pts]
    lw = int(2.8 * k)
    d.polygon(P([(14, 90), (96, 90), (110, 80), (28, 80)]), fill=(70, 50, 56, 110))
    d.line(P([(76, 66), (102, 34)]), fill=INK2, width=int(11 * k)); d.line(P([(76, 66), (102, 34)]), fill=(104, 168, 140, 255), width=int(5.5 * k))
    d.ellipse([94 * k, 22 * k, 112 * k, 38 * k], fill=(88, 148, 124, 255), outline=INK2, width=int(2.2 * k))
    d.arc([6 * k, 40 * k, 38 * k, 80 * k], 90, 270, fill=INK2, width=int(6 * k)); d.arc([6 * k, 40 * k, 38 * k, 80 * k], 90, 270, fill=(104, 168, 140, 255), width=int(2.4 * k))
    d.line(P([(34, 40), (50, 20), (70, 40)]), fill=INK2, width=int(6 * k), joint='curve'); d.line(P([(34, 40), (50, 20), (70, 40)]), fill=(104, 168, 140, 255), width=int(2.4 * k), joint='curve')
    d.rounded_rectangle([22 * k, 36 * k, 80 * k, 88 * k], 8 * k, fill=(112, 176, 148, 255), outline=INK2, width=lw)
    d.rectangle([24 * k, 62 * k, 78 * k, 70 * k], fill=(86, 146, 122, 255))
    d.rounded_rectangle([27 * k, 41 * k, 35 * k, 82 * k], 4 * k, fill=(160, 214, 186, 255))
    d.ellipse([22 * k, 31 * k, 80 * k, 44 * k], fill=(62, 96, 86, 255), outline=INK2, width=int(2.4 * k))


def mushrooms(d, k, lit):
    P = lambda pts: [(x * k, y * k) for x, y in pts]
    d.polygon(P([(6, 76), (76, 76), (86, 69), (16, 69)]), fill=(70, 50, 56, 100))
    for cx, base, cw, ch, sw in ((40, 74, 44, 26, 15), (68, 74, 30, 18, 10), (14, 74, 26, 15, 8)):
        d.rounded_rectangle([(cx - sw / 2) * k, (base - ch) * k, (cx + sw / 2) * k, base * k], 3 * k, fill=(246, 234, 206, 255), outline=INK2, width=int(2.4 * k))
        d.pieslice([(cx - cw / 2) * k, (base - ch - cw * 0.46) * k, (cx + cw / 2) * k, (base - ch + cw * 0.46) * k], 180, 360, fill=(214, 74, 62, 255), outline=INK2, width=int(2.6 * k))
        d.line([((cx - cw / 2) * k, (base - ch) * k), ((cx + cw / 2) * k, (base - ch) * k)], fill=INK2, width=int(2.4 * k))
        for dx, dy, r in ((-0.22, -0.26, 0.11), (0.06, -0.3, 0.09), (0.24, -0.18, 0.08)):
            d.ellipse([(cx + dx * cw - r * cw) * k, (base - ch + dy * cw - r * cw) * k, (cx + dx * cw + r * cw) * k, (base - ch + dy * cw + r * cw) * k], fill=(252, 246, 234, 255))


def book_stack(d, k, lit):
    P = lambda pts: [(x * k, y * k) for x, y in pts]
    lw = int(2.6 * k)
    d.polygon(P([(2, 74), (96, 74), (110, 66), (16, 66)]), fill=(70, 50, 56, 100))
    for (x0, x1, yt, yb, col, dark) in ((8, 92, 56, 72, (92, 134, 160, 255), (70, 108, 132, 255)), (14, 86, 40, 56, (204, 100, 72, 255), (170, 78, 56, 255)), (10, 80, 26, 40, (230, 194, 114, 255), (200, 160, 84, 255))):
        d.polygon(P([(x0, yt), (x1, yt), (x1 + 12, yt - 8), (x0 + 12, yt - 8)]), fill=(250, 240, 214, 255))
        d.polygon(P([(x1, yt), (x1 + 12, yt - 8), (x1 + 12, yb - 8), (x1, yb)]), fill=dark)
        d.rectangle([x0 * k, yt * k, x1 * k, yb * k], fill=col)
        d.line(P([(x0, yt), (x1, yt), (x1 + 12, yt - 8), (x0 + 12, yt - 8), (x0, yt)]), fill=INK2, width=lw, joint='curve')
        d.line(P([(x1, yt), (x1, yb), (x0, yb), (x0, yt)]), fill=INK2, width=lw, joint='curve')
        d.line(P([(x1 + 12, yt - 8), (x1 + 12, yb - 8), (x1, yb)]), fill=INK2, width=lw, joint='curve')
        d.line(P([(x0 + 8, yt + 4), (x0 + 8, yb - 4)]), fill=(250, 240, 214, 255), width=int(1.6 * k))


def lily_pads(d, k, lit):
    wob(d, k, lit, 65, 44, 56, 16)
    for cx, cy, rx, ry in ((40, 44, 24, 9), (92, 46, 22, 8), (66, 36, 20, 7)):
        d.ellipse([(cx - rx) * k, (cy - ry) * k, (cx + rx) * k, (cy + ry) * k], fill=(112, 172, 84, 255), outline=INK2, width=int(2.4 * k))
        d.line([(cx * k, cy * k), ((cx + rx * 0.8) * k, (cy - ry * 0.3) * k)], fill=(70, 120, 58, 255), width=int(2 * k))
        d.ellipse([(cx - rx * 0.55) * k, (cy - ry * 0.6) * k, (cx + rx * 0.2) * k, (cy + ry * 0.1) * k], fill=(144, 196, 100, 255))
    fx, fy = 66, 34
    for ang in (-60, -30, 0, 30, 60):
        tx, ty = fx + np.sin(np.radians(ang)) * 15, fy - 16 + abs(ang) * 0.12
        d.polygon([(fx * k, fy * k), ((fx + (tx - fx) * 0.5 - 6) * k, (fy + (ty - fy) * 0.5) * k), (tx * k, ty * k), ((fx + (tx - fx) * 0.5 + 6) * k, (fy + (ty - fy) * 0.5) * k)], fill=(248, 156, 176, 255), outline=INK2)
        d.line([(fx * k, fy * k), ((fx + (tx - fx) * 0.5 - 6) * k, (fy + (ty - fy) * 0.5) * k), (tx * k, ty * k), ((fx + (tx - fx) * 0.5 + 6) * k, (fy + (ty - fy) * 0.5) * k), (fx * k, fy * k)], fill=INK2, width=int(1.8 * k))
    d.ellipse([(fx - 5) * k, (fy - 5) * k, (fx + 5) * k, (fy + 3) * k], fill=(250, 214, 92, 255), outline=INK2, width=int(1.6 * k))


def duck(d, k, lit):
    wob(d, k, lit, 42, 60, 36, 9)
    P = lambda pts: [(x * k, y * k) for x, y in pts]
    lw = int(2.8 * k)
    d.polygon(P([(10, 40), (2, 28), (20, 34)]), fill=(250, 206, 70, 255)); d.line(P([(10, 40), (2, 28), (20, 34)]), fill=INK2, width=lw, joint='curve')
    d.ellipse([8 * k, 30 * k, 70 * k, 64 * k], fill=(250, 208, 72, 255), outline=INK2, width=lw)
    d.ellipse([46 * k, 8 * k, 72 * k, 36 * k], fill=(252, 214, 84, 255), outline=INK2, width=lw)
    d.polygon(P([(70, 20), (82, 24), (70, 30)]), fill=(240, 130, 60, 255)); d.line(P([(70, 20), (82, 24), (70, 30)]), fill=INK2, width=int(2.2 * k), joint='curve')
    d.ellipse([58 * k, 16 * k, 63 * k, 21 * k], fill=INK2)
    d.arc([22 * k, 40 * k, 50 * k, 58 * k], 190, 340, fill=(214, 164, 46, 255), width=int(2.6 * k))
    d.ellipse([14 * k, 50 * k, 40 * k, 60 * k], fill=(254, 232, 150, 255))


def paper_boat(d, k, lit):
    wob(d, k, lit, 55, 54, 46, 10)
    P = lambda pts: [(x * k, y * k) for x, y in pts]
    lw = int(2.6 * k)
    d.polygon(P([(55, 6), (55, 38), (96, 38)]), fill=(250, 246, 236, 255))
    d.polygon(P([(55, 6), (55, 38), (14, 38)]), fill=(224, 220, 212, 255))
    d.polygon(P([(10, 38), (100, 38), (82, 56), (28, 56)]), fill=(244, 238, 226, 255))
    d.polygon(P([(10, 38), (55, 38), (46, 56), (28, 56)]), fill=(222, 216, 206, 255))
    d.line(P([(55, 6), (96, 38), (100, 38), (82, 56), (28, 56), (10, 38), (14, 38), (55, 6), (55, 38)]), fill=INK2, width=lw, joint='curve')
    d.line(P([(14, 38), (96, 38)]), fill=INK2, width=int(2 * k))


# the radio on the porch (the dock in front of the cabin) and a lantern on the post
RX, RY = 520, 504        # top-left of the radio picture (its feet touch the planks at y 633)
LX, LY = 698, 518        # top-left of the lantern picture (it stands on the post at y 585)
item_sprite('radio', 'Porch radio', 'dock', RX + 84, RY + 124, 168, 132, radio_pic, scale=(0.7, 1.5), unique=True, in_default=True)
item_sprite('lantern', 'Porch lantern', 'dock', LX + 22, 585, 44, 76, lantern_pic, scale=(0.7, 1.5), unique=True, in_default=True)
item_sprite('flower_pot', 'Flower pot', 'dock', 330, 646, 96, 120, flower_pot, scale=(0.6, 1.6))
item_sprite('basket', 'Picnic basket', 'shore', 900, 604, 128, 96, basket, scale=(0.6, 1.6))
item_sprite('watering_can', 'Watering can', 'shore', 1290, 596, 118, 96, watering_can, scale=(0.6, 1.6))
item_sprite('mushrooms', 'Toadstools', 'shore', 1030, 608, 92, 84, mushrooms, scale=(0.6, 1.8))
item_sprite('book_stack', 'Stack of books', 'dock', 390, 648, 116, 84, book_stack, scale=(0.6, 1.6))
item_sprite('lily_pads', 'Lily pads and lotus', 'water', 420, 800, 132, 70, lily_pads, scale=(0.6, 1.8), anim={'name': 'sway', 'amplitude': 0.8, 'pivot': {'x': 50.0, 'y': 85.0}, 'duration': 6.5})
item_sprite('duck', 'Rubber duck', 'water', 640, 770, 86, 76, duck, scale=(0.6, 1.8), anim={'name': 'sway', 'amplitude': 1.2, 'pivot': {'x': 50.0, 'y': 88.0}, 'duration': 5.2})
item_sprite('paper_boat', 'Paper boat', 'water', 1000, 780, 112, 70, paper_boat, scale=(0.6, 1.8), anim={'name': 'sway', 'amplitude': 1.4, 'pivot': {'x': 50.0, 'y': 88.0}, 'duration': 6.1})

# glows (plain alpha pictures)
def glow_pic(cx, cy, rx, ry, color, strength):
    d2 = ((XX - cx) / rx) ** 2 + ((YY - cy) / ry) ** 2
    return np.dstack([np.full((H, W), float(color[0])), np.full((H, W), float(color[1])), np.full((H, W), float(color[2]))]), np.clip(np.exp(-d2 * 2.4) * strength, 0, 1)


c, a = glow_pic(720, 548, 150, 130, (255, 200, 100), 0.9)
add('lantern glow', 'glow_lantern', c, a, 0.12, {'night': True, 'item': 'lantern', 'anim': {'name': 'pulse', 'duration': 4.2}}, scale=4, q=80, crop=(520, 380, 920, 720))
c, a = glow_pic(590, 590, 130, 60, (255, 170, 80), 0.55)
add('radio dial glow', 'glow_radio', c, a, 0.12, {'night': True, 'item': 'radio', 'anim': {'name': 'pulse', 'duration': 3.1}}, scale=4, q=80, crop=(440, 500, 740, 700))
# warm light from the window falling on the porch and the water
lt = np.zeros((H, W), np.float32)
rs2 = np.random.RandomState(4)
for k in range(9):
    yk = 660 + k * 22
    half = 130 - k * 9 + rs2.randint(-12, 12)
    cx = 330 + rs2.randint(-14, 14)
    x0_ = cx - half + rs2.randint(0, 30)
    lt[yk - 3:yk + 3, x0_:cx + half - rs2.randint(0, 30)] = 0.6 - k * 0.055
lt = cv2.GaussianBlur(lt, (0, 0), 6)
add('window light on the water', 'water_window', np.dstack([np.full((H, W), 255.0), np.full((H, W), 196.0), np.full((H, W), 110.0)]), np.clip(lt * 1.1, 0, 1), 0.2,
    {'night': True, 'anim': {'name': 'drift', 'distance': 1.2, 'duration': 8}}, scale=2, q=80)
# the moon on the water: wobbling pale streaks that slide a little
mr = np.zeros((H, W), np.float32)
for k in range(16):
    yk = 640 + k * 24
    half = int(max(14, 120 * (1 - k / 20.0) * (0.55 + 0.45 * rs2.rand())))
    cx = 1100 + int(14 * np.sin(k * 1.3))
    for seg in range(3):
        a0 = cx - half + rs2.randint(0, half // 2 + 1) + seg * (2 * half // 3)
        mr[yk - 3:yk + 3, a0:a0 + max(10, 2 * half // 3 - rs2.randint(0, 20))] = 0.6 - k * 0.03
mr = cv2.GaussianBlur(mr, (0, 0), 5)
add('moon on the water', 'water_moon', np.dstack([np.full((H, W), 255.0), np.full((H, W), 240.0), np.full((H, W), 196.0)]), np.clip(mr * 0.95, 0, 1), 0.2,
    {'night': True, 'anim': {'name': 'drift', 'distance': 1.6, 'duration': 9}}, scale=2, q=80)
# a thin mist lying on the pond
nz = cv2.resize(rs2.rand(24, 96).astype(np.float32), (W, 220), interpolation=cv2.INTER_CUBIC)
nz = np.clip((nz - 0.45) * 2.2, 0, 1)
mist = np.zeros((H, W), np.float32)
mist[640:860] = nz[:220] * np.linspace(0.0, 1.0, 220)[:, None] * np.linspace(1.0, 0.0, 220)[:, None] * 4
mist = cv2.GaussianBlur(np.clip(mist, 0, 1), (0, 0), 14)
add('night mist', 'mist_night', np.dstack([np.full((H, W), 150.0), np.full((H, W), 176.0), np.full((H, W), 230.0)]), np.clip(mist * 0.5, 0, 1), 0.25,
    {'night': True, 'anim': {'name': 'drift', 'distance': 5, 'duration': 70}}, scale=4, q=75)
# the stars twinkle, in two groups that breathe at different speeds
stars = stars * cv2.erode(sky.astype(np.uint8), np.ones((9, 9), np.uint8))
_n, _lab = cv2.connectedComponents((stars > 0.04).astype(np.uint8))
st_a = stars * ((_lab % 2) == 0)
st_b = stars - st_a
for nm, fn, arr_, dur, dl in (('twinkling stars', 'stars_a', st_a, 3.6, 0), ('twinkling stars 2', 'stars_b', st_b, 5.4, -2)):
    add(nm, fn, np.dstack([np.full((H, W), 255.0), np.full((H, W), 252.0), np.full((H, W), 230.0)]), np.clip(arr_, 0, 1), 0.04,
        {'night': True, 'anim': {'name': 'pulse', 'duration': dur, 'delay': dl}}, q=85)


cutout('little boat', 'boat', 0.45, {'name': 'sway', 'amplitude': 0.7, 'pivot': {'x': 50.0, 'y': 78.0}, 'duration': 7})
cutout('left oak', 'tree_left', 0.7, {'name': 'sway', 'amplitude': 0.25, 'pivot': {'x': 20.0, 'y': 0.0}, 'duration': 11})
cutout('right oak', 'tree_right', 0.75, {'name': 'sway', 'amplitude': 0.25, 'pivot': {'x': 90.0, 'y': 90.0}, 'duration': 12})
cutout('cattails', 'grass_left', 0.95, {'name': 'sway', 'amplitude': 1.2, 'pivot': {'x': 40.0, 'y': 100.0}, 'duration': 6})
cutout('reeds', 'grass_right', 0.95, {'name': 'sway', 'amplitude': 1.0, 'pivot': {'x': 60.0, 'y': 100.0}, 'duration': 7})


# a soft vignette
v = np.clip(((XX - 960) / 1250.0) ** 2 + ((YY - 540) / 760.0) ** 2, 0, 1)
add('vignette', 'vignette', np.dstack([np.full((H, W), 8.0), np.full((H, W), 10.0), np.full((H, W), 14.0)]), np.clip(v * 0.45, 0, 1), 0.0, {}, scale=4, crop=(0, 0, W, H), q=80)

# two tiny invisible pictures carry the click spots, because the pictures that change with the light cannot
Image.fromarray(np.dstack([np.zeros((8, 8, 3), np.uint8), np.full((8, 8), 1, np.uint8)]), 'RGBA').save(os.path.join(DST, 'hit.webp'), 'WEBP', lossless=True)


def hit(name, x0, y0, x1, y1, item=None):
    e = {'name': name, 'image': f'/scenes/{SLUG}/hit.webp', 'depth': 0.45 if 'boat' in name else 0.12,
         'box': {'x': round(x0 / W * 100, 2), 'y': round(y0 / H * 100, 2), 'width': round((x1 - x0) / W * 100, 2), 'height': round((y1 - y0) / H * 100, 2)}}
    if item:
        e['item'] = item
    layers.append(e)


hit('window hit', 250, 355, 365, 475)
ys, xs = np.where(M['boat'])
hit('boat hit', xs.min(), ys.min(), xs.max(), ys.max())
hit('radio hit', RX, RY + 6, RX + 168, RY + 132, 'radio')
hit('lantern hit', LX - 8, LY, LX + 52, LY + 70, 'lantern')
layers.append({'name': 'effects', 'image': f'/scenes/{SLUG}/hit.webp', 'depth': 0.3, 'box': {'x': 0, 'y': 0, 'width': 100, 'height': 100}})
print('layers', len(layers), 'KB', total // 1024)

# stills for the intro page and the room list
Image.fromarray(np.clip(back_c, 0, 255).astype(np.uint8)).save('/tmp/_unused.png') if False else None
day = back_c.copy()
for key, nm in (('grass_left', 0), ('grass_right', 0), ('tree_left', 0), ('tree_right', 0), ('boat', 0)):
    pass
comp = im  # the original, cleaned, picture is the day view
Image.fromarray(comp).save(os.path.join(DST, 'intro.webp'), 'WEBP', quality=80, method=5)
Image.fromarray(comp).resize((480, 270), Image.LANCZOS).save(os.path.join(DST, 'preview.webp'), 'WEBP', quality=80, method=5)


def idx(n):
    return next(i for i, l in enumerate(layers) if l['name'] == n)


def fmt(o):
    if isinstance(o, dict):
        return '{ ' + ', '.join(f'{k}: {fmt(v)}' for k, v in o.items()) + ' }'
    if isinstance(o, bool):
        return 'true' if o else 'false'
    if isinstance(o, str):
        return "'" + o.replace("'", "\\'") + "'"
    return json.dumps(o)


objects = [
    {'key': 'pond', 'label': 'Lily pond', 'layer': idx('effects'), 'x': 4, 'y': 64, 'width': 70, 'height': 30, 'action': {'type': 'toggleEffect', 'effect': 'fireflies'}},
    {'key': 'lantern', 'label': 'Porch lantern: golden hour or starlight', 'layer': idx('lantern hit'), 'x': 0, 'y': 0, 'width': 100, 'height': 100, 'action': {'type': 'toggleLight'}},
    {'key': 'window', 'label': 'Cabin window: golden hour or starlight', 'layer': idx('window hit'), 'x': 0, 'y': 0, 'width': 100, 'height': 100, 'action': {'type': 'toggleLight'}},
    {'key': 'radio', 'label': 'Porch radio', 'layer': idx('radio hit'), 'x': 0, 'y': 0, 'width': 100, 'height': 100, 'action': {'type': 'nextTrack'}},
    {'key': 'boat', 'label': 'Little boat', 'layer': idx('boat hit'), 'x': 0, 'y': 0, 'width': 100, 'height': 100, 'action': {'type': 'nextTrack'}},
]
lines = ["// Scene: Clover Hill Meadow, a lily pond with a little cabin, a wooden dock with a radio on the porch and a boat that rocks.",
         "// The picture is a hand-inked cartoon cut into layers (two oaks, cattails and reeds, the boat), so it can move for the mouse",
         "// and sway in the wind. Clicking the cabin window switches between golden hour and a starry night; the radio (or the boat) opens the music player.",
         "// The layers are made by docs/art-tools/make_clover_meadow.py (needs numpy, Pillow and opencv-python-headless)."]
body = ["module.exports = {",
        "  slug: 'clover-meadow',",
        "  name: 'Clover Hill Meadow',",
        "  description: 'A lily pond in golden light: a little cabin on a dock, two old oaks and a porch radio that plays your music. Click the lantern for a starry night.',",
        "  layers: ["]
for i, l in enumerate(layers):
    body.append(f"    {fmt(l)}, // {i}")
body.append("  ],")
body.append("  objects: [")
for o in objects:
    body.append(f"    {fmt(o)},")
body.append("  ],")
for sf in SURFACES:
    sf['drawAt'] = idx('little boat')          # the things on the dock, the shore and the water are drawn behind the boat and the trees
body.append("  // What a visitor may put in the room (Decorate). The pictures of an object are the layers with its key in `item`.")
body.append("  catalog: [")
for ce in CATALOG:
    body.append(f"    {fmt(ce)},")
body.append("  ],")
body.append("  surfaces: [")
for sf in SURFACES:
    body.append(f"    {fmt(sf)},")
body.append("  ],")
body.append("  nightDim: 0, // the night is painted in its own layers, there is no extra dimming")
body.append("  effects: ['fireflies', 'stars'],")
body.append("  defaultEffect: 'fireflies',")
body.append(f"  effectLayer: {idx('effects')}, // the fireflies and stars float above the pond, below the trees")
body.append("};")
open(SEED, 'w').write('\n'.join(lines + body) + '\n')
print('seed ok', len(layers))
