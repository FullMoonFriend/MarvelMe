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
