import { useEffect, useRef } from 'react'
import GlobeGL from 'globe.gl'
import * as THREE from 'three'
import type { SatellitePosition, ISSPosition, Launch, SelectedObject } from '../../types'

interface GlobeProps {
  satellites: SatellitePosition[]
  issPosition: ISSPosition | null
  launches: Launch[]
  onSelect: (obj: SelectedObject) => void
}

// Cache Three.js models by satellite name — created once, reused every second
const modelCache = new Map<string, THREE.Group>()

function buildSatModel(isISS: boolean): THREE.Group {
  const group = new THREE.Group()
  const s = isISS ? 3 : 1
  const bodyColor = isISS ? 0x00ffc8 : 0x88ddff
  const panelColor = isISS ? 0x00aa88 : 0x1a5577

  // Main body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.6 * s, 0.3 * s, 0.3 * s),
    new THREE.MeshBasicMaterial({ color: bodyColor })
  )
  group.add(body)

  // Solar panels — two wings extending sideways
  const panelGeo = new THREE.BoxGeometry(0.9 * s, 0.06 * s, 0.4 * s)
  const panelMat = new THREE.MeshBasicMaterial({ color: panelColor })

  const left = new THREE.Mesh(panelGeo, panelMat)
  left.position.x = -0.75 * s
  group.add(left)

  const right = new THREE.Mesh(panelGeo, panelMat)
  right.position.x = 0.75 * s
  group.add(right)

  return group
}

function getModel(name: string, isISS = false): THREE.Group {
  if (!modelCache.has(name)) {
    modelCache.set(name, buildSatModel(isISS))
  }
  return modelCache.get(name)!
}

// Altitude as fraction of Earth's radius — visually scaled so LEO is clearly elevated
function altFraction(km: number): number {
  // Raw: LEO ~400km = 0.063, GEO ~35786km = 5.6 — too extreme for GEO
  // Log scale brings high orbits closer in while preserving LEO separation
  return Math.log1p(km / 400) * 0.12
}

export function Globe({ satellites, issPosition, launches, onSelect }: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const globe = new GlobeGL(containerRef.current)
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
      .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
      .atmosphereColor('rgba(0, 200, 255, 0.15)')
      .atmosphereAltitude(0.18)
      .width(containerRef.current.offsetWidth)
      .height(containerRef.current.offsetHeight)

    globe.controls().autoRotate = true
    globe.controls().autoRotateSpeed = 0.3
    globe.controls().enableDamping = true
    globe.controls().dampingFactor = 0.1

    globeRef.current = globe

    const handleResize = () => {
      if (!containerRef.current) return
      globe.width(containerRef.current.offsetWidth).height(containerRef.current.offsetHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      globe._destructor?.()
    }
  }, [])

  // Satellites + ISS as 3D objects (no beam, properly elevated)
  useEffect(() => {
    if (!globeRef.current) return
    const globe = globeRef.current

    const satObjects = satellites.map((s) => ({
      lat: s.lat,
      lng: s.lng,
      alt: altFraction(s.alt),
      data: s,
      kind: 'satellite' as const,
      label: s.name,
    }))

    const issObjects = issPosition
      ? [
          {
            lat: issPosition.lat,
            lng: issPosition.lng,
            alt: altFraction(issPosition.alt),
            data: issPosition,
            kind: 'iss' as const,
            label: 'ISS',
          },
        ]
      : []

    globe
      .objectsData([...satObjects, ...issObjects])
      .objectLat('lat')
      .objectLng('lng')
      .objectAltitude('alt')
      .objectThreeObject((d: any) =>
        getModel(d.kind === 'iss' ? '__ISS__' : d.data.name, d.kind === 'iss')
      )
      .objectLabel((d: any) =>
        d.kind === 'iss'
          ? '<b style="color:#00ffc8;font-family:monospace">ISS</b>'
          : `<span style="color:#88ddff;font-family:monospace">${d.data.name}</span>`
      )
      .onObjectClick((d: any) => {
        if (d.kind === 'satellite') onSelect({ type: 'satellite', data: d.data })
        if (d.kind === 'iss') onSelect({ type: 'iss', data: d.data })
        globeRef.current?.pointOfView({ lat: d.lat, lng: d.lng, altitude: 1.5 }, 800)
      })
  }, [satellites, issPosition, onSelect])

  // Launch sites as surface points (alt 0 = no beam)
  useEffect(() => {
    if (!globeRef.current) return
    const globe = globeRef.current

    const launchPoints = launches.map((l) => ({
      lat: l.pad.lat,
      lng: l.pad.lng,
      alt: 0,
      color: 'rgba(255, 160, 0, 0.95)',
      size: 0.5,
      data: l,
      kind: 'launch',
    }))

    globe
      .pointsData(launchPoints)
      .pointLat('lat')
      .pointLng('lng')
      .pointAltitude(0)
      .pointColor('color')
      .pointRadius('size')
      .pointLabel((d: any) => `<span style="color:#ffa000;font-family:monospace">${d.data.name}</span>`)
      .onPointClick((d: any) => {
        onSelect({ type: 'launch', data: d.data })
        globeRef.current?.pointOfView({ lat: d.lat, lng: d.lng, altitude: 1.5 }, 800)
      })
  }, [launches, onSelect])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
