import { useState, useEffect } from 'react'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

export default function DecryptText({ text, duration = 300, className = '' }) {
  const [display, setDisplay] = useState('')

  useEffect(() => {
    if (!text) { setDisplay(''); return } // eslint-disable-line react-hooks/set-state-in-effect
    const start = performance.now()
    let frame
    function tick(now) {
      const t = Math.min((now - start) / duration, 1)
      const resolved = Math.floor(t * text.length)
      let out = text.slice(0, resolved)
      for (let i = resolved; i < text.length; i++) {
        out += text[i] === ' ' ? ' ' : CHARS[Math.floor(Math.random() * CHARS.length)]
      }
      setDisplay(out)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [text, duration])

  return <span className={className}>{display}</span>
}
