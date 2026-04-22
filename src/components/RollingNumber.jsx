import { useState, useEffect, useRef } from 'react'

export default function RollingNumber({ value, duration = 400, className = '' }) {
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)

  useEffect(() => {
    const from = prevRef.current
    const to = value
    prevRef.current = value
    if (from === to) return

    const start = performance.now()
    let frame
    function tick(now) {
      const t = Math.min((now - start) / duration, 1)
      const eased = t * (2 - t)
      setDisplay(Math.round(from + (to - from) * eased))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  return <span className={className}>{display}</span>
}
