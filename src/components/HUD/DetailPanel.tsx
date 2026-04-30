import type { SelectedObject } from '../../types'

interface DetailPanelProps {
  selected: SelectedObject
  onClose: () => void
}

function formatCountdown(net: string): string {
  const diff = new Date(net).getTime() - Date.now()
  if (diff < 0) return 'Launched'
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return `T− ${d}d ${h}h ${m}m`
}

function typeBadge(objectType?: string) {
  if (!objectType) return null
  const t = objectType.toUpperCase()
  if (t.includes('PAYLOAD'))     return <span className="badge badge-payload">Payload</span>
  if (t.includes('ROCKET'))      return <span className="badge badge-rocket">Rocket Body</span>
  if (t.includes('DEBRIS'))      return <span className="badge badge-debris">Debris</span>
  return <span className="badge badge-unknown">{objectType}</span>
}

export function DetailPanel({ selected, onClose }: DetailPanelProps) {
  if (!selected) return null

  const sectionTitle =
    selected.type === 'satellite' ? 'Satellite'
    : selected.type === 'iss'     ? 'International Space Station'
    : 'Launch'

  return (
    <div
      className="hud-panel glow-cyan slide-in-right fixed z-10 flex flex-col"
      style={{ top: 52, right: 12, bottom: 12, width: 280, padding: '14px 16px', overflowY: 'auto', gap: 0 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between" style={{ marginBottom: 10 }}>
        <div className="flex flex-col gap-1">
          <span className="label-text">{sectionTitle}</span>
          <span
            style={{
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: 15,
              fontWeight: 700,
              color: '#c8eeff',
              letterSpacing: '0.04em',
              lineHeight: 1.2,
            }}
          >
            {selected.type === 'satellite' && selected.data.name}
            {selected.type === 'iss' && 'ISS'}
            {selected.type === 'launch' && selected.data.name}
          </span>
          {selected.type === 'satellite' && (
            <div style={{ marginTop: 3 }}>{typeBadge(selected.data.objectType)}</div>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            color: 'rgba(0,210,255,0.4)',
            fontSize: 18,
            lineHeight: 1,
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            padding: '0 2px',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#00d2ff')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(0,210,255,0.4)')}
        >
          ×
        </button>
      </div>

      <hr className="hud-divider" />

      {/* Satellite data */}
      {selected.type === 'satellite' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          <Row label="Latitude"  value={`${selected.data.lat.toFixed(4)}°`} />
          <Row label="Longitude" value={`${selected.data.lng.toFixed(4)}°`} />
          <Row label="Altitude"  value={`${selected.data.alt.toFixed(1)} km`} />
          {selected.data.velocity !== undefined && (
            <Row label="Velocity" value={`${(selected.data.velocity * 7.905).toFixed(2)} km/s`} />
          )}
        </div>
      )}

      {/* ISS data */}
      {selected.type === 'iss' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          <Row label="Latitude"  value={`${selected.data.lat.toFixed(4)}°`} />
          <Row label="Longitude" value={`${selected.data.lng.toFixed(4)}°`} />
          <Row label="Altitude"  value={`${selected.data.alt.toFixed(1)} km`} />
          <Row label="Velocity"  value={`${(selected.data.velocity / 3600).toFixed(2)} km/s`} />
          <Row
            label="Updated"
            value={new Date(selected.data.timestamp * 1000).toUTCString().slice(17, 25) + ' UTC'}
          />
        </div>
      )}

      {/* Launch data */}
      {selected.type === 'launch' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          <Row label="Rocket"   value={selected.data.rocket} />
          <Row label="Status"   value={selected.data.status} />
          <Row label="Pad"      value={selected.data.pad.name} />
          <Row label="Location" value={selected.data.pad.location} />
          <Row
            label="Countdown"
            value={formatCountdown(selected.data.net)}
            highlight
          />
          {selected.data.mission && (
            <>
              <hr className="hud-divider" />
              <div>
                <div className="label-text" style={{ marginBottom: 5 }}>Mission</div>
                <p
                  style={{
                    fontFamily: 'Rajdhani, sans-serif',
                    fontSize: 12,
                    color: 'rgba(180,210,230,0.75)',
                    lineHeight: 1.55,
                  }}
                >
                  {selected.data.mission}
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
      <span className="label-text" style={{ flexShrink: 0 }}>{label}</span>
      <span
        className="value-text"
        style={
          highlight
            ? { color: '#00d2ff', textShadow: '0 0 8px rgba(0,210,255,0.6)' }
            : undefined
        }
      >
        {value}
      </span>
    </div>
  )
}
