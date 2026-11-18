# Snowy Sweets · Christmas match-three game

A standalone pixel-art match-three game in GameBox, currently a **test candidate** for Advent2026.

## Gameplay
- Swipe or tap to swap neighbours. Invalid swaps smoothly reverse and do not consume a move.
- Match 3 sweets to clear; match 4 to make row or column striped power sweets; match 5 or more to create a burst special built from the matching sweet.
- When a four- or five-piece special is formed, the consumed sweets visibly travel and shrink into the surviving sweet; only then does it morph into the special artwork with a larger gold-white ping.
- Every destroyed sweet has a sharp pixel-art sparkle ping rather than only a shrink-and-fade. Existing row, column and burst activation animations remain intact.
- Swaps travel between positions, matched sprites pop, and keyed candies fall into their new cells without recreating the whole board; special activations animate their own sweeping blast artwork.
- Ice breaks when the sweet in its square clears; some later tiles require two hits.
- 12 selectable levels have distinct moves and sweet-collection, score, or ice goals.
- Move and score counters, sound, hints, restart, level select, level stars and browser-saved progress.

## Production artwork and visual consistency
All six match pieces use the existing Kenney Pixel Platformer Food Expansion artwork. Two full-height pieces are assembled into real RGBA PNGs so neither clips at a source tile boundary:
- `tile_0014.png` · iced doughnut
- `candy-cane-complete.png` · hook from source tile 0041 joined seamlessly to the matching stem from source tile 0057
- `ice-lolly-complete.png` · upper ice-lolly body from source tile 0043 with the handle taken from source tile 0044, rotated, plus a finished lower outline
- `tile_0058.png` · biscuit
- `tile_0080.png` · ice cream
- `tile_0082.png` · frosted sundae

The completed sprites are centred in 32×32 transparent PNG canvases and sized to fit entirely within an individual board cell; powered-up specials reuse these same complete images.

The truncated-looking marshmallow and frosted-cake fragments were removed. Each sweet now has three **finished, distinct pixel-art specials** (gold row stripe, cyan column stripe, magenta burst) contained in a **192×96 RGBA PNG atlas**, `assets/pieces/special-atlas.png`. The 18 transparent 32×32 variants are decoded once when the page loads into small transparent PNG image URLs. Safari no longer has to render SVG images containing embedded PNGs. All original Kenney artwork is retained in the actual raster tiles. Old SVG variants remain only as a backup if the atlas is unavailable.

Special activations use asset-backed beams and bursts under `assets/fx/`. Movement uses persistent 64-cell DOM layout and keyed candy nodes, finger-following dragging, quick reverse swaps and distance-based gravity. Swaps now move existing pieces into their actual destination DOM cells before the animation begins (FLIP), so ending animations do not cause a visible snap-back. Cleared sweets are removed before cancelling their finish-state animation, preventing momentary reappearance. Special-birth pings follow the moving candy instead of being stuck to a board cell. Normal matches do not spawn floating scores.

Additional source sprites from the same user's Kenney library:
- `tile_0096.png`, `tile_0097.png` · special-move strips and match particles
- `snow_base.png`, `snow_flecks.png` · Tiny Ski snow tiles
- `ice_block.png` · Platformer Assets Ice visual
- Kenney Holiday Pack · Christmas panel illustration
- Kenney UI Pack / Adventure · buttons, frame and menu icons
- Kenney Retro Textures Fantasy · wood table surface

**Art is not generated with CSS shapes.** Normal sweet assets are transparent PNGs, and special variants are rasterised from one true-alpha PNG atlas. Blast effects use SVG image assets. CSS handles positioning and animation only. No fake checkerboard backgrounds are used.

## Deployment
- Play: `https://chipbutt.github.io/GameBox/snowy-sweets/`
- GameBox: `https://chipbutt.github.io/GameBox/`
- This candidate is not yet added to Advent2026. The Advent day-lock mechanism stays in the parent calendar, not here.

## Testing limitations
The game engine was verified through scripted 12-level match/move/cascade simulations and JavaScript syntax checks. Manual Safari visual review, special-effect appearance and device animation performance still need checking before Advent approval.
