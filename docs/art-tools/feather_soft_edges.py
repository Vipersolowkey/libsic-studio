# Fades the cut-off edges of soft pictures (shadows, reflections, glows, light pools).
# Such a picture should fade to nothing before its border. Where it does not, its border shows as a straight line
# on the desk, which gets very visible when the object is moved. This script fades the last part before such a border.
# Solid objects are left alone, and so is the top of a reflection (it starts right under its object).
# Run from the repository root:  python3 docs/art-tools/feather_soft_edges.py
import json, re, subprocess, numpy as np
from PIL import Image
SOFT = re.compile(r'shadow|reflection|glow|spill|pool|light|flame|glimmer|nlit', re.I)
RAMP = 0.14  # how much of the picture's width or height is used for the fade
scenes = json.loads(subprocess.check_output(['node', '-e', "console.log(JSON.stringify(require('./api/src/seed/scenes')))"]))
done = set()
for sc in scenes:
    for l in sc['layers']:
        b = l.get('box')
        if not b or not l.get('image') or l.get('tile') or not SOFT.search(l['name']) or l['image'] in done: continue
        path = 'client/public' + l['image']
        a = np.asarray(Image.open(path).convert('RGBA')).astype(np.float32) / 255
        blend = l.get('blend', 'normal')
        v = a[..., 3] * (a[..., :3].max(axis=2) if blend == 'screen' else 1)
        h, w = v.shape
        edge = {'L': v[:, 0].max(), 'R': v[:, -1].max(), 'T': v[0].max(), 'B': v[-1].max()}
        inside = {'L': b['x'] > 0.5, 'R': b['x'] + b['width'] < 99.5, 'T': b['y'] > 0.5, 'B': b['y'] + b['height'] < 99.5}
        fix = [k for k, x in edge.items() if 0.06 < x <= 0.5 and inside[k] and not (k == 'T' and 'reflection' in l['name'].lower())]
        if not fix: continue
        def ramp(n):
            t = np.clip(np.arange(n) / max(1, n * RAMP), 0, 1)
            return t * t * (3 - 2 * t)
        m = np.ones((h, w), np.float32)
        if 'L' in fix: m *= ramp(w)[None, :]
        if 'R' in fix: m *= ramp(w)[None, ::-1]
        if 'T' in fix: m *= ramp(h)[:, None]
        if 'B' in fix: m *= ramp(h)[::-1, None]
        if blend == 'screen': a[..., :3] *= m[..., None]   # a glow fades to black, which adds no light
        a[..., 3] *= m
        Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA').save(path, quality=92, method=6)
        done.add(l['image'])
        print(sc['slug'], '|', l['name'], '| faded:', ' '.join(fix))
