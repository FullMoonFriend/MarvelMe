import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useHighScore } from '../useHighScore'

const KEY = 'marvelme-highscore'

describe('useHighScore', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to zeros when localStorage is empty', () => {
    const { result } = renderHook(() => useHighScore())
    expect(result.current.bestScore).toBe(0)
    expect(result.current.bestStreak).toBe(0)
  })

  it('loads existing data from localStorage', () => {
    localStorage.setItem(KEY, JSON.stringify({ bestScore: 20, bestStreak: 5 }))
    const { result } = renderHook(() => useHighScore())
    expect(result.current.bestScore).toBe(20)
    expect(result.current.bestStreak).toBe(5)
  })

  it('falls back to zeros when localStorage contains invalid JSON', () => {
    localStorage.setItem(KEY, 'not-json')
    const { result } = renderHook(() => useHighScore())
    expect(result.current.bestScore).toBe(0)
    expect(result.current.bestStreak).toBe(0)
  })

  it('update writes to localStorage when a new record is set', () => {
    const { result } = renderHook(() => useHighScore())

    act(() => result.current.update(15, 3))

    expect(result.current.bestScore).toBe(15)
    expect(result.current.bestStreak).toBe(3)
    expect(JSON.parse(localStorage.getItem(KEY))).toEqual({
      bestScore: 15,
      bestStreak: 3,
    })
  })

  it('update does not downgrade existing records', () => {
    localStorage.setItem(KEY, JSON.stringify({ bestScore: 20, bestStreak: 5 }))
    const { result } = renderHook(() => useHighScore())

    act(() => result.current.update(10, 2))

    expect(result.current.bestScore).toBe(20)
    expect(result.current.bestStreak).toBe(5)
  })

  it('update keeps the higher of each field independently', () => {
    localStorage.setItem(KEY, JSON.stringify({ bestScore: 20, bestStreak: 3 }))
    const { result } = renderHook(() => useHighScore())

    act(() => result.current.update(15, 7))

    expect(result.current.bestScore).toBe(20)
    expect(result.current.bestStreak).toBe(7)
  })
})
