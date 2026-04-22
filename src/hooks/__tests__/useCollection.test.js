import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCollection } from '../useCollection'

describe('useCollection', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts empty when no localStorage data exists', () => {
    const { result } = renderHook(() => useCollection())
    expect(result.current.collected).toEqual(new Set())
    expect(result.current.size).toBe(0)
  })

  it('markSeen adds hero IDs to the collection', () => {
    const { result } = renderHook(() => useCollection())
    act(() => result.current.markSeen(['14', '57', '106']))
    expect(result.current.size).toBe(3)
    expect(result.current.collected.has('14')).toBe(true)
    expect(result.current.collected.has('57')).toBe(true)
  })

  it('markSeen deduplicates IDs', () => {
    const { result } = renderHook(() => useCollection())
    act(() => result.current.markSeen(['14', '57']))
    act(() => result.current.markSeen(['57', '106']))
    expect(result.current.size).toBe(3)
  })

  it('markSeen returns newly added IDs', () => {
    const { result } = renderHook(() => useCollection())
    let newIds
    act(() => { newIds = result.current.markSeen(['14', '57']) })
    expect(newIds).toEqual(['14', '57'])
    act(() => { newIds = result.current.markSeen(['57', '106']) })
    expect(newIds).toEqual(['106'])
  })

  it('persists to localStorage', () => {
    const { result } = renderHook(() => useCollection())
    act(() => result.current.markSeen(['14', '57']))
    const stored = JSON.parse(localStorage.getItem('marvelme-collection'))
    expect(stored).toContain('14')
    expect(stored).toContain('57')
  })

  it('loads from localStorage on mount', () => {
    localStorage.setItem('marvelme-collection', JSON.stringify(['14', '57', '106']))
    const { result } = renderHook(() => useCollection())
    expect(result.current.size).toBe(3)
    expect(result.current.collected.has('14')).toBe(true)
  })

  it('handles corrupt localStorage gracefully', () => {
    localStorage.setItem('marvelme-collection', 'not-json')
    const { result } = renderHook(() => useCollection())
    expect(result.current.size).toBe(0)
  })
})
