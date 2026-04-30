import { useState, useEffect } from 'react'
import type { SolarWeather } from '../../types'

interface StatusBarProps {
  weather: SolarWeather | null
  satelliteCount: number
  issOnline: boolean
}

function kpColor(kp: number): string {
  if (kp < 4) return 'text-green-400'
  if (kp < 6) return 'text-yellow-400'
  return 'text-red-400'
}

export function StatusBar({ weather, satelliteCount, issOnline }: StatusBarProps) {
  const [utc, setUtc] = useState('')

  useEffect(() => {
    const tick = () => setUtc(new Date().toUTCString().slice(17, 25) + ' UTC')
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="hud-panel glow-cyan fixed top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-2 text-xs font-mono">
      <div className="flex items-center gap-6">
        <span className="text-cyan-400 glow-text font-bold tracking-widest">
          SPACE COMMAND CENTER
        </span>
        <span className="text-cyan-300 opacity-70">{utc}</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">SAT</span>
          <span className="text-cyan-300">{satelliteCount.toLocaleString()}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-gray-400">ISS</span>
          <span className={issOnline ? 'text-green-400' : 'text-red-400'}>
            {issOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>

        {weather && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Kp</span>
              <span className={kpColor(weather.kpIndex)}>
                {weather.kpIndex.toFixed(1)} — {weather.kpLabel}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-400">CME</span>
              <span className={weather.cmeCount > 0 ? 'text-orange-400' : 'text-gray-500'}>
                {weather.cmeCount} / 7d
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
