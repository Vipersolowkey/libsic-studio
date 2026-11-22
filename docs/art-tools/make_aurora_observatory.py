# Cuts the Blender renders of the Aurora Observatory room into engine layers (webp pictures) and writes the seed file.
# Needs only numpy and Pillow. The mountain, aurora, mist and glass pictures seen through the window stay in the scene folder.
# Run it from the repository root after docs/art-tools/aurora_observatory_blender.py:
#   python docs/art-tools/make_aurora_observatory.py docs/art-tools/_aurora_renders
import os, sys, json, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

R = sys.argv[1] if len(sys.argv) > 1 else os.path.join('docs', 'art-tools', '_aurora_renders')   # the Blender renders (day_*.png, night_*.png, meta2.json)
DST = sys.argv[2] if len(sys.argv) > 2 else os.path.join('client', 'public', 'scenes', 'aurora-observatory')
SEED = sys.argv[3] if len(sys.argv) > 3 else os.path.join('api', 'src', 'seed', 'auroraObservatory.js')
W, H = 1920, 1080
SLUG = 'aurora-observatory'
WINDOW_DIR = sys.argv[4] if len(sys.argv) > 4 else os.path.join('docs', 'art-tools', 'aurora_window')   # the mountain, aurora, mist and glass pictures
ITEMS_DIR = sys.argv[5] if len(sys.argv) > 5 else os.path.join('docs', 'art-tools', '_aurora_items')   # the Blender renders of the Decorate objects (items3d.py)
WINDOW = ['l1_peaks_day', 'l2_aurora_shimmer', 'l2b_mist', 'l3_glass_sheen']
KEEP = ['l1_peaks_day', 'l1b_peaks_night', 'shimmer_sky', 'l2b_mist', 'l3_glass_sheen', 'stars_a', 'stars_b']
meta2 = json.load(open(R + '/meta2.json')); meta = meta2
os.makedirs(DST, exist_ok=True)
import shutil, cv2
for f in WINDOW:
    assert os.path.exists(os.path.join(WINDOW_DIR, f + '.webp')), f
for f in ('l1_peaks_day', 'l2b_mist', 'l3_glass_sheen'):
    shutil.copyfile(os.path.join(WINDOW_DIR, f + '.webp'), os.path.join(DST, f + '.webp'))

# the mist picture's edges still carry a little opacity: fade it out all round so no rectangle shows
_m = Image.open(os.path.join(DST, 'l2b_mist.webp')).convert('RGBA'); _a = np.asarray(_m, np.uint8).copy()
_ey = np.clip(np.minimum(np.arange(_m.height), _m.height - 1 - np.arange(_m.height)) / 40.0, 0, 1)[:, None]
_ex = np.clip(np.minimum(np.arange(_m.width), _m.width - 1 - np.arange(_m.width)) / 60.0, 0, 1)[None, :]
_a[..., 3] = (_a[..., 3].astype(np.float32) * _ey * _ex).astype(np.uint8)
Image.fromarray(_a, 'RGBA').save(os.path.join(DST, 'l2b_mist.webp'), 'WEBP', quality=82, method=5)

# ---- the same mountains by day and by night: the night picture is the day picture in moonlight, with its sky swapped
day_pic = np.asarray(Image.open(os.path.join(WINDOW_DIR, 'l1_peaks_day.webp')).convert('RGB').resize((W, H), Image.LANCZOS))
g = cv2.GaussianBlur(cv2.cvtColor(day_pic, cv2.COLOR_RGB2GRAY).astype(np.float32), (0, 0), 2.2)
mag = np.hypot(cv2.Sobel(g, cv2.CV_32F, 1, 0), cv2.Sobel(g, cv2.CV_32F, 0, 1))
low = cv2.morphologyEx((mag < 9).astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
_n, _lab = cv2.connectedComponents(low)
_top = set(np.unique(_lab[0:3, :])) - {0}
sky0 = np.isin(_lab, list(_top))
sky1 = cv2.morphologyEx(sky0.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((61, 1), np.uint8)) > 0      # thin cloud wisps are part of the sky
sky = np.zeros((H, W), bool)               # for every column: the sky is the unbroken run from the top
for x in range(W):
    col = sky1[:, x]
    nz = np.where(~col)[0]
    sky[:(nz[0] if len(nz) else H), x] = True
for x in range(880, 1560):               # on the right the sunset glow is too steep to count as calm sky: follow it down while it is warm
    y = int(np.where(~sky[:, x])[0][0]) if (~sky[:, x]).any() else H
    while y < H - 1 and y < 520 and int(day_pic[y, x, 0]) >= int(day_pic[y, x, 2]) - 8:
        y += 1
    sky[:y, x] = True
sky = cv2.dilate(sky.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13))) > 0      # the ridge itself is a few pixels below the calm part of the sky
sky = sky.astype(np.float32)
sky = cv2.GaussianBlur(sky, (0, 0), 1.4)
BX0, BY0, BX1, BY1 = 210, 16, 1640, 742      # the box where the night picture sits (percent: 10.94 / 1.48 / 74.48 / 67.22)
# the night sky: the painted northern lights (rows above the old peaks), carried down to the horizon as a soft green haze
aur = np.asarray(Image.open(os.path.join(WINDOW_DIR, 'l1b_peaks_aurora.webp')).convert('RGB').resize((BX1 - BX0, BY1 - BY0), Image.LANCZOS), np.float32)
SK = 280
sky_box = aur.copy()
base = cv2.GaussianBlur(aur[SK - 6:SK, :, :].mean(axis=0, keepdims=True), (0, 0), sigmaX=18, sigmaY=0.1)   # last rows of the sky, blurred sideways
for yy_ in range(SK, BY1 - BY0):
    t_ = min(1.0, (yy_ - SK) / 150.0)
    hz = np.array([20, 58, 84], np.float32)      # pale teal haze over the horizon
    sky_box[yy_] = base[0] * (1 - t_) + (base[0] * 0.5 + hz * 0.5) * t_
sky_box[SK - 24:SK + 8] = cv2.GaussianBlur(sky_box[SK - 24:SK + 8], (0, 0), 3)
sky_full = np.zeros((H, W, 3), np.float32); sky_full[:] = sky_box[-1][0:1, :].mean(axis=0)
sky_full[BY0:BY1, BX0:BX1] = sky_box
sky_col = sky_full
cc = day_pic.astype(np.float32) / 255
lum_ = cc.mean(-1, keepdims=True)
moon_g = (cc ** 0.95) * np.array([0.58, 0.78, 1.0]) * 1.08 + np.array([0.02, 0.05, 0.10]) * (1 - lum_)
yfade_ = np.clip(1.0 - np.mgrid[0:H, 0:W][0][..., None] / 700.0, 0, 1)
moon_g = moon_g + np.array([-0.02, 0.07, 0.03]) * lum_ * yfade_      # northern lights tint the upper snow green
night_pic = np.clip(moon_g * 255, 0, 255) * (1 - sky[..., None]) + sky_col * sky[..., None]
Image.fromarray(np.clip(night_pic, 0, 255).astype(np.uint8)).crop((BX0, BY0, BX1, BY1)).save(os.path.join(DST, 'l1b_peaks_night.webp'), 'WEBP', quality=86, method=5)
# the northern lights only hang in the sky
sh = Image.open(os.path.join(WINDOW_DIR, 'l2_aurora_shimmer.webp')).convert('RGBA')
sx0, sy0 = int(round(16.82 / 100 * W)), int(round(2.78 / 100 * H))
sha = np.asarray(sh, np.uint8).copy()
msk = sky[sy0:sy0 + sh.height, sx0:sx0 + sh.width]
sha[..., 3] = (sha[..., 3].astype(np.float32) * msk).astype(np.uint8)
Image.fromarray(sha, 'RGBA').save(os.path.join(DST, 'shimmer_sky.webp'), 'WEBP', quality=82, method=5)
# stars in the sky, in two groups that twinkle at different speeds
rs_ = np.random.RandomState(11)
st = [np.zeros((H, W), np.float32), np.zeros((H, W), np.float32)]
for i in range(300):
    for _try in range(30):
        sx_, sy_ = rs_.randint(BX0 + 20, BX1 - 20), rs_.randint(BY0 + 10, 420)
        if sky[sy_, sx_] > 0.98 and sky[min(H - 1, sy_ + 12), sx_] > 0.98: break
    else: continue
    r_ = rs_.choice([1, 1, 1, 2, 2, 3])
    yy_, xx_ = np.mgrid[-6:7, -6:7]
    blob = np.exp(-(xx_ ** 2 + yy_ ** 2) / (0.5 * r_ * r_ + 0.2)) * rs_.uniform(0.55, 1.0)
    st[i % 2][sy_ - 6:sy_ + 7, sx_ - 6:sx_ + 7] = np.maximum(st[i % 2][sy_ - 6:sy_ + 7, sx_ - 6:sx_ + 7], blob)
for k_, nm_ in enumerate(('stars_a', 'stars_b')):
    a_ = (np.clip(st[k_], 0, 1) * 255).astype(np.uint8)
    rgba = np.dstack([np.full((H, W), 255, np.uint8), np.full((H, W), 250, np.uint8), np.full((H, W), 228, np.uint8), a_])
    Image.fromarray(rgba, 'RGBA').crop((BX0, BY0, BX1, BY1)).save(os.path.join(DST, nm_ + '.webp'), 'WEBP', quality=85, method=5)

def bbox(a, pad=4, thr=3):
    ys, xs = np.where(a > thr)
    if len(xs) == 0: return None
    return max(0, xs.min() - pad), max(0, ys.min() - pad), min(W, xs.max() + 1 + pad), min(H, ys.max() + 1 + pad)

def blur_np(a, r):
    return np.asarray(Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)), np.float32) / 255

def load(mode, g):
    im = Image.open(f'{R}/{mode}_{g}.png').convert('RGBA')
    if im.size != (W, H):   # the record is a square top view
        return im
    return im

yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
LAYERS = {}   # key -> full-frame uint8 RGBA

def put_full(img):
    return np.asarray(img, np.uint8)

for mode in ('day', 'night'):
    for g in ('wall', 'sconce', 'curtainL', 'curtainR', 'mobile', 'desk', 'fox', 'foxtail', 'ring', 'turntable', 'pine'):
        LAYERS[(mode, g)] = np.asarray(load(mode, g), np.uint8)
    # the record: a square top view scaled to the projected disc
    _t = LAYERS[(mode, 'turntable')] = LAYERS[(mode, 'turntable')].copy()                 # the acrylic lid stands open above the case as a faint pane: it reads as a ghost box, so leave it out
    _first = int(np.where((_t[..., 3] > 150).any(axis=1))[0][0])
    _t[:_first, :, 3] = 0
    rec = load(mode, 'record')
    cx, cy = meta['record_c']; dpx = (meta['record_r'][0] - meta['record_l'][0]) * 0.62 / 0.48
    ra = np.asarray(rec, np.float32); ra[..., :3] = np.clip(ra[..., :3] * 1.04, 0, 255); rec = Image.fromarray(ra.astype(np.uint8), 'RGBA')
    rec = rec.resize((int(round(dpx)), int(round(dpx))), Image.LANCZOS)
    full = Image.new('RGBA', (W, H), (0, 0, 0, 0)); full.paste(rec, (int(round(cx - dpx / 2)), int(round(cy - dpx / 2))))
    LAYERS[(mode, 'record')] = np.asarray(full, np.uint8)

# the dark inner edge of each curtain turns into a black gap when the cloth is stretched shut: lift it toward the colour of the cloth
def soften_edge(arr, side):
    a = arr[..., 3]
    ys, xs = np.where(a > 40)
    x0, x1 = xs.min(), xs.max()
    wd = x1 - x0 + 1
    out = arr.astype(np.float32)
    body = out[ys.min():ys.max(), x0:x1, :3][a[ys.min():ys.max(), x0:x1] > 200].mean(0)
    for x in range(x0, x1 + 1):
        t = (x - x0) / wd if side == 'right' else 1 - (x - x0) / wd
        f = np.clip((t - 0.60) / 0.40, 0, 1) ** 0.7 * 0.92
        col = out[:, x, :3]
        out[:, x, :3] = np.maximum(col, col * (1 - f) + body * 0.88 * f)
    return np.clip(out, 0, 255).astype(np.uint8)
for mode in ('day', 'night'):
    LAYERS[(mode, 'curtainL')] = soften_edge(LAYERS[(mode, 'curtainL')], 'right')
    LAYERS[(mode, 'curtainR')] = soften_edge(LAYERS[(mode, 'curtainR')], 'left')

# steam: three soft curls above the mug
mx, my = meta2['mug_top']
st = Image.new('L', (W, H), 0); d = ImageDraw.Draw(st)
for i, off in enumerate((-16, 4, 22)):
    pts = [(mx + off + 9 * math.sin(k * 0.75 + i * 1.7), my - 6 - k * 9) for k in range(0, 14)]
    d.line(pts, fill=255 - i * 40, width=8 - i, joint='curve')
sta = blur_np(np.asarray(st, np.float32) / 255, 4) * 0.55
steam = np.dstack([np.full((H, W), 255, np.uint8)] * 3 + [(np.clip(sta, 0, 1) * 255).astype(np.uint8)])
LAYERS[('both', 'steam')] = steam

def glow(cx, cy, rx, ry, color, strength):
    d2 = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2
    a = np.clip(np.exp(-d2 * 2.4) * strength, 0, 1)
    return np.dstack([np.full((H, W), color[0], np.uint8), np.full((H, W), color[1], np.uint8), np.full((H, W), color[2], np.uint8), (a * 255).astype(np.uint8)])

LAYERS[('night', 'glow_hearth')] = glow(*meta2['stove_door'], 230, 200, (255, 140, 50), 0.55)
LAYERS[('night', 'glow_sconce')] = glow(*meta2['sconce'], 200, 200, (255, 190, 100), 0.6)
LAYERS[('night', 'glow_tubes')] = glow(*meta2['tubes'], 120, 70, (255, 200, 110), 0.5)
LAYERS[('day', 'glow_hearth')] = glow(*meta2['stove_door'], 170, 150, (255, 150, 60), 0.3)
vv = np.clip(((xx - 960) / 1250) ** 2 + ((yy - 540) / 760) ** 2, 0, 1)
LAYERS[('both', 'vignette')] = np.dstack([np.full((H, W), 8, np.uint8), np.full((H, W), 6, np.uint8), np.full((H, W), 10, np.uint8), (np.clip(vv * 0.55, 0, 1) * 255).astype(np.uint8)])

# the pictures seen through the window are kept: file, box %, extras
WIN = [
    ('alpenglow peaks', 'l1_peaks_day', 0.04, None, {}),
    ('moonlit peaks', 'l1b_peaks_night', 0.05, {'x': 10.94, 'y': 1.48, 'width': 74.48, 'height': 67.22}, {'night': True}),
    ('aurora shimmer', 'shimmer_sky', 0.08, {'x': 16.82, 'y': 2.78, 'width': 66.15, 'height': 31.85}, {'night': True, 'anim': {'name': 'drift', 'distance': 5, 'duration': 48}}),
    ('twinkling stars', 'stars_a', 0.06, {'x': 10.94, 'y': 1.48, 'width': 74.48, 'height': 67.22}, {'night': True, 'anim': {'name': 'pulse', 'duration': 3.6}}),
    ('twinkling stars 2', 'stars_b', 0.06, {'x': 10.94, 'y': 1.48, 'width': 74.48, 'height': 67.22}, {'night': True, 'anim': {'name': 'pulse', 'duration': 5.4, 'delay': -2}}),
    ('alpine mist', 'l2b_mist', 0.14, {'x': 13.02, 'y': 2.96, 'width': 71.98, 'height': 62.59}, {'anim': {'name': 'drift', 'distance': 6, 'duration': 95}}),
    ('window glass sheen', 'l3_glass_sheen', 0.46, {'x': 18.49, 'y': 5.28, 'width': 60.62, 'height': 58.7}, {'light': True}),
]
# name, key, depth, anim (or None), pivot, scale, extras ; pivot: 'frac' (x,y percent), 'px' (x,y pixels), None
ROOM = [
    ('cabin wall', 'wall', 0.5, {}, None, 1),
    ('brass sconce', 'sconce', 0.52, {}, None, 1),
    ('left velvet curtain', 'curtainL', 0.56, {'curtain': {'scale': 2.6, 'origin': 0}, 'anim': {'name': 'billow', 'amplitude': 0.5, 'duration': 7.2, 'delay': 0.0}}, ('frac', 48, 1), 1),
    ('right velvet curtain', 'curtainR', 0.56, {'curtain': {'scale': 2.6, 'origin': 100}, 'anim': {'name': 'billow', 'amplitude': 0.5, 'duration': 5.8, 'delay': -1.9}}, ('frac', 52, 1), 1),
    ('moon mobile', 'mobile', 0.58, {'anim': {'name': 'sway', 'amplitude': 1.8, 'duration': 6.4}}, ('frac', 50, 2), 1),
    ('walnut desk', 'desk', 0.88, {}, None, 1),
    ('sleeping fox', 'fox', 0.88, {'anim': {'name': 'breathe', 'duration': 4.1}}, ('frac', 50, 100), 1),
    ('fox tail', 'foxtail', 0.88, {'anim': {'name': 'flick', 'amplitude': 4.5, 'duration': 9.6}}, ('px', *meta['foxtail']), 1),
    ('armillary ring', 'ring', 0.88, {'anim': {'name': 'sweep', 'duration': 22}}, None, 1),
    ('retro CD player', 'turntable', 0.88, {}, None, 1),
    ('cdplayer disc flat', 'record', 0.88, {'anim': {'name': 'spin', 'squash': 0.25, 'duration': 4}}, None, 1),
    ('snow pine', 'pine', 0.98, {'anim': {'name': 'sway', 'amplitude': 1.4, 'duration': 6.8}}, ('px', 1900, 1000), 1),
]
for f in os.listdir(DST):
    if f.endswith('.webp') and f[:-5] not in KEEP: os.remove(os.path.join(DST, f))
layers = [dict(name=n, image=f'/scenes/{SLUG}/{f}.webp', depth=d, **({'box': b} if b else {}), **e) for (n, f, d, b, e) in WIN]
total = 0

def emit(name, key, depth, mode, extra, pivot, scale, arr, fname):
    global total
    a = arr[..., 3]
    bb = bbox(a, thr=6 if scale > 1 else 3)
    if bb is None: return
    x0, y0, x1, y1 = bb
    crop = Image.fromarray(arr, 'RGBA').crop((x0, y0, x1, y1))
    if scale > 1: crop = crop.resize((max(8, crop.width // scale), max(6, crop.height // scale)), Image.LANCZOS)
    entry = {'name': name, 'image': f'/scenes/{SLUG}/{fname}.webp', 'depth': depth, 'box': {'x': round(x0 / W * 100, 2), 'y': round(y0 / H * 100, 2), 'width': round((x1 - x0) / W * 100, 2), 'height': round((y1 - y0) / H * 100, 2)}}
    ex = json.loads(json.dumps(extra))
    if mode == 'day': ex['light'] = True
    if mode == 'night': ex['night'] = True
    if 'anim' in ex and pivot:
        if pivot[0] == 'frac': ex['anim']['pivot'] = {'x': pivot[1], 'y': pivot[2]}
        else: ex['anim']['pivot'] = {'x': round(min(100, max(0, (pivot[1] - x0) / (x1 - x0) * 100)), 1), 'y': round(min(100, max(0, (pivot[2] - y0) / (y1 - y0) * 100)), 1)}
    elif 'anim' in ex and ex['anim']['name'] == 'breathe':
        ex['anim']['pivot'] = {'x': 50, 'y': 100}
    entry.update(ex)
    p = os.path.join(DST, fname + '.webp'); crop.save(p, 'WEBP', quality=86, method=5); total += os.path.getsize(p)
    layers.append(entry)

FN = {'turntable': 'cdplayer', 'record': 'cdplayer_disc_flat'}
for (name, key, depth, extra, pivot, scale) in ROOM:
    for mode in ('day', 'night'):
        emit(name + (' at night' if mode == 'night' else ''), key, depth, mode, extra, pivot, scale, LAYERS[(mode, key)], FN.get(key, key) if mode == 'day' else ('night_' + FN[key] if key == 'record' else FN.get(key, key) + '_night'))
    if key == 'ring':
        pass
emit('cocoa steam', 'steam', 0.88, 'both', {'anim': {'name': 'steam', 'duration': 4.6}}, None, 1, LAYERS[('both', 'steam')], 'steam')
emit('hearth glow', 'glow_hearth', 0.52, 'night', {'anim': {'name': 'pulse', 'duration': 2.8}}, None, 2, LAYERS[('night', 'glow_hearth')], 'glow_hearth_night')
emit('hearth glow', 'glow_hearth', 0.52, 'day', {'anim': {'name': 'pulse', 'duration': 2.8}}, None, 2, LAYERS[('day', 'glow_hearth')], 'glow_hearth')
emit('sconce glow', 'glow_sconce', 0.52, 'night', {}, None, 2, LAYERS[('night', 'glow_sconce')], 'glow_sconce')
emit('CD player display glow', 'glow_tubes', 0.88, 'night', {'anim': {'name': 'pulse', 'duration': 3.2}}, None, 2, LAYERS[('night', 'glow_tubes')], 'glow_tubes')
emit('vignette', 'vignette', 0.0, 'both', {}, None, 4, LAYERS[('both', 'vignette')], 'vignette')
# ---------- things a visitor can put on the desk (Decorate): 3D renders of each object with its own soft shadow, in both lightings
ITEMS = [  # key, label, flippable, unique
    ('succulent', 'Potted cactus', True, False), ('candle', 'Brass candle', False, False), ('globe', 'Desk globe', True, False),
    ('photo', 'Framed star chart', False, False), ('clock', 'Brass clock', False, False), ('books', 'Old books', True, False)]
imeta = json.load(open(os.path.join(ITEMS_DIR, 'items_meta.json')))
CATALOG = []
SURFACES = [{'key': 'desk', 'area': {'x': 10, 'y': 71.5, 'width': 80, 'height': 17}, 'perspective': {'farY': 71.5, 'nearY': 88.5, 'farScale': 0.8, 'nearScale': 1.0}}]

def rgba_of(path):
    return np.asarray(Image.open(path).convert('RGBA'), np.float32) / 255

def item_layer(key, mode):
    it, b, c = (rgba_of(os.path.join(ITEMS_DIR, f'{mode}_{key}_{n}.png')) for n in ('item', 'b', 'c'))
    sa = np.clip((b[..., 3] - c[..., 3]) / np.maximum(1 - c[..., 3], 1e-3), 0, 1)          # the shadow the object adds to the desk
    sa = cv2.GaussianBlur(sa, (0, 0), 4.5)                                                   # the two renders differ by a little noise: smooth it, drop the faint rest
    sa = np.clip((sa - 0.09) / 0.91, 0, 1)
    _ys, _xs = np.where(it[..., 3] > 0.3)
    near = np.zeros((H, W), np.float32)                                                      # the shadow only counts close to the object
    near[max(0, _ys.min() - 60):min(H, _ys.max() + 50), max(0, _xs.min() - 70):min(W, _xs.max() + 260)] = 1
    near = cv2.GaussianBlur(near, (0, 0), 25)
    sa = (sa * near)[..., None] * 0.9
    shc = np.array([0.05, 0.03, 0.025], np.float32) if mode == 'day' else np.array([0.02, 0.02, 0.035], np.float32)
    ia = it[..., 3:4]
    oa = ia + sa * (1 - ia)
    rgb = (it[..., :3] * ia + shc * sa * (1 - ia)) / np.maximum(oa, 1e-4)
    return np.dstack([np.clip(rgb, 0, 1) * 255, np.clip(oa, 0, 1) * 255]).astype(np.uint8), (it[..., 3] * 255).astype(np.uint8)

for key, label, flip, uniq in ITEMS:
    box = None
    for mode in ('day', 'night'):
        arr, item_only = item_layer(key, mode)
        n0 = len(layers)
        emit(label + (' at night' if mode == 'night' else ''), key, 0.88, mode, {'item': key}, None, 1, arr, f'{key}' if mode == 'day' else f'{key}_night')
        if len(layers) > n0: box = dict(layers[-1]['box'])
        if mode == 'day':
            ys, xs = np.where(item_only > 90)
            th = Image.fromarray(arr, 'RGBA').crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
            sc_ = 110.0 / max(th.size)
            th.resize((max(8, int(th.width * sc_)), max(8, int(th.height * sc_))), Image.LANCZOS).save(os.path.join(DST, key + '_thumb.webp'), 'WEBP', quality=88, method=5)
    hx, hy = imeta[key]['home']
    CATALOG.append({'key': key, 'label': label, 'surface': 'desk', 'home': {'x': round(hx / W * 100, 2), 'y': round(hy / H * 100, 2)}, 'bounds': box,
                    'thumb': f'/scenes/{SLUG}/{key}_thumb.webp', 'flippable': flip, 'unique': uniq, 'inDefault': False, 'scale': {'min': 0.6, 'max': 1.8}})
    if key == 'candle':   # the flame warms the desk around it at night
        hx, hy = imeta[key]['home']; fx, fy = hx, hy - 0.43 * 290
        gx = ((np.mgrid[0:H, 0:W][1] - fx) / 190.0) ** 2 + ((np.mgrid[0:H, 0:W][0] - fy - 40) / 110.0) ** 2
        ga_ = np.clip(np.exp(-gx * 2.2) * 0.6, 0, 1)
        garr = np.dstack([np.full((H, W), 255, np.uint8), np.full((H, W), 186, np.uint8), np.full((H, W), 96, np.uint8), (ga_ * 255).astype(np.uint8)])
        emit('candle light', 'candle_light', 0.88, 'night', {'item': 'candle', 'anim': {'name': 'pulse', 'duration': 2.6}}, None, 2, garr, 'glow_candle')
# invisible layers that carry the click areas, so the sconce, the curtains and the turntable stay clickable in both lights
Image.fromarray(np.dstack([np.zeros((8, 8, 3), np.uint8), np.full((8, 8), 1, np.uint8)]), 'RGBA').save(os.path.join(DST, 'hit.webp'), 'WEBP', lossless=True)
for hit_name, of in (('left curtain hit', 'left velvet curtain'), ('right curtain hit', 'right velvet curtain'), ('sconce hit', 'brass sconce'), ('cd player hit', 'retro CD player')):
    src = next(l for l in layers if l['name'] == of)
    layers.append({'name': hit_name, 'image': f'/scenes/{SLUG}/hit.webp', 'depth': src['depth'], 'box': dict(src['box'])})
print('layers', len(layers), 'KB', total // 1024)

# stills (day picture) and a night check
def paste(dst, im, box):
    x0, y0 = int(round(box['x'] / 100 * W)), int(round(box['y'] / 100 * H))
    w, h = int(round(box['width'] / 100 * W)), int(round(box['height'] / 100 * H))
    arr = np.asarray(im.convert('RGBA').resize((w, h), Image.LANCZOS), np.float32) / 255
    hh, ww = min(H, y0 + h) - y0, min(W, x0 + w) - x0
    al = arr[:hh, :ww, 3:4]
    dst[y0:y0 + hh, x0:x0 + ww] = dst[y0:y0 + hh, x0:x0 + ww] * (1 - al) + arr[:hh, :ww, :3] * al

def composite(mode):
    c = np.zeros((H, W, 3), np.float32)
    for l in layers:
        if mode == 'day' and l.get('night'): continue
        if mode == 'night' and l.get('light'): continue
        base = os.path.basename(l['image'])
        im = Image.open(os.path.join(DST, base)).convert('RGBA')
        if 'box' in l: box = l['box']
        else: box = {'x': 0, 'y': 0, 'width': 100, 'height': 100}
        if l['name'] == 'aurora shimmer':
            arr = np.asarray(im, np.float32) / 255
            tmp = np.zeros_like(c); paste(tmp, Image.fromarray((arr[..., :3] * arr[..., 3:4] * 255).astype(np.uint8)), box); c = 1 - (1 - c) * (1 - tmp)
        else:
            paste(c, im, box)
    return c
if os.environ.get('CHECK'):
    for m in ('day', 'night'):
        Image.fromarray((np.clip(composite(m), 0, 1) * 255).astype(np.uint8)).save(f'{R}/_check_{m}.png')
day = composite('day')
still = Image.fromarray((np.clip(day, 0, 1) * 255).astype(np.uint8))
still.save(os.path.join(DST, 'intro.webp'), 'WEBP', quality=80, method=5)
still.resize((480, 270), Image.LANCZOS).save(os.path.join(DST, 'preview.webp'), 'WEBP', quality=80, method=5)

def fmt(o):
    if isinstance(o, dict): return '{ ' + ', '.join(f'{k}: {fmt(v)}' for k, v in o.items()) + ' }'
    if isinstance(o, bool): return 'true' if o else 'false'
    if isinstance(o, str): return "'" + o.replace("'", "\\'") + "'"
    return json.dumps(o)
def idx(n, night=False):
    return next(i for i, l in enumerate(layers) if l['name'] == n)
for sf in SURFACES:
    sf['drawAt'] = idx('cocoa steam')     # the objects on the desk are drawn in front of the desk, the fox and the CD player
objects = [
    {'key': 'sky', 'label': 'Observatory window', 'layer': 0, 'x': 28, 'y': 8, 'width': 40, 'height': 52, 'action': {'type': 'toggleEffect', 'effect': 'snow'}},
    {'key': 'curtains-left', 'label': 'Velvet curtains', 'layer': idx('left curtain hit'), 'x': 0, 'y': 0, 'width': 100, 'height': 100, 'action': {'type': 'toggleCurtains'}},
    {'key': 'curtains', 'label': 'Velvet curtains', 'layer': idx('right curtain hit'), 'x': 0, 'y': 0, 'width': 100, 'height': 100, 'action': {'type': 'toggleCurtains'}},
    {'key': 'sconce', 'label': 'Brass sconce: warm hearth or northern lights', 'layer': idx('sconce hit'), 'x': 0, 'y': 0, 'width': 100, 'height': 100, 'action': {'type': 'toggleLight'}},
    {'key': 'cd-player', 'label': 'Retro CD player', 'layer': idx('cd player hit'), 'x': 0, 'y': 0, 'width': 100, 'height': 100, 'action': {'type': 'nextTrack'}},
]
lines = ["// Scene: Aurora Observatory. A cosy alpine cabin rendered in 3D: a wood stove, velvet curtains, a wide window onto snowy peaks,",
         "// and a walnut desk with a sleeping arctic fox, a retro CD player, a telescope and cocoa. Clicking the sconce switches between",
         "// warm alpenglow and the northern lights; clicking the window brings snowfall outside the glass. Day and night are two lightings of the same 3D room.",
         "// The room is built and rendered by docs/art-tools/aurora_observatory_blender.py and cut into layers by make_aurora_observatory.py."]
body = ["module.exports = {", "  slug: 'aurora-observatory',", "  name: 'Aurora Observatory',",
        "  description: 'A cosy alpine cabin above snowy peaks: a sleeping arctic fox, a retro CD player, a telescope and cocoa. Click the sconce for the northern lights, or the window for snow.',",
        "  layers: ["]
for i, l in enumerate(layers): body.append(f"    {fmt(l)}, // {i}")
body += ["  ],", "  objects: ["] + [f"    {fmt(o)}," for o in objects] + ["  ],",
         "  // What a visitor may put on the desk (Decorate). The pictures of an object are the layers with its key in `item`.", "  catalog: ["] + [f"    {fmt(c)}," for c in CATALOG] + ["  ],",
         "  surfaces: ["] + [f"    {fmt(sf)}," for sf in SURFACES] + ["  ],", "  nightDim: 0,", "  effects: ['snow', 'stars'],",
         f"  effectLayer: {idx('alpine mist')}, // the alpine mist, just behind the cabin wall, so snow and stars stay outside the glass", "};"]
open(SEED, 'w').write('\n'.join(lines + body) + '\n')
print('seed ok', len(layers))
