function PowerBar({ label, value }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0))
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 text-gray-400 capitalize shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#ed1d24] to-[#f5c518] rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-gray-300">{pct}</span>
    </div>
  )
}

export default function HintPanel({ hero, hintsUsed }) {
  if (hintsUsed === 0) return null

  const bio = hero.biography ?? {}
  const stats = hero.powerstats ?? {}

  return (
    <div className="w-full max-w-sm mx-auto mt-4 space-y-3 animate-fadeIn">
      {/* Hint 1: First appearance + publisher */}
      {hintsUsed >= 1 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 animate-fadeIn">
          <p className="text-[#ed1d24] font-bangers text-sm tracking-wider mb-2">HINT 1 — ORIGIN</p>
          <p className="text-sm text-gray-300">
            <span className="text-gray-500">Publisher: </span>
            <span className="text-white">{bio.publisher || '—'}</span>
          </p>
          <p className="text-sm text-gray-300 mt-1">
            <span className="text-gray-500">First appearance: </span>
            <span className="text-white">{bio['first-appearance'] || '—'}</span>
          </p>
        </div>
      )}

      {/* Hint 2: Power stats */}
      {hintsUsed >= 2 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 animate-fadeIn">
          <p className="text-[#ed1d24] font-bangers text-sm tracking-wider mb-3">HINT 2 — POWERSTATS</p>
          <div className="space-y-2">
            {['intelligence', 'strength', 'speed', 'power', 'combat'].map(k => (
              <PowerBar key={k} label={k} value={stats[k]} />
            ))}
          </div>
        </div>
      )}

      {/* Hint 3: Real name */}
      {hintsUsed >= 3 && (
        <div className="bg-[#1a1a1a] border border-[#ed1d24]/40 rounded-xl p-4 animate-fadeIn">
          <p className="text-[#ed1d24] font-bangers text-sm tracking-wider mb-2">HINT 3 — REAL NAME</p>
          <p className="text-white text-base font-semibold">
            {bio['full-name'] || bio['alter-egos'] || '—'}
          </p>
        </div>
      )}
    </div>
  )
}
