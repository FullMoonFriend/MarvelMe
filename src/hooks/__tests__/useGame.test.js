import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGame, ROUNDS } from '../useGame'

// Mock searchHero to avoid real API calls
vi.mock('../../services/superheroApi', () => ({
  searchHero: vi.fn(),
}))

import { searchHero } from '../../services/superheroApi'

function makeHero(name) {
  return {
    name,
    image: { url: `https://example.com/${name}.jpg` },
    biography: { 'full-name': `${name} Real`, 'first-appearance': 'Comic #1' },
    powerstats: { intelligence: 80, strength: 70, speed: 60, durability: 50, power: 90, combat: 75 },
    work: { occupation: 'Hero', base: 'NYC' },
    appearance: { gender: 'Male', race: 'Human', height: ["6'0", '183 cm'], 'hair-color': 'Black', 'eye-color': 'Blue' },
  }
}

describe('useGame', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    searchHero.mockImplementation((name) => Promise.resolve(makeHero(name)))
  })

  it('starts with welcome phase and default state', () => {
    const { result } = renderHook(() => useGame())
    expect(result.current.phase).toBe('welcome')
    expect(result.current.round).toBe(0)
    expect(result.current.score).toBe(0)
    expect(result.current.currentHero).toBeNull()
    expect(result.current.options).toEqual([])
    expect(result.current.hintsUsed).toBe(0)
    expect(result.current.result).toBeNull()
    expect(result.current.streak).toBe(0)
    expect(result.current.maxStreak).toBe(0)
    expect(result.current.history).toEqual([])
  })

  it('startGame transitions to playing phase', async () => {
    const { result } = renderHook(() => useGame())

    await act(async () => {
      await result.current.startGame(null)
    })

    expect(result.current.phase).toBe('playing')
    expect(result.current.round).toBe(1)
    expect(result.current.score).toBe(0)
    expect(result.current.currentHero).not.toBeNull()
    expect(result.current.options).toHaveLength(4)
  })

  it('startGame with category filters pool correctly', async () => {
    const { result } = renderHook(() => useGame())

    await act(async () => {
      await result.current.startGame('villain')
    })

    expect(result.current.phase).toBe('playing')
    expect(result.current.round).toBe(1)
  })

  it('useHint increments hintsUsed up to 3', async () => {
    const { result } = renderHook(() => useGame())

    await act(async () => {
      await result.current.startGame(null)
    })

    expect(result.current.hintsUsed).toBe(0)

    act(() => result.current.useHint())
    expect(result.current.hintsUsed).toBe(1)

    act(() => result.current.useHint())
    expect(result.current.hintsUsed).toBe(2)

    act(() => result.current.useHint())
    expect(result.current.hintsUsed).toBe(3)

    // Should not go beyond 3
    act(() => result.current.useHint())
    expect(result.current.hintsUsed).toBe(3)
  })

  it('useHint is a no-op outside playing phase', () => {
    const { result } = renderHook(() => useGame())

    // In welcome phase
    act(() => result.current.useHint())
    expect(result.current.hintsUsed).toBe(0)
  })

  it('submitAnswer with correct name awards points and sets correct result', async () => {
    const { result } = renderHook(() => useGame())

    await act(async () => {
      await result.current.startGame(null)
    })

    const correctName = result.current.currentHero.name

    act(() => result.current.submitAnswer(correctName))

    expect(result.current.phase).toBe('revealed')
    expect(result.current.result).toBe('correct')
    expect(result.current.score).toBe(3) // 0 hints = 3 pts
    expect(result.current.streak).toBe(1)
    expect(result.current.history).toHaveLength(1)
    expect(result.current.history[0]).toEqual({ correct: true, hintsUsed: 0 })
  })

  it('submitAnswer with wrong name awards 0 points and resets streak', async () => {
    const { result } = renderHook(() => useGame())

    await act(async () => {
      await result.current.startGame(null)
    })

    act(() => result.current.submitAnswer('DEFINITELY_NOT_A_HERO'))

    expect(result.current.phase).toBe('revealed')
    expect(result.current.result).toBe('wrong')
    expect(result.current.score).toBe(0)
    expect(result.current.streak).toBe(0)
  })

  it('submitAnswer is a no-op outside playing phase', () => {
    const { result } = renderHook(() => useGame())

    // In welcome phase
    act(() => result.current.submitAnswer('Spider-Man'))
    expect(result.current.phase).toBe('welcome')
    expect(result.current.history).toEqual([])
  })

  it('submitAnswer with hints used awards reduced points', async () => {
    const { result } = renderHook(() => useGame())

    await act(async () => {
      await result.current.startGame(null)
    })

    act(() => result.current.useHint())
    act(() => result.current.useHint())

    const correctName = result.current.currentHero.name
    act(() => result.current.submitAnswer(correctName))

    expect(result.current.score).toBe(1) // 2 hints = 1 pt
  })

  it('nextRound advances to next round', async () => {
    const { result } = renderHook(() => useGame())

    await act(async () => {
      await result.current.startGame(null)
    })

    const correctName = result.current.currentHero.name
    act(() => result.current.submitAnswer(correctName))

    await act(async () => {
      await result.current.nextRound(result.current.round, result.current.score)
    })

    expect(result.current.phase).toBe('playing')
    expect(result.current.round).toBe(2)
    expect(result.current.hintsUsed).toBe(0)
    expect(result.current.result).toBeNull()
  })

  it('nextRound transitions to gameover at round 10', async () => {
    const { result } = renderHook(() => useGame())

    await act(async () => {
      await result.current.nextRound(ROUNDS, 15)
    })

    expect(result.current.phase).toBe('gameover')
  })

  it('restartGame resets to welcome phase', async () => {
    const { result } = renderHook(() => useGame())

    await act(async () => {
      await result.current.startGame(null)
    })

    act(() => result.current.restartGame())

    expect(result.current.phase).toBe('welcome')
    expect(result.current.round).toBe(0)
    expect(result.current.score).toBe(0)
    expect(result.current.currentHero).toBeNull()
    expect(result.current.history).toEqual([])
  })

  it('streak tracking works correctly across rounds', async () => {
    const { result } = renderHook(() => useGame())

    await act(async () => {
      await result.current.startGame(null)
    })

    // Round 1 - correct
    let correctName = result.current.currentHero.name
    act(() => result.current.submitAnswer(correctName))
    expect(result.current.streak).toBe(1)

    await act(async () => {
      await result.current.nextRound(1, result.current.score)
    })

    // Round 2 - correct
    correctName = result.current.currentHero.name
    act(() => result.current.submitAnswer(correctName))
    expect(result.current.streak).toBe(2)
    expect(result.current.maxStreak).toBe(2)

    await act(async () => {
      await result.current.nextRound(2, result.current.score)
    })

    // Round 3 - wrong
    act(() => result.current.submitAnswer('WRONG'))
    expect(result.current.streak).toBe(0)
    expect(result.current.maxStreak).toBe(2) // Max preserved
  })

  it('startGame reverts to welcome with error on loadRound failure', async () => {
    searchHero.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useGame())

    await act(async () => {
      await result.current.startGame(null)
    })

    expect(result.current.phase).toBe('welcome')
    expect(result.current.error).toBe('Failed to load heroes. Check your connection and try again.')
  })
})
