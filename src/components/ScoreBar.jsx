/**
 * Sticky top bar displayed throughout a game session.
 *
 * Shows:
 * - The MarvelMe logo
 * - Round progress bar (rounds completed / total)
 * - Current score with an optional streak indicator
 * - Mute/unmute toggle button
 *
 * @param {object}   props
 * @param {number}   props.round         - Current 1-indexed round number.
 * @param {number}   props.score         - Player's current score.
 * @param {number}   props.ROUNDS        - Total number of rounds in a game.
 * @param {number}   props.streak        - Current consecutive-correct-answer streak.
 * @param {boolean}  props.muted         - Whether sound effects are muted.
 * @param {() => void} props.onToggleMute - Callback to toggle the mute state.
 */
export default function ScoreBar({ round, score, ROUNDS, streak, muted, onToggleMute }) {
  const progress = ((round - 1) / ROUNDS) * 100

  return (
    <div className="w-full bg-[#1a1a1a] border-b border-[#2a2a2a] px-4 py-3">
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
        {/* Logo */}
        <span className="font-bangers text-2xl tracking-widest text-[#ed1d24]">
          MARVEL<span className="text-white">ME</span>
        </span>

        {/* Progress bar */}
        <div className="flex-1 flex items-center gap-2">
          <span className="text-xs text-gray-400 whitespace-nowrap">
            Round {round}/{ROUNDS}
          </span>
          <div className="flex-1 h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#ed1d24] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Score + streak + mute */}
        <div className="flex items-center gap-2">
          {streak >= 2 && (
            <span className="font-bangers text-lg text-orange-400 leading-none">
              🔥{streak}
            </span>
          )}
          <div className="text-right">
            <span className="text-xs text-gray-400">Score</span>
            <div className="font-bangers text-2xl text-[#f5c518] leading-none">{score}</div>
          </div>
          <button
            onClick={onToggleMute}
            className="text-xl text-gray-400 hover:text-white transition-colors ml-1"
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>
    </div>
  )
}
