import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { PLANETS, MOON, type BodyPosition } from '../../services/horizons'

interface SolarSystemProps {
  positions: BodyPosition[]
  loading: boolean
  onSelectPlanet: (name: string) => void
}

// Scale: 1 AU = 120 Three.js units
const AU = 120

// Planet sizes are exaggerated massively — real sizes would be invisible
const SUN_RADIUS = 6
const PLANET_MIN = 1.2
const PLANET_SCALE = 0.00008  // relative to real km radius

function planetDisplayRadius(km: number): number {
  return Math.max(PLANET_MIN, km * PLANET_SCALE)
}

function auToVec3(x: number, y: number, z: number): THREE.Vector3 {
  // Horizons uses ecliptic J2000 — map X→X, Y→Z, Z→Y for Three.js up=Y
  return new THREE.Vector3(x * AU, z * AU, -y * AU)
}

async function loadTexture(url: string): Promise<THREE.Texture | null> {
  return new Promise((resolve) => {
    new THREE.TextureLoader().load(url, resolve, undefined, () => resolve(null))
  })
}

async function buildStarField(): Promise<THREE.Points> {
  const data: [number, number, number, number, number][] = await fetch('/data/stars.json').then((r) => r.json())
  const radius = 5000
  const positions = new Float32Array(data.length * 3)
  const colors = new Float32Array(data.length * 3)

  for (let i = 0; i < data.length; i++) {
    const [nx, ny, nz, , bv] = data[i]
    positions[i * 3] = nx * radius
    positions[i * 3 + 1] = ny * radius
    positions[i * 3 + 2] = nz * radius

    const c = new THREE.Color()
    if (bv < 0) c.setRGB(0.7, 0.8, 1.0)
    else if (bv < 0.5) c.setRGB(1.0, 1.0, 1.0)
    else if (bv < 1.0) c.setRGB(1.0, 0.95, 0.7)
    else c.setRGB(1.0, 0.7, 0.5)
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const mat = new THREE.PointsMaterial({ vertexColors: true, size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.85 })
  return new THREE.Points(geo, mat)
}

function makeOrbitRing(radiusAU: number, color = 0x334455, opacity = 0.3): THREE.Line {
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= 128; i++) {
    const a = (i / 128) * Math.PI * 2
    pts.push(new THREE.Vector3(Math.cos(a) * radiusAU * AU, 0, Math.sin(a) * radiusAU * AU))
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts)
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity })
  return new THREE.Line(geo, mat)
}

// Approximate orbital radius in AU from period (Kepler's third law, circular orbit)
function periodToAU(days: number): number {
  return Math.pow(days / 365.25, 2 / 3)
}

export function SolarSystem({ positions, loading, onSelectPlanet }: SolarSystemProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const planetMeshes = useRef<Map<string, THREE.Mesh>>(new Map())
  const animFrameRef = useRef<number | null>(null)
  const hoveredPlanet: string | null = null

  // Init scene once
  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current
    const w = container.offsetWidth
    const h = container.offsetHeight

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = false
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 20000)
    camera.position.set(0, 400, 600)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    // Sun
    const sunGeo = new THREE.SphereGeometry(SUN_RADIUS, 32, 32)
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 })
    const sun = new THREE.Mesh(sunGeo, sunMat)
    scene.add(sun)

    // Sun glow
    const glowGeo = new THREE.SphereGeometry(SUN_RADIUS * 1.6, 32, 32)
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.12, side: THREE.BackSide })
    scene.add(new THREE.Mesh(glowGeo, glowMat))

    // Sun point light
    scene.add(new THREE.PointLight(0xffffff, 2.5, 3000))
    scene.add(new THREE.AmbientLight(0x111122, 0.6))

    // Orbital guide rings (static, estimated from Kepler)
    for (const p of PLANETS) {
      const r = periodToAU(p.orbitPeriodDays)
      scene.add(makeOrbitRing(r))
    }

    // Star field
    buildStarField().then((stars) => scene.add(stars))

    // Build planet meshes (textured async, plain color first)
    ;(async () => {
      for (const planet of PLANETS) {
        const r = planetDisplayRadius(planet.radius)
        const geo = new THREE.SphereGeometry(r, 32, 32)
        const tex = await loadTexture(planet.textureUrl)
        const mat = new THREE.MeshStandardMaterial(
          tex ? { map: tex } : { color: planet.color }
        )
        const mesh = new THREE.Mesh(geo, mat)
        mesh.userData = { name: planet.name }
        scene.add(mesh)
        planetMeshes.current.set(planet.id, mesh)

        // Saturn rings
        if (planet.ringTexture) {
          const ringTex = await loadTexture(planet.ringTexture)
          const ringGeo = new THREE.RingGeometry(r * 1.4, r * 2.4, 64)
          // UV remap for ring texture
          const pos = ringGeo.attributes.position
          const uv = ringGeo.attributes.uv
          const v3 = new THREE.Vector3()
          for (let i = 0; i < pos.count; i++) {
            v3.fromBufferAttribute(pos, i)
            uv.setXY(i, v3.length() / (r * 2.4), 0)
          }
          const ringMat = new THREE.MeshBasicMaterial({
            map: ringTex ?? undefined,
            color: ringTex ? undefined : 0xd4c080,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: ringTex ? 1 : 0.6,
          })
          const ring = new THREE.Mesh(ringGeo, ringMat)
          ring.rotation.x = Math.PI / 2.5
          mesh.add(ring)
        }

        // Moon(s) — render as small spheres in orbit around planet
        if (planet.moons) {
          for (const moon of planet.moons) {
            const mr = Math.max(0.3, moon.radius * PLANET_SCALE * 0.7)
            const mgeo = new THREE.SphereGeometry(mr, 16, 16)
            const mmat = new THREE.MeshStandardMaterial({ color: moon.color })
            const mmesh = new THREE.Mesh(mgeo, mmat)
            mmesh.userData = { name: moon.name, isMoon: true }
            mesh.add(mmesh) // child of planet — position updated in animation loop
            planetMeshes.current.set(moon.id, mmesh)
          }
        }
      }

      // Earth's Moon
      const moonR = Math.max(0.3, MOON.radius * PLANET_SCALE * 0.7)
      const earthMesh = planetMeshes.current.get('399')
      if (earthMesh) {
        const tex = await loadTexture(MOON.textureUrl)
        const mgeo = new THREE.SphereGeometry(moonR, 16, 16)
        const mmat = new THREE.MeshStandardMaterial(tex ? { map: tex } : { color: MOON.color })
        const mmesh = new THREE.Mesh(mgeo, mmat)
        mmesh.userData = { name: 'Moon', isMoon: true }
        earthMesh.add(mmesh)
        planetMeshes.current.set('301', mmesh)
      }
    })()

    // Orbit controls (manual implementation — no import needed)
    let isDragging = false
    let prevMouse = { x: 0, y: 0 }
    let spherical = { theta: 0.5, phi: Math.PI / 4, r: 700 }

    const updateCamera = () => {
      camera.position.set(
        spherical.r * Math.sin(spherical.phi) * Math.sin(spherical.theta),
        spherical.r * Math.cos(spherical.phi),
        spherical.r * Math.sin(spherical.phi) * Math.cos(spherical.theta)
      )
      camera.lookAt(0, 0, 0)
    }
    updateCamera()

    const onMouseDown = (e: MouseEvent) => { isDragging = true; prevMouse = { x: e.clientX, y: e.clientY } }
    const onMouseUp = () => { isDragging = false }
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      const dx = e.clientX - prevMouse.x
      const dy = e.clientY - prevMouse.y
      spherical.theta -= dx * 0.005
      spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi + dy * 0.005))
      prevMouse = { x: e.clientX, y: e.clientY }
      updateCamera()
    }
    const onWheel = (e: WheelEvent) => {
      spherical.r = Math.max(50, Math.min(4000, spherical.r + e.deltaY * 0.5))
      updateCamera()
    }

    // Click detection
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    const onClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)
      const meshList = [...planetMeshes.current.values()].filter(m => !m.userData.isMoon)
      const hits = raycaster.intersectObjects(meshList, false)
      if (hits.length > 0) onSelectPlanet(hits[0].object.userData.name)
    }

    renderer.domElement.addEventListener('mousedown', onMouseDown)
    renderer.domElement.addEventListener('click', onClick)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('mousemove', onMouseMove)
    renderer.domElement.addEventListener('wheel', onWheel, { passive: true })

    // Resize
    const onResize = () => {
      const w2 = container.offsetWidth
      const h2 = container.offsetHeight
      camera.aspect = w2 / h2
      camera.updateProjectionMatrix()
      renderer.setSize(w2, h2)
    }
    window.addEventListener('resize', onResize)

    // Animate
    let t = 0
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate)
      t += 0.001

      // Animate moons around their planets
      for (const planet of PLANETS) {
        const pmesh = planetMeshes.current.get(planet.id)
        if (!pmesh || !planet.moons) continue
        for (const moon of planet.moons) {
          const mmesh = planetMeshes.current.get(moon.id)
          if (!mmesh) continue
          const a = t * (365.25 / moon.orbitPeriodDays) * 0.5
          const moonDist = moon.orbitRadiusAU * AU * 12 // exaggerate orbit radius
          mmesh.position.set(Math.cos(a) * moonDist, 0, Math.sin(a) * moonDist)
        }
      }

      // Earth's moon
      const earthMesh = planetMeshes.current.get('399')
      const moonMesh = planetMeshes.current.get('301')
      if (earthMesh && moonMesh) {
        const a = t * (365.25 / MOON.orbitPeriodDays) * 0.5
        const moonDist = MOON.orbitRadiusAU * AU * 12
        moonMesh.position.set(Math.cos(a) * moonDist, 0, Math.sin(a) * moonDist)
      }

      // Slow planet self-rotation
      for (const mesh of planetMeshes.current.values()) {
        mesh.rotation.y += 0.002
      }

      renderer.render(scene, camera)
    }
    animFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current)
      renderer.domElement.removeEventListener('mousedown', onMouseDown)
      renderer.domElement.removeEventListener('click', onClick)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('mousemove', onMouseMove)
      renderer.domElement.removeEventListener('wheel', onWheel)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [onSelectPlanet])

  // Update planet positions when Horizons data arrives
  useEffect(() => {
    if (!sceneRef.current || positions.length === 0) return
    for (const pos of positions) {
      const mesh = planetMeshes.current.get(pos.id)
      if (!mesh) continue
      const v = auToVec3(pos.x, pos.y, pos.z)
      mesh.position.copy(v)
    }
  }, [positions])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      {loading && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          fontFamily: 'Rajdhani, sans-serif', color: 'rgba(0,210,255,0.7)', fontSize: 14, letterSpacing: '0.1em',
        }}>
          FETCHING EPHEMERIS DATA...
        </div>
      )}
      {hoveredPlanet && (
        <div style={{
          position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          fontFamily: 'Rajdhani, sans-serif', color: '#00d2ff', fontSize: 13,
        }}>
          {hoveredPlanet}
        </div>
      )}
    </div>
  )
}
