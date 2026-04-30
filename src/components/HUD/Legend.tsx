export function Legend() {
  return (
    <div className="hud-panel fixed bottom-4 left-4 z-10 px-4 py-3 text-xs font-mono flex flex-col gap-2">
      <span className="text-gray-500 tracking-widest text-[10px]">LEGEND</span>
      <LegendItem color="rgba(100,200,255,0.8)" label="Satellite" />
      <LegendItem color="rgba(0,255,200,1)" label="ISS" size="lg" />
      <LegendItem color="rgba(255,160,0,0.9)" label="Launch Site" size="md" />
    </div>
  )
}

function LegendItem({
  color,
  label,
  size = 'sm',
}: {
  color: string
  label: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const dotSize = size === 'lg' ? 10 : size === 'md' ? 8 : 6
  return (
    <div className="flex items-center gap-2">
      <span
        style={{
          display: 'inline-block',
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 6px ${color}`,
          flexShrink: 0,
        }}
      />
      <span className="text-gray-300">{label}</span>
    </div>
  )
}
