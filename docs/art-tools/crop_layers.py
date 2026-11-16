# Trims the empty border off scene pictures, to save work for the graphics card.
# Many layers are a full-screen picture with something small in it (a glow, a shadow). The browser still has to
# blend the whole screen for each of them, many times per second. This script cuts each such picture down to the
# part that actually shows something and writes the smaller box into the scene file, so the room looks the same.
#   "shows something" depends on how the layer is blended: normal = not transparent, screen = not black, multiply = not white
# Only simple layers are trimmed: no movable objects, no click areas, no movement that depends on the picture's size.
# Run from the repository root:  python3 docs/art-tools/crop_layers.py
import json, re, subprocess, numpy as np
from PIL import Image
ROOT = 'client/public'
SEEDS = {'night-study': 'api/src/seed/nightStudy.js', 'golden-loft': 'api/src/seed/goldenLoft.js', 'underwater-nook': 'api/src/seed/underwaterNook.js'}
T = 4 / 255
scenes = json.loads(subprocess.check_output(['node', '-e', "console.log(JSON.stringify(require('./api/src/seed/scenes')))"]))
total_before = total_after = 0
for scene in scenes:
    path = SEEDS[scene['slug']]; text = open(path, encoding='utf8').read()
    used = {o['layer'] for o in scene['objects']} | {scene['effectLayer']} | {s.get('drawAt') for s in scene.get('surfaces', [])}
    images = [l.get('image') for l in scene['layers']]
    for i, l in enumerate(scene['layers']):
        box = l.get('box') or {'x': 0, 'y': 0, 'width': 100, 'height': 100}
        area = box['width'] * box['height'] / 1e4; total_before += area; total_after += area
        anim = (l.get('anim') or {}).get('name')
        if i in used or not l.get('image') or images.count(l['image']) != 1 or any(k in l for k in ('item', 'glide', 'curtain', 'tile', 'kind')) or anim not in (None, 'pulse'):
            continue
        im = Image.open(ROOT + l['image']).convert('RGBA'); a = np.asarray(im).astype(np.float32) / 255
        blend = l.get('blend', 'normal')
        if blend == 'screen': shows = a[..., 3] * a[..., :3].max(axis=2) > T
        elif blend == 'multiply': shows = a[..., 3] * (1 - a[..., :3].min(axis=2)) > T
        else: shows = a[..., 3] > T
        if not shows.any(): continue
        ys, xs = np.nonzero(shows); h, w = shows.shape
        x0, x1, y0, y1 = max(0, xs.min() - 2), min(w, xs.max() + 3), max(0, ys.min() - 2), min(h, ys.max() + 3)
        keep = (x1 - x0) * (y1 - y0) / (w * h)
        if keep > 0.8: continue
        new = {'x': round(box['x'] + box['width'] * x0 / w, 2), 'y': round(box['y'] + box['height'] * y0 / h, 2),
               'width': round(box['width'] * (x1 - x0) / w, 2), 'height': round(box['height'] * (y1 - y0) / h, 2)}
        line = next(ln for ln in text.split('\n') if f"image: '{l['image']}'" in ln)
        box_js = f"box: {{ x: {new['x']}, y: {new['y']}, width: {new['width']}, height: {new['height']} }}"
        if 'box: {' in line: fixed = re.sub(r'box: \{[^}]*\}', box_js, line, count=1)
        else: fixed = re.sub(r'(depth: [0-9.]+)', r'\1, ' + box_js, line, count=1)
        assert fixed != line, line
        text = text.replace(line, fixed)
        im.crop((x0, y0, x1, y1)).save(ROOT + l['image'], quality=92, method=6)
        total_after -= area * (1 - keep)
        print(f"{scene['slug']:16} {l['name'][:34]:34} {blend:8} keeps {keep * 100:4.0f}%")
    open(path, 'w', encoding='utf8').write(text)
print(f'layer area: {total_before:.1f} screens before, {total_after:.1f} after')
