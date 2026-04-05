import { describe, it, expect, vi, beforeEach } from 'vitest'
import { searchHero, clearCache } from '../superheroApi'

function mockFetchResponse(data, ok = true) {
  return vi.fn(() =>
    Promise.resolve({
      ok,
      status: ok ? 200 : 500,
      json: () => Promise.resolve(data),
    })
  )
}

describe('searchHero', () => {
  beforeEach(() => {
    clearCache()
    vi.restoreAllMocks()
  })

  it('returns hero with real image', async () => {
    const hero = { id: '1', name: 'Spider-Man', image: { url: 'https://example.com/spider.jpg' } }
    globalThis.fetch = mockFetchResponse({ response: 'success', results: [hero] })

    const result = await searchHero('Spider-Man')
    expect(result).toEqual(hero)
  })

  it('prefers hero with real image over no-portrait', async () => {
    const noPortrait = { id: '1', name: 'Spider-Man', image: { url: 'https://example.com/no-portrait.jpg' } }
    const withPortrait = { id: '2', name: 'Spider-Man', image: { url: 'https://example.com/spider.jpg' } }
    globalThis.fetch = mockFetchResponse({ response: 'success', results: [noPortrait, withPortrait] })

    const result = await searchHero('Spider-Man')
    expect(result).toEqual(withPortrait)
  })

  it('returns cached result on second call', async () => {
    const hero = { id: '1', name: 'Iron Man', image: { url: 'https://example.com/iron.jpg' } }
    globalThis.fetch = mockFetchResponse({ response: 'success', results: [hero] })

    await searchHero('Iron Man')
    await searchHero('Iron Man')
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })

  it('returns null for API error response', async () => {
    globalThis.fetch = mockFetchResponse({ response: 'error' })

    const result = await searchHero('NotAHero')
    expect(result).toBeNull()
  })

  it('throws on non-2xx HTTP status', async () => {
    globalThis.fetch = mockFetchResponse({}, false)

    await expect(searchHero('Fail')).rejects.toThrow('API error: 500')
  })

  it('clearCache causes next call to re-fetch', async () => {
    const hero = { id: '1', name: 'Thor', image: { url: 'https://example.com/thor.jpg' } }
    globalThis.fetch = mockFetchResponse({ response: 'success', results: [hero] })

    await searchHero('Thor')
    clearCache()
    await searchHero('Thor')
    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
  })
})
