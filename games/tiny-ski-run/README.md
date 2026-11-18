# Tiny Ski Run

Continuous mobile-first skiing mini-game for GameBox, rebuilt around the actual Kenney **Tiny Ski** asset pack.

## Asset audit

The imported shared pack is in `ChipButt/ToolBox` at:

`assets/gamebox/kenney/2d/Tiny Ski/Tiles/`

The repository contains `tile_0000.png` through `tile_0131.png`. The playable art is concentrated in tiles `0000`–`0083`; tiles `0084` onward are the pack's pixel number/letter/symbol glyphs. The previous implementation incorrectly treated several glyph frames as snow, particles, a collectible and a crash sprite. This rebuild removes those guesses.

Verified gameplay/scenery groups used here include:

- snow/terrain texture variants: `0000`–`0005`
- evergreen / dead-tree scenery: `0006`, `0007`, `0018`, `0019`, `0030`
- red/blue flags and nets: `0008`–`0011`, `0020`, `0021`
- course direction signs: `0022`, `0023`, `0032`–`0035`
- shrub / small snow scenery: `0031`
- ski-lift infrastructure, cable pieces, chairs and gondolas: `0042`–`0047`, `0055`–`0057`, `0066`–`0068`
- ski-track tile: `0058`
- snowman: `0069`
- main skier: `0070`
- alternate skier sprites used as moving mountain traffic: `0071`, `0078`–`0080`, `0082`, `0083`
- rock / snow mound obstacle: `0081`

The menu/HUD controls use Kenney **UI Adventure Pack** and **Game Icons** assets already present inside `ChipButt/GameBox`.

## Game design

- endless downhill course generated in recyclable segments
- smooth progressive speed increase
- hold either side of the slope, drag, on-screen buttons, or keyboard Left/Right / A/D
- deliberate obstacle patterns rather than uniform random clutter
- red/blue gate sequences with gate bonus scoring
- trees, dead trees, rocks, snowmen and later moving skier hazards
- ski-lift crossings and mountain-side scenery built from Tiny Ski assets
- actual Tiny Ski track tile behind the player
- near-miss bonuses
- crash spin, snow burst, screen impact and short wipeout delay
- compact HUD, pause menu and local best-distance storage
- `requestAnimationFrame`, image preloading, recycled entity objects and no per-frame DOM creation

## Shared art dependency

Tiny Ski gameplay PNGs are served from the existing ToolBox GitHub Pages asset pool so the original Kenney files are used without redrawing or approximating them. UI Adventure and Game Icons are local GameBox assets.
