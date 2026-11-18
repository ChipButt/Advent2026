# Santa's Potion Sort

Christmas-themed water-sort puzzles for the GameBox festive range. Play at `christmas-potion-sort/` or through the GameBox main menu.

## Puzzle rules

Tap a glass bottle, then a destination bottle. Only the matching top colour or an empty bottle can receive liquid. The complete continuous top-colour run pours automatically, stopping at the bottle's four-layer capacity. Empty or finish every bottle with a single colour to win.

## Difficulty and progression

The first level contains **seven heavily mixed colours and two empty bottles** rather than three. Levels 3–6 contain eight colours, levels 7–13 have nine, and level 14 onward contains ten. The selected challenges have 20–33 verified solution moves and diverse colour transitions; bottle and colour arrangements vary deterministically with the level number.

Every source puzzle was solved with a legal-move search before inclusion, and the compressed move proofs are revalidated in the automated tests. The challenges never rely on blind random scrambles that might be impossible to solve. There are **two hints per level**, unlimited undo/restart, stars based on relative move efficiency, and saved progress (with migration of unlocked levels from the previous version).

## Visual system

`liquid-renderer.mjs` draws the coloured liquids and refraction-tinted glass at native device resolution with Canvas 2D. Highlights, transparent glass walls, rounded liquid surfaces, bubbles and glints are rendered in every bottle. A live canvas overlay moves, tilts and pours a lifted bottle into its target, while both quantities animate smoothly. Reduced-motion settings skip animation.

The winter trees and holiday present art come from Kenney assets already committed in the repository. No artwork from the reference commercial mobile game is copied. Colour initials can be enabled in the menu for accessibility (off by default).

## Quality checks

```sh
node --test christmas-potion-sort/engine.test.mjs
```

`.github/workflows/christmas-potion-sort.yml` runs the deterministic puzzle tests on 120 levels and Chromium touch tests at 390×844, 360×740, and 320×568. The browser tests check glass rendering, bottle layout, moving pour visuals, undo, a full proof-played victory, next-level unlock and persistence.

Keyboard: keys 1–9 select a bottle, U undoes, Escape opens/closes menu. Touch/mouse can select all bottles.
