/**
 * @fileoverview Persistent high-score hook for MarvelMe.
 * Stores the best score and best streak in localStorage so they survive page reloads.
 */

import { useState, useCallback } from 'react'

/** localStorage key used to persist high-score data. */
const KEY = 'marvelme-highscore'

/**
 * Reads the persisted high-score record from localStorage.
 * Returns a default record with zeroed values if no data exists or parsing fails.
 *
 * @returns {{ bestScore: number, bestStreak: number }}
 */
function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? { bestScore: 0, bestStreak: 0 }
  } catch {
    return { bestScore: 0, bestStreak: 0 }
  }
}

/**
 * Custom hook for tracking and persisting all-time best score and streak.
 *
 * @returns {{
 *   bestScore: number,
 *   bestStreak: number,
 *   update: (score: number, streak: number) => void,
 * }}
 */
export function useHighScore() {
  const [data, setData] = useState(load)

  /**
   * Compares the given score and streak against the stored bests and updates
   * localStorage only when a new record is set (avoids unnecessary writes).
   *
   * @param {number} score  - Final score from the completed game.
   * @param {number} streak - Longest streak from the completed game.
   */
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
