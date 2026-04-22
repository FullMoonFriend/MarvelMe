import { useState, useCallback } from 'react'
import { ACHIEVEMENTS } from '../data/achievements'

const KEY = 'marvelme-achievements'

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {}
  } catch {
    return {}
  }
}

function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch { /* ignored */ }
}

export function useAchievements() {
  const [achievements, setAchievements] = useState(load)

  const tryUnlock = useCallback((roundCtx, globalCtx) => {
    const newlyUnlocked = []
    setAchievements(prev => {
      let changed = false
      const next = { ...prev }
      for (const def of ACHIEVEMENTS) {
        if (next[def.id]?.unlocked) continue
        if (def.check(roundCtx, globalCtx)) {
          next[def.id] = { unlocked: true, unlockedAt: new Date().toISOString() }
          newlyUnlocked.push(def)
          changed = true
        }
      }
      if (!changed) return prev
      save(next)
      return next
    })
    return newlyUnlocked
  }, [])

  const checkRound = useCallback((roundCtx, globalCtx) => {
    return tryUnlock(roundCtx, globalCtx)
  }, [tryUnlock])

  const checkGameOver = useCallback((gameCtx, globalCtx) => {
    return tryUnlock(gameCtx, globalCtx)
  }, [tryUnlock])

  const unlockedCount = Object.values(achievements).filter(a => a.unlocked).length

  return { achievements, unlockedCount, checkRound, checkGameOver }
}
