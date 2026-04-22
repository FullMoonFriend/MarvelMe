import { useEffect, useState } from 'react'
import { playRoundWipe } from '../services/sounds'

const CATEGORY_COLORS = {
  hero: '#ed1d24',
  villain: '#7c3aed',
  xmen: '#f5c518',
}

export default function RoundWipe({ category, onComplete }) {
  const [active, setActive] = useState(true)
  const color = CATEGORY_COLORS[category] || '#ed1d24'

  useEffect(() => {
    playRoundWipe()
    const timer = setTimeout(() => {
      setActive(false)
      onComplete()
    }, 400)
    return () => clearTimeout(timer)
  }, [onComplete])

  if (!active) return null

  return (
    <div
      className="fixed inset-0 z-30 pointer-events-none"
      style={{
        background: `linear-gradient(90deg, ${color}dd 0%, ${color}88 50%, transparent 100%)`,
        animation: 'wipeIn 0.4s ease-out forwards',
      }}
    />
  )
}
