# Chimney Drop-In · GameBox

**Mobile-first, endless Christmas vertical-avoidance arcade game.**

Play: `https://chipbutt.github.io/GameBox/chimney-drop-in/`

## How to play

**New visual rule:** green circular **+** markers and labels mean safe pickups (**SHIELD**, **BOOST**, **BONUS**); red diamond **!** markers and **AVOID** labels mean dangerous obstacles. Protruding ledges have warning stripes and exclamation marks. The legend stays visible above the chimney while playing.

Steer Santa with **LEFT/RIGHT** buttons, drag him horizontally inside the chimney, or use keyboard Left/Right or A/D. Santa falls continually, and the procedurally generated brick walls move past him. The chute width, masonry structure and hazard combinations change as he descends.

- **Embers / ember showers** — burning fire hazards. Stay away.
- **Brick ledges** — jut out from the chimney walls. Avoid them.
- **Angry wreaths and spiked baubles** — hostile Christmas decorations, some drifting side-to-side.
- **Cookies** — a 6.5-second protective shield, which absorbs one hit.
- **Milk** — a 5-second 30% descent-speed boost.
- **Christmas presents** — bonus score collectible using real Kenney holiday PNG artwork.
- Three hearts; collisions briefly grant immunity. Distance and pickups build score, combos reward collection streaks, and best distance/score persist locally.

## Art direction / approved assets

Cohesive crisp pixel-art style, deliberately matching the existing Christmas GameBox titles.

Reused verified files from GameBox's existing imported **Kenney** assets:
- `assets/gamebox/kenney/2d/Brick Pack/Double/Red/brick_medium_2.png` — physical red brick texture blended into detailed procedural chimney masonry.
- `assets/gamebox/kenney/2d/Platformer Assets Holiday/present_small_green.png` and red — gifts and GameBox home tile.
- `assets/gamebox/kenney/2d/Platformer Assets Candy/canePink.png` — decorative wall alcoves.
- `assets/gamebox/kenney/icons/Game Icons/White/2x/home.png` — menu navigation icon.

Original detailed, cached offscreen Canvas pixel sprites drawn once for Santa (four falling frames), cookies, bottled milk, coal-lit embers, hostile wreaths, and spiked baubles. Original masonry, tunnel walls, parallax soot, copper ventwork, masonry bulkhead arches, lighting, effects, damage and shield treatments all use a restricted complementary palette. These are authored art assets, not emoji or stock backgrounds.

Kenney's 2D packs are free CC0 assets, including commercial game use, see https://kenney.nl/assets/platformer-art-pixel and https://kenney.nl/assets/pixel-platformer . The project uses the exact assets already available in the repository. No recurring subscription or external game service required. Google font is optional and has a local system fallback.

## Architecture

- `engine.js` deterministic pure JavaScript procedural world and collision rules, Node-testable.
- `game.js` authored pixel sprites, animated Canvas gameplay, pointer/keyboard events, WebAudio cues, HUD, persistent scores.
- `index.html` compact game-native mobile UX, pause/game-over/help menus.
- `style.css` portrait-responsive, tactile controls, accessible labels.
- `engine.test.cjs` tests fair procedural chimney geometry, hazards, pickups, shield, boost, speed and game-over rules.
- `browser-smoke.cjs` uses local Chromium to verify actual playable screens in two mobile sizes, screenshots, controls, pause and resume.

## Verification

```bash
node --check chimney-drop-in/game.js
node --test chimney-drop-in/engine.test.cjs
```

See `.github/workflows/chimney-drop-in.yml` for automated asset/path, gameplay and headless browser checks.
