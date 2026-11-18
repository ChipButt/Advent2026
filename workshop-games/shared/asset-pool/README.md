# GameBox Shared Asset Pool

This directory is the reusable 3D asset pool for every GameBox game.

## Approved Quaternius packs

The pool contains the complete runtime asset set from these approved CC0 packs:

| Pack | Assets | Runtime format |
| --- | ---: | --- |
| Ultimate Animated Character Pack | 52 | glTF |
| Ultimate Nature Pack | 150 | FBX |
| Nature Crops Pack | 102 | FBX |
| Ultimate Food Pack | 103 | FBX |
| Ultimate House Interior Pack | 123 | FBX |
| Ultimate Animated Animals | 12 | glTF |
| Easy Animated Enemy Pack | 6 | FBX |
| **Total** | **548** | |

Files keep their original Quaternius filenames. No AI replacements, marketplace donors or non-Quaternius substitutions are used.

The character and animal packs use the authored glTF files so their embedded rigs and animations remain available. The static environment/prop packs use the authored FBX files. The enemy pack uses its authored FBX files so its animations are retained.

## Structure

- `manifest.json` — generated inventory of assets currently committed to the pool.
- `gamebox-asset-pool.js` — shared lookup/filter/load helpers.
- `quaternius/<pack-id>/` — original runtime model files.
- `../../tools/quaternius-import-sources.json` — pinned official source-file inventory.
- `../../tools/import-quaternius-assets.py` — importer used by GitHub Actions.

## Use from a GameBox game

Import the helpers:

```js
import {
  listAssets,
  loadThreeAsset
} from '../shared/asset-pool/gamebox-asset-pool.js';
```

Find assets:

```js
const trees = await listAssets({
  pack: 'ultimate-nature',
  search: 'tree'
});
```

Load with the same Three.js loader classes already used by the game:

```js
const fox = await loadThreeAsset(
  'quaternius:ultimate-animated-animals:Fox',
  { GLTFLoader }
);

scene.add(fox.object);
console.log(fox.animations);
```

FBX assets work the same way:

```js
const chair = await loadThreeAsset(
  'quaternius:ultimate-house-interior:Chair',
  { FBXLoader }
);
```

Passing the game's existing loader classes avoids creating a second Three.js runtime and keeps the shared pool low-overhead.

## Licence

Quaternius publishes these packs under CC0. The original official source links for every imported file are retained in the source inventory and generated manifest.
