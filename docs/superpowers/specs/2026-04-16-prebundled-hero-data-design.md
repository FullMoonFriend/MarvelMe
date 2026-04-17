# Pre-bundled Hero Data — Design Spec

**Date:** 2026-04-16
**Status:** Approved, ready for implementation plan

## Problem

Hero portraits served from `superherodb.com` fail to load in production because Cloudflare's bot-mitigation engine returns `403` with a `cf-mitigated: challenge` HTML page in response to embedded `<img>` requests from `marvelme.dev`. The challenge requires high-entropy User-Agent Client Hints (`Sec-CH-UA-Bitness`, `Sec-CH-UA-Arch`, etc.) that browsers don't send for cross-origin subresource loads. Adding `referrerPolicy="no-referrer"` had no effect because the root cause is bot detection, not referrer hot-link protection.

Investigation also surfaced two pre-existing correctness issues in the live-API approach:

1. **Silent wrong-character bugs.** Several entries in `src/data/marvelHeroes.js` resolve via `searchHero(name)` to the wrong character — e.g. `"Thor"` returns Thor Girl (Tarene) because the original Thor Odinson is tagged with publisher `"Rune King Thor"` and isn't returned by a name search; `"Hawkeye"` returns Kate Bishop instead of Clint Barton; `"Venom"` returns Angelo Fortunato instead of Eddie Brock.
2. **Unreliable publisher field.** A naive `publisher === "Marvel Comics"` filter misses ~33 Marvel characters whose publisher field is mis-populated with a character alias (Deadpool → `"Evil Deadpool"`, Vision → `"Anti-Vision"`, Jean Grey → `"Phoenix"`, Captain Marvel → `"Binary"`, etc.) or even a different publisher (Chameleon and Gog are both tagged `"DC Comics"`).

## Goals

- Hero portraits load reliably in production. No runtime dependence on the Superhero API or its image CDN.
- Hero data and portraits are self-contained in the deployed bundle. The app works with no `.env` file and no API token.
- Hero records are bound to **stable Superhero API IDs** rather than fragile names, eliminating the silent wrong-character class of bugs.
- The Superhero API integration moves to **build-time** (a Node script) rather than disappearing entirely. The portfolio framing of the project still mentions the API, accurately reframed.

## Non-goals

- Manual portrait sourcing for characters absent from the Superhero API. (None are missing once the rescue sweep is applied.)
- Re-doing the daily-challenge feature. The existing daily-challenge logic samples from the same hero pool and inherits the new pool automatically.
- Build-time CI enforcement that `heroes.json` is up to date. Re-running the fetch is a manual workflow.
- Multiple image sizes / AVIF / responsive `srcset`. WebP at one size is sufficient for the 2×2 grid display.

## Architecture overview

**Build time** (Node script, opt-in, run manually):

```
scripts/fetch-heroes.mjs
  ├─ enumerate IDs 1..731 from Superhero API
  ├─ select: publisher == "Marvel Comics"  ∪  rescue list (hardcoded IDs)
  ├─ for each selected hero:
  │     ├─ fetch full record
  │     ├─ download portrait → sharp (resize 512×512 max, WebP q=82)
  │     └─ write public/portraits/<id>.webp
  ├─ derive `category` per hero (heuristic — see §6)
  └─ write src/data/heroes.json (sorted by id)
```

**Runtime** (browser):

```
useGame.js → import heroes from '../data/heroes.json'  (sync)
            → no fetch(), no loading phase, no token
AnswerOptions.jsx → <img src="/portraits/<id>.webp" />  (same-origin)
```

The Superhero API is referenced **only** by `scripts/fetch-heroes.mjs`. The React app has no awareness of it.

## Data model

### `src/data/heroes.json`

Single bundled file. Estimated size ~400–500 KB unminified, ~80–120 KB gzipped.

```json
[
  {
    "id": "213",
    "name": "Deadpool",
    "category": "hero",
    "image": { "url": "/portraits/213.webp" },
    "biography": {
      "full-name": "Wade Wilson",
      "first-appearance": "New Mutants #98 (February, 1991)",
      "alter-egos": "...",
      "publisher": "Marvel Comics"
    },
    "powerstats": {
      "intelligence": 69,
      "strength": 32,
      "speed": 50,
      "durability": 100,
      "power": 100,
      "combat": 100
    },
    "work": { "occupation": "...", "base": "..." },
    "appearance": {
      "gender": "Male",
      "race": "Mutant",
      "height": ["6'2", "188 cm"],
      "hair-color": "No Hair",
      "eye-color": "Brown"
    },
    "connections": { "group-affiliation": "..." }
  },
  ...
]
```

**Field-name policy:** preserve the Superhero API's exact field names (`full-name`, `first-appearance`, `hair-color`, `group-affiliation`) so `HintPanel.jsx` requires no field-access changes.

**`id` is a string** (preserved as returned by the API, e.g. `"213"` not `213`). Sort order in `heroes.json` is ascending by `Number(id)` for stable git diffs when re-running the fetch.

### `src/data/marvelHeroes.js`

**Deleted.** The bundled JSON is the source of truth.

## Build script (`scripts/fetch-heroes.mjs`)

**Runtime:** Node 20+ ESM.
**Production deps:** none (the script is dev-only).
**Dev deps added:** `sharp` (for image resize / WebP encode).

**npm script:** `"fetch-heroes": "node scripts/fetch-heroes.mjs"`. Not wired into `build` — explicitly opt-in so a vanilla `vercel deploy` doesn't need API access.

**Inputs:**
- `VITE_SUPERHERO_API_TOKEN` from `.env` (gitignored).
- A hardcoded `RESCUE_IDS` array at the top of the script (initial values listed below).
- A hardcoded `OVERRIDE_CATEGORIES` map for the rare cases where the heuristic picks wrong (initially empty).

**Behaviour, in order:**

1. Read token from `.env`. Abort with a clear message if absent.
2. For each `id` in `1..731`, in batches of 10 with a 100 ms inter-batch sleep:
   - `GET /api/{token}/{id}`. Retry once on 5xx. Skip on persistent failure.
3. Partition results:
   - `confirmed` = `publisher === "Marvel Comics"`
   - `rescued` = `id ∈ RESCUE_IDS`
   - Rest discarded.
4. Filter: drop any hero whose `image.url` is missing or contains `no-portrait`.
5. Apply duplicate-character pruning (see §7): drop alternate-iteration entries.
6. For each remaining hero:
   - If `public/portraits/<id>.webp` doesn't exist: download `image.url`, pipe through `sharp`, write WebP. Skip download if file already exists (idempotent re-runs).
   - Compute `category` via the heuristic (see §6) or override map.
   - Rewrite `image.url` to `/portraits/<id>.webp`.
7. Sort by `Number(id)` ascending.
8. Write `src/data/heroes.json`.
9. Print summary: total heroes, per-category counts, any heroes that lost their portrait, any heuristic-flagged ambiguities.

**Idempotency:** Re-running with no source changes produces no diff. Re-running after editing `RESCUE_IDS` or `OVERRIDE_CATEGORIES` updates only the affected entries.

## Image processing

- **Source:** Superhero API portrait URLs (mostly `https://www.superherodb.com/pictures2/portraits/...`). Server-side fetch; the Cloudflare bot challenge does not apply to direct script requests with a normal `User-Agent`.
- **Library:** `sharp`.
- **Transform:** `.resize({ width: 512, height: 512, fit: 'cover', position: 'top' }).webp({ quality: 82 })`.
- **Output:** `public/portraits/<id>.webp`. ~30–50 KB each.
- **Total size:** ~360 portraits × ~40 KB ≈ 14 MB on disk. Committed to the repo.
- **Naming:** `<id>.webp` (numeric id from the API). Never collides; refactor-safe.

## Categories

Current categories: `'hero' | 'xmen' | 'villain'`. Derived per hero, in order:

1. If `connections['group-affiliation']` matches `/x[- ]?men/i` (case-insensitive, allows "X-Men", "X Men", "XMen") → `xmen`
2. Else if `biography.alignment === 'bad'` → `villain`
3. Else (`good`, `neutral`, `-`, missing) → `hero`

The heuristic will misfile some characters whose group-affiliation lists multiple teams. The build script prints a per-category summary so the user can spot-check; per-id overrides go in the `OVERRIDE_CATEGORIES` map.

## Rescue list and dedup

**Rescue list** (mistagged Marvel characters identified by the sweep — see `scripts/sweep-rescue.mjs`). Initial value:

```js
const RESCUE_IDS = [
  9,    // Agent 13 (Sharon Carter)
  24,   // Angel (Warren Worthington III)        [keep — see dedup]
  26,   // Angel Salvadore                       [keep — see dedup]
  30,   // Ant-Man (Hank Pym)                    [keep — see dedup]
  34,   // Anti-Venom
  48,   // Atlas
  135,  // Box IV
  157,  // Captain Marvel (Carol Danvers)        [keep — see dedup]
  170,  // Chameleon
  213,  // Deadpool                              [keep — see dedup]
  288,  // Gog
  313,  // Hawkeye (Clint Barton)                [keep — see dedup]
  356,  // Jean Grey                             [keep — see dedup]
  361,  // Jessica Jones
  379,  // Kang
  577,  // Scarlet Spider
  581,  // Scorpion (Mac Gargan)                 [keep — see dedup]
  614,  // Speedball                             [keep — see dedup]
  659,  // Thor (Odinson)                        [keep — see dedup]
  687,  // Venom (Eddie Brock)                   [keep — see dedup]
  693,  // Vindicator
  697,  // Vision                                [keep — see dedup]
  707,  // Warpath
]
```

**Dedup mechanism — `DROP_IDS`:** a hardcoded `Set<number>` of API IDs to exclude from the pool **regardless of how they entered**. Two distinct uses:

1. **Same-character duplicates among rescue candidates.** The sweep surfaced 33 candidates; the 23 in `RESCUE_IDS` above are already deduped (e.g. we kept Angel id 24 and excluded Archangel id 40 from `RESCUE_IDS`). No `DROP_IDS` entry needed for these — they're absent by virtue of not being added.
2. **Confirmed-Marvel iterations that conflict with a rescued original.** Several confirmed-Marvel entries share a display name with a rescue (e.g. `Hawkeye II` (Kate Bishop, id 314) confirmed-Marvel; `Hawkeye` (Clint Barton, id 313) rescued — same display name in the answer grid would confuse players). These need explicit `DROP_IDS` entries:

```js
const DROP_IDS = new Set([
  31,   // Ant-Man II  (Scott Lang) — display-name conflict with id 30 (Hank Pym, rescued)
  314,  // Hawkeye II  (Kate Bishop) — display-name conflict with id 313 (Clint, rescued)
  688,  // Venom II    (Angelo Fortunato) — display-name conflict with id 687 (Eddie, rescued)
])
```

**Post-first-run audit step.** The build script prints a list of any remaining display-name collisions in the final pool, so the user can extend `DROP_IDS` after the first run if other confirmed-Marvel entries cause issues. (Examples to investigate: `Black Widow II`, `Ms Marvel II`, multiple `Captain Marvel` iterations.) This audit is a one-time human review step; not automated.

**Final pool size estimate:** 339 confirmed + 23 rescued − 3 known display-name conflicts ≈ **~359 heroes**, pending the post-first-run audit.

## Runtime changes

### Deletions
- `src/services/superheroApi.js` — removed entirely.
- `src/data/marvelHeroes.js` — removed entirely.

### `src/hooks/useGame.js` — significant simplification

- Import `heroes` synchronously: `import heroesData from '../data/heroes.json'`.
- `loadRound()` becomes a synchronous helper that picks 4 random heroes from the filtered pool and returns them.
- The `'loading'` phase is **removed from the state machine** entirely. Phases become: `welcome → playing → revealed → playing → … → gameover`.
- `prefetchRef` and the prefetch logic are removed.
- `nextRound(currentRound, currentScore)` no longer needs `await` — the round transitions in one render.
- The `'Not enough heroes loaded'` error path is removed (impossible by construction).
- Public API of the hook stays the same shape (`startGame`, `useHint`, `submitAnswer`, `nextRound`, `restartGame`) so `App.jsx` and `GameBoard.jsx` need only minor adjustments.

### `src/components/GameBoard.jsx`
- Loading-spinner branch removed.

### `src/components/AnswerOptions.jsx`
- Remove `referrerPolicy="no-referrer"` and `loading="lazy"` (rationale no longer applies; portraits are now same-origin static assets).

### `src/components/HintPanel.jsx`
- No code changes — field names are preserved.

### `src/App.jsx`
- The `'loading'` case in the phase switch is removed.

## Edge cases

- **Hero with missing optional fields** (e.g. no occupation, no `full-name`). Already handled by existing components via `||` fallbacks. No new code.
- **Build-script run with no token.** Abort with a clear stderr message; exit code 1.
- **Build-script run with an expired token.** API returns `response: "error"` per call. Script logs the error count and exits 1 if all calls failed; partial failures (some IDs OK, some not) log the failures and continue.
- **A portrait fails to download mid-run.** Hero is excluded from `heroes.json` for that run. Error logged. Re-run will retry.
- **API adds a new character with id 732+.** `MAX_ID` constant in the script needs bumping. Future maintenance task; not automated.
- **Daily challenge.** The seeded random-selection logic in the daily-challenge code reads from the same hero array. Pool size changes from ~140 to ~352 heroes; the seed-to-hero mapping changes. Today's daily-challenge result will be different after deploy. Acceptable — the daily challenge is a thin layer and this is a one-time discontinuity.

## File layout summary

```
scripts/
  fetch-heroes.mjs              # NEW — production build script
  enumerate-marvel.mjs          # recon (delete after merge — kept now for reference)
  sweep-rescue.mjs              # recon (delete after merge — kept now for reference)
  marvel-catalog.json           # recon output (gitignored)
  rescue-candidates.json        # recon output (gitignored)
  full-universe.json            # recon output (gitignored, ~2 MB)

src/
  data/
    heroes.json                 # NEW — committed, ~400–500 KB
    marvelHeroes.js             # DELETED
  services/
    superheroApi.js             # DELETED
  hooks/
    useGame.js                  # significantly simplified
  components/
    GameBoard.jsx               # loading branch removed
    AnswerOptions.jsx           # img attrs cleaned up

public/
  portraits/                    # NEW — committed, ~15 MB total
    1.webp
    4.webp
    ...
    731.webp

CLAUDE.md                       # updated — API setup section removed, build-script docs added
package.json                    # adds "fetch-heroes" script and `sharp` devDependency
.env.example                    # adds explanatory comment that token is build-only
.gitignore                      # adds scripts/*.json
```

## Out-of-scope (deliberately not doing)

- Sourcing portraits for characters absent from the API (after the rescue sweep, the iconic-Marvel coverage is satisfactory).
- Multiple portrait resolutions or a `srcset`.
- A web UI for editing the curation list.
- Migrating away from the seeded-randomness approach in daily challenge.
- A `prebuild` hook to regenerate `heroes.json` automatically — explicit `npm run fetch-heroes` is preferred.

## Implementation order (preview, not prescriptive)

The implementation plan should sequence roughly:

1. Add `sharp` devDep, write `scripts/fetch-heroes.mjs`, run it locally, commit `src/data/heroes.json` + `public/portraits/`.
2. Refactor `useGame.js` to read from the bundle and remove the loading phase.
3. Update `App.jsx` and `GameBoard.jsx` to drop loading branches.
4. Clean up `AnswerOptions.jsx` `<img>` attrs.
5. Delete `src/services/superheroApi.js` and `src/data/marvelHeroes.js`.
6. Update `CLAUDE.md` and `.env.example`.
7. Manual smoke test (play a few rounds, daily challenge, all categories).
8. PR.

---

## Addendum (2026-04-16, post-implementation discovery)

### The "server-side fetch works" assumption was wrong

The §Image processing section claimed:

> Server-side fetch; the Cloudflare bot challenge does not apply to direct script requests with a normal `User-Agent`.

During Task 3 implementation we discovered this is **not true**. `superherodb.com` returns `HTTP 403` + `cf-mitigated: challenge` to **all** non-browser requests — curl, Node `fetch`, and third-party image proxies (`images.weserv.nl`) — regardless of `User-Agent`, `Accept`, `sec-ch-ua-*`, or `sec-fetch-*` headers. The detection uses TLS fingerprinting (JA3) and/or JS-challenge cookies (`cf_clearance`) that only a real browser can satisfy.

### Revised portrait pipeline: manual-assisted download

The pipeline splits into two invocations with a browser-based step in the middle:

**Phase 1 — `npm run fetch-heroes` (automated, ~30s)**
- Enumerate the API (the API endpoint `superheroapi.com` is *not* behind the same bot protection as the CDN — server-side fetch works here).
- Apply `RESCUE_IDS` / `DROP_IDS` / publisher filter / portrait-presence filter / category derivation.
- Write `scripts/portrait-snippet.js` — a self-contained JS snippet containing the portrait URLs and download logic.
- Write `scripts/heroes-metadata.json` — intermediate metadata (gitignored).
- Print Phase-2 instructions and exit.

**Phase 2 — browser (manual, ~2 minutes)**
1. Open `https://www.superherodb.com` and pass any human-check (sets `cf_clearance` cookie).
2. DevTools → Console → paste contents of `scripts/portrait-snippet.js`.
3. Click "Allow" on Chrome's multiple-downloads prompt.
4. ~360 files save to `~/Downloads/` as `mm-<id>.jpg`.

The snippet works because `fetch()` from a tab on `superherodb.com` to resources on the same origin carries the `cf_clearance` cookie, which Cloudflare accepts.

**Phase 3 — `npm run fetch-heroes -- --process` (automated, ~30s)**
- Read `mm-*.jpg` files from `~/Downloads/` (configurable via `--source=<path>`).
- For each hero in `heroes-metadata.json`, run `sharp` → WebP → `public/portraits/<id>.webp`.
- Rewrite `image.url` fields and write final `src/data/heroes.json`.
- Clean up intermediate files.

### Impact on other sections

- **§Image processing** — the "Source" bullet changes from "server-side fetch" to "user's browser after cf_clearance is set". `sharp` transform and output format are unchanged.
- **§Build script** — behaviour list expanded; the script now has two modes (`--process` flag toggles between them).
- **§File layout** — adds `scripts/portrait-snippet.js` (build-time only, gitignored), `scripts/heroes-metadata.json` (build-time only, gitignored).
- **§Non-goals** — no change, but note that Playwright/headless-Chromium automation was considered and rejected in favour of the manual workflow to avoid a 300 MB devDependency.

### Browser compatibility note

Chrome/Edge (Chromium) are known to work. Firefox and Safari may behave differently re. multiple-download prompts; the rehydration snippet uses widely-supported APIs (`fetch`, `Blob`, `URL.createObjectURL`, `<a download>`), so they *should* work, but haven't been tested. Recommend using Chrome for the Phase 2 step.
