import { useState } from 'react'
import type { SolarWeather } from '../../types'

interface SolarPanelProps {
  weather: SolarWeather | null
}

function KpBar({ kp }: { kp: number }) {
  const pct = Math.min((kp / 9) * 100, 100)
  const color = kp < 4 ? '#4ade80' : kp < 6 ? '#facc15' : '#f87171'
  return (
    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-1000"
        style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}` }}
      />
    </div>
  )
}

export function SolarPanel({ weather }: SolarPanelProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="hud-panel fixed bottom-4 right-4 z-10 w-52 text-xs font-mono">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-4 py-2 text-cyan-400 hover:text-cyan-300 transition-colors"
      >
        <span className="tracking-widest text-[10px]">SPACE WEATHER</span>
        <span className="text-gray-500">{collapsed ? '▲' : '▼'}</span>
      </button>

      {!collapsed && (
        <div className="px-4 pb-3 flex flex-col gap-3">
          <div className="border-t border-cyan-900" />
          {weather ? (
            <>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">Kp Index</span>
                  <span className={weather.kpIndex < 4 ? 'text-green-400' : weather.kpIndex < 6 ? 'text-yellow-400' : 'text-red-400'}>
                    {weather.kpIndex.toFixed(1)}
                  </span>
                </div>
                <KpBar kp={weather.kpIndex} />
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400">Activity</span>
                <span className="text-gray-200">{weather.kpLabel}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400">CMEs (7d)</span>
                <span className={weather.cmeCount > 0 ? 'text-orange-400' : 'text-gray-500'}>
                  {weather.cmeCount}
                </span>
              </div>

              <div className="text-[10px] text-gray-600">
                Updated {weather.lastUpdated.toUTCString().slice(17, 25)} UTC
              </div>
            </>
          ) : (
            <span className="text-gray-600">Loading...</span>
          )}
        </div>
      )}
    </div>
  )
}
