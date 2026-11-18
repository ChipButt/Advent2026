# Elflympics Workshop: 21 original GameBox Advent games

This directory is a **QA sandbox only**, imported at the pinned GameBox source commit `fcc46ad55fdd5eca9a8f5d35caf1a19963011ea4`.

- Exactly 21 original games from GameBox's `advent-2026/catalog.json`.
- Source games, assets, original artwork and relative dependencies copied to the same relative layout.
- Seven existing score-bridged Elflympics games remain untouched in the separate `games/` folder.
- **No event database assignments, official scoring registrations or Live promotion.**
- Every game remains `needs-testing`, with no approvals.
- To populate or refresh this directory, run the Workshop-only GitHub Actions importer. Never use this importer on `main`.
- After QA, adopt only explicitly approved games into the real `games/` directory, remove superseded code, and verify score integration and gameplay before releasing.

Note: there is no source game literally titled *Ice Blocks* in the pinned 21-game Advent catalogue; source includes **Festive Blocks**, **Ice Links**, and **Snowy Sweets** (which has ice-block artwork). Do not silently rename or fabricate it.

[Workshop test launcher](https://elflympics-workshop.pages.dev/workshop-games/)

This is a dedicated Cloudflare Pages Workshop project connected to the `workshop` branch. It is deliberately separate from the live Advent deployment.
