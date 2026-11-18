#!/usr/bin/env python3
"""Copy the *pinned* 21-game GameBox Advent collection into Workshop only.

Run in CI after a GitHub checkout of GameBox at the SHA recorded in
workshop-games/catalog.json. Does not edit Elflympics' official games, app,
database, scoring or production files.
"""
import json
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / ".source-gamebox"
DEST = ROOT / "workshop-games"
CATALOG = json.loads((DEST / "catalog.json").read_text(encoding="utf-8"))
GAMES = CATALOG["games"]
assert len(GAMES) == 21 and len(set(g["id"] for g in GAMES)) == 21, "Expected 21 unique games"
assert CATALOG["approved_for_live"] is False
assert CATALOG["official_events_published"] is False
assert SOURCE.is_dir(), "Pinned GameBox checkout missing"
actual = subprocess.check_output(["git", "-C", str(SOURCE), "rev-parse", "HEAD"], text=True).strip()
assert actual == CATALOG["source_commit"], (actual, CATALOG["source_commit"])

def copy_dir(relative):
    src = SOURCE / relative
    target = DEST / relative
    assert src.is_dir(), f"Original GameBox folder missing: {relative}"
    if target.exists():
        shutil.rmtree(target)
    shutil.copytree(src, target)
    return target

for game in GAMES:
    game_dir = copy_dir(game["id"])
    assert (game_dir / "index.html").is_file(), f"Missing playable page: {game['id']}"

# GameBox's relative ../assets, ../shared and ../hub links remain valid because
# its original directory layout is preserved inside workshop-games/.
copy_dir("assets")
copy_dir("hub")
src_shared = SOURCE / "shared"
dst_shared = DEST / "shared"
if dst_shared.exists():
    shutil.rmtree(dst_shared)
shutil.copytree(src_shared, dst_shared, ignore=lambda folder, names: {"quaternius"} if Path(folder).name == "asset-pool" else set())

# Only the three genuine 3D assets used by the Advent runner are copied, rather
# than the entire 128MB GameBox asset catalogue.
needed_ids = {
    "quaternius:ultimate-animated-character:Elf",
    "quaternius:ultimate-nature:PineTree_Snow_2",
    "quaternius:ultimate-nature:PineTree_Snow_4",
}
pool_src = src_shared / "asset-pool"
pool_dst = dst_shared / "asset-pool"
manifest = json.loads((pool_src / "manifest.json").read_text(encoding="utf-8"))
models = [a for a in manifest["assets"] if a["id"] in needed_ids]
assert len(models) == 3, "Cannot locate all original GameBox Advent models"
for a in models:
    rel = Path(a["path"])
    src = pool_src / rel
    dst = pool_dst / rel
    assert src.is_file(), f"Original 3D asset missing: {src}"
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
manifest["assets"] = models
manifest["totalAssets"] = len(models)
manifest["expectedTotalAssets"] = len(models)
manifest["complete"] = True
(pool_dst / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

(DEST / "IMPORT_SOURCE.txt").write_text(
    f"Exact GameBox commit: {actual}\n"
    f"Games imported: {len(GAMES)}\n"
    "All games are unapproved Workshop QA copies, not official events.\n",
    encoding="utf-8",
)
# Explicitly forbid importing GameBox's standalone (non-Advent) catalogue.
allow = {g["id"] for g in GAMES} | {"assets", "shared", "hub"}
for child in DEST.iterdir():
    if child.is_dir() and child.name not in allow:
        raise AssertionError(f"Unexpected non-Advent directory in Workshop import: {child.name}")
print(f"Verified {len(GAMES)} pinned GameBox Advent games in {DEST.relative_to(ROOT)}")
