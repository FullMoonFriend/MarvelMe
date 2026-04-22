export const THEMES = [
  {
    id: 'default',
    name: 'Default',
    description: 'Classic dark Marvel look',
    unlockCondition: null,
    unlockLabel: 'Always available',
  },
  {
    id: 'golden-age',
    name: 'Golden Age',
    description: 'Sepia tones and vintage comic style',
    unlockCondition: { type: 'achievementCount', count: 5 },
    unlockLabel: 'Earn 5 achievements',
  },
  {
    id: 'noir',
    name: 'Noir',
    description: 'High-contrast black and white',
    unlockCondition: { type: 'achievement', id: 'infinity-score' },
    unlockLabel: 'Score a perfect 30/30',
  },
  {
    id: 'cosmic',
    name: 'Cosmic',
    description: 'Neon nebula gradients',
    unlockCondition: { type: 'collectionSize', count: 100 },
    unlockLabel: 'Encounter 100 unique heroes',
  },
  {
    id: 'symbiote',
    name: 'Symbiote',
    description: 'Dark purple tendrils',
    unlockCondition: { type: 'achievement', id: 'snapped' },
    unlockLabel: 'Score exactly 0 in a game',
  },
  {
    id: 'asgardian',
    name: 'Asgardian',
    description: 'Gold and deep blue royalty',
    unlockCondition: { type: 'achievement', id: 'wakanda' },
    unlockLabel: '7 daily challenges in a row',
  },
]

export function isThemeUnlocked(theme, unlockedAchievements, collectionSize) {
  const cond = theme.unlockCondition
  if (!cond) return true
  if (cond.type === 'achievement') return !!unlockedAchievements[cond.id]?.unlocked
  if (cond.type === 'achievementCount') {
    const count = Object.values(unlockedAchievements).filter(a => a.unlocked).length
    return count >= cond.count
  }
  if (cond.type === 'collectionSize') return collectionSize >= cond.count
  return false
}
