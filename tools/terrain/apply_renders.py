"""Turn Blender renders into game assets and write map positions into data/levels.json.

Usage: python3 -I tools/terrain/apply_renders.py <maps-dir> <sprites-dir> <repo-root>

- <maps-dir>/<view>.png  -> assets/maps/<view>.webp       (view ids are round ids, plus "epilogue")
- <sprites-dir>/<n>.png  -> assets/sprites/<n>.webp       (transparent, 256 px)
- <maps-dir>/projections.json -> each round's growth.map (image, widthKm, service-area ellipse) and
  every settlement's x, y in the 100 x 70 map frame used by the game.
"""
import json
import os
import sys

from PIL import Image

maps_dir, sprites_dir, root = sys.argv[1:4]
proj = json.load(open(os.path.join(maps_dir, 'projections.json')))
os.makedirs(os.path.join(root, 'assets', 'maps'), exist_ok=True)
os.makedirs(os.path.join(root, 'assets', 'sprites'), exist_ok=True)

for vid in proj:
    Image.open(os.path.join(maps_dir, f'{vid}.png')).convert('RGB').save(
        os.path.join(root, 'assets', 'maps', f'{vid}.webp'), 'WEBP', quality=80, method=6)
for name in sorted(n[:-4] for n in os.listdir(sprites_dir) if n.endswith('.png')):
    im = Image.open(os.path.join(sprites_dir, f'{name}.png')).convert('RGBA')
    im.resize((256, 256), Image.LANCZOS).save(os.path.join(root, 'assets', 'sprites', f'{name}.webp'), 'WEBP', quality=88, method=6)

data_path = os.path.join(root, 'data', 'levels.json')
data = json.load(open(data_path))


def apply(growth, vid):
    p = proj[vid]
    growth['map'] = {'image': f'assets/maps/{vid}.webp', 'widthKm': round(p['widthKm'], 1)}
    if 'area' in p:
        a = p['area']
        growth['map']['area'] = {'x': round(a['cx'] * 100, 2), 'y': round(a['cy'] * 70, 2),
                                 'rx': round(a['rx'] * 100, 2), 'ry': round(a['ry'] * 70, 2)}
    for s in growth['settlements']:
        q = p['settlements'][s['id']]
        s['x'], s['y'] = round(q['x'] * 100, 2), round(q['y'] * 70, 2)
    growth['map']['places'] = {sid: {'x': round(q['x'] * 100, 2), 'y': round(q['y'] * 70, 2)} for sid, q in p['settlements'].items()}


for level in data['levels']:
    for r in level['rounds']:
        apply(r['growth'], r['id'])
apply(data['epilogue'], 'epilogue')
budgets = {'level-1': 200000, 'level-2': 700000, 'level-3': 16000000}
for level in data['levels']:
    level['budget'] = budgets[level['id']]
json.dump(data, open(data_path, 'w'), indent=2, ensure_ascii=False)
open(data_path, 'a').write('\n')
sizes = {f: os.path.getsize(os.path.join(root, 'assets', 'maps', f)) for f in os.listdir(os.path.join(root, 'assets', 'maps'))}
print('maps:', {k: f'{v // 1024} KB' for k, v in sorted(sizes.items())})
print('sprites:', sorted(os.listdir(os.path.join(root, 'assets', 'sprites'))))
