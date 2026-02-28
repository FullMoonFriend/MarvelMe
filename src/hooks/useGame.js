import { useState, useCallback, useRef } from 'react'
import { MARVEL_HEROES } from '../data/marvelHeroes'
import { searchHero } from '../services/superheroApi'

export const ROUNDS = 10
const POINTS = [3, 2, 1, 0] // indexed by hintsUsed (0–3)

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

async function loadRound(pool) {
  const names = shuffle(pool).slice(0, 4)
  const results = await Promise.all(names.map(n => searchHero(n).catch(() => null)))
  const valid = results.filter(Boolean)
  if (valid.length < 2) throw new Error('Not enough heroes loaded')

  const correct = valid[Math.floor(Math.random() * valid.length)]
  return { hero: correct, options: shuffle(valid.map(h => h.name)) }
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
  })

  const poolRef = useRef([])
  const prefetchRef = useRef(null)

  function doPrefetch(pool) {
    prefetchRef.current = loadRound(pool).catch(() => null)
  }

  const startGame = useCallback(async () => {
    setState(s => ({ ...s, phase: 'loading' }))
    try {
      const pool = shuffle(MARVEL_HEROES)
      poolRef.current = pool
      const { hero, options } = await loadRound(pool)
      setState({
        phase: 'playing',
        round: 1,
        score: 0,
        currentHero: hero,
        options,
        hintsUsed: 0,
        result: null,
      })
      doPrefetch(pool)
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
      return {
        ...s,
        phase: 'revealed',
        result: correct ? 'correct' : 'wrong',
        score: s.score + (correct ? POINTS[s.hintsUsed] : 0),
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
      const pending = prefetchRef.current
      prefetchRef.current = null
      const roundData = (pending ? await pending : null) ?? await loadRound(poolRef.current)

      setState({
        phase: 'playing',
        round: currentRound + 1,
        score: currentScore,
        currentHero: roundData.hero,
        options: roundData.options,
        hintsUsed: 0,
        result: null,
      })
      doPrefetch(poolRef.current)
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
    })
  }, [])

  return { ...state, startGame, useHint, submitAnswer, nextRound, restartGame, ROUNDS }
}
