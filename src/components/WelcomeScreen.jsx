import { useState } from 'react'
import { dailyNumber, loadDailyResult } from '../utils/daily'

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
 * Landing / start screen shown in the 'welcome' game phase.
 *
 * Displays the game logo, a "How to Play" rules card with a hint legend,
 * a Daily Challenge card (disabled with score if already completed today),
 * a category selector, and a Start Game button.
 *
 * @param {object}   props
 * @param {(category: string|null) => void} props.onStart
 *   Called with the selected category (or null for all) when the player starts a regular game.
 * @param {() => void} props.onStartDaily
 *   Called when the player starts today's Daily Challenge.
 */
export default function WelcomeScreen({ onStart, onStartDaily }) {
  const [category, setCategory] = useState(null)
  const dailyResult = loadDailyResult()
  const num = dailyNumber()

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

      {/* Daily Challenge Card */}
      <div className="mt-8 max-w-md w-full bg-[#1a1a1a] border border-[#f5c518]/40 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bangers text-xl text-[#f5c518] tracking-widest leading-none">
              ⚡ DAILY CHALLENGE
            </p>
            <p className="text-xs text-gray-500 mt-0.5">#{num} — same heroes for everyone today</p>
          </div>
          {dailyResult ? (
            <div className="text-right">
              <p className="text-green-400 font-bangers text-lg tracking-wider">COMPLETED ✓</p>
              <p className="text-gray-400 text-xs">{dailyResult.score} / 30 pts</p>
            </div>
          ) : (
            <button
              onClick={onStartDaily}
              className="font-bangers text-lg tracking-widest px-6 py-2 rounded-xl
                bg-[#f5c518] hover:bg-yellow-400 active:scale-95
                text-black shadow-[0_0_12px_rgba(245,197,24,0.4)]
                transition-all duration-150"
            >
              PLAY
            </button>
          )}
        </div>

        {/* Emoji history row if completed */}
        {dailyResult && (
          <div className="mt-3 pt-3 border-t border-[#2a2a2a] flex gap-1 flex-wrap">
            {dailyResult.history.map((h, i) => (
              <span key={i} className="text-base">{h.correct ? '✅' : '❌'}</span>
            ))}
          </div>
        )}
      </div>

      {/* Rules Card */}
      <div className="mt-4 max-w-md w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 shadow-xl">
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

      <p className="mt-6 text-xs text-gray-600">
        Powered by superheroapi.com
      </p>
    </div>
  )
}
