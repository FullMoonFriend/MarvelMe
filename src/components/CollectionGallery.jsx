import { useState } from 'react'
import heroesData from '../data/heroes.json'
import HeroDetailCard from './HeroDetailCard'

const FILTERS = [
  { id: null, label: 'All' },
  { id: 'hero', label: 'Heroes' },
  { id: 'xmen', label: 'X-Men' },
  { id: 'villain', label: 'Villains' },
]

export default function CollectionGallery({ collected, onBack }) {
  const [filter, setFilter] = useState(null)
  const [selectedHero, setSelectedHero] = useState(null)

  const heroes = filter ? heroesData.filter(h => h.category === filter) : heroesData
  const totalFiltered = heroes.length
  const collectedFiltered = heroes.filter(h => collected.has(h.id)).length

  return (
    <div className="min-h-screen bg-[#0f0f0f] px-4 py-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="font-bangers tracking-wider text-gray-400 hover:text-white transition-colors"
          >
            ← BACK
          </button>
          <h1 className="font-bangers text-2xl text-[#ed1d24] tracking-widest">COLLECTION</h1>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">Progress</span>
            <span className="text-[#f5c518] font-bangers tracking-wider">
              {collectedFiltered} / {totalFiltered}
            </span>
          </div>
          <div className="h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#ed1d24] to-[#f5c518] rounded-full transition-all duration-500"
              style={{ width: `${totalFiltered ? (collectedFiltered / totalFiltered) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {FILTERS.map(f => (
            <button
              key={String(f.id)}
              onClick={() => setFilter(f.id)}
              className={`font-bangers tracking-wider px-3 py-1 rounded-full text-xs border-2 transition-all
                ${filter === f.id
                  ? 'bg-[#ed1d24] border-[#ed1d24] text-white'
                  : 'border-[#2a2a2a] text-gray-400 hover:border-[#ed1d24] hover:text-white'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 gap-2">
          {heroes.map(hero => {
            const isCollected = collected.has(hero.id)
            return (
              <button
                key={hero.id}
                onClick={() => isCollected && setSelectedHero(hero)}
                disabled={!isCollected}
                className={`aspect-square rounded-lg overflow-hidden border-2 transition-all duration-200
                  ${isCollected
                    ? 'border-[#2a2a2a] hover:border-[#ed1d24] cursor-pointer'
                    : 'border-[#1a1a1a] cursor-default'
                  }`}
              >
                <img
                  src={hero.image?.url}
                  alt={isCollected ? hero.name : '???'}
                  className={`w-full h-full object-cover object-top
                    ${isCollected ? '' : 'brightness-0'}`}
                />
              </button>
            )
          })}
        </div>
      </div>

      {selectedHero && (
        <HeroDetailCard hero={selectedHero} onClose={() => setSelectedHero(null)} />
      )}
    </div>
  )
}
