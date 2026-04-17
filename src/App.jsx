import { useState } from 'react'
import { useGame } from './hooks/useGame'
import { isMuted, setMuted as setSoundMuted } from './services/sounds'
import WelcomeScreen from './components/WelcomeScreen'
import GameBoard from './components/GameBoard'
import ResultScreen from './components/ResultScreen'

/**
 * Root component and phase-based router for MarvelMe.
 *
 * Owns the mute state (kept here so it persists across phase transitions) and
 * delegates all game logic to `useGame`. Renders the appropriate screen based
 * on the current game phase:
 *
 * - 'welcome'  → WelcomeScreen
 * - 'gameover' → ResultScreen
 * - all others → GameBoard (handles 'playing' and 'revealed' internally)
 */
export default function App() {
  const game = useGame()
  const [muted, setMutedState] = useState(isMuted)

  /**
   * Toggles sound effects on/off, keeping React state and the sounds module
   * in sync, then persists the choice via `setMuted`.
   */
  const handleToggleMute = () => {
    const next = !muted
    setMutedState(next)
    setSoundMuted(next)
  }

  if (game.phase === 'welcome') {
    return <WelcomeScreen onStart={game.startGame} />
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

  return <GameBoard game={game} muted={muted} onToggleMute={handleToggleMute} />
}
