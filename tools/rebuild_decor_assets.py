"""Clean white alpha-matte halos from the existing Advent decoration artwork."""
from pathlib import Path
from PIL import Image
from scipy.ndimage import distance_transform_edt
import numpy as np
folder = Path(__file__).resolve().parent.parent / "assets" / "decor"
files = sorted(folder.glob("*.webp"))
assert len(files) == 30, f"Expected 30 decoration assets, got {len(files)}"
for path in files:
    rgba = np.asarray(Image.open(path).convert("RGBA")).astype(np.float32)
    rgb, alpha = rgba[:, :, :3], rgba[:, :, 3]
    dist = distance_transform_edt(alpha > 14)
    fringe = (np.min(rgb, axis=2) > 160) & ((np.max(rgb, axis=2) - np.min(rgb, axis=2)) < 94) & (dist < 7.5)
    alpha[fringe] *= 0.014
    alpha *= np.clip((dist - 0.4) / 1.65, 0, 1)
    rgba[:, :, 3] = np.clip(alpha, 0, 255)
    image = Image.fromarray(rgba.astype(np.uint8), "RGBA")
    assert image.mode == "RGBA" and image.getchannel("A").getextrema()[0] == 0
    image.save(path, format="WEBP", lossless=True, method=6)
    image.save(path.with_suffix(".png"), format="PNG")
print(f"Rebuilt and alpha-verified {len(files)} decoration PNGs and lossless WebP files")
