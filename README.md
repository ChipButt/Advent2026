# Advent 2026

A mobile-first digital Advent calendar presented as an explorable Christmas elf village.

## Current experience

- **Calendar** is now a low-down top-view snowy village rather than a grid of doors.
- The player controls a smaller version of the coded **Classic Elf** and walks around the village.
- There are **24 numbered houses**, one for each Advent day.
- Walking up to a house enables the **A / Enter** control.
- Entering a house moves into a detailed pixel interior where a resident elf greets the player and explains that house's planned game or puzzle.
- Visited houses are remembered locally.
- **Playroom / Scores / Profile** remain as the main navigation areas for later Firebase, collection and leaderboard work.

## Visual direction

The Classic Elf sprite is the reference for the whole app's coded pixel-art language:

- compact detailed sprites rather than simple geometric placeholders;
- dark pixel outlines;
- muted Christmas green, red, cream and brown;
- multiple light/dark shades per material;
- warm wood and window-light accents;
- chunky snow and trim with deliberately stepped pixel edges.

The player sprite is still reconstructed entirely from coded sprite data. No elf PNG is required at runtime.

## Structure

- `index.html` — app shell, village controls and four primary views
- `styles.css` — pixel-game shell and mobile controls
- `app.js` — hash navigation
- `village.js` — village map, movement, houses, interiors and resident-elf dialogue
- `assets/elf/` — coded Classic Elf sprite data/runtime

## Live app

https://chipbutt.github.io/Advent2026/
