# Santa's Arrow Escape

A standalone, mobile-first Christmas logic puzzle for GameBox, inspired by the **rules** (not the artwork or source code) of Oakever's Amaz(e) GO! / Arrows GO! game.

## Play

Open `santas-arrow-escape/` from GameBox or load the folder's `index.html` over HTTP/HTTPS.

- Tap any section of a winding arrow to try to send it off the board.
- Its arrowhead must have a clear straight route to the board's edge.
- A blocked tap costs one of three hearts; three wrong taps end the attempt.
- Clear every arrow to finish the level, earn up to three stars and unlock the next level.
- One hint per level shows a currently safe arrow.
- The level picker, restart, pause, sound control and local saved progression are included.
- Keyboard: Tab to board, arrow keys to select a path, Enter/Space to attempt; H for hint, R for restart, Escape for menu.
- 40 deterministic levels grouped into seasonal chapters. Five seeded candidates are evaluated for each level to favour tightly packed arrows and a high proportion of initially blocked paths. Level one now has 19 arrows, ~85% coverage and only five initially open exits (formerly 12 arrows, ~46% coverage).

All levels are constructed in **reverse-solvable order**; with each added path initially able to escape, there is always a valid next move in the final puzzle. A portable seeded shuffle keeps the same level geometry across Chrome and Node. Each level remains solvable, and increasingly crowded layouts demand that you identify which arrows free other arrows rather than simply tapping any visible exit.

## Artwork

All shipped artwork is local to GameBox; no external image URLs or copied store screenshots:

- Snow-laden trees: `../assets/gamebox/kenney/2d/Background Elements Remastered/treePineSnow.png`
- Christmas tree: `../assets/gamebox/kenney/2d/Holiday Pack 2016/RTS pack/Retina/RTSobject_15.png`
- Presents: `../assets/gamebox/kenney/2d/Platformer Assets Holiday/present_small_{red,green,blue}.png`

These images are part of GameBox's existing **Kenney** asset library. The vector arrowheads, icy board, fairy lights, frame, interface and animation are original implementations created for this game. No art from Oakever's app is redistributed.

## Tests

```sh
node --check santas-arrow-escape/game.mjs
node --test santas-arrow-escape/engine.test.mjs
```

The dedicated `Santa's Arrow Escape mobile checks` GitHub Actions workflow runs Chromium gameplay smoke tests at 390×844, 360×740 and 320×568, including a complete level, a blocked arrow, the in-game menu and viewport-overflow checks. The workflow uploads test screenshots.

## Files

- `index.html` — game screen
- `style.css` — responsive Christmas graphics and HUD
- `engine.mjs` — board generator and collision rules
- `game.mjs` — renderer, touch controls, animations, sound and persistence
- `engine.test.mjs`, `browser-smoke.cjs` — validations
