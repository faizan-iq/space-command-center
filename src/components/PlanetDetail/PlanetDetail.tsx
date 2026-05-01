import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { PlanetBody, MoonBody } from '../../services/horizons'
import { spacecraftForPlanet, type Spacecraft } from '../../services/planetSpacecraft'
import { buildStarField, loadTextureCached } from '../../services/assets'
import type { SelectedObject } from '../../types'

interface PlanetDetailProps {
  planet: PlanetBody
  onSelect: (obj: SelectedObject) => void
  onBack: () => void
}

const PLANET_RADIUS = 50          // scene units for the planet itself
const MOON_DIST_SCALE = 0.0008    // scaled down so moons fit within view
const SPACECRAFT_DIST_SCALE = 0.06 // satellites visually elevated to be visible

function makeOrbitRing(radius: number, color = 0x2a4a6a, opacity = 0.35): THREE.Line {
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= 128; i++) {
    const a = (i / 128) * Math.PI * 2
    pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius))
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts)
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity })
  return new THREE.Line(geo, mat)
}

function makeAtmosphere(radius: number, color: number, opacity: number): THREE.Mesh {
  const geo = new THREE.SphereGeometry(radius * 1.06, 48, 48)
  const mat = new THREE.MeshPhongMaterial({
    color, transparent: true, opacity, side: THREE.FrontSide, depthWrite: false,
  })
  return new THREE.Mesh(geo, mat)
}

export function PlanetDetail({ planet, onSelect, onBack }: PlanetDetailProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const labelContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current
    const w = container.offsetWidth
    const h = container.offsetHeight

    // Determine scale: planet rendered at PLANET_RADIUS units regardless of size.
    const kmPerUnit = planet.radius / PLANET_RADIUS

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000005)

    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 50000)
    camera.position.set(0, PLANET_RADIUS * 0.8, PLANET_RADIUS * 3.5)
    camera.lookAt(0, 0, 0)

    // Sun light — directional, simulating distant sun. Brighter so textures pop.
    const sunLight = new THREE.DirectionalLight(0xfff5e0, 2.4)
    sunLight.position.set(1000, 200, 500)
    scene.add(sunLight)
    // Soft fill so the night side isn't completely black
    scene.add(new THREE.AmbientLight(0x556677, 0.45))

    // Planet appearance tuning — per-planet shininess and emissive hints.
    const matSpec = (() => {
      switch (planet.name) {
        case 'Earth':   return { shininess: 25, specular: 0x224466, emissive: 0x000000, emissiveIntensity: 0 }
        case 'Venus':   return { shininess: 6,  specular: 0x332211, emissive: 0x221100, emissiveIntensity: 0.15 }
        case 'Mars':    return { shininess: 5,  specular: 0x332211, emissive: 0x000000, emissiveIntensity: 0 }
        case 'Mercury': return { shininess: 4,  specular: 0x222222, emissive: 0x000000, emissiveIntensity: 0 }
        case 'Jupiter': return { shininess: 12, specular: 0x554433, emissive: 0x221a10, emissiveIntensity: 0.18 }
        case 'Saturn':  return { shininess: 12, specular: 0x554433, emissive: 0x2a2010, emissiveIntensity: 0.18 }
        case 'Uranus':  return { shininess: 30, specular: 0x88aabb, emissive: 0x081820, emissiveIntensity: 0.20 }
        case 'Neptune': return { shininess: 30, specular: 0x556699, emissive: 0x081428, emissiveIntensity: 0.20 }
        default:        return { shininess: 8,  specular: 0x222222, emissive: 0x000000, emissiveIntensity: 0 }
      }
    })()

    // Planet mesh
    const planetGeo = new THREE.SphereGeometry(PLANET_RADIUS, 128, 128)
    const planetMat = new THREE.MeshPhongMaterial({
      color: planet.color,
      shininess: matSpec.shininess,
      specular: new THREE.Color(matSpec.specular),
      emissive: new THREE.Color(matSpec.emissive),
      emissiveIntensity: matSpec.emissiveIntensity,
    })
    const planetMesh = new THREE.Mesh(planetGeo, planetMat)
    planetMesh.userData = { type: 'planet' }
    scene.add(planetMesh)

    loadTextureCached(planet.textureUrl).then((tex) => {
      if (tex) {
        tex.colorSpace = THREE.SRGBColorSpace
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy()
        planetMat.map = tex
        planetMat.color.set(0xffffff)
        // Use the texture as emissive map too at low intensity, so the night side
        // shows muted surface detail instead of being pitch black.
        if (matSpec.emissiveIntensity > 0) {
          planetMat.emissiveMap = tex
          planetMat.emissive.set(0xffffff)
        }
        planetMat.needsUpdate = true
      }
    })

    // Cloud / atmosphere overlay layer (separate sphere, slightly larger, rotating)
    let cloudMesh: THREE.Mesh | null = null
    const addCloudLayer = (url: string, opacity: number) => {
      const cgeo = new THREE.SphereGeometry(PLANET_RADIUS * 1.012, 96, 96)
      const cmat = new THREE.MeshPhongMaterial({
        transparent: true, opacity, depthWrite: false,
      })
      cloudMesh = new THREE.Mesh(cgeo, cmat)
      planetMesh.add(cloudMesh)
      loadTextureCached(url).then((tex) => {
        if (tex) {
          tex.colorSpace = THREE.SRGBColorSpace
          cmat.map = tex
          cmat.alphaMap = tex
          cmat.needsUpdate = true
        }
      })
    }
    if (planet.name === 'Earth')  addCloudLayer('/textures/planets/2k_earth_clouds.jpg', 0.55)
    if (planet.name === 'Venus')  addCloudLayer('/textures/planets/2k_venus_atmosphere.jpg', 0.65)

    // Outer atmosphere glow (existing)
    if (planet.name === 'Earth') planetMesh.add(makeAtmosphere(PLANET_RADIUS, 0x4488ff, 0.18))
    else if (planet.name === 'Venus') planetMesh.add(makeAtmosphere(PLANET_RADIUS, 0xffddaa, 0.22))
    else if (planet.name === 'Mars') planetMesh.add(makeAtmosphere(PLANET_RADIUS, 0xff7744, 0.10))
    else if (planet.name === 'Jupiter') planetMesh.add(makeAtmosphere(PLANET_RADIUS, 0xffcc88, 0.08))
    else if (planet.name === 'Saturn') planetMesh.add(makeAtmosphere(PLANET_RADIUS, 0xffe0a0, 0.08))
    else if (planet.name === 'Uranus') planetMesh.add(makeAtmosphere(PLANET_RADIUS, 0x88ddee, 0.18))
    else if (planet.name === 'Neptune') planetMesh.add(makeAtmosphere(PLANET_RADIUS, 0x4466cc, 0.18))

    // Saturn rings
    if (planet.ringTexture) {
      loadTextureCached(planet.ringTexture).then((ringTex) => {
        const ringGeo = new THREE.RingGeometry(PLANET_RADIUS * 1.4, PLANET_RADIUS * 2.4, 96)
        const rPos = ringGeo.attributes.position
        const uv = ringGeo.attributes.uv
        const v3 = new THREE.Vector3()
        for (let i = 0; i < rPos.count; i++) {
          v3.fromBufferAttribute(rPos, i)
          uv.setXY(i, v3.length() / (PLANET_RADIUS * 2.4), 0)
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
        planetMesh.add(ring)
      })
    }

    // Moons
    interface MoonEntry { mesh: THREE.Mesh; moon: MoonBody; orbitRadius: number; phase: number; speed: number }
    const moonEntries: MoonEntry[] = []
    if (planet.moons) {
      for (const moon of planet.moons) {
        const mr = Math.max(2, (moon.radius / planet.radius) * PLANET_RADIUS * 0.8)
        const orbitRadius = Math.max(PLANET_RADIUS * 1.8, (moon.orbitRadiusAU * 1.496e8 / kmPerUnit) * MOON_DIST_SCALE)
        const mgeo = new THREE.SphereGeometry(mr, 32, 32)
        const mmat = new THREE.MeshPhongMaterial({ color: moon.color, shininess: 4 })
        const mmesh = new THREE.Mesh(mgeo, mmat)
        mmesh.userData = { type: 'moon', moon, parentPlanetName: planet.name }
        scene.add(mmesh)
        scene.add(makeOrbitRing(orbitRadius, 0x335577, 0.35))
        loadTextureCached(moon.textureUrl).then((tex) => {
          if (tex) {
            tex.colorSpace = THREE.SRGBColorSpace
            mmat.map = tex
            mmat.color.set(0xffffff)
            mmat.needsUpdate = true
          }
        })
        moonEntries.push({
          mesh: mmesh, moon, orbitRadius,
          phase: Math.random() * Math.PI * 2,
          speed: (Math.PI * 2) / (moon.orbitPeriodDays * 60), // arbitrary visual speed
        })
      }
    }

    // Spacecraft
    interface CraftEntry { mesh: THREE.Mesh; craft: Spacecraft; orbitRadius: number; phase: number; speed: number; tilt: number }
    const craftList = spacecraftForPlanet(planet.id)
    const craftEntries: CraftEntry[] = []
    for (let i = 0; i < craftList.length; i++) {
      const craft = craftList[i]
      // Use real altitude scaled, with spacing tweak so multiple crafts are visible
      const altUnits = (craft.orbitAltKm / kmPerUnit)
      const baseRadius = PLANET_RADIUS + Math.max(PLANET_RADIUS * 0.15, altUnits * SPACECRAFT_DIST_SCALE)
      const orbitRadius = baseRadius + i * (PLANET_RADIUS * 0.04) // small fan-out
      const tilt = (craft.inclinationDeg * Math.PI) / 180

      // Orbit ring
      const ring = makeOrbitRing(orbitRadius, craft.color, 0.4)
      ring.rotation.x = tilt
      scene.add(ring)

      // Spacecraft dot — small bright sphere
      const sgeo = new THREE.SphereGeometry(1.6, 12, 12)
      const smat = new THREE.MeshBasicMaterial({ color: craft.color })
      const smesh = new THREE.Mesh(sgeo, smat)
      smesh.userData = { type: 'spacecraft', craft }
      scene.add(smesh)

      // Glow halo
      const haloGeo = new THREE.SphereGeometry(3.2, 12, 12)
      const haloMat = new THREE.MeshBasicMaterial({ color: craft.color, transparent: true, opacity: 0.25 })
      smesh.add(new THREE.Mesh(haloGeo, haloMat))

      craftEntries.push({
        mesh: smesh, craft, orbitRadius,
        phase: Math.random() * Math.PI * 2,
        speed: (Math.PI * 2) / (craft.orbitPeriodMin * 0.5), // visual speed
        tilt,
      })
    }

    // Star field
    buildStarField().then((stars) => scene.add(stars))

    // HTML labels for moons + spacecraft
    interface LabelRef { el: HTMLDivElement; mesh: THREE.Mesh }
    const labelRefs: LabelRef[] = []
    const labelContainer = labelContainerRef.current
    if (labelContainer) {
      for (const entry of moonEntries) {
        const el = document.createElement('div')
        el.textContent = entry.moon.name
        el.className = 'planet-detail-label moon-label'
        labelContainer.appendChild(el)
        labelRefs.push({ el, mesh: entry.mesh })
      }
      for (const entry of craftEntries) {
        const el = document.createElement('div')
        el.textContent = entry.craft.name
        el.className = 'planet-detail-label craft-label'
        labelContainer.appendChild(el)
        labelRefs.push({ el, mesh: entry.mesh })
      }
    }

    // Manual orbit controls
    let isDragging = false
    let prevMouse = { x: 0, y: 0 }
    let dragMoved = false
    const spherical = { theta: 0.5, phi: Math.PI / 2.5, r: PLANET_RADIUS * 4 }
    const updateCamera = () => {
      camera.position.set(
        spherical.r * Math.sin(spherical.phi) * Math.sin(spherical.theta),
        spherical.r * Math.cos(spherical.phi),
        spherical.r * Math.sin(spherical.phi) * Math.cos(spherical.theta)
      )
      camera.lookAt(0, 0, 0)
    }
    updateCamera()

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true; dragMoved = false
      prevMouse = { x: e.clientX, y: e.clientY }
    }
    const onMouseUp = () => { isDragging = false }
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      const dx = e.clientX - prevMouse.x
      const dy = e.clientY - prevMouse.y
      if (Math.abs(dx) + Math.abs(dy) > 3) dragMoved = true
      spherical.theta -= dx * 0.005
      spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, spherical.phi + dy * 0.005))
      prevMouse = { x: e.clientX, y: e.clientY }
      updateCamera()
    }
    const onWheel = (e: WheelEvent) => {
      spherical.r = Math.max(PLANET_RADIUS * 1.2, Math.min(PLANET_RADIUS * 30, spherical.r + e.deltaY * 0.4))
      updateCamera()
    }

    // Click → raycast against spacecraft, moons, planet
    const raycaster = new THREE.Raycaster()
    raycaster.params.Points = { threshold: 2 }
    const ndc = new THREE.Vector2()
    const onClick = (e: MouseEvent) => {
      if (dragMoved) return
      const rect = container.getBoundingClientRect()
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(ndc, camera)

      const targets: THREE.Object3D[] = [planetMesh]
      for (const m of moonEntries) targets.push(m.mesh)
      for (const c of craftEntries) targets.push(c.mesh)
      const hits = raycaster.intersectObjects(targets, false)
      if (hits.length === 0) return

      const obj = hits[0].object
      const ud = obj.userData
      if (ud.type === 'spacecraft') {
        onSelect({ type: 'spacecraft', data: ud.craft as Spacecraft })
      } else if (ud.type === 'moon') {
        onSelect({ type: 'moon', data: { moon: ud.moon as MoonBody, parentPlanetName: ud.parentPlanetName as string } })
      } else if (ud.type === 'planet') {
        onSelect({ type: 'planet', data: { planet, distanceFromSunAU: planet.a } })
      }
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

    // Animation loop
    const tmpV = new THREE.Vector3()
    const camDir = new THREE.Vector3()
    const projectToScreen = (mesh: THREE.Mesh) => {
      tmpV.setFromMatrixPosition(mesh.matrixWorld)
      const offset = tmpV.clone().sub(camera.position)
      camera.getWorldDirection(camDir)
      const behind = offset.dot(camDir) < 0
      tmpV.project(camera)
      const cw = container.offsetWidth
      const ch = container.offsetHeight
      return { x: (tmpV.x * 0.5 + 0.5) * cw, y: (-tmpV.y * 0.5 + 0.5) * ch, behind }
    }

    let rafId = 0
    let lastT = performance.now()
    const animate = () => {
      rafId = requestAnimationFrame(animate)
      const now = performance.now()
      const dt = (now - lastT) / 1000
      lastT = now

      planetMesh.rotation.y += 0.05 * dt
      if (cloudMesh) cloudMesh.rotation.y += 0.018 * dt   // clouds drift slightly faster than surface

      for (const m of moonEntries) {
        m.phase += m.speed * dt
        m.mesh.position.set(Math.cos(m.phase) * m.orbitRadius, 0, Math.sin(m.phase) * m.orbitRadius)
        m.mesh.rotation.y += 0.02 * dt
      }

      for (const c of craftEntries) {
        c.phase += c.speed * dt
        const x = Math.cos(c.phase) * c.orbitRadius
        const z = Math.sin(c.phase) * c.orbitRadius
        // Apply inclination tilt around X axis
        const y = z * Math.sin(c.tilt)
        const z2 = z * Math.cos(c.tilt)
        c.mesh.position.set(x, y, z2)
      }

      renderer.render(scene, camera)

      // Update labels
      if (labelContainer) {
        const cw = container.offsetWidth
        const ch = container.offsetHeight
        for (const { el, mesh } of labelRefs) {
          const { x, y, behind } = projectToScreen(mesh)
          if (behind || x < -50 || x > cw + 50 || y < -50 || y > ch + 50) {
            el.style.display = 'none'
          } else {
            el.style.display = 'block'
            el.style.left = `${x}px`
            el.style.top = `${y + 12}px`
          }
        }
      }
    }
    rafId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafId)
      renderer.domElement.removeEventListener('mousedown', onMouseDown)
      renderer.domElement.removeEventListener('click', onClick)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('mousemove', onMouseMove)
      renderer.domElement.removeEventListener('wheel', onWheel)
      window.removeEventListener('resize', onResize)
      labelRefs.forEach(({ el }) => el.remove())
      renderer.dispose()
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
    }
  }, [planet, onSelect])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={labelContainerRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }} />

      {/* Back button */}
      <button
        onClick={onBack}
        className="hud-btn"
        style={{ position: 'absolute', top: 60, left: 16, zIndex: 5 }}
      >
        ← Solar System
      </button>

      {/* Planet name banner */}
      <div style={{
        position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)',
        fontFamily: 'Rajdhani, sans-serif', fontSize: 22, fontWeight: 700,
        letterSpacing: '0.25em', color: '#00d2ff',
        textShadow: '0 0 10px rgba(0,210,255,0.6)',
        pointerEvents: 'none',
      }}>
        {planet.name.toUpperCase()}
      </div>

      <div style={{
        position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        fontFamily: 'Rajdhani, sans-serif', fontSize: 11, color: 'rgba(0,180,255,0.4)',
        letterSpacing: '0.08em', pointerEvents: 'none',
      }}>
        DRAG TO ORBIT · SCROLL TO ZOOM · CLICK SPACECRAFT FOR DETAILS
      </div>
    </div>
  )
}
