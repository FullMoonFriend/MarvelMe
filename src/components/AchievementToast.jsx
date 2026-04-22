import { useEffect, useState } from 'react'
import { playAchievement, playThemeUnlock } from '../services/sounds'
import { THEMES } from '../data/themes'

export default function AchievementToast({ achievement, onDone }) {
  const [visible, setVisible] = useState(false)

  const unlocksTheme = achievement ? THEMES.find(t =>
    t.unlockCondition?.type === 'achievement' && t.unlockCondition.id === achievement.id
  ) : null

  useEffect(() => {
    if (!achievement) return
    unlocksTheme ? playThemeUnlock() : playAchievement()
    requestAnimationFrame(() => setVisible(true))
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onDone, 300)
    }, 3000)
    return () => clearTimeout(timer)
  }, [achievement, onDone, unlocksTheme])

  if (!achievement) return null

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50
        bg-[#1a1a1a] border-2 border-[#f5c518] rounded-xl px-6 py-3
        shadow-[0_0_20px_rgba(245,197,24,0.4)]
        transition-all duration-300
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">🏆</span>
        <div>
          <p className="font-bangers text-[#f5c518] tracking-wider text-sm">ACHIEVEMENT UNLOCKED</p>
          <p className="font-bangers text-white text-lg tracking-wide">{achievement.name}</p>
          <p className="text-xs text-gray-400">{achievement.description}</p>
        </div>
      </div>
      {unlocksTheme && (
        <p className="mt-2 text-xs text-[#f5c518] border-t border-[#2a2a2a] pt-2">
          🎨 Theme unlocked: {unlocksTheme.name}
        </p>
      )}
    </div>
  )
}
