import DecryptText from './DecryptText'

/**
 * Displays a single power-stat row with a labelled progress bar.
 *
 * @param {object} props
 * @param {string} props.label - Stat name (e.g. "intelligence").
 * @param {number|string} props.value - Raw stat value from the API (0–100).
 */
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

/**
 * Displays the mystery hero's clues, progressively revealing more information
 * as the player uses hints.
 *
 * Always shown:
 *  - First appearance date
 *  - All six power-stat bars
 *
 * Hint 1 (hintsUsed >= 1): Occupation and base of operations.
 * Hint 2 (hintsUsed >= 2): Physical description (height, hair/eye colour, race, gender).
 * Hint 3 (hintsUsed >= 3): Real / full name.
 *
 * @param {object} props
 * @param {object} props.hero      - Hero object returned by the Superhero API.
 * @param {number} props.hintsUsed - Number of hints the player has used (0–3).
 */
export default function HintPanel({ hero, hintsUsed }) {
  const bio = hero.biography ?? {}
  const stats = hero.powerstats ?? {}
  const work = hero.work ?? {}
  const appearance = hero.appearance ?? {}

  return (
    <div className="w-full max-w-sm mx-auto mt-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 space-y-4">
      <p className="text-[#ed1d24] font-bangers text-sm tracking-wider">MYSTERY CHARACTER</p>

      {/* Always visible: first appearance + powerstats */}
      <div className="space-y-1">
        <p className="text-xs text-gray-500">
          First appearance:{' '}
          <span className="text-gray-200">{bio['first-appearance'] || '—'}</span>
        </p>
      </div>

      <div className="space-y-2">
        {['intelligence', 'strength', 'speed', 'durability', 'power', 'combat'].map(k => (
          <PowerBar key={k} label={k} value={stats[k]} />
        ))}
      </div>

      {/* Hint 1: Occupation + base */}
      {hintsUsed >= 1 && (
        <div className="pt-2 border-t border-[#2a2a2a] animate-fadeIn">
          <p className="text-[#f5c518] font-bangers text-xs tracking-wider mb-1">HINT 1 — OCCUPATION</p>
          <p className="text-xs text-gray-300">
            <span className="text-gray-500">Occupation: </span>
            <DecryptText text={work.occupation || '—'} className="text-white" />
          </p>
          <p className="text-xs text-gray-300 mt-0.5">
            <span className="text-gray-500">Base: </span>
            <DecryptText text={work.base || '—'} className="text-white" />
          </p>
        </div>
      )}

      {/* Hint 2: Physical description */}
      {hintsUsed >= 2 && (
        <div className="pt-2 border-t border-[#2a2a2a] animate-fadeIn">
          <p className="text-[#f5c518] font-bangers text-xs tracking-wider mb-1">HINT 2 — APPEARANCE</p>
          <p className="text-xs text-gray-300">
            <DecryptText
              text={[
                appearance.height?.[0],
                appearance['hair-color'],
                appearance['eye-color'],
                appearance.race,
                appearance.gender,
              ].filter(v => v && v !== 'null' && v !== '-').join(' · ') || '—'}
            />
          </p>
        </div>
      )}

      {/* Hint 3: Real name */}
      {hintsUsed >= 3 && (
        <div className="pt-2 border-t border-[#ed1d24]/40 animate-fadeIn">
          <p className="text-[#f5c518] font-bangers text-xs tracking-wider mb-1">HINT 3 — REAL NAME</p>
          <p className="text-white text-base font-semibold">
            <DecryptText text={bio['full-name'] || bio['alter-egos'] || '—'} duration={500} />
          </p>
        </div>
      )}
    </div>
  )
}
