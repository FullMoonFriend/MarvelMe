import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAchievements } from '../useAchievements'

describe('useAchievements', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts with no achievements unlocked', () => {
    const { result } = renderHook(() => useAchievements())
    expect(result.current.unlockedCount).toBe(0)
    expect(Object.keys(result.current.achievements)).toHaveLength(0)
  })

  it('checkRound unlocks puny-human on wrong answer', () => {
    const { result } = renderHook(() => useAchievements())
    let unlocked
    act(() => {
      unlocked = result.current.checkRound({
        roundWrong: true,
        roundNoHintCorrect: false,
        roundUsedAllHints: false,
      }, { collectionSize: 0, dailiesCompleted: 0, dailyStreak: 0 })
    })
    expect(unlocked.map(a => a.id)).toContain('puny-human')
    expect(result.current.achievements['puny-human'].unlocked).toBe(true)
  })

  it('checkRound unlocks spider-sense on no-hint correct', () => {
    const { result } = renderHook(() => useAchievements())
    let unlocked
    act(() => {
      unlocked = result.current.checkRound({
        roundNoHintCorrect: true,
        roundWrong: false,
        roundUsedAllHints: false,
      }, { collectionSize: 0, dailiesCompleted: 0, dailyStreak: 0 })
    })
    expect(unlocked.map(a => a.id)).toContain('spider-sense')
  })

  it('checkGameOver unlocks origin-story on first game', () => {
    const { result } = renderHook(() => useAchievements())
    let unlocked
    act(() => {
      unlocked = result.current.checkGameOver({
        lastScore: 15,
        lastMaxStreak: 3,
        gamesCompleted: 1,
        gameNoHints: false,
        lastCategory: null,
      }, { collectionSize: 10, dailiesCompleted: 0, dailyStreak: 0 })
    })
    expect(unlocked.map(a => a.id)).toContain('origin-story')
  })

  it('does not unlock the same achievement twice', () => {
    const { result } = renderHook(() => useAchievements())
    act(() => {
      result.current.checkRound({ roundWrong: true, roundNoHintCorrect: false, roundUsedAllHints: false },
        { collectionSize: 0, dailiesCompleted: 0, dailyStreak: 0 })
    })
    let unlocked
    act(() => {
      unlocked = result.current.checkRound({ roundWrong: true, roundNoHintCorrect: false, roundUsedAllHints: false },
        { collectionSize: 0, dailiesCompleted: 0, dailyStreak: 0 })
    })
    expect(unlocked).toHaveLength(0)
  })

  it('persists to localStorage', () => {
    const { result } = renderHook(() => useAchievements())
    act(() => {
      result.current.checkRound({ roundWrong: true, roundNoHintCorrect: false, roundUsedAllHints: false },
        { collectionSize: 0, dailiesCompleted: 0, dailyStreak: 0 })
    })
    const stored = JSON.parse(localStorage.getItem('marvelme-achievements'))
    expect(stored['puny-human'].unlocked).toBe(true)
  })

  it('loads from localStorage on mount', () => {
    localStorage.setItem('marvelme-achievements', JSON.stringify({
      'puny-human': { unlocked: true, unlockedAt: '2026-04-22T00:00:00.000Z' },
    }))
    const { result } = renderHook(() => useAchievements())
    expect(result.current.achievements['puny-human'].unlocked).toBe(true)
    expect(result.current.unlockedCount).toBe(1)
  })
})
