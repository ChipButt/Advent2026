# Santa's Sorting Shift

A complete, responsive Christmas arcade game for GameBox. Play it at `/santas-sorting-shift/` after GitHub Pages deploys.

## Game
- **Touch, drag, drop:** collect parcels from the moving conveyor and drop them into the matching physical crate.
- **Presents:** green PRESENTS bin, using the existing six real Kenney holiday present sprites.
- **Coal:** red COAL bin, with an original detailed pixel-art coal sprite.
- **Express:** glowing, pulsing present, available from shift 1; drop into the gold EXPRESS bin.
- Brisk opening belt (100 px/s) and 1.38-second starting parcel interval, then 12 escalating shifts; live belt movement, time limit, sorting quota, combo bonuses, three chances, wrong-bin/missed-parcel penalties, shift completion, local high score and unlocked shift.
- Proper pause/resume, auto-pause on page hide, sound toggle, portrait-mobile pointer controls, mouse support, reduced-motion CSS and keyboard Pause/Escape.
- Draws an original textured Santa's workshop scene in cached Canvas art: timber walls, windows, snow, stacked stock, motor/rollers, a festive decorated sign, illuminated conveyor and physical wooden sorting crates.
- Uses existing GameBox **Kenney Platformer Assets Holiday** for presents. No subscription, network API or external sprites required. Optional Google font with system fallback.

## Files
- `index.html`: layout and game UI
- `style.css`: responsive HUD, menu and motion treatments
- `engine.js`: isolated deterministic state machine; supports Node tests
- `game.js`: Canvas rendering, pointer handling, particles, synthesized audio, persistence
- `engine.test.cjs`: unit tests

## Development checks
Run from repository root:

```bash
node --test santas-sorting-shift/engine.test.cjs
```

Manual browser checks: on portrait phone, drag red/green/blue gift into PRESENTS; coal into COAL; intentionally mis-sort and confirm chance decreases; leave an item to run off conveyor; pause and resume; complete shifts 1 and 2; check EXPRESS unlock at shift 3, distinguish star-marked gift; test on touch and mouse; reopen to confirm unlocked progress and best-score retention.
