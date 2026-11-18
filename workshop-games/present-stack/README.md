# Santa's Present Stack

An original Santa's workshop-themed, browser/mobile arcade game inspired by the gameplay of the classic Siemens phone game Stack Attack.

## Play
- **Walk:** Left/right arrows, A/D, or the large on-screen arrows.
- **Jump / break:** Up arrow, Space, W, or the JUMP button. Jump into the underside of a present to break it.
- **Push:** Walk into a present to move it one column when there is space beyond it.
- **Clear:** Fill any horizontal row of ten present boxes to pack it away for score.
- Presents fall from the workshop delivery chute; they settle in stacks. Stay clear of falling boxes, protect your three hearts, and avoid a stack reaching the ceiling.
- Every four cleared rows advances the shift and increases delivery speed.
- P or Escape pauses. High score saves locally in this browser.

## Art and tech
- Presents use existing Kenney Platformer Assets Holiday art from GameBox \`assets/gamebox/kenney/2d/Platformer Assets Holiday/\`.
- The elf is original pixel art authored and animated on a cached off-screen canvas. Background scene is an original raster workshop rendering, not CSS placeholder scenery.
- No third-party scripts or external game runtime.
- \`engine.js\` is a DOM-independent game engine. Run \`node present-stack/engine.test.cjs\` from the repository root to exercise clearing, pushing, smashing, gravity and damage.
