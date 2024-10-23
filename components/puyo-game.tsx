'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from "@/components/ui/button"

// Types
type PuyoColor = 'red' | 'green' | 'blue' | 'yellow' | null
type GameState = 'title' | 'active' | 'over' | 'pause'
type Grid = PuyoColor[][]

// Constants
const GRID_ROWS = 12
const GRID_COLS = 6
const COLORS: PuyoColor[] = ['red', 'green', 'blue', 'yellow']

// Helper functions
const createEmptyGrid = (): Grid => Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(null))
const randomPuyoColor = (): PuyoColor => COLORS[Math.floor(Math.random() * COLORS.length)]

interface PuyoPair {
  color1: PuyoColor
  color2: PuyoColor
  x: number
  y: number
  rotation: number
}

export function PuyoGameComponent() {
  const [grid, setGrid] = useState<Grid>(createEmptyGrid())
  const [gameState, setGameState] = useState<GameState>('title')
  const [score, setScore] = useState(0)
  const [currentPuyo, setCurrentPuyo] = useState<PuyoPair | null>(null)
  const [nextPuyo, setNextPuyo] = useState<PuyoPair | null>(null)
  const [chainCounter, setChainCounter] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [highScore, setHighScore] = useState(0)
  const audioContext = useRef<AudioContext | null>(null)

  const generatePuyoPair = useCallback((): PuyoPair => ({
    color1: randomPuyoColor(),
    color2: randomPuyoColor(),
    x: 2,
    y: 0,
    rotation: 0
  }), [])

  useEffect(() => {
    const storedHighScore = localStorage.getItem('puyoPuyoHighScore')
    if (storedHighScore) {
      setHighScore(parseInt(storedHighScore, 10))
    }

    audioContext.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  }, [])

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score)
      localStorage.setItem('puyoPuyoHighScore', score.toString())
    }
  }, [score, highScore])

  const playSound = useCallback((frequency: number, duration: number) => {
    if (audioContext.current) {
      const oscillator = audioContext.current.createOscillator()
      const gainNode = audioContext.current.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.current.destination)

      oscillator.frequency.setValueAtTime(frequency, audioContext.current.currentTime)
      gainNode.gain.setValueAtTime(0.1, audioContext.current.currentTime)

      oscillator.start()
      oscillator.stop(audioContext.current.currentTime + duration)
    }
  }, [])

  const startGame = useCallback(() => {
    setGrid(createEmptyGrid())
    setScore(0)
    setChainCounter(0)
    setCurrentPuyo(generatePuyoPair())
    setNextPuyo(generatePuyoPair())
    setGameState('active')
    setIsPaused(false)
  }, [generatePuyoPair])

  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev)
  }, [])

  const isValidMove = useCallback((puyo: PuyoPair): boolean => {
    const { x, y, rotation } = puyo
    const [x2, y2] = getSecondPuyoPosition(x, y, rotation)

    return (
      x >= 0 && x < GRID_COLS && y >= 0 && y < GRID_ROWS &&
      x2 >= 0 && x2 < GRID_COLS && y2 >= 0 && y2 < GRID_ROWS &&
      !grid[y][x] && !grid[y2][x2]
    )
  }, [grid])

  const getSecondPuyoPosition = useCallback((x: number, y: number, rotation: number): [number, number] => {
    switch (rotation) {
      case 0: return [x, y - 1]
      case 1: return [x + 1, y]
      case 2: return [x, y + 1]
      case 3: return [x - 1, y]
      default: return [x, y]
    }
  }, [])

  const placePuyo = useCallback(() => {
    if (!currentPuyo) return

    const newGrid = [...grid]
    const { x, y, color1, color2, rotation } = currentPuyo
    const [x2, y2] = getSecondPuyoPosition(x, y, rotation)

    newGrid[y][x] = color1
    newGrid[y2][x2] = color2

    setGrid(newGrid)
    setCurrentPuyo(null)
    checkForMatches(newGrid)
  }, [currentPuyo, grid, getSecondPuyoPosition])

  const movePuyo = useCallback((direction: 'left' | 'right' | 'down') => {
    if (!currentPuyo || gameState !== 'active' || isPaused) return

    const newPuyo = { ...currentPuyo }
    if (direction === 'left') newPuyo.x -= 1
    if (direction === 'right') newPuyo.x += 1
    if (direction === 'down') newPuyo.y += 1

    if (isValidMove(newPuyo)) {
      setCurrentPuyo(newPuyo)
    } else if (direction === 'down') {
      placePuyo()
    }
  }, [currentPuyo, gameState, isPaused, isValidMove, placePuyo])

  const rotatePuyo = useCallback((direction: 'left' | 'right') => {
    if (!currentPuyo || gameState !== 'active' || isPaused) return

    const newPuyo = { ...currentPuyo }
    newPuyo.rotation = (newPuyo.rotation + (direction === 'left' ? -1 : 1) + 4) % 4

    if (isValidMove(newPuyo)) {
      setCurrentPuyo(newPuyo)
    }
  }, [currentPuyo, gameState, isPaused, isValidMove])

  const checkForMatches = useCallback((grid: Grid) => {
    let newGrid = [...grid]
    let chainCount = 0
    let hasMatches

    do {
      hasMatches = false
      const matchedPuyos: Set<string> = new Set()

      // Check for matches
      for (let y = 0; y < GRID_ROWS; y++) {
        for (let x = 0; x < GRID_COLS; x++) {
          if (newGrid[y][x]) {
            const matches = findConnectedPuyos(newGrid, x, y, newGrid[y][x])
            if (matches.size >= 4) {
              hasMatches = true
              matches.forEach(match => matchedPuyos.add(match))
            }
          }
        }
      }

      if (hasMatches) {
        chainCount++
        // Remove matched Puyos
        matchedPuyos.forEach(match => {
          const [x, y] = match.split(',').map(Number)
          newGrid[y][x] = null
        })

        // Calculate score
        const puyosCleared = matchedPuyos.size
        const chainMultiplier = Math.pow(2, chainCount - 1)
        const groupSizeBonus = Math.max(0, puyosCleared - 4) * 5
        const points = puyosCleared * 10 * chainMultiplier + groupSizeBonus

        setScore(prevScore => prevScore + points)
        setChainCounter(chainCount)

        // Apply gravity
        newGrid = applyGravity(newGrid)

        playSound(500, 0.2) // Play sound for chain reaction
      }
    } while (hasMatches)

    setGrid(newGrid)
    setCurrentPuyo(nextPuyo)
    setNextPuyo(generatePuyoPair())
    setChainCounter(0)

    // Check for game over
    if (newGrid[1].some(cell => cell !== null)) {
      setGameState('over')
    }
  }, [generatePuyoPair, nextPuyo, playSound])

  const findConnectedPuyos = useCallback((grid: Grid, x: number, y: number, color: PuyoColor, visited: Set<string> = new Set()): Set<string> => {
    const key = `${x},${y}`
    if (
      x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS ||
      grid[y][x] !== color || visited.has(key)
    ) {
      return visited
    }

    visited.add(key)

    findConnectedPuyos(grid, x + 1, y, color, visited)
    findConnectedPuyos(grid, x - 1, y, color, visited)
    findConnectedPuyos(grid, x, y + 1, color, visited)
    findConnectedPuyos(grid, x, y - 1, color, visited)

    return visited
  }, [])

  const applyGravity = useCallback((grid: Grid): Grid => {
    const newGrid = [...grid]
    for (let x = 0; x < GRID_COLS; x++) {
      let writeY = GRID_ROWS - 1
      for (let y = GRID_ROWS - 1; y >= 0; y--) {
        if (newGrid[y][x] !== null) {
          newGrid[writeY][x] = newGrid[y][x]
          if (writeY !== y) {
            newGrid[y][x] = null
          }
          writeY--
        }
      }
    }
    return newGrid
  }, [])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'escape') {
        togglePause()
      }
      if (isPaused) return

      switch (e.key.toLowerCase()) {
        case 'a': movePuyo('left'); playSound(300, 0.1); break
        case 'd': movePuyo('right'); playSound(300, 0.1); break
        case 's': movePuyo('down'); playSound(200, 0.1); break
        case 'o': rotatePuyo('left'); playSound(400, 0.1); break
        case 'p': rotatePuyo('right'); playSound(400, 0.1); break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isPaused, movePuyo, playSound, rotatePuyo, togglePause])

  useEffect(() => {
    if (gameState === 'active' && !isPaused) {
      const gameLoop = setInterval(() => {
        movePuyo('down')
      }, 1000) // Move down every second

      return () => clearInterval(gameLoop)
    }
  }, [gameState, isPaused, movePuyo])

  const renderGrid = useCallback(() => {
    return grid.map((row, y) => (
      <div key={y} className="flex">
        {row.map((color, x) => (
          <div
            key={`${x}-${y}`}
            className={`w-8 h-8 border border-gray-300 ${color ? `bg-${color}-500` : 'bg-gray-100'} transition-all duration-200`}
          />
        ))}
      </div>
    ))
  }, [grid])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-4xl font-bold mb-4">Puyo Puyo</h1>
      {gameState === 'title' && (
        <div className="text-center">
          <Button onClick={startGame} className="mb-4">Start Game</Button>
          <p className="text-xl">High Score: {highScore}</p>
        </div>
      )}
      {gameState === 'active' && (
        <div className="flex flex-col items-center">
          <div className="flex gap-8 mb-4">
            <div className="flex flex-col items-center">
              <h2 className="text-2xl font-semibold mb-2">Next Puyo</h2>
              {nextPuyo && (
                <div className="flex flex-col">
                  <div className={`w-8 h-8 bg-${nextPuyo.color1}-500`} />
                  <div className={`w-8 h-8 bg-${nextPuyo.color2}-500`} />
                </div>
              )}
            </div>
            <div className="flex flex-col items-center">
              <h2 className="text-2xl font-semibold mb-2">Score: {score}</h2>
              <h3 className="text-xl font-semibold mb-2">Chain: {chainCounter}</h3>
              <div className="border-2 border-gray-400">
                {renderGrid()}
              </div>
            </div>
          </div>
          <Button onClick={togglePause}>{isPaused ? 'Resume' : 'Pause'}</Button>
        </div>
      )}
      {gameState === 'over' && (
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Game Over</h2>
          <p className="text-xl mb-2">Final Score: {score}</p>
          <p className="text-xl mb-4">High Score: {highScore}</p>
          <Button onClick={startGame}>Play Again</Button>
        </div>
      )}
      {isPaused && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg">
            <h2 className="text-3xl font-bold mb-4">Paused</h2>
            <Button onClick={togglePause}>Resume</Button>
          </div>
        </div>
      )}
    </div>
  )
}