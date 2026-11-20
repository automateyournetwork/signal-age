"""Render Signal Age's map backgrounds from real elevation data (Blender 4.5, headless).

Usage:
  Blender -b --factory-startup -P tools/blender/render_maps.py -- <work-dir> <out-dir> [width] [view ...]

<work-dir> holds views.json and <view>.npy from tools/terrain/build_heightmaps.py.
For each view this builds the terrain mesh (1 Blender unit = 1 km, heights exaggerated per view),
colours it by height and slope, scatters low-poly forests, drapes the real rivers, lights it with a
low north-west sun and renders it with a tilted orthographic camera. It writes
<out-dir>/<view>.png and <out-dir>/projections.json: where each settlement and the service area land
on the image, as fractions of its width and height.
"""
import json
import math
import os
import sys

import bpy
import numpy as np
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
WORK, OUT = argv[0], argv[1]
RES_X = int(argv[2]) if len(argv) > 2 else 1600
ONLY = argv[3:]
META = json.load(open(os.path.join(WORK, 'views.json')))
PITCH = math.radians(META['cameraPitchDeg'])
ASPECT = META['aspect']
RES_Y = int(round(RES_X * ASPECT))
os.makedirs(OUT, exist_ok=True)


def hex_rgba(h, a=1.0):
    h = h.lstrip('#')
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]
    return (*lin, a)


def clear_scene():
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.node_groups, bpy.data.lights, bpy.data.cameras):
        for block in list(coll):
            if block.users == 0:
                coll.remove(block)
    for c in list(bpy.data.collections):
        bpy.data.collections.remove(c)


def setup_render(scene):
    for engine in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
        try:
            scene.render.engine = engine
            break
        except TypeError:
            continue
    scene.render.resolution_x, scene.render.resolution_y = RES_X, RES_Y
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGB'
    scene.render.film_transparent = False
    ee = scene.eevee
    for attr, value in (('taa_render_samples', 48), ('use_shadows', True), ('use_raytracing', False),
                        ('shadow_ray_count', 2), ('shadow_step_count', 8), ('fast_gi_method', 'GLOBAL_ILLUMINATION')):
        if hasattr(ee, attr):
            try:
                setattr(ee, attr, value)
            except (TypeError, AttributeError):
                pass
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
    bg.inputs['Strength'].default_value = 0.55


def grid_mesh(name, view, elev, exag):
    g = view['grid']
    nx, ny, cell = g['nx'], g['ny'], view['cellKm']
    xs = g['xMin'] + np.arange(nx) * cell
    ys = g['yMin'] + np.arange(ny) * cell
    gx, gy = np.meshgrid(xs, ys)
    land = elev > 0
    if elev.min() > -60 and (~land).any():
        # High-zoom tiles carry no sea depth; fake a gentle shelf so the sea is not flat paint.
        dist = np.zeros(elev.shape, dtype=np.float32)
        frontier = land.copy()
        for k in range(1, 90):
            grown = frontier | np.roll(frontier, 1, 0) | np.roll(frontier, -1, 0) | np.roll(frontier, 1, 1) | np.roll(frontier, -1, 1)
            dist[grown & ~frontier] = k
            frontier = grown
        dist[~frontier] = 90
        elev = np.where(land, elev, -dist * view['cellKm'] * 1000.0 * 0.12).astype(np.float32)
    gz = np.where(land, elev / 1000.0 * exag, 0.0)
    verts = np.column_stack([gx.ravel(), gy.ravel(), gz.ravel()]).astype(np.float32)
    idx = (np.arange(ny - 1)[:, None] * nx + np.arange(nx - 1)[None, :]).ravel()
    quads = np.stack([idx, idx + 1, idx + nx + 1, idx + nx], axis=-1).astype(np.int32)
    mesh = bpy.data.meshes.new(name)
    mesh.vertices.add(len(verts))
    mesh.vertices.foreach_set('co', verts.ravel())
    mesh.loops.add(quads.size)
    mesh.loops.foreach_set('vertex_index', quads.ravel())
    mesh.polygons.add(len(quads))
    mesh.polygons.foreach_set('loop_start', np.arange(0, quads.size, 4, dtype=np.int32))
    mesh.polygons.foreach_set('use_smooth', np.ones(len(quads), dtype=bool))
    mesh.update(calc_edges=True)

    # Per-vertex attributes for shading and forests.
    a = mesh.attributes.new('elev_m', 'FLOAT', 'POINT')
    a.data.foreach_set('value', elev.astype(np.float32).ravel())
    dzdy, dzdx = np.gradient(elev, cell * 1000.0)
    slope = np.hypot(dzdx, dzdy)                                        # real slope, metres per metre
    rng = np.random.default_rng(7)
    noise = rng.random((ny // 8 + 2, nx // 8 + 2))
    noise = np.kron(noise, np.ones((8, 8)))[:ny, :nx]
    for _ in range(3):                                                   # blur the blocky noise into patches
        noise = (noise + np.roll(noise, 3, 0) + np.roll(noise, -3, 0) + np.roll(noise, 3, 1) + np.roll(noise, -3, 1)) / 5
    band = np.clip((elev - 200) / 250, 0, 1) * np.clip((2100 - elev) / 400, 0, 1)
    steep = np.clip((slope - 0.07) / 0.18, 0, 1)                         # forests follow hillsides, farms take the flats
    lat0, lon0 = view['center']
    lon = lon0 + gx / (111.320 * math.cos(math.radians(lat0)))
    dry = np.clip((lon + 3.4) / 1.6, 0, 1)                               # the south-east (Almeria, Murcia) is arid
    forest = np.clip(band * (0.04 + 0.96 * steep) * np.clip((noise - 0.40) * 3.2, 0, 1) * (1 - 0.75 * dry), 0, 1)
    forest[~land] = 0
    f = mesh.attributes.new('forest', 'FLOAT', 'POINT')
    f.data.foreach_set('value', forest.astype(np.float32).ravel())
    s = mesh.attributes.new('slope', 'FLOAT', 'POINT')
    s.data.foreach_set('value', np.clip(slope, 0, 2).astype(np.float32).ravel())
    ob = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(ob)
    return ob, forest


def terrain_material(field_km):
    mat = bpy.data.materials.new('Terrain')
    mat.use_nodes = True
    nt = mat.node_tree
    nodes, links = nt.nodes, nt.links
    for n in list(nodes):
        nodes.remove(n)
    out = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    elev = nodes.new('ShaderNodeAttribute'); elev.attribute_name = 'elev_m'
    slope = nodes.new('ShaderNodeAttribute'); slope.attribute_name = 'slope'

    # Land: stylized hypsometric colours (lowland greens, ochre plateau, rock, snow).
    land_map = nodes.new('ShaderNodeMapRange')
    land_map.inputs['From Min'].default_value = 0.0
    land_map.inputs['From Max'].default_value = 3500.0
    links.new(elev.outputs['Fac'], land_map.inputs['Value'])
    land_ramp = nodes.new('ShaderNodeValToRGB')
    cr = land_ramp.color_ramp
    stops = [(0.0, '#dccb92'), (0.006, '#cfc088'), (0.012, '#86a656'), (0.05, '#7c9c4c'), (0.12, '#9ea35a'),
             (0.19, '#b8a766'), (0.28, '#b09a66'), (0.42, '#937c5a'), (0.60, '#8f8a82'), (0.75, '#b4b0aa'), (0.79, '#f3f3f0'), (1.0, '#ffffff')]
    cr.elements[0].position, cr.elements[0].color = stops[0][0], hex_rgba(stops[0][1])
    cr.elements[1].position, cr.elements[1].color = stops[-1][0], hex_rgba(stops[-1][1])
    for pos, col in stops[1:-1]:
        e = cr.elements.new(pos)
        e.color = hex_rgba(col)
    links.new(land_map.outputs['Result'], land_ramp.inputs['Fac'])

    # Steep slopes lean towards bare rock.
    rock_mix = nodes.new('ShaderNodeMix'); rock_mix.data_type = 'RGBA'
    slope_map = nodes.new('ShaderNodeMapRange')
    slope_map.inputs['From Min'].default_value = 0.18
    slope_map.inputs['From Max'].default_value = 0.6
    links.new(slope.outputs['Fac'], slope_map.inputs['Value'])
    links.new(slope_map.outputs['Result'], rock_mix.inputs['Factor'])
    links.new(land_ramp.outputs['Color'], rock_mix.inputs['A'])
    rock_mix.inputs['B'].default_value = hex_rgba('#857a6c')

    # Farmland patchwork on gentle lowland and plateau ground (Manhattan Voronoi gives field-like cells).
    fields = nodes.new('ShaderNodeTexVoronoi')
    fields.distance = 'MANHATTAN'
    fields.inputs['Scale'].default_value = 1.0 / field_km
    fields.inputs['Randomness'].default_value = 0.85
    tex0 = nodes.new('ShaderNodeTexCoord')
    links.new(tex0.outputs['Object'], fields.inputs['Vector'])
    field_pick = nodes.new('ShaderNodeSeparateColor')
    links.new(fields.outputs['Color'], field_pick.inputs['Color'])
    field_ramp = nodes.new('ShaderNodeValToRGB')
    fr = field_ramp.color_ramp
    fr.interpolation = 'CONSTANT'
    fr.elements[0].color = hex_rgba('#c9b46a')
    fr.elements[1].position = 0.8
    fr.elements[1].color = hex_rgba('#a88a5c')
    for pos, col in ((0.2, '#8fb35b'), (0.4, '#b8a75e'), (0.6, '#76964a')):
        e = fr.elements.new(pos)
        e.color = hex_rgba(col)
    links.new(field_pick.outputs['Red'], field_ramp.inputs['Fac'])
    flat = nodes.new('ShaderNodeMapRange')
    flat.inputs['From Min'].default_value = 0.075
    flat.inputs['From Max'].default_value = 0.025
    links.new(slope.outputs['Fac'], flat.inputs['Value'])
    low = nodes.new('ShaderNodeMapRange')
    low.inputs['From Min'].default_value = 1100.0
    low.inputs['From Max'].default_value = 850.0
    links.new(elev.outputs['Fac'], low.inputs['Value'])
    farm = nodes.new('ShaderNodeMath'); farm.operation = 'MULTIPLY'
    links.new(flat.outputs['Result'], farm.inputs[0])
    links.new(low.outputs['Result'], farm.inputs[1])
    farm_amt = nodes.new('ShaderNodeMath'); farm_amt.operation = 'MULTIPLY'
    farm_amt.inputs[1].default_value = 0.78
    links.new(farm.outputs['Value'], farm_amt.inputs[0])
    farmed = nodes.new('ShaderNodeMix'); farmed.data_type = 'RGBA'
    links.new(farm_amt.outputs['Value'], farmed.inputs['Factor'])
    links.new(rock_mix.outputs['Result'], farmed.inputs['A'])
    links.new(field_ramp.outputs['Color'], farmed.inputs['B'])

    # Fine colour variation so plains are not flat paint.
    tex = nodes.new('ShaderNodeTexCoord')
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 0.35
    noise.inputs['Detail'].default_value = 6.0
    links.new(tex.outputs['Object'], noise.inputs['Vector'])
    vary = nodes.new('ShaderNodeMix'); vary.data_type = 'RGBA'; vary.blend_type = 'OVERLAY'
    vary.inputs['Factor'].default_value = 0.22
    links.new(farmed.outputs['Result'], vary.inputs['A'])
    links.new(noise.outputs['Fac'], vary.inputs['B'])

    # Sea: shallow turquoise to deep blue by depth.
    sea_map = nodes.new('ShaderNodeMapRange')
    sea_map.inputs['From Min'].default_value = 0.0
    sea_map.inputs['From Max'].default_value = -1800.0
    links.new(elev.outputs['Fac'], sea_map.inputs['Value'])
    sea_ramp = nodes.new('ShaderNodeValToRGB')
    sr = sea_ramp.color_ramp
    sr.elements[0].color = hex_rgba('#4fb0c6')
    sr.elements[1].position = 1.0
    sr.elements[1].color = hex_rgba('#173f78')
    m1 = sr.elements.new(0.06); m1.color = hex_rgba('#3497bd')
    m2 = sr.elements.new(0.35); m2.color = hex_rgba('#22609a')
    links.new(sea_map.outputs['Result'], sea_ramp.inputs['Fac'])

    is_land = nodes.new('ShaderNodeMath'); is_land.operation = 'GREATER_THAN'
    is_land.inputs[1].default_value = 0.0
    links.new(elev.outputs['Fac'], is_land.inputs[0])
    final = nodes.new('ShaderNodeMix'); final.data_type = 'RGBA'
    links.new(is_land.outputs['Value'], final.inputs['Factor'])
    links.new(sea_ramp.outputs['Color'], final.inputs['A'])
    links.new(vary.outputs['Result'], final.inputs['B'])
    links.new(final.outputs['Result'], bsdf.inputs['Base Color'])

    rough = nodes.new('ShaderNodeMix'); rough.data_type = 'FLOAT'
    rough.inputs['A'].default_value = 0.22
    rough.inputs['B'].default_value = 0.92
    links.new(is_land.outputs['Value'], rough.inputs['Factor'])
    links.new(rough.outputs['Result'], bsdf.inputs['Roughness'])

    # Small waves on the sea only.
    wave = nodes.new('ShaderNodeTexNoise')
    wave.inputs['Scale'].default_value = 6.0
    links.new(tex.outputs['Object'], wave.inputs['Vector'])
    bump = nodes.new('ShaderNodeBump')
    sea_only = nodes.new('ShaderNodeMath'); sea_only.operation = 'SUBTRACT'
    sea_only.inputs[0].default_value = 1.0
    links.new(is_land.outputs['Value'], sea_only.inputs[1])
    strength = nodes.new('ShaderNodeMath'); strength.operation = 'MULTIPLY'
    strength.inputs[1].default_value = 0.08
    links.new(sea_only.outputs['Value'], strength.inputs[0])
    links.new(strength.outputs['Value'], bump.inputs['Strength'])
    links.new(wave.outputs['Fac'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return mat


def flat_material(name, hex_color, roughness=0.8, emission=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    b = mat.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = hex_rgba(hex_color)
    b.inputs['Roughness'].default_value = roughness
    if emission:
        b.inputs['Emission Color'].default_value = hex_rgba(hex_color)
        b.inputs['Emission Strength'].default_value = emission
    return mat


def tree_collection(height_km):
    coll = bpy.data.collections.new('Trees')
    bpy.context.scene.collection.children.link(coll)
    leaf = bpy.data.materials.new('Leaves')
    leaf.use_nodes = True
    nt = leaf.node_tree
    info = nt.nodes.new('ShaderNodeObjectInfo')
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = hex_rgba('#2f5a2a')
    ramp.color_ramp.elements[1].color = hex_rgba('#5d8a3a')
    nt.links.new(info.outputs['Random'], ramp.inputs['Fac'])
    b = nt.nodes['Principled BSDF']
    nt.links.new(ramp.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.85
    trunk = flat_material('Trunk', '#5a4330')
    h = height_km
    shapes = []
    # Conifer: two stacked cones on a trunk.
    bpy.ops.mesh.primitive_cone_add(vertices=7, radius1=0.30 * h, depth=0.62 * h, location=(0, 0, 0.55 * h))
    c1 = bpy.context.object
    bpy.ops.mesh.primitive_cone_add(vertices=7, radius1=0.22 * h, depth=0.45 * h, location=(0, 0, 0.82 * h))
    c2 = bpy.context.object
    bpy.ops.mesh.primitive_cylinder_add(vertices=5, radius=0.05 * h, depth=0.3 * h, location=(0, 0, 0.15 * h))
    t = bpy.context.object
    for o in (c1, c2):
        o.data.materials.append(leaf)
    t.data.materials.append(trunk)
    bpy.ops.object.select_all(action='DESELECT')
    for o in (c1, c2, t):
        o.select_set(True)
    bpy.context.view_layer.objects.active = c1
    bpy.ops.object.join()
    shapes.append(bpy.context.object)
    # Broadleaf: a rounded crown on a trunk.
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.32 * h, location=(0, 0, 0.62 * h))
    crown = bpy.context.object
    crown.scale.z = 0.85
    bpy.ops.mesh.primitive_cylinder_add(vertices=5, radius=0.06 * h, depth=0.4 * h, location=(0, 0, 0.2 * h))
    t2 = bpy.context.object
    crown.data.materials.append(leaf)
    t2.data.materials.append(trunk)
    bpy.ops.object.select_all(action='DESELECT')
    crown.select_set(True)
    t2.select_set(True)
    bpy.context.view_layer.objects.active = crown
    bpy.ops.object.join()
    shapes.append(bpy.context.object)
    for o in shapes:
        for c in list(o.users_collection):
            c.objects.unlink(o)
        coll.objects.link(o)
        o.hide_render = False
    coll.hide_render = True        # the source shapes are only instanced, never rendered directly
    return coll


def forest_modifier(terrain, coll, density):
    ng = bpy.data.node_groups.new('Forests', 'GeometryNodeTree')
    ng.interface.new_socket(name='Geometry', in_out='INPUT', socket_type='NodeSocketGeometry')
    ng.interface.new_socket(name='Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
    n, l = ng.nodes, ng.links
    gin, gout = n.new('NodeGroupInput'), n.new('NodeGroupOutput')
    attr = n.new('GeometryNodeInputNamedAttribute'); attr.data_type = 'FLOAT'
    attr.inputs['Name'].default_value = 'forest'
    mul = n.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = density
    l.new(attr.outputs['Attribute'], mul.inputs[0])
    dist = n.new('GeometryNodeDistributePointsOnFaces'); dist.distribute_method = 'RANDOM'
    l.new(gin.outputs['Geometry'], dist.inputs['Mesh'])
    l.new(mul.outputs['Value'], dist.inputs['Density'])
    dist.inputs['Seed'].default_value = 11
    ci = n.new('GeometryNodeCollectionInfo')
    ci.inputs['Collection'].default_value = coll
    ci.inputs['Separate Children'].default_value = True
    ci.inputs['Reset Children'].default_value = True
    inst = n.new('GeometryNodeInstanceOnPoints')
    inst.inputs['Pick Instance'].default_value = True
    l.new(dist.outputs['Points'], inst.inputs['Points'])
    l.new(ci.outputs['Instances'], inst.inputs['Instance'])
    rz = n.new('FunctionNodeRandomValue'); rz.data_type = 'FLOAT'
    rz.inputs['Max'].default_value = 6.283
    comb = n.new('ShaderNodeCombineXYZ')
    l.new(rz.outputs['Value'], comb.inputs['Z'])
    l.new(comb.outputs['Vector'], inst.inputs['Rotation'])
    rs = n.new('FunctionNodeRandomValue'); rs.data_type = 'FLOAT'
    rs.inputs['Min'].default_value = 0.65
    rs.inputs['Max'].default_value = 1.35
    rs.inputs['Seed'].default_value = 3
    l.new(rs.outputs['Value'], inst.inputs['Scale'])
    pick = n.new('FunctionNodeRandomValue'); pick.data_type = 'INT'
    pick.inputs['Min'].default_value = 0
    pick.inputs['Max'].default_value = 1
    pick.inputs['Seed'].default_value = 5
    l.new(pick.outputs['Value'], inst.inputs['Instance Index'])
    join = n.new('GeometryNodeJoinGeometry')
    l.new(gin.outputs['Geometry'], join.inputs['Geometry'])
    l.new(inst.outputs['Instances'], join.inputs['Geometry'])
    l.new(join.outputs['Geometry'], gout.inputs['Geometry'])
    mod = terrain.modifiers.new('Forests', 'NODES')
    mod.node_group = ng


def sample_height(view, elev, x, y):
    g = view['grid']
    cell = view['cellKm']
    fx = (x - g['xMin']) / cell
    fy = (y - g['yMin']) / cell
    i0, j0 = int(math.floor(fx)), int(math.floor(fy))
    i0 = max(0, min(g['nx'] - 2, i0))
    j0 = max(0, min(g['ny'] - 2, j0))
    tx, ty = fx - i0, fy - j0
    e = (elev[j0, i0] * (1 - tx) * (1 - ty) + elev[j0, i0 + 1] * tx * (1 - ty) +
         elev[j0 + 1, i0] * (1 - tx) * ty + elev[j0 + 1, i0 + 1] * tx * ty)
    return float(e)


def add_rivers(view, elev, exag, width_km):
    mat = flat_material('River', '#3f93cf', roughness=0.25, emission=0.15)
    step = view['cellKm'] * 1.5
    count = 0
    for r in view['rivers']:
        pts = r['points']
        dense = []
        for (x0, y0), (x1, y1) in zip(pts[:-1], pts[1:]):
            n = max(1, int(math.hypot(x1 - x0, y1 - y0) / step))
            for k in range(n):
                dense.append((x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n))
        dense.append(tuple(pts[-1]))
        coords = []
        for x, y in dense:
            e = sample_height(view, elev, x, y)
            if e <= 0:                               # the river has reached the sea
                if len(coords) > 1:
                    break
                continue
            coords.append((x, y, e / 1000.0 * exag + width_km * 0.6))
        if len(coords) < 2:
            continue
        cu = bpy.data.curves.new(f'river{count}', 'CURVE')
        cu.dimensions = '3D'
        cu.bevel_depth = width_km * (1.25 if r['rank'] <= 4 else 0.85)
        cu.bevel_resolution = 1
        sp = cu.splines.new('POLY')
        sp.points.add(len(coords) - 1)
        for p, c in zip(sp.points, coords):
            p.co = (*c, 1.0)
        ob = bpy.data.objects.new(f'river{count}', cu)
        ob.data.materials.append(mat)
        bpy.context.scene.collection.objects.link(ob)
        count += 1
    return count


def camera_and_sun(width_km):
    cam_data = bpy.data.cameras.new('MapCamera')
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = width_km
    cam_data.clip_start = 0.1
    cam_data.clip_end = width_km * 10
    cam = bpy.data.objects.new('MapCamera', cam_data)
    tilt = math.pi / 2 - PITCH                      # 0 = straight down
    dist = width_km * 3
    cam.location = (0.0, -dist * math.sin(tilt), dist * math.cos(tilt))
    cam.rotation_euler = (tilt, 0.0, 0.0)
    bpy.context.scene.collection.objects.link(cam)
    bpy.context.scene.camera = cam
    sun_data = bpy.data.lights.new('Sun', 'SUN')
    sun_data.energy = 5.0
    sun_data.angle = math.radians(2.0)
    sun_data.color = (1.0, 0.96, 0.9)
    sun = bpy.data.objects.new('Sun', sun_data)
    sun.rotation_euler = (math.radians(62), 0.0, math.radians(-135))   # low sun from the north-west
    bpy.context.scene.collection.objects.link(sun)
    return cam


def project(scene, cam, x, y, z):
    v = world_to_camera_view(scene, cam, Vector((x, y, z)))
    return {'x': round(v.x, 5), 'y': round(1.0 - v.y, 5)}


def render_view(vid, view):
    clear_scene()
    scene = bpy.context.scene
    setup_render(scene)
    exag = view['exaggeration']
    width = view['widthKm']
    elev = np.load(os.path.join(WORK, f'{vid}.npy'))
    terrain, forest = grid_mesh('Terrain', view, elev, exag)
    terrain.data.materials.append(terrain_material(width / 95.0))

    px_km = width / RES_X
    tree_h = px_km * 9.0
    coll = tree_collection(tree_h)
    land_area = float(forest.sum()) * view['cellKm'] ** 2
    target_trees = 55000 if width < 100 else 42000
    density = target_trees / max(land_area, 1e-6)
    forest_modifier(terrain, coll, density)
    rivers = add_rivers(view, elev, exag, px_km * 1.6)
    cam = camera_and_sun(width)

    proj = {'widthKm': width, 'depthKm': view['depthKm'], 'kmPerImageWidth': width, 'settlements': {}}
    for sid, s in view['settlements'].items():
        z = max(sample_height(view, elev, s['x'], s['y']), 0) / 1000.0 * exag
        p = project(scene, cam, s['x'], s['y'], z)
        p['inFrame'] = 0 <= p['x'] <= 1 and 0 <= p['y'] <= 1
        proj['settlements'][sid] = p
    if view['area']:
        a = view['area']
        z = max(sample_height(view, elev, a['x'], a['y']), 0) / 1000.0 * exag
        c = project(scene, cam, a['x'], a['y'], z)
        e = project(scene, cam, a['x'] + a['radiusKm'], a['y'], z)
        n = project(scene, cam, a['x'], a['y'] + a['radiusKm'], z)
        proj['area'] = {'settlement': a['settlement'], 'cx': c['x'], 'cy': c['y'],
                        'rx': round(abs(e['x'] - c['x']), 5), 'ry': round(abs(n['y'] - c['y']), 5), 'radiusKm': a['radiusKm']}
    scene.render.filepath = os.path.join(OUT, f'{vid}.png')
    bpy.ops.render.render(write_still=True)
    print(f'rendered {vid}: {rivers} rivers, ~{target_trees} trees, tree height {tree_h:.3f} km')
    return proj


def main():
    projections_path = os.path.join(OUT, 'projections.json')
    projections = json.load(open(projections_path)) if os.path.exists(projections_path) else {}
    for vid, view in META['views'].items():
        if ONLY and vid not in ONLY:
            continue
        projections[vid] = render_view(vid, view)
        json.dump(projections, open(projections_path, 'w'), indent=1)


main()
