import { useState, useEffect } from 'react'
import { computePlanetPositions } from '../services/horizons'
import type { BodyPosition } from '../services/horizons'

export function useSolarSystem(active: boolean) {
  const [positions, setPositions] = useState<BodyPosition[]>([])

  useEffect(() => {
    if (!active) return
    // Compute immediately from Keplerian elements — no network needed
    setPositions(computePlanetPositions())
    // Recompute every minute (planets move slowly)
    const id = setInterval(() => setPositions(computePlanetPositions()), 60_000)
    return () => clearInterval(id)
  }, [active])

  return { positions, loading: false }
}
