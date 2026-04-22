import { useState, useCallback, useRef } from 'react'

const KEY = 'marvelme-collection'

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw))
  } catch {
    return new Set()
  }
}

function save(set) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...set]))
  } catch {}
}

export function useCollection() {
  const [collected, setCollected] = useState(load)
  const collectedRef = useRef(collected)

  const markSeen = useCallback((ids) => {
    const prev = collectedRef.current
    const newIds = ids.filter(id => !prev.has(id))
    if (newIds.length === 0) return newIds
    const next = new Set(prev)
    newIds.forEach(id => next.add(id))
    save(next)
    collectedRef.current = next
    setCollected(next)
    return newIds
  }, [])

  return { collected, size: collected.size, markSeen }
}
