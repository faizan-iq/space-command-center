import { useEffect, useRef } from 'react'
import GlobeGL from 'globe.gl'
import * as THREE from 'three'
import type { SatellitePosition, ISSPosition, Launch, SelectedObject } from '../../types'
import { computeOrbitECEF } from '../../services/celestrak'

interface GlobeProps {
  satellites: SatellitePosition[]
  issPosition: ISSPosition | null
  launches: Launch[]
  onSelect: (obj: SelectedObject) => void
  showAllPaths: boolean
  autoRotate: boolean
  selectedSatellite: SatellitePosition | null
  kpIndex: number
}

// Cache Three.js models by name — created once, reused every update tick
const modelCache = new Map<string, THREE.Group>()

function buildSatModel(isISS: boolean): THREE.Group {
  const group = new THREE.Group()
  const s = isISS ? 3 : 1
  const bodyColor = isISS ? 0x00ffc8 : 0x88ddff
  const panelColor = isISS ? 0x00aa88 : 0x1a5577

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.6 * s, 0.3 * s, 0.3 * s),
    new THREE.MeshBasicMaterial({ color: bodyColor })
  )
  group.add(body)

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

function getModel(key: string, isISS = false): THREE.Group {
  if (!modelCache.has(key)) modelCache.set(key, buildSatModel(isISS))
  return modelCache.get(key)!
}

function altFraction(km: number): number {
  return Math.log1p(km / 400) * 0.12
}

// Convert B-V color index to a THREE.Color
function bvToColor(bv: number): THREE.Color {
  const color = new THREE.Color()
  if (bv < -0.3) color.setRGB(0.6, 0.7, 1.0)       // hot blue
  else if (bv < 0.0) color.setRGB(0.8, 0.85, 1.0)   // blue-white
  else if (bv < 0.3) color.setRGB(1.0, 1.0, 1.0)    // white
  else if (bv < 0.6) color.setRGB(1.0, 1.0, 0.85)   // yellow-white
  else if (bv < 1.0) color.setRGB(1.0, 0.9, 0.6)    // yellow-orange
  else color.setRGB(1.0, 0.6, 0.4)                   // red/cool
  return color
}

async function buildStarField(): Promise<THREE.Points> {
  const data: [number, number, number, number, number][] = await fetch('/data/stars.json').then(
    (r) => r.json()
  )

  const radius = 900
  const positions = new Float32Array(data.length * 3)
  const colors = new Float32Array(data.length * 3)
  const sizes = new Float32Array(data.length)

  for (let i = 0; i < data.length; i++) {
    const [nx, ny, nz, mag, bv] = data[i]
    positions[i * 3]     = nx * radius
    positions[i * 3 + 1] = ny * radius
    positions[i * 3 + 2] = nz * radius

    const col = bvToColor(bv)
    colors[i * 3]     = col.r
    colors[i * 3 + 1] = col.g
    colors[i * 3 + 2] = col.b

    sizes[i] = Math.max(0.4, 1.8 - mag * 0.25)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

  const mat = new THREE.PointsMaterial({
    vertexColors: true,
    sizeAttenuation: false,
    size: 1.2,
    transparent: true,
    opacity: 0.9,
  })

  return new THREE.Points(geo, mat)
}

const GLOBE_RADIUS = 100
const SCALE = GLOBE_RADIUS / 6371

function ecefToThree(p: { x: number; y: number; z: number }): THREE.Vector3 {
  return new THREE.Vector3(p.x * SCALE, p.z * SCALE, -p.y * SCALE)
}

function makeOrbitLine(
  satrec: unknown,
  steps: number,
  color: number,
  opacity: number
): THREE.Line | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pts = computeOrbitECEF(satrec as any, steps)
  if (pts.length < 2) return null

  const verts = pts.map(ecefToThree)
  // Close the ring
  verts.push(verts[0].clone())

  const geo = new THREE.BufferGeometry().setFromPoints(verts)
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity })
  return new THREE.Line(geo, mat)
}

export function Globe({
  satellites,
  issPosition,
  launches,
  onSelect,
  showAllPaths,
  autoRotate,
  selectedSatellite,
  kpIndex,
}: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null)
  const isHoveringRef = useRef(false)
  const orbitLinesRef = useRef<THREE.Line[]>([])
  const auroraRingsRef = useRef<THREE.Mesh[]>([])
  const auroraAnimRef = useRef<number | null>(null)

  // Init globe once
  useEffect(() => {
    if (!containerRef.current) return

    const globe = new GlobeGL(containerRef.current)
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
      .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
      .backgroundImageUrl('')
      .atmosphereColor('rgba(0, 200, 255, 0.15)')
      .atmosphereAltitude(0.18)
      .width(containerRef.current.offsetWidth)
      .height(containerRef.current.offsetHeight)

    globe.controls().autoRotate = true
    globe.controls().autoRotateSpeed = 0.3
    globe.controls().enableDamping = true
    globe.controls().dampingFactor = 0.1

    globe.scene().background = new THREE.Color(0x000000)

    buildStarField().then((stars) => globe.scene().add(stars))

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

  // Sync autoRotate prop
  useEffect(() => {
    if (!globeRef.current) return
    globeRef.current.controls().autoRotate = autoRotate && !isHoveringRef.current
  }, [autoRotate])

  // Satellites + ISS as 3D objects
  useEffect(() => {
    if (!globeRef.current) return
    const globe = globeRef.current

    const satObjects = satellites.map((s) => ({
      lat: s.lat,
      lng: s.lng,
      alt: altFraction(s.alt),
      data: s,
      kind: 'satellite' as const,
    }))

    const issObjects = issPosition
      ? [{ lat: issPosition.lat, lng: issPosition.lng, alt: altFraction(issPosition.alt), data: issPosition, kind: 'iss' as const }]
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
          ? '<b style="color:#00ffc8;font-family:monospace;font-size:12px">ISS</b>'
          : `<span style="color:#88ddff;font-family:monospace;font-size:11px">${d.data.name}</span>`
      )
      .onObjectHover((d: any) => {
        const hovering = d !== null
        isHoveringRef.current = hovering
        if (globeRef.current) {
          globeRef.current.controls().autoRotate = !hovering && autoRotate
        }
      })
      .onObjectClick((d: any) => {
        if (d.kind === 'satellite') onSelect({ type: 'satellite', data: d.data })
        if (d.kind === 'iss') onSelect({ type: 'iss', data: d.data })
        globeRef.current?.pointOfView({ lat: d.lat, lng: d.lng, altitude: 1.5 }, 800)
      })
  }, [satellites, issPosition, onSelect, autoRotate])

  // Launch sites as surface points
  useEffect(() => {
    if (!globeRef.current) return
    const globe = globeRef.current

    globe
      .pointsData(launches.map((l) => ({ lat: l.pad.lat, lng: l.pad.lng, alt: 0, data: l })))
      .pointLat('lat')
      .pointLng('lng')
      .pointAltitude(0)
      .pointColor(() => 'rgba(255,160,0,0.95)')
      .pointRadius(0.5)
      .pointLabel((d: any) => `<span style="color:#ffa000;font-family:monospace;font-size:11px">${d.data.name}</span>`)
      .onPointHover((d: any) => {
        const hovering = d !== null
        isHoveringRef.current = hovering
        if (globeRef.current) {
          globeRef.current.controls().autoRotate = !hovering && autoRotate
        }
      })
      .onPointClick((d: any) => {
        onSelect({ type: 'launch', data: d.data })
        globeRef.current?.pointOfView({ lat: d.lat, lng: d.lng, altitude: 1.5 }, 800)
      })
  }, [launches, onSelect, autoRotate])

  // Orbit paths as Three.js Lines using ECEF coordinates
  useEffect(() => {
    if (!globeRef.current) return
    const scene = globeRef.current.scene()

    // Remove old lines
    for (const line of orbitLinesRef.current) {
      scene.remove(line)
      line.geometry.dispose()
      ;(line.material as THREE.Material).dispose()
    }
    orbitLinesRef.current = []

    const newLines: THREE.Line[] = []

    if (showAllPaths) {
      for (const sat of satellites) {
        if (!sat.satrec) continue
        const line = makeOrbitLine(sat.satrec, 120, 0x0088ff, 0.35)
        if (line) { scene.add(line); newLines.push(line) }
      }
    }

    if (selectedSatellite?.satrec) {
      const line = makeOrbitLine(selectedSatellite.satrec, 200, 0x00ffdc, 0.95)
      if (line) { scene.add(line); newLines.push(line) }
    }

    orbitLinesRef.current = newLines
  }, [satellites, selectedSatellite, showAllPaths])

  // Aurora rings — appear at poles when Kp >= 5
  useEffect(() => {
    if (!globeRef.current) return
    const scene = globeRef.current.scene()

    // Cleanup previous rings and animation
    if (auroraAnimRef.current !== null) {
      cancelAnimationFrame(auroraAnimRef.current)
      auroraAnimRef.current = null
    }
    for (const ring of auroraRingsRef.current) {
      scene.remove(ring)
      ring.geometry.dispose()
      ;(ring.material as THREE.Material).dispose()
    }
    auroraRingsRef.current = []

    if (kpIndex < 5) return

    const color = kpIndex >= 7 ? 0xff6600 : 0x00ff88
    const opacity = Math.min(0.9, 0.3 + (kpIndex - 5) * 0.15)

    // Polar cap latitude ~75° → y position on globe sphere of radius 100
    const polarY = GLOBE_RADIUS * Math.sin((75 * Math.PI) / 180)
    const ringRadius = GLOBE_RADIUS * Math.cos((75 * Math.PI) / 180)

    const geo = new THREE.TorusGeometry(ringRadius, 0.5, 8, 80)
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide })

    const north = new THREE.Mesh(geo, mat)
    north.rotation.x = Math.PI / 2
    north.position.y = polarY

    const south = north.clone()
    south.position.y = -polarY

    scene.add(north)
    scene.add(south)
    auroraRingsRef.current = [north, south]

    // Slow spin animation
    const animate = () => {
      north.rotation.z += 0.002
      south.rotation.z -= 0.002
      auroraAnimRef.current = requestAnimationFrame(animate)
    }
    auroraAnimRef.current = requestAnimationFrame(animate)
  }, [kpIndex])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
