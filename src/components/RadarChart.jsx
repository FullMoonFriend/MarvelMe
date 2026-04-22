const STATS = ['intelligence', 'strength', 'speed', 'durability', 'power', 'combat']
const SIZE = 200
const CENTER = SIZE / 2
const RADIUS = 70

function polarToXY(angleDeg, r) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: CENTER + r * Math.cos(rad), y: CENTER + r * Math.sin(rad) }
}

function ringPoints(r) {
  return STATS.map((_, i) => {
    const angle = (360 / STATS.length) * i
    return polarToXY(angle, r)
  })
}

export default function RadarChart({ powerstats, className = '' }) {
  const dataPoints = STATS.map((key, i) => {
    const val = Math.max(0, Math.min(100, Number(powerstats[key]) || 0))
    const angle = (360 / STATS.length) * i
    return polarToXY(angle, (val / 100) * RADIUS)
  })

  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z'

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className={className} aria-hidden="true">
      {[0.25, 0.5, 0.75, 1].map(scale => {
        const pts = ringPoints(RADIUS * scale)
        const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z'
        return <path key={scale} d={path} fill="none" stroke="#2a2a2a" strokeWidth="1" />
      })}

      {STATS.map((_, i) => {
        const angle = (360 / STATS.length) * i
        const end = polarToXY(angle, RADIUS)
        return <line key={i} x1={CENTER} y1={CENTER} x2={end.x} y2={end.y} stroke="#2a2a2a" strokeWidth="1" />
      })}

      <path d={dataPath} fill="rgba(237, 29, 36, 0.3)" stroke="#ed1d24" strokeWidth="2" />

      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#ed1d24" />
      ))}

      {STATS.map((key, i) => {
        const angle = (360 / STATS.length) * i
        const labelPos = polarToXY(angle, RADIUS + 16)
        return (
          <text
            key={key}
            x={labelPos.x}
            y={labelPos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#9ca3af"
            fontSize="8"
            className="capitalize"
          >
            {key.slice(0, 3).toUpperCase()}
          </text>
        )
      })}
    </svg>
  )
}
