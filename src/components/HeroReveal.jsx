import { useEffect, useState } from 'react'
import { playCorrect, playWrong } from '../services/sounds'

export default function HeroReveal({
  result,
  correctHero,
  selectedName,
  options,
  pointsEarned,
  streak,
  prevStreak,
  onComplete,
}) {
  const [step, setStep] = useState(0)
  const isCorrect = result === 'correct'

  useEffect(() => {
    isCorrect ? playCorrect() : playWrong()

    const t1 = setTimeout(() => setStep(1), 300)
    const t2 = setTimeout(() => setStep(2), 800)
    const t3 = setTimeout(() => setStep(3), 1400)
    const t4 = setTimeout(() => onComplete(), 2200)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [isCorrect, onComplete])

  return (
    <div className="w-full max-w-sm mx-auto mt-6 relative">
      <div className={!isCorrect && step >= 1 ? 'animate-shake' : ''}>
        <div className="grid grid-cols-2 gap-3">
          {options.map(option => {
            const isSelected = option.name === selectedName
            const isAnswer = option.name === correctHero.name
            const shouldDim = step >= 1 && !isAnswer
            const shouldCenter = step >= 2 && isAnswer

            return (
              <div
                key={option.name}
                className={`border-2 rounded-xl overflow-hidden transition-all bg-[#1a1a1a]
                  ${isSelected && !isCorrect && step >= 1
                    ? 'border-red-500 animate-[crackShatter_0.4s_ease-out_forwards]'
                    : ''}
                  ${isAnswer && step >= 1
                    ? isCorrect
                      ? 'border-[#f5c518] shadow-[0_0_20px_rgba(245,197,24,0.5)]'
                      : 'border-green-500'
                    : 'border-[#2a2a2a]'}
                  ${shouldDim && !isSelected ? 'opacity-30 scale-90' : ''}
                  ${shouldCenter ? (isCorrect ? 'scale-110 z-10' : 'scale-105') : ''}`}
                style={{ transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
              >
                <img
                  src={option.image?.url}
                  alt={option.name}
                  className="w-full aspect-square object-cover object-top"
                />
                {isAnswer && step >= 2 && (
                  <div className="bg-black/80 px-2 py-1.5 text-center animate-slideUp">
                    <p className={`font-bangers tracking-wider text-sm
                      ${isCorrect ? 'text-[#f5c518]' : 'text-green-400'}`}>
                      {option.name}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {isCorrect && step >= 3 && pointsEarned > 0 && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 animate-floatUp
          font-bangers text-3xl text-[#f5c518] drop-shadow-lg pointer-events-none">
          +{pointsEarned}
        </div>
      )}

      {!isCorrect && prevStreak >= 2 && step >= 2 && (
        <div className="absolute top-4 right-4 animate-flameOut
          font-bangers text-2xl text-orange-400 pointer-events-none">
          🔥{prevStreak}
        </div>
      )}

      {isCorrect && streak >= 3 && step >= 3 && (
        <div className="absolute top-4 right-4 animate-pop
          font-bangers text-2xl text-orange-400 pointer-events-none">
          🔥{streak}
        </div>
      )}
    </div>
  )
}
