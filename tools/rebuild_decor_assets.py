"""Rebuild every decoration as a tightly cropped, genuine transparent asset.

Unlike the original sheet extraction, this removes stray neighbouring components.
Outputs both RGBA PNGs and lossless alpha WebP files.
"""
from pathlib import Path
from PIL import Image
import numpy as np
from scipy.ndimage import distance_transform_edt, label

folder = Path(__file__).resolve().parent.parent / "assets" / "decor"
files = sorted(folder.glob("*.webp"))
assert len(files) == 30, f"Expected all 30 decoration assets; found {len(files)}"
results = []
for file in files:
    source = Image.open(file).convert("RGBA")
    arr = np.array(source, dtype=np.uint8)
    H, W = arr.shape[:2]
    alpha = arr[:, :, 3].astype(np.float64)
    yy, xx = np.indices((H, W))
    stem = file.stem
    if stem == "lantern-black":
        cc, n = label(alpha > 24)
        areas = np.bincount(cc.ravel())
        areas[0] = 0
        alpha[cc != int(areas.argmax())] = 0
    if stem == "wreath-rustic-star":
        alpha *= np.minimum(np.clip((xx-9)/14, 0, 1), np.clip((W-7-xx)/12, 0, 1))
    if stem == "tree-skirt":
        # The original crop includes a foreign lantern on its right. Rebuild
        # the rounded textile edge using the other side of the same skirt.
        mid = 147
        for x in range(mid, min(W, mid * 2)):
            reflected = mid * 2 - 1 - x
            weight = np.clip((x - 221) / 30, 0, 1)
            if reflected >= 0:
                arr[:, x, :3] = np.uint8(np.round((1-weight)*arr[:, x, :3] + weight*arr[:, reflected, :3]))
                alpha[:, x] = (1-weight)*alpha[:, x] + weight*alpha[:, reflected]
        if W > mid * 2:
            alpha[:, mid * 2:] = 0
    if stem not in ("tree-skirt", "wreath-rustic-star"):
        cc, n = label(alpha > 35)
        areas = np.bincount(cc.ravel())
        areas[0] = 0
        biggest = int(areas.max()) if len(areas) > 1 else 0
        for component in range(1, n + 1):
            if areas[component] < max(14, biggest * 0.0045):
                alpha[cc == component] = 0
    rgb = arr[:, :, :3].astype(float)
    dist = distance_transform_edt(alpha > 10)
    neutral_white = (rgb.min(axis=2) > 213) & ((rgb.max(axis=2) - rgb.min(axis=2)) < 39)
    alpha[neutral_white & (dist < 3.0)] *= 0.16
    alpha *= np.clip((dist - .15) / 1.2, 0, 1)
    arr[:, :, 3] = np.uint8(np.clip(np.round(alpha), 0, 255))
    visible_y, visible_x = np.where(arr[:, :, 3] > 5)
    if not len(visible_x):
        raise RuntimeError(f"Incorrectly empty decoration: {stem}")
    pad = 3
    L, T = max(0, int(visible_x.min())-pad), max(0, int(visible_y.min())-pad)
    R, B = min(W, int(visible_x.max())+1+pad), min(H, int(visible_y.max())+1+pad)
    result = Image.fromarray(arr, "RGBA").crop((L, T, R, B))
    assert result.mode == "RGBA" and result.getchannel("A").getextrema()[0] == 0
    # PNG is an editable true-alpha master. WebP is the live, lossless rendition.
    result.save(file.with_suffix(".png"), format="PNG", optimize=True)
    result.save(file, format="WEBP", lossless=True, method=6, exact=True)
    results.append(f"{stem}: {W}x{H} => {result.width}x{result.height}")
print("\n".join(results))
