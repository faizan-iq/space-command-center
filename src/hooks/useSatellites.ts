import { useState, useEffect, useRef } from 'react'
import { fetchTLEs, propagateSatellites, getCachedTLEs } from '../services/celestrak'
import type { SatellitePosition } from '../types'

export function useSatellites() {
  const [satellites, setSatellites] = useState<SatellitePosition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const tlesLoaded = useRef(false)

  useEffect(() => {
    async function loadTLEs() {
      try {
        await fetchTLEs()
        tlesLoaded.current = true
        setLoading(false)
      } catch {
        setError(true)
        setLoading(false)
      }
    }
    loadTLEs()
  }, [])

  useEffect(() => {
    if (loading) return
    const id = setInterval(() => {
      const tles = getCachedTLEs()
      if (tles.length > 0) {
        setSatellites(propagateSatellites(tles))
      }
    }, 1000)
    return () => clearInterval(id)
  }, [loading])

  return { satellites, loading, error }
}
