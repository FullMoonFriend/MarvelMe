import { useState } from 'react'
import { ROUNDS } from '../hooks/useGame'
import { useDailyChallenge } from '../hooks/useDailyChallenge'

const MAX_SCORE = ROUNDS * 3

/**
 * Available hero categories the player can filter by.
 * `id: null` means no filter — all heroes are included.
 *
 * @type {Array<{id: string|null, label: string}>}
 */
const CATEGORIES = [
  { id: null, label: 'All' },
  { id: 'hero', label: 'Heroes' },
  { id: 'xmen', label: 'X-Men' },
  { id: 'villain', label: 'Villains' },
]

/**
 * Returns a short formatted date string for the daily challenge label, e.g. "FEB 28".
 * @returns {string}
 */
function getDailyLabel() {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
}

/**
 * Landing / start screen shown in the 'welcome' game phase.
 *
 * Displays the game logo, a "How to Play" rules card with a hint legend,
 * a category selector, a Start Game button, and a Daily Challenge button.
 *
 * @param {object}   props
 * @param {(category: string|null, options?: { daily?: boolean }) => void} props.onStart
 *   Called with the selected category and options when the player starts.
 */
export default function WelcomeScreen({ onStart }) {
  const [category, setCategory] = useState(null)
  const { todayRecord } = useDailyChallenge()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f0f0f] px-4">
      {/* Logo / Title */}
      <div className="mb-2 text-center">
        <h1 className="font-bangers text-7xl md:text-9xl tracking-widest text-[#ed1d24] drop-shadow-[0_0_20px_rgba(237,29,36,0.6)]">
          MARVEL<span className="text-white">ME</span>
        </h1>
        <p className="text-[#f5c518] font-bangers text-2xl tracking-widest mt-1">
          GUESS THE HERO
        </p>
      </div>

      {/* Rules Card */}
      <div className="mt-10 max-w-md w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 shadow-xl">
        <h2 className="font-bangers text-2xl text-white tracking-wider mb-4">HOW TO PLAY</h2>
        <ul className="space-y-3 text-sm text-gray-300">
          <li className="flex items-start gap-3">
            <span className="text-[#ed1d24] text-lg mt-0.5">①</span>
            <span>A mystery character's <strong className="text-white">power stats</strong> and <strong className="text-white">first appearance</strong> are shown.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-[#ed1d24] text-lg mt-0.5">②</span>
            <span>Use up to <strong className="text-white">3 hints</strong> to reveal occupation, appearance, and real name — each costs 1 pt.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-[#ed1d24] text-lg mt-0.5">③</span>
            <span>Score <strong className="text-[#f5c518]">3 pts</strong> no hints · <strong className="text-[#f5c518]">2 pts</strong> · <strong className="text-[#f5c518]">1 pt</strong> · <strong className="text-gray-400">0 pts</strong></span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-[#ed1d24] text-lg mt-0.5">④</span>
            <span>Pick which of the <strong className="text-white">4 character portraits</strong> matches the clues. Complete <strong className="text-white">10 rounds</strong>!</span>
          </li>
        </ul>

        {/* Hint legend */}
        <div className="mt-5 pt-4 border-t border-[#2a2a2a] grid grid-cols-3 gap-2 text-xs text-center text-gray-400">
          <div>
            <div className="text-[#ed1d24] font-semibold mb-1">Hint 1</div>
            Occupation &amp; base
          </div>
          <div>
            <div className="text-[#ed1d24] font-semibold mb-1">Hint 2</div>
            Physical description
          </div>
          <div>
            <div className="text-[#ed1d24] font-semibold mb-1">Hint 3</div>
            Real name revealed
          </div>
        </div>
      </div>

      {/* Category selector */}
      <div className="mt-6 flex gap-2">
        {CATEGORIES.map(c => (
          <button
            key={String(c.id)}
            onClick={() => setCategory(c.id)}
            className={`font-bangers tracking-wider px-4 py-2 rounded-full text-sm border-2 transition-all duration-150
              ${category === c.id
                ? 'bg-[#ed1d24] border-[#ed1d24] text-white'
                : 'border-[#2a2a2a] text-gray-400 hover:border-[#ed1d24] hover:text-white'
              }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <button
        onClick={() => onStart(category)}
        className="mt-6 font-bangers text-3xl tracking-widest px-12 py-4 rounded-xl
          bg-[#ed1d24] hover:bg-[#ff2d35] active:scale-95
          text-white shadow-[0_0_20px_rgba(237,29,36,0.5)]
          transition-all duration-150"
      >
        START GAME
      </button>

      {/* Daily Challenge */}
      {todayRecord ? (
        <div className="mt-3 flex flex-col items-center gap-1">
          <button
            onClick={() => onStart(null, { daily: true })}
            className="font-bangers text-xl tracking-widest px-10 py-3 rounded-xl
              border-2 border-[#f5c518]/40 text-[#f5c518]/50
              hover:border-[#f5c518] hover:text-[#f5c518]
              active:scale-95 transition-all duration-150"
          >
            ✓ DAILY · {getDailyLabel()} · {todayRecord.score}/{MAX_SCORE}
          </button>
          <p className="text-xs text-gray-600">Already played today · Play again?</p>
        </div>
      ) : (
        <button
          onClick={() => onStart(null, { daily: true })}
          className="mt-3 font-bangers text-xl tracking-widest px-10 py-3 rounded-xl
            border-2 border-[#f5c518] text-[#f5c518]
            hover:bg-[#f5c518] hover:text-[#0f0f0f]
            active:scale-95 transition-all duration-150"
        >
          ⚡ DAILY CHALLENGE · {getDailyLabel()}
        </button>
      )}

      <p className="mt-6 text-xs text-gray-600">
        Powered by superheroapi.com
      </p>
    </div>
  )
}
