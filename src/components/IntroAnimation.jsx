import { useState, useEffect, useRef } from 'react'
import heroesData from '../data/heroes.json'
import { playIntroImpact } from '../services/sounds'

const GRID_SIZE = 24
const SESSION_KEY = 'marvelme-intro-played'

export function shouldShowIntro() {
  return !sessionStorage.getItem(SESSION_KEY)
}

export default function IntroAnimation({ onComplete }) {
  const [phase, setPhase] = useState('grid')
  const [showSkip, setShowSkip] = useState(false)
  const portraits = useRef(
    heroesData
      .sort(() => Math.random() - 0.5)
      .slice(0, GRID_SIZE)
      .map(h => h.image?.url)
  )

  useEffect(() => {
    const skipTimer = setTimeout(() => setShowSkip(true), 1000)
    const impactTimer = setTimeout(() => {
      setPhase('impact')
      playIntroImpact()
    }, 2000)
    const holdTimer = setTimeout(() => setPhase('fade'), 3200)
    const doneTimer = setTimeout(() => {
      sessionStorage.setItem(SESSION_KEY, 'true')
      onComplete()
    }, 3800)
    return () => {
      clearTimeout(skipTimer)
      clearTimeout(impactTimer)
      clearTimeout(holdTimer)
      clearTimeout(doneTimer)
    }
  }, [onComplete])

  function handleSkip() {
    sessionStorage.setItem(SESSION_KEY, 'true')
    onComplete()
  }

  return (
    <div className={`fixed inset-0 z-50 bg-black flex items-center justify-center
      transition-opacity duration-500 ${phase === 'fade' ? 'opacity-0' : 'opacity-100'}`}>

      <div className={`absolute inset-0 grid grid-cols-6 grid-rows-4 gap-0.5 p-1
        transition-all duration-700
        ${phase === 'grid' ? 'opacity-70 scale-100' : 'opacity-0 scale-75'}`}>
        {portraits.current.map((url, i) => (
          <div key={i} className="overflow-hidden">
            <img
              src={url}
              alt=""
              className="w-full h-full object-cover object-top animate-fadeIn"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          </div>
        ))}
      </div>

      <div className={`relative z-10 text-center transition-all duration-300
        ${phase === 'impact' || phase === 'fade' ? 'opacity-100 scale-100' : 'opacity-0 scale-150'}`}>
        <h1 className="font-bangers text-7xl md:text-9xl tracking-widest text-[#ed1d24]
          drop-shadow-[0_0_40px_rgba(237,29,36,0.8)]">
          MARVEL<span className="text-white">ME</span>
        </h1>
      </div>

      {showSkip && (
        <button
          onClick={handleSkip}
          className="absolute bottom-8 right-8 text-gray-600 hover:text-gray-300
            text-sm transition-colors"
        >
          Skip →
        </button>
      )}
    </div>
  )
}
