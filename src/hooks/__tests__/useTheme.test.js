import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme } from '../useTheme'

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('defaults to default theme', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.activeTheme).toBe('default')
  })

  it('setTheme changes the active theme', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.setTheme('noir'))
    expect(result.current.activeTheme).toBe('noir')
  })

  it('setTheme applies data-theme attribute to document', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.setTheme('cosmic'))
    expect(document.documentElement.getAttribute('data-theme')).toBe('cosmic')
  })

  it('setTheme removes data-theme for default', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.setTheme('noir'))
    act(() => result.current.setTheme('default'))
    expect(document.documentElement.getAttribute('data-theme')).toBeNull()
  })

  it('persists selection to localStorage', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.setTheme('asgardian'))
    expect(localStorage.getItem('marvelme-theme')).toBe('asgardian')
  })

  it('loads from localStorage on mount', () => {
    localStorage.setItem('marvelme-theme', 'symbiote')
    const { result } = renderHook(() => useTheme())
    expect(result.current.activeTheme).toBe('symbiote')
  })
})
