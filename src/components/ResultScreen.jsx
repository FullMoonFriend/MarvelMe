import { ROUNDS } from '../hooks/useGame'

const MAX_SCORE = ROUNDS * 3 // 30

function getGrade(score) {
  const pct = score / MAX_SCORE
  if (pct >= 0.9) return { letter: 'S', label: 'LEGENDARY', color: 'text-[#f5c518]' }
  if (pct >= 0.75) return { letter: 'A', label: 'HEROIC', color: 'text-green-400' }
  if (pct >= 0.55) return { letter: 'B', label: 'WORTHY', color: 'text-blue-400' }
  if (pct >= 0.35) return { letter: 'C', label: 'IN TRAINING', color: 'text-orange-400' }
  return { letter: 'D', label: 'RECRUIT', color: 'text-gray-400' }
}

export default function ResultScreen({ score, onRestart }) {
  const grade = getGrade(score)

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
      </div>

      <button
        onClick={onRestart}
        className="mt-8 font-bangers text-3xl tracking-widest px-12 py-4 rounded-xl
          bg-[#ed1d24] hover:bg-[#ff2d35] active:scale-95
          text-white shadow-[0_0_20px_rgba(237,29,36,0.5)]
          transition-all duration-150"
      >
        PLAY AGAIN
      </button>
    </div>
  )
}
