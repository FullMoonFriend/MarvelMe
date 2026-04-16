#!/usr/bin/env node
// Deeper sweep: re-fetch the full universe, then identify Marvel characters
// hiding under non-Marvel publisher tags. Outputs candidate rescue IDs.

import { readFileSync, writeFileSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'

const env = readFileSync(new URL('../.env', import.meta.url), 'utf8')
const token = env.match(/VITE_SUPERHERO_API_TOKEN=(.+)/)?.[1]?.trim()
if (!token) throw new Error('Missing VITE_SUPERHERO_API_TOKEN in .env')

const BASE = `https://www.superheroapi.com/api.php/${token}`
const MAX_ID = 731
const BATCH = 10

async function fetchOne(id) {
  try {
    const res = await fetch(`${BASE}/${id}`)
    if (!res.ok) return null
    const data = await res.json()
    if (data.response === 'error') return null
    return data
  } catch {
    return null
  }
}

const all = []
for (let start = 1; start <= MAX_ID; start += BATCH) {
  const ids = Array.from({ length: BATCH }, (_, i) => start + i).filter(i => i <= MAX_ID)
  const results = await Promise.all(ids.map(fetchOne))
  for (const r of results) if (r) all.push(r)
  process.stdout.write(`\rfetched ${all.length} / ${start + BATCH - 1}`)
  await sleep(50)
}
process.stdout.write('\n')

writeFileSync(
  new URL('./full-universe.json', import.meta.url),
  JSON.stringify(all, null, 2),
)

// Confirmed Marvel = publisher tagged correctly
const confirmed = all.filter(h => h.biography?.publisher === 'Marvel Comics')
const others = all.filter(h => h.biography?.publisher !== 'Marvel Comics')

// Marvel comic-title signals in first-appearance
const marvelTitles = [
  'X-Men', 'Uncanny X-Men', 'Avengers', 'Amazing Spider-Man', 'Spider-Man',
  'Fantastic Four', 'Daredevil', 'Iron Man', 'Incredible Hulk', 'Hulk',
  'Captain America', 'Thor', 'Doctor Strange', 'Tales of Suspense',
  'Tales to Astonish', 'Strange Tales', 'Journey into Mystery',
  'New Mutants', 'X-Force', 'X-Factor', 'Generation X', 'Excalibur',
  'Marvel Comics Presents', 'Marvel Premiere', 'Marvel Spotlight',
  'Marvel Team-Up', 'Marvel Two-in-One', 'Marvel Super-Heroes',
  'Punisher', 'Wolverine', 'Cable', 'Deadpool', 'Ms. Marvel',
  'Captain Marvel', 'Ghost Rider', 'Silver Surfer', 'Nova',
  'Power Pack', 'Alpha Flight', 'New Warriors', 'Guardians of the Galaxy',
  'Inhumans', 'Black Panther', 'Iron Fist', 'Luke Cage', 'Power Man',
  'Werewolf by Night', 'Tomb of Dracula', 'Marvel Mystery', 'Marvel Tales',
]

const marvelTitleRx = new RegExp(
  '(?:^|[\\s(])(' +
    marvelTitles
      .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|') +
    ')(?:$|[\\s#])',
  'i',
)

const candidates = others.filter(h => {
  const fa = h.biography?.['first-appearance']
  if (!fa || fa === '-' || fa === 'null') return false
  return marvelTitleRx.test(fa)
})

console.log(`\n=== Sweep results ===`)
console.log(`Total fetched:                     ${all.length}`)
console.log(`Confirmed Marvel (publisher tag):  ${confirmed.length}`)
console.log(`Other publishers (haystack):       ${others.length}`)
console.log(`Likely Marvel (title heuristic):   ${candidates.length}`)
console.log(`\nPublisher distribution among "other":`)
const pubCounts = {}
others.forEach(h => {
  const p = h.biography?.publisher || '(missing)'
  pubCounts[p] = (pubCounts[p] || 0) + 1
})
Object.entries(pubCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .forEach(([p, c]) => console.log(`  ${String(c).padStart(4)}  ${p}`))

console.log(`\n=== Candidate rescue list (${candidates.length}) ===`)
candidates
  .sort((a, b) => Number(a.id) - Number(b.id))
  .forEach(h => {
    console.log(
      `  id=${String(h.id).padStart(3)}  ${h.name.padEnd(30)}  pub="${h.biography.publisher}"  first="${h.biography['first-appearance']}"`,
    )
  })

writeFileSync(
  new URL('./rescue-candidates.json', import.meta.url),
  JSON.stringify(
    candidates.map(h => ({
      id: h.id,
      name: h.name,
      publisher: h.biography.publisher,
      firstAppearance: h.biography['first-appearance'],
      imageUrl: h.image?.url,
    })),
    null,
    2,
  ),
)
console.log(`\nWrote scripts/rescue-candidates.json and scripts/full-universe.json`)
