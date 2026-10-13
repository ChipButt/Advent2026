# Advent 2026 — Christmas RPG Village

A mobile-first Advent calendar presented as a top-down Game Boy Color–inspired Christmas adventure.

## Current world

- **Christmas Town:** houses 1–12, a central plaza and festive tree.
- **Northern Snow Trail:** houses 13–18, snowy woodland paths and cottages.
- **Eastern Pine Route:** houses 19–24, snow trails, river crossing and wooded cottages.
- **24 interactive numbered Advent doors**, with date locks following the Europe/London calendar.
- **Four-direction overworld character** (no diagonal movement), keyboard arrows/WASD and mobile D-pad/A controls.
- Camera follows the character through the continuous overworld. The player can use the **Map** to jump to any numbered doorstep.
- Entered houses have a warm, pixel-art RPG interior with Play Game / Leave House actions.
- Visited houses and the player location persist in local storage.
- The original GameBox games have *not* been modified.

The world renderer uses the **existing Gherwit Winter Tiles atlas** already used in GameBox Workshop Watch for snow ground, route edges and fir trees. Original buildings and extra village furnishings are pixel-drawn with the same restricted colour language. Gameplay UI uses a retro handheld style. The environment assets are intentionally separate from the actual Advent day assignment map.

## How to test

Normal version: https://chipbutt.github.io/Advent2026/

Test version: https://chipbutt.github.io/Advent2026/?test=1#calendar

Testing mode unlocks all houses and surfaces all six approved game copies through the Playroom. The banner indicates testing mode. Exit in the Profile tab.

Date locks: day 1 starts 1 December 2026 and day 24 starts 24 December 2026, UK time. Already-unlocked days stay available.

## Games staged in Advent2026/games

Approved copies fixed to GameBox commit `fab0ae98fd86c888ff1bd470ade52f698ed2b82b`:

1. Tiny Ski Run
2. Jigsaw
3. Workshop Watch
4. Block Breaker
5. Santa Invaders
6. Festive Blocks

**Day assignments are deliberately blank** in `advent-calendar.js`. Each of the 24 doors works, but an unassigned day correctly shows “Your surprise is being prepared” rather than launching an unapproved or arbitrary game. Game copies can be launched from Playroom in testing mode. The user must choose their December dates before assigning games to houses.

Some game artwork loads from original GameBox and ToolBox GitHub Pages URLs, so those asset URLs must remain available. The live winter tile atlas likewise comes from GameBox. Before decommissioning GameBox, migrate and retest any dependencies.

## Project structure

- `index.html` – Advent RPG screen, D-pad, A button, map, house interior, Playroom, Scores and Profile
- `styles.css` – handheld-inspired interface and responsive layout
- `village.js` – world generation, tile renderer, cottages, four-direction character, camera, movement, collision, doors and interiors
- `advent-calendar.js` – approved game registry, day assignments, UK-date locks and testing mode
- `app.js` – navigation and unlocked Playroom
- `games/` – approved copies of six games

Original `assets/elf/` and `assets/village/` files are retained as historical resources but are no longer loaded by the new runtime.

## Asset sources

- Gherwit Winter Tiles, already in GameBox under `workshop-watch/assets/vendor/gherwit/winter/`.
- Approved GameBox Kenney and Admurin artwork used by game thumbnails and individual games.
- See GameBox `workshop-watch/assets/CREDITS.md` for Winter Tiles and Admurin attribution/licence notes.

This is a functional RPG-themed rebuild, not a pixel-for-pixel copy of any AI concept illustration. The house arrangements and external sprite sheets should be reviewed visually on both phone and desktop after deployment.

## Design and testing notes

The world art now follows the approved full-colour Game Boy Color-style brief, using reused GameBox winter assets instead of the old code-drawn snow scene. The cottages and player sprite are newly authored in code because a complete matching overworld-building/player tileset is not present in the inspected GameBox assets. The generated reference concept is an art-direction target, not the exported playable level. JavaScript syntax and a simulated 24-house flow have been checked; visual QA in real mobile browsers is still needed.
