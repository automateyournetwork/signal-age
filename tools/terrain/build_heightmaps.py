"""Turn the downloaded elevation tiles and river lines into one heightmap per game view.

Usage: python3 -I tools/terrain/build_heightmaps.py tools/terrain/world.json <download-dir> <work-dir>

For each view in world.json this writes <work-dir>/<view>.npy (float32 elevation in metres on a
regular kilometre grid around the view centre) and adds the view's geometry to
<work-dir>/views.json: grid size, cell size, settlement positions in km, the service-area circle
and the river polylines clipped to the view. The camera is tilted, so each grid covers more ground
than the framed rectangle.
"""
import json
import math
import os
import sys

import numpy as np
from PIL import Image

KM_PER_DEG_LAT = 110.574
CAMERA_PITCH_DEG = 60.0          # camera elevation above the horizon (Blender uses the same value)
GRID_COLUMNS = 1150              # vertices across the framed width
MARGIN_X = 0.06                  # extra ground left and right of the frame
MARGIN_NEAR = 0.15               # extra ground in front of the frame (high ground there rises into view)
MARGIN_FAR = 0.06                # a little ground behind the frame (raised ground there moves out of view)


def km_per_deg_lon(lat):
    return 111.320 * math.cos(math.radians(lat))


def merc_px(lat, lon, z):
    """Global Web Mercator pixel coordinates at zoom z (256 px tiles)."""
    n = 256 * 2 ** z
    x = (lon + 180.0) / 360.0 * n
    r = math.radians(lat)
    y = (1.0 - math.log(math.tan(r) + 1.0 / math.cos(r)) / math.pi) / 2.0 * n
    return x, y


class Mosaic:
    """Terrarium tiles for one zoom level stitched into one elevation array."""

    def __init__(self, folder, z):
        names = [n for n in os.listdir(folder) if n.endswith('.png')]
        xs = sorted({int(n.split('_')[0]) for n in names})
        ys = sorted({int(n.split('_')[1].split('.')[0]) for n in names})
        self.z, self.x0, self.y0 = z, xs[0], ys[0]
        self.elev = np.full((len(ys) * 256, len(xs) * 256), np.nan, dtype=np.float32)
        for n in names:
            tx = int(n.split('_')[0])
            ty = int(n.split('_')[1].split('.')[0])
            rgb = np.asarray(Image.open(os.path.join(folder, n)).convert('RGB'), dtype=np.float32)
            e = rgb[:, :, 0] * 256.0 + rgb[:, :, 1] + rgb[:, :, 2] / 256.0 - 32768.0
            r0, c0 = (ty - self.y0) * 256, (tx - self.x0) * 256
            self.elev[r0:r0 + 256, c0:c0 + 256] = e
        if np.isnan(self.elev).any():
            raise SystemExit(f'zoom {z}: missing tiles in the mosaic')

    def sample(self, lat, lon):
        """Bilinear elevation (metres) at arrays of lat/lon."""
        n = 256 * 2 ** self.z
        px = (lon + 180.0) / 360.0 * n - self.x0 * 256 - 0.5
        r = np.radians(lat)
        py = (1.0 - np.log(np.tan(r) + 1.0 / np.cos(r)) / np.pi) / 2.0 * n - self.y0 * 256 - 0.5
        h, w = self.elev.shape
        if px.min() < 0 or py.min() < 0 or px.max() > w - 2 or py.max() > h - 2:
            raise SystemExit(f'zoom {self.z}: view extends beyond the downloaded tiles')
        x0 = np.floor(px).astype(np.int64)
        y0 = np.floor(py).astype(np.int64)
        fx = (px - x0).astype(np.float32)
        fy = (py - y0).astype(np.float32)
        e = self.elev
        top = e[y0, x0] * (1 - fx) + e[y0, x0 + 1] * fx
        bot = e[y0 + 1, x0] * (1 - fx) + e[y0 + 1, x0 + 1] * fx
        return top * (1 - fy) + bot * fy


def clip_polyline(points, xmin, xmax, ymin, ymax):
    """Split a polyline into the runs of points inside a rectangle (with one point of overlap)."""
    runs, run = [], []
    for p in points:
        inside = xmin <= p[0] <= xmax and ymin <= p[1] <= ymax
        if inside:
            run.append(p)
        else:
            if run:
                run.append(p)
                runs.append(run)
            run = []
    if len(run) > 1:
        runs.append(run)
    return [r for r in runs if len(r) > 1]


def main():
    world_path, downloads, work = sys.argv[1:4]
    world = json.load(open(world_path))
    os.makedirs(work, exist_ok=True)
    mosaics = {}
    for name, d in world['dem'].items():
        mosaics[name] = Mosaic(os.path.join(downloads, 'tiles', str(d['zoom'])), d['zoom'])
        print(f'mosaic {name}: zoom {d["zoom"]}, {mosaics[name].elev.shape[1]} x {mosaics[name].elev.shape[0]} px')

    rivers_geo = json.load(open(os.path.join(downloads, 'rivers', 'ne_10m_rivers_lake_centerlines.geojson')))
    w, s, e, n = world['dem']['regional']['bbox']
    rivers = []
    for f in rivers_geo['features']:
        g = f.get('geometry') or {}
        lines = g.get('coordinates', [])
        if g.get('type') == 'LineString':
            lines = [lines]
        elif g.get('type') != 'MultiLineString':
            continue
        for line in lines:
            if any(w <= p[0] <= e and s <= p[1] <= n for p in line):
                rivers.append({'name': f['properties'].get('name') or '', 'rank': f['properties'].get('scalerank', 9), 'coords': line})
    print(f'rivers in the region: {len(rivers)} lines: ' + ', '.join(sorted({r["name"] for r in rivers if r["name"]})))

    aspect = world['aspect'][1] / world['aspect'][0]
    sin_p = math.sin(math.radians(CAMERA_PITCH_DEG))
    out = {'cameraPitchDeg': CAMERA_PITCH_DEG, 'aspect': aspect, 'views': {}}
    for vid, v in world['views'].items():
        lat0, lon0 = v['center']
        kx, ky = km_per_deg_lon(lat0), KM_PER_DEG_LAT
        width = float(v['widthKm'])
        depth = width * aspect / sin_p                      # ground depth seen by the tilted camera
        cell = width / GRID_COLUMNS
        x_min, x_max = -width / 2 * (1 + 2 * MARGIN_X), width / 2 * (1 + 2 * MARGIN_X)
        y_min, y_max = -depth / 2 - depth * MARGIN_NEAR, depth / 2 + depth * MARGIN_FAR
        nx = int(round((x_max - x_min) / cell)) + 1
        ny = int(round((y_max - y_min) / cell)) + 1
        xs = x_min + np.arange(nx) * cell
        ys = y_min + np.arange(ny) * cell
        gx, gy = np.meshgrid(xs, ys)
        lat = lat0 + gy / ky
        lon = lon0 + gx / kx
        elev = mosaics[v['dem']].sample(lat, lon).astype(np.float32)
        np.save(os.path.join(work, f'{vid}.npy'), elev)

        settlements = {}
        for sid, p in world['settlements'].items():
            sx, sy = (p['lon'] - lon0) * kx, (p['lat'] - lat0) * ky
            settlements[sid] = {'x': round(sx, 4), 'y': round(sy, 4), 'inFrame': abs(sx) <= width / 2 and abs(sy) <= depth / 2}
        area = None
        if 'area' in v:
            a = world['settlements'][v['area']['settlement']]
            area = {'settlement': v['area']['settlement'], 'radiusKm': math.sqrt(v['area']['areaKm2'] / math.pi),
                    'x': (a['lon'] - lon0) * kx, 'y': (a['lat'] - lat0) * ky}
        view_rivers = []
        for r in rivers:
            pts = [((p[0] - lon0) * kx, (p[1] - lat0) * ky) for p in r['coords']]
            for run in clip_polyline(pts, x_min, x_max, y_min, y_max):
                view_rivers.append({'name': r['name'], 'rank': r['rank'], 'points': [[round(a, 3), round(b, 3)] for a, b in run]})
        out['views'][vid] = {
            'dem': v['dem'], 'center': v['center'], 'widthKm': width, 'depthKm': depth, 'cellKm': cell,
            'exaggeration': v['exaggeration'], 'grid': {'nx': nx, 'ny': ny, 'xMin': x_min, 'yMin': y_min},
            'elevationRangeM': [float(np.nanmin(elev)), float(np.nanmax(elev))],
            'settlements': settlements, 'area': area, 'rivers': view_rivers,
        }
        print(f'{vid}: {nx} x {ny} grid, cell {cell * 1000:.0f} m, elevation {elev.min():.0f}..{elev.max():.0f} m, '
              f'{len(view_rivers)} river runs, in frame: {[k for k, s in settlements.items() if s["inFrame"]]}')
    json.dump(out, open(os.path.join(work, 'views.json'), 'w'))


if __name__ == '__main__':
    main()
