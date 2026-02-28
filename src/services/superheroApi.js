const BASE = `https://www.superheroapi.com/api.php/${import.meta.env.VITE_SUPERHERO_API_TOKEN}`

const cache = new Map()

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

export function clearCache() {
  cache.clear()
}
