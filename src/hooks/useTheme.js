import { useState, useCallback, useEffect } from 'react'

const KEY = 'marvelme-theme'

function load() {
  try {
    return localStorage.getItem(KEY) ?? 'default'
  } catch {
    return 'default'
  }
}

function applyTheme(id) {
  if (id === 'default') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', id)
  }
}

export function useTheme() {
  const [activeTheme, setActiveTheme] = useState(load)

  useEffect(() => {
    applyTheme(activeTheme)
  }, [activeTheme])

  const setTheme = useCallback((id) => {
    setActiveTheme(id)
    applyTheme(id)
    try {
      localStorage.setItem(KEY, id)
    } catch {}
  }, [])

  return { activeTheme, setTheme }
}
