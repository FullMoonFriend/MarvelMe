import { useState, useCallback } from 'react'

const KEY = 'marvelme-highscore'

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? { bestScore: 0, bestStreak: 0 }
  } catch {
    return { bestScore: 0, bestStreak: 0 }
  }
}

export function useHighScore() {
  const [data, setData] = useState(load)

  const update = useCallback((score, streak) => {
    setData(prev => {
      const next = {
        bestScore: Math.max(prev.bestScore, score),
        bestStreak: Math.max(prev.bestStreak, streak),
      }
      if (next.bestScore !== prev.bestScore || next.bestStreak !== prev.bestStreak) {
        localStorage.setItem(KEY, JSON.stringify(next))
        return next
      }
      return prev
    })
  }, [])

  return { ...data, update }
}
