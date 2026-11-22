# Decorate objects for the Aurora Observatory, rendered in the same Blender room (same camera, same day and night lights).
# usage: python items3d.py OUT_DIR SAMPLES
import sys, json, time
sys.path.insert(0, '/tmp/w/b')
from scene3d import *
from bpy_extras.object_utils import world_to_camera_view
OUT = sys.argv[1]; SAMPLES = int(sys.argv[2]); ONLY = sys.argv[3].split(',') if len(sys.argv) > 3 else None
os.makedirs(OUT, exist_ok=True)
reset()
make_chart_png('/tmp/w/b/chart.png')
M = build('/tmp/w/b/chart.png')
cam = setup_cam((1920, 1080))
render_cfg(SAMPLES)
sc = bpy.context.scene
TOP = 1.10     # the desk top

def land_mat(name, ocean, land, thr=0.52, scale=3.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord')
    n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = scale; n.inputs['Detail'].default_value = 6
    nt.links.new(tc.outputs['Object'], n.inputs['Vector'])
    cr = nt.nodes.new('ShaderNodeValToRGB'); cr.color_ramp.interpolation = 'CONSTANT'
    cr.color_ramp.elements[0].color = (*ocean, 1); cr.color_ramp.elements[1].color = (*land, 1); cr.color_ramp.elements[1].position = thr
    nt.links.new(n.outputs['Fac'], cr.inputs['Fac']); nt.links.new(cr.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.35
    return m

def pic_mat(name, path):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(path)
    nt.links.new(t.outputs['Color'], b.inputs['Base Color']); b.inputs['Roughness'].default_value = 0.5
    nt.links.new(t.outputs['Color'], b.inputs['Emission Color']); b.inputs['Emission Strength'].default_value = 0.6
    return m

terracotta = mat('terracotta', (0.50, 0.20, 0.09), 0.75)
sage = mat('sage', (0.16, 0.40, 0.22), 0.55, sheen_weight=0.4)
sage2 = mat('sage2', (0.24, 0.50, 0.30), 0.55)
soil = mat('soil', (0.04, 0.025, 0.018), 0.95)
wax = mat('wax', (0.92, 0.86, 0.72), 0.45, subsurface_weight=0.3)
ocean_land = land_mat('globe', (0.03, 0.10, 0.26), (0.22, 0.34, 0.16))
photo_pic = pic_mat('photo', '/tmp/w/b/chart.png')
book_cols = [mat('ob0', (0.05, 0.16, 0.20), 0.6), mat('ob1', (0.30, 0.07, 0.05), 0.6), mat('ob2', (0.36, 0.26, 0.08), 0.6), mat('ob3', (0.06, 0.10, 0.07), 0.6)]
clockface = mat('clockface', (0.88, 0.84, 0.72), 0.5)
flame_obj = {}

HOME = {}
def item(key, x, y):
    HOME[key] = (x, y)
    return x, y

# ---- 1. succulent in a terracotta pot
x, y = item('succulent', 2.15, -2.1)
g = 'item_succulent'
grp(g, cyl('sp', 0.125, 0.15, (x, y, TOP + 0.075), terracotta, seg=48, bevel=0.01))
grp(g, torus('srim', 0.125, 0.014, (x, y, TOP + 0.15), terracotta))
grp(g, cyl('ss', 0.108, 0.01, (x, y, TOP + 0.152), soil, seg=32))
random.seed(4)
for i in range(9):
    a = i / 9 * math.tau + 0.3
    r = 0.06 + 0.025 * (i % 2)
    lh = 0.10 + 0.045 * (i % 3)
    leaf = sphere('sl%d' % i, 1.0, (x + math.cos(a) * r, y + math.sin(a) * r, TOP + 0.20 + lh * 0.45), sage2 if i % 2 else sage, scale=(0.032, 0.022, lh * 0.55), seg=24)
    leaf.rotation_euler = (math.sin(a) * 0.62, -math.cos(a) * 0.62, 0)
    grp(g, leaf)
grp(g, sphere('score', 1.0, (x, y, TOP + 0.22), sage2, scale=(0.05, 0.05, 0.07), seg=24))

# ---- 2. candle in a brass holder
x, y = item('candle', -2.55, -2.1)
g = 'item_candle'
grp(g, cyl('cb', 0.13, 0.02, (x, y, TOP + 0.01), M['brass'], seg=48, bevel=0.006))
grp(g, cyl('cst', 0.022, 0.12, (x, y, TOP + 0.08), M['brass'], seg=24))
grp(g, cyl('cc', 0.075, 0.03, (x, y, TOP + 0.15), M['brass'], seg=48, bevel=0.006))
grp(g, cyl('cw', 0.052, 0.24, (x, y, TOP + 0.285), wax, seg=32))
fl = sphere('flame', 1.0, (x, y, TOP + 0.43), M['fire'], scale=(0.030, 0.030, 0.070), seg=16)
grp(g, fl); flame_obj['candle'] = (fl, (x, y, TOP + 0.43))

# ---- 3. desk globe on a brass stand
x, y = item('globe', -0.95, -0.6)
g = 'item_globe'
grp(g, cyl('gb', 0.15, 0.03, (x, y, TOP + 0.015), M['walnut'], seg=48, bevel=0.008))
grp(g, cyl('gst', 0.018, 0.16, (x, y, TOP + 0.10), M['brass'], seg=16))
gl = sphere('gsph', 0.2, (x, y, TOP + 0.38), ocean_land, seg=64); gl.rotation_euler = (0.4, 0.2, 0.8); grp(g, gl)
rg = torus('gring', 0.225, 0.011, (x, y, TOP + 0.38), M['brass'], rot=(0.35, 0.0, 0.0)); grp(g, rg)
grp(g, torus('gring2', 0.225, 0.006, (x, y, TOP + 0.38), M['brass'], rot=(1.2, 0.0, 0.0)))

# ---- 4. framed star chart
x, y = item('photo', 1.75, -0.55)
g = 'item_photo'
fr = box('pf', (0.34, 0.035, 0.42), (x, y, TOP + 0.21), M['walnut'], 0.008, rot=(-0.16, 0, 0.12)); grp(g, fr)
pc = box('pp', (0.27, 0.01, 0.35), (x, y - 0.019, TOP + 0.21), photo_pic, 0.0, rot=(-0.16, 0, 0.12)); grp(g, pc)
grp(g, box('pleg', (0.05, 0.16, 0.3), (x + 0.02, y + 0.09, TOP + 0.16), M['walnut'], 0.004, rot=(0.5, 0, 0.12)))

# ---- 5. brass desk clock
x, y = item('clock', 1.35, -2.15)
g = 'item_clock'
grp(g, box('clf1', (0.07, 0.05, 0.03), (x - 0.1, y, TOP + 0.015), M['brass'], 0.006))
grp(g, box('clf2', (0.07, 0.05, 0.03), (x + 0.1, y, TOP + 0.015), M['brass'], 0.006))
cb = cyl('clb', 0.17, 0.07, (x, y, TOP + 0.20), M['brass'], rot=(math.pi / 2, 0, 0), seg=64, bevel=0.01); cb.rotation_euler = (math.pi / 2 - 0.12, 0, 0.12); grp(g, cb)
cfc = cyl('clf', 0.145, 0.012, (x, y - 0.036, TOP + 0.20), clockface, rot=(math.pi / 2, 0, 0), seg=64); cfc.rotation_euler = (math.pi / 2 - 0.12, 0, 0.12); grp(g, cfc)
for i, (hl, ha) in enumerate(((0.085, 0.4), (0.12, -1.9))):
    h = box('clh%d' % i, (0.012, 0.004, hl), (x + math.sin(ha) * hl / 2 * 0.9, y - 0.046, TOP + 0.20 + math.cos(ha) * hl / 2 * 0.9), M['dark'], 0.0, rot=(-0.12, ha, 0.12 * 0)); grp(g, h)
for i in range(12):
    a = i / 12 * math.tau
    grp(g, sphere('tk%d' % i, 0.008, (x + math.sin(a) * 0.12, y - 0.044, TOP + 0.20 + math.cos(a) * 0.12), M['dark'], seg=8))

# ---- 6. a small stack of old books
x, y = item('books', -1.9, -2.15)
g = 'item_books'
z = TOP
for i, (w, d_, h) in enumerate(((0.52, 0.36, 0.075), (0.46, 0.33, 0.06), (0.38, 0.28, 0.055))):
    bk = box('ob%d' % i, (w, d_, h), (x + 0.015 * i - 0.01, y + 0.01 * i, z + h / 2), book_cols[i], 0.008, rot=(0, 0, 0.18 * (i - 1)))
    pg = box('opg%d' % i, (w - 0.03, d_ - 0.02, h - 0.02), (x + 0.015 * i - 0.01, y + 0.01 * i - 0.004, z + h / 2), M['paper'], 0.0, rot=(0, 0, 0.18 * (i - 1)))
    grp(g, bk, pg); z += h
# a bookmark ribbon
grp(g, box('orib', (0.02, 0.1, 0.004), (x + 0.2, y - 0.2, TOP + 0.02), M['velvet'], 0.0))

# shadow catcher: the desk top, so each object brings its own soft shadow
catcher = box('catcher', (13.0, 2.6, 0.001), (0, -1.3, TOP + 0.0005), M['desk'], 0.0)
catcher.is_shadow_catcher = True

bpy.context.view_layer.update()
def proj(pt):
    v = world_to_camera_view(sc, cam, Vector(pt)); return [round(v.x * 1920, 1), round((1 - v.y) * 1080, 1)]

def bbox_norm(name, pad=(0.03, 0.03, 0.09, 0.03)):
    xs, ys = [], []
    for o in G[name]:
        for ob in [o] + list(o.children):
            if ob.type not in ('MESH', 'CURVE', 'META'): continue
            for c in ob.bound_box:
                v = world_to_camera_view(sc, cam, ob.matrix_world @ Vector(c)); xs.append(v.x); ys.append(v.y)
    return max(0, min(xs) - pad[0]), max(0, min(ys) - pad[3] - 0.04), min(1, max(xs) + pad[2]), min(1, max(ys) + pad[1])

meta = {k: {'home': proj((HOME[k][0], HOME[k][1], TOP))} for k in HOME}
for k, v in meta.items():
    xs_ = [proj((HOME[k][0] + dx, HOME[k][1], TOP))[0] for dx in (-0.5, 0.5)]; v['px_per_unit'] = abs(xs_[1] - xs_[0])
json.dump(meta, open(OUT + '/items_meta.json', 'w'))
t0 = time.time()
for mode in ('day', 'night'):
    lights(mode)
    cl = None
    for key in HOME:
        if ONLY and key not in ONLY: continue
        show_only(['item_' + key])
        for k2, (fl_, pos) in flame_obj.items():
            fl_.hide_render = not (mode == 'night')
            fl_.visible_camera = (mode == 'night') and key == k2
        if key == 'candle' and mode == 'night':
            cl = point_light('candlel', flame_obj['candle'][1], (1.0, 0.62, 0.30), 9.0, 0.02)
        x0, y0, x1, y1 = bbox_norm('item_' + key)
        sc.render.use_border = True; sc.render.use_crop_to_border = False
        sc.render.border_min_x, sc.render.border_min_y, sc.render.border_max_x, sc.render.border_max_y = x0, y0, x1, y1
        objs = [ob for o in G['item_' + key] for ob in [o] + list(o.children)]
        # (a) the object alone
        catcher.hide_render = True
        render(f'{OUT}/{mode}_{key}_item.png')
        # (b) only the shadows on the desk, with the object there, (c) and without it: the difference is the object's own shadow
        catcher.hide_render = False
        show_only([])
        for ob in objs: ob.visible_camera = False
        render(f'{OUT}/{mode}_{key}_b.png')
        for ob in objs: ob.hide_render = True
        render(f'{OUT}/{mode}_{key}_c.png')
        for ob in objs: ob.hide_render = False
        if cl is not None:
            bpy.data.objects.remove(cl, do_unlink=True); cl = None
        print('done', mode, key, round(time.time() - t0), flush=True)
print('ALL DONE')
