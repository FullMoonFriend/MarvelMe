# MarvelMe — Code Review & Improvement Recommendations

## Table of Contents

1. [Testing Recommendations](#1-testing-recommendations)
2. [Bug Fixes](#2-bug-fixes)
3. [Accessibility Improvements](#3-accessibility-improvements)
4. [UX / Feature Suggestions](#4-ux--feature-suggestions)
5. [Performance Improvements](#5-performance-improvements)
6. [Security Considerations](#6-security-considerations)
7. [Code Quality](#7-code-quality)

---

## 1. Testing Recommendations

The project currently has **zero test coverage** and no test runner configured. This is the single biggest area for improvement.

### Recommended Setup

Add **Vitest** (pairs naturally with the existing Vite toolchain):

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Add to `package.json`:
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

Add to `vite.config.js`:
```js
test: {
  environment: 'jsdom',
  setupFiles: './src/test/setup.js',
}
```

### Priority Test Areas

#### A. `useGame` hook — Critical (state machine logic)

This is the core of the app and the highest-value test target. Tests should cover:

| Test Case | Why |
|-----------|-----|
| Initial state shape matches expected defaults | Prevents regressions when adding fields |
| `startGame(null)` transitions phase `welcome → loading → playing` | Core happy path |
| `startGame('villain')` filters pool correctly | Category filtering logic |
| `startGame()` with daily option uses seeded shuffle | Daily challenge determinism |
| `useHint()` increments `hintsUsed` up to 3, no-ops after | Boundary condition |
| `useHint()` is a no-op outside `'playing'` phase | Phase guard |
| `submitAnswer(correctName)` awards `POINTS[hintsUsed]` points | Scoring correctness |
| `submitAnswer(wrongName)` awards 0 points, resets streak | Wrong-answer path |
| `submitAnswer()` is a no-op outside `'playing'` phase | Phase guard |
| `nextRound()` transitions to next round or `'gameover'` at round 10 | Game-end boundary |
| `nextRound()` uses prefetched data when available | Prefetch optimization |
| `nextRound()` falls back to live fetch when prefetch is null | Fallback path |
| `restartGame()` fully resets state to initial values | Clean restart |
| Error in `loadRound` during `startGame` reverts to `'welcome'` | Error recovery |
| Streak tracking: correct answers increment, wrong resets to 0 | Streak logic |
| `maxStreak` tracks the longest streak across the game | Max tracking |
| `history` array grows by one entry per `submitAnswer` call | History accumulation |

**Mock strategy**: Mock `searchHero` at the module level to avoid real API calls and control return values.

#### B. `superheroApi.js` — High priority (API + caching)

| Test Case | Why |
|-----------|-----|
| `searchHero` returns cached result on second call | Cache correctness |
| `searchHero` prefers hero with real image over `no-portrait` | Image filtering |
| `searchHero` returns `null` for API error responses | Graceful degradation |
| `searchHero` throws on non-2xx HTTP status | Error propagation |
| `clearCache()` causes next call to re-fetch | Cache invalidation |
| `searchHero` URL-encodes hero names (e.g. "Spider-Man") | Encoding correctness |

**Mock strategy**: Mock global `fetch` to return controlled JSON payloads.

#### C. `useHighScore` hook — Medium priority

| Test Case | Why |
|-----------|-----|
| Returns `{ bestScore: 0, bestStreak: 0 }` when localStorage is empty | Default state |
| `update(score, streak)` writes to localStorage when score beats record | Write logic |
| `update()` does NOT write when score is lower than existing record | Guard condition |
| Handles corrupted JSON in localStorage gracefully | Robustness |

#### D. `shuffle` / `seededShuffle` / `loadRound` — Unit tests

| Test Case | Why |
|-----------|-----|
| `shuffle` returns array of same length with same elements | Basic invariant |
| `seededShuffle` with same seed produces same output | Determinism |
| `seededShuffle` with different seeds produces different output | Seed sensitivity |
| `loadRound` retries up to 5 times if hero returns null | Retry logic |
| `loadRound` throws if all retries exhausted | Error boundary |
| `loadRound` returns exactly 4 options (1 correct + up to 3 wrong) | Option count |

#### E. Component tests — Lower priority but valuable

| Component | Key assertions |
|-----------|---------------|
| `WelcomeScreen` | Renders category buttons; calls `startGame` with correct category on click |
| `AnswerOptions` | Renders 4 options; calls `onSelect` with hero name; disables after selection |
| `HintPanel` | Shows base clue always; reveals additional hints based on `hintsUsed` |
| `ScoreBar` | Displays correct round/score; mute button toggles |
| `ResultScreen` | Correct grade label/color for each score threshold; share button copies to clipboard |
| `GameBoard` | Shows spinner during `loading`; shows hint panel + options during `playing` |

### Testing Anti-Patterns to Avoid

- Don't test Tailwind class names — they're implementation details
- Don't test exact DOM structure — test behavior and content
- Don't test React internals (state directly) — test through the public API
- Don't make real API calls in tests — always mock `fetch` or `searchHero`

---

## 2. Bug Fixes

### BUG: Biased shuffle algorithm

**File**: `src/hooks/useGame.js:34-36`

```js
function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)  // BIASED
}
```

The `.sort()` comparator approach does not produce a uniform distribution. Some orderings are significantly more likely than others. The codebase already has a correct Fisher-Yates implementation in `seededShuffle` — the fix is to use a proper Fisher-Yates for the unseeded case too:

```js
function shuffle(arr) {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
```

### BUG: Silent failure on game start / round transition errors

**Files**: `src/hooks/useGame.js:216-218` and `src/hooks/useGame.js:295-297`

When `loadRound` throws (network error, API down, all heroes fail), the game silently reverts to the welcome screen with no feedback. The player has no idea what happened.

**Fix**: Add an `error` field to game state and display it in the UI:
```js
// In the catch block:
setState(s => ({ ...s, phase: 'welcome', error: 'Failed to load heroes. Check your connection and try again.' }))
```

### BUG: Daily challenge timezone inconsistency

**File**: `src/hooks/useGame.js:77-80`

`getDailySeed()` uses local time, so players in different time zones get different "daily" challenges at different times, and two players comparing scores at the same moment may be playing different puzzles.

**Fix**: Use UTC:
```js
function getDailySeed() {
  const d = new Date()
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate()
}
```

### BUG: Potential crash if `currentHero` is null during `submitAnswer`

**File**: `src/hooks/useGame.js:242`

```js
const correct = name === s.currentHero.name  // crashes if currentHero is null
```

While `currentHero` should always be set during `playing` phase, a defensive check would prevent crashes from unexpected state:
```js
const correct = name === s.currentHero?.name
```

---

## 3. Accessibility Improvements

The app has several WCAG compliance gaps that would significantly improve usability for all players.

### Missing semantic HTML

Components use `<div>` for everything. Key fixes:
- `App.jsx`: Wrap in `<main>` landmark
- `ScoreBar.jsx`: Use `<header>` or `<nav>`
- `AnswerOptions.jsx`: Use `<fieldset>` / `<legend>` or a `role="radiogroup"` for answer choices
- `ResultScreen.jsx`: Use `<section>` with headings

### Color-only feedback

The correct/wrong result banner (`GameBoard.jsx`) relies solely on green/red color. Colorblind players can't distinguish them. The text labels help, but the answer option highlighting (green border = correct, red = wrong) needs an additional indicator like an icon (checkmark/X).

### Missing ARIA attributes

- **Loading spinner**: Add `role="status"` and `aria-label="Loading next hero"` so screen readers announce loading state
- **Answer options**: Add `aria-pressed` or use radio button semantics so assistive tech knows which option was selected
- **Hint button**: Add `aria-label` that includes remaining hint count (e.g., "Use hint, 2 remaining")
- **Score/round display**: Use `aria-live="polite"` so score updates are announced

### Keyboard navigation

- Answer option buttons should have visible `:focus-visible` outlines
- The category picker on WelcomeScreen should support arrow-key navigation
- Focus should move to the result banner after answering, not stay on the clicked option

### Missing skip navigation

Add a "Skip to main content" link for keyboard users to bypass the ScoreBar.

---

## 4. UX / Feature Suggestions

### High Value

| Suggestion | Rationale |
|------------|-----------|
| **Error screen with retry button** | Silent failures are confusing — show "Something went wrong" with a "Try Again" action |
| **Loading skeleton instead of spinner** | A content placeholder (shimmer cards) feels faster than a spinner |
| **Difficulty levels** | Easy (4 well-known heroes), Medium (mix), Hard (obscure characters) — extends replayability |
| **Round timer (optional)** | Adds challenge for experienced players; could award bonus points for fast answers |
| **Confirm before leaving mid-game** | Accidentally clicking "Play Again" or closing the tab loses progress with no warning |
| **Keyboard shortcuts** | 1-4 to select answers, H for hint, Enter for next round — power-user friendly |

### Medium Value

| Suggestion | Rationale |
|------------|-----------|
| **Animated score counter** | Animate the score incrementing (count-up effect) for more satisfying feedback |
| **Hero detail card on reveal** | After answering, show a brief "fun fact" or full stats card — educational + engaging |
| **Progressive difficulty within a game** | Start with well-known heroes, increase obscurity each round |
| **Streaks visual feedback** | Show a fire animation or combo counter that grows with streak |
| **Sound settings (volume slider)** | Currently only mute/unmute — a volume control would be more flexible |
| **Mobile haptic feedback** | Call `navigator.vibrate()` on correct/wrong for tactile response on mobile |

### Nice to Have

| Suggestion | Rationale |
|------------|-----------|
| **Offline mode** | Cache a set of hero data in localStorage/IndexedDB for offline play |
| **Multiplayer mode** | Same daily seed = same quiz — add a share-and-compare flow |
| **Achievement badges** | "Perfect Game", "Speed Demon", "Hint-Free", etc. — retention mechanic |
| **Theme customization** | Light mode option, or comic-book color themes |
| **Statistics dashboard** | Track games played, average score, category performance over time |

---

## 5. Performance Improvements

### Unnecessary array operations in `loadRound`

**File**: `src/hooks/useGame.js:105`

```js
const wrongCandidates = shuffle(pool.filter((_, i) => i !== idx)).slice(0, 6)
```

This shuffles the entire ~140-item pool just to pick 6 random items. More efficient approach:

```js
function pickRandom(arr, count, excludeIndex) {
  const indices = new Set()
  while (indices.size < count) {
    const i = Math.floor(Math.random() * arr.length)
    if (i !== excludeIndex) indices.add(i)
  }
  return [...indices].map(i => arr[i])
}
```

### Image preloading

Answer option images are loaded when rendered, causing a visible pop-in. Since the hero data is prefetched, the images could be preloaded too:

```js
// After loadRound resolves:
roundData.options.forEach(opt => {
  const img = new Image()
  img.src = opt.image?.url
})
```

### Bundle size

Consider lazy-loading `ResultScreen` since it's only shown at game end:

```js
const ResultScreen = React.lazy(() => import('./components/ResultScreen'))
```

### Unnecessary re-renders

`GameBoard` receives the entire `game` object. When `score` or `streak` changes, every child re-renders. Consider:
- Splitting the game state into separate context providers (score, round, UI state)
- Or using `React.memo` on `HintPanel` and `AnswerOptions` with specific prop comparisons

---

## 6. Security Considerations

### API token exposed in client bundle

**File**: `src/services/superheroApi.js:6`

The `VITE_SUPERHERO_API_TOKEN` is embedded in the production JavaScript bundle and visible in browser DevTools network tab. Anyone can extract it.

**Ideal fix**: Route API calls through a lightweight backend proxy (e.g., Cloudflare Worker, Vercel Edge Function) that holds the token server-side.

**Minimum fix**: Add rate limiting detection and a user-facing message when the API quota is exhausted.

### No Content Security Policy

The app loads images from `superheroapi.com` with no CSP header. Add to `index.html`:

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; img-src 'self' https://www.superherodb.com; connect-src 'self' https://www.superheroapi.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com;">
```

### localStorage is not encrypted

High scores and daily challenge data are stored in plain text. Not a critical issue for this app, but worth noting — players could trivially edit their scores via DevTools.

---

## 7. Code Quality

### Use consistent shuffle everywhere

The codebase has two shuffle implementations — biased `shuffle()` and correct `seededShuffle()`. Unify to a single correct Fisher-Yates implementation that optionally accepts a seed.

### Extract game constants

`ROUNDS`, `POINTS`, and `MAX_SCORE` are scattered. Consider a `src/constants.js` file for all game configuration values, making them easy to tune.

### Add TypeScript (longer-term)

The codebase uses JSDoc types extensively, which shows the intent is there. Migrating to TypeScript would:
- Catch null/undefined errors at compile time (like the `currentHero?.name` issue)
- Provide better IDE support
- Make the state machine phases type-safe with discriminated unions

### ESLint is configured but may not be running in CI

There's no CI pipeline visible. Adding a GitHub Actions workflow for `npm run lint` and `npm run build` would catch issues before merge.

---

## Summary — Top 10 Actions by Impact

| # | Action | Category | Effort |
|---|--------|----------|--------|
| 1 | Set up Vitest + write `useGame` hook tests | Testing | Medium |
| 2 | Fix biased `shuffle()` to use Fisher-Yates | Bug | Small |
| 3 | Add error state + error UI for failed loads | Bug/UX | Small |
| 4 | Add `superheroApi.js` unit tests with mocked fetch | Testing | Small |
| 5 | Fix daily challenge to use UTC dates | Bug | Tiny |
| 6 | Add ARIA labels, semantic HTML, focus management | Accessibility | Medium |
| 7 | Add image preloading for answer options | Performance | Small |
| 8 | Add component tests for `ResultScreen` grade logic | Testing | Small |
| 9 | Add keyboard shortcuts for answer selection | UX | Small |
| 10 | Add GitHub Actions CI for lint + build | Code Quality | Small |
