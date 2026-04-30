import { useState, useEffect } from 'react'
import { fetchISSPosition } from '../services/iss'
import type { ISSPosition } from '../types'

export function useISS() {
  const [position, setPosition] = useState<ISSPosition | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function update() {
      try {
        const pos = await fetchISSPosition()
        if (!cancelled) setPosition(pos)
      } catch {
        if (!cancelled) setError(true)
      }
    }

    update()
    const id = setInterval(update, 5000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return { position, error }
}
