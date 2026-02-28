import { useEffect, useState } from 'react'
import { ROUNDS } from '../hooks/useGame'
import { useHighScore } from '../hooks/useHighScore'

/** Maximum achievable score: 3 pts × 10 rounds. */
const MAX_SCORE = ROUNDS * 3 // 30

/**
 * Maps a final score to a letter grade and display label.
 *
 * Thresholds (as percentage of MAX_SCORE):
 * - S (≥90%): LEGENDARY
 * - A (≥75%): HEROIC
 * - B (≥55%): WORTHY
 * - C (≥35%): IN TRAINING
 * - D (<35%):  RECRUIT
 *
 * @param {number} score - The player's final score.
 * @returns {{ letter: string, label: string, color: string }} Grade data including Tailwind colour class.
 */
function getGrade(score) {
  const pct = score / MAX_SCORE
  if (pct >= 0.9) return { letter: 'S', label: 'LEGENDARY', color: 'text-[#f5c518]' }
  if (pct >= 0.75) return { letter: 'A', label: 'HEROIC', color: 'text-green-400' }
  if (pct >= 0.55) return { letter: 'B', label: 'WORTHY', color: 'text-blue-400' }
  if (pct >= 0.35) return { letter: 'C', label: 'IN TRAINING', color: 'text-orange-400' }
  return { letter: 'D', label: 'RECRUIT', color: 'text-gray-400' }
}

/**
 * End-of-game screen shown in the 'gameover' phase.
 *
 * Displays the player's grade, final score out of MAX_SCORE, a dot
 * visualisation of the score, personal-best records, a share button that
 * copies a results summary to the clipboard, and a Play Again button.
 *
 * Calls `useHighScore().update` once on mount to persist new records.
 *
 * @param {object}   props
 * @param {number}   props.score   - Final score for the completed game.
 * @param {number}   props.streak  - Longest streak achieved (passed as maxStreak).
 * @param {Array<{correct: boolean, hintsUsed: number}>} props.history
 *   Per-round result history used to build the emoji share string.
 * @param {() => void} props.onRestart - Callback to return to the welcome screen.
 */
export default function ResultScreen({ score, streak, history, onRestart }) {
  const { bestScore, bestStreak, update } = useHighScore()
  const [copied, setCopied] = useState(false)
  const grade = getGrade(score)

  useEffect(() => {
    update(score, streak)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Builds a shareable text summary and copies it to the clipboard.
   * Shows a brief "COPIED!" confirmation in the button label.
   */
  function handleShare() {
    const emoji = history.map(h => h.correct ? '✅' : '❌').join('')
    const text = `MarvelMe — ${grade.label} (${grade.letter}) 🦸\nScore: ${score}/${MAX_SCORE} | Streak: ${streak}🔥\n${emoji}`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f0f0f] px-4">
      <h1 className="font-bangers text-6xl text-[#ed1d24] tracking-widest drop-shadow-[0_0_20px_rgba(237,29,36,0.6)] mb-2">
        GAME OVER
      </h1>

      <div className="mt-6 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 max-w-sm w-full text-center shadow-xl">
        {/* Grade */}
        <div className={`font-bangers text-8xl ${grade.color} drop-shadow-lg leading-none`}>
          {grade.letter}
        </div>
        <div className={`font-bangers text-2xl tracking-widest mt-1 ${grade.color}`}>
          {grade.label}
        </div>

        {/* Score */}
        <div className="mt-6 pt-6 border-t border-[#2a2a2a]">
          <p className="text-gray-400 text-sm">FINAL SCORE</p>
          <p className="font-bangers text-5xl text-[#f5c518] mt-1">
            {score} <span className="text-2xl text-gray-500">/ {MAX_SCORE}</span>
          </p>
        </div>

        {/* Stars visualization */}
        <div className="mt-4 flex justify-center gap-1">
          {Array.from({ length: MAX_SCORE }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i < score ? 'bg-[#f5c518]' : 'bg-[#2a2a2a]'
              }`}
            />
          ))}
        </div>

        {/* Personal bests */}
        <p className="mt-5 pt-4 border-t border-[#2a2a2a] text-gray-400 text-xs">
          Best Score: <span className="text-[#f5c518]">{bestScore}</span> &nbsp;|&nbsp; Best Streak: <span className="text-orange-400">{bestStreak}🔥</span>
        </p>
      </div>

      {/* Share button */}
      <button
        onClick={handleShare}
        className="mt-4 font-bangers text-lg tracking-widest px-8 py-3 rounded-xl
          border-2 border-[#2a2a2a] text-gray-300 hover:border-[#f5c518] hover:text-[#f5c518]
          active:scale-95 transition-all duration-150"
      >
        {copied ? '✓ COPIED!' : '📋 SHARE RESULT'}
      </button>

      <button
        onClick={onRestart}
        className="mt-3 font-bangers text-3xl tracking-widest px-12 py-4 rounded-xl
          bg-[#ed1d24] hover:bg-[#ff2d35] active:scale-95
          text-white shadow-[0_0_20px_rgba(237,29,36,0.5)]
          transition-all duration-150"
      >
        PLAY AGAIN
      </button>
    </div>
  )
}
