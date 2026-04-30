import { useState, useEffect } from 'react'
import { fetchPlanetPositions } from '../services/horizons'
import type { BodyPosition } from '../services/horizons'

export function useSolarSystem(active: boolean) {
  const [positions, setPositions] = useState<BodyPosition[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!active) return

    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const data = await fetchPlanetPositions()
        if (!cancelled) { setPositions(data); setLoading(false) }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    const id = setInterval(load, 60_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [active])

  return { positions, loading }
}
