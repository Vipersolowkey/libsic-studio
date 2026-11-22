# Builds the Aurora Observatory room in 3D with Blender and renders it as separate layer pictures, once in
# warm alpenglow light and once in northern-lights light. Needs:  pip install bpy numpy pillow
# Run it from the repository root:
#   python docs/art-tools/aurora_observatory_blender.py docs/art-tools/_aurora_renders 48
# then cut the renders into engine layers (numpy + Pillow only):
#   python docs/art-tools/make_aurora_observatory.py docs/art-tools/_aurora_renders
import sys, math, random, os, json, time
import bpy
from mathutils import Vector
from mathutils import Vector, Euler

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def mat(name, color, rough=0.5, metal=0.0, **kw):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    for k, v in kw.items():
        k = k.replace('_', ' ')
        if k in b.inputs:
            b.inputs[k].default_value = v if not isinstance(v, tuple) else (*v, 1)
    return m

def tex_mat(name, c1, c2, rough=0.5, scale=(1, 1, 1), noise=6.0, bump=0.2, stretch=(1, 30, 1), metal=0.0, wave=None):
    """a procedural wood-like material: stretched noise drives colour (and a little bump)"""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = stretch
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
    n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = noise; n.inputs['Detail'].default_value = 8
    nt.links.new(mp.outputs['Vector'], n.inputs['Vector'])
    cr = nt.nodes.new('ShaderNodeValToRGB')
    cr.color_ramp.elements[0].color = (*c1, 1); cr.color_ramp.elements[1].color = (*c2, 1)
    cr.color_ramp.elements[0].position = 0.25; cr.color_ramp.elements[1].position = 0.75
    nt.links.new(n.outputs['Fac'], cr.inputs['Fac'])
    nt.links.new(cr.outputs['Color'], b.inputs['Base Color'])
    bm = nt.nodes.new('ShaderNodeBump'); bm.inputs['Strength'].default_value = bump
    nt.links.new(n.outputs['Fac'], bm.inputs['Height'])
    nt.links.new(bm.outputs['Normal'], b.inputs['Normal'])
    b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    return m

def _fin(o, m, bevel=0.0, smooth=True, name=None):
    if name: o.name = name
    if m: o.data.materials.append(m)
    if bevel:
        md = o.modifiers.new('bev', 'BEVEL'); md.width = bevel; md.segments = 3; md.limit_method = 'ANGLE'
    if smooth:
        for p in o.data.polygons: p.use_smooth = True
    return o

def box(name, size, loc, m, bevel=0.0, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object; o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    return _fin(o, m, bevel, smooth=bool(bevel), name=name)

def cyl(name, r, h, loc, m, rot=(0, 0, 0), seg=48, bevel=0.0):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=loc, rotation=rot, vertices=seg)
    return _fin(bpy.context.object, m, bevel, True, name)

def sphere(name, r, loc, m, scale=(1, 1, 1), seg=48):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=seg, ring_count=seg // 2)
    o = bpy.context.object; o.scale = scale
    return _fin(o, m, 0, True, name)

def torus(name, R, r, loc, m, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, location=loc, rotation=rot, major_segments=64, minor_segments=16)
    return _fin(bpy.context.object, m, 0, True, name)

def tube(name, pts, r, m, closed=False):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = r; cu.bevel_resolution = 6
    sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for p, c in zip(sp.points, pts): p.co = (*c, 1)
    sp.use_cyclic_u = closed
    o = bpy.data.objects.new(name, cu); bpy.context.collection.objects.link(o)
    o.data.materials.append(m)
    return o

def boolean(o, cutter, op='DIFFERENCE', keep=False):
    md = o.modifiers.new('bool', 'BOOLEAN'); md.operation = op; md.object = cutter; md.solver = 'EXACT'
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier=md.name)
    if not keep:
        bpy.data.objects.remove(cutter, do_unlink=True)

def area_light(name, loc, rot, size, size_y, color, power):
    l = bpy.data.lights.new(name, 'AREA'); l.shape = 'RECTANGLE'; l.size = size; l.size_y = size_y
    l.color = color; l.energy = power
    o = bpy.data.objects.new(name, l); bpy.context.collection.objects.link(o)
    o.location = loc; o.rotation_euler = rot
    return o

def point_light(name, loc, color, power, radius=0.05):
    l = bpy.data.lights.new(name, 'POINT'); l.color = color; l.energy = power; l.shadow_soft_size = radius
    o = bpy.data.objects.new(name, l); bpy.context.collection.objects.link(o)
    o.location = loc
    return o

def look_at(obj, target):
    d = Vector(target) - Vector(obj.location)
    obj.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()

from mathutils import Vector

G = {}   # group name -> list of objects

def grp(name, *objs):
    G.setdefault(name, []).extend(objs)
    return objs[0] if len(objs) == 1 else objs

WALNUT = None

def make_materials():
    M = {}
    M['wall'] = tex_mat('wall', (0.10, 0.05, 0.03), (0.30, 0.15, 0.085), 0.55, stretch=(0.4, 0.4, 14), noise=5.0, bump=0.35)
    M['walnut'] = tex_mat('walnut', (0.06, 0.028, 0.016), (0.20, 0.10, 0.055), 0.38, stretch=(0.5, 9, 9), noise=6.0, bump=0.12)
    M['desk'] = tex_mat('desk', (0.07, 0.034, 0.02), (0.24, 0.12, 0.07), 0.35, stretch=(0.6, 8, 8), noise=7.0, bump=0.10)
    M['leather'] = mat('leather', (0.012, 0.03, 0.10), 0.7, sheen_weight=0.3, specular_ior_level=0.2)
    M['brass'] = mat('brass', (0.80, 0.55, 0.22), 0.28, 1.0)
    M['iron'] = mat('iron', (0.025, 0.025, 0.03), 0.45, 0.8)
    M['velvet'] = mat('velvet', (0.17, 0.02, 0.06), 0.9, sheen_weight=1.0, sheen_roughness=0.4, sheen_tint=(1.0, 0.45, 0.5))
    M['fur'] = mat('fur', (0.92, 0.9, 0.9), 0.85, sheen_weight=0.6, subsurface_weight=0.15)
    M['pink'] = mat('pink', (0.85, 0.55, 0.58), 0.7)
    M['dark'] = mat('dark', (0.02, 0.018, 0.02), 0.6)
    M['paper'] = mat('paper', (0.85, 0.8, 0.68), 0.8)
    M['cover'] = mat('cover', (0.2, 0.05, 0.08), 0.7)
    M['mug'] = mat('mug', (0.07, 0.13, 0.30), 0.18, coat_weight=0.6)
    M['cocoa'] = mat('cocoa', (0.12, 0.05, 0.025), 0.3)
    M['cream'] = mat('cream', (0.9, 0.86, 0.78), 0.5)
    M['wood2'] = tex_mat('wood2', (0.05, 0.022, 0.012), (0.17, 0.08, 0.04), 0.5, stretch=(0.5, 9, 9), noise=6.0, bump=0.1)
    M['needle'] = mat('needle', (0.12, 0.34, 0.2), 0.6)
    M['snow'] = mat('snow', (0.92, 0.95, 1.0), 0.7)
    M['glass'] = mat('glass', (0.7, 0.9, 1.0), 0.05, 0.0, transmission_weight=0.0)
    M['lamp'] = mat('lamp', (1, 0.8, 0.5), 0.3, emission_color=(1.0, 0.72, 0.35), emission_strength=6.0)
    M['acrylic'] = bpy.data.materials.new('acrylic'); M['acrylic'].use_nodes = True
    _p = M['acrylic'].node_tree.nodes['Principled BSDF']
    _p.inputs['Base Color'].default_value = (0.55, 0.65, 0.75, 1); _p.inputs['Roughness'].default_value = 0.04; _p.inputs['Alpha'].default_value = 0.09
    M['fire'] = mat('fire', (1, 0.5, 0.1), 0.4, emission_color=(1.0, 0.45, 0.08), emission_strength=9.0)
    M['lens'] = mat('lens', (0.3, 0.7, 0.9), 0.08, 0.0, emission_color=(0.3, 0.75, 0.95), emission_strength=0.4)
    M['gold'] = mat('gold', (0.95, 0.72, 0.30), 0.22, 1.0)
    M['recbase'] = mat('recbase', (0.9, 0.7, 0.32), 0.22, 1.0)
    return M

def fire_mat():
    m = bpy.data.materials.new('firepic'); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['UV'], sep.inputs['Vector'])
    cr = nt.nodes.new('ShaderNodeValToRGB')
    cr.color_ramp.elements[0].position = 0.0; cr.color_ramp.elements[0].color = (1.0, 0.95, 0.6, 1)
    e = cr.color_ramp.elements.new(0.45); e.color = (1.0, 0.45, 0.08, 1)
    cr.color_ramp.elements[1].position = 1.0; cr.color_ramp.elements[1].color = (0.35, 0.06, 0.02, 1)
    inv = nt.nodes.new('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1.0
    nt.links.new(sep.outputs['Y'], inv.inputs[1]); nt.links.new(inv.outputs['Value'], cr.inputs['Fac'])
    nt.links.new(cr.outputs['Color'], b.inputs['Emission Color']); b.inputs['Emission Strength'].default_value = 2.2
    b.inputs['Base Color'].default_value = (0, 0, 0, 1)
    return m

def img_mat(name, path, rough=0.6, emit=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(path)
    nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = rough
    if emit:
        nt.links.new(t.outputs['Color'], b.inputs['Emission Color']); b.inputs['Emission Strength'].default_value = emit
    return m

def build(chart_png):
    M = make_materials()
    # ---- room shell (hidden from camera except wall): floor, side walls, ceiling for bounce light
    for n, s, l in [('floor', (14, 12, 0.2), (0, -3, -0.1)), ('ceil', (14, 12, 0.2), (0, -3, 5.0)),
                    ('wallL', (0.2, 12, 5), (-7, -3, 2.4)), ('wallR', (0.2, 12, 5), (7, -3, 2.4))]:
        o = box(n, s, l, M['wall']); o.visible_camera = False
    # ---- back wall with the arched window cut
    wall = box('wall', (14, 0.4, 5.0), (0, 0.2, 2.4), M['wall'])
    cut1 = box('c1', (3.3, 1.5, 2.45), (0, 0, 1.3 + 2.45 / 2), M['wall'])
    cut2 = cyl('c2', 1.65, 1.5, (0, 0, 3.75), M['wall'], rot=(math.pi / 2, 0, 0)); cut2.scale = (1, 0.22, 1)
    boolean(wall, cut1); boolean(wall, cut2)
    grp('wall', wall)
    # frame: a walnut moulding around the opening
    fo = box('fo', (3.75, 0.5, 2.7), (0, -0.04, 1.3 + 2.7 / 2 - 0.12), M['walnut'])
    fo2 = cyl('fo2', 1.88, 0.5, (0, -0.04, 3.75), M['walnut'], rot=(math.pi / 2, 0, 0)); fo2.scale = (1, 0.22, 1)
    boolean(fo, fo2, 'UNION')
    ci = box('ci', (3.3, 1.5, 2.45), (0, 0, 1.3 + 2.45 / 2), M['walnut'])
    ci2 = cyl('ci2', 1.65, 1.5, (0, 0, 3.75), M['walnut'], rot=(math.pi / 2, 0, 0)); ci2.scale = (1, 0.22, 1)
    boolean(fo, ci); boolean(fo, ci2)
    grp('wall', fo)
    # sill, mullions
    grp('wall', box('sill', (4.1, 0.5, 0.12), (0, -0.2, 1.26), M['walnut'], 0.02))
    for x in (-1.45, 1.45):
        grp('wall', box('mull', (0.1, 0.12, 2.9), (x, 0.0, 2.75), M['walnut'], 0.02))
    grp('wall', box('transom', (3.3, 0.1, 0.1), (0, 0.0, 3.62), M['walnut'], 0.02))
    # ---- desk
    desk = box('desk', (13.0, 2.6, 0.16), (0, -1.3, 1.02), M['desk'], 0.02)
    grp('desk', desk)
    front = box('deskfront', (13.0, 0.1, 0.9), (0, -2.6, 0.5), M['desk'], 0.015)
    grp('desk', front)
    for x in (-1.4, 1.5):
        grp('desk', box('drawer', (3.4, 0.05, 0.62), (x, -2.67, 0.45), M['walnut'], 0.02))
        grp('desk', box('pull', (0.7, 0.07, 0.07), (x, -2.72, 0.55), M['brass'], 0.02))
    grp('desk', box('mat', (2.5, 1.25, 0.02), (-1.2, -1.45, 1.11), M['leather'], 0.005))
    grp('desk', box('matgold', (2.4, 1.15, 0.002), (-1.2, -1.45, 1.121), M['gold'], 0.0))
    grp('desk', box('matin', (2.36, 1.11, 0.003), (-1.2, -1.45, 1.123), M['leather'], 0.0))
    for zz in [1.6 + 0.3 * k for k in range(0, 11)]:
        grp('wall', box('grooveL', (4.4, 0.03, 0.022), (-4.9, -0.005, zz), M['dark'], 0.0))
        grp('wall', box('grooveR', (4.4, 0.03, 0.022), (4.9, -0.005, zz), M['dark'], 0.0))
    # ---- stove on a hearth ledge (left)
    grp('wall', box('ledge', (1.5, 0.9, 0.12), (-3.55, -0.3, 1.4), M['walnut'], 0.02))
    stove = box('stove', (0.9, 0.7, 1.0), (-3.55, -0.3, 1.96), M['iron'], 0.05)
    grp('wall', stove)
    grp('wall', box('stovetop', (1.0, 0.78, 0.07), (-3.55, -0.3, 2.5), M['iron'], 0.03))
    grp('wall', box('doorframe', (0.58, 0.04, 0.5), (-3.55, -0.655, 1.97), M['dark'], 0.02))
    bpy.ops.mesh.primitive_plane_add(size=1, location=(-3.55, -0.68, 1.97), rotation=(math.pi / 2, 0, 0))
    fp = bpy.context.object; fp.scale = (0.46, 0.38, 1); fp.name = 'fire'; fp.data.materials.append(fire_mat()); grp('wall', fp)
    grp('wall', box('doorhandle', (0.03, 0.04, 0.16), (-3.19, -0.68, 1.97), M['brass'], 0.01))
    for lx in (-3.9, -3.2):
        grp('wall', box('stovleg', (0.06, 0.06, 0.1), (lx, -0.55, 1.51), M['iron'], 0.01))
    grp('wall', cyl('pipe', 0.12, 2.4, (-3.55, 0.0, 3.8), M['iron'], seg=32))
    grp('wall', box('shelf', (1.7, 0.5, 0.07), (-3.55, -0.05, 3.55), M['walnut'], 0.02))
    grp('wall', cyl('candle', 0.05, 0.28, (-3.0, -0.1, 3.72), M['cream'], seg=24))
    grp('wall', sphere('flame', 0.03, (-3.0, -0.1, 3.9), M['lamp'], (0.7, 0.7, 1.4), 16))
    grp('wall', box('brassbox', (0.28, 0.2, 0.16), (-4.1, -0.1, 3.66), M['brass'], 0.02))
    # ---- star chart on the wall (right)
    grp('wall', box('chartframe', (1.25, 0.07, 1.78), (3.45, -0.02, 3.2), M['gold'], 0.02))
    bpy.ops.mesh.primitive_plane_add(size=1, location=(3.45, -0.075, 3.2), rotation=(math.pi / 2, 0, 0))
    chart = bpy.context.object; chart.scale = (1.1, 1.62, 1); chart.name = 'chart'
    chart.data.materials.append(img_mat('chart', chart_png, 0.7, emit=0.45))
    grp('wall', chart)
    # ---- sconce (right of the window)
    sc = []
    sc.append(box('splate', (0.18, 0.06, 0.22), (2.75, -0.02, 3.0), M['brass'], 0.02))
    sc.append(tube('sarm', [(2.75, -0.05, 3.0), (2.75, -0.30, 3.02), (2.75, -0.42, 3.2)], 0.025, M['brass']))
    sc.append(cyl('scup', 0.09, 0.07, (2.75, -0.42, 3.2), M['brass'], seg=32))
    sc.append(sphere('sglobe', 0.12, (2.75, -0.42, 3.38), M['lamp'], (1, 1, 1.25), 32))
    grp('sconce', *sc)
    # ---- curtain rod and curtains
    grp('wall', cyl('rod', 0.04, 7.6, (0, -0.25, 4.45), M['brass'], rot=(0, math.pi / 2, 0), seg=24))
    for x in (-3.85, 3.85):
        grp('wall', sphere('finial', 0.11, (x, -0.25, 4.45), M['brass']))
    for side, (xa, xb) in (('L', (-2.9, -1.7)), ('R', (1.55, 2.75))):
        grp('curtain' + side, curtain(M['velvet'], xa, xb, side))
    # ---- moon mobile (hangs in front of the left curtain)
    mb = []
    mb.append(tube('mstring', [(-2.5, -0.5, 4.8), (-2.5, -0.5, 4.2)], 0.008, M['brass']))
    mb.append(box('mbar', (0.5, 0.02, 0.025), (-2.5, -0.5, 4.2), M['brass'], 0.005))
    for x, z in ((-2.7, 3.9), (-2.5, 3.6), (-2.3, 3.75)):
        mb.append(tube('mstr', [(x, -0.5, 4.2), (x, -0.5, z + 0.2)], 0.006, M['brass']))
    moon = sphere('moon', 0.17, (-2.5, -0.5, 3.45), M['brass'], (1, 0.18, 1))
    cutm = sphere('cm', 0.15, (-2.43, -0.5, 3.5), M['brass'], (1, 0.5, 1))
    boolean(moon, cutm); mb.append(moon)
    star = star_mesh(0.13, 0.04, (-2.3, -0.5, 3.75), M['brass']); mb.append(star)
    mb.append(sphere('mball', 0.06, (-2.7, -0.5, 3.85), M['brass']))
    grp('mobile', *mb)
    # ---- retro CD player (a brass and walnut top-loader with the lid standing open)
    tx, ty, tz = 1.4, -1.45, 1.12
    cx = tx - 0.14                      # centre of the disc well
    tp = [box('tbody', (1.04, 0.64, 0.26), (tx, ty, tz + 0.13), M['wood2'], 0.03),
          box('tplate', (0.98, 0.58, 0.012), (tx, ty, tz + 0.266), M['brass'], 0.004),
          cyl('twell', 0.27, 0.012, (cx, ty, tz + 0.272), M['iron'], seg=72),
          torus('tring', 0.27, 0.011, (cx, ty, tz + 0.276), M['brass']),
          cyl('tspin', 0.022, 0.03, (cx, ty, tz + 0.285), M['brass'], seg=24),
          box('ttrim', (1.0, 0.02, 0.022), (tx, ty - 0.322, tz + 0.252), M['brass'], 0.004),
          box('tbezel', (0.35, 0.014, 0.11), (tx + 0.22, ty - 0.325, tz + 0.172), M['iron'], 0.006),
          box('tlcd', (0.30, 0.01, 0.07), (tx + 0.22, ty - 0.332, tz + 0.172), M['lamp']),
          cyl('tknob', 0.05, 0.045, (tx + 0.41, ty - 0.335, tz + 0.12), M['brass'], rot=(math.pi / 2, 0, 0), seg=40),
          cyl('thinge', 0.012, 0.6, (cx, ty + 0.315, tz + 0.27), M['brass'], rot=(0, math.pi / 2, 0), seg=16)]
    for dx in (-0.40, -0.30, -0.20, -0.10):
        tp.append(cyl('tbtn', 0.03, 0.026, (tx + dx - 0.02, ty - 0.332, tz + 0.12), M['brass'], rot=(math.pi / 2, 0, 0), seg=32))
    for k in range(4):
        tp.append(box('tgrille', (0.30, 0.008, 0.012), (tx + 0.22, ty - 0.325, tz + 0.085 - k * 0.022), M['iron']))
    tp.append(box('tlid', (0.62, 0.012, 0.46), (cx, ty + 0.35, tz + 0.5), M['acrylic'], 0.004, rot=(-0.2, 0, 0)))
    grp('turntable', *tp)
    cd = cyl('record', 0.24, 0.006, (cx, ty, tz + 0.292), record_mat(), seg=128)
    hole = cyl('cdhole', 0.026, 0.05, (cx, ty, tz + 0.292), M['iron'], seg=32)
    boolean(cd, hole)
    grp('record', cd)
    grp('tonearm', box('nothing', (0.001, 0.001, 0.001), (tx, ty, tz - 0.5), M['iron']))
    # ---- armillary sphere
    ax, ay, az = -0.35, -0.7, 1.12
    ab = [cyl('afoot', 0.17, 0.03, (ax, ay, az + 0.015), M['brass'], seg=48), cyl('astem', 0.022, 0.32, (ax, ay, az + 0.19), M['brass'], seg=24),
          torus('ahoop', 0.30, 0.012, (ax, ay, az + 0.55), M['brass'], rot=(math.pi / 2, 0, 0)),
          torus('ahoop2', 0.30, 0.012, (ax, ay, az + 0.55), M['brass'], rot=(math.pi / 2, 0, math.pi / 2)),
          sphere('acore', 0.05, (ax, ay, az + 0.55), M['brass'])]
    ab.append(tube('aaxis', [(ax - 0.22, ay, az + 0.33), (ax + 0.22, ay, az + 0.77)], 0.012, M['brass']))
    grp('desk', *ab)
    ring = torus('aring', 0.23, 0.012, (ax, ay, az + 0.55), M['gold'], rot=(math.pi / 2, 0, math.pi / 4))
    ring2 = torus('aring2', 0.18, 0.011, (ax, ay, az + 0.55), M['gold'], rot=(math.pi / 3, 0, 0))
    grp('ring', ring, ring2)
    # ---- mug and saucer
    mx, my = 0.55, -1.0
    grp('desk', cyl('saucer', 0.19, 0.02, (mx, my, 1.125), M['brass'], seg=48))
    mug = cyl('mug', 0.115, 0.2, (mx, my, 1.245), M['mug'], seg=48)
    grp('desk', mug)
    grp('desk', cyl('cocoa', 0.105, 0.01, (mx, my, 1.34), M['cocoa'], seg=48))
    grp('desk', torus('mhandle', 0.07, 0.016, (mx + 0.16, my, 1.25), M['mug'], rot=(math.pi / 2, 0, 0)))
    # ---- open book
    bx, by = -1.45, -1.45
    grp('desk', box('bcover', (0.82, 0.55, 0.035), (bx, by, 1.14), M['cover'], 0.01, rot=(0, 0, 0.08)))
    for sgn in (-1, 1):
        grp('desk', box('page', (0.38, 0.5, 0.05), (bx + sgn * 0.195, by, 1.175 + 0.0), M['paper'], 0.01, rot=(0, sgn * 0.12, 0.08)))
    # ---- telescope on a tripod
    tx2, ty2 = 2.55, -0.8
    tel = []
    for dx, dy in ((-0.38, -0.2), (0.38, -0.18), (0.0, 0.35)):
        tel.append(tube('leg', [(tx2, ty2, 1.95), (tx2 + dx, ty2 + dy, 1.12)], 0.025, M['wood2']))
    tel.append(sphere('thead', 0.07, (tx2, ty2, 1.95), M['brass']))
    tube_axis = Vector((-0.78, -0.25, 0.42)).normalized()
    c0 = Vector((tx2, ty2, 2.02))
    tt = cyl('ttube', 0.075, 1.15, c0, M['brass'], seg=48)
    tt.rotation_euler = tube_axis.to_track_quat('Z', 'Y').to_euler()
    tel.append(tt)
    for k in (-0.2, 0.25):
        r_ = torus('tband', 0.08, 0.012, c0 + tube_axis * k, M['gold']); r_.rotation_euler = tt.rotation_euler; tel.append(r_)
    lens = cyl('tlens', 0.07, 0.01, c0 + tube_axis * 0.585, M['lens'], seg=48); lens.rotation_euler = tt.rotation_euler; tel.append(lens)
    eye = cyl('teye', 0.035, 0.18, c0 - tube_axis * 0.62, M['brass'], seg=32); eye.rotation_euler = tt.rotation_euler; tel.append(eye)
    grp('desk', *tel)
    # ---- sleeping arctic fox on a rug (left)
    grp('fox', *fox_body(M, -2.45, -1.3))
    grp('foxtail', *fox_tail(M, -2.45, -1.3))
    grp('desk', cyl('rug', 0.7, 0.02, (-2.5, -1.35, 1.12), mat('rug', (0.28, 0.05, 0.07), 0.9, sheen_weight=1), seg=64))
    G["desk"][-1].scale = (1.0, 0.65, 1.0)
    for i, (w, d_, h, c, dx) in enumerate([(0.62, 0.42, 0.07, (0.25, 0.06, 0.08), 0.0), (0.56, 0.38, 0.06, (0.08, 0.2, 0.18), 0.03), (0.5, 0.34, 0.06, (0.6, 0.45, 0.15), -0.02)]):
        grp('desk', box('stackbook', (w, d_, h), (0.0 + dx, -2.1, 1.1 + 0.035 + sum([0.07, 0.06, 0.06][:i]) + h / 2), mat('bk%d' % i, c, 0.6), 0.01, rot=(0, 0, 0.1 * (i - 1))))
    # ---- snow pine branch (right foreground)
    grp('pine', *pine(M, 2.5, -2.3, 1.12))
    return M

def star_mesh(R, r, loc, m):
    import bmesh
    me = bpy.data.meshes.new('star'); bm = bmesh.new()
    pts = []
    for i in range(8):
        a = i * math.pi / 4
        rr = R if i % 2 == 0 else r
        pts.append((math.cos(a) * rr, 0, math.sin(a) * rr))
    vs = [bm.verts.new(p) for p in pts]; bm.faces.new(vs)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('star', me); bpy.context.collection.objects.link(o); o.location = loc
    md = o.modifiers.new('s', 'SOLIDIFY'); md.thickness = 0.02
    md2 = o.modifiers.new('b', 'BEVEL'); md2.width = 0.004
    o.data.materials.append(m)
    return o

def curtain(m, xa, xb, side):
    import bmesh
    nx, nz = 90, 140
    z0, z1 = 1.55, 4.4
    me = bpy.data.meshes.new('curtain'); bm = bmesh.new()
    rows = []
    for j in range(nz + 1):
        row = []
        t = j / nz
        for i in range(nx + 1):
            u = i / nx
            x = xa + (xb - xa) * u
            folds = math.sin(u * math.pi * 2 * 5.5 + 0.7 * math.sin(t * 3) + (0.6 if side == 'L' else 2.2))
            y = -0.22 - 0.075 * folds * (0.5 + 0.5 * (1 - t * 0.4))
            if t > 0.93 or True:
                pass
            z = z1 - (z1 - z0) * t
            # scalloped hem
            if j == nz:
                z += 0.045 * abs(math.sin(u * math.pi * 10)) * -1
            row.append(bm.verts.new((x, y, z)))
        rows.append(row)
    for j in range(nz):
        for i in range(nx):
            bm.faces.new((rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]))
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('curtain' + side, me); bpy.context.collection.objects.link(o)
    for p in o.data.polygons: p.use_smooth = True
    md = o.modifiers.new('sol', 'SOLIDIFY'); md.thickness = 0.03
    o.data.materials.append(m)
    return o

def record_mat():
    """a silver compact disc: a rainbow sheen that changes with the angle, a clear hub ring and a dark rim"""
    m = bpy.data.materials.new('record'); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs['Vector'])
    at = nt.nodes.new('ShaderNodeMath'); at.operation = 'ARCTAN2'
    nt.links.new(sep.outputs['Y'], at.inputs[0]); nt.links.new(sep.outputs['X'], at.inputs[1])
    nm = nt.nodes.new('ShaderNodeMath'); nm.operation = 'MULTIPLY_ADD'; nm.inputs[1].default_value = 1 / (2 * math.pi); nm.inputs[2].default_value = 0.5
    nt.links.new(at.outputs['Value'], nm.inputs[0])
    cr = nt.nodes.new('ShaderNodeValToRGB'); cr.color_ramp.interpolation = 'LINEAR'
    cols = [(0.0, (0.86, 0.90, 0.96)), (0.12, (0.55, 0.78, 1.0)), (0.26, (0.98, 0.70, 0.92)), (0.40, (0.98, 0.96, 0.70)), (0.55, (0.62, 0.95, 0.82)),
            (0.70, (0.95, 0.72, 0.55)), (0.85, (0.60, 0.75, 1.0)), (1.0, (0.86, 0.90, 0.96))]
    cr.color_ramp.elements[0].position = cols[0][0]; cr.color_ramp.elements[0].color = cols[0][1] + (1,)
    cr.color_ramp.elements[1].position = cols[-1][0]; cr.color_ramp.elements[1].color = cols[-1][1] + (1,)
    for p, c in cols[1:-1]:
        e = cr.color_ramp.elements.new(p); e.color = c + (1,)
    nt.links.new(nm.outputs['Value'], cr.inputs['Fac'])
    ln = nt.nodes.new('ShaderNodeVectorMath'); ln.operation = 'LENGTH'; nt.links.new(tc.outputs['Object'], ln.inputs[0])
    hub = nt.nodes.new('ShaderNodeMath'); hub.operation = 'GREATER_THAN'; hub.inputs[1].default_value = 0.075
    nt.links.new(ln.outputs['Value'], hub.inputs[0])
    mix = nt.nodes.new('ShaderNodeMixRGB'); mix.inputs[1].default_value = (0.96, 0.97, 0.98, 1)
    nt.links.new(hub.outputs['Value'], mix.inputs['Fac']); nt.links.new(cr.outputs['Color'], mix.inputs[2])
    rim = nt.nodes.new('ShaderNodeMath'); rim.operation = 'LESS_THAN'; rim.inputs[1].default_value = 0.232
    nt.links.new(ln.outputs['Value'], rim.inputs[0])
    mix2 = nt.nodes.new('ShaderNodeMixRGB'); mix2.inputs[1].default_value = (0.04, 0.04, 0.05, 1)
    nt.links.new(rim.outputs['Value'], mix2.inputs['Fac']); nt.links.new(mix.outputs['Color'], mix2.inputs[2])
    nt.links.new(mix2.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Metallic'].default_value = 0.85; b.inputs['Roughness'].default_value = 0.2
    return m

def _fur_mat():
    m = bpy.data.materials.new('furm'); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = 260; n.inputs['Detail'].default_value = 6
    tc = nt.nodes.new('ShaderNodeTexCoord'); nt.links.new(tc.outputs['Object'], n.inputs['Vector'])
    bm = nt.nodes.new('ShaderNodeBump'); bm.inputs['Strength'].default_value = 0.35
    nt.links.new(n.outputs['Fac'], bm.inputs['Height']); nt.links.new(bm.outputs['Normal'], b.inputs['Normal'])
    b.inputs['Base Color'].default_value = (0.93, 0.92, 0.93, 1); b.inputs['Roughness'].default_value = 0.9
    b.inputs['Sheen Weight'].default_value = 0.7; b.inputs['Subsurface Weight'].default_value = 0.2
    b.inputs['Subsurface Radius'].default_value = (0.6, 0.3, 0.3)
    return m

def _rot(o, rz):
    o.rotation_euler = (0, 0, rz)

def cone(name, r, h, loc, m, rot=(0, 0, 0), seg=24):
    bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=0, depth=h, location=loc, rotation=rot, vertices=seg)
    return _fin(bpy.context.object, m, 0, True, name)

def fox_body(M, cx, cy):
    z0, rz = 1.12, 0.35
    fm = _fur_mat(); M['fur'] = fm
    parts = []
    def S(name, loc, sc, m=fm):
        o = sphere(name, 1.0, (0, 0, 0), m, sc, 48); o.location = loc; parts.append(o); return o
    S('fbody', (0.02, 0.0, 0.17), (0.36, 0.25, 0.18))
    S('fhaunch', (0.17, 0.05, 0.16), (0.24, 0.24, 0.16))
    S('fhead', (-0.36, -0.10, 0.12), (0.20, 0.17, 0.15))
    S('fcheek', (-0.42, -0.12, 0.08), (0.16, 0.16, 0.10))
    S('fmuzzle', (-0.55, -0.11, 0.075), (0.11, 0.07, 0.06))
    for nm, loc, rot in (('fear1', (-0.34, 0.01, 0.30), (0.0, -0.15, 0.2)), ('fear2', (-0.30, -0.21, 0.30), (0.0, -0.15, -0.2))):
        e = cone(nm, 0.075, 0.2, loc, fm, rot); parts.append(e)
        e2 = cone(nm + 'in', 0.045, 0.14, (loc[0] - 0.012, loc[1] + (0.012 if loc[1] < -0.1 else -0.012), loc[2] - 0.01), M['pink'], rot); parts.append(e2)
    S('fpaw', (-0.50, -0.25, 0.04), (0.12, 0.05, 0.04))
    S('fnose', (-0.655, -0.115, 0.085), (0.024, 0.022, 0.02), M['dark'])
    S('feye1', (-0.46, 0.058, 0.14), (0.04, 0.008, 0.012), M['dark'])
    S('feye2', (-0.46, -0.255, 0.14), (0.04, 0.008, 0.012), M['dark'])
    root = bpy.data.objects.new('foxroot', None); bpy.context.collection.objects.link(root)
    root.location = (cx, cy, z0); root.rotation_euler = (0, 0, rz)
    for p in parts: p.parent = root
    return [root] + parts

def fox_tail(M, cx, cy):
    z0, rz = 1.12, 0.35
    tp = bpy.data.curves.new('taper', 'CURVE'); tp.dimensions = '3D'
    sp = tp.splines.new('POLY'); sp.points.add(4)
    for p, (x, y) in zip(sp.points, [(0, 0.45), (0.25, 0.95), (0.55, 1.0), (0.85, 0.7), (1.0, 0.12)]): p.co = (x, y, 0, 1)
    tpo = bpy.data.objects.new('taper', tp); bpy.context.collection.objects.link(tpo); tpo.hide_render = True
    cu = bpy.data.curves.new('foxtail', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = 0.13; cu.bevel_resolution = 10; cu.use_fill_caps = True
    cu.taper_object = tpo
    pts = [(0.34, 0.10, 0.12), (0.50, -0.04, 0.11), (0.52, -0.22, 0.10), (0.40, -0.38, 0.10), (0.20, -0.47, 0.10), (-0.02, -0.5, 0.10), (-0.22, -0.46, 0.10)]
    spl = cu.splines.new('NURBS'); spl.points.add(len(pts) - 1)
    for p, c in zip(spl.points, pts): p.co = (*c, 1)
    spl.order_u = 4; spl.use_endpoint_u = True; spl.resolution_u = 24
    o = bpy.data.objects.new('foxtail', cu); bpy.context.collection.objects.link(o)
    o.data.materials.append(M['fur'])
    root = bpy.data.objects.new('foxtailroot', None); bpy.context.collection.objects.link(root)
    root.location = (cx, cy, z0); root.rotation_euler = (0, 0, rz)
    o.parent = root
    return [o]

def pine(M, x, y, z):
    rb = random.Random(4)
    cu = bpy.data.curves.new('pine', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = 0.0075; cu.bevel_resolution = 3
    cu2 = bpy.data.curves.new('pinebr', 'CURVE'); cu2.dimensions = '3D'; cu2.bevel_depth = 0.02; cu2.bevel_resolution = 4
    base = Vector((x + 0.6, y - 0.2, z + 0.25))
    objs = []
    for b in range(5):
        ang = math.radians(rb.uniform(150, 215)); lift = rb.uniform(0.05, 0.4); ln = rb.uniform(0.9, 1.5)
        d = Vector((math.cos(ang), math.sin(ang) * 0.4, lift)).normalized()
        sp2 = cu2.splines.new('POLY'); sp2.points.add(5)
        for k in range(6): sp2.points[k].co = (*(base + d * ln * k / 5 + Vector((0, 0, -0.1 * (k / 5) ** 2))), 1)
        for k in range(26):
            t = 0.15 + 0.85 * k / 25
            c = base + d * ln * t + Vector((0, 0, -0.1 * t * t))
            for sgn in (-1, 1):
                nd = Vector((d.x * 0.3 + 0.0, sgn * 0.85, -0.2 + rb.uniform(-0.1, 0.1))).normalized()
                L_ = 0.22 * (1.1 - t * 0.5)
                sp = cu.splines.new('POLY'); sp.points.add(1)
                sp.points[0].co = (*c, 1); sp.points[1].co = (*(c + nd * L_ + d * 0.05), 1)
    for cuv, mm, nm in ((cu, M['needle'], 'pineneedles'), (cu2, M['wood2'], 'pinebranches')):
        o = bpy.data.objects.new(nm, cuv); bpy.context.collection.objects.link(o); o.data.materials.append(mm); objs.append(o)
    for k, (dx, dy, dz) in enumerate([(0.2, -0.1, 0.35), (0.5, -0.05, 0.3), (0.8, -0.2, 0.28)]):
        objs.append(sphere('snowb', 0.07, (x + dx, y + dy - 0.1, z + dz), M['snow'], (1.3, 1, 0.5)))
    return objs

def make_chart_png(path):
    from PIL import Image, ImageDraw
    S = 1100
    im = Image.new('RGB', (S, int(S * 1.62 / 1.1)), (12, 20, 48)); d = ImageDraw.Draw(im)
    W_, H_ = im.size
    for yy in range(H_):
        c = int(10 + 22 * yy / H_); d.line([(0, yy), (W_, yy)], fill=(c, c + 8, 46 + c))
    gold = (228, 186, 100)
    cx, cy = W_ // 2, int(H_ * 0.58)
    for r, w in ((380, 6), (270, 3)):
        d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=gold, width=w)
    d.line([(cx - 380, cy), (cx + 380, cy)], fill=gold, width=3); d.line([(cx, cy - 380), (cx, cy + 380)], fill=gold, width=3)
    pts = [(cx - 160, cy - 140), (cx - 70, cy - 80), (cx + 20, cy - 130), (cx + 120, cy - 60), (cx + 200, cy - 110), (cx - 120, cy + 60), (cx, cy + 90), (cx + 110, cy + 50), (cx + 190, cy + 130), (cx - 60, cy + 180), (cx + 30, cy + 220)]
    for a, b in [(0, 1), (1, 2), (2, 3), (3, 4), (1, 5), (5, 6), (6, 7), (7, 8), (6, 9), (9, 10)]:
        d.line([pts[a], pts[b]], fill=gold, width=4)
    for p in pts:
        d.ellipse((p[0] - 11, p[1] - 11, p[0] + 11, p[1] + 11), fill=(255, 240, 190))
    d.rectangle((W_ // 2 - 210, 90, W_ // 2 + 210, 130), outline=gold, width=4)
    for sx, sy in ((70, 70), (W_ - 70, 70), (70, H_ - 70), (W_ - 70, H_ - 70)):
        d.polygon([(sx, sy - 26), (sx + 8, sy - 8), (sx + 26, sy), (sx + 8, sy + 8), (sx, sy + 26), (sx - 8, sy + 8), (sx - 26, sy), (sx - 8, sy - 8)], fill=gold)
    im.save(path)

def setup_cam(res=(1920, 1080), loc=(0, -8.7, 3.5), target=(0, 0, 2.05), lens_deg=50):
    cam = bpy.data.cameras.new('cam'); cam.sensor_width = 36
    cam.lens = 18 / math.tan(math.radians(lens_deg / 2)); cam.clip_end = 100
    o = bpy.data.objects.new('cam', cam); bpy.context.collection.objects.link(o)
    o.location = loc; look_at(o, target)
    sc = bpy.context.scene; sc.camera = o
    sc.render.resolution_x, sc.render.resolution_y = res; sc.render.resolution_percentage = 100
    return o

def lights(mode):
    for o in [o for o in bpy.data.objects if o.type == 'LIGHT']:
        bpy.data.objects.remove(o, do_unlink=True)
    w = bpy.context.scene.world or bpy.data.worlds.new('w'); bpy.context.scene.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes['Background']
    if mode == 'day':
        bg.inputs['Color'].default_value = (0.5, 0.42, 0.45, 1); bg.inputs['Strength'].default_value = 0.0
        # low alpenglow sun through the window (long soft light patches on the desk)
        sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 11.0; sun.angle = math.radians(2.0); sun.color = (1.0, 0.66, 0.40)
        so = bpy.data.objects.new('sun', sun); bpy.context.collection.objects.link(so)
        d = Vector((0.22, -1, -0.38)).normalized(); so.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        # cool sky fill from the window opening
        f = area_light('skyfill', (0, 1.2, 2.9), (math.pi / 2, 0, math.pi), 3.3, 2.5, (0.80, 0.82, 1.0), 420)
        area_light('roomfill', (0.5, -6.5, 2.6), (-math.pi / 2, 0, 0), 7.0, 3.0, (1.0, 0.86, 0.72), 140)
        point_light('hearth', (-3.55, -1.0, 2.0), (1.0, 0.5, 0.18), 700, 0.15)
        point_light('sconcel', (2.75, -0.42, 3.38), (1.0, 0.72, 0.4), 110, 0.08)
        point_light('lampT', (1.5, -1.95, 1.55), (1.0, 0.72, 0.4), 10, 0.05)
    else:
        bg.inputs['Color'].default_value = (0.04, 0.07, 0.16, 1); bg.inputs['Strength'].default_value = 0.0
        f = area_light('aurora', (0, 1.0, 2.9), (math.pi / 2, 0, math.pi), 3.3, 2.5, (0.35, 0.95, 0.65), 860)
        area_light('nightfill', (0.5, -6.5, 2.6), (-math.pi / 2, 0, 0), 7.0, 3.0, (0.45, 0.58, 1.0), 45)
        f2 = area_light('aurora2', (-0.3, 0.9, 3.8), (math.pi / 2, 0, math.pi), 2.2, 1.0, (0.55, 0.45, 1.0), 220)
        point_light('hearth', (-3.55, -0.9, 2.0), (1.0, 0.5, 0.18), 160, 0.15)
        point_light('sconcel', (2.75, -0.42, 3.38), (1.0, 0.72, 0.4), 330, 0.08)
        point_light('lampT', (1.5, -1.95, 1.55), (1.0, 0.72, 0.4), 40, 0.05)
    for o in bpy.data.objects:
        if o.type == 'LIGHT':
            pass

def render_cfg(samples=48, denoise=True):
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'; sc.cycles.samples = samples
    sc.cycles.use_denoising = denoise; sc.cycles.denoiser = 'OPENIMAGEDENOISE'
    sc.render.film_transparent = True
    sc.view_settings.view_transform = 'AgX'
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    sc.cycles.max_bounces = 6; sc.cycles.use_light_tree = True
    sc.render.threads_mode = 'AUTO'

def show_only(names):
    vis = set()
    for n in names: vis.update(G[n])
    for g, objs in G.items():
        for o in objs:
            o.visible_camera = o in vis
            for c in o.children: c.visible_camera = o in vis

def render(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)

from bpy_extras.object_utils import world_to_camera_view
OUT = sys.argv[1]; SAMPLES = int(sys.argv[2]); ONLY = sys.argv[3].split(',') if len(sys.argv) > 3 else None
os.makedirs(OUT, exist_ok=True)
reset()
make_chart_png(os.path.join(OUT, 'chart.png'))
M = build(os.path.join(OUT, 'chart.png'))
cam = setup_cam((1920, 1080))
render_cfg(SAMPLES)
sc = bpy.context.scene

def bbox_norm(names, pad=0.04):
    xs, ys = [], []
    for n in names:
        for o in G[n]:
            objs = [o] + list(o.children)
            for ob in objs:
                if ob.type not in ('MESH', 'CURVE', 'META'): continue
                for c in ob.bound_box:
                    w = ob.matrix_world @ Vector(c)
                    v = world_to_camera_view(sc, cam, w)
                    xs.append(v.x); ys.append(v.y)
    return max(0, min(xs) - pad), max(0, min(ys) - pad), min(1, max(xs) + pad), min(1, max(ys) + pad)

bpy.context.view_layer.update()
meta = {}
def proj(pt):
    v = world_to_camera_view(sc, cam, Vector(pt)); return [round(v.x * 1920, 1), round((1 - v.y) * 1080, 1)]

meta['pivots'] = {
    'mobile': proj((-2.5, -0.5, 4.8)),
    'foxtail': proj((-2.45 + 0.4 * math.cos(0.35) - 0.12 * math.sin(0.35), -1.3 + 0.4 * math.sin(0.35) + 0.12 * math.cos(0.35), 1.23)),
    'fox_bottom': proj((-2.45, -1.3, 1.12)),
    'record_c': proj((1.26, -1.45, 1.412)),
    'record_l': proj((1.26 - 0.24, -1.45, 1.412)),
    'record_r': proj((1.26 + 0.24, -1.45, 1.412)),
    'mug_top': proj((0.55, -1.0, 1.36)),
    'pine_base': proj((3.9 + 0.6, -2.3 - 0.2, 1.12 + 0.25)),
}
json.dump(meta, open(OUT + '/meta.json', 'w'))

# more points (stove door, sconce, display, mug...) used by the export script for glows, steam and pivots
m = {'stove_door': proj((-3.55, -0.67, 1.97)), 'sconce': proj((2.75, -0.42, 3.38)), 'tubes': proj((1.62, -1.775, 1.292)),
    'candle': proj((-3.0, -0.1, 3.9)), 'scale_wall': proj((1, 0, 2))[0] - proj((0, 0, 2))[0],
    'mug_top': proj((0.55, -1.0, 1.36)), 'mobile': proj((-2.5, -0.5, 4.8)), 'tonearm': proj((1.82, -1.25, 1.35)), 'foxtail': proj((-2.45 + 0.4 * math.cos(0.35) - 0.12 * math.sin(0.35), -1.3 + 0.4 * math.sin(0.35) + 0.12 * math.cos(0.35), 1.23)), 'record_c': proj((1.26, -1.45, 1.412)), 'record_l': proj((1.02, -1.45, 1.412)), 'record_r': proj((1.50, -1.45, 1.412)), 'pine_base': proj((4.5, -2.5, 1.37)), 'platter': proj((1.26, -1.45, 1.3))}
json.dump(m, open(OUT + '/meta2.json', 'w'))
GROUPS = ['wall', 'sconce', 'curtainL', 'curtainR', 'mobile', 'desk', 'fox', 'foxtail', 'ring', 'turntable', 'pine']
t0 = time.time()
for mode in ('day', 'night'):
    lights(mode)
    for g in GROUPS:
        if ONLY and (mode + ':' + g) not in ONLY and g not in ONLY: continue
        show_only([g])
        x0, y0, x1, y1 = bbox_norm([g])
        if g in ('wall', 'desk', 'curtainL', 'curtainR'):
            sc.render.use_border = False
        else:
            sc.render.use_border = True; sc.render.use_crop_to_border = False
            sc.render.border_min_x, sc.render.border_min_y, sc.render.border_max_x, sc.render.border_max_y = x0, y0, x1, y1
        render(f'{OUT}/{mode}_{g}.png')
        print('done', mode, g, round(time.time() - t0), flush=True)
    # the record: seen from straight above so the engine can spin it
    show_only(['record'])
    for o in G['record']: o.visible_camera = True
    sc.render.use_border = False
    cam2 = bpy.data.cameras.new('top'); cam2.type = 'ORTHO'; cam2.ortho_scale = 0.62
    co = bpy.data.objects.new('top', cam2); bpy.context.collection.objects.link(co); co.location = (1.4 - 0.14, -1.45, 3.0)
    prev = sc.camera; sc.camera = co
    rx, ry = sc.render.resolution_x, sc.render.resolution_y
    sc.render.resolution_x = sc.render.resolution_y = 512
    render(f'{OUT}/{mode}_record.png')
    sc.render.resolution_x, sc.render.resolution_y = rx, ry; sc.camera = prev
    bpy.data.objects.remove(co, do_unlink=True)
    print('done', mode, 'record', round(time.time() - t0), flush=True)
print('ALL DONE')
