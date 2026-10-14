# Advent 2026

An explorable, pixel-art Christmas Advent calendar built from real existing GameBox and ToolBox assets.

## Art and environment

- 24 numbered houses across Christmas Town, Northern Snow Trail and Eastern Pine Route.
- Ground, path and fir-tree terrain from the **Gherwit Winter Tiles** atlas, copied to assets/winter/Winter-tiles.png.
- Houses, Christmas trees, snowmen, presents, lamps, fences, furniture and interiors are drawn from the user-supplied Christmas Village art pack, installed at assets/village/village-assets.js. No code-generated substitute house or character art.
- The player uses original **character.png**: 256×16, sixteen 16×16 frames, four consecutive walking frames for each of four directions. Frames change with distance travelled and return to idle when stationary.
- Santa, gnomes and Christmas residents use original Time Fantasy Christmas 3-frame × 4-direction sprite sheets, copied unchanged to assets/christmas/.
- Controller and navigation art uses the original Kenney PNGs, copied unchanged to assets/ui/.
- CSS is used for layout, scaling and UI surfaces only. Gameworld artwork comes from original source assets.

## Advent behaviour

- 1–24 December 2026, using Europe/London dates.
- Test mode: https://chipbutt.github.io/Advent2026/?test=1#calendar unlocks houses in the browser session and provides six game copies in the Playroom for testing.
- Six approved GameBox copies: Tiny Ski Run, Jigsaw, Workshop Watch, Block Breaker, Santa Invaders and Festive Blocks. They are unchanged.
- Game-to-date assignments remain **blank**, pending approval; no duplicates or invented content.
- Four-direction movement on mobile controls or keyboard, A/Enter interaction, a numbered day finder, and proper return to the same doorway.

## Source locations

- assets/village/village-assets.js — source-authentic compressed Christmas Village pack
- assets/christmas/world-builder-tf-data-1.js through -9.js, world-builder-tf-runtime.js — unchanged source copies from GameBox/christmas-quest/
- assets/winter/Winter-tiles.png — unchanged Gherwit winter atlas
- assets/ui/ — unchanged Kenney controller and navigation PNGs
- games/ — the six previously copied approved games

## Quality checks and limitations

Source names and byte hashes were checked when copying the vendor artwork. Code syntax, house navigation and date-lock checks are performed before release. Real-device visual review is still required before claiming full match to the original concept image.

The prior hand-drawn house, overworld character and interior props have been replaced by real asset drawing. The concept image is a design reference, **not** a screenshot of the implemented game.

Live: https://chipbutt.github.io/Advent2026/
