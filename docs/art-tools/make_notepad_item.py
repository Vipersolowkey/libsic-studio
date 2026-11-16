"""Turns the notepad and pencil that were painted into the desk of Rainy Night Study into a movable object.

Run once from the repository root:  python docs/art-tools/make_notepad_item.py
(needs Pillow and numpy). It
  1. finds the notepad and pencil in the lamp-light picture of the desk (they are much brighter than the desk),
  2. cuts them out of the three desk pictures (day, lamp light, night) as the object's own pictures,
  3. paints the desk back over the empty spot, so nothing is left behind when the object is moved,
  4. makes a soft shadow picture and a small picture for the tray.
"""
import numpy as np
from PIL import Image, ImageFilter

DIR = 'client/public/scenes/night-study/'
X0, Y0, X1, Y1 = 420, 70, 720, 220          # the part of the desk (in its own pixels) that holds the notepad
DESK_BOX = dict(x=0.0, y=66.44, width=100.0, height=33.56)  # where the desk picture sits in the scene (percent)
DESK_PX = (1600, 302)


def load(name):
    return np.array(Image.open(DIR + name + '.webp').convert('RGBA')).astype(float)


def save(arr, name, quality=90):
    Image.fromarray(np.clip(arr, 0, 255).astype('uint8'), 'RGBA').save(DIR + name + '.webp', quality=quality, method=6)


def filt(mask, kind, size):
    img = Image.fromarray(mask.astype('uint8'))
    return np.array(img.filter(kind(size)))


def dilate(mask, r):
    return filt(mask, ImageFilter.MaxFilter, 2 * r + 1)


def erode(mask, r):
    return filt(mask, ImageFilter.MinFilter, 2 * r + 1)


def to_box(px, py, w, h):
    return dict(
        x=round(px / DESK_PX[0] * 100, 2),
        y=round(DESK_BOX['y'] + py / DESK_PX[1] * DESK_BOX['height'], 2),
        width=round(w / DESK_PX[0] * 100, 2),
        height=round(h / DESK_PX[1] * DESK_BOX['height'], 2),
    )


desk, pool, night = load('c_desk'), load('c_pool_lamp'), load('c_night_desk')

# 1. the object: bright in the lamp-light picture. Closing fills the dark pencil point.
lum = pool[Y0:Y1, X0:X1, :3].mean(axis=2)
obj = (lum > 135).astype('uint8') * 255
obj = erode(dilate(obj, 4), 4)
full = np.zeros(desk.shape[:2], 'uint8')
full[Y0:Y1, X0:X1] = obj
ys, xs = np.where(full > 0)
bx0, bx1, by0, by1 = xs.min() - 4, xs.max() + 5, ys.min() - 4, ys.max() + 5
print('object box (px)', bx0, by0, bx1, by1)

# 2. the object's own pictures (edges pulled in one pixel so no desk colour comes along)
core = erode(full, 1)
soft = np.array(Image.fromarray(core).filter(ImageFilter.GaussianBlur(0.7))).astype(float) / 255


def cut(layer, name):
    piece = layer[by0:by1, bx0:bx1].copy()
    piece[:, :, 3] = piece[:, :, 3] * soft[by0:by1, bx0:bx1]
    save(piece, name)


cut(desk, 'c_notepad')
cut(pool, 'c_notepad_lit')
cut(night, 'c_notepad_night')

# shadow: the lamp stands on the right, so the shadow falls to the left and a little down
shadow = np.zeros((by1 - by0 + 24, bx1 - bx0 + 24, 4))
mask = Image.fromarray(core[by0:by1, bx0:bx1]).filter(ImageFilter.MaxFilter(3))
canvas = Image.new('L', (shadow.shape[1], shadow.shape[0]), 0)
canvas.paste(mask, (12 - 6, 12 + 3))
canvas = canvas.filter(ImageFilter.GaussianBlur(4))
shadow[:, :, 3] = np.array(canvas).astype(float) * 0.5
save(shadow, 'c_notepad_shadow')

# 3. paint the desk back: row by row, a straight blend between the desk on the left and right of the spot, then smoothed
hole = dilate(full, 10) > 0


def fill(layer):
    out = layer.copy()
    for y in range(Y0, Y1):
        row = hole[y]
        x = X0
        while x < X1:
            if row[x]:
                a = x
                while x < X1 and row[x]:
                    x += 1
                b = x  # holes are a..b-1
                left = layer[y, max(a - 6, 0):a].mean(axis=0)
                right = layer[y, b:b + 6].mean(axis=0)
                t = ((np.arange(a, b) - a + 1) / (b - a + 1))[:, None]
                out[y, a:b] = left * (1 - t) + right * t
            else:
                x += 1
    region = Image.fromarray(np.clip(out[Y0 - 10:Y1 + 10, X0 - 10:X1 + 10], 0, 255).astype('uint8'), 'RGBA')
    blur = np.array(region.filter(ImageFilter.GaussianBlur(3))).astype(float)
    m = hole[Y0 - 10:Y1 + 10, X0 - 10:X1 + 10][:, :, None]
    patch = out[Y0 - 10:Y1 + 10, X0 - 10:X1 + 10]
    out[Y0 - 10:Y1 + 10, X0 - 10:X1 + 10] = np.where(m, blur, patch)
    return out


for layer, name, q in ((desk, 'c_desk', 90), (pool, 'c_pool_lamp', 90), (night, 'c_night_desk', 90)):
    save(fill(layer), name, q)

# 4. the tray picture: the object as it looks with the lamp on, on a transparent background
thumb = pool[by0:by1, bx0:bx1].copy()
base = desk[by0:by1, bx0:bx1]
thumb[:, :, :3] = np.minimum(255, base[:, :, :3] + thumb[:, :, :3])  # screen is close enough to a sum here
thumb[:, :, 3] = 255 * soft[by0:by1, bx0:bx1]
img = Image.fromarray(np.clip(thumb, 0, 255).astype('uint8'), 'RGBA')
scale = 176 / img.width
img.resize((176, max(1, round(img.height * scale))), Image.LANCZOS).save(DIR + 'c_notepad_thumb.webp', quality=88)

box = to_box(bx0, by0, bx1 - bx0, by1 - by0)
sbox = to_box(bx0 - 12 + 0, by0 - 12, shadow.shape[1], shadow.shape[0])
print('box', box)
print('shadow box', sbox)
