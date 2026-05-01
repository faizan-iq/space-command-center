import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { PLANETS, MOON, computePlanetPositions, type BodyPosition } from '../../services/horizons'

interface SolarSystemProps {
  positions: BodyPosition[]
  loading: boolean
  onSelectPlanet: (planetId: string) => void
}

const AU = 30
const SUN_RADIUS = 3.5
const PLANET_MIN = 3
const PLANET_SCALE = 0.00015

// Deep-space probes hardcoded (can't get from CelesTrak — not Earth orbit)
const PROBES: { planetId: string; name: string; orbitRadiusAU: number; orbitPeriodDays: number; color: number }[] = [
  { planetId: '499', name: 'MRO',        orbitRadiusAU: 0.000021, orbitPeriodDays: 0.062,  color: 0x88ccff },
  { planetId: '499', name: 'MAVEN',      orbitRadiusAU: 0.000045, orbitPeriodDays: 0.167,  color: 0xaaddff },
  { planetId: '499', name: 'ExoMars TGO',orbitRadiusAU: 0.000033, orbitPeriodDays: 0.109,  color: 0x99bbff },
  { planetId: '599', name: 'Juno',       orbitRadiusAU: 0.000280, orbitPeriodDays: 53.5,   color: 0xffddaa },
  { planetId: '699', name: 'Cassini',    orbitRadiusAU: 0.000200, orbitPeriodDays: 16.7,   color: 0xffccaa }, // mission ended 2017 but historically significant
  { planetId: '799', name: 'Voyager 2',  orbitRadiusAU: 0.000180, orbitPeriodDays: 120,    color: 0xccddff },
]

function planetDisplayRadius(km: number): number {
  return Math.max(PLANET_MIN, km * PLANET_SCALE)
}

function auToVec3(x: number, y: number, z: number): THREE.Vector3 {
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

function makeOrbitRing(radiusAU: number, color = 0x1a2a3a, opacity = 0.25): THREE.Line {
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= 128; i++) {
    const a = (i / 128) * Math.PI * 2
    pts.push(new THREE.Vector3(Math.cos(a) * radiusAU * AU, 0, Math.sin(a) * radiusAU * AU))
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts)
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity })
  return new THREE.Line(geo, mat)
}

function makeAtmosphere(radius: number, color: number, opacity: number): THREE.Mesh {
  const geo = new THREE.SphereGeometry(radius * 1.08, 32, 32)
  const mat = new THREE.MeshPhongMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.FrontSide,
    depthWrite: false,
  })
  return new THREE.Mesh(geo, mat)
}

function periodToAU(days: number): number {
  return Math.pow(days / 365.25, 2 / 3)
}

function makeProbeDot(color: number): THREE.Mesh {
  const geo = new THREE.SphereGeometry(0.18, 8, 8)
  const mat = new THREE.MeshBasicMaterial({ color })
  return new THREE.Mesh(geo, mat)
}

export function SolarSystem({ positions, loading, onSelectPlanet }: SolarSystemProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const planetMeshes = useRef<Map<string, THREE.Mesh>>(new Map())
  const probeMeshes = useRef<{ mesh: THREE.Mesh; probe: typeof PROBES[0]; phase: number }[]>([])
  const labelRefs = useRef<{ el: HTMLDivElement; mesh: THREE.Mesh; name: string }[]>([])
  const animFrameRef = useRef<number | null>(null)
  const labelContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current
    const w = container.offsetWidth
    const h = container.offsetHeight

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = false
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000005)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 20000)
    camera.position.set(0, 500, 1200)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    // Sun mesh
    const sunGeo = new THREE.SphereGeometry(SUN_RADIUS, 48, 48)
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffeeaa })
    const sun = new THREE.Mesh(sunGeo, sunMat)
    scene.add(sun)

    // Sun corona glow layers
    for (const [scale, opacity, col] of [[2.2, 0.08, 0xff9900], [3.5, 0.04, 0xff6600], [5.0, 0.02, 0xff4400]] as [number, number, number][]) {
      const glowGeo = new THREE.SphereGeometry(SUN_RADIUS * scale, 32, 32)
      const glowMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity, side: THREE.BackSide })
      scene.add(new THREE.Mesh(glowGeo, glowMat))
    }

    // Sun as primary light source — planets are lit from the sun
    const sunLight = new THREE.PointLight(0xfff5e0, 3.0, 5000, 0.5)
    sunLight.position.set(0, 0, 0)
    scene.add(sunLight)

    // Very dim ambient so the dark sides of planets aren't pitch black
    scene.add(new THREE.AmbientLight(0x111133, 0.15))

    // Orbital guide rings
    for (const p of PLANETS) {
      const r = periodToAU(p.orbitPeriodDays)
      scene.add(makeOrbitRing(r))
    }

    // Star field
    buildStarField().then((stars) => scene.add(stars))

    // Position planets from Keplerian math immediately
    const initialPositions = computePlanetPositions()
    const posMap = new Map(initialPositions.map((p) => [p.id, p]))

    ;(async () => {
      for (const planet of PLANETS) {
        const r = planetDisplayRadius(planet.radius)
        const geo = new THREE.SphereGeometry(r, 48, 48)

        // Use MeshPhongMaterial for nice shading from point light
        const mat = new THREE.MeshPhongMaterial({
          color: planet.color,
          shininess: 8,
          specular: new THREE.Color(0x222222),
        })
        const mesh = new THREE.Mesh(geo, mat)
        mesh.userData = { name: planet.name, isPlanet: true }

        const pos = posMap.get(planet.id)
        if (pos) mesh.position.copy(auToVec3(pos.x, pos.y, pos.z))

        scene.add(mesh)
        planetMeshes.current.set(planet.id, mesh)

        // Load texture
        loadTexture(planet.textureUrl).then((tex) => {
          if (tex) {
            tex.colorSpace = THREE.SRGBColorSpace
            const m = mesh.material as THREE.MeshPhongMaterial
            m.map = tex
            m.color.set(0xffffff)
            m.needsUpdate = true
          }
        })

        // Atmosphere glow for Earth, Venus, Mars
        if (planet.name === 'Earth') {
          mesh.add(makeAtmosphere(r, 0x4488ff, 0.12))
        } else if (planet.name === 'Venus') {
          mesh.add(makeAtmosphere(r, 0xffddaa, 0.15))
        } else if (planet.name === 'Mars') {
          mesh.add(makeAtmosphere(r, 0xff7744, 0.07))
        }

        // Saturn rings
        if (planet.ringTexture) {
          const ringTex = await loadTexture(planet.ringTexture)
          const ringGeo = new THREE.RingGeometry(r * 1.4, r * 2.4, 80)
          const rPos = ringGeo.attributes.position
          const uv = ringGeo.attributes.uv
          const v3 = new THREE.Vector3()
          for (let i = 0; i < rPos.count; i++) {
            v3.fromBufferAttribute(rPos, i)
            uv.setXY(i, v3.length() / (r * 2.4), 0)
          }
          const ringMat = new THREE.MeshBasicMaterial({
            map: ringTex ?? undefined,
            color: ringTex ? undefined : 0xd4c080,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: ringTex ? 1 : 0.55,
          })
          const ring = new THREE.Mesh(ringGeo, ringMat)
          ring.rotation.x = Math.PI / 2.5
          mesh.add(ring)
        }

        // Planet moons
        if (planet.moons) {
          for (const moon of planet.moons) {
            const mr = Math.max(0.4, moon.radius * PLANET_SCALE * 0.8)
            const mgeo = new THREE.SphereGeometry(mr, 20, 20)
            const mmat = new THREE.MeshPhongMaterial({ color: moon.color, shininess: 4 })
            const mmesh = new THREE.Mesh(mgeo, mmat)
            mmesh.userData = { name: moon.name, isMoon: true }
            mesh.add(mmesh)
            planetMeshes.current.set(moon.id, mmesh)
            loadTexture(moon.textureUrl).then((tex) => {
              if (tex) {
                tex.colorSpace = THREE.SRGBColorSpace
                const m = mmesh.material as THREE.MeshPhongMaterial
                m.map = tex
                m.color.set(0xffffff)
                m.needsUpdate = true
              }
            })
          }
        }

        // Deep-space probes for this planet
        const planetProbes = PROBES.filter((pr) => pr.planetId === planet.id)
        for (const probe of planetProbes) {
          const probeMesh = makeProbeDot(probe.color)
          probeMesh.userData = { name: probe.name, isProbe: true }
          mesh.add(probeMesh)
          probeMeshes.current.push({ mesh: probeMesh, probe, phase: Math.random() * Math.PI * 2 })
        }
      }

      // Earth's Moon (special case — has real texture)
      const earthMesh = planetMeshes.current.get('399')
      if (earthMesh) {
        const tex = await loadTexture(MOON.textureUrl)
        const moonR = Math.max(0.4, MOON.radius * PLANET_SCALE * 0.8)
        const mgeo = new THREE.SphereGeometry(moonR, 20, 20)
        const mmat = new THREE.MeshPhongMaterial(
          tex ? { map: tex, shininess: 4 } : { color: MOON.color, shininess: 4 }
        )
        if (tex) tex.colorSpace = THREE.SRGBColorSpace
        const mmesh = new THREE.Mesh(mgeo, mmat)
        mmesh.userData = { name: 'Moon', isMoon: true }
        earthMesh.add(mmesh)
        planetMeshes.current.set('301', mmesh)
      }
    })()

    // HTML planet labels
    const labelContainer = labelContainerRef.current
    if (labelContainer) {
      for (const planet of PLANETS) {
        const el = document.createElement('div')
        el.textContent = planet.name
        el.style.cssText = `
          position:absolute;pointer-events:none;
          font-family:Rajdhani,sans-serif;font-size:11px;font-weight:600;
          color:rgba(160,220,255,0.7);letter-spacing:0.08em;
          text-shadow:0 0 6px rgba(0,180,255,0.5);
          white-space:nowrap;transform:translateX(-50%);
        `
        labelContainer.appendChild(el)
        // We'll position these in the animation loop
        const mesh = planetMeshes.current.get(planet.id)
        if (mesh) labelRefs.current.push({ el, mesh, name: planet.name })
        else {
          // mesh not created yet — queue it
          const interval = setInterval(() => {
            const m = planetMeshes.current.get(planet.id)
            if (m) {
              labelRefs.current.push({ el, mesh: m, name: planet.name })
              clearInterval(interval)
            }
          }, 100)
        }
      }
    }

    // Manual orbit controls
    let isDragging = false
    let prevMouse = { x: 0, y: 0 }
    let spherical = { theta: 0.5, phi: Math.PI / 4, r: 1300 }

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
      spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, spherical.phi + dy * 0.005))
      prevMouse = { x: e.clientX, y: e.clientY }
      updateCamera()
    }
    const onWheel = (e: WheelEvent) => {
      spherical.r = Math.max(20, Math.min(8000, spherical.r + e.deltaY * 0.8))
      updateCamera()
    }

    // Click detection
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    const onClick = (e: MouseEvent) => {
      if (isDragging) return
      const rect = container.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)
      const meshList = [...planetMeshes.current.entries()]
        .filter(([, m]) => !m.userData.isMoon && !m.userData.isProbe)
        .map(([id, m]) => { m.userData.planetId = id; return m })
      const hits = raycaster.intersectObjects(meshList, false)
      if (hits.length > 0) onSelectPlanet(hits[0].object.userData.planetId as string)
    }

    renderer.domElement.addEventListener('mousedown', onMouseDown)
    renderer.domElement.addEventListener('click', onClick)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('mousemove', onMouseMove)
    renderer.domElement.addEventListener('wheel', onWheel, { passive: true })

    const onResize = () => {
      const w2 = container.offsetWidth
      const h2 = container.offsetHeight
      camera.aspect = w2 / h2
      camera.updateProjectionMatrix()
      renderer.setSize(w2, h2)
    }
    window.addEventListener('resize', onResize)

    // Reusable projected position helper
    const tmpV = new THREE.Vector3()
    const projectToScreen = (mesh: THREE.Mesh): { x: number; y: number; behindCamera: boolean } => {
      tmpV.setFromMatrixPosition(mesh.matrixWorld)
      const dir = tmpV.clone().sub(camera.position)
      const behindCamera = dir.dot(camera.getWorldDirection(new THREE.Vector3())) < 0
      tmpV.project(camera)
      const cw = container.offsetWidth
      const ch = container.offsetHeight
      return {
        x: (tmpV.x * 0.5 + 0.5) * cw,
        y: (-tmpV.y * 0.5 + 0.5) * ch,
        behindCamera,
      }
    }

    let t = 0
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate)
      t += 0.001

      // Animate moons
      for (const planet of PLANETS) {
        const pmesh = planetMeshes.current.get(planet.id)
        if (!pmesh || !planet.moons) continue
        for (const moon of planet.moons) {
          const mmesh = planetMeshes.current.get(moon.id)
          if (!mmesh) continue
          const a = t * (365.25 / moon.orbitPeriodDays) * 0.5
          const planetR = planetDisplayRadius(planet.radius)
          const moonDist = Math.max(planetR * 2.5, moon.orbitRadiusAU * AU * 80)
          mmesh.position.set(Math.cos(a) * moonDist, 0, Math.sin(a) * moonDist)
        }
      }

      // Earth's Moon
      const earthMesh = planetMeshes.current.get('399')
      const moonMesh = planetMeshes.current.get('301')
      if (earthMesh && moonMesh) {
        const a = t * (365.25 / MOON.orbitPeriodDays) * 0.5
        const earthR = planetDisplayRadius(6371)
        const moonDist = Math.max(earthR * 3, MOON.orbitRadiusAU * AU * 80)
        moonMesh.position.set(Math.cos(a) * moonDist, 0, Math.sin(a) * moonDist)
      }

      // Deep-space probes orbit their parent planet
      for (const entry of probeMeshes.current) {
        const { mesh: probeMesh, probe } = entry
        const speed = (Math.PI * 2) / (probe.orbitPeriodDays * 86.4) // rough scaled speed
        entry.phase += speed * 0.016
        const parentPlanet = PLANETS.find(p => p.id === probe.planetId)!
        const pR = planetDisplayRadius(parentPlanet.radius)
        const dist = Math.max(pR * 1.8, probe.orbitRadiusAU * AU * 200)
        probeMesh.position.set(Math.cos(entry.phase) * dist, Math.sin(entry.phase * 0.3) * dist * 0.2, Math.sin(entry.phase) * dist)
      }

      // Slow self-rotation
      for (const mesh of planetMeshes.current.values()) {
        if (!mesh.userData.isMoon) mesh.rotation.y += 0.003
      }

      renderer.render(scene, camera)

      // Update HTML labels
      if (labelContainer) {
        const cw = container.offsetWidth
        const ch = container.offsetHeight
        for (const { el, mesh } of labelRefs.current) {
          const { x, y, behindCamera } = projectToScreen(mesh)
          if (behindCamera || x < -20 || x > cw + 20 || y < -20 || y > ch + 20) {
            el.style.display = 'none'
          } else {
            el.style.display = 'block'
            el.style.left = `${x}px`
            el.style.top = `${y + 14}px`
          }
        }
      }
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
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
      labelRefs.current.forEach(({ el }) => el.remove())
      labelRefs.current = []
      probeMeshes.current = []
    }
  }, [onSelectPlanet])

  // Update planet positions when Keplerian data refreshes
  useEffect(() => {
    if (!sceneRef.current || positions.length === 0) return
    for (const pos of positions) {
      const mesh = planetMeshes.current.get(pos.id)
      if (!mesh) continue
      mesh.position.copy(auToVec3(pos.x, pos.y, pos.z))
    }
  }, [positions])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={labelContainerRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }} />
      {loading && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          fontFamily: 'Rajdhani, sans-serif', color: 'rgba(0,210,255,0.7)', fontSize: 14, letterSpacing: '0.1em',
        }}>
          COMPUTING EPHEMERIS...
        </div>
      )}
      <div style={{
        position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        fontFamily: 'Rajdhani, sans-serif', fontSize: 11, color: 'rgba(0,180,255,0.4)',
        letterSpacing: '0.08em', pointerEvents: 'none',
      }}>
        DRAG TO ORBIT · SCROLL TO ZOOM · CLICK PLANET FOR DETAILS
      </div>
    </div>
  )
}
