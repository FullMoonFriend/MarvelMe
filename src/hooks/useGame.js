/**
 * @fileoverview Core game state machine for MarvelMe.
 *
 * Hero data is read synchronously from src/data/heroes.json (pre-bundled at
 * build time by scripts/fetch-heroes.mjs). Rounds transition in a single
 * render — there is no loading phase and no runtime API dependency.
 *
 * Phase lifecycle:
 *   welcome → playing → revealed → (playing → revealed) × N → gameover
 */

import { useState, useCallback, useRef } from 'react'
import heroesData from '../data/heroes.json'

/** Total number of rounds per game. */
export const ROUNDS = 10

/**
 * Points awarded for a correct answer based on how many hints were used.
 * Index matches `hintsUsed` (0 hints → 3 pts, 3 hints used → 0 pts).
 *
 * @type {number[]}
 */
const POINTS = [3, 2, 1, 0]

const HEROES = heroesData

/** Fisher-Yates shuffle using Math.random. */
function shuffle(arr) {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** LCG-based PRNG seeded with `seed`. Yields values in [0, 1). */
function makePrng(seed) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0
    return (s >>> 0) / 0x100000000
  }
}

/** Deterministic Fisher-Yates shuffle using a seeded PRNG. */
function seededShuffle(arr, seed) {
  const rand = makePrng(seed)
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Numeric seed derived from today's UTC date (YYYYMMDD). */
function getDailySeed() {
  const d = new Date()
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate()
}

/**
 * Picks `count` random elements from `arr`, excluding the element at `excludeIndex`.
 */
function pickRandom(arr, count, excludeIndex) {
  const indices = new Set()
  const max = Math.min(count, arr.length - 1)
  while (indices.size < max) {
    const i = Math.floor(Math.random() * arr.length)
    if (i !== excludeIndex) indices.add(i)
  }
  return [...indices].map(i => arr[i])
}

/**
 * Builds a single round synchronously from the current pool.
 * The correct hero is `pool[correctIndex]`; 3 distractors are picked from
 * the rest. All 4 options are shuffled so position is randomized.
 *
 * @param {object[]} pool
 * @param {number}   correctIndex
 * @returns {{hero: object, options: Array<{name: string, image: object}>}}
 */
function buildRound(pool, correctIndex) {
  const correct = pool[correctIndex]
  const wrongs = pickRandom(pool, 3, correctIndex)
  const options = shuffle([correct, ...wrongs]).map(h => ({
    name: h.name,
    image: h.image,
  }))
  return { hero: correct, options }
}

/**
 * Custom hook that owns the MarvelMe game lifecycle.
 */
export function useGame() {
  const [state, setState] = useState({
    phase: 'welcome', // 'welcome' | 'playing' | 'revealed' | 'gameover'
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

  /** Filtered + shuffled hero pool for the current game session. */
  const poolRef = useRef([])

  /**
   * Initialises and starts a new game.
   *
   * @param {string|null} category - 'hero' | 'xmen' | 'villain' | null for all.
   *   Ignored when `daily` is true.
   * @param {{ daily?: boolean }} [options]
   */
  const startGame = useCallback((category, { daily = false } = {}) => {
    const filtered = !daily && category
      ? HEROES.filter(h => h.category === category)
      : HEROES
    const pool = daily
      ? seededShuffle(filtered, getDailySeed())
      : shuffle(filtered)
    poolRef.current = pool
    const roundData = buildRound(pool, 0)
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
  }, [])

  /** Reveals the next hint (up to 3). No-op outside 'playing' phase. */
  const useHint = useCallback(() => {
    setState(s => {
      if (s.phase !== 'playing' || s.hintsUsed >= 3) return s
      return { ...s, hintsUsed: s.hintsUsed + 1 }
    })
  }, [])

  /** Records the player's answer and transitions to 'revealed'. */
  const submitAnswer = useCallback(name => {
    setState(s => {
      if (s.phase !== 'playing') return s
      const correct = name === s.currentHero?.name
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
   * Advances to the next round or ends the game.
   * `currentRound` and `currentScore` must be passed from the caller's scope
   * (reading state inside the hook would capture stale closure values).
   *
   * @param {number} currentRound - 1-indexed round number just completed.
   * @param {number} currentScore - Score at the end of `currentRound`.
   */
  const nextRound = useCallback((currentRound, currentScore) => {
    if (currentRound >= ROUNDS) {
      setState(s => ({ ...s, phase: 'gameover' }))
      return
    }
    const roundData = buildRound(poolRef.current, currentRound)
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
  }, [])

  /** Resets all state back to the 'welcome' phase. */
  const restartGame = useCallback(() => {
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

  return {
    ...state,
    startGame,
    useHint,
    submitAnswer,
    nextRound,
    restartGame,
    ROUNDS,
  }
}
