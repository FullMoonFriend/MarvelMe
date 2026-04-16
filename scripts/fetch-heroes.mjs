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

// --- Config ---
const MAX_ID = 731
const BATCH = 10
const SLEEP_MS = 100

// --- Token ---
let envText
try {
  envText = readFileSync(resolve(ROOT, '.env'), 'utf8')
} catch (e) {
  if (e.code === 'ENOENT') {
    console.error(
      '.env file not found. Create it with VITE_SUPERHERO_API_TOKEN=<token> (get one at https://superheroapi.com/api.html)',
    )
  } else {
    console.error('Error reading .env:', e.message)
  }
  process.exit(1)
}
const token = envText.match(/VITE_SUPERHERO_API_TOKEN=(.+)/)?.[1]?.trim()
if (!token) {
  console.error('Missing VITE_SUPERHERO_API_TOKEN in .env')
  process.exit(1)
}
const BASE = `https://www.superheroapi.com/api.php/${token}`

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
