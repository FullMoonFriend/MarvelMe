# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (localhost:5173)
npm run build     # Production build to dist/
npm run preview   # Preview production build
npm run lint      # Run ESLint
```

No test runner is configured.

## Environment

Requires `.env` with:
```
VITE_SUPERHERO_API_TOKEN=<token>
```

Get a token at https://superheroapi.com/api.html. Without it, API calls return null per hero, causing the "Not enough heroes loaded" error. The repo includes `.env.example` (empty) and `.env.dev` (empty) as templates.

## Tech Stack

- **React 19** — UI components, no router library (manual phase-switching in App.jsx)
- **Vite 7** — Dev server + build tool
- **Tailwind CSS v4** — Utility classes; custom tokens declared in `tailwind.config.js`
- **ESLint 9** — Flat config format (`eslint.config.js`)
- **Web Audio API** — Sound effects synthesised in code, no audio files

## Architecture

The game is a single-page React app with no backend. All game state lives in one custom hook.

### State machine (`src/hooks/useGame.js`)

The entire game lifecycle is managed here. Phases flow:

```
welcome → loading → playing → revealed → (loading → playing)×N → gameover
```

**Key detail:** `nextRound(currentRound, currentScore)` requires the caller to pass current values from component scope (not read from state inside the hook) to avoid stale closure issues.

**Prefetching:** `useGame` fires a background `loadRound()` into `prefetchRef` immediately after each round enters `playing`, so the next round's data is ready before the user clicks "Next Hero". If the prefetch fails, `nextRound` falls back to a live fetch.

**Game constants:**
- `ROUNDS = 10` — total rounds per game
- `POINTS = [3, 2, 1, 0]` — points indexed by `hintsUsed`; wrong answer = 0 pts
- `MAX_SCORE = 30` — displayed on ResultScreen

**State shape:**
```js
{
  phase: 'welcome' | 'loading' | 'playing' | 'revealed' | 'gameover',
  round: number,           // 1–10
  score: number,
  currentHero: object | null,
  options: Array<{ name, image }>,
  hintsUsed: number,       // 0–3
  result: 'correct' | 'wrong' | null,
  streak: number,
  maxStreak: number,
  history: Array<{ correct, hintsUsed }>,
}
```

**Public API from `useGame`:**
| Method | Description |
|--------|-------------|
| `startGame(category?)` | Filters hero pool by category (null = all, `'hero'`, `'xmen'`, `'villain'`), loads round 1, prefetches round 2 |
| `useHint()` | Increments `hintsUsed` (max 3); no-op outside `playing` phase |
| `submitAnswer(name)` | Compares name to hero, updates score/streak, transitions to `revealed` |
| `nextRound(currentRound, currentScore)` | Advances round (uses prefetch); transitions to `gameover` if round ≥ ROUNDS |
| `restartGame()` | Resets to `welcome` phase |

### API layer (`src/services/superheroApi.js`)

`searchHero(name)` fetches by name from `https://www.superheroapi.com/api.php/{token}/search/{name}`. It prefers results with a real image (filters out `no-portrait`) and caches all responses in a module-level `Map` for the session lifetime. `clearCache()` flushes it.

**Hero object shape (relevant fields):**
```js
{
  name, image: { url },
  biography: { 'full-name', 'first-appearance' },
  powerstats: { intelligence, strength, speed, durability, power, combat },
  work: { occupation, base },
  appearance: { gender, race, height, 'hair-color', 'eye-color' },
}
```

### Hero pool (`src/data/marvelHeroes.js`)

A curated static list of ~140 characters (`MARVEL_HEROES`) known to have good API results. Each entry is `{ name: string, category: 'hero' | 'xmen' | 'villain' }`. Each round samples 4 names from a shuffled copy of the filtered pool.

**Breakdown:** ~64 heroes, ~31 X-Men, ~45 villains.

### Scoring & hints

Points available per round = `POINTS[hintsUsed]` — max 3, min 0. Wrong answer always scores 0.

Hints are cumulative and revealed in order:
- **Always visible:** First appearance (from biography)
- **Hint 1:** Occupation + base (from `work`)
- **Hint 2:** Appearance stats — height, hair/eye colour, race, gender
- **Hint 3:** Real / full name (from `biography['full-name']`)

Power-stat bars (intelligence, strength, speed, durability, power, combat) are always shown in the HintPanel.

### Sounds (`src/services/sounds.js`)

Synthesised via the Web Audio API — no audio files are loaded. The `AudioContext` is lazily initialised on first use. Mute state is persisted to `localStorage` under the key `'marvelme-muted'`.

| Function | Sound |
|----------|-------|
| `playCorrect()` | Two-note ascending chime (C5 → E5) |
| `playWrong()` | Two-note descending thud (A3 → G3) |
| `playHint()` | Single beep (A4) |
| `playGameOver()` | Three-note fanfare (G4 → C5 → E5) |

### High scores (`src/hooks/useHighScore.js`)

Persists `{ bestScore, bestStreak }` to `localStorage` under `'marvelme-highscore'`. Lazily loaded on mount; falls back to zeros if parse fails. Only writes when a new record is beaten.

## Component Layout

```
App.jsx                  # Phase-based router; owns mute state
├─ WelcomeScreen.jsx     # Rules, category picker, start button
└─ GameBoard.jsx         # All active game phases (loading/playing/revealed)
   ├─ ScoreBar.jsx       # Sticky top: logo, round progress bar, streak, score, mute
   ├─ HintPanel.jsx      # Clues panel with progressive hint reveal
   └─ AnswerOptions.jsx  # 2×2 portrait grid; highlighted on reveal
ResultScreen.jsx         # Grade, score, personal bests, share, play again
```

**App.jsx** switches on `game.phase`:
- `'welcome'` → WelcomeScreen
- `'gameover'` → ResultScreen
- all others → GameBoard

**GameBoard.jsx** receives the entire `game` object from `useGame`. It renders a sticky ScoreBar, a loading spinner during fetches, then the hint panel + answer grid + action buttons. Action buttons:
- Playing phase: "USE HINT" (disabled if `hintsUsed >= 3`)
- Revealed phase: "NEXT HERO →" or "SEE RESULTS" (on round 10)

**ResultScreen.jsx** grades the player on mount (calls `useHighScore().update`):
| Grade | Threshold | Label | Colour |
|-------|-----------|-------|--------|
| S | ≥ 90% | LEGENDARY | Gold |
| A | ≥ 75% | HEROIC | Green |
| B | ≥ 55% | WORTHY | Blue |
| C | ≥ 35% | IN TRAINING | Orange |
| D | < 35% | RECRUIT | Gray |

The share button copies an emoji summary to the clipboard.

## Styling

Tailwind CSS v4. Custom theme tokens are defined in `tailwind.config.js` (not in `index.css`):

**Colours:**
- `marvel-red: #ed1d24` — primary brand red
- `marvel-darkred: #a01018` — button hover/active
- `marvel-gold: #f5c518` — accents, grade S
- `marvel-dark: #0f0f0f` — page background
- `marvel-card: #1a1a1a` — card backgrounds
- `marvel-border: #2a2a2a` — borders

**Typography:** `font-bangers` (Bangers from Google Fonts, preloaded in `index.html`) for titles; Inter for body text.

**Animations** (defined in `src/index.css`):
- `animate-shimmer` — 2s red ↔ gold pulsing glow on CTA buttons
- `animate-fadeIn` — 0.4s slide-up fade used for hint reveals
- `animate-pop` — 0.3s scale pop for result banners

**Convention:** Use `bg-[#hex]` inline values for one-off colours rather than adding new theme tokens.

## File Reference

```
src/
  main.jsx                    # React root mount
  App.jsx                     # Phase router, mute state owner
  index.css                   # Global styles, @keyframes, Tailwind base
  components/
    WelcomeScreen.jsx
    GameBoard.jsx
    ScoreBar.jsx
    HintPanel.jsx
    AnswerOptions.jsx
    ResultScreen.jsx
  hooks/
    useGame.js                # Core state machine (entire game lifecycle)
    useHighScore.js           # localStorage best score/streak
  services/
    superheroApi.js           # API client + session cache
    sounds.js                 # Web Audio synthesis + mute toggle
  data/
    marvelHeroes.js           # ~140 curated characters with categories
```
