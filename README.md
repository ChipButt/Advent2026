# Elflympics 2026 · North Pole Winter Championship

**Status: V1 foundation, awaiting dedicated Supabase project connection, event assignments and end-to-end verification.**

This is a replacement for Advent2026's old village/decorating UI. The original is saved in branch `archive-advent2026-before-elflympics` for rollback. The bundled game copies have been removed from the live code on 18 November 2026. Original GameBox versions are preserved in `ChipButt/GameBox`; a pre-removal snapshot is in `backup/pre-workshop-2026-11-18`. Workshop candidate imports are kept separate until approved.

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
- Live event launcher has no bundled games; approved games are promoted from the Workshop
- Supabase Auth email/password registration, confirmation and sign-in code
- SQL schema in `supabase/schema.sql` for users, event schedule, race reservations, standings
- Server-side atomic uniqueness preventing extra daily official race starts


### Ice Links Advent scoring (Game 21 candidate)
- Game key: `ice-links`; standalone QA URL: `games/ice-links/`.
- Each attempt has five consecutive puzzles with automatic transitions; the player selects Easy, Medium or Hard for the whole attempt. There are no medal awards inside Ice Links.
- Per completed puzzle: 100 / 200 / 350 base points respectively, plus a speed bonus (up to 75% of base) and a clean-streak bonus (up to 100). One hint yields half the base award and two or more yield zero. Skipping gives zero and resets the streak.
- At the end of five puzzles the game sends one `elflympics-finish` message with `game: "ice-links"` and an integer `score`. Practice attempts do not affect standings; official results are processed by the existing race reservation and submission flow.
- The existing `event_standings` and `overall_standings` views rank highest raw event scores first, assign event place points, and sum these into the championship. No second leaderboard or game-specific medals are needed.
- **Scheduling:** Ice Links is registered in `app.js` but not assigned to a December day or published in the database. Choose its event day separately before launch; do not automatically overwrite an existing event.
- **Integrity:** Client-generated score messages are not authoritative anti-cheat evidence. Validate/replay results server-side before running a competitive public event.

## Required before official racing works
1. Create a **new Supabase project** under the user's chosen organisation; do not use the unrelated existing database.
2. Run `supabase/schema.sql` against that project after reviewing it.
3. In `config.js`, set the new project's public URL and publishable key. **Never put a service_role or secret key into the browser.**
4. In Supabase Auth, set Site URL and redirect URLs to the deployed site; set up verified SMTP for actual signups.
5. Assign and publish event days in the database once the 24-game programme is agreed, e.g.
   `update public.events set game_key='tiny-ski-run',is_published=true where day=1;`
   Game keys: `tiny-ski-run`, `workshop-watch`, `block-breaker`, `santa-invaders`, `festive-blocks`, `jigsaw`, `ice-links`.
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
- `games/`: added only when approved Workshop releases are promoted
- `supabase/schema.sql`: database schema and server-side attempt enforcement
