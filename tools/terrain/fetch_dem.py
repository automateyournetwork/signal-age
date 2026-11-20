"""Download the real elevation tiles and river lines Signal Age's maps are built from.

Usage: python3 -I tools/terrain/fetch_dem.py tools/terrain/world.json <empty-download-dir>

Elevation: AWS Terrain Tiles, Terrarium PNG encoding (elevation_m = R*256 + G + B/256 - 32768).
Rivers: Natural Earth 10m river and lake centerlines (public domain).
Only standard-library modules are used; nothing downloaded is executed.
"""
import json
import math
import os
import sys
import urllib.request

TILE_URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
RIVERS_URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_rivers_lake_centerlines.geojson"


def tile_x(lon, z):
    return int(math.floor((lon + 180.0) / 360.0 * 2 ** z))


def tile_y(lat, z):
    r = math.radians(lat)
    return int(math.floor((1.0 - math.log(math.tan(r) + 1.0 / math.cos(r)) / math.pi) / 2.0 * 2 ** z))


def fetch(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return 0
    req = urllib.request.Request(url, headers={"User-Agent": "signal-age-terrain-build"})
    with urllib.request.urlopen(req, timeout=60) as r, open(path, "wb") as f:
        data = r.read()
        f.write(data)
    return len(data)


def main():
    world = json.load(open(sys.argv[1]))
    out = sys.argv[2]
    total = 0
    count = 0
    for name, d in world["dem"].items():
        z = d["zoom"]
        w, s, e, n = d["bbox"]
        xs = range(tile_x(w, z) - 1, tile_x(e, z) + 2)
        ys = range(tile_y(n, z) - 1, tile_y(s, z) + 2)
        folder = os.path.join(out, "tiles", str(z))
        os.makedirs(folder, exist_ok=True)
        for x in xs:
            for y in ys:
                total += fetch(TILE_URL.format(z=z, x=x, y=y), os.path.join(folder, f"{x}_{y}.png"))
                count += 1
        print(f"{name}: zoom {z}, x {xs.start}-{xs.stop - 1}, y {ys.start}-{ys.stop - 1}")
    os.makedirs(os.path.join(out, "rivers"), exist_ok=True)
    total += fetch(RIVERS_URL, os.path.join(out, "rivers", "ne_10m_rivers_lake_centerlines.geojson"))
    print(f"{count} tiles and 1 river file; {total / 1e6:.1f} MB downloaded")


if __name__ == "__main__":
    main()
