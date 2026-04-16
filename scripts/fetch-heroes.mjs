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
