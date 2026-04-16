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

## Task 3: Implement portrait download + sharp WebP encoding

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

## Implementation complete

After all 14 tasks:

- `src/data/heroes.json` and `public/portraits/` are committed to the repo.
- The browser bundle has zero runtime dependence on the Superhero API.
- The Cloudflare 403 / hot-link issue is structurally impossible.
- Silent wrong-character bugs (Thor → Thor Girl etc.) are resolved by ID-based binding.
- The build script is the new home for the API integration — re-runnable via `npm run fetch-heroes`.

To ship: open a PR against `main` summarizing the change, and reference the spec at `docs/superpowers/specs/2026-04-16-prebundled-hero-data-design.md`.
