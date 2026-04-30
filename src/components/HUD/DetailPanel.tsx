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
  return `T-${d}d ${h}h ${m}m`
}

export function DetailPanel({ selected, onClose }: DetailPanelProps) {
  if (!selected) return null

  return (
    <div className="hud-panel glow-cyan slide-in-right fixed right-4 top-16 bottom-4 w-72 z-10 p-4 flex flex-col gap-3 overflow-y-auto">
      <div className="flex items-center justify-between">
        <span className="text-cyan-400 glow-text text-xs tracking-widest uppercase">
          {selected.type === 'satellite' && 'Satellite'}
          {selected.type === 'iss' && 'ISS — Intl Space Station'}
          {selected.type === 'launch' && 'Upcoming Launch'}
        </span>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-cyan-400 text-lg leading-none transition-colors"
        >
          ×
        </button>
      </div>

      <div className="border-t border-cyan-900" />

      {selected.type === 'satellite' && (
        <div className="flex flex-col gap-2 text-sm">
          <p className="text-white font-bold">{selected.data.name}</p>
          <Row label="Latitude" value={`${selected.data.lat.toFixed(2)}°`} />
          <Row label="Longitude" value={`${selected.data.lng.toFixed(2)}°`} />
          <Row label="Altitude" value={`${selected.data.alt.toFixed(0)} km`} />
          {selected.data.velocity && (
            <Row label="Velocity" value={`${(selected.data.velocity * 7.905).toFixed(2)} km/s`} />
          )}
        </div>
      )}

      {selected.type === 'iss' && (
        <div className="flex flex-col gap-2 text-sm">
          <Row label="Latitude" value={`${selected.data.lat.toFixed(4)}°`} />
          <Row label="Longitude" value={`${selected.data.lng.toFixed(4)}°`} />
          <Row label="Altitude" value={`${selected.data.alt.toFixed(1)} km`} />
          <Row label="Velocity" value={`${(selected.data.velocity / 3600).toFixed(2)} km/s`} />
          <Row label="Updated" value={new Date(selected.data.timestamp * 1000).toUTCString().slice(17, 25) + ' UTC'} />
        </div>
      )}

      {selected.type === 'launch' && (
        <div className="flex flex-col gap-2 text-sm">
          <p className="text-white font-bold">{selected.data.name}</p>
          <Row label="Rocket" value={selected.data.rocket} />
          <Row label="Status" value={selected.data.status} />
          <Row label="Pad" value={selected.data.pad.name} />
          <Row label="Location" value={selected.data.pad.location} />
          <Row label="Countdown" value={formatCountdown(selected.data.net)} highlight />
          {selected.data.mission && (
            <div className="mt-2">
              <p className="text-gray-400 text-xs mb-1">Mission</p>
              <p className="text-gray-300 text-xs leading-relaxed">{selected.data.mission}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-400">{label}</span>
      <span className={highlight ? 'text-cyan-300 glow-text' : 'text-gray-200'}>{value}</span>
    </div>
  )
}
