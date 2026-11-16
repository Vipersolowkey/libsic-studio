# Stores soft pictures (glows, light beams, shadows, blurred skies) at half their width and height.
# A soft picture has no fine detail, so the smaller file looks the same when the browser enlarges it again,
# but it needs only a quarter of the graphics memory. The script tests every picture instead of guessing from
# its name: it shrinks the picture, enlarges it back and compares. Only pictures where no pixel changes visibly
# are replaced. Sharp pictures are left alone. Boxes in the seed files are percentages, so nothing else changes.
# Run from the repository root:  python3 docs/art-tools/shrink_soft_pictures.py
import glob, numpy as np
from PIL import Image
MIN_PIXELS = 150_000   # small pictures are not worth it
MAX_MEAN = 0.35        # average change allowed, in steps of 0..255
MAX_P999 = 3.0         # change allowed for the worst 0.1% of pixels
saved = 0
for path in sorted(glob.glob('client/public/scenes/*/*.webp')):
    if path.endswith('preview.webp') or '_thumb' in path: continue
    im = Image.open(path).convert('RGBA')
    w, h = im.size
    if w * h < MIN_PIXELS: continue
    a = np.asarray(im).astype(np.float32)
    pre = a.copy(); pre[..., :3] *= a[..., 3:] / 255          # what is seen = colour times opacity
    small = Image.fromarray(pre.astype(np.uint8), 'RGBA').resize((w // 2, h // 2), Image.LANCZOS)
    back = np.asarray(small.resize((w, h), Image.BICUBIC)).astype(np.float32)
    diff = np.abs(back - pre).max(axis=2)
    if diff.mean() > MAX_MEAN or np.percentile(diff, 99.9) > MAX_P999: continue
    im.resize((w // 2, h // 2), Image.LANCZOS).save(path, quality=92, method=6)
    saved += w * h * 3
    print(f'{path}: {w}x{h} -> {w // 2}x{h // 2}')
print(f'graphics memory saved: about {saved / 1048576:.0f} MB')
