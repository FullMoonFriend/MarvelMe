/**
 * @fileoverview Superhero API client with session-level caching.
 * Wraps https://www.superheroapi.com — requires VITE_SUPERHERO_API_TOKEN.
 */

const BASE = `https://www.superheroapi.com/api.php/${import.meta.env.VITE_SUPERHERO_API_TOKEN}`

/** Session-level cache keyed by hero name to avoid redundant API calls. */
const cache = new Map()

/**
 * Fetches a hero by name from the Superhero API, preferring results that have
 * a real portrait image. Results are cached for the lifetime of the page session.
 *
 * @param {string} name - The hero name to search for (e.g. "Spider-Man").
 * @returns {Promise<object|null>} The hero object from the API, or null if not found.
 * @throws {Error} If the HTTP request fails (non-2xx status).
 */
export async function searchHero(name) {
  if (cache.has(name)) return cache.get(name)

  const res = await fetch(`${BASE}/search/${encodeURIComponent(name)}`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)

  const data = await res.json()
  if (data.response === 'error') return null

  // Return the first result that has an image
  const hero = data.results?.find(h => h.image?.url && !h.image.url.includes('no-portrait')) ?? data.results?.[0]
  if (!hero) return null

  cache.set(name, hero)
  return hero
}

/**
 * Clears the in-memory hero cache.
 * Useful in tests or when a fresh session is required.
 */
export function clearCache() {
  cache.clear()
}
