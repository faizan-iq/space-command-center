import { useState } from 'react'
import type { SolarWeather } from '../../types'

interface SolarPanelProps {
  weather: SolarWeather | null
}

function kpColor(kp: number): string {
  if (kp < 4) return '#00ff8c'
  if (kp < 6) return '#ffcc00'
  return '#ff4040'
}

function statusDescription(kp: number): string {
  if (kp < 3) return 'All quiet — no disruptions'
  if (kp < 4) return 'Slightly elevated activity'
  if (kp < 5) return 'Active — minor disruptions possible'
  if (kp < 6) return 'G1 Storm — auroras at high latitudes'
  if (kp < 7) return 'G2 Storm — auroras at mid-latitudes'
  return 'Severe storm — satellite disruption risk'
}

function KpBar({ kp }: { kp: number }) {
  const pct = Math.min((kp / 9) * 100, 100)
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        style={{
          width: '100%',
          height: 4,
          background: 'rgba(255,255,255,0.07)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: 2,
            background: 'linear-gradient(to right, #00ff8c, #ffcc00 55%, #ff4040)',
            transition: 'width 1s ease',
          }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        <span className="label-text" style={{ fontSize: 9 }}>0</span>
        <span className="label-text" style={{ fontSize: 9 }}>9</span>
      </div>
    </div>
  )
}

export function SolarPanel({ weather }: SolarPanelProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="hud-panel fixed bottom-4 right-4 z-10" style={{ width: 240 }}>
      <button
        onClick={() => setCollapsed((c) => !c)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
          <span className="label-text">Space Weather</span>
          <span className="label-text" style={{ fontSize: 9, opacity: 0.5, textTransform: 'none', letterSpacing: 0 }}>
            geomagnetic disturbance (0–9)
          </span>
        </div>
        <span style={{ color: 'rgba(0,210,255,0.35)', fontSize: 10 }}>
          {collapsed ? '▲' : '▼'}
        </span>
      </button>

      {!collapsed && (
        <div style={{ padding: '0 14px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <hr className="hud-divider" style={{ margin: '0 0 2px' }} />

          {weather ? (
            <>
              {/* Kp Index */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span className="label-text">Kp Index</span>
                  <span className="value-text" style={{ color: kpColor(weather.kpIndex) }}>
                    {weather.kpIndex.toFixed(1)}
                  </span>
                </div>
                <KpBar kp={weather.kpIndex} />
                <span
                  style={{
                    fontFamily: 'Rajdhani, sans-serif',
                    fontSize: 10,
                    color: 'rgba(140,200,230,0.65)',
                    lineHeight: 1.3,
                  }}
                >
                  {statusDescription(weather.kpIndex)}
                </span>
              </div>

              <hr className="hud-divider" style={{ margin: '0' }} />

              {/* Activity */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="label-text">Activity</span>
                <span className="value-text">{weather.kpLabel}</span>
              </div>

              {/* CME count */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span className="label-text">CMEs (7d)</span>
                  <span
                    className="value-text"
                    style={{ color: weather.cmeCount > 0 ? '#ffa040' : undefined }}
                  >
                    {weather.cmeCount}
                  </span>
                </div>
                <span className="label-text" style={{ fontSize: 9, opacity: 0.5, textTransform: 'none', letterSpacing: 0 }}>
                  coronal mass ejections
                </span>
              </div>

              <span className="label-text" style={{ fontSize: 9, marginTop: 2 }}>
                Updated {weather.lastUpdated.toUTCString().slice(17, 25)} UTC
              </span>
            </>
          ) : (
            <span className="label-text">Loading...</span>
          )}
        </div>
      )}
    </div>
  )
}
