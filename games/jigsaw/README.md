# GameBox Jigsaw

Reusable canvas jigsaw engine used by the GameBox Jigsaw test game.

## Files

- `jigsaw-engine.js` — reusable puzzle engine.
- `game.js` — GameBox test-page configuration.
- `assets/test-christmas-scene.svg` — original temporary implementation artwork.

## Basic use

Create a canvas and load the engine, then:

```js
const puzzle = GameBoxJigsaw.create({
  canvas: document.querySelector('canvas'),
  image: 'my-image.png',
  rows: 6,
  columns: 6,
  guideOpacity: 0,
  snapTolerance: 0.24,
  snapDuration: 125,
  seed: 'my-puzzle',
  onProgress({ placed, total }) {},
  onComplete() {}
});
```

The engine generates paired jigsaw tabs/sockets at runtime, clips the supplied source image into pieces, keeps the original pointer grab offset while dragging, raises held pieces above the pile, snaps near-correct pieces into place, supports pointer/touch input, and fades the seams into the completed source image.

The test page also supports choosing another local image from the menu. That image stays on the device and is not uploaded anywhere.


## Changing difficulty

The engine can rebuild the current image at a different grid size without reloading the page:

```js
puzzle.setGrid(8, 8); // 64 pieces
```

The GameBox test UI exposes 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144 and 169-piece square grids. The default remains 36 pieces, and the default guide is Off.
