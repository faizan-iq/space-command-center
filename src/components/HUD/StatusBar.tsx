import { useState, useEffect } from 'react'
import type { SolarWeather } from '../../types'

interface StatusBarProps {
  weather: SolarWeather | null
  satelliteCount: number
  issOnline: boolean
  showAllPaths: boolean
  onTogglePaths: () => void
  autoRotate: boolean
  onToggleRotate: () => void
}

function kpColor(kp: number): string {
  if (kp < 4) return '#00ff8c'
  if (kp < 6) return '#ffcc00'
  return '#ff4040'
}

export function StatusBar({
  weather,
  satelliteCount,
  issOnline,
  showAllPaths,
  onTogglePaths,
  autoRotate,
  onToggleRotate,
}: StatusBarProps) {
  const [utc, setUtc] = useState('')

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setUtc(now.toUTCString().replace('GMT', 'UTC'))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      className="hud-panel glow-cyan fixed top-0 left-0 right-0 z-10 flex items-center justify-between"
      style={{ padding: '6px 20px', minHeight: 44 }}
    >
      {/* Left — branding + clock */}
      <div className="flex items-center gap-5">
        <span
          className="glow-text"
          style={{
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: 17,
            fontWeight: 700,
            letterSpacing: '0.2em',
            color: '#00d2ff',
            textTransform: 'uppercase',
          }}
        >
          Satelocate
        </span>
        <Divider />
        <span className="font-data" style={{ fontSize: 11, color: 'rgba(140,200,230,0.6)' }}>
          {utc}
        </span>
      </div>

      {/* Centre — telemetry */}
      <div className="flex items-center gap-5">
        <Stat label="Satellites" value={satelliteCount.toLocaleString()} />
        <Divider />
        <div className="flex items-center gap-2">
          <span className={`status-dot ${issOnline ? 'online' : 'offline'}`} />
          <span className="label-text">ISS</span>
          <span className="value-text" style={{ color: issOnline ? '#00ff8c' : '#ff4040' }}>
            {issOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>
        {weather && (
          <>
            <Divider />
            <div className="flex items-center gap-2">
              <span
                className="status-dot"
                style={{
                  background: kpColor(weather.kpIndex),
                  boxShadow: `0 0 6px ${kpColor(weather.kpIndex)}`,
                }}
              />
              <span className="label-text">Kp</span>
              <span className="value-text" style={{ color: kpColor(weather.kpIndex) }}>
                {weather.kpIndex.toFixed(1)}
              </span>
              <span className="label-text">{weather.kpLabel}</span>
            </div>
            <Divider />
            <Stat
              label="CME 7d"
              value={String(weather.cmeCount)}
              valueColor={weather.cmeCount > 0 ? '#ffa040' : undefined}
            />
          </>
        )}
      </div>

      {/* Right — controls */}
      <div className="flex items-center gap-2">
        <button className={`hud-btn ${showAllPaths ? 'active' : ''}`} onClick={onTogglePaths}>
          Orbits {showAllPaths ? 'ON' : 'OFF'}
        </button>
        <button className={`hud-btn ${autoRotate ? 'active' : ''}`} onClick={onToggleRotate}>
          {autoRotate ? '⟳ Rotating' : '⏸ Paused'}
        </button>
      </div>
    </div>
  )
}

function Divider() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 1,
        height: 16,
        background: 'rgba(0,210,255,0.18)',
        flexShrink: 0,
      }}
    />
  )
}

function Stat({
  label,
  value,
  valueColor,
}: {
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="label-text">{label}</span>
      <span className="value-text" style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </span>
    </div>
  )
}
