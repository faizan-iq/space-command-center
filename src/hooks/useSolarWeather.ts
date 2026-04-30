import { useState, useEffect } from 'react'
import { fetchSolarWeather } from '../services/solar'
import type { SolarWeather } from '../types'

export function useSolarWeather() {
  const [weather, setWeather] = useState<SolarWeather | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchSolarWeather()
        setWeather(data)
      } catch {
        setError(true)
      }
    }

    load()
    const id = setInterval(load, 10 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  return { weather, error }
}
