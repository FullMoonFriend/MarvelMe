import { useEffect, useState, useCallback } from 'react'
import ScoreBar from './ScoreBar'
import HintPanel from './HintPanel'
import AnswerOptions from './AnswerOptions'
import HeroReveal from './HeroReveal'
import RoundWipe from './RoundWipe'
import AchievementToast from './AchievementToast'
import { playHint, playGameOver } from '../services/sounds'
import { POINTS } from '../hooks/useGame'

export default function GameBoard({ game, muted, onToggleMute, collection, achievements, onRevealComplete }) {
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
    completeReveal,
    nextRound,
  } = game

  const [showWipe, setShowWipe] = useState(false)
  const [pendingNext, setPendingNext] = useState(null)
  const [toastQueue, setToastQueue] = useState([])
  const [selectedName, setSelectedName] = useState(null)
  const [prevStreak, setPrevStreak] = useState(0)

  const isRevealed = phase === 'revealed'
  const isRevealing = phase === 'revealing'
  const canHint = phase === 'playing' && hintsUsed < 3

  const handleSelect = useCallback((name) => {
    if (phase !== 'playing') return
    setSelectedName(name)
    setPrevStreak(streak)
    submitAnswer(name)
  }, [phase, streak, submitAnswer])

  const handleRevealComplete = useCallback(() => {
    completeReveal()
    if (onRevealComplete) onRevealComplete(selectedName)
  }, [completeReveal, onRevealComplete, selectedName])

  const handleNextRound = useCallback(() => {
    if (round >= ROUNDS) {
      playGameOver()
      nextRound(round, score)
      return
    }
    setShowWipe(true)
    setPendingNext({ round, score })
  }, [round, score, ROUNDS, nextRound])

  const handleWipeComplete = useCallback(() => {
    setShowWipe(false)
    if (pendingNext) {
      nextRound(pendingNext.round, pendingNext.score)
      setPendingNext(null)
      setSelectedName(null)
    }
  }, [pendingNext, nextRound])

  const handleToastDone = useCallback(() => {
    setToastQueue(q => q.slice(1))
  }, [])

  useEffect(() => {
    if (achievements?.newlyUnlocked?.length) {
      setToastQueue(q => [...q, ...achievements.newlyUnlocked])
    }
  }, [achievements?.newlyUnlocked])

  useEffect(() => {
    function handleKeyDown(e) {
      if (phase === 'playing') {
        const idx = parseInt(e.key, 10) - 1
        if (idx >= 0 && idx < options.length) {
          handleSelect(options[idx].name)
          return
        }
        if (e.key.toLowerCase() === 'h' && hintsUsed < 3) {
          playHint()
          revealHint()
          return
        }
      }
      if (phase === 'revealed' && e.key === 'Enter') {
        handleNextRound()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [phase, options, hintsUsed, handleSelect, revealHint, handleNextRound])

  const pointsEarned = result === 'correct' ? POINTS[Math.min(hintsUsed, 3)] : 0

  return (
    <div className="min-h-screen flex flex-col bg-[#0f0f0f]">
      <ScoreBar round={round} score={score} ROUNDS={ROUNDS} streak={streak} muted={muted} onToggleMute={onToggleMute} />

      <main key={isRevealing ? `reveal-${round}` : round} className="flex-1 flex flex-col items-center px-4 pt-6 pb-10 animate-fadeIn">
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

        <HintPanel hero={currentHero} hintsUsed={hintsUsed} />

        {isRevealing && (
          <HeroReveal
            result={result}
            correctHero={currentHero}
            selectedName={selectedName}
            options={options}
            pointsEarned={pointsEarned}
            streak={streak}
            prevStreak={prevStreak}
            onComplete={handleRevealComplete}
          />
        )}

        {isRevealed && (
          <>
            <div className={`mt-4 px-6 py-2 rounded-full font-bangers text-xl tracking-widest animate-pop
              ${result === 'correct'
                ? 'bg-green-900/50 border border-green-500 text-green-300'
                : 'bg-red-900/30 border border-red-800 text-red-400'
              }`}
            >
              {result === 'correct'
                ? `CORRECT! +${pointsEarned} PTS`
                : `WRONG — It was ${currentHero.name}`
              }
            </div>

            <AnswerOptions
              options={options}
              onSelect={handleSelect}
              result={result}
              correctName={currentHero.name}
              disabled={true}
            />
          </>
        )}

        {phase === 'playing' && (
          <AnswerOptions
            options={options}
            onSelect={handleSelect}
            result={result}
            correctName={currentHero.name}
            disabled={false}
          />
        )}

        <div className="mt-6 flex gap-3">
          {phase === 'playing' && (
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
              onClick={handleNextRound}
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

      {showWipe && (
        <RoundWipe category={currentHero?.category} onComplete={handleWipeComplete} />
      )}

      {toastQueue.length > 0 && (
        <AchievementToast achievement={toastQueue[0]} onDone={handleToastDone} />
      )}
    </div>
  )
}
