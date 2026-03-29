# MarvelMe

A Marvel-themed "guess the hero" quiz game built with React 19, Vite, and Tailwind CSS. Identify Marvel characters from progressive clues — power stats, appearance details, occupation, and eventually their real name. Ten rounds, three hints available per round, scored on how few hints you need.

## How it works

Each round presents a Marvel hero or villain with their power stat bars (intelligence, strength, speed, durability, power, combat) visible from the start. Pick the correct hero from four options. Using fewer hints earns more points: up to 3 points for a correct first guess, 0 for a wrong answer regardless of hints used.

Hints reveal in order:
1. Occupation and base of operations
2. Appearance details (height, hair/eye colour, race, gender)
3. Real / full name

After ten rounds you receive a grade (S through D) and your score is compared against your personal best, persisted in localStorage.

## Tech stack

- **React 19** with hooks-based state machine for game lifecycle
- **Vite 7** for dev server and builds
- **Tailwind CSS v4** for styling
- **Superhero API** for hero data and portraits
- **Web Audio API** for synthesised sound effects (no audio files loaded)

## Getting started

Get a free API token at [superheroapi.com](https://www.superheroapi.com/api.html), then:

```bash
cp .env.example .env
# Add your token: VITE_SUPERHERO_API_TOKEN=your_token_here
npm install
npm run dev
```

## Character pool

Approximately 140 curated Marvel characters across three categories: heroes, X-Men, and villains. Filter by category on the welcome screen.
