import { useState, useCallback } from 'react'
import { Globe } from './components/Globe/Globe'
import { StatusBar } from './components/HUD/StatusBar'
import { DetailPanel } from './components/HUD/DetailPanel'
import { Legend } from './components/HUD/Legend'
import { SolarPanel } from './components/HUD/SolarPanel'
import { useISS } from './hooks/useISS'
import { useSatellites } from './hooks/useSatellites'
import { useLaunches } from './hooks/useLaunches'
import { useSolarWeather } from './hooks/useSolarWeather'
import type { SelectedObject, SatellitePosition } from './types'

export default function App() {
  const { position: issPosition } = useISS()
  const { satellites } = useSatellites()
  const { launches } = useLaunches()
  const { weather } = useSolarWeather()
  const [selected, setSelected] = useState<SelectedObject>(null)
  const [showAllPaths, setShowAllPaths] = useState(false)
  const [autoRotate, setAutoRotate] = useState(true)

  const handleSelect = useCallback((obj: SelectedObject) => setSelected(obj), [])
  const handleClose = useCallback(() => setSelected(null), [])

  const selectedSatellite =
    selected?.type === 'satellite'
      ? (selected.data as SatellitePosition)
      : selected?.type === 'iss'
        ? satellites.find((s) => s.name.includes('ISS') || s.name.includes('ZARYA')) ?? null
        : null

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <Globe
        satellites={satellites}
        issPosition={issPosition}
        launches={launches}
        onSelect={handleSelect}
        showAllPaths={showAllPaths}
        autoRotate={autoRotate}
        selectedSatellite={selectedSatellite}
        kpIndex={weather?.kpIndex ?? 0}
      />
      <StatusBar
        weather={weather}
        satelliteCount={satellites.length}
        issOnline={issPosition !== null}
        showAllPaths={showAllPaths}
        onTogglePaths={() => setShowAllPaths((v) => !v)}
        autoRotate={autoRotate}
        onToggleRotate={() => setAutoRotate((v) => !v)}
      />
      <DetailPanel selected={selected} onClose={handleClose} />
      <Legend />
      <SolarPanel weather={weather} />
    </div>
  )
}
