import { useState, useEffect } from 'react'
import { fetchUpcomingLaunches } from '../services/launches'
import type { Launch } from '../types'

export function useLaunches() {
  const [launches, setLaunches] = useState<Launch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchUpcomingLaunches()
        setLaunches(data)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    load()
    const id = setInterval(load, 60 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  return { launches, loading, error }
}
