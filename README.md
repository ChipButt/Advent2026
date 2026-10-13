# Advent 2026

Mobile-first, explorable Christmas village with 24 numbered houses. The project remains independent of GameBox.

## Current integration

- Walk through the existing Christmas village, approach a house, and press A / Enter.
- Doors follow the Europe/London calendar. Door 1 opens on 1 December 2026, continuing through door 24 on 24 December. Past doors remain accessible.
- Development testing: visit [the test URL](https://chipbutt.github.io/Advent2026/?test=1#calendar) to unlock all houses for the current browser session. An explicit testing indicator appears at the top. Leave test mode in Profile, or add '?test=0' to the URL.
- The Playroom displays games from unlocked days. In test mode it displays all six approved game copies for QA even before any day assignments are made.
- The village's original movement, elf, snow-map and interior remain in place.

## Approved games copied from GameBox

Source snapshot: \`ChipButt/GameBox@fab0ae98fd86c888ff1bd470ade52f698ed2b82b\`.

| Game | Advent copy |
| --- | --- |
| Tiny Ski Run | \`games/tiny-ski-run/\` |
| Jigsaw | \`games/jigsaw/\` |
| Workshop Watch | \`games/workshop-watch/\` |
| Block Breaker | \`games/block-breaker/\` |
| Santa Invaders | \`games/santa-invaders/\` |
| Festive Blocks | \`games/festive-blocks/\` |

Gameplay JavaScript and HTML/CSS live in this Advent repository. Some large media packs still use their verified asset URLs at \`chipbutt.github.io/GameBox/\` or \`chipbutt.github.io/ToolBox/\` instead of duplicating vendor binaries; consequently a production asset-migration pass may be needed before GameBox or ToolBox is removed. The source GameBox files are unchanged.

## Day assignments: awaiting approval

**No dates have been assigned yet.** This is intentional: do not choose the six dates, reuse games, or fill the other 18 doors without confirmation.

Set \`days\` in \`advent-calendar.js\` to a game ID for each approved date (e.g. \`'tiny-ski-run'\`), keeping all other dates \`null\`. The current file generates 24 \`null\` entries explicitly to make this decision visible. A door with no assigned game shows a polite 'surprise being prepared' message, never a fictitious game.

## Files

- \`index.html\` – app shell, village and four original tabs
- \`styles.css\` – existing pixel-style UI plus Playroom cards
- \`advent-calendar.js\` – approved game registry, date locking and testing mode
- \`village.js\` – original village, movement, house interactions and game launching
- \`app.js\` – navigation and unlocked Playroom
- \`games/\` – six copied GameBox games
- \`assets/elf/\`, \`assets/village/\` – existing Christmas sprite data

## Live site

https://chipbutt.github.io/Advent2026/
