import { useState, useCallback } from 'react'
import { Globe } from './components/Globe/Globe'
import { SolarSystem } from './components/SolarSystem/SolarSystem'
import { StatusBar } from './components/HUD/StatusBar'
import { DetailPanel } from './components/HUD/DetailPanel'
import { Legend } from './components/HUD/Legend'
import { SolarPanel } from './components/HUD/SolarPanel'
import { useISS } from './hooks/useISS'
import { useSatellites } from './hooks/useSatellites'
import { useLaunches } from './hooks/useLaunches'
import { useSolarWeather } from './hooks/useSolarWeather'
import { useSolarSystem } from './hooks/useSolarSystem'
import type { SelectedObject, SatellitePosition } from './types'

type AppView = 'earth' | 'solar-system'

export default function App() {
  const { position: issPosition } = useISS()
  const { satellites } = useSatellites()
  const { launches } = useLaunches()
  const { weather } = useSolarWeather()
  const [selected, setSelected] = useState<SelectedObject>(null)
  const [showAllPaths, setShowAllPaths] = useState(false)
  const [autoRotate, setAutoRotate] = useState(true)
  const [view, setView] = useState<AppView>('earth')

  const { positions: solarPositions, loading: solarLoading } = useSolarSystem(view === 'solar-system')

  const handleSelect = useCallback((obj: SelectedObject) => setSelected(obj), [])
  const handleClose = useCallback(() => setSelected(null), [])

  const selectedSatellite =
    selected?.type === 'satellite'
      ? (selected.data as SatellitePosition)
      : selected?.type === 'iss'
        ? satellites.find((s) => s.name.includes('ISS') || s.name.includes('ZARYA')) ?? null
        : null

  const handleSelectPlanet = useCallback((name: string) => {
    // Show planet info in a simple selected state (reuse detail panel with a planet type later)
    console.log('Selected planet:', name)
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {view === 'earth' ? (
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
      ) : (
        <SolarSystem
          positions={solarPositions}
          loading={solarLoading}
          onSelectPlanet={handleSelectPlanet}
        />
      )}
      <StatusBar
        weather={weather}
        satelliteCount={satellites.length}
        issOnline={issPosition !== null}
        showAllPaths={showAllPaths}
        onTogglePaths={() => setShowAllPaths((v) => !v)}
        autoRotate={autoRotate}
        onToggleRotate={() => setAutoRotate((v) => !v)}
        view={view}
        onToggleView={() => setView((v) => v === 'earth' ? 'solar-system' : 'earth')}
      />
      {view === 'earth' && <DetailPanel selected={selected} onClose={handleClose} />}
      {view === 'earth' && <Legend />}
      {view === 'earth' && <SolarPanel weather={weather} />}
    </div>
  )
}
