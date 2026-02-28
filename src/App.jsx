import { useState } from 'react'
import { useGame } from './hooks/useGame'
import { isMuted, setMuted as setSoundMuted } from './services/sounds'
import WelcomeScreen from './components/WelcomeScreen'
import GameBoard from './components/GameBoard'
import ResultScreen from './components/ResultScreen'

export default function App() {
  const game = useGame()
  const [muted, setMutedState] = useState(isMuted)

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
        onRestart={game.restartGame}
      />
    )
  }

  return <GameBoard game={game} muted={muted} onToggleMute={handleToggleMute} />
}
