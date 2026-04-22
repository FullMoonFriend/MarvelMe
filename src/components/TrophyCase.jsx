import { ACHIEVEMENTS } from '../data/achievements'
import { THEMES, isThemeUnlocked } from '../data/themes'

export default function TrophyCase({
  achievements,
  unlockedCount,
  activeTheme,
  onSetTheme,
  collectionSize,
  onBack,
}) {
  return (
    <div className="min-h-screen bg-[#0f0f0f] px-4 py-6">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="font-bangers tracking-wider text-gray-400 hover:text-white transition-colors"
          >
            ← BACK
          </button>
          <h1 className="font-bangers text-2xl text-[#f5c518] tracking-widest">TROPHY CASE</h1>
        </div>

        <p className="text-center text-gray-400 text-sm mb-6">
          <span className="text-[#f5c518] font-bangers text-lg">{unlockedCount}</span>
          <span className="mx-1">/</span>
          <span>{ACHIEVEMENTS.length} achievements</span>
        </p>

        <div className="space-y-2 mb-8">
          {ACHIEVEMENTS.map(def => {
            const state = achievements[def.id]
            const unlocked = state?.unlocked
            return (
              <div
                key={def.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all
                  ${unlocked
                    ? 'bg-[#1a1a1a] border-[#f5c518]/30'
                    : 'bg-[#0f0f0f] border-[#1a1a1a] opacity-50'
                  }`}
              >
                <span className="text-xl">{unlocked ? '🏆' : '🔒'}</span>
                <div className="flex-1 min-w-0">
                  <p className={`font-bangers tracking-wider ${unlocked ? 'text-[#f5c518]' : 'text-gray-600'}`}>
                    {unlocked ? def.name : '???'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {unlocked ? def.description : def.hint}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <h2 className="font-bangers text-xl text-[#ed1d24] tracking-widest mb-3">THEMES</h2>
        <div className="space-y-2">
          {THEMES.map(theme => {
            const unlocked = isThemeUnlocked(theme, achievements, collectionSize)
            const active = activeTheme === theme.id
            return (
              <button
                key={theme.id}
                onClick={() => unlocked && onSetTheme(theme.id)}
                disabled={!unlocked}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all
                  ${active
                    ? 'bg-[#ed1d24]/20 border-[#ed1d24]'
                    : unlocked
                      ? 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#ed1d24] cursor-pointer'
                      : 'bg-[#0f0f0f] border-[#1a1a1a] opacity-50 cursor-not-allowed'
                  }`}
              >
                <span className="text-xl">{unlocked ? '🎨' : '🔒'}</span>
                <div className="flex-1 min-w-0">
                  <p className={`font-bangers tracking-wider ${active ? 'text-[#ed1d24]' : unlocked ? 'text-white' : 'text-gray-600'}`}>
                    {theme.name}
                    {active && <span className="ml-2 text-xs text-gray-400">ACTIVE</span>}
                  </p>
                  <p className="text-xs text-gray-500">
                    {unlocked ? theme.description : theme.unlockLabel}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
