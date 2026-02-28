/**
 * @fileoverview Daily Challenge utilities for MarvelMe.
 *
 * Provides a seeded pseudo-random number generator so that every player on
 * the same calendar day gets exactly the same hero order, plus localStorage
 * helpers for persisting and loading today's result.
 */

/** Fixed epoch for sequential daily challenge numbering (Day 1 = 2024-01-01). */
const EPOCH = new Date('2024-01-01').getTime()

/**
 * Returns today's date as a YYYY-MM-DD string in local time.
 * Used as the PRNG seed and as the localStorage key suffix.
 *
 * @returns {string}
 */
export function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Returns the sequential daily challenge number (1-indexed from 2024-01-01).
 *
 * @returns {number}
 */
export function dailyNumber() {
  return Math.floor((Date.now() - EPOCH) / 86400000) + 1
}

/**
 * Hashes a string to a 32-bit integer seed using a polynomial rolling hash.
 *
 * @param {string} str
 * @returns {number}
 */
function hashString(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0
  return h
}

/**
 * Returns a mulberry32 pseudo-random number generator initialised with `seed`.
 * Each call to the returned function advances the state and yields a float in [0, 1).
 *
 * @param {number} seed - 32-bit integer seed.
 * @returns {() => number}
 */
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

/**
 * Returns a deterministically shuffled copy of `arr` using a string seed.
 * The same seed always produces the same permutation (Fisher-Yates + mulberry32).
 *
 * @template T
 * @param {T[]}    arr  - Array to shuffle.
 * @param {string} seed - Seed string (e.g. a date key from `todayKey()`).
 * @returns {T[]}
 */
export function seededShuffle(arr, seed) {
  const rng = mulberry32(hashString(seed))
  const r = [...arr]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

const DAILY_PREFIX = 'marvelme-daily-'

/**
 * Loads the stored result for today's daily challenge from localStorage.
 * Returns null if today's challenge has not yet been completed.
 *
 * @returns {{ score: number, maxStreak: number, history: Array<{correct: boolean, hintsUsed: number}> } | null}
 */
export function loadDailyResult() {
  try {
    return JSON.parse(localStorage.getItem(DAILY_PREFIX + todayKey())) ?? null
  } catch {
    return null
  }
}

/**
 * Persists today's daily challenge result to localStorage.
 *
 * @param {{ score: number, maxStreak: number, history: Array<{correct: boolean, hintsUsed: number}> }} result
 */
export function saveDailyResult(result) {
  localStorage.setItem(DAILY_PREFIX + todayKey(), JSON.stringify(result))
}
