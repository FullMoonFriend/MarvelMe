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
