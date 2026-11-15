# Elflympics 2026 · North Pole Winter Championship

**Status: V1 foundation, awaiting dedicated Supabase project connection, event assignments and end-to-end verification.**

This is a replacement for Advent2026's old village/decorating UI. The original is saved in branch `archive-advent2026-before-elflympics` for rollback. Six original games remain in `games/`.

## Rules
- 24 daily events, 1–24 December 2026, based on Europe/London dates
- Unlimited practice for unlocked games
- One official attempt **per event per UK calendar day**, reserved when the player begins
- Latest official attempt replaces an earlier result, including a worse score or an unfinished run (DNF)
- Event standings update while events are open, then freeze after 24 December
- Ties share the same event and championship rank and event points
- Initial scoring formula: 1st = 24, 2nd = 23, etc., minimum 1 point. Confirm before launch.

## What's included
- Responsive, premium North Pole winter sports front end with events, leaderboard, profile and modals
- Existing six GameBox games retained, prepared for practice mode and score reporting
- Supabase Auth email/password registration, confirmation and sign-in code
- SQL schema in `supabase/schema.sql` for users, event schedule, race reservations, standings
- Server-side atomic uniqueness preventing extra daily official race starts

## Required before official racing works
1. Create a **new Supabase project** under the user's chosen organisation; do not use the unrelated existing database.
2. Run `supabase/schema.sql` against that project after reviewing it.
3. In `config.js`, set the new project's public URL and publishable key. **Never put a service_role or secret key into the browser.**
4. In Supabase Auth, set Site URL and redirect URLs to the deployed site; set up verified SMTP for actual signups.
5. Assign and publish event days in the database once the 24-game programme is agreed, e.g.
   `update public.events set game_key='tiny-ski-run',is_published=true where day=1;`
   Game keys: `tiny-ski-run`, `workshop-watch`, `block-breaker`, `santa-invaders`, `festive-blocks`, `jigsaw`.
6. Standardise the Jigsaw's image/grid before allowing official competitions.
7. Implement **per-game score verification** and test against cheating and client manipulation before real competition. Current score bridge reports client-derived results and is insufficient for a high-trust competition.
8. Test on actual mobile devices and with multiple independent users before declaring production-ready.

### Deployment
The existing GitHub Pages path `https://chipbutt.github.io/Advent2026/` can continue serving this repository after deployment. This static front-end does not contain a private Supabase key.

### Important notes
- Offline or disconnected clients cannot submit official results.
- Starting and abandoning an official run uses that day's attempt. No automatic retry on lost connection.
- Free Supabase databases can pause for low activity; daily genuine database use usually prevents it but is not guaranteed.
- Back up critical results externally before the championship finishes; the Supabase Free plan does not provide managed daily backups.

## Structure
- `index.html`: new app shell
- `styles.css`: responsive sports-brand design
- `app.js`: events, registration and race UI, leaderboards
- `config.js`: public Supabase connection values (initially empty)
- `assets/crest.svg`, `assets/mountains.svg`: new branding illustration
- `games/`: six retained games, with new result message bridge
- `supabase/schema.sql`: database schema and server-side attempt enforcement
