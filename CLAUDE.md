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

Get a token at https://superheroapi.com/api.html. Without it the API calls fail silently (returns null per hero), causing the "Not enough heroes loaded" error.

## Architecture

The game is a single-page React app with no backend. All state lives in one custom hook.

**State machine** (`src/hooks/useGame.js`): The entire game lifecycle is managed here. Phases flow: `welcome → loading → playing → revealed → (loading → playing)×N → gameover`. Key detail: `nextRound(currentRound, currentScore)` requires the caller to pass current values from component scope (not read from state inside the hook) to avoid stale closure issues.

**Prefetching**: `useGame` fires a background `loadRound()` into `prefetchRef` immediately after each round loads, so the next round is ready before the user clicks "Next Hero".

**API layer** (`src/services/superheroApi.js`): `searchHero(name)` fetches by name and prefers results with a real image (filters out `no-portrait`). Responses are cached in a module-level `Map` for the session lifetime.

**Hero pool** (`src/data/marvelHeroes.js`): A curated static list of ~50 names known to have good API results. Each round samples 4 names from a shuffled copy of the full pool.

**Scoring**: Points available = `[3,2,1,0][hintsUsed]`. Wrong answer = 0 pts. Hints are cumulative and revealed in order: Hint 1 = publisher + first appearance, Hint 2 = powerstats bars, Hint 3 = real name.

**Image blur**: `HeroImage` applies CSS blur decreasing with each hint used (`BLUR_LEVELS = [20, 12, 6, 0]`), removed entirely on reveal.

## Styling

Tailwind v4 — config is entirely in `src/index.css` via `@theme {}`. No `tailwind.config.js`. Custom tokens: `font-bangers`, `color-marvel-*`, `animate-shimmer/fadeIn/pop`. Use `bg-[#hex]` inline values for one-off colors rather than adding new theme tokens.

## Component Layout

`App.jsx` is the only router — it switches on `game.phase` to render `WelcomeScreen`, `GameBoard`, or `ResultScreen`. `GameBoard` receives the entire `game` object from `useGame` and delegates to `ScoreBar`, `HeroImage`, `HintPanel`, and `AnswerOptions`.