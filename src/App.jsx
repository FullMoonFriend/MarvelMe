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
    if (unlocked.length) setNewlyUnlocked(unlocked) // eslint-disable-line react-hooks/set-state-in-effect
  }, [game.phase, game.history, game.score, game.maxStreak, collectionSize, checkGameOver])

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
