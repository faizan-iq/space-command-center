export function Legend() {
  return (
    <div
      className="hud-panel fixed bottom-4 left-4 z-10"
      style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <span className="label-text">Legend</span>
      <LegendItem color="#88ddff" label="Satellite" size={6} />
      <LegendItem color="#00ffc8" label="ISS" size={9} glow />
      <LegendItem color="#ffa000" label="Launch Site" size={7} />
    </div>
  )
}

function LegendItem({
  color,
  label,
  size,
  glow,
}: {
  color: string
  label: string
  size: number
  glow?: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span
        style={{
          display: 'inline-block',
          width: size,
          height: size,
          borderRadius: '50%',
          background: color,
          boxShadow: glow ? `0 0 8px ${color}, 0 0 16px ${color}` : `0 0 5px ${color}`,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: 12,
          fontWeight: 500,
          color: 'rgba(180,215,235,0.75)',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </span>
    </div>
  )
}
