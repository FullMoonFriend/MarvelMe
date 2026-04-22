import { useRef, useCallback } from 'react'
import RadarChart from './RadarChart'

export default function HeroDetailCard({ hero, onClose }) {
  const cardRef = useRef(null)

  const handleMouseMove = useCallback((e) => {
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    card.style.transform = `perspective(600px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`
  }, [])

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current
    if (card) card.style.transform = 'perspective(600px) rotateY(0deg) rotateX(0deg)'
  }, [])

  const bio = hero.biography ?? {}
  const work = hero.work ?? {}
  const categoryColors = {
    hero: 'bg-green-900/50 text-green-300 border-green-700',
    villain: 'bg-red-900/50 text-red-300 border-red-700',
    xmen: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div
        ref={cardRef}
        onClick={e => e.stopPropagation()}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl max-w-sm w-full p-5 shadow-2xl
          transition-transform duration-100 ease-out animate-scaleUp"
      >
        <div className="flex items-start gap-4">
          <img
            src={hero.image?.url}
            alt={hero.name}
            className="w-20 h-20 rounded-xl object-cover object-top border-2 border-[#2a2a2a]"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-bangers text-2xl text-white tracking-wider truncate">{hero.name}</h3>
            {bio['full-name'] && bio['full-name'] !== hero.name && (
              <p className="text-sm text-gray-400 truncate">{bio['full-name']}</p>
            )}
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold border
              ${categoryColors[hero.category] || 'bg-gray-800 text-gray-300 border-gray-600'}`}>
              {hero.category?.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-xs text-gray-300">
          {bio['first-appearance'] && (
            <p><span className="text-gray-500">First appearance: </span>{bio['first-appearance']}</p>
          )}
          {work.occupation && work.occupation !== '-' && (
            <p><span className="text-gray-500">Occupation: </span>{work.occupation}</p>
          )}
        </div>

        <RadarChart powerstats={hero.powerstats ?? {}} className="w-48 h-48 mx-auto mt-3" />

        <button
          onClick={onClose}
          className="mt-4 w-full font-bangers tracking-wider text-lg py-2 rounded-xl
            border-2 border-[#2a2a2a] text-gray-400 hover:border-[#ed1d24] hover:text-white
            transition-all duration-150"
        >
          CLOSE
        </button>
      </div>
    </div>
  )
}
