# Elflympics Workshop W1

- The production site is GitHub Pages deployed from `main`.
- This Workshop is deployed from the **same repository**, branch `workshop`, to `elflympics-workshop-2026.pages.dev`.
- **Do not deploy Workshop automatically to Live.** Live promotion is by approving one tested Workshop commit, reviewing its diff, and fast-forwarding Live `main` to that exact commit. Do not cherry-pick or manually recreate a game.
- Workshop is determined by the deployed hostname, not a URL query parameter. Workshop has no Supabase connection; there are no production accounts, competition data, or score writes.
- All 24 days are unlocked in Workshop. Days 1–22 are provisional GameBox candidates; days 23–24 are unassigned.
- Game source files live under `games/`, copied **into this repository** from the pinned GameBox commit by `.github/workflows/import-gamebox-advent.yml`. There is no GameBox runtime redirect.
- At first import, candidate status is **Needs review**. Gameplay, navigation, mobile styling and competition scoring are not certified.
- GameBox source stays unchanged. `backup/pre-workshop-2026-11-18` preserves the previous Elflympics state.
- During approval, review event shell and check completed games report a valid numeric `elflympics-finish` score. Existing GameBox games may not yet do this.
- Once real scoring is developed, use separate test accounts and data and a secure server-side validation flow. Never reuse the production Supabase database for Workshop test racing.
- Promotion must preserve production scores and player data and verify the database schema is compatible with the previously deployed code.
