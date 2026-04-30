import { useState, useEffect, useRef } from 'react'
import { fetchTLEs, propagateSatellites, getCachedTLEs, loadSatelliteDb } from '../services/celestrak'
import type { SatellitePosition } from '../types'

export function useSatellites() {
  const [satellites, setSatellites] = useState<SatellitePosition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const tlesLoaded = useRef(false)

  useEffect(() => {
    async function loadTLEs() {
      try {
        await Promise.all([fetchTLEs(), loadSatelliteDb()])
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
    const tles = getCachedTLEs()
    // Large TLE sets are expensive to propagate — slow down for >500 satellites
    const intervalMs = tles.length > 500 ? 5000 : 1000
    const id = setInterval(() => {
      const current = getCachedTLEs()
      if (current.length > 0) {
        setSatellites(propagateSatellites(current))
      }
    }, intervalMs)
    return () => clearInterval(id)
  }, [loading])

  return { satellites, loading, error }
}
