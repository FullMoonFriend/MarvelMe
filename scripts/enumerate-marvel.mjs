#!/usr/bin/env node
// Reconnaissance: walk every ID in the Superhero API and dump the
// Marvel-tagged entries to scripts/marvel-catalog.json so we can decide
// what to bundle. Not production code.

import { readFileSync, writeFileSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'

const env = readFileSync(new URL('../.env', import.meta.url), 'utf8')
const token = env.match(/VITE_SUPERHERO_API_TOKEN=(.+)/)?.[1]?.trim()
if (!token) throw new Error('Missing VITE_SUPERHERO_API_TOKEN in .env')

const BASE = `https://www.superheroapi.com/api.php/${token}`
const MAX_ID = 800
const BATCH = 10

async function fetchOne(id) {
  try {
    const res = await fetch(`${BASE}/${id}`)
    if (!res.ok) return { id, error: `HTTP ${res.status}` }
    const data = await res.json()
    if (data.response === 'error') return { id, error: data.error }
    return { id, data }
  } catch (e) {
    return { id, error: e.message }
  }
}

const all = []
const errors = []
let consecutiveErrors = 0

for (let start = 1; start <= MAX_ID; start += BATCH) {
  const ids = Array.from({ length: BATCH }, (_, i) => start + i).filter(i => i <= MAX_ID)
  const results = await Promise.all(ids.map(fetchOne))
  for (const r of results) {
    if (r.error) {
      errors.push(r)
      consecutiveErrors++
    } else {
      consecutiveErrors = 0
      all.push(r.data)
    }
  }
  process.stdout.write(`\rfetched ${all.length} hits, ${errors.length} misses, last id ${start + BATCH - 1}`)
  if (consecutiveErrors >= 30) {
    process.stdout.write(`\nstopping early — ${consecutiveErrors} consecutive errors\n`)
    break
  }
  await sleep(100)
}
process.stdout.write('\n')

const marvel = all.filter(h => h.biography?.publisher === 'Marvel Comics')
const withPortrait = marvel.filter(
  h => h.image?.url && !h.image.url.includes('no-portrait'),
)

console.log(`\n=== Summary ===`)
console.log(`Total characters fetched: ${all.length}`)
console.log(`Marvel Comics:            ${marvel.length}`)
console.log(`  ...with a portrait:     ${withPortrait.length}`)
console.log(`Errors:                   ${errors.length}`)

const out = {
  generatedAt: new Date().toISOString(),
  totals: {
    fetched: all.length,
    marvel: marvel.length,
    marvelWithPortrait: withPortrait.length,
    errors: errors.length,
  },
  marvel: withPortrait.map(h => ({
    id: h.id,
    name: h.name,
    fullName: h.biography?.['full-name'] || null,
    aliases: h.biography?.aliases || [],
    firstAppearance: h.biography?.['first-appearance'] || null,
    alignment: h.biography?.alignment || null,
    imageUrl: h.image?.url || null,
  })),
}

writeFileSync(
  new URL('./marvel-catalog.json', import.meta.url),
  JSON.stringify(out, null, 2),
)
console.log(`\nWrote scripts/marvel-catalog.json`)
