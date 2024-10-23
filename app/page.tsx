'use client'

import React, { useState, useEffect, useCallback } from 'react'
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

export default function PuyoGame() {
  const [grid, setGrid] = useState<Grid>(createEmptyGrid())
  const [gameState, setGameState] = useState<GameState>('title')
  const [score, setScore] = useState(0)
  const [currentPuyo, setCurrentPuyo] = useState<PuyoPair | null>(null)
  const [nextPuyo, setNextPuyo] = useState<PuyoPair | null>(null)
  const [chainCounter, setChainCounter] = useState(0)

  const generatePuyoPair = useCallback((): PuyoPair => ({
    color1: randomPuyoColor(),
    color2: randomPuyoColor(),
    x: 2,
    y: 0,
    rotation: 0
  }), [])

  const startGame = () => {
    setGrid(createEmptyGrid())
    setScore(0)
    setChainCounter(0)
    setCurrentPuyo(generatePuyoPair())
    setNextPuyo(generatePuyoPair())
    setGameState('active')
  }

  const movePuyo = (direction: 'left' | 'right' | 'down') => {
    if (!currentPuyo || gameState !== 'active') return

    const newPuyo = { ...currentPuyo }
    if (direction === 'left') newPuyo.x -= 1
    if (direction === 'right') newPuyo.x += 1
    if (direction === 'down') newPuyo.y += 1

    if (isValidMove(newPuyo)) {
      setCurrentPuyo(newPuyo)
    } else if (direction === 'down') {
      placePuyo()
    }
  }

  const rotatePuyo = (direction: 'left' | 'right') => {
    if (!currentPuyo || gameState !== 'active') return

    const newPuyo = { ...currentPuyo }
    newPuyo.rotation = (newPuyo.rotation + (direction === 'left' ? -1 : 1) + 4) % 4

    if (isValidMove(newPuyo)) {
      setCurrentPuyo(newPuyo)
    }
  }

  const isValidMove = (puyo: PuyoPair): boolean => {
    const { x, y, rotation } = puyo
    const [x2, y2] = getSecondPuyoPosition(x, y, rotation)

    return (
      x >= 0 && x < GRID_COLS && y >= 0 && y < GRID_ROWS &&
      x2 >= 0 && x2 < GRID_COLS && y2 >= 0 && y2 < GRID_ROWS &&
      !grid[y][x] && !grid[y2][x2]
    )
  }

  const getSecondPuyoPosition = (x: number, y: number, rotation: number): [number, number] => {
    switch (rotation) {
      case 0: return [x, y - 1]
      case 1: return [x + 1, y]
      case 2: return [x, y + 1]
      case 3: return [x - 1, y]
      default: return [x, y]
    }
  }

  const placePuyo = () => {
    if (!currentPuyo) return

    const newGrid = [...grid]
    const { x, y, color1, color2, rotation } = currentPuyo
    const [x2, y2] = getSecondPuyoPosition(x, y, rotation)

    newGrid[y][x] = color1
    newGrid[y2][x2] = color2

    setGrid(newGrid)
    setCurrentPuyo(null)
    checkForMatches(newGrid)
  }

  const checkForMatches = (grid: Grid) => {
    // Implement chain reaction logic here
    // This is a placeholder for the actual chain reaction logic
    console.log("Checking for matches...")
    setCurrentPuyo(nextPuyo)
    setNextPuyo(generatePuyoPair())
  }

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'a': movePuyo('left'); break
        case 'd': movePuyo('right'); break
        case 's': movePuyo('down'); break
        case 'o': rotatePuyo('left'); break
        case 'p': rotatePuyo('right'); break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [currentPuyo, gameState])

  useEffect(() => {
    if (gameState === 'active') {
      const gameLoop = setInterval(() => {
        movePuyo('down')
      }, 1000) // Move down every second

      return () => clearInterval(gameLoop)
    }
  }, [gameState, currentPuyo])

  const renderGrid = () => {
    return grid.map((row, y) => (
      <div key={y} className="flex">
        {row.map((color, x) => (
          <div
            key={`${x}-${y}`}
            className={`w-8 h-8 border border-gray-300 ${color ? `bg-${color}-500` : 'bg-gray-100'}`}
          />
        ))}
      </div>
    ))
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-4xl font-bold mb-4">Puyo Puyo</h1>
      {gameState === 'title' && (
        <Button onClick={startGame}>Start Game</Button>
      )}
      {gameState === 'active' && (
        <div className="flex gap-8">
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
            <div className="border-2 border-gray-400">
              {renderGrid()}
            </div>
          </div>
        </div>
      )}
      {gameState === 'over' && (
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Game Over</h2>
          <p className="text-xl mb-4">Final Score: {score}</p>
          <Button onClick={startGame}>Play Again</Button>
        </div>
      )}
    </div>
  )
}