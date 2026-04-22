# Cinematic Marvel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate MarvelMe from a polished quiz into a cinematic "show your friend" experience with dramatic reveals, progression systems, unlockable themes, and a hero collection gallery.

**Architecture:** The feature set adds three new hooks (`useCollection`, `useAchievements`, `useTheme`) layered on top of the existing `useGame` state machine. A new `revealing` phase gates the cinematic reveal animation between `playing` and `revealed`. All persistence uses `localStorage`. Eight new components handle intro animation, hero reveals, round wipes, achievement toasts, trophy case, collection gallery, hero detail cards, and radar charts. Existing components (`ScoreBar`, `HintPanel`, `AnswerOptions`, `GameBoard`, `App`, `WelcomeScreen`) receive targeted enhancements.

**Tech Stack:** React 19, Vite 7, Tailwind CSS v4, Web Audio API, SVG (radar chart), CSS keyframes/transforms (all animations), localStorage (persistence).

**Spec:** `docs/superpowers/specs/2026-04-22-cinematic-marvel-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/services/sounds.js` | (modify) Add 7 new synthesized sounds |
| `src/hooks/useCollection.js` | Track seen hero IDs in localStorage |
| `src/hooks/useAchievements.js` | Achievement definitions, unlock checks, progress |
| `src/hooks/useTheme.js` | Theme selection, persistence, CSS property application |
| `src/data/achievements.js` | Achievement registry (IDs, names, descriptions, conditions) |
| `src/data/themes.js` | Theme registry (IDs, names, CSS properties, unlock conditions) |
| `src/components/IntroAnimation.jsx` | Full-screen animated intro overlay |
| `src/components/HeroReveal.jsx` | Cinematic reveal (correct + wrong variants) |
| `src/components/RoundWipe.jsx` | Panel wipe transition between rounds |
| `src/components/AchievementToast.jsx` | Slide-in toast on achievement unlock |
| `src/components/TrophyCase.jsx` | Achievement list + theme selector screen |
| `src/components/CollectionGallery.jsx` | Hero grid with filters + detail view |
| `src/components/HeroDetailCard.jsx` | Full hero detail card with tilt effect |
| `src/components/RadarChart.jsx` | SVG hexagon powerstats visualization |
| `src/components/RollingNumber.jsx` | Animated counting number display |
| `src/components/DecryptText.jsx` | Text scramble/decode effect |
| `src/hooks/__tests__/useCollection.test.js` | Tests for useCollection |
| `src/hooks/__tests__/useAchievements.test.js` | Tests for useAchievements |
| `src/hooks/__tests__/useTheme.test.js` | Tests for useTheme |

### Modified Files
| File | Changes |
|------|---------|
| `src/hooks/useGame.js` | Add `revealing` phase, export `POINTS` |
| `src/index.css` | New keyframes, theme variant selectors, ambient animations |
| `src/App.jsx` | Integrate intro, theme provider, trophy/collection screen routing |
| `src/components/GameBoard.jsx` | Integrate reveal, wipe, collection, achievements |
| `src/components/WelcomeScreen.jsx` | Add Collection and Trophy Case buttons |
| `src/components/ScoreBar.jsx` | Rolling score counter, streak flames, progress glow |
| `src/components/HintPanel.jsx` | Decryption text effect, animated cost indicator |
| `src/components/AnswerOptions.jsx` | Breathing animation, hover lift, tap ripple |

---

## Task 1: Sound Design Upgrades

**Files:**
- Modify: `src/services/sounds.js`

- [ ] **Step 1: Add the `playNoise` helper for whoosh effects**

Add this helper function after the existing `playTone` function (after line 42):

```js
function playNoise(startTime, duration, gain, audioCtx) {
  const bufferSize = audioCtx.sampleRate * duration
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
  const source = audioCtx.createBufferSource()
  source.buffer = buffer
  const bandpass = audioCtx.createBiquadFilter()
  bandpass.type = 'bandpass'
  bandpass.frequency.setValueAtTime(200, startTime)
  bandpass.frequency.exponentialRampToValueAtTime(4000, startTime + duration)
  bandpass.Q.value = 1.5
  const gainNode = audioCtx.createGain()
  gainNode.gain.setValueAtTime(gain, startTime)
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
  source.connect(bandpass)
  bandpass.connect(gainNode)
  gainNode.connect(audioCtx.destination)
  source.start(startTime)
  source.stop(startTime + duration)
}
```

- [ ] **Step 2: Replace `playCorrect` with the enhanced 4-note reveal sting**

Replace the existing `playCorrect` function:

```js
export function playCorrect() {
  if (_muted) return
  try {
    const c = getCtx()
    const now = c.currentTime
    playTone(523, now, 0.12, 0.3, c)         // C5
    playTone(659, now + 0.1, 0.12, 0.3, c)   // E5
    playTone(784, now + 0.2, 0.12, 0.3, c)   // G5
    playTone(1047, now + 0.3, 0.25, 0.35, c) // C6
  } catch {}
}
```

- [ ] **Step 3: Replace `playWrong` with the deeper rumble**

Replace the existing `playWrong` function:

```js
export function playWrong() {
  if (_muted) return
  try {
    const c = getCtx()
    const now = c.currentTime
    playTone(110, now, 0.2, 0.4, c)        // A2
    playTone(87, now + 0.15, 0.35, 0.35, c) // F2
  } catch {}
}
```

- [ ] **Step 4: Add the 5 new sound functions**

Add these after the existing `playGameOver` function:

```js
export function playIntroImpact() {
  if (_muted) return
  try {
    const c = getCtx()
    const now = c.currentTime
    // Sub-bass boom
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.connect(g)
    g.connect(c.destination)
    osc.frequency.value = 60
    g.gain.setValueAtTime(0.5, now)
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.6)
    osc.start(now)
    osc.stop(now + 0.6)
    // Metallic ping
    playTone(2500, now, 0.08, 0.2, c)
    playTone(3200, now + 0.02, 0.06, 0.15, c)
  } catch {}
}

export function playAchievement() {
  if (_muted) return
  try {
    const c = getCtx()
    const now = c.currentTime
    playTone(880, now, 0.1, 0.2, c)          // A5
    playTone(1109, now + 0.08, 0.1, 0.2, c)  // C#6
    playTone(1319, now + 0.16, 0.2, 0.25, c) // E6
  } catch {}
}

export function playThemeUnlock() {
  if (_muted) return
  try {
    const c = getCtx()
    const now = c.currentTime
    playTone(880, now, 0.1, 0.2, c)
    playTone(1109, now + 0.08, 0.1, 0.2, c)
    playTone(1319, now + 0.16, 0.25, 0.25, c)
    // Low chord underneath
    playTone(220, now + 0.1, 0.5, 0.15, c)
    playTone(277, now + 0.1, 0.5, 0.12, c)
  } catch {}
}

export function playCollectionNew() {
  if (_muted) return
  try {
    const c = getCtx()
    playTone(1200, c.currentTime, 0.1, 0.1, c)
  } catch {}
}

export function playRoundWipe() {
  if (_muted) return
  try {
    const c = getCtx()
    playNoise(c.currentTime, 0.3, 0.12, c)
  } catch {}
}
```

- [ ] **Step 5: Verify sounds module exports work**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add src/services/sounds.js
git commit -m "feat: add cinematic sound effects (intro, achievement, theme, collection, wipe)"
```

---

## Task 2: CSS Foundation — Keyframes, Theme Variables, Animations

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add new animation keyframes and theme entries**

Add the following new animation entries inside the existing `@theme {}` block, after the `--animate-pop` line (line 18):

```css
  --animate-breathe: breathe 2s ease-in-out infinite;
  --animate-shake: shake 0.3s ease-in-out;
  --animate-wipeIn: wipeIn 0.4s ease-out forwards;
  --animate-slideUp: slideUp 0.4s ease-out forwards;
  --animate-slideDown: slideDown 0.3s ease-out forwards;
  --animate-scaleUp: scaleUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  --animate-floatUp: floatUp 0.8s ease-out forwards;
  --animate-flameOut: flameOut 0.4s ease-out forwards;
  --animate-lightBurst: lightBurst 0.6s ease-out forwards;
```

- [ ] **Step 2: Add the `@keyframes` definitions**

Add after the existing `pop` keyframes (after line 35):

```css
@keyframes breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.005); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-4px); }
  40% { transform: translateX(4px); }
  60% { transform: translateX(-3px); }
  80% { transform: translateX(2px); }
}

@keyframes wipeIn {
  from { clip-path: inset(0 100% 0 0); }
  to { clip-path: inset(0 0 0 0); }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-30px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scaleUp {
  from { opacity: 0; transform: scale(0.5); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes floatUp {
  0% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-40px); }
}

@keyframes flameOut {
  0% { opacity: 1; transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { opacity: 0; transform: scale(0); }
}

@keyframes lightBurst {
  0% { opacity: 0; transform: scale(0.3); }
  50% { opacity: 0.8; transform: scale(1.2); }
  100% { opacity: 0; transform: scale(2); }
}

@keyframes progressGlow {
  0%, 100% { box-shadow: 0 0 4px rgba(237, 29, 36, 0.4); }
  50% { box-shadow: 0 0 10px rgba(237, 29, 36, 0.8); }
}

@keyframes crackShatter {
  0% { filter: brightness(1); clip-path: inset(0); }
  50% { filter: brightness(2) sepia(1) hue-rotate(-20deg); }
  100% { filter: brightness(0.5); clip-path: polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%); }
}
```

- [ ] **Step 3: Add theme variant selectors for unlockable themes**

Add at the end of the file, before the closing:

```css
/* Theme: Golden Age */
[data-theme="golden-age"] {
  --color-marvel-red: #8b4513;
  --color-marvel-darkred: #654321;
  --color-marvel-gold: #daa520;
  --color-marvel-dark: #1a1409;
  --color-marvel-card: #2a2010;
  --color-marvel-border: #3a3020;
}
[data-theme="golden-age"] img { filter: sepia(0.3) contrast(1.1); }

/* Theme: Noir */
[data-theme="noir"] {
  --color-marvel-red: #cc0000;
  --color-marvel-darkred: #990000;
  --color-marvel-gold: #ffffff;
  --color-marvel-dark: #000000;
  --color-marvel-card: #111111;
  --color-marvel-border: #222222;
}
[data-theme="noir"] img { filter: grayscale(1) contrast(1.3); }

/* Theme: Cosmic */
[data-theme="cosmic"] {
  --color-marvel-red: #8b5cf6;
  --color-marvel-darkred: #6d28d9;
  --color-marvel-gold: #06ffc3;
  --color-marvel-dark: #0a0020;
  --color-marvel-card: #150040;
  --color-marvel-border: #2a1060;
}

/* Theme: Symbiote */
[data-theme="symbiote"] {
  --color-marvel-red: #7c3aed;
  --color-marvel-darkred: #5b21b6;
  --color-marvel-gold: #a78bfa;
  --color-marvel-dark: #050005;
  --color-marvel-card: #0f000f;
  --color-marvel-border: #1a001a;
}

/* Theme: Asgardian */
[data-theme="asgardian"] {
  --color-marvel-red: #1e40af;
  --color-marvel-darkred: #1e3a8a;
  --color-marvel-gold: #fbbf24;
  --color-marvel-dark: #0a0e1a;
  --color-marvel-card: #111827;
  --color-marvel-border: #1f2937;
}
```

- [ ] **Step 4: Verify build succeeds**

Run: `npm run build`
Expected: Build succeeds, no CSS errors.

- [ ] **Step 5: Commit**

```bash
git add src/index.css
git commit -m "feat: add cinematic CSS keyframes and theme variant selectors"
```

---

## Task 3: Achievement & Theme Data Registries

**Files:**
- Create: `src/data/achievements.js`
- Create: `src/data/themes.js`

- [ ] **Step 1: Create the achievement registry**

```js
// src/data/achievements.js

export const ACHIEVEMENTS = [
  {
    id: 'origin-story',
    name: 'Origin Story',
    description: 'Complete your first game',
    hint: 'Play a full game to the end',
    check: ({ gamesCompleted }) => gamesCompleted >= 1,
  },
  {
    id: 'infinity-score',
    name: 'Infinity Score',
    description: 'Score a perfect 30/30',
    hint: '???',
    check: ({ lastScore }) => lastScore === 30,
  },
  {
    id: 'hulk-smashing',
    name: 'Hulk Smashing It',
    description: '5 correct answers in a row',
    hint: '???',
    check: ({ lastMaxStreak }) => lastMaxStreak >= 5,
  },
  {
    id: 'all-day',
    name: 'I Can Do This All Day',
    description: '10 in a row — flawless',
    hint: '???',
    check: ({ lastMaxStreak }) => lastMaxStreak >= 10,
  },
  {
    id: 'spider-sense',
    name: 'Spider-Sense Tingling',
    description: 'Answer correctly with no hints',
    hint: '???',
    check: ({ roundNoHintCorrect }) => roundNoHintCorrect,
  },
  {
    id: 'inevitable',
    name: 'I Am Inevitable',
    description: 'Complete a game using zero hints',
    hint: '???',
    check: ({ gameNoHints }) => gameNoHints,
  },
  {
    id: 'phone-shield',
    name: 'Phone A S.H.I.E.L.D.',
    description: 'Use all 3 hints in a round',
    hint: '???',
    check: ({ roundUsedAllHints }) => roundUsedAllHints,
  },
  {
    id: 'avengers',
    name: 'Avengers Assembled',
    description: 'Score 25+ in Heroes category',
    hint: '???',
    check: ({ lastScore, lastCategory }) => lastCategory === 'hero' && lastScore >= 25,
  },
  {
    id: 'know-enemy',
    name: 'Know Thy Enemy',
    description: 'Score 25+ in Villains category',
    hint: '???',
    check: ({ lastScore, lastCategory }) => lastCategory === 'villain' && lastScore >= 25,
  },
  {
    id: 'xaviers-pupil',
    name: "Xavier's Star Pupil",
    description: 'Score 25+ in X-Men category',
    hint: '???',
    check: ({ lastScore, lastCategory }) => lastCategory === 'xmen' && lastScore >= 25,
  },
  {
    id: 'daily-bugle',
    name: 'Daily Bugle Reader',
    description: 'Complete 3 daily challenges',
    hint: '???',
    check: (_, { dailiesCompleted }) => dailiesCompleted >= 3,
    progressive: true,
    target: 3,
    progressKey: 'dailiesCompleted',
  },
  {
    id: 'wakanda',
    name: 'Wakanda Forever',
    description: '7 daily challenges in a row',
    hint: '???',
    check: (_, { dailyStreak }) => dailyStreak >= 7,
    progressive: true,
    target: 7,
    progressKey: 'dailyStreak',
  },
  {
    id: 'watcher',
    name: "Watcher's Dedication",
    description: '30 daily challenges',
    hint: '???',
    check: (_, { dailiesCompleted }) => dailiesCompleted >= 30,
    progressive: true,
    target: 30,
    progressKey: 'dailiesCompleted',
  },
  {
    id: 'multiverse',
    name: 'Multiverse Explorer',
    description: 'Encounter 50 unique heroes',
    hint: '???',
    check: (_, { collectionSize }) => collectionSize >= 50,
    progressive: true,
    target: 50,
    progressKey: 'collectionSize',
  },
  {
    id: 'the-collector',
    name: 'The Collector',
    description: 'Encounter all 344 heroes',
    hint: '???',
    check: (_, { collectionSize }) => collectionSize >= 344,
    progressive: true,
    target: 344,
    progressKey: 'collectionSize',
  },
  {
    id: 'puny-human',
    name: 'Puny Human',
    description: 'Get a wrong answer',
    hint: '???',
    check: ({ roundWrong }) => roundWrong,
  },
  {
    id: 'snapped',
    name: 'Thanos Snapped Your Score',
    description: 'Score exactly 0 in a game',
    hint: '???',
    check: ({ lastScore, gamesCompleted }) => gamesCompleted >= 1 && lastScore === 0,
  },
]

export function getAchievementById(id) {
  return ACHIEVEMENTS.find(a => a.id === id)
}
```

- [ ] **Step 2: Create the theme registry**

```js
// src/data/themes.js

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
```

- [ ] **Step 3: Verify modules import correctly**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/data/achievements.js src/data/themes.js
git commit -m "feat: add achievement and theme data registries"
```

---

## Task 4: useCollection Hook

**Files:**
- Create: `src/hooks/useCollection.js`
- Create: `src/hooks/__tests__/useCollection.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// src/hooks/__tests__/useCollection.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCollection } from '../useCollection'

describe('useCollection', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts empty when no localStorage data exists', () => {
    const { result } = renderHook(() => useCollection())
    expect(result.current.collected).toEqual(new Set())
    expect(result.current.size).toBe(0)
  })

  it('markSeen adds hero IDs to the collection', () => {
    const { result } = renderHook(() => useCollection())
    act(() => result.current.markSeen(['14', '57', '106']))
    expect(result.current.size).toBe(3)
    expect(result.current.collected.has('14')).toBe(true)
    expect(result.current.collected.has('57')).toBe(true)
  })

  it('markSeen deduplicates IDs', () => {
    const { result } = renderHook(() => useCollection())
    act(() => result.current.markSeen(['14', '57']))
    act(() => result.current.markSeen(['57', '106']))
    expect(result.current.size).toBe(3)
  })

  it('markSeen returns newly added IDs', () => {
    const { result } = renderHook(() => useCollection())
    let newIds
    act(() => { newIds = result.current.markSeen(['14', '57']) })
    expect(newIds).toEqual(['14', '57'])
    act(() => { newIds = result.current.markSeen(['57', '106']) })
    expect(newIds).toEqual(['106'])
  })

  it('persists to localStorage', () => {
    const { result } = renderHook(() => useCollection())
    act(() => result.current.markSeen(['14', '57']))
    const stored = JSON.parse(localStorage.getItem('marvelme-collection'))
    expect(stored).toContain('14')
    expect(stored).toContain('57')
  })

  it('loads from localStorage on mount', () => {
    localStorage.setItem('marvelme-collection', JSON.stringify(['14', '57', '106']))
    const { result } = renderHook(() => useCollection())
    expect(result.current.size).toBe(3)
    expect(result.current.collected.has('14')).toBe(true)
  })

  it('handles corrupt localStorage gracefully', () => {
    localStorage.setItem('marvelme-collection', 'not-json')
    const { result } = renderHook(() => useCollection())
    expect(result.current.size).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/__tests__/useCollection.test.js`
Expected: All tests FAIL (module not found).

- [ ] **Step 3: Implement useCollection**

```js
// src/hooks/useCollection.js
import { useState, useCallback } from 'react'

const KEY = 'marvelme-collection'

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw))
  } catch {
    return new Set()
  }
}

function save(set) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...set]))
  } catch {}
}

export function useCollection() {
  const [collected, setCollected] = useState(load)

  const markSeen = useCallback((ids) => {
    let newIds = []
    setCollected(prev => {
      newIds = ids.filter(id => !prev.has(id))
      if (newIds.length === 0) return prev
      const next = new Set(prev)
      newIds.forEach(id => next.add(id))
      save(next)
      return next
    })
    return newIds
  }, [])

  return { collected, size: collected.size, markSeen }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/__tests__/useCollection.test.js`
Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCollection.js src/hooks/__tests__/useCollection.test.js
git commit -m "feat: add useCollection hook for tracking seen heroes"
```

---

## Task 5: useAchievements Hook

**Files:**
- Create: `src/hooks/useAchievements.js`
- Create: `src/hooks/__tests__/useAchievements.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// src/hooks/__tests__/useAchievements.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAchievements } from '../useAchievements'

describe('useAchievements', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts with no achievements unlocked', () => {
    const { result } = renderHook(() => useAchievements())
    expect(result.current.unlockedCount).toBe(0)
    expect(Object.keys(result.current.achievements)).toHaveLength(0)
  })

  it('checkRound unlocks puny-human on wrong answer', () => {
    const { result } = renderHook(() => useAchievements())
    let unlocked
    act(() => {
      unlocked = result.current.checkRound({
        roundWrong: true,
        roundNoHintCorrect: false,
        roundUsedAllHints: false,
      }, { collectionSize: 0, dailiesCompleted: 0, dailyStreak: 0 })
    })
    expect(unlocked.map(a => a.id)).toContain('puny-human')
    expect(result.current.achievements['puny-human'].unlocked).toBe(true)
  })

  it('checkRound unlocks spider-sense on no-hint correct', () => {
    const { result } = renderHook(() => useAchievements())
    let unlocked
    act(() => {
      unlocked = result.current.checkRound({
        roundNoHintCorrect: true,
        roundWrong: false,
        roundUsedAllHints: false,
      }, { collectionSize: 0, dailiesCompleted: 0, dailyStreak: 0 })
    })
    expect(unlocked.map(a => a.id)).toContain('spider-sense')
  })

  it('checkGameOver unlocks origin-story on first game', () => {
    const { result } = renderHook(() => useAchievements())
    let unlocked
    act(() => {
      unlocked = result.current.checkGameOver({
        lastScore: 15,
        lastMaxStreak: 3,
        gamesCompleted: 1,
        gameNoHints: false,
        lastCategory: null,
      }, { collectionSize: 10, dailiesCompleted: 0, dailyStreak: 0 })
    })
    expect(unlocked.map(a => a.id)).toContain('origin-story')
  })

  it('does not unlock the same achievement twice', () => {
    const { result } = renderHook(() => useAchievements())
    act(() => {
      result.current.checkRound({ roundWrong: true, roundNoHintCorrect: false, roundUsedAllHints: false },
        { collectionSize: 0, dailiesCompleted: 0, dailyStreak: 0 })
    })
    let unlocked
    act(() => {
      unlocked = result.current.checkRound({ roundWrong: true, roundNoHintCorrect: false, roundUsedAllHints: false },
        { collectionSize: 0, dailiesCompleted: 0, dailyStreak: 0 })
    })
    expect(unlocked).toHaveLength(0)
  })

  it('persists to localStorage', () => {
    const { result } = renderHook(() => useAchievements())
    act(() => {
      result.current.checkRound({ roundWrong: true, roundNoHintCorrect: false, roundUsedAllHints: false },
        { collectionSize: 0, dailiesCompleted: 0, dailyStreak: 0 })
    })
    const stored = JSON.parse(localStorage.getItem('marvelme-achievements'))
    expect(stored['puny-human'].unlocked).toBe(true)
  })

  it('loads from localStorage on mount', () => {
    localStorage.setItem('marvelme-achievements', JSON.stringify({
      'puny-human': { unlocked: true, unlockedAt: '2026-04-22T00:00:00.000Z' },
    }))
    const { result } = renderHook(() => useAchievements())
    expect(result.current.achievements['puny-human'].unlocked).toBe(true)
    expect(result.current.unlockedCount).toBe(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/__tests__/useAchievements.test.js`
Expected: All tests FAIL (module not found).

- [ ] **Step 3: Implement useAchievements**

```js
// src/hooks/useAchievements.js
import { useState, useCallback } from 'react'
import { ACHIEVEMENTS } from '../data/achievements'

const KEY = 'marvelme-achievements'

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {}
  } catch {
    return {}
  }
}

function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {}
}

export function useAchievements() {
  const [achievements, setAchievements] = useState(load)

  const tryUnlock = useCallback((roundCtx, globalCtx) => {
    const newlyUnlocked = []
    setAchievements(prev => {
      let changed = false
      const next = { ...prev }
      for (const def of ACHIEVEMENTS) {
        if (next[def.id]?.unlocked) continue
        if (def.check(roundCtx, globalCtx)) {
          next[def.id] = { unlocked: true, unlockedAt: new Date().toISOString() }
          newlyUnlocked.push(def)
          changed = true
        }
      }
      if (!changed) return prev
      save(next)
      return next
    })
    return newlyUnlocked
  }, [])

  const checkRound = useCallback((roundCtx, globalCtx) => {
    return tryUnlock(roundCtx, globalCtx)
  }, [tryUnlock])

  const checkGameOver = useCallback((gameCtx, globalCtx) => {
    return tryUnlock(gameCtx, globalCtx)
  }, [tryUnlock])

  const unlockedCount = Object.values(achievements).filter(a => a.unlocked).length

  return { achievements, unlockedCount, checkRound, checkGameOver }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/__tests__/useAchievements.test.js`
Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useAchievements.js src/hooks/__tests__/useAchievements.test.js
git commit -m "feat: add useAchievements hook with Marvel-pun achievement checks"
```

---

## Task 6: useTheme Hook

**Files:**
- Create: `src/hooks/useTheme.js`
- Create: `src/hooks/__tests__/useTheme.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// src/hooks/__tests__/useTheme.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme } from '../useTheme'

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('defaults to default theme', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.activeTheme).toBe('default')
  })

  it('setTheme changes the active theme', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.setTheme('noir'))
    expect(result.current.activeTheme).toBe('noir')
  })

  it('setTheme applies data-theme attribute to document', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.setTheme('cosmic'))
    expect(document.documentElement.getAttribute('data-theme')).toBe('cosmic')
  })

  it('setTheme removes data-theme for default', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.setTheme('noir'))
    act(() => result.current.setTheme('default'))
    expect(document.documentElement.getAttribute('data-theme')).toBeNull()
  })

  it('persists selection to localStorage', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.setTheme('asgardian'))
    expect(localStorage.getItem('marvelme-theme')).toBe('asgardian')
  })

  it('loads from localStorage on mount', () => {
    localStorage.setItem('marvelme-theme', 'symbiote')
    const { result } = renderHook(() => useTheme())
    expect(result.current.activeTheme).toBe('symbiote')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/__tests__/useTheme.test.js`
Expected: All tests FAIL (module not found).

- [ ] **Step 3: Implement useTheme**

```js
// src/hooks/useTheme.js
import { useState, useCallback, useEffect } from 'react'

const KEY = 'marvelme-theme'

function load() {
  try {
    return localStorage.getItem(KEY) ?? 'default'
  } catch {
    return 'default'
  }
}

function applyTheme(id) {
  if (id === 'default') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', id)
  }
}

export function useTheme() {
  const [activeTheme, setActiveTheme] = useState(load)

  useEffect(() => {
    applyTheme(activeTheme)
  }, [activeTheme])

  const setTheme = useCallback((id) => {
    setActiveTheme(id)
    applyTheme(id)
    try {
      localStorage.setItem(KEY, id)
    } catch {}
  }, [])

  return { activeTheme, setTheme }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/__tests__/useTheme.test.js`
Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useTheme.js src/hooks/__tests__/useTheme.test.js
git commit -m "feat: add useTheme hook for unlockable visual themes"
```

---

## Task 7: Update useGame — Add `revealing` Phase

**Files:**
- Modify: `src/hooks/useGame.js`
- Modify: `src/hooks/__tests__/useGame.test.js`

- [ ] **Step 1: Add the `revealing` test**

Add this test at the end of the describe block in `src/hooks/__tests__/useGame.test.js`:

```js
  it('submitAnswer transitions to revealing phase first', async () => {
    const { result } = renderHook(() => useGame())
    await act(async () => { await result.current.startGame(null) })
    const correctName = result.current.currentHero.name
    act(() => result.current.submitAnswer(correctName))
    expect(result.current.phase).toBe('revealing')
    expect(result.current.result).toBe('correct')
  })

  it('completeReveal transitions from revealing to revealed', async () => {
    const { result } = renderHook(() => useGame())
    await act(async () => { await result.current.startGame(null) })
    act(() => result.current.submitAnswer(result.current.currentHero.name))
    expect(result.current.phase).toBe('revealing')
    act(() => result.current.completeReveal())
    expect(result.current.phase).toBe('revealed')
  })

  it('completeReveal is a no-op outside revealing phase', async () => {
    const { result } = renderHook(() => useGame())
    act(() => result.current.completeReveal())
    expect(result.current.phase).toBe('welcome')
  })
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `npx vitest run src/hooks/__tests__/useGame.test.js`
Expected: The 3 new tests FAIL (phase is `revealed` not `revealing`, `completeReveal` undefined).

- [ ] **Step 3: Update submitAnswer to transition to `revealing` instead of `revealed`**

In `src/hooks/useGame.js`, change line 164 inside `submitAnswer`:

Old:
```js
        phase: 'revealed',
```

New:
```js
        phase: 'revealing',
```

- [ ] **Step 4: Add `completeReveal` callback**

Add after the `submitAnswer` definition (after line 172):

```js
  const completeReveal = useCallback(() => {
    setState(s => {
      if (s.phase !== 'revealing') return s
      return { ...s, phase: 'revealed' }
    })
  }, [])
```

- [ ] **Step 5: Export `completeReveal` and `POINTS`**

Update the `return` statement to include `completeReveal`:

```js
  return {
    ...state,
    startGame,
    useHint,
    submitAnswer,
    completeReveal,
    nextRound,
    restartGame,
    ROUNDS,
  }
```

Also export `POINTS` at line 24 — change `const POINTS` to `export const POINTS`:

```js
export const POINTS = [3, 2, 1, 0]
```

- [ ] **Step 6: Update existing tests that expect `revealed` after `submitAnswer`**

Several existing tests check `expect(result.current.phase).toBe('revealed')` after calling `submitAnswer`. Update them to expect `'revealing'` instead. The affected tests:

- "submitAnswer with correct name awards points..." (line 91): change `toBe('revealed')` to `toBe('revealing')`
- "submitAnswer with wrong name awards 0 points..." (line 109): change `toBe('revealed')` to `toBe('revealing')`
- "submitAnswer with hints used awards reduced points" — this test only checks score, no phase assertion, no change needed.
- "streak tracking works correctly across rounds" (lines 195, 204, 213): each `submitAnswer` call should now produce `'revealing'`, and `nextRound` should be called after `completeReveal`. Add `act(() => result.current.completeReveal())` before each `nextRound` call.
- "nextRound advances to next round" (line 148): add `act(() => result.current.completeReveal())` before the `nextRound` call.

- [ ] **Step 7: Update the phase comment**

Update the phase comment on line 101:

Old:
```js
    phase: 'welcome', // 'welcome' | 'playing' | 'revealed' | 'gameover'
```

New:
```js
    phase: 'welcome', // 'welcome' | 'playing' | 'revealing' | 'revealed' | 'gameover'
```

Also update the fileoverview comment at the top (lines 8-9):

Old:
```
 *   welcome → playing → revealed → (playing → revealed) × N → gameover
```

New:
```
 *   welcome → playing → revealing → revealed → (playing → revealing → revealed) × N → gameover
```

- [ ] **Step 8: Run all tests**

Run: `npx vitest run src/hooks/__tests__/useGame.test.js`
Expected: All tests PASS (existing + 3 new).

- [ ] **Step 9: Commit**

```bash
git add src/hooks/useGame.js src/hooks/__tests__/useGame.test.js
git commit -m "feat: add revealing phase to game state machine"
```

---

## Task 8: RollingNumber and DecryptText Utility Components

**Files:**
- Create: `src/components/RollingNumber.jsx`
- Create: `src/components/DecryptText.jsx`

- [ ] **Step 1: Create RollingNumber**

```jsx
// src/components/RollingNumber.jsx
import { useState, useEffect, useRef } from 'react'

export default function RollingNumber({ value, duration = 400, className = '' }) {
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)

  useEffect(() => {
    const from = prevRef.current
    const to = value
    prevRef.current = value
    if (from === to) return

    const start = performance.now()
    let frame
    function tick(now) {
      const t = Math.min((now - start) / duration, 1)
      const eased = t * (2 - t)
      setDisplay(Math.round(from + (to - from) * eased))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  return <span className={className}>{display}</span>
}
```

- [ ] **Step 2: Create DecryptText**

```jsx
// src/components/DecryptText.jsx
import { useState, useEffect } from 'react'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

export default function DecryptText({ text, duration = 300, className = '' }) {
  const [display, setDisplay] = useState('')

  useEffect(() => {
    if (!text) { setDisplay(''); return }
    const start = performance.now()
    let frame
    function tick(now) {
      const t = Math.min((now - start) / duration, 1)
      const resolved = Math.floor(t * text.length)
      let out = text.slice(0, resolved)
      for (let i = resolved; i < text.length; i++) {
        out += text[i] === ' ' ? ' ' : CHARS[Math.floor(Math.random() * CHARS.length)]
      }
      setDisplay(out)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [text, duration])

  return <span className={className}>{display}</span>
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/RollingNumber.jsx src/components/DecryptText.jsx
git commit -m "feat: add RollingNumber and DecryptText utility components"
```

---

## Task 9: RadarChart Component

**Files:**
- Create: `src/components/RadarChart.jsx`

- [ ] **Step 1: Create the SVG radar chart**

```jsx
// src/components/RadarChart.jsx
const STATS = ['intelligence', 'strength', 'speed', 'durability', 'power', 'combat']
const SIZE = 200
const CENTER = SIZE / 2
const RADIUS = 70

function polarToXY(angleDeg, r) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: CENTER + r * Math.cos(rad), y: CENTER + r * Math.sin(rad) }
}

function ringPoints(r) {
  return STATS.map((_, i) => {
    const angle = (360 / STATS.length) * i
    return polarToXY(angle, r)
  })
}

export default function RadarChart({ powerstats, className = '' }) {
  const dataPoints = STATS.map((key, i) => {
    const val = Math.max(0, Math.min(100, Number(powerstats[key]) || 0))
    const angle = (360 / STATS.length) * i
    return polarToXY(angle, (val / 100) * RADIUS)
  })

  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z'

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className={className} aria-hidden="true">
      {/* Grid rings */}
      {[0.25, 0.5, 0.75, 1].map(scale => {
        const pts = ringPoints(RADIUS * scale)
        const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z'
        return <path key={scale} d={path} fill="none" stroke="#2a2a2a" strokeWidth="1" />
      })}

      {/* Axis lines */}
      {STATS.map((_, i) => {
        const angle = (360 / STATS.length) * i
        const end = polarToXY(angle, RADIUS)
        return <line key={i} x1={CENTER} y1={CENTER} x2={end.x} y2={end.y} stroke="#2a2a2a" strokeWidth="1" />
      })}

      {/* Data polygon */}
      <path d={dataPath} fill="rgba(237, 29, 36, 0.3)" stroke="#ed1d24" strokeWidth="2" />

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#ed1d24" />
      ))}

      {/* Labels */}
      {STATS.map((key, i) => {
        const angle = (360 / STATS.length) * i
        const labelPos = polarToXY(angle, RADIUS + 16)
        return (
          <text
            key={key}
            x={labelPos.x}
            y={labelPos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#9ca3af"
            fontSize="8"
            className="capitalize"
          >
            {key.slice(0, 3).toUpperCase()}
          </text>
        )
      })}
    </svg>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/RadarChart.jsx
git commit -m "feat: add SVG RadarChart component for powerstats visualization"
```

---

## Task 10: AchievementToast Component

**Files:**
- Create: `src/components/AchievementToast.jsx`

- [ ] **Step 1: Create the toast component**

```jsx
// src/components/AchievementToast.jsx
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
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/AchievementToast.jsx
git commit -m "feat: add AchievementToast component for unlock notifications"
```

---

## Task 11: HeroDetailCard Component

**Files:**
- Create: `src/components/HeroDetailCard.jsx`

- [ ] **Step 1: Create the detail card with tilt effect**

```jsx
// src/components/HeroDetailCard.jsx
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
        {/* Header */}
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

        {/* Details */}
        <div className="mt-4 space-y-2 text-xs text-gray-300">
          {bio['first-appearance'] && (
            <p><span className="text-gray-500">First appearance: </span>{bio['first-appearance']}</p>
          )}
          {work.occupation && work.occupation !== '-' && (
            <p><span className="text-gray-500">Occupation: </span>{work.occupation}</p>
          )}
        </div>

        {/* Radar chart */}
        <RadarChart powerstats={hero.powerstats ?? {}} className="w-48 h-48 mx-auto mt-3" />

        {/* Close */}
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
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/HeroDetailCard.jsx
git commit -m "feat: add HeroDetailCard with 3D tilt effect and radar chart"
```

---

## Task 12: CollectionGallery Screen

**Files:**
- Create: `src/components/CollectionGallery.jsx`

- [ ] **Step 1: Create the gallery screen**

```jsx
// src/components/CollectionGallery.jsx
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
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="font-bangers tracking-wider text-gray-400 hover:text-white transition-colors"
          >
            ← BACK
          </button>
          <h1 className="font-bangers text-2xl text-[#ed1d24] tracking-widest">COLLECTION</h1>
        </div>

        {/* Progress */}
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

        {/* Filters */}
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

        {/* Grid */}
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
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/CollectionGallery.jsx
git commit -m "feat: add CollectionGallery screen with hero grid and detail cards"
```

---

## Task 13: TrophyCase Screen

**Files:**
- Create: `src/components/TrophyCase.jsx`

- [ ] **Step 1: Create the trophy case screen**

```jsx
// src/components/TrophyCase.jsx
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
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="font-bangers tracking-wider text-gray-400 hover:text-white transition-colors"
          >
            ← BACK
          </button>
          <h1 className="font-bangers text-2xl text-[#f5c518] tracking-widest">TROPHY CASE</h1>
        </div>

        {/* Achievement count */}
        <p className="text-center text-gray-400 text-sm mb-6">
          <span className="text-[#f5c518] font-bangers text-lg">{unlockedCount}</span>
          <span className="mx-1">/</span>
          <span>{ACHIEVEMENTS.length} achievements</span>
        </p>

        {/* Achievements */}
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

        {/* Themes */}
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
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/TrophyCase.jsx
git commit -m "feat: add TrophyCase screen with achievements and theme selector"
```

---

## Task 14: IntroAnimation Component

**Files:**
- Create: `src/components/IntroAnimation.jsx`

- [ ] **Step 1: Create the intro animation**

```jsx
// src/components/IntroAnimation.jsx
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

      {/* Portrait grid */}
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

      {/* Logo impact */}
      <div className={`relative z-10 text-center transition-all duration-300
        ${phase === 'impact' || phase === 'fade' ? 'opacity-100 scale-100' : 'opacity-0 scale-150'}`}>
        {(phase === 'impact' || phase === 'fade') && (
          <div className="absolute inset-0 -z-10 animate-lightBurst
            bg-gradient-radial from-white/30 via-[#ed1d24]/20 to-transparent rounded-full
            w-96 h-96 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2"
          />
        )}
        <h1 className="font-bangers text-7xl md:text-9xl tracking-widest text-[#ed1d24]
          drop-shadow-[0_0_40px_rgba(237,29,36,0.8)]">
          MARVEL<span className="text-white">ME</span>
        </h1>
      </div>

      {/* Skip button */}
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
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/IntroAnimation.jsx
git commit -m "feat: add IntroAnimation component with portrait grid and logo slam"
```

---

## Task 15: HeroReveal Component

**Files:**
- Create: `src/components/HeroReveal.jsx`

- [ ] **Step 1: Create the cinematic reveal**

```jsx
// src/components/HeroReveal.jsx
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
      {/* Screen shake wrapper */}
      <div className={!isCorrect && step >= 1 ? 'animate-shake' : ''}>
        {/* 2x2 grid with animated states */}
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
                {/* Name stamp on correct answer */}
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

      {/* Floating points */}
      {isCorrect && step >= 3 && pointsEarned > 0 && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 animate-floatUp
          font-bangers text-3xl text-[#f5c518] drop-shadow-lg pointer-events-none">
          +{pointsEarned}
        </div>
      )}

      {/* Streak flame-out */}
      {!isCorrect && prevStreak >= 2 && step >= 2 && (
        <div className="absolute top-4 right-4 animate-flameOut
          font-bangers text-2xl text-orange-400 pointer-events-none">
          🔥{prevStreak}
        </div>
      )}

      {/* Streak milestone burst */}
      {isCorrect && streak >= 3 && step >= 3 && (
        <div className="absolute top-4 right-4 animate-pop
          font-bangers text-2xl text-orange-400 pointer-events-none">
          🔥{streak}
        </div>
      )}

      {/* Radial light burst (correct only) */}
      {isCorrect && step >= 1 && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="animate-lightBurst w-64 h-64 rounded-full
            bg-gradient-radial from-[#f5c518]/20 via-[#ed1d24]/10 to-transparent" />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/HeroReveal.jsx
git commit -m "feat: add HeroReveal cinematic reveal component"
```

---

## Task 16: RoundWipe Component

**Files:**
- Create: `src/components/RoundWipe.jsx`

- [ ] **Step 1: Create the panel wipe transition**

```jsx
// src/components/RoundWipe.jsx
import { useEffect, useState } from 'react'
import { playRoundWipe } from '../services/sounds'

const CATEGORY_COLORS = {
  hero: '#ed1d24',
  villain: '#7c3aed',
  xmen: '#f5c518',
}

export default function RoundWipe({ category, onComplete }) {
  const [active, setActive] = useState(true)
  const color = CATEGORY_COLORS[category] || '#ed1d24'

  useEffect(() => {
    playRoundWipe()
    const timer = setTimeout(() => {
      setActive(false)
      onComplete()
    }, 400)
    return () => clearTimeout(timer)
  }, [onComplete])

  if (!active) return null

  return (
    <div
      className="fixed inset-0 z-30 pointer-events-none"
      style={{
        background: `linear-gradient(90deg, ${color}dd 0%, ${color}88 50%, transparent 100%)`,
        animation: 'wipeIn 0.4s ease-out forwards',
      }}
    />
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/RoundWipe.jsx
git commit -m "feat: add RoundWipe panel wipe transition component"
```

---

## Task 17: Enhance AnswerOptions — Breathing, Hover Lift, Ripple

**Files:**
- Modify: `src/components/AnswerOptions.jsx`

- [ ] **Step 1: Update AnswerOptions with ambient effects**

Replace the entire contents of `src/components/AnswerOptions.jsx`:

```jsx
import { useRef, useCallback } from 'react'

export default function AnswerOptions({ options, onSelect, result, correctName, disabled }) {
  return (
    <div className="w-full max-w-sm mx-auto mt-6 grid grid-cols-2 gap-3" role="group" aria-label="Answer choices">
      {options.map((option) => {
        const isCorrect = option.name === correctName
        return (
          <OptionButton
            key={option.name}
            option={option}
            isCorrect={isCorrect}
            disabled={disabled}
            onSelect={onSelect}
          />
        )
      })}
    </div>
  )
}

function OptionButton({ option, isCorrect, disabled, onSelect }) {
  const btnRef = useRef(null)
  const rippleRef = useRef(null)

  const handleClick = useCallback((e) => {
    if (disabled) return

    // Ripple effect
    const btn = btnRef.current
    const ripple = rippleRef.current
    if (btn && ripple) {
      const rect = btn.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      ripple.style.left = `${x}px`
      ripple.style.top = `${y}px`
      ripple.classList.remove('animate-[ripple_0.5s_ease-out]')
      void ripple.offsetWidth
      ripple.classList.add('animate-[ripple_0.5s_ease-out]')
    }

    onSelect(option.name)
  }, [disabled, onSelect, option.name])

  let borderStyle = 'border-[#2a2a2a]'
  if (disabled) {
    borderStyle = isCorrect ? 'border-green-500 scale-105' : 'border-[#2a2a2a] opacity-50'
  }

  return (
    <button
      ref={btnRef}
      onClick={handleClick}
      disabled={disabled}
      className={`relative border-2 rounded-xl overflow-hidden transition-all duration-200
        bg-[#1a1a1a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5c518]
        ${borderStyle}
        ${!disabled
          ? 'cursor-pointer active:scale-95 hover:-translate-y-1 hover:shadow-[0_4px_16px_rgba(237,29,36,0.3)] hover:border-[#ed1d24] animate-breathe'
          : 'cursor-default'
        }`}
    >
      <img
        src={option.image?.url}
        alt={option.name}
        className="w-full aspect-square object-cover object-top"
      />
      <p className="text-sm font-semibold text-center text-white pt-2 pb-2 px-1 leading-tight">
        {disabled && isCorrect && <span aria-hidden="true">&#x2714; </span>}
        {disabled && !isCorrect && <span aria-hidden="true">&#x2718; </span>}
        {option.name}
      </p>
      {/* Ripple element */}
      <span
        ref={rippleRef}
        className="absolute w-0 h-0 rounded-full bg-white/20 pointer-events-none
          -translate-x-1/2 -translate-y-1/2"
        style={{ opacity: 0 }}
      />
    </button>
  )
}
```

- [ ] **Step 2: Add the ripple keyframe to index.css**

Add in the `@keyframes` section of `src/index.css`:

```css
@keyframes ripple {
  0% { width: 0; height: 0; opacity: 0.4; }
  100% { width: 200px; height: 200px; opacity: 0; }
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/AnswerOptions.jsx src/index.css
git commit -m "feat: add breathing animation, hover lift, and ripple to AnswerOptions"
```

---

## Task 18: Enhance HintPanel — Decryption Effect

**Files:**
- Modify: `src/components/HintPanel.jsx`

- [ ] **Step 1: Update HintPanel with DecryptText**

In `src/components/HintPanel.jsx`, add the import at the top:

```jsx
import DecryptText from './DecryptText'
```

Then replace the three hint text values with `DecryptText` components. For Hint 1, replace lines 69-74:

Old:
```jsx
          <p className="text-xs text-gray-300">
            <span className="text-gray-500">Occupation: </span>
            <span className="text-white">{work.occupation || '—'}</span>
          </p>
          <p className="text-xs text-gray-300 mt-0.5">
            <span className="text-gray-500">Base: </span>
            <span className="text-white">{work.base || '—'}</span>
          </p>
```

New:
```jsx
          <p className="text-xs text-gray-300">
            <span className="text-gray-500">Occupation: </span>
            <DecryptText text={work.occupation || '—'} className="text-white" />
          </p>
          <p className="text-xs text-gray-300 mt-0.5">
            <span className="text-gray-500">Base: </span>
            <DecryptText text={work.base || '—'} className="text-white" />
          </p>
```

For Hint 2, replace lines 83-92:

Old:
```jsx
          <p className="text-xs text-gray-300">
            {[
              appearance.height?.[0],
              appearance['hair-color'],
              appearance['eye-color'],
              appearance.race,
              appearance.gender,
            ]
              .filter(v => v && v !== 'null' && v !== '-')
              .join(' · ') || '—'}
          </p>
```

New:
```jsx
          <p className="text-xs text-gray-300">
            <DecryptText
              text={[
                appearance.height?.[0],
                appearance['hair-color'],
                appearance['eye-color'],
                appearance.race,
                appearance.gender,
              ].filter(v => v && v !== 'null' && v !== '-').join(' · ') || '—'}
            />
          </p>
```

For Hint 3, replace lines 101-103:

Old:
```jsx
          <p className="text-white text-base font-semibold">
            {bio['full-name'] || bio['alter-egos'] || '—'}
          </p>
```

New:
```jsx
          <p className="text-white text-base font-semibold">
            <DecryptText text={bio['full-name'] || bio['alter-egos'] || '—'} duration={500} />
          </p>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/HintPanel.jsx
git commit -m "feat: add decryption text effect to hint reveals"
```

---

## Task 19: Enhance ScoreBar — Rolling Counter, Progress Glow

**Files:**
- Modify: `src/components/ScoreBar.jsx`

- [ ] **Step 1: Update ScoreBar with RollingNumber and glow**

Add the import at line 1:

```jsx
import RollingNumber from './RollingNumber'
```

Replace the score display (lines 49-51):

Old:
```jsx
          <div className="text-right" aria-live="polite">
            <span className="text-xs text-gray-400">Score</span>
            <div className="font-bangers text-2xl text-[#f5c518] leading-none">{score}</div>
          </div>
```

New:
```jsx
          <div className="text-right" aria-live="polite">
            <span className="text-xs text-gray-400">Score</span>
            <div className="font-bangers text-2xl text-[#f5c518] leading-none">
              <RollingNumber value={score} />
            </div>
          </div>
```

Replace the progress bar inner div (lines 35-38):

Old:
```jsx
            <div
              className="h-full bg-[#ed1d24] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
```

New:
```jsx
            <div
              className="h-full bg-[#ed1d24] rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                boxShadow: progress > 0 ? '0 0 8px rgba(237, 29, 36, 0.6)' : 'none',
              }}
            />
```

Update the streak indicator (lines 44-48) to add milestone bursts:

Old:
```jsx
          {streak >= 2 && (
            <span className="font-bangers text-lg text-orange-400 leading-none">
              🔥{streak}
            </span>
          )}
```

New:
```jsx
          {streak >= 2 && (
            <span className={`font-bangers text-lg leading-none
              ${streak >= 7 ? 'text-red-400 animate-shimmer' : streak >= 5 ? 'text-orange-300' : 'text-orange-400'}`}>
              🔥<RollingNumber value={streak} duration={200} />
            </span>
          )}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/ScoreBar.jsx
git commit -m "feat: add rolling score counter and progress glow to ScoreBar"
```

---

## Task 20: Integration — GameBoard

**Files:**
- Modify: `src/components/GameBoard.jsx`

- [ ] **Step 1: Update GameBoard to use HeroReveal and RoundWipe**

Replace the entire contents of `src/components/GameBoard.jsx`:

```jsx
import { useEffect, useState, useCallback } from 'react'
import ScoreBar from './ScoreBar'
import HintPanel from './HintPanel'
import AnswerOptions from './AnswerOptions'
import HeroReveal from './HeroReveal'
import RoundWipe from './RoundWipe'
import AchievementToast from './AchievementToast'
import { playHint, playGameOver, playCollectionNew } from '../services/sounds'
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

  // Queue achievement toasts from parent
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
        {/* Points indicator */}
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

        {/* Hint panel — always visible */}
        <HintPanel hero={currentHero} hintsUsed={hintsUsed} />

        {/* Revealing phase — cinematic reveal */}
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

        {/* Revealed phase — static result */}
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

        {/* Playing phase — interactive answers */}
        {phase === 'playing' && (
          <AnswerOptions
            options={options}
            onSelect={handleSelect}
            result={result}
            correctName={currentHero.name}
            disabled={false}
          />
        )}

        {/* Hint button or Next button */}
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

      {/* Round wipe transition */}
      {showWipe && (
        <RoundWipe category={currentHero?.category} onComplete={handleWipeComplete} />
      )}

      {/* Achievement toast */}
      {toastQueue.length > 0 && (
        <AchievementToast achievement={toastQueue[0]} onDone={handleToastDone} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/GameBoard.jsx
git commit -m "feat: integrate HeroReveal, RoundWipe, and AchievementToast into GameBoard"
```

---

## Task 21: Integration — App.jsx

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Update App.jsx with all new systems**

Replace the entire contents of `src/App.jsx`:

```jsx
import { useState, useCallback, useEffect, useRef } from 'react'
import { useGame } from './hooks/useGame'
import { useCollection } from './hooks/useCollection'
import { useAchievements } from './hooks/useAchievements'
import { useTheme } from './hooks/useTheme'
import { isMuted, setMuted as setSoundMuted } from './services/sounds'
import WelcomeScreen from './components/WelcomeScreen'
import GameBoard from './components/GameBoard'
import ResultScreen from './components/ResultScreen'
import TrophyCase from './components/TrophyCase'
import CollectionGallery from './components/CollectionGallery'
import IntroAnimation, { shouldShowIntro } from './components/IntroAnimation'
import heroesData from './data/heroes.json'

export default function App() {
  const game = useGame()
  const { collected, size: collectionSize, markSeen } = useCollection()
  const { achievements, unlockedCount, checkRound, checkGameOver } = useAchievements()
  const { activeTheme, setTheme } = useTheme()
  const [muted, setMutedState] = useState(isMuted)
  const [screen, setScreen] = useState('game')
  const [showIntro, setShowIntro] = useState(shouldShowIntro)
  const [newlyUnlocked, setNewlyUnlocked] = useState([])
  const gameOverChecked = useRef(false)

  const handleToggleMute = () => {
    const next = !muted
    setMutedState(next)
    setSoundMuted(next)
  }

  const handleRevealComplete = useCallback((selectedName) => {
    const isCorrect = selectedName === game.currentHero?.name
    const roundCtx = {
      roundWrong: !isCorrect,
      roundNoHintCorrect: isCorrect && game.hintsUsed === 0,
      roundUsedAllHints: game.hintsUsed >= 3,
    }
    const globalCtx = { collectionSize, dailiesCompleted: 0, dailyStreak: 0 }

    const optionIds = game.options.map(o => {
      const hero = heroesData.find(h => h.name === o.name)
      return hero?.id
    }).filter(Boolean)
    markSeen(optionIds)

    const unlocked = checkRound(roundCtx, globalCtx)
    if (unlocked.length) setNewlyUnlocked(unlocked)
  }, [game.currentHero, game.hintsUsed, game.options, collectionSize, markSeen, checkRound])

  // Check game-over achievements once when phase transitions to gameover
  useEffect(() => {
    if (game.phase !== 'gameover' || gameOverChecked.current) return
    gameOverChecked.current = true
    const gameNoHints = game.history.every(h => h.hintsUsed === 0)
    const gameCtx = {
      lastScore: game.score,
      lastMaxStreak: game.maxStreak,
      gamesCompleted: 1,
      gameNoHints,
      lastCategory: null,
      roundWrong: false,
      roundNoHintCorrect: false,
      roundUsedAllHints: false,
    }
    const globalCtx = { collectionSize, dailiesCompleted: 0, dailyStreak: 0 }
    const unlocked = checkGameOver(gameCtx, globalCtx)
    if (unlocked.length) setNewlyUnlocked(unlocked)
  }, [game.phase, game.history, game.score, game.maxStreak, collectionSize, checkGameOver])

  // Reset the gameover check flag when leaving gameover phase
  useEffect(() => {
    if (game.phase !== 'gameover') gameOverChecked.current = false
  }, [game.phase])

  if (showIntro) {
    return <IntroAnimation onComplete={() => setShowIntro(false)} />
  }

  if (screen === 'trophies') {
    return (
      <TrophyCase
        achievements={achievements}
        unlockedCount={unlockedCount}
        activeTheme={activeTheme}
        onSetTheme={setTheme}
        collectionSize={collectionSize}
        onBack={() => setScreen('game')}
      />
    )
  }

  if (screen === 'collection') {
    return (
      <CollectionGallery
        collected={collected}
        onBack={() => setScreen('game')}
      />
    )
  }

  if (game.phase === 'welcome') {
    return (
      <WelcomeScreen
        onStart={game.startGame}
        onTrophies={() => setScreen('trophies')}
        onCollection={() => setScreen('collection')}
        collectionSize={collectionSize}
        unlockedCount={unlockedCount}
      />
    )
  }

  if (game.phase === 'gameover') {
    return (
      <ResultScreen
        score={game.score}
        streak={game.maxStreak}
        history={game.history}
        isDailyChallenge={game.isDailyChallenge}
        onRestart={game.restartGame}
      />
    )
  }

  return (
    <GameBoard
      game={game}
      muted={muted}
      onToggleMute={handleToggleMute}
      collection={{ collected, markSeen }}
      achievements={{ newlyUnlocked }}
      onRevealComplete={handleRevealComplete}
    />
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds (may have warnings about unused vars — fix if needed).

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat: integrate intro, themes, achievements, and collection into App"
```

---

## Task 22: Integration — WelcomeScreen Buttons

**Files:**
- Modify: `src/components/WelcomeScreen.jsx`

- [ ] **Step 1: Add Trophy Case and Collection buttons**

Add `onTrophies`, `onCollection`, `collectionSize`, and `unlockedCount` to the props:

```jsx
export default function WelcomeScreen({ onStart, error, onTrophies, onCollection, collectionSize, unlockedCount }) {
```

Add two new buttons after the Daily Challenge section (after line 151, before the closing `<p>` tag):

```jsx
      {/* Navigation buttons */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={onTrophies}
          className="font-bangers tracking-wider px-5 py-2 rounded-xl
            border-2 border-[#f5c518]/40 text-[#f5c518]/70
            hover:border-[#f5c518] hover:text-[#f5c518]
            active:scale-95 transition-all duration-150"
        >
          🏆 TROPHIES {unlockedCount > 0 && <span className="text-xs">({unlockedCount})</span>}
        </button>
        <button
          onClick={onCollection}
          className="font-bangers tracking-wider px-5 py-2 rounded-xl
            border-2 border-[#ed1d24]/40 text-[#ed1d24]/70
            hover:border-[#ed1d24] hover:text-[#ed1d24]
            active:scale-95 transition-all duration-150"
        >
          📚 COLLECTION {collectionSize > 0 && <span className="text-xs">({collectionSize})</span>}
        </button>
      </div>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/WelcomeScreen.jsx
git commit -m "feat: add Trophy Case and Collection buttons to WelcomeScreen"
```

---

## Task 23: Run Full Test Suite and Fix Issues

**Files:**
- Various (fix any test failures)

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass. If any fail, fix them.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No errors. Fix any issues.

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit any fixes**

```bash
git add -u
git commit -m "fix: resolve test and lint issues from cinematic feature integration"
```

---

## Task 24: Visual Verification

**Files:**
- None (manual testing)

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify intro animation**

Open the app in a browser. The intro animation should play once, then show the Welcome Screen. Refresh — it should not replay (sessionStorage).

- [ ] **Step 3: Verify gameplay flow**

Start a game. Check:
- Answer options have breathing animation
- Hover lifts the card
- Clicking triggers ripple + cinematic reveal
- Correct answer: golden glow, scale up, floating points, fanfare
- Wrong answer: crack, shake, subdued reveal
- "NEXT HERO" triggers panel wipe transition
- Hints show decryption text effect
- Score rolls up in ScoreBar
- Streak milestones glow at 3, 5, 7+

- [ ] **Step 4: Verify progression screens**

From Welcome Screen:
- Click "TROPHIES" → Trophy Case with achievements and themes
- Click "COLLECTION" → Gallery grid, click collected heroes for detail cards
- Verify radar chart renders correctly
- Try selecting an unlocked theme

- [ ] **Step 5: Verify achievements**

Play a game and intentionally trigger achievements (e.g., get a wrong answer for "Puny Human"). Toast should appear.

- [ ] **Step 6: Commit any visual fixes**

```bash
git add -u
git commit -m "fix: visual polish from manual testing"
```
