# Pre-bundled Hero Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the runtime Superhero API integration with a build-time Node script that pre-fetches ~360 Marvel heroes' data + portraits into `src/data/heroes.json` and `public/portraits/*.webp`. The browser bundle becomes self-contained — no API token, no fetch failures, no Cloudflare CDN dependency.

**Architecture:** A new `scripts/fetch-heroes.mjs` enumerates IDs 1–731 from the Superhero API, applies an inclusion rule (`publisher === "Marvel Comics"` ∪ rescue list, − drop list), downloads portraits via `sharp` to WebP, and writes a single sorted `heroes.json`. Runtime code (`useGame.js`, components) drops the API client, the loading phase, and the prefetch dance — rounds become synchronous.

**Tech Stack:** Node 20 ESM, `sharp` (devDependency for image processing), existing React 19 + Vite 7 + Tailwind v4. No new production dependencies.

**Spec:** `docs/superpowers/specs/2026-04-16-prebundled-hero-data-design.md`

**Testing note:** The project has no test runner (per `CLAUDE.md`), and adding one is out of scope. The build script gets verified by running it and inspecting output (assertions printed to stderr, file shape checks); React refactor gets verified by `npm run dev` + manual smoke testing. Where TDD would normally apply, this plan substitutes "write the code → run the verification command → confirm expected output."

---

## Task 1: Install `sharp` as a devDependency and scaffold the script file

**Files:**
- Modify: `package.json`
- Create: `scripts/fetch-heroes.mjs`

- [ ] **Step 1: Install sharp**

Run from repo root:

```bash
npm install --save-dev sharp
```

Expected: `package.json` and `package-lock.json` updated; `sharp` appears in `devDependencies`. No vulnerabilities should be introduced (run `npm audit` if curious; non-blocking).

- [ ] **Step 2: Create the script scaffold**

Create `scripts/fetch-heroes.mjs` with the following content:

```javascript
#!/usr/bin/env node
/**
 * Build-time fetcher: pulls every Marvel character from the Superhero API,
 * downloads + re-encodes portraits as WebP, and writes a self-contained
 * src/data/heroes.json that the runtime imports synchronously.
 *
 * Usage:
 *   node scripts/fetch-heroes.mjs              # full run (~360 heroes)
 *   node scripts/fetch-heroes.mjs --limit=5    # smoke-test mode
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'
import { Buffer } from 'node:buffer'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

console.log('scaffold OK')
```

- [ ] **Step 3: Verify the script runs**

```bash
node scripts/fetch-heroes.mjs
```

Expected output: `scaffold OK`. If it errors with "Cannot find package 'sharp'" the install failed — re-run Step 1.

- [ ] **Step 4: Add npm script**

Modify `package.json`. In the `"scripts"` block, add a `"fetch-heroes"` entry. After:

```json
    "preview": "vite preview"
```

…add a comma and the new line so the block reads:

```json
    "preview": "vite preview",
    "fetch-heroes": "node scripts/fetch-heroes.mjs"
```

Verify:

```bash
npm run fetch-heroes
```

Expected: `scaffold OK` (same as Step 3, but invoked through npm).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json scripts/fetch-heroes.mjs
git commit -m "Scaffold fetch-heroes build script and add sharp devDep"
```

---

## Task 2: Implement single-hero API fetch with retry

**Files:**
- Modify: `scripts/fetch-heroes.mjs`

- [ ] **Step 1: Add token loading + config + fetcher**

Replace the body of `scripts/fetch-heroes.mjs` (everything after the imports) with:

```javascript
const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// --- Config ---
const MAX_ID = 731
const BATCH = 10
const SLEEP_MS = 100

// --- Token ---
const envText = readFileSync(resolve(ROOT, '.env'), 'utf8')
const token = envText.match(/VITE_SUPERHERO_API_TOKEN=(.+)/)?.[1]?.trim()
if (!token) {
  console.error('Missing VITE_SUPERHERO_API_TOKEN in .env')
  process.exit(1)
}
const BASE = `https://www.superheroapi.com/api.php/${token}`

// --- CLI ---
const limitArg = process.argv.find(a => a.startsWith('--limit='))
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : null

// --- API fetch with one retry on 5xx / network error ---
async function fetchHero(id) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${BASE}/${id}`)
      if (!res.ok) {
        if (res.status >= 500 && attempt === 0) {
          await sleep(500)
          continue
        }
        return null
      }
      const data = await res.json()
      if (data.response === 'error') return null
      return data
    } catch {
      if (attempt === 0) {
        await sleep(500)
        continue
      }
    }
  }
  return null
}

// --- Smoke test ---
const probe = await fetchHero(213)
if (!probe || probe.name !== 'Deadpool') {
  console.error('FAIL: probe expected Deadpool, got:', probe?.name)
  process.exit(1)
}
console.log(`OK: probe id=213 returned name="${probe.name}"`)
```

- [ ] **Step 2: Run the script**

```bash
npm run fetch-heroes
```

Expected output: `OK: probe id=213 returned name="Deadpool"`. If the API is down or the token is wrong, the smoke check fails — fix before continuing.

- [ ] **Step 3: Commit**

```bash
git add scripts/fetch-heroes.mjs
git commit -m "Add Superhero API fetcher with retry and smoke probe"
```

---

## ⚠️ Tasks 3–6: SUPERSEDED

> Tasks 3, 4, 5, and 6 below are the **original** plan for the portrait pipeline. They're retained for reference but are **not** the implementation path.
>
> **What went wrong:** Task 3's implementation attempt (commit `299b94a`) revealed that Cloudflare returns `403` + `cf-mitigated: challenge` on any non-browser request to `superherodb.com`, regardless of `User-Agent`, `Accept-CH`, or other spoofable headers. The spec's assumption that "server-side fetch works" was incorrect (see the spec addendum at `docs/superpowers/specs/2026-04-16-prebundled-hero-data-design.md`).
>
> **New path:** See the **Revised Tasks 3r–6r** section at the end of this plan. The revised workflow splits the script into a Phase 1 (automated metadata + snippet) → Phase 2 (browser-assisted download by pasting a JS snippet into superherodb.com's DevTools console) → Phase 3 (automated image processing) pipeline.
>
> Task 4's category-derivation logic is preserved in `Revised Task 3r` (integrated into Phase 1).

---

## Task 3: Implement portrait download + sharp WebP encoding — Original text retained for reference

**Files:**
- Modify: `scripts/fetch-heroes.mjs`

- [ ] **Step 1: Add the downloader and a smoke test**

In `scripts/fetch-heroes.mjs`, **above** the `// --- Smoke test ---` block, insert:

```javascript
// --- Portrait download + WebP encode ---
async function downloadPortrait(url, outPath) {
  const res = await fetch(url, {
    headers: {
      // Mimic a normal browser UA so the upstream CDN doesn't 403.
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
    },
  })
  if (!res.ok) throw new Error(`portrait fetch failed: ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await sharp(buf)
    .resize({ width: 512, height: 512, fit: 'cover', position: 'top' })
    .webp({ quality: 82 })
    .toFile(outPath)
}
```

Then **replace** the `// --- Smoke test ---` block with:

```javascript
// --- Smoke test ---
const probe = await fetchHero(213)
if (!probe || probe.name !== 'Deadpool') {
  console.error('FAIL: probe expected Deadpool, got:', probe?.name)
  process.exit(1)
}
console.log(`OK: API probe id=213 returned name="${probe.name}"`)

const tmpPath = resolve(ROOT, 'scripts/_probe.webp')
await downloadPortrait(probe.image.url, tmpPath)
const { statSync, unlinkSync } = await import('node:fs')
const size = statSync(tmpPath).size
unlinkSync(tmpPath)
if (size < 1000 || size > 200_000) {
  console.error(`FAIL: probe portrait size ${size} bytes outside [1k, 200k]`)
  process.exit(1)
}
console.log(`OK: portrait probe wrote ${size} bytes WebP`)
```

- [ ] **Step 2: Run the script**

```bash
npm run fetch-heroes
```

Expected output:
```
OK: API probe id=213 returned name="Deadpool"
OK: portrait probe wrote <NNNN> bytes WebP
```

The portrait probe value will typically land between 20,000 and 60,000 bytes. If it fails with a 403, the upstream CDN may have changed; check the URL it tried (`probe.image.url`) and verify in a browser.

- [ ] **Step 3: Commit**

```bash
git add scripts/fetch-heroes.mjs
git commit -m "Add portrait download + sharp WebP encoder with smoke test"
```

---

## Task 4: Implement category derivation + assertions

**Files:**
- Modify: `scripts/fetch-heroes.mjs`

- [ ] **Step 1: Add the category function**

In `scripts/fetch-heroes.mjs`, **above** the `// --- Smoke test ---` block, insert:

```javascript
// --- Category derivation ---
function deriveCategory(hero) {
  const groups = hero.connections?.['group-affiliation'] || ''
  if (/x[- ]?men/i.test(groups)) return 'xmen'
  if (hero.biography?.alignment === 'bad') return 'villain'
  return 'hero'
}
```

- [ ] **Step 2: Add category assertions to the smoke test**

**Append** to the smoke-test block (after the portrait probe):

```javascript
// Category assertions (IDs verified against the recon catalog)
const cyclops = await fetchHero(196)
const magneto = await fetchHero(423)
const ironMan = await fetchHero(346)
if (!cyclops || !magneto || !ironMan) {
  console.error('FAIL: one of the category-probe IDs returned no data')
  process.exit(1)
}
if (deriveCategory(cyclops) !== 'xmen') {
  console.error(`FAIL: Cyclops category = ${deriveCategory(cyclops)}, want xmen`)
  process.exit(1)
}
// Magneto's affiliation field contains "X-Men", so the heuristic returns
// 'xmen' even though alignment is 'bad'. Both readings are defensible.
if (deriveCategory(magneto) !== 'xmen' && deriveCategory(magneto) !== 'villain') {
  console.error(`FAIL: Magneto category = ${deriveCategory(magneto)}`)
  process.exit(1)
}
if (deriveCategory(ironMan) !== 'hero') {
  console.error(`FAIL: Iron Man category = ${deriveCategory(ironMan)}, want hero`)
  process.exit(1)
}
console.log(`OK: categories Cyclops=${deriveCategory(cyclops)} Magneto=${deriveCategory(magneto)} Iron Man=${deriveCategory(ironMan)}`)
```

(Magneto's category accepts either `xmen` or `villain` because his `group-affiliation` field varies; both are defensible answers.)

- [ ] **Step 3: Run the script**

```bash
npm run fetch-heroes
```

Expected output ends with:
```
OK: categories Cyclops=xmen Magneto=<xmen|villain> Iron Man=hero
```

- [ ] **Step 4: Commit**

```bash
git add scripts/fetch-heroes.mjs
git commit -m "Add category derivation and assertions to fetch script"
```

---

## Task 5: Implement the full pipeline (selection, dedup, download, write)

**Files:**
- Modify: `scripts/fetch-heroes.mjs`

- [ ] **Step 1: Replace the smoke test block with the full pipeline**

**Delete** the entire `// --- Smoke test ---` block (the Deadpool probe, portrait probe, and category assertions added in Tasks 2–4).

**In its place, append** the following:

```javascript
// --- Selection lists ---
const RESCUE_IDS = new Set([
  9,    // Agent 13 (Sharon Carter)
  24,   // Angel (Warren Worthington III)
  26,   // Angel Salvadore
  30,   // Ant-Man (Hank Pym)
  34,   // Anti-Venom
  48,   // Atlas
  135,  // Box IV
  157,  // Captain Marvel (Carol Danvers)
  170,  // Chameleon
  213,  // Deadpool
  288,  // Gog
  313,  // Hawkeye (Clint Barton)
  356,  // Jean Grey
  361,  // Jessica Jones
  379,  // Kang
  577,  // Scarlet Spider
  581,  // Scorpion (Mac Gargan)
  614,  // Speedball
  659,  // Thor (Odinson)
  687,  // Venom (Eddie Brock)
  693,  // Vindicator
  697,  // Vision
  707,  // Warpath
])

const DROP_IDS = new Set([
  31,   // Ant-Man II  (Scott Lang) — display-name conflict with id 30
  314,  // Hawkeye II  (Kate Bishop) — display-name conflict with id 313
  688,  // Venom II    (Angelo Fortunato) — display-name conflict with id 687
])

// --- Phase 1: enumerate ---
console.log('Phase 1: enumerating Superhero API...')
const all = []
const fetchErrors = []
for (let start = 1; start <= MAX_ID; start += BATCH) {
  const ids = Array.from({ length: BATCH }, (_, i) => start + i).filter(
    i => i <= MAX_ID,
  )
  const results = await Promise.all(
    ids.map(id => fetchHero(id).then(d => [id, d])),
  )
  for (const [id, data] of results) {
    if (data) all.push(data)
    else fetchErrors.push(id)
  }
  process.stdout.write(`\r  fetched ${all.length} / ${start + BATCH - 1}`)
  await sleep(SLEEP_MS)
}
process.stdout.write('\n')
if (fetchErrors.length) {
  console.log(
    `  ${fetchErrors.length} IDs returned no data (mostly the 404 tail above id 731)`,
  )
}

// --- Phase 2: select + dedup ---
console.log('Phase 2: selecting + deduping...')
let selected = all.filter(h => {
  const idNum = Number(h.id)
  if (DROP_IDS.has(idNum)) return false
  const isConfirmed = h.biography?.publisher === 'Marvel Comics'
  const isRescued = RESCUE_IDS.has(idNum)
  return isConfirmed || isRescued
})
selected = selected.filter(
  h => h.image?.url && !h.image.url.includes('no-portrait'),
)
console.log(`  selected ${selected.length} heroes`)

if (LIMIT) {
  selected = selected.slice(0, LIMIT)
  console.log(`  --limit=${LIMIT} → trimmed to ${selected.length}`)
}

// --- Phase 3: portraits ---
console.log('Phase 3: downloading portraits + writing WebP...')
const PORTRAIT_DIR = resolve(ROOT, 'public/portraits')
mkdirSync(PORTRAIT_DIR, { recursive: true })
const portraitFailures = []
let portraitsDone = 0
let portraitsSkipped = 0
for (const hero of selected) {
  const outPath = resolve(PORTRAIT_DIR, `${hero.id}.webp`)
  if (existsSync(outPath)) {
    portraitsSkipped++
  } else {
    try {
      await downloadPortrait(hero.image.url, outPath)
      portraitsDone++
      process.stdout.write(
        `\r  downloaded ${portraitsDone}, skipped ${portraitsSkipped}`,
      )
    } catch (e) {
      portraitFailures.push({ id: hero.id, name: hero.name, error: e.message })
      continue
    }
  }
  hero.image.url = `/portraits/${hero.id}.webp`
}
process.stdout.write('\n')
console.log(
  `  downloaded ${portraitsDone}, skipped ${portraitsSkipped} (already on disk)`,
)
if (portraitFailures.length) {
  console.log(`  ${portraitFailures.length} portrait failures:`)
  portraitFailures.forEach(f =>
    console.log(`    id=${f.id} ${f.name}: ${f.error}`),
  )
}
selected = selected.filter(
  h => !portraitFailures.find(f => f.id === h.id),
)

// --- Phase 4: categories + write JSON ---
console.log('Phase 4: deriving categories + writing heroes.json...')
const categoryCounts = { hero: 0, xmen: 0, villain: 0 }
for (const hero of selected) {
  hero.category = deriveCategory(hero)
  categoryCounts[hero.category]++
}
selected.sort((a, b) => Number(a.id) - Number(b.id))
const outFile = resolve(ROOT, 'src/data/heroes.json')
writeFileSync(outFile, JSON.stringify(selected, null, 2) + '\n')
console.log(`  wrote ${selected.length} heroes → src/data/heroes.json`)
console.log(
  `  categories: hero=${categoryCounts.hero}, xmen=${categoryCounts.xmen}, villain=${categoryCounts.villain}`,
)

// --- Phase 5: display-name collision audit ---
console.log('Phase 5: display-name collision audit...')
const byName = new Map()
for (const h of selected) {
  if (!byName.has(h.name)) byName.set(h.name, [])
  byName.get(h.name).push(h.id)
}
const collisions = [...byName.entries()].filter(([, ids]) => ids.length > 1)
if (collisions.length) {
  console.log(
    `  ${collisions.length} display-name collision(s) — consider adding to DROP_IDS:`,
  )
  collisions.forEach(([name, ids]) =>
    console.log(`    "${name}": ${ids.join(', ')}`),
  )
} else {
  console.log('  no display-name collisions')
}

console.log('\nDone.')
```

- [ ] **Step 2: Run with `--limit=5` to smoke-test the pipeline**

```bash
npm run fetch-heroes -- --limit=5
```

Expected output (counts approximate):
```
Phase 1: enumerating Superhero API...
  fetched ~731 / 740
  ~9 IDs returned no data ...
Phase 2: selecting + deduping...
  selected ~359 heroes
  --limit=5 → trimmed to 5
Phase 3: downloading portraits + writing WebP...
  downloaded 5, skipped 0 (already on disk)
Phase 4: deriving categories + writing heroes.json...
  wrote 5 heroes → src/data/heroes.json
  categories: hero=N, xmen=N, villain=N
Phase 5: display-name collision audit...
  no display-name collisions
Done.
```

- [ ] **Step 3: Inspect the smoke-run output**

```bash
ls -la public/portraits/ | head -10
node -e "const d = JSON.parse(require('fs').readFileSync('src/data/heroes.json')); console.log('count:', d.length); console.log('first:', JSON.stringify(d[0], null, 2).slice(0, 500))"
```

Expected:
- 5 `.webp` files in `public/portraits/`, each ~20–60 KB
- `heroes.json` contains an array of 5 entries
- Each entry has `id`, `name`, `category`, `image.url` (rewritten to `/portraits/<id>.webp`), `biography`, `powerstats`, `work`, `appearance`

- [ ] **Step 4: Clean up the smoke-test artifacts before the full run**

```bash
rm -rf public/portraits src/data/heroes.json
```

This prevents the smoke-test 5 files from polluting the final commit. The full run in Task 6 will regenerate everything from scratch.

- [ ] **Step 5: Commit**

```bash
git add scripts/fetch-heroes.mjs
git commit -m "Implement full fetch-heroes pipeline (select, dedup, portraits, JSON)"
```

---

## Task 6: Run the full fetch and commit the generated artifacts

**Files:**
- Create: `src/data/heroes.json` (~400–500 KB)
- Create: `public/portraits/*.webp` (~360 files, ~14 MB total)

- [ ] **Step 1: Confirm `.env` has a valid token**

```bash
grep -c VITE_SUPERHERO_API_TOKEN= .env
```

Expected: `1`. The value after `=` must be the actual API token (not blank). If blank, get a token from https://superheroapi.com/api.html and put it in `.env`.

- [ ] **Step 2: Run the full fetch**

```bash
npm run fetch-heroes
```

Expected duration: 2–4 minutes (depends on portrait download speeds). Progress is printed inline. Final output:

```
Phase 4: ...
  wrote ~359 heroes → src/data/heroes.json
  categories: hero=NNN, xmen=NN, villain=NN
Phase 5: display-name collision audit...
  no display-name collisions  (or a small list — investigate before committing)
Done.
```

If Phase 5 reports collisions, decide per name whether to add the conflicting ID to `DROP_IDS` in `scripts/fetch-heroes.mjs`. Re-run after editing — the script is idempotent, portraits already on disk are skipped.

- [ ] **Step 3: Sanity-check the output**

```bash
ls public/portraits/ | wc -l
du -sh public/portraits/
node -e "
const d = JSON.parse(require('fs').readFileSync('src/data/heroes.json'));
console.log('total:', d.length);
const byCat = {};
d.forEach(h => byCat[h.category] = (byCat[h.category]||0)+1);
console.log('by category:', byCat);
console.log('sample iconic:');
['Deadpool','Vision','Jean Grey','Captain Marvel','Thor','Hawkeye','Venom','Spider-Man','Iron Man','Wolverine'].forEach(n => {
  const h = d.find(x => x.name === n);
  console.log('  ', n, h ? \`OK id=\${h.id} cat=\${h.category} portrait=\${h.image.url}\` : 'MISSING');
});
"
```

Expected:
- File count matches the JSON entry count (~359 each)
- Total size of `public/portraits/` between 8 MB and 25 MB
- All ten iconic-name probes resolve (none "MISSING")

- [ ] **Step 4: Commit the generated artifacts**

```bash
git add src/data/heroes.json public/portraits/
git commit -m "Generate bundled hero data and portraits (~360 Marvel heroes)"
```

---

## Task 7: Refactor `useGame.js` to read the bundle synchronously

**Files:**
- Modify: `src/hooks/useGame.js`

The current hook is async-heavy (loadRound, prefetch, error handling). We're flattening it: import the JSON, pick 4 random heroes, no `await`, no loading phase.

- [ ] **Step 1: Read the current hook to capture its public API**

```bash
cat src/hooks/useGame.js
```

Note the names of every exported method on the returned object — they MUST stay identical (`startGame`, `useHint`, `submitAnswer`, `nextRound`, `restartGame`) so consuming components don't break.

- [ ] **Step 2: Replace the file contents**

Overwrite `src/hooks/useGame.js` with:

```javascript
/**
 * @fileoverview Game state machine. Reads heroes from the pre-bundled
 * src/data/heroes.json — no network at runtime.
 */
import { useCallback, useState } from 'react'
import heroesData from '../data/heroes.json'
import { playGameOver } from '../services/sounds'

const ROUNDS = 10
const POINTS = [3, 2, 1, 0]
export const MAX_SCORE = ROUNDS * POINTS[0]

const HEROES = heroesData

/**
 * Filter the hero pool by category. `null` → all heroes.
 */
function filterPool(category) {
  if (!category) return HEROES
  return HEROES.filter(h => h.category === category)
}

/**
 * Pick a fresh round: one mystery hero + 3 distractors of the same shape.
 * Returns { hero, options }.
 */
function buildRound(pool) {
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  const four = shuffled.slice(0, 4)
  const hero = four[0]
  const options = four.map(h => ({ name: h.name, image: h.image }))
  // Shuffle option order so the correct answer isn't always first.
  options.sort(() => Math.random() - 0.5)
  return { hero, options }
}

export default function useGame() {
  const [phase, setPhase] = useState('welcome') // welcome | playing | revealed | gameover
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [currentHero, setCurrentHero] = useState(null)
  const [options, setOptions] = useState([])
  const [hintsUsed, setHintsUsed] = useState(0)
  const [result, setResult] = useState(null) // 'correct' | 'wrong' | null
  const [streak, setStreak] = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)
  const [history, setHistory] = useState([])
  const [pool, setPool] = useState(HEROES)

  const startGame = useCallback(category => {
    const filtered = filterPool(category)
    const { hero, options } = buildRound(filtered)
    setPool(filtered)
    setRound(1)
    setScore(0)
    setHintsUsed(0)
    setResult(null)
    setStreak(0)
    setMaxStreak(0)
    setHistory([])
    setCurrentHero(hero)
    setOptions(options)
    setPhase('playing')
  }, [])

  const useHint = useCallback(() => {
    setHintsUsed(h => (h < 3 ? h + 1 : h))
  }, [])

  const submitAnswer = useCallback(
    name => {
      if (phase !== 'playing' || !currentHero) return
      const correct = name === currentHero.name
      const earned = correct ? POINTS[hintsUsed] : 0
      setScore(s => s + earned)
      setResult(correct ? 'correct' : 'wrong')
      setStreak(prev => {
        const next = correct ? prev + 1 : 0
        setMaxStreak(m => Math.max(m, next))
        return next
      })
      setHistory(h => [...h, { correct, hintsUsed }])
      setPhase('revealed')
    },
    [phase, currentHero, hintsUsed],
  )

  const nextRound = useCallback(
    (currentRound, _currentScore) => {
      if (currentRound >= ROUNDS) {
        playGameOver()
        setPhase('gameover')
        return
      }
      const { hero, options } = buildRound(pool)
      setCurrentHero(hero)
      setOptions(options)
      setHintsUsed(0)
      setResult(null)
      setRound(r => r + 1)
      setPhase('playing')
    },
    [pool],
  )

  const restartGame = useCallback(() => {
    setPhase('welcome')
  }, [])

  return {
    phase,
    round,
    score,
    currentHero,
    options,
    hintsUsed,
    result,
    streak,
    maxStreak,
    history,
    startGame,
    useHint,
    submitAnswer,
    nextRound,
    restartGame,
  }
}
```

Key changes vs. the previous hook:

- `loading` phase removed entirely (impossible state).
- `loadRound`, `prefetchRef`, async/await, error throwing — all gone.
- `startGame` and `nextRound` are synchronous (`nextRound` keeps its `(currentRound, _currentScore)` signature — `_currentScore` ignored — so `GameBoard.jsx` doesn't need to change its call site).

- [ ] **Step 3: Quick read-back to confirm no remnant references**

```bash
grep -n "loading\|prefetch\|loadRound\|searchHero" src/hooks/useGame.js
```

Expected: no matches.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useGame.js
git commit -m "Refactor useGame to read bundled hero data synchronously"
```

---

## Task 8: Remove the loading branch from `App.jsx`

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Read the current file**

```bash
cat src/App.jsx
```

Locate the phase switch. There will be a branch handling `'loading'` (or it may fall through to `GameBoard` for both `'loading'` and `'playing'`).

- [ ] **Step 2: Remove any explicit `'loading'` branch**

If `App.jsx` has an explicit case like:

```jsx
if (game.phase === 'loading') return <LoadingSpinner />
```

…delete it. If `'loading'` is mentioned in a fallthrough (e.g. `phase === 'playing' || phase === 'loading'` or in a phase-name array), simplify to just the remaining phases.

The final `App.jsx` switch should handle exactly: `'welcome'` → `WelcomeScreen`, `'gameover'` → `ResultScreen`, everything else → `GameBoard`.

- [ ] **Step 3: Verify no `'loading'` references remain**

```bash
grep -n "'loading'\|\"loading\"" src/App.jsx
```

Expected: no matches.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "Remove loading phase from App phase switch"
```

---

## Task 9: Remove the loading-spinner branch from `GameBoard.jsx`

**Files:**
- Modify: `src/components/GameBoard.jsx`

- [ ] **Step 1: Read the file**

```bash
cat src/components/GameBoard.jsx
```

- [ ] **Step 2: Remove the loading branch**

Locate any block conditioned on `phase === 'loading'` (or `!currentHero`, or `loading`-named state). Delete it. The component should render the score bar + hint panel + answer options unconditionally once `currentHero` is set, which it always is in the new state machine after `startGame`.

If there's a fallback like `if (!currentHero) return <Spinner />`, leave it — it's a safety net for the very first render frame, even though it won't normally trigger. Use judgment: if removal makes the component cleaner without introducing a flash, remove it; otherwise keep.

- [ ] **Step 3: Verify**

```bash
grep -n "loading\|Spinner\|Loader" src/components/GameBoard.jsx
```

Expected: either no matches, or only a defensive `if (!currentHero)` early-return.

- [ ] **Step 4: Commit**

```bash
git add src/components/GameBoard.jsx
git commit -m "Drop loading-spinner branch from GameBoard"
```

---

## Task 10: Clean up `<img>` attributes in `AnswerOptions.jsx`

**Files:**
- Modify: `src/components/AnswerOptions.jsx`

The `referrerPolicy="no-referrer"` and `loading="lazy"` attributes were added to work around CDN issues that no longer exist (portraits are now same-origin static assets).

- [ ] **Step 1: Edit the `<img>` tag**

In `src/components/AnswerOptions.jsx`, find the `<img>` element (around line 54). Replace:

```jsx
<img
  src={option.image?.url}
  alt={option.name}
  referrerPolicy="no-referrer"
  loading="lazy"
  className="w-full aspect-square object-cover object-top"
/>
```

…with:

```jsx
<img
  src={option.image?.url}
  alt={option.name}
  className="w-full aspect-square object-cover object-top"
/>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AnswerOptions.jsx
git commit -m "Drop no-longer-needed referrerPolicy/lazy attrs from AnswerOptions img"
```

---

## Task 11: Delete the dead service and data modules

**Files:**
- Delete: `src/services/superheroApi.js`
- Delete: `src/data/marvelHeroes.js`

- [ ] **Step 1: Confirm no remaining importers**

```bash
grep -rn "superheroApi\|marvelHeroes" src/
```

Expected: no matches. If anything still references these modules (most likely the daily-challenge logic), open the offending file and migrate the import to read from `../data/heroes.json` directly. If you find such an importer, **stop and resolve before deleting** — otherwise the build will fail.

- [ ] **Step 2: Delete the files**

```bash
git rm src/services/superheroApi.js src/data/marvelHeroes.js
```

- [ ] **Step 3: Verify the build succeeds**

```bash
npm run build
```

Expected: build completes successfully and writes to `dist/`. Any "module not found" or "cannot resolve" error means Step 1 missed an importer.

- [ ] **Step 4: Verify lint passes**

```bash
npm run lint
```

Expected: clean (or only pre-existing warnings unrelated to this change).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Delete obsolete superheroApi service and marvelHeroes data module"
```

---

## Task 12: Update documentation

**Files:**
- Modify: `CLAUDE.md`
- Modify: `.env.example`

- [ ] **Step 1: Update `.env.example`**

Replace the contents of `.env.example` with:

```
# Only required when running `npm run fetch-heroes` to regenerate
# src/data/heroes.json from the Superhero API. The runtime app does
# not read this — hero data is bundled at build time.
VITE_SUPERHERO_API_TOKEN=
```

- [ ] **Step 2: Update `CLAUDE.md`**

In `CLAUDE.md`:

1. **Update the "Commands" section** — add the new fetch script:

```bash
npm run dev            # Start dev server (localhost:5173)
npm run build          # Production build to dist/
npm run preview        # Preview production build
npm run lint           # Run ESLint
npm run fetch-heroes   # Regenerate src/data/heroes.json + public/portraits/ from the Superhero API (build-time only)
```

2. **Replace the "Environment" section** with:

```markdown
## Environment

The runtime app needs **no environment variables** — hero data and portraits are pre-bundled.

`VITE_SUPERHERO_API_TOKEN` is only required when running `npm run fetch-heroes` to regenerate the bundle. Get a token at https://superheroapi.com/api.html and put it in `.env`.
```

3. **Replace the "API layer" subsection** with:

```markdown
### Bundled hero data (`src/data/heroes.json`)

All hero records are pre-fetched at build time by `scripts/fetch-heroes.mjs` and committed to the repo. The runtime imports the JSON synchronously — no network calls during gameplay.

**Hero object shape:** Same field names as the Superhero API response (`full-name`, `first-appearance`, `hair-color`, etc.), plus a `category` field added at build time. `image.url` is rewritten to `/portraits/<id>.webp`.

**Portraits** live under `public/portraits/<id>.webp`, sized 512×512 max, WebP quality 82, served as same-origin static assets.

**To regenerate:** edit `RESCUE_IDS` / `DROP_IDS` in `scripts/fetch-heroes.mjs` if needed, then `npm run fetch-heroes`. The script is idempotent — re-runs skip portrait downloads that already exist on disk.
```

4. **Replace the "Hero pool" subsection** with:

```markdown
### Hero pool

~360 Marvel characters total. Each round samples 4 from a shuffled copy of the filtered pool (filter by `category`: `null` for all, `'hero'`, `'xmen'`, or `'villain'`).
```

5. **Update the "State machine" subsection** — the phase list should now read:

```
welcome → playing → revealed → (playing → revealed)×N → gameover
```

…and the **Prefetching** paragraph should be **deleted entirely**.

6. **Update the "File Reference" tree** — remove `superheroApi.js` and `marvelHeroes.js`, add `heroes.json` and the script + portraits directory:

```
src/
  ...
  data/
    heroes.json                 # ~360 Marvel heroes pre-fetched at build time
public/
  portraits/                    # WebP portraits, one per hero, named <id>.webp
scripts/
  fetch-heroes.mjs              # Build-time Superhero API fetcher
```

(Use judgment on small wording — preserve the existing prose style of `CLAUDE.md`.)

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md .env.example
git commit -m "Update docs to reflect build-time fetch of bundled hero data"
```

---

## Task 13: Delete the recon scripts

**Files:**
- Delete: `scripts/enumerate-marvel.mjs`
- Delete: `scripts/sweep-rescue.mjs`

These were one-shot reconnaissance for the spec; `fetch-heroes.mjs` supersedes them.

- [ ] **Step 1: Delete and commit**

```bash
git rm scripts/enumerate-marvel.mjs scripts/sweep-rescue.mjs
git commit -m "Remove one-shot recon scripts; fetch-heroes.mjs supersedes them"
```

---

## Task 14: Manual smoke test

**Files:** none

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Open http://localhost:5173 in a browser.

- [ ] **Step 2: Walk through the smoke checklist**

Verify every item:

- [ ] WelcomeScreen renders without errors
- [ ] All three category buttons (All / Heroes / X-Men / Villains — whatever the UI exposes) start a game
- [ ] First round shows portraits in the answer grid (no broken-image icons)
- [ ] Hint button reveals occupation, then appearance, then real name
- [ ] Submitting a wrong answer shows feedback and the correct answer
- [ ] Submitting a correct answer shows feedback and the streak increments
- [ ] "Next Hero" advances to round 2 with **no loading spinner** (transition is instant)
- [ ] Play through to round 10 → ResultScreen shows grade and score
- [ ] Restart from ResultScreen returns to WelcomeScreen
- [ ] Daily challenge mode (if exposed in WelcomeScreen) loads and plays through
- [ ] Open DevTools → Network tab while playing: **zero requests to `superheroapi.com` or `superherodb.com`**. Portraits load from `/portraits/<id>.webp` (same origin).

- [ ] **Step 3: Build + preview check**

```bash
npm run build
npm run preview
```

Open the preview URL and re-run the smoke checklist quickly. Confirms portraits resolve in the production build (`dist/`) too.

- [ ] **Step 4: Final lint + build sweep before PR**

```bash
npm run lint && npm run build
```

Expected: both clean.

---

# Revised Tasks 3r–6r (the actual implementation path)

These replace original Tasks 3–6. The revised workflow splits portrait acquisition into three phases:

- **Phase 1** (automated): `npm run fetch-heroes` → writes `scripts/portrait-snippet.js` + `scripts/heroes-metadata.json`
- **Phase 2** (manual in browser, ~2 min): user pastes the snippet into `superherodb.com`'s DevTools console, confirms the browser's "multiple downloads" prompt, ~360 `mm-<id>.jpg` files save to `~/Downloads/`
- **Phase 3** (automated): `npm run fetch-heroes -- --process` → reads downloaded files, runs `sharp` → WebP, writes `public/portraits/<id>.webp` + final `src/data/heroes.json`, cleans up intermediates

Tasks 3r and 4r build Phase 1. Task 5r builds Phase 3. Task 6r runs the full cycle end-to-end and commits artifacts. Tasks 7–14 (the React runtime refactor) are unchanged and run after Task 6r.

---

## Task 3r: Replace Task 3's broken downloader with in-memory enumeration + selection + category

**Files:**
- Modify: `scripts/fetch-heroes.mjs`

**Goal:** keep the Task 1/Task 2 imports, config, token, CLI, and `fetchHero()` in place. Remove the `downloadPortrait()` function and the portrait smoke probe from commit `299b94a`. In their place, add: `RESCUE_IDS`, `DROP_IDS`, `deriveCategory()`, and a "Phase 1 core" that enumerates, filters, and categorizes heroes — without writing any output files yet. The task ends by printing the selected count and category breakdown so we can verify before adding I/O.

- [ ] **Step 1: Remove the portrait block and replace with Phase 1 core**

**Delete** the existing `// --- Portrait download + WebP encode ---` section (the `downloadPortrait` function) AND the `// --- Smoke test ---` block below it (everything from `const probe = await fetchHero(213)` through the final `console.log(\`OK: portrait probe wrote ${size} bytes WebP\`)`).

**In their place, append** the following to the end of the file:

```javascript
// --- Selection lists ---
const RESCUE_IDS = new Set([
  9,    // Agent 13 (Sharon Carter)
  24,   // Angel (Warren Worthington III)
  26,   // Angel Salvadore
  30,   // Ant-Man (Hank Pym)
  34,   // Anti-Venom
  48,   // Atlas
  135,  // Box IV
  157,  // Captain Marvel (Carol Danvers)
  170,  // Chameleon
  213,  // Deadpool
  288,  // Gog
  313,  // Hawkeye (Clint Barton)
  356,  // Jean Grey
  361,  // Jessica Jones
  379,  // Kang
  577,  // Scarlet Spider
  581,  // Scorpion (Mac Gargan)
  614,  // Speedball
  659,  // Thor (Odinson)
  687,  // Venom (Eddie Brock)
  693,  // Vindicator
  697,  // Vision
  707,  // Warpath
])

const DROP_IDS = new Set([
  31,   // Ant-Man II  (Scott Lang) — display-name conflict with id 30
  314,  // Hawkeye II  (Kate Bishop) — display-name conflict with id 313
  688,  // Venom II    (Angelo Fortunato) — display-name conflict with id 687
])

// --- Category derivation ---
function deriveCategory(hero) {
  const groups = hero.connections?.['group-affiliation'] || ''
  if (/x[- ]?men/i.test(groups)) return 'xmen'
  if (hero.biography?.alignment === 'bad') return 'villain'
  return 'hero'
}

// --- Phase 1: enumerate API ---
console.log('Phase 1a: enumerating Superhero API...')
const all = []
const fetchErrors = []
for (let start = 1; start <= MAX_ID; start += BATCH) {
  const ids = Array.from({ length: BATCH }, (_, i) => start + i).filter(
    i => i <= MAX_ID,
  )
  const results = await Promise.all(
    ids.map(id => fetchHero(id).then(d => [id, d])),
  )
  for (const [id, data] of results) {
    if (data) all.push(data)
    else fetchErrors.push(id)
  }
  process.stdout.write(`\r  fetched ${all.length} / ${start + BATCH - 1}`)
  await sleep(SLEEP_MS)
}
process.stdout.write('\n')
if (fetchErrors.length) {
  console.log(`  ${fetchErrors.length} IDs returned no data`)
}

// --- Phase 1b: select + dedup + categorize ---
console.log('Phase 1b: selecting + deduping + categorizing...')
let selected = all.filter(h => {
  const idNum = Number(h.id)
  if (DROP_IDS.has(idNum)) return false
  const isConfirmed = h.biography?.publisher === 'Marvel Comics'
  const isRescued = RESCUE_IDS.has(idNum)
  return isConfirmed || isRescued
})
selected = selected.filter(
  h => h.image?.url && !h.image.url.includes('no-portrait'),
)
if (LIMIT) {
  selected = selected.slice(0, LIMIT)
  console.log(`  --limit=${LIMIT} → trimmed to ${selected.length}`)
}
const categoryCounts = { hero: 0, xmen: 0, villain: 0 }
for (const hero of selected) {
  hero.category = deriveCategory(hero)
  categoryCounts[hero.category]++
}
selected.sort((a, b) => Number(a.id) - Number(b.id))
console.log(`  selected ${selected.length} heroes`)
console.log(
  `  categories: hero=${categoryCounts.hero}, xmen=${categoryCounts.xmen}, villain=${categoryCounts.villain}`,
)

// --- Display-name collision audit ---
const byName = new Map()
for (const h of selected) {
  if (!byName.has(h.name)) byName.set(h.name, [])
  byName.get(h.name).push(h.id)
}
const collisions = [...byName.entries()].filter(([, ids]) => ids.length > 1)
if (collisions.length) {
  console.log(
    `  ⚠ ${collisions.length} display-name collision(s) — consider adding to DROP_IDS:`,
  )
  collisions.forEach(([name, ids]) =>
    console.log(`    "${name}": ${ids.join(', ')}`),
  )
}

console.log('\n(Phase 1 output-file writing not yet implemented — see Task 4r)')
```

- [ ] **Step 2: Verify the script runs end-to-end**

```bash
npm run fetch-heroes
```

Expected output shape:
```
Phase 1a: enumerating Superhero API...
  fetched ~731 / 740
  N IDs returned no data
Phase 1b: selecting + deduping + categorizing...
  selected ~359 heroes
  categories: hero=NNN, xmen=NN, villain=NN
  (possibly a collision warning)

(Phase 1 output-file writing not yet implemented — see Task 4r)
```

The script should exit cleanly (exit code 0) in ~30 seconds. Selected count should be in the 350–365 range.

- [ ] **Step 3: Smoke-test with `--limit=5`**

```bash
node scripts/fetch-heroes.mjs --limit=5
```

Expected: same as above but `selected 5 heroes`. Exit cleanly.

- [ ] **Step 4: Commit**

```bash
git add scripts/fetch-heroes.mjs
git commit -m "Replace broken portrait downloader with in-memory selection + categorization"
```

---

## Task 4r: Add Phase 1 output files (portrait snippet + heroes-metadata) and gitignore

**Files:**
- Modify: `scripts/fetch-heroes.mjs`
- Modify: `.gitignore`

**Goal:** after Task 3r's in-memory selection, write two files: `scripts/portrait-snippet.js` (browser-console JS with the portrait URLs hardcoded) and `scripts/heroes-metadata.json` (intermediate hero data used by Phase 3). Print Phase-2 instructions for the user.

- [ ] **Step 1: Add gitignore entries**

In `.gitignore`, in the "Recon script outputs" block, extend the list to include the Phase 1 intermediates:

```
# Recon script outputs (build artifacts, large)
scripts/full-universe.json
scripts/marvel-catalog.json
scripts/rescue-candidates.json
scripts/portrait-snippet.js
scripts/heroes-metadata.json
```

- [ ] **Step 2: Add the output-writing logic**

In `scripts/fetch-heroes.mjs`, find this line:

```javascript
console.log('\n(Phase 1 output-file writing not yet implemented — see Task 4r)')
```

**Replace it** with:

```javascript
// --- Phase 1c: write intermediates ---
console.log('Phase 1c: writing intermediate files...')

// heroes-metadata.json — full hero records, sorted by id
writeFileSync(
  resolve(ROOT, 'scripts/heroes-metadata.json'),
  JSON.stringify(selected, null, 2) + '\n',
)
console.log(`  wrote scripts/heroes-metadata.json (${selected.length} heroes)`)

// portrait-snippet.js — browser-console JS that downloads all portraits
const urls = selected.map(h => ({ id: h.id, url: h.image.url }))
const snippet = `// Auto-generated by scripts/fetch-heroes.mjs — do not edit by hand.
// Paste this entire block into the DevTools console on
// https://www.superherodb.com (after passing the human-check prompt).
// It fetches ${urls.length} portraits same-origin and saves each to your
// Downloads folder as mm-<id>.jpg. Chrome will prompt once to allow
// multiple downloads — click Allow.

(async () => {
  const urls = ${JSON.stringify(urls, null, 2)}
  let done = 0
  const failed = []
  for (const { id, url } of urls) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'mm-' + id + '.jpg'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(a.href)
      done++
      if (done % 20 === 0) console.log('downloaded ' + done + '/' + urls.length)
      await new Promise(r => setTimeout(r, 50))
    } catch (e) {
      failed.push({ id, error: e.message })
      console.error('failed id=' + id + ':', e.message)
    }
  }
  console.log('Complete: ' + done + ' downloaded, ' + failed.length + ' failed')
  if (failed.length) console.log('Failed IDs:', failed)
})()
`
writeFileSync(resolve(ROOT, 'scripts/portrait-snippet.js'), snippet)
console.log(`  wrote scripts/portrait-snippet.js (${urls.length} URLs)`)

// --- Phase 2 instructions ---
console.log('\n' + '='.repeat(60))
console.log('NEXT STEP — Phase 2 (manual, in your browser)')
console.log('='.repeat(60))
console.log('')
console.log('1. Open https://www.superherodb.com in a new browser tab.')
console.log('   Pass any human-check / CAPTCHA if prompted.')
console.log('2. Open DevTools (Cmd+Opt+I on Mac) → Console tab.')
console.log('3. Paste the entire contents of scripts/portrait-snippet.js')
console.log('   into the console and press Enter.')
console.log('4. Click "Allow" on the browser\\'s "multiple downloads" prompt.')
console.log(`5. Wait for "${urls.length} downloaded" to appear in the console.`)
console.log(`   Files save to ~/Downloads as mm-<id>.jpg`)
console.log('')
console.log('Then: npm run fetch-heroes -- --process')
console.log('(Task 5r will implement --process.)')
console.log('')
```

- [ ] **Step 3: Verify**

```bash
npm run fetch-heroes
```

Expected final section of output:
```
Phase 1c: writing intermediate files...
  wrote scripts/heroes-metadata.json (~359 heroes)
  wrote scripts/portrait-snippet.js (~359 URLs)

============================================================
NEXT STEP — Phase 2 (manual, in your browser)
============================================================
(instructions...)
```

Then verify the two files exist and are well-formed:

```bash
node -e "const d = JSON.parse(require('fs').readFileSync('scripts/heroes-metadata.json')); console.log('meta entries:', d.length, 'first name:', d[0].name, 'has category:', !!d[0].category)"
head -5 scripts/portrait-snippet.js
wc -l scripts/portrait-snippet.js
```

Expected: metadata entries ~359, first hero has a name + category, snippet file is >100 lines (~5 lines of banner + embedded URL array).

- [ ] **Step 4: Confirm files are gitignored**

```bash
git status
```

Expected: `scripts/portrait-snippet.js` and `scripts/heroes-metadata.json` do NOT appear in the untracked list (they're gitignored). Only `scripts/fetch-heroes.mjs` and `.gitignore` should show as modified.

- [ ] **Step 5: Commit**

```bash
git add scripts/fetch-heroes.mjs .gitignore
git commit -m "Write portrait-snippet.js and heroes-metadata.json in Phase 1"
```

---

## Task 5r: Implement Phase 3 (--process flag, image processing, final heroes.json)

**Files:**
- Modify: `scripts/fetch-heroes.mjs`

**Goal:** add a `--process` flag that skips Phase 1 (no API calls) and instead: reads `scripts/heroes-metadata.json`, finds corresponding `mm-<id>.jpg` files in `~/Downloads/` (or `--source=<path>`), runs each through `sharp` → WebP → `public/portraits/<id>.webp`, writes final `src/data/heroes.json` with rewritten `image.url` fields, and cleans up intermediates.

- [ ] **Step 1: Restructure CLI parsing and add process-mode branch**

In `scripts/fetch-heroes.mjs`, find the `// --- CLI ---` block and **replace it** with:

```javascript
// --- CLI ---
const limitArg = process.argv.find(a => a.startsWith('--limit='))
let LIMIT = null
if (limitArg) {
  const raw = limitArg.split('=')[1]
  const value = Number(raw)
  if (!Number.isInteger(value) || value <= 0) {
    console.error(`Invalid --limit value: "${raw}" (must be a positive integer)`)
    process.exit(1)
  }
  LIMIT = value
}

const sourceArg = process.argv.find(a => a.startsWith('--source='))
const SOURCE_DIR = sourceArg
  ? sourceArg.split('=')[1]
  : resolve(process.env.HOME || process.env.USERPROFILE || '/', 'Downloads')

const IS_PROCESS_MODE = process.argv.includes('--process')
```

- [ ] **Step 2: Add sharp import for the process branch**

Sharp is already imported at the top of the file from Task 1. No change needed — but confirm by checking the top of `scripts/fetch-heroes.mjs` has:

```javascript
import sharp from 'sharp'
```

- [ ] **Step 3: Add the process-mode implementation**

The Phase 1 code currently runs unconditionally. We need to skip it when `--process` is set. Find this line (near the top of the Phase 1 section):

```javascript
// --- Phase 1: enumerate API ---
console.log('Phase 1a: enumerating Superhero API...')
```

**Immediately above that line**, insert:

```javascript
// --- Process-mode branch: skip Phase 1 entirely ---
if (IS_PROCESS_MODE) {
  console.log('Phase 3: processing downloaded portraits...')
  console.log(`  source directory: ${SOURCE_DIR}`)

  const metaPath = resolve(ROOT, 'scripts/heroes-metadata.json')
  if (!existsSync(metaPath)) {
    console.error(
      `Missing ${metaPath}. Run 'npm run fetch-heroes' (no flag) first to do Phase 1.`,
    )
    process.exit(1)
  }
  const metadata = JSON.parse(readFileSync(metaPath, 'utf8'))

  const PORTRAIT_DIR = resolve(ROOT, 'public/portraits')
  mkdirSync(PORTRAIT_DIR, { recursive: true })

  const missing = []
  const encodeErrors = []
  let encoded = 0
  for (const hero of metadata) {
    const srcPath = resolve(SOURCE_DIR, `mm-${hero.id}.jpg`)
    if (!existsSync(srcPath)) {
      missing.push({ id: hero.id, name: hero.name })
      continue
    }
    const outPath = resolve(PORTRAIT_DIR, `${hero.id}.webp`)
    try {
      await sharp(readFileSync(srcPath))
        .resize({ width: 512, height: 512, fit: 'cover', position: 'top' })
        .webp({ quality: 82 })
        .toFile(outPath)
      hero.image.url = `/portraits/${hero.id}.webp`
      encoded++
      if (encoded % 50 === 0) {
        process.stdout.write(`\r  encoded ${encoded}/${metadata.length}`)
      }
    } catch (e) {
      encodeErrors.push({ id: hero.id, name: hero.name, error: e.message })
    }
  }
  process.stdout.write('\n')
  console.log(`  encoded ${encoded} portraits`)

  if (missing.length) {
    console.log(`  ⚠ ${missing.length} heroes missing their mm-<id>.jpg source file:`)
    missing.slice(0, 10).forEach(m => console.log(`    id=${m.id} ${m.name}`))
    if (missing.length > 10) console.log(`    ...and ${missing.length - 10} more`)
  }
  if (encodeErrors.length) {
    console.log(`  ⚠ ${encodeErrors.length} sharp/encode failures:`)
    encodeErrors.forEach(e => console.log(`    id=${e.id} ${e.name}: ${e.error}`))
  }

  const final = metadata.filter(
    h =>
      !missing.find(m => m.id === h.id) &&
      !encodeErrors.find(e => e.id === h.id),
  )
  const outFile = resolve(ROOT, 'src/data/heroes.json')
  mkdirSync(dirname(outFile), { recursive: true })
  writeFileSync(outFile, JSON.stringify(final, null, 2) + '\n')
  console.log(`  wrote ${final.length} heroes → src/data/heroes.json`)

  // Cleanup — only if we processed everything cleanly
  if (!missing.length && !encodeErrors.length) {
    const { unlinkSync } = await import('node:fs')
    try {
      unlinkSync(resolve(ROOT, 'scripts/heroes-metadata.json'))
      unlinkSync(resolve(ROOT, 'scripts/portrait-snippet.js'))
      for (const h of metadata) {
        const srcPath = resolve(SOURCE_DIR, `mm-${h.id}.jpg`)
        try {
          unlinkSync(srcPath)
        } catch {}
      }
      console.log('  cleaned up intermediate files')
    } catch (e) {
      console.log(`  cleanup warning: ${e.message}`)
    }
  } else {
    console.log('  skipping cleanup (some heroes missing or failed)')
  }

  console.log('\nDone.')
  process.exit(0)
}
```

Note the imports used here (`mkdirSync`, `readFileSync`, `existsSync`, `writeFileSync`, `dirname`) — all should already be present from Task 1's imports. If `dirname` isn't imported, add it to the existing `import { dirname, resolve } from 'node:path'` line.

- [ ] **Step 4: Smoke-test `--process` error handling (metadata missing)**

Since Phase 1 files have been cleaned up by previous runs (or haven't been generated yet), this checks the error path:

```bash
# First, clean any residual metadata
rm -f scripts/heroes-metadata.json scripts/portrait-snippet.js
node scripts/fetch-heroes.mjs --process
```

Expected output:
```
Phase 3: processing downloaded portraits...
  source directory: /Users/.../Downloads
Missing /Users/.../MarvelMe/scripts/heroes-metadata.json. Run 'npm run fetch-heroes' (no flag) first to do Phase 1.
```

Exit code 1.

- [ ] **Step 5: Commit**

```bash
git add scripts/fetch-heroes.mjs
git commit -m "Add --process mode for Phase 3 image encoding and final heroes.json"
```

---

## Task 6r: End-to-end run (Phase 1 + Phase 2 browser step + Phase 3) and commit artifacts

**Files:**
- Create: `src/data/heroes.json` (~400–500 KB)
- Create: `public/portraits/*.webp` (~360 files, ~14 MB total)

- [ ] **Step 1: Ensure `.env` has a valid token**

```bash
grep -c VITE_SUPERHERO_API_TOKEN= .env
```

Expected: `1`. The value after `=` must be a real token.

- [ ] **Step 2: Run Phase 1**

```bash
npm run fetch-heroes
```

Expected (abridged):
```
Phase 1a: enumerating Superhero API...
  fetched 731 / 740
  8-9 IDs returned no data
Phase 1b: selecting + deduping + categorizing...
  selected ~359 heroes
  categories: hero=NNN, xmen=NN, villain=NN
Phase 1c: writing intermediate files...
  wrote scripts/heroes-metadata.json (~359 heroes)
  wrote scripts/portrait-snippet.js (~359 URLs)

============================================================
NEXT STEP — Phase 2 (manual, in your browser)
============================================================
(instructions...)
```

- [ ] **Step 3: Phase 2 — manual browser step**

Follow the printed instructions exactly:

1. Open `https://www.superherodb.com` in Chrome.
2. If you see a "Verify you are human" prompt, complete it.
3. Open DevTools → Console.
4. Open `scripts/portrait-snippet.js` in your editor, copy the entire contents.
5. Paste into the browser console. Press Enter.
6. Click "Allow" on the "example.com wants to download multiple files" prompt.
7. Wait for the `Complete: N downloaded, M failed` log line. Should take ~30-60 seconds.

After completion, verify:

```bash
ls ~/Downloads/mm-*.jpg | wc -l
```

Expected: close to the number Phase 1 printed (a handful of failures is acceptable — the script tolerates them).

- [ ] **Step 4: Run Phase 3**

```bash
npm run fetch-heroes -- --process
```

Expected:
```
Phase 3: processing downloaded portraits...
  source directory: /Users/.../Downloads
  encoded ~359 portraits
  wrote ~359 heroes → src/data/heroes.json
  cleaned up intermediate files

Done.
```

- [ ] **Step 5: Sanity-check output**

```bash
ls public/portraits/ | wc -l
du -sh public/portraits/
node -e "
const d = JSON.parse(require('fs').readFileSync('src/data/heroes.json'));
console.log('total:', d.length);
const byCat = {};
d.forEach(h => byCat[h.category] = (byCat[h.category]||0)+1);
console.log('by category:', byCat);
console.log('iconic probe:');
['Deadpool','Vision','Jean Grey','Captain Marvel','Thor','Hawkeye','Venom','Spider-Man','Iron Man','Wolverine'].forEach(n => {
  const h = d.find(x => x.name === n);
  console.log('  ', n, h ? \`OK id=\${h.id} cat=\${h.category} portrait=\${h.image.url}\` : 'MISSING');
});
"
```

Expected:
- File count matches JSON entry count (~359)
- Total size 8–25 MB
- All 10 iconic-name probes resolve

- [ ] **Step 6: Commit the artifacts**

```bash
git add src/data/heroes.json public/portraits/
git commit -m "Generate bundled hero data and portraits (~360 Marvel heroes)"
```

After Task 6r, continue with Tasks 7–14 (React runtime refactor) as originally specified above.

---

## Implementation complete

After all 14 tasks:

- `src/data/heroes.json` and `public/portraits/` are committed to the repo.
- The browser bundle has zero runtime dependence on the Superhero API.
- The Cloudflare 403 / hot-link issue is structurally impossible.
- Silent wrong-character bugs (Thor → Thor Girl etc.) are resolved by ID-based binding.
- The build script is the new home for the API integration — re-runnable via `npm run fetch-heroes`.

To ship: open a PR against `main` summarizing the change, and reference the spec at `docs/superpowers/specs/2026-04-16-prebundled-hero-data-design.md`.
