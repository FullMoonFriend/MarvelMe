import { useEffect } from 'react'
import ScoreBar from './ScoreBar'
import HintPanel from './HintPanel'
import AnswerOptions from './AnswerOptions'
import { playHint, playCorrect, playWrong, playGameOver } from '../services/sounds'

/**
 * Main game screen rendered during the 'playing' and 'revealed' phases.
 *
 * Renders the game layout containing:
 * - ScoreBar (always visible)
 * - Points-remaining indicator
 * - HintPanel (clues + optional hints)
 * - Result banner (shown after the player answers)
 * - AnswerOptions (the 4 portrait buttons)
 * - Hint button or Next-round button
 *
 * @param {object}   props
 * @param {object}   props.game          - Full state + actions object from `useGame`.
 * @param {boolean}  props.muted         - Whether sound effects are muted.
 * @param {() => void} props.onToggleMute - Callback to toggle the mute state.
 */
export default function GameBoard({ game, muted, onToggleMute }) {
  const {
    phase,
    round,
    score,
    streak,
    currentHero,
    options,
    hintsUsed,
    result,
    ROUNDS,
    useHint: revealHint,
    submitAnswer,
    nextRound,
  } = game

  const isRevealed = phase === 'revealed'
  const canHint = phase === 'playing' && hintsUsed < 3

  useEffect(() => {
    function handleKeyDown(e) {
      if (phase === 'playing') {
        const idx = parseInt(e.key, 10) - 1
        if (idx >= 0 && idx < options.length) {
          const name = options[idx].name
          const isCorrect = name === currentHero?.name
          isCorrect ? playCorrect() : playWrong()
          submitAnswer(name)
          return
        }
        if (e.key.toLowerCase() === 'h' && hintsUsed < 3) {
          playHint()
          revealHint()
          return
        }
      }
      if (phase === 'revealed' && e.key === 'Enter') {
        if (round >= ROUNDS) playGameOver()
        nextRound(round, score)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [phase, options, currentHero, hintsUsed, round, score, ROUNDS, submitAnswer, revealHint, nextRound])

  return (
    <div className="min-h-screen flex flex-col bg-[#0f0f0f]">
      <ScoreBar round={round} score={score} ROUNDS={ROUNDS} streak={streak} muted={muted} onToggleMute={onToggleMute} />

      <main key={round} className="flex-1 flex flex-col items-center px-4 pt-6 pb-10 animate-fadeIn">
        {/* Points indicator */}
        <div className="mb-4 flex items-center gap-2">
          <span className="text-gray-500 text-xs">Potential points:</span>
          <div className="flex gap-1">
            {[3, 2, 1, 0].map((pts, i) => (
              <span
                key={pts}
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold
                  transition-all duration-300
                  ${i < hintsUsed
                    ? 'bg-[#1a1a1a] text-gray-700 line-through'
                    : i === hintsUsed
                    ? 'bg-[#f5c518] text-black scale-110 shadow-[0_0_8px_rgba(245,197,24,0.6)]'
                    : 'bg-[#2a2a2a] text-gray-500'
                  }`}
              >
                {pts}
              </span>
            ))}
          </div>
        </div>

        {/* Hint panel — always visible */}
        <HintPanel hero={currentHero} hintsUsed={hintsUsed} />

        {/* Reveal result banner */}
        {isRevealed && (
          <div className={`mt-4 px-6 py-2 rounded-full font-bangers text-xl tracking-widest animate-pop
            ${result === 'correct'
              ? 'bg-green-900/50 border border-green-500 text-green-300'
              : 'bg-red-900/30 border border-red-800 text-red-400'
            }`}
          >
            {result === 'correct'
              ? `CORRECT! +${[3,2,1,0][Math.min(hintsUsed,3)]} PTS`
              : `WRONG — It was ${currentHero.name}`
            }
          </div>
        )}

        {/* Answer options */}
        <AnswerOptions
          options={options}
          onSelect={submitAnswer}
          result={result}
          correctName={currentHero.name}
          disabled={isRevealed}
        />

        {/* Hint button or Next button */}
        <div className="mt-6 flex gap-3">
          {!isRevealed && (
            <button
              onClick={() => { playHint(); revealHint() }}
              disabled={!canHint}
              aria-label={`Use hint, ${3 - hintsUsed} remaining`}
              className={`font-bangers text-lg tracking-wider px-6 py-3 rounded-xl border-2 transition-all duration-150
                ${canHint
                  ? 'border-[#f5c518] text-[#f5c518] hover:bg-[#f5c518]/10 active:scale-95'
                  : 'border-gray-700 text-gray-700 cursor-not-allowed'
                }`}
            >
              {hintsUsed === 0 ? '💡 USE HINT' : hintsUsed === 1 ? '💡 HINT 2' : '💡 HINT 3'}
              {canHint && <span className="ml-2 text-sm text-gray-500">(-1 pt)</span>}
            </button>
          )}

          {isRevealed && (
            <button
              onClick={() => {
                if (round >= ROUNDS) playGameOver()
                nextRound(round, score)
              }}
              className="font-bangers text-2xl tracking-widest px-10 py-3 rounded-xl
                bg-[#ed1d24] hover:bg-[#ff2d35] active:scale-95
                text-white shadow-[0_0_16px_rgba(237,29,36,0.4)]
                transition-all duration-150"
            >
              {round >= ROUNDS ? 'SEE RESULTS' : 'NEXT HERO →'}
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
