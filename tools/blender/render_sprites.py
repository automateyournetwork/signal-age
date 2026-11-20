"""Render Signal Age's settlement sprites (Blender 4.5, headless).

Usage: Blender -b --factory-startup -P tools/blender/render_sprites.py -- <out-dir> [size] [sprite ...]

Every sprite is modelled procedurally with simple low-poly shapes, lit by the same low north-west
sun and seen through the same 60-degree orthographic camera as the maps, then rendered on a
transparent background so the game can place it on any map. Sprites: hamlet, village, town, city,
metropolis, fort, camp, harbour.
"""
import math
import os
import random
import sys

import bpy

argv = sys.argv[sys.argv.index('--') + 1:]
OUT = argv[0]
SIZE = int(argv[1]) if len(argv) > 1 else 512
ONLY = argv[2:]
PITCH = math.radians(60.0)
os.makedirs(OUT, exist_ok=True)


def hex_rgba(h, a=1.0):
    h = h.lstrip('#')
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return (*[c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb], a)


MATS = {}


def mat(name, color, rough=0.8, metal=0.0, emit=0.0):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = hex_rgba(color)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = hex_rgba(color)
        b.inputs['Emission Strength'].default_value = emit
    MATS[name] = m
    return m


def mesh_obj(name, verts, faces, material):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    ob = bpy.data.objects.new(name, me)
    ob.data.materials.append(material)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def box(x, y, w, d, h, material, z=0.0, rot=0.0):
    c, s = math.cos(rot), math.sin(rot)
    pts = [(-w / 2, -d / 2), (w / 2, -d / 2), (w / 2, d / 2), (-w / 2, d / 2)]
    ring = [(x + px * c - py * s, y + px * s + py * c) for px, py in pts]
    verts = [(px, py, z) for px, py in ring] + [(px, py, z + h) for px, py in ring]
    faces = [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
    return mesh_obj('box', verts, faces, material)


def gable(x, y, w, d, z, h, material, rot=0.0, overhang=0.08):
    """A pitched roof whose ridge runs along the box's width."""
    c, s = math.cos(rot), math.sin(rot)
    w2, d2 = w / 2 + overhang, d / 2 + overhang

    def p(px, py, pz):
        return (x + px * c - py * s, y + px * s + py * c, pz)
    verts = [p(-w2, -d2, z), p(w2, -d2, z), p(w2, d2, z), p(-w2, d2, z), p(-w2, 0, z + h), p(w2, 0, z + h)]
    faces = [(0, 1, 5, 4), (2, 3, 4, 5), (0, 4, 3), (1, 2, 5), (0, 3, 2, 1)]
    return mesh_obj('roof', verts, faces, material)


def cylinder(x, y, r, h, material, z=0.0, verts=10):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=(x, y, z + h / 2))
    ob = bpy.context.object
    ob.data.materials.append(material)
    return ob


def cone(x, y, r, h, material, z=0.0, verts=10):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, depth=h, location=(x, y, z + h / 2))
    ob = bpy.context.object
    ob.data.materials.append(material)
    return ob


def sphere(x, y, z, r, material, squash=1.0):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=8, radius=r, location=(x, y, z))
    ob = bpy.context.object
    ob.scale.z = squash
    ob.data.materials.append(material)
    return ob


def plate(radius, color='#9ab063', edge='#b9a674'):
    """A soft ground disc so the sprite sits on the map instead of floating."""
    m = bpy.data.materials.new('Plate')
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = 1.0
    tc = nt.nodes.new('ShaderNodeTexCoord')
    grad = nt.nodes.new('ShaderNodeTexGradient'); grad.gradient_type = 'SPHERICAL'
    nt.links.new(tc.outputs['Object'], grad.inputs['Vector'])
    mapr = nt.nodes.new('ShaderNodeMapping')
    mapr.inputs['Scale'].default_value = (1 / radius, 1 / radius, 1 / radius)
    nt.links.new(tc.outputs['Object'], mapr.inputs['Vector'])
    nt.links.new(mapr.outputs['Vector'], grad.inputs['Vector'])
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (0, 0, 0, 1)
    ramp.color_ramp.elements[1].position = 0.55
    ramp.color_ramp.elements[1].color = (1, 1, 1, 1)
    nt.links.new(grad.outputs['Fac'], ramp.inputs['Fac'])
    col = nt.nodes.new('ShaderNodeMix'); col.data_type = 'RGBA'
    col.inputs['A'].default_value = hex_rgba(edge)
    col.inputs['B'].default_value = hex_rgba(color)
    nt.links.new(ramp.outputs['Color'], col.inputs['Factor'])
    nt.links.new(col.outputs['Result'], b.inputs['Base Color'])
    alpha = nt.nodes.new('ShaderNodeMath'); alpha.operation = 'MULTIPLY'; alpha.inputs[1].default_value = 0.9
    nt.links.new(ramp.outputs['Color'], alpha.inputs[0])
    nt.links.new(alpha.outputs['Value'], b.inputs['Alpha'])
    if hasattr(m, 'surface_render_method'):
        m.surface_render_method = 'BLENDED'
    bpy.ops.mesh.primitive_circle_add(vertices=48, radius=radius, fill_type='NGON', location=(0, 0, 0))
    ob = bpy.context.object
    ob.data.materials.append(m)
    return ob


# ---------- palette ----------
def P():
    return {
        'plaster': mat('plaster', '#eadfc6'), 'stone': mat('stone', '#c7b796'), 'darkstone': mat('darkstone', '#8f8574'),
        'wood': mat('wood', '#8a6a45'), 'thatch': mat('thatch', '#c4a25c'), 'tile': mat('tile', '#b8553d'),
        'slate': mat('slate', '#596473'), 'brick': mat('brick', '#a65a3f'), 'field1': mat('field1', '#d6bf6a'),
        'field2': mat('field2', '#8db35a'), 'field3': mat('field3', '#a8865a'), 'leaf': mat('leaf', '#3f7a33'),
        'felt': mat('felt', '#f1ece0'), 'felt_top': mat('felt_top', '#c9542f'), 'glass': mat('glass', '#7fa9cf', rough=0.15, metal=0.6),
        'glass2': mat('glass2', '#5f88b3', rough=0.12, metal=0.7), 'concrete': mat('concrete', '#c6cbd3'), 'road': mat('road', '#4b4f56'),
        'gold': mat('gold', '#d7a23a', rough=0.35, metal=0.8), 'flag': mat('flag', '#c23b2e'), 'rock': mat('rock', '#8c8c7a'),
        'grass': mat('grass', '#7aa24f'), 'water': mat('water', '#3c8fc4', rough=0.1), 'hull': mat('hull', '#5a3d2b'),
        'sail': mat('sail', '#f2ede1'), 'steel': mat('steel', '#e2b34a', rough=0.4, metal=0.5), 'white': mat('white', '#f5f5f2'),
        'smoke': mat('smoke', '#9a9a9a'), 'park': mat('park', '#5f9e45'), 'sheep': mat('sheep', '#fbfaf5'),
    }


def tree(x, y, s, m):
    cylinder(x, y, 0.05 * s, 0.25 * s, m['wood'], verts=5)
    sphere(x, y, 0.42 * s, 0.24 * s, m['leaf'], squash=1.1)


def cottage(x, y, m, rot=0.0, roof='thatch', scale=1.0, floors=1):
    w, d, h = 0.9 * scale, 0.6 * scale, 0.45 * scale * floors
    box(x, y, w, d, h, m['plaster'], rot=rot)
    gable(x, y, w, d, h, 0.38 * scale, m[roof], rot=rot)


def hut(x, y, m, s=1.0):
    cylinder(x, y, 0.38 * s, 0.32 * s, m['plaster'])
    cone(x, y, 0.5 * s, 0.45 * s, m['thatch'], z=0.32 * s)


def field(x, y, w, d, material, rot=0.0):
    box(x, y, w, d, 0.02, material, rot=rot)


def church(x, y, m, s=1.0):
    box(x, y, 1.4 * s, 0.7 * s, 0.7 * s, m['stone'])
    gable(x, y, 1.4 * s, 0.7 * s, 0.7 * s, 0.4 * s, m['slate'])
    box(x - 0.85 * s, y, 0.4 * s, 0.4 * s, 1.5 * s, m['stone'])
    cone(x - 0.85 * s, y, 0.3 * s, 0.7 * s, m['slate'], z=1.5 * s, verts=4)


def wall_ring(r, m, towers=6, height=0.6, gate=True):
    seg = 28
    for i in range(seg):
        a0, a1 = 2 * math.pi * i / seg, 2 * math.pi * (i + 1) / seg
        if gate and i == seg // 4 * 3:
            continue
        am = (a0 + a1) / 2
        length = 2 * r * math.sin(math.pi / seg) + 0.05
        box(r * math.cos(am), r * math.sin(am), length, 0.22, height, m['stone'], rot=am + math.pi / 2)
    for i in range(towers):
        a = 2 * math.pi * (i + 0.5) / towers
        cylinder(r * math.cos(a), r * math.sin(a), 0.28, height * 1.7, m['stone'], verts=8)
        cone(r * math.cos(a), r * math.sin(a), 0.34, 0.4, m['tile'], z=height * 1.7, verts=8)


# ---------- sprites ----------
def build_hamlet(m):
    plate(2.6)
    random.seed(1)
    for x, y in ((-0.6, 0.2), (0.5, 0.5), (0.1, -0.5)):
        hut(x, y, m)
    field(1.6, -0.6, 1.0, 0.7, m['field1'], rot=0.2)
    field(-1.5, -0.9, 0.9, 0.7, m['field2'], rot=-0.3)
    tree(-1.4, 1.0, 1.2, m)
    tree(1.3, 1.2, 1.0, m)


def build_village(m):
    plate(3.4)
    random.seed(2)
    spots = [(-1.2, 0.6), (-0.2, 1.1), (0.9, 0.7), (1.3, -0.4), (-1.3, -0.6), (0.2, -1.1), (-0.5, -0.2)]
    for x, y in spots:
        cottage(x, y, m, rot=random.uniform(-0.6, 0.6), roof=random.choice(['thatch', 'thatch', 'tile']))
    church(0.6, 0.0, m, s=0.8)
    cylinder(-0.4, 0.4, 0.15, 0.2, m['stone'])
    for i, (fx, fy) in enumerate(((2.4, 1.2), (2.5, -0.6), (-2.4, 0.9), (-2.4, -1.0), (0.4, -2.3), (-0.9, 2.3))):
        field(fx, fy, 1.1, 0.8, m[['field1', 'field2', 'field3'][i % 3]], rot=random.uniform(-0.4, 0.4))
    for x, y in ((2.2, 2.1), (-2.0, -2.1), (2.0, -2.0)):
        tree(x, y, 1.1, m)


def build_town(m):
    plate(4.2, color='#a6b06a')
    random.seed(3)
    wall_ring(3.0, m, towers=7)
    box(0.0, 0.3, 1.0, 1.0, 1.9, m['stone'])
    for k in range(4):
        a = math.pi / 2 * k + math.pi / 4
        cylinder(0.55 * math.cos(a), 0.3 + 0.55 * math.sin(a), 0.16, 2.3, m['stone'], verts=8)
    cone(0.0, 0.3, 0.5, 0.6, m['slate'], z=1.9, verts=4)
    box(0.0, 0.3, 0.05, 0.05, 0.5, m['wood'], z=2.5)
    box(0.18, 0.3, 0.3, 0.02, 0.18, m['flag'], z=2.82)
    for i in range(16):
        a = random.uniform(0, 2 * math.pi)
        r = random.uniform(1.15, 2.45)
        cottage(r * math.cos(a), 0.15 + r * math.sin(a), m, rot=a, roof=random.choice(['tile', 'tile', 'slate']), scale=0.7, floors=random.choice([1, 2]))
    for x, y in ((3.6, 1.8), (-3.6, -1.6), (3.3, -2.3)):
        tree(x, y, 1.1, m)


def build_city(m):
    plate(4.6, color='#a8a483', edge='#a99f7f')
    random.seed(4)
    for gx in range(-3, 4):
        for gy in range(-3, 4):
            x, y = gx * 1.05 + random.uniform(-0.1, 0.1), gy * 1.05 + random.uniform(-0.1, 0.1)
            if math.hypot(x, y) > 3.7 or (abs(x) < 0.9 and abs(y) < 0.9):
                continue
            floors = random.choice([1, 2, 2, 3, 3, 4])
            w, d = random.uniform(0.6, 0.85), random.uniform(0.55, 0.8)
            wall = random.choice(['plaster', 'brick', 'stone'])
            box(x, y, w, d, 0.35 * floors, m[wall])
            gable(x, y, w, d, 0.35 * floors, 0.22, m[random.choice(['tile', 'slate', 'slate'])])
    box(0.0, 0.0, 1.3, 1.0, 1.1, m['stone'])
    sphere(0.0, 0.0, 1.1, 0.55, m['gold'], squash=1.0)
    for x in (-0.6, 0.6):
        box(x, -0.55, 0.3, 0.3, 1.8, m['stone'])
        cone(x, -0.55, 0.22, 0.45, m['slate'], z=1.8, verts=4)
    for x, y in ((2.6, 2.2), (2.9, 1.5)):
        cylinder(x, y, 0.14, 2.6, m['brick'], verts=8)
        sphere(x - 0.15, y + 0.1, 2.9, 0.3, m['smoke'], squash=0.7)


def build_metropolis(m):
    plate(4.8, color='#8f9a8c', edge='#8f957f')
    random.seed(5)
    bpy.ops.mesh.primitive_torus_add(major_radius=3.9, minor_radius=0.12, location=(0, 0, 0.02))
    ring = bpy.context.object
    ring.scale.z = 0.15
    ring.data.materials.append(m['road'])
    field(-2.0, 2.2, 1.4, 1.0, m['park'], rot=0.3)
    for i in range(5):
        tree(-2.0 + random.uniform(-0.5, 0.5), 2.2 + random.uniform(-0.35, 0.35), 0.8, m)
    towers = []
    for gx in range(-3, 4):
        for gy in range(-3, 4):
            x, y = gx * 0.95 + random.uniform(-0.12, 0.12), gy * 0.95 + random.uniform(-0.12, 0.12)
            r = math.hypot(x, y)
            if r > 3.5 or (-2.7 < x < -1.3 and 1.6 < y < 2.8):
                continue
            h = max(0.6, (3.6 - r) * random.uniform(1.0, 2.3))
            w = random.uniform(0.5, 0.75)
            towers.append((x, y, w, h))
    for x, y, w, h in towers:
        material = m[random.choice(['glass', 'glass2', 'concrete', 'glass'])]
        box(x, y, w, w, h, material)
        if h > 3.5:
            box(x, y, w * 0.6, w * 0.6, 0.6, m['concrete'], z=h)
            cylinder(x, y, 0.03, 0.8, m['white'], z=h + 0.6, verts=4)


def build_fort(m):
    plate(3.4, color='#8fa65c')
    bpy.ops.mesh.primitive_cone_add(vertices=14, radius1=2.7, radius2=1.4, depth=1.2, location=(0, 0, 0.6))
    hill = bpy.context.object
    hill.data.materials.append(m['rock'])
    top = 1.2
    seg = 18
    for i in range(seg):
        a = 2 * math.pi * (i + 0.5) / seg
        box(1.25 * math.cos(a), 1.25 * math.sin(a), 0.48, 0.18, 0.5, m['stone'], z=top, rot=a + math.pi / 2)
    for i in range(4):
        a = math.pi / 2 * i + math.pi / 4
        cylinder(1.25 * math.cos(a), 1.25 * math.sin(a), 0.24, 0.9, m['stone'], z=top, verts=8)
        cone(1.25 * math.cos(a), 1.25 * math.sin(a), 0.3, 0.35, m['tile'], z=top + 0.9, verts=8)
    box(0.0, 0.1, 0.8, 0.8, 1.5, m['stone'], z=top)
    box(0.0, 0.1, 0.05, 0.05, 0.6, m['wood'], z=top + 1.5)
    box(0.2, 0.1, 0.36, 0.02, 0.22, m['flag'], z=top + 1.88)
    for x, y in ((-2.6, 1.6), (2.4, -1.9), (2.8, 1.0)):
        tree(x, y, 1.0, m)


def build_camp(m):
    plate(3.4, color='#b7ad6f', edge='#c2b27a')
    random.seed(6)
    for x, y in ((-1.0, 0.5), (0.2, 1.1), (1.1, 0.2), (-0.3, -0.6), (0.9, -1.1), (-1.5, -0.9)):
        cylinder(x, y, 0.42, 0.3, m['felt'], verts=14)
        cone(x, y, 0.46, 0.28, m['felt_top'], z=0.3, verts=14)
    for i in range(16):
        a = 2 * math.pi * i / 16
        box(2.0 + 0.9 * math.cos(a), 1.0 + 0.9 * math.sin(a), 0.06, 0.06, 0.25, m['wood'])
    for i in range(14):
        sphere(2.0 + random.uniform(-0.6, 0.6), 1.0 + random.uniform(-0.6, 0.6), 0.1, 0.12, m['sheep'], squash=0.8)
    for i in range(10):
        sphere(-2.0 + random.uniform(-0.8, 0.8), 1.6 + random.uniform(-0.5, 0.5), 0.1, 0.12, m['sheep'], squash=0.8)


def build_harbour(m):
    plate(4.2, color='#a6aa7a', edge='#b0a77a')
    random.seed(7)
    bpy.ops.mesh.primitive_circle_add(vertices=40, radius=2.3, fill_type='NGON', location=(0.6, -1.9, 0.03))
    sea = bpy.context.object
    sea.scale.y = 0.75
    sea.data.materials.append(m['water'])
    box(0.6, -1.2, 0.5, 2.4, 0.18, m['stone'])
    box(-0.9, -1.3, 2.0, 0.4, 0.16, m['stone'])
    box(1.6, -2.0, 0.45, 1.6, 0.4, m['hull'])
    gable(1.6, -2.0, 0.42, 1.4, 0.4, 0.15, m['wood'], rot=math.pi / 2)
    cylinder(1.6, -2.0, 0.03, 1.4, m['wood'], z=0.4, verts=4)
    box(1.6, -2.0, 0.02, 0.8, 0.6, m['sail'], z=0.8)
    for x in (-0.3, 0.9):
        box(x, -0.5, 0.12, 0.12, 1.6, m['steel'])
        box(x, -0.85, 0.08, 0.9, 0.08, m['steel'], z=1.55)
    for x, y in ((-1.6, 0.5), (-0.4, 0.8), (0.9, 0.9), (2.0, 0.6)):
        box(x, y, 0.9, 0.7, 0.55, m['brick'])
        gable(x, y, 0.9, 0.7, 0.55, 0.22, m['slate'])
    box(-2.3, -0.6, 0.6, 0.5, 0.45, m['white'])
    cylinder(-2.3, -0.6, 0.04, 0.6, m['white'], z=0.45, verts=6)
    cylinder(-1.9, -1.5, 0.2, 1.2, m['white'], verts=10)
    cone(-1.9, -1.5, 0.24, 0.3, m['flag'], z=1.2, verts=10)


BUILDERS = {'hamlet': build_hamlet, 'village': build_village, 'town': build_town, 'city': build_city,
            'metropolis': build_metropolis, 'fort': build_fort, 'camp': build_camp, 'harbour': build_harbour}


def setup():
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob, do_unlink=True)
    MATS.clear()
    for m in list(bpy.data.materials):
        bpy.data.materials.remove(m)
    scene = bpy.context.scene
    for engine in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
        try:
            scene.render.engine = engine
            break
        except TypeError:
            continue
    scene.render.resolution_x = scene.render.resolution_y = SIZE
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    if hasattr(scene.eevee, 'taa_render_samples'):
        scene.eevee.taa_render_samples = 64
    try:
        scene.view_settings.view_transform = 'AgX'
        scene.view_settings.look = 'AgX - Medium High Contrast'
    except TypeError:
        pass
    scene.view_settings.exposure = 0.15
    world = scene.world or bpy.data.worlds.new('World')
    scene.world = world
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs['Color'].default_value = hex_rgba('#b9cfe0')
    bg.inputs['Strength'].default_value = 0.6
    cam_data = bpy.data.cameras.new('Cam')
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = 10.4
    cam = bpy.data.objects.new('Cam', cam_data)
    tilt = math.pi / 2 - PITCH
    cam.location = (0, -30 * math.sin(tilt), 30 * math.cos(tilt) + 0.9)
    cam.rotation_euler = (tilt, 0, 0)
    scene.collection.objects.link(cam)
    scene.camera = cam
    sun_data = bpy.data.lights.new('Sun', 'SUN')
    sun_data.energy = 5.0
    sun_data.angle = math.radians(3)
    sun_data.color = (1.0, 0.96, 0.9)
    sun = bpy.data.objects.new('Sun', sun_data)
    sun.rotation_euler = (math.radians(62), 0, math.radians(-135))
    scene.collection.objects.link(sun)
    return scene


for name, build in BUILDERS.items():
    if ONLY and name not in ONLY:
        continue
    scene = setup()
    build(P())
    scene.render.filepath = os.path.join(OUT, f'{name}.png')
    bpy.ops.render.render(write_still=True)
    print(f'rendered sprite {name}')
