import { useState, useEffect } from 'react'
import type { SolarWeather } from '../../types'
import { PLANETS } from '../../services/horizons'

export type AppView =
  | { kind: 'earth' }
  | { kind: 'solar-system' }
  | { kind: 'planet'; planetId: string }

interface StatusBarProps {
  weather: SolarWeather | null
  satelliteCount: number
  issOnline: boolean
  showAllPaths: boolean
  onTogglePaths: () => void
  autoRotate: boolean
  onToggleRotate: () => void
  view: AppView
  onSelectView: (view: AppView) => void
}

const PLANET_GLYPH: Record<string, string> = {
  Mercury: '☿',
  Venus: '♀',
  Earth: '⊕',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '♅',
  Neptune: '♆',
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
  view,
  onSelectView,
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

  const isActiveSolar = view.kind === 'solar-system'
  const activePlanetId =
    view.kind === 'earth' ? '399'
    : view.kind === 'planet' ? view.planetId
    : null

  const onPlanetTab = (planetId: string) => {
    if (planetId === '399') onSelectView({ kind: 'earth' })
    else onSelectView({ kind: 'planet', planetId })
  }

  return (
    <div
      className="hud-panel glow-cyan fixed top-0 left-0 right-0 z-10 flex items-center justify-between"
      style={{ padding: '6px 14px', minHeight: 44, gap: 8 }}
    >
      {/* Left — brand + clock */}
      <div className="flex items-center gap-3" style={{ flexShrink: 0 }}>
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

      {/* Centre — planet tabs */}
      <div className="flex items-center" style={{ gap: 4, flex: '0 1 auto', overflow: 'hidden' }}>
        <button
          className={`hud-btn ${isActiveSolar ? 'active' : ''}`}
          onClick={() => onSelectView({ kind: 'solar-system' })}
          title="Solar system overview"
        >
          ☀ Solar System
        </button>
        <Divider />
        {PLANETS.map((p) => (
          <button
            key={p.id}
            className={`hud-btn planet-tab ${activePlanetId === p.id ? 'active' : ''}`}
            onClick={() => onPlanetTab(p.id)}
            title={p.name}
          >
            <span style={{ marginRight: 4 }}>{PLANET_GLYPH[p.name] ?? '·'}</span>
            {p.name}
          </button>
        ))}
      </div>

      {/* Right — telemetry + view-specific controls */}
      <div className="flex items-center gap-3" style={{ flexShrink: 0 }}>
        <Stat label="Sat" value={satelliteCount.toLocaleString()} />
        <Divider />
        <div className="flex items-center gap-1">
          <span className={`status-dot ${issOnline ? 'online' : 'offline'}`} />
          <span className="value-text" style={{ color: issOnline ? '#00ff8c' : '#ff4040', fontSize: 10 }}>
            ISS
          </span>
        </div>
        {weather && (
          <>
            <Divider />
            <div className="flex items-center gap-1" title={weather.kpLabel}>
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
            </div>
          </>
        )}
        {view.kind === 'earth' && (
          <>
            <Divider />
            <button className={`hud-btn ${showAllPaths ? 'active' : ''}`} onClick={onTogglePaths}>
              Orbits {showAllPaths ? 'ON' : 'OFF'}
            </button>
            <button className={`hud-btn ${autoRotate ? 'active' : ''}`} onClick={onToggleRotate}>
              {autoRotate ? '⟳' : '⏸'}
            </button>
          </>
        )}
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
    <div className="flex items-center gap-1">
      <span className="label-text">{label}</span>
      <span className="value-text" style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </span>
    </div>
  )
}
