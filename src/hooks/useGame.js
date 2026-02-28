/**
 * @fileoverview Core game state machine for MarvelMe.
 *
 * Phase lifecycle:
 *   welcome → loading → playing → revealed → (loading → playing) × N → gameover
 *
 * All game state lives in a single `useState` object managed by `useGame`.
 * A prefetch ref starts loading the next round's data as soon as the current
 * round finishes loading, so transitions feel instant.
 */

import { useState, useCallback, useRef } from 'react'
import { MARVEL_HEROES } from '../data/marvelHeroes'
import { searchHero } from '../services/superheroApi'

/** Total number of rounds per game. */
export const ROUNDS = 10

/**
 * Points awarded for a correct answer based on how many hints were used.
 * Index matches `hintsUsed` (0 = no hints → 3 pts, 3 hints used → 0 pts).
 *
 * @type {number[]}
 */
const POINTS = [3, 2, 1, 0]

/**
 * Returns a new array with the same elements in a random order.
 *
 * @template T
 * @param {T[]} arr
 * @returns {T[]}
 */
function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

/**
 * Linear Congruential Generator — returns a PRNG seeded with `seed`.
 * Yields values in [0, 1) deterministically for a given seed.
 *
 * @param {number} seed
 * @returns {() => number}
 */
function makePrng(seed) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0
    return (s >>> 0) / 0x100000000
  }
}

/**
 * Deterministically shuffles `arr` using a seeded PRNG (Fisher-Yates).
 *
 * @template T
 * @param {T[]} arr
 * @param {number} seed
 * @returns {T[]}
 */
function seededShuffle(arr, seed) {
  const rand = makePrng(seed)
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Returns a numeric seed derived from today's local date (YYYYMMDD).
 * All players on the same calendar day get the same seed.
 *
 * @returns {number}
 */
function getDailySeed() {
  const d = new Date()
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

/**
 * Fetches hero data for one round.
 *
 * `correctIndex` pins which pool entry is the answer, preventing the same hero
 * from appearing as the correct answer twice. Six wrong candidates are fetched
 * so that failed API calls don't leave the options short — the final list is
 * trimmed to at most 3 wrong options.
 *
 * If the API returns nothing for the hero at `correctIndex`, up to 4 subsequent
 * pool entries are tried so a single unreachable hero never crashes the game.
 * The caller receives `usedIndex` to keep the prefetch chain in sync.
 *
 * @param {string[]} pool         - Ordered list of hero names for this game session.
 * @param {number}   correctIndex - Index into `pool` of the correct hero for this round.
 * @returns {Promise<{hero: object, options: Array<{name: string, image: object}>, usedIndex: number}>}
 * @throws {Error} If no valid hero can be loaded from the pool.
 */
async function loadRound(pool, correctIndex) {
  const maxTries = Math.min(5, pool.length - correctIndex)
  for (let offset = 0; offset < maxTries; offset++) {
    const idx = correctIndex + offset
    const correctName = pool[idx]
    // Fetch 6 wrong candidates so failed API calls don't leave us short
    const wrongCandidates = shuffle(pool.filter((_, i) => i !== idx)).slice(0, 6)
    const [correctHero, ...wrongResults] = await Promise.all(
      [correctName, ...wrongCandidates].map(n => searchHero(n).catch(() => null))
    )
    if (!correctHero) continue
    const validWrong = wrongResults.filter(Boolean).slice(0, 3)
    if (validWrong.length < 1) continue
    return { hero: correctHero, options: shuffle([correctHero, ...validWrong].map(h => ({ name: h.name, image: h.image }))), usedIndex: idx }
  }
  throw new Error('Not enough heroes loaded')
}

/**
 * Custom hook that owns the entire MarvelMe game lifecycle.
 *
 * @returns {{
 *   phase: 'welcome'|'loading'|'playing'|'revealed'|'gameover',
 *   round: number,
 *   score: number,
 *   currentHero: object|null,
 *   options: Array<{name: string, image: object}>,
 *   hintsUsed: number,
 *   result: 'correct'|'wrong'|null,
 *   streak: number,
 *   maxStreak: number,
 *   history: Array<{correct: boolean, hintsUsed: number}>,
 *   ROUNDS: number,
 *   startGame: (category: string|null) => Promise<void>,
 *   useHint: () => void,
 *   submitAnswer: (name: string) => void,
 *   nextRound: (currentRound: number, currentScore: number) => Promise<void>,
 *   restartGame: () => void,
 * }}
 */
export function useGame() {
  const [state, setState] = useState({
    phase: 'welcome', // 'welcome' | 'loading' | 'playing' | 'revealed' | 'gameover'
    round: 0,
    score: 0,
    currentHero: null,
    options: [],
    hintsUsed: 0,
    result: null, // 'correct' | 'wrong'
    streak: 0,
    maxStreak: 0,
    history: [],
    isDailyChallenge: false,
  })

  /** Shuffled hero name pool for the current game session. */
  const poolRef = useRef([])

  /**
   * Holds a Promise for the next round's data so it is ready before the user
   * clicks "Next Hero". Set to null once consumed.
   *
   * @type {React.MutableRefObject<Promise<object>|null>}
   */
  const prefetchRef = useRef(null)

  /**
   * Starts a background prefetch for the round at `index` in `pool`.
   * Silently discards errors — `nextRound` will fall back to a live fetch.
   *
   * @param {string[]} pool
   * @param {number}   index
   */
  function doPrefetch(pool, index) {
    if (index < pool.length) {
      prefetchRef.current = loadRound(pool, index).catch(() => null)
    }
  }

  /**
   * Initialises and starts a new game.
   *
   * Shuffles the hero pool (optionally filtered by category), loads the first
   * round, and immediately prefetches the second. Falls back to 'welcome' phase
   * on error.
   *
   * When `daily` is true the pool is shuffled with today's date seed so every
   * player faces the same sequence of heroes on a given calendar day.
   *
   * @param {string|null} category - Hero category filter ('hero' | 'xmen' | 'villain' | null for all). Ignored when `daily` is true.
   * @param {{ daily?: boolean }} [options]
   */
  const startGame = useCallback(async (category, { daily = false } = {}) => {
    setState(s => ({ ...s, phase: 'loading' }))
    try {
      const filtered = (!daily && category)
        ? MARVEL_HEROES.filter(h => h.category === category)
        : MARVEL_HEROES
      const pool = daily
        ? seededShuffle(filtered, getDailySeed()).map(h => h.name)
        : shuffle(filtered).map(h => h.name)
      poolRef.current = pool
      const roundData = await loadRound(pool, 0)
      setState({
        phase: 'playing',
        round: 1,
        score: 0,
        currentHero: roundData.hero,
        options: roundData.options,
        hintsUsed: 0,
        result: null,
        streak: 0,
        maxStreak: 0,
        history: [],
        isDailyChallenge: daily,
      })
      doPrefetch(pool, roundData.usedIndex + 1)
    } catch {
      setState(s => ({ ...s, phase: 'welcome' }))
    }
  }, [])

  /**
   * Reveals the next hint for the current hero, up to a maximum of 3.
   * Each hint costs 1 potential point. No-op outside the 'playing' phase.
   */
  const useHint = useCallback(() => {
    setState(s => {
      if (s.phase !== 'playing' || s.hintsUsed >= 3) return s
      return { ...s, hintsUsed: s.hintsUsed + 1 }
    })
  }, [])

  /**
   * Records the player's answer and transitions to the 'revealed' phase.
   * Updates score, streak, and history accordingly.
   * No-op outside the 'playing' phase.
   *
   * @param {string} name - The hero name the player selected.
   */
  const submitAnswer = useCallback((name) => {
    setState(s => {
      if (s.phase !== 'playing') return s
      const correct = name === s.currentHero.name
      const newStreak = correct ? s.streak + 1 : 0
      return {
        ...s,
        phase: 'revealed',
        result: correct ? 'correct' : 'wrong',
        score: s.score + (correct ? POINTS[s.hintsUsed] : 0),
        streak: newStreak,
        maxStreak: Math.max(s.maxStreak, newStreak),
        history: [...s.history, { correct, hintsUsed: s.hintsUsed }],
      }
    })
  }, [])

  /**
   * Advances to the next round, or ends the game if all rounds are complete.
   *
   * IMPORTANT: `currentRound` and `currentScore` must be passed from the
   * calling component's scope — reading them from state inside the hook would
   * capture stale values due to closure semantics.
   *
   * Uses the prefetched round data if available; otherwise falls back to a
   * live `loadRound` call. Falls back to 'welcome' phase on error.
   *
   * @param {number} currentRound - The 1-indexed round number just completed.
   * @param {number} currentScore - The player's score at the end of `currentRound`.
   */
  const nextRound = useCallback(async (currentRound, currentScore) => {
    if (currentRound >= ROUNDS) {
      setState(s => ({ ...s, phase: 'gameover' }))
      return
    }

    setState(s => ({ ...s, phase: 'loading' }))

    try {
      // currentRound is 1-indexed; the next round's pool index equals currentRound
      const nextIndex = currentRound
      const pending = prefetchRef.current
      prefetchRef.current = null
      const roundData = (pending ? await pending : null) ?? await loadRound(poolRef.current, nextIndex)

      setState(s => ({
        ...s,
        phase: 'playing',
        round: currentRound + 1,
        score: currentScore,
        currentHero: roundData.hero,
        options: roundData.options,
        hintsUsed: 0,
        result: null,
      }))
      doPrefetch(poolRef.current, roundData.usedIndex + 1)
    } catch {
      setState(s => ({ ...s, phase: 'welcome' }))
    }
  }, [])

  /**
   * Resets all game state back to the initial 'welcome' phase and clears
   * the prefetch buffer and hero pool.
   */
  const restartGame = useCallback(() => {
    prefetchRef.current = null
    poolRef.current = []
    setState({
      phase: 'welcome',
      round: 0,
      score: 0,
      currentHero: null,
      options: [],
      hintsUsed: 0,
      result: null,
      streak: 0,
      maxStreak: 0,
      history: [],
      isDailyChallenge: false,
    })
  }, [])

  return { ...state, startGame, useHint, submitAnswer, nextRound, restartGame, ROUNDS }
}
