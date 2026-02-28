import { useState, useCallback, useRef } from 'react'
import { MARVEL_HEROES } from '../data/marvelHeroes'
import { searchHero } from '../services/superheroApi'

export const ROUNDS = 10
const POINTS = [3, 2, 1, 0] // indexed by hintsUsed (0–3)

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

// correctIndex pins which pool entry is the answer, preventing repeats across rounds.
// Wrong options are sampled randomly from the rest of the pool.
async function loadRound(pool, correctIndex) {
  const correctName = pool[correctIndex]
  // Fetch 6 wrong candidates so failed API calls don't leave us short
  const wrongCandidates = shuffle(pool.filter((_, i) => i !== correctIndex)).slice(0, 6)
  const [correctHero, ...wrongResults] = await Promise.all(
    [correctName, ...wrongCandidates].map(n => searchHero(n).catch(() => null))
  )
  if (!correctHero) throw new Error('Could not load correct hero')
  const validWrong = wrongResults.filter(Boolean).slice(0, 3)
  if (validWrong.length < 1) throw new Error('Not enough heroes loaded')
  return { hero: correctHero, options: shuffle([correctHero, ...validWrong].map(h => ({ name: h.name, image: h.image }))) }
}

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
  })

  const poolRef = useRef([])
  const prefetchRef = useRef(null)

  function doPrefetch(pool, index) {
    if (index < pool.length) {
      prefetchRef.current = loadRound(pool, index).catch(() => null)
    }
  }

  const startGame = useCallback(async (category) => {
    setState(s => ({ ...s, phase: 'loading' }))
    try {
      const filtered = category
        ? MARVEL_HEROES.filter(h => h.category === category)
        : MARVEL_HEROES
      const pool = shuffle(filtered).map(h => h.name)
      poolRef.current = pool
      const { hero, options } = await loadRound(pool, 0)
      setState({
        phase: 'playing',
        round: 1,
        score: 0,
        currentHero: hero,
        options,
        hintsUsed: 0,
        result: null,
        streak: 0,
        maxStreak: 0,
        history: [],
      })
      doPrefetch(pool, 1)
    } catch {
      setState(s => ({ ...s, phase: 'welcome' }))
    }
  }, [])

  const useHint = useCallback(() => {
    setState(s => {
      if (s.phase !== 'playing' || s.hintsUsed >= 3) return s
      return { ...s, hintsUsed: s.hintsUsed + 1 }
    })
  }, [])

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

  // Called with the current round number from the component
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
      doPrefetch(poolRef.current, nextIndex + 1)
    } catch {
      setState(s => ({ ...s, phase: 'welcome' }))
    }
  }, [])

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
    })
  }, [])

  return { ...state, startGame, useHint, submitAnswer, nextRound, restartGame, ROUNDS }
}
