# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # Start dev server (localhost:5173)
npm run build          # Production build to dist/
npm run preview        # Preview production build
npm run lint           # Run ESLint
npm test               # Run the vitest test suite once
npm run test:watch     # Run vitest in watch mode
npx vitest run src/hooks/__tests__/useGame.test.js  # Run a single test file
npm run fetch-heroes   # Regenerate src/data/heroes.json + public/portraits/ (build-time only)
```

## Environment

The runtime app needs **no environment variables** — hero data and portraits are pre-bundled at build time.

`VITE_SUPERHERO_API_TOKEN` is only required when running `npm run fetch-heroes` to regenerate the bundle. Get a token at https://superheroapi.com/api.html and put it in `.env`. The repo includes `.env.example` as a template.

## Tech Stack

- **React 19** — UI components, no router library (manual phase-switching in App.jsx)
- **Vite 7** — Dev server + build tool; Vitest configured in `vite.config.js` (no separate vitest config)
- **Tailwind CSS v4** — Utility classes via `@tailwindcss/vite` plugin; tokens declared in `src/index.css` using `@theme {}` (v4 CSS-first config). A legacy `tailwind.config.js` also exists with duplicated tokens.
- **ESLint 9** — Flat config format (`eslint.config.js`)
- **Vitest 4** + **@testing-library/react** — Tests under `src/**/__tests__/*.test.js`
- **Web Audio API** — Sound effects synthesised in code, no audio files
- **Superhero API** (superheroapi.com) — build-time only; not called at runtime

## Architecture

The game is a single-page React app with no backend and no runtime network calls for hero data. All game state lives in one custom hook.

### State machine (`src/hooks/useGame.js`)

The entire game lifecycle is managed here. Phases flow:

```
welcome → playing → revealed → (playing → revealed)×N → gameover
```

Round transitions are synchronous — hero data is read from the pre-bundled `src/data/heroes.json` via a direct ESM import, so there is no loading phase and no prefetch dance.

**Key detail:** `nextRound(currentRound, currentScore)` requires the caller to pass current values from component scope (not read from state inside the hook) to avoid stale closure issues.

**Game constants:**
- `ROUNDS = 10` — total rounds per game
- `POINTS = [3, 2, 1, 0]` — points indexed by `hintsUsed`; wrong answer = 0 pts
- `MAX_SCORE = 30` — displayed on ResultScreen

**State shape:**
```js
{
  phase: 'welcome' | 'playing' | 'revealed' | 'gameover',
  round: number,           // 1–10
  score: number,
  currentHero: object | null,
  options: Array<{ name, image }>,
  hintsUsed: number,       // 0–3
  result: 'correct' | 'wrong' | null,
  streak: number,
  maxStreak: number,
  history: Array<{ correct, hintsUsed }>,
  isDailyChallenge: boolean,
}
```

**Public API from `useGame`:**
| Method | Description |
|--------|-------------|
| `startGame(category, { daily } = {})` | Filters hero pool by category (null = all, `'hero'`, `'xmen'`, `'villain'`) and starts round 1. When `daily: true`, category is ignored and the pool is shuffled with today's UTC-date seed so every player sees the same sequence. |
| `useHint()` | Increments `hintsUsed` (max 3); no-op outside `playing` phase |
| `submitAnswer(name)` | Compares name to hero, updates score/streak, transitions to `revealed` |
| `nextRound(currentRound, currentScore)` | Advances round; transitions to `gameover` if round ≥ ROUNDS |
| `restartGame()` | Resets to `welcome` phase |

### Bundled hero data (`src/data/heroes.json`)

All hero records are pre-fetched at build time by `scripts/fetch-heroes.mjs` and committed to the repo. The runtime imports the JSON synchronously — no network calls during gameplay.

**Hero object shape (preserves Superhero API field names):**
```js
{
  id, name, category,             // category added at build time
  image: { url },                 // rewritten to /portraits/<id>.webp
  biography: { 'full-name', 'first-appearance', publisher, alignment },
  powerstats: { intelligence, strength, speed, durability, power, combat },
  work: { occupation, base },
  appearance: { gender, race, height, 'hair-color', 'eye-color' },
  connections: { 'group-affiliation', ... },
}
```

**Portraits** live under `public/portraits/<id>.webp`, sized 512×512 max (WebP quality 82), served as same-origin static assets.

**To regenerate the bundle:** edit `RESCUE_IDS` / `DROP_IDS` in `scripts/fetch-heroes.mjs` if needed, then run `npm run fetch-heroes` (automated Phase 1) → paste the generated `scripts/portrait-snippet.js` into `superherodb.com`'s DevTools console (browser-assisted Phase 2 — the CDN blocks server-side fetches via Cloudflare's bot challenge) → `npm run fetch-heroes -- --process` (automated Phase 3: encode WebP, write final JSON, cleanup).

### Hero pool

~344 Marvel characters total, derived from Superhero API IDs at build time. Each round samples 4 from a shuffled copy of the filtered pool (filter by `category`: `null` for all, `'hero'`, `'xmen'`, or `'villain'`). Categories are derived from the API's `connections.group-affiliation` field (X-Men membership → `xmen`) and `biography.alignment` (`bad` → `villain`; else `hero`).

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
└─ GameBoard.jsx         # 'playing' and 'revealed' phases
   ├─ ScoreBar.jsx       # Sticky top: logo, round progress bar, streak, score, mute
   ├─ HintPanel.jsx      # Clues panel with progressive hint reveal
   └─ AnswerOptions.jsx  # 2×2 portrait grid; highlighted on reveal
ResultScreen.jsx         # Grade, score, personal bests, share, play again
```

**App.jsx** switches on `game.phase`:
- `'welcome'` → WelcomeScreen
- `'gameover'` → ResultScreen
- all others → GameBoard

**GameBoard.jsx** receives the entire `game` object from `useGame`. It renders a sticky ScoreBar, the hint panel, answer grid, and action buttons:
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

Tailwind CSS v4. Custom theme tokens are defined in `src/index.css` via the `@theme {}` block (the v4 CSS-first approach). A `tailwind.config.js` also exists with duplicated definitions — treat `src/index.css` as the source of truth for tokens.

**Colours:**
- `marvel-red: #ed1d24` — primary brand red
- `marvel-darkred: #a01018` — button hover/active
- `marvel-gold: #f5c518` — accents, grade S
- `marvel-dark: #0f0f0f` — page background
- `marvel-card: #1a1a1a` — card backgrounds
- `marvel-border: #2a2a2a` — borders

**Typography:** `font-bangers` (Bangers from Google Fonts, preloaded in `index.html`) for titles; Inter for body text.

**Animations** (defined in `src/index.css` — both `@theme` shorthand and `@keyframes`):
- `animate-shimmer` — 2s red ↔ gold pulsing glow on CTA buttons
- `animate-fadeIn` — 0.4s slide-up fade used for hint reveals
- `animate-pop` — 0.3s scale pop for result banners

**Convention:** Use `bg-[#hex]` inline values for one-off colours rather than adding new theme tokens.
