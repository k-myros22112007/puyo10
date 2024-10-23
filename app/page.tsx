'use client'

import React from 'react'
import { PuyoGameComponent } from '@/components/puyo-game'

export default function PuyoGame() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <PuyoGameComponent />
    </div>
  )
}