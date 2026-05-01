import { useState, useCallback, useEffect } from 'react'
import { Globe } from './components/Globe/Globe'
import { SolarSystem } from './components/SolarSystem/SolarSystem'
import { PlanetDetail } from './components/PlanetDetail/PlanetDetail'
import { StatusBar, type AppView } from './components/HUD/StatusBar'
import { DetailPanel } from './components/HUD/DetailPanel'
import { Legend } from './components/HUD/Legend'
import { SolarPanel } from './components/HUD/SolarPanel'
import { useISS } from './hooks/useISS'
import { useSatellites } from './hooks/useSatellites'
import { useLaunches } from './hooks/useLaunches'
import { useSolarWeather } from './hooks/useSolarWeather'
import { useSolarSystem } from './hooks/useSolarSystem'
import { PLANETS } from './services/horizons'
import { prewarmAssets } from './services/assets'
import type { SelectedObject, SatellitePosition } from './types'

export default function App() {
  useEffect(() => { prewarmAssets() }, [])
  const { position: issPosition } = useISS()
  const { satellites } = useSatellites()
  const { launches } = useLaunches()
  const { weather } = useSolarWeather()
  const [selected, setSelected] = useState<SelectedObject>(null)
  const [showAllPaths, setShowAllPaths] = useState(false)
  const [autoRotate, setAutoRotate] = useState(true)
  const [view, setView] = useState<AppView>({ kind: 'earth' })

  const { positions: solarPositions, loading: solarLoading } = useSolarSystem(view.kind === 'solar-system')

  const handleSelect = useCallback((obj: SelectedObject) => setSelected(obj), [])
  const handleClose = useCallback(() => setSelected(null), [])

  const selectedSatellite =
    selected?.type === 'satellite'
      ? (selected.data as SatellitePosition)
      : selected?.type === 'iss'
        ? satellites.find((s) => s.name.includes('ISS') || s.name.includes('ZARYA')) ?? null
        : null

  const handleSelectPlanet = useCallback((planetId: string) => {
    // Earth → existing globe view; other planets → generic detail view
    if (planetId === '399') {
      setView({ kind: 'earth' })
    } else {
      setView({ kind: 'planet', planetId })
      setSelected(null)
    }
  }, [])

  const handleBackToSolarSystem = useCallback(() => {
    setView({ kind: 'solar-system' })
    setSelected(null)
  }, [])

  const handleSelectView = useCallback((next: AppView) => {
    setView(next)
    setSelected(null)
  }, [])

  const currentPlanet =
    view.kind === 'planet' ? PLANETS.find((p) => p.id === view.planetId) ?? null : null

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {view.kind === 'earth' && (
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
      )}
      {view.kind === 'solar-system' && (
        <SolarSystem
          positions={solarPositions}
          loading={solarLoading}
          onSelectPlanet={handleSelectPlanet}
        />
      )}
      {view.kind === 'planet' && currentPlanet && (
        <PlanetDetail
          planet={currentPlanet}
          onSelect={handleSelect}
          onBack={handleBackToSolarSystem}
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
        onSelectView={handleSelectView}
      />
      {(view.kind === 'earth' || view.kind === 'planet') && (
        <DetailPanel selected={selected} onClose={handleClose} />
      )}
      {view.kind === 'earth' && <Legend />}
      {view.kind === 'earth' && <SolarPanel weather={weather} />}
    </div>
  )
}
