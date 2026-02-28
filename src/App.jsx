import { useGame } from './hooks/useGame'
import WelcomeScreen from './components/WelcomeScreen'
import GameBoard from './components/GameBoard'
import ResultScreen from './components/ResultScreen'

export default function App() {
  const game = useGame()

  if (game.phase === 'welcome') {
    return <WelcomeScreen onStart={game.startGame} />
  }

  if (game.phase === 'gameover') {
    return <ResultScreen score={game.score} onRestart={game.restartGame} />
  }

  return <GameBoard game={game} />
}
