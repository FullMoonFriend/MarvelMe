# Cinematic Marvel — Feature Design Spec

**Date:** 2026-04-22
**Goal:** Elevate MarvelMe from a polished quiz into a "show your friend" experience through cinematic moments, progression systems, and visual customization.

---

## 1. Marvel-Style Animated Intro

A 3–4 second animation plays on first load, before the Welcome Screen.

**Sequence:**
1. Screen starts black
2. A grid of hero portraits from the roster rapidly flips/shuffles across the screen (inspired by the Marvel Studios logo)
3. Portraits converge and fade as the **MarvelMe** logo slams into center frame with a metallic impact sound and a screen-flash
4. Logo holds for a beat, then the Welcome Screen fades in behind it

**Constraints:**
- CSS animations + DOM overlay (no video files)
- Plays once per session (`sessionStorage` flag)
- "Skip" button appears after 1 second
- Impact sound synthesized via Web Audio API
- Respects mute setting (reads `localStorage` before playing)

---

## 2. Dramatic Hero Reveal Sequences

Answering triggers a 2–3 second cinematic reveal instead of instant feedback. A new `revealing` phase sits between `playing` and `revealed`.

### Correct Answer
1. Selected portrait pulses with a golden energy border
2. Other three options dim and slide away
3. Correct hero portrait scales up to center stage with a radial light burst
4. Hero name appears in bold metallic text with a typewriter stamp effect
5. Streak counter animates in (fire emoji scales up with particle trail) if applicable
6. Points earned float up from the portrait and arc into the ScoreBar score

### Wrong Answer
1. Selected portrait cracks/shatters with a red pulse
2. Correct hero highlights green and slides to center (subdued, no light burst)
3. Hero name fades in simply
4. Brief screen-shake (2–3 frames, CSS transform on game container)
5. Streak counter "flames out" if a streak was active

### Implementation Details
- All animations: CSS keyframes + transforms, no libraries
- `revealing` phase lasts ~2 seconds, disables input, then transitions to `revealed`
- Enhanced sounds play at moment of reveal (see Section 7)
- Screen-shake via CSS transform, not `navigator.vibrate`

---

## 3. Enhanced Answer Feedback & Ambient Effects

### Answer Hover/Selection
- Hover: subtle lift (translateY + box-shadow) with faint energy glow
- Click/tap: ripple effect radiating from tap point
- Idle: four portraits have a slow "breathing" animation (0.5% scale oscillation over 2 seconds)

### Hint Reveals
- Text "data decryption" effect: scrambles through random alphanumeric characters (A-Z, 0-9) for ~300ms before resolving to actual hint text
- Point cost indicator animates as a ticking counter rather than instant change

### Score & Streak Animations
- Score changes: rolling number counter (digit-by-digit over ~400ms)
- Streak milestones (3, 5, 7+): flame burst behind streak indicator with increasing intensity
- Round progress bar: smooth easing fill with glow on leading edge

### Round Transitions
- Horizontal wipe (comic panel sliding in from right), ~400ms
- Wipe tinted by category (marvel-red for heroes, purple for villains, gold for X-Men)

All CSS-only or lightweight canvas. No animation libraries.

---

## 4. Achievement & Trophy System

~20–25 achievements with Marvel-pun names, tracked in `localStorage`.

### Achievement List

| ID | Name | Condition |
|----|------|-----------|
| `origin-story` | Origin Story | Complete first game |
| `infinity-score` | Infinity Score | Score 30/30 (perfect game) |
| `hulk-smashing` | Hulk Smashing It | 5 correct streak |
| `all-day` | I Can Do This All Day | 10 streak (flawless game) |
| `spider-sense` | Spider-Sense Tingling | 0 hints on a round |
| `inevitable` | I Am Inevitable | Complete a full game using 0 hints |
| `phone-shield` | Phone A S.H.I.E.L.D. | Use all 3 hints in a round |
| `avengers` | Avengers Assembled | Score 25+ in Heroes category |
| `know-enemy` | Know Thy Enemy | Score 25+ in Villains category |
| `xaviers-pupil` | Xavier's Star Pupil | Score 25+ in X-Men category |
| `daily-bugle` | Daily Bugle Reader | Complete 3 daily challenges |
| `wakanda` | Wakanda Forever | 7 daily challenges in a row |
| `watcher` | Watcher's Dedication | 30 daily challenges |
| `multiverse` | Multiverse Explorer | Encounter 50 unique heroes |
| `the-collector` | The Collector | Encounter all 344 heroes |
| `puny-human` | Puny Human | Get a wrong answer |
| `snapped` | Thanos Snapped Your Score | Score exactly 0 in a game |

### Architecture
- New `useAchievements` hook: checks unlock conditions after each round and game-over, returns newly unlocked achievements
- `localStorage` key: `marvelme-achievements`
- Data shape per achievement:
  ```js
  {
    unlocked: boolean,
    unlockedAt: ISO string | null,
    progress: number  // for progressive achievements (e.g., 50 heroes)
  }
  ```
- Unlock triggers a toast notification (slides in from top) with trophy icon, achievement name, and "unlock" chime
- **Trophy Case** screen accessible from Welcome Screen: unlocked achievements in full color, locked ones grayed with "???" descriptions

---

## 5. Unlockable Visual Themes

Cosmetic-only reskins earned through achievements. Applied via CSS custom property overrides on a root `data-theme` attribute.

### Theme List

| Theme | Unlock Condition | Visual Style |
|-------|-----------------|--------------|
| **Default** | Always available | Current dark/red Marvel look |
| **Golden Age** | Earn 5 achievements | Sepia tones, aged paper textures, halftone dots, rounded serif headings |
| **Noir** | Perfect game (30/30) | High-contrast B&W, grayscale portraits, red as sole accent |
| **Cosmic** | Encounter 100 unique heroes | Purple/blue nebula gradients, neon glow borders, drifting star-field particles |
| **Symbiote** | Score exactly 0 | Black/dark purple, tendril-like gradient borders, subtle text distortion |
| **Asgardian** | 7 daily challenges in a row | Gold and deep blue, Norse geometric borders, lightning crackle on correct answers |

### Implementation
- Each theme: a set of CSS custom property overrides applied via `[data-theme="name"]` selectors
- Portrait filters (e.g., Noir grayscale) via CSS class on image containers
- Ambient effects (Cosmic stars, Symbiote tendrils): lightweight canvas layers or CSS pseudo-element animations
- Active theme persisted to `localStorage` under `marvelme-theme`
- **Theme Selector** lives in Trophy Case screen: unlocked themes selectable, locked ones show silhouette preview with unlock condition
- Intro animation and reveal sequences adapt color palette to active theme

---

## 6. Hero Collection Gallery

A persistent gallery of every hero encountered during gameplay.

### Gallery Screen
- Accessible from Welcome Screen via "Collection" button
- Grid of hero portrait thumbnails: collected = full color, uncollected = dark silhouette
- Progress bar: "147 / 344 Collected"
- Category filter tabs: All / Heroes / X-Men / Villains
- Tapping a collected hero opens a detail card

### Detail Card
- Hero name, real name, first appearance, occupation, category badge
- Powerstats rendered as an animated SVG radar/hexagon chart
- Uses active theme's color palette
- 3D tilt effect on hover/touch (CSS perspective transform)

### Collection Tracking
- New `useCollection` hook; `localStorage` key: `marvelme-collection`
- After each round, all 4 option heroes are marked as seen (regardless of answer correctness)
- Data: serialized Set of hero IDs — `[14, 57, 106, ...]`
- First-seen hero gets a brief "NEW" badge flash on their portrait during the round

### Ties to Other Systems
- Feeds "Multiverse Explorer" (50) and "The Collector" (344) achievements
- Gives players a way to study heroes they got wrong

---

## 7. Sound Design Upgrades

All new sounds synthesized via Web Audio API. No audio files. Same lazy `AudioContext` pattern as existing sounds.

| Sound | Trigger | Design |
|-------|---------|--------|
| **Intro impact** | Logo slam | Sub-bass boom (~60Hz sine, sharp attack, quick decay) + bright metallic ping |
| **Reveal sting (correct)** | Correct answer reveal | 4-note ascending fanfare (C5→E5→G5→C6), replaces current 2-note chime |
| **Reveal rumble (wrong)** | Wrong answer reveal | Deep descending rumble (A2→F2) with distortion, replaces current 2-note thud |
| **Achievement unlock** | Toast notification | Bright "ding-ding-ding" arpeggio — three ascending notes with shimmery decay |
| **Theme unlock** | Theme unlock specifically | Achievement sound + reverb tail + low chord underneath |
| **Collection new** | First-seen hero "NEW" badge | Single soft chime, subtle |
| **Round wipe** | Panel wipe transition | Whoosh — filtered white noise with fast bandpass sweep low→high |

**Volume hierarchy:** Gameplay sounds (reveal, answer) at 100%; ambient/UI sounds (collection, wipe) at ~60%.

All sounds respect the existing mute toggle.

---

## New Components & Hooks Summary

### New Components
- `IntroAnimation.jsx` — full-screen intro overlay
- `HeroReveal.jsx` — cinematic reveal sequence (correct + wrong variants)
- `RoundWipe.jsx` — panel wipe transition between rounds
- `AchievementToast.jsx` — slide-in notification on unlock
- `TrophyCase.jsx` — achievement + theme selector screen
- `CollectionGallery.jsx` — hero grid with filter tabs
- `HeroDetailCard.jsx` — detail view for collected heroes
- `RadarChart.jsx` — powerstats hexagon visualization

### New Hooks
- `useAchievements.js` — achievement state, unlock checks, progress tracking
- `useCollection.js` — hero collection state, seen tracking
- `useTheme.js` — theme selection, persistence, CSS property application

### Modified Files
- `useGame.js` — add `revealing` phase to state machine
- `sounds.js` — add 7 new synthesized sounds, enhance existing correct/wrong sounds
- `App.jsx` — integrate intro animation, theme provider, new screen routing
- `GameBoard.jsx` — integrate reveal sequence, round wipe, ambient effects, collection tracking
- `WelcomeScreen.jsx` — add Collection and Trophy Case navigation buttons
- `ScoreBar.jsx` — rolling score counter, streak milestone flames, progress bar glow
- `HintPanel.jsx` — decryption text effect, animated cost indicator
- `AnswerOptions.jsx` — breathing animation, hover lift, tap ripple
- `src/index.css` — theme CSS custom properties, new keyframes, theme variant selectors

### Phase Flow Update
```
welcome → playing → revealing → revealed → (playing → revealing → revealed)×N → gameover
```
