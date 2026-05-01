import * as THREE from 'three'

// ── Stars ────────────────────────────────────────────────────────
// Cache the parsed star catalogue once; every scene reuses the same buffers.

type StarRow = [number, number, number, number, number]  // nx, ny, nz, mag, bv

let starsPromise: Promise<StarRow[]> | null = null

function loadStarRows(): Promise<StarRow[]> {
  if (!starsPromise) {
    starsPromise = fetch('/data/stars.json')
      .then((r) => r.json() as Promise<StarRow[]>)
      .catch(() => [])
  }
  return starsPromise
}

function bvToRGB(bv: number): [number, number, number] {
  if (bv < 0)   return [0.7, 0.8, 1.0]
  if (bv < 0.5) return [1.0, 1.0, 1.0]
  if (bv < 1.0) return [1.0, 0.95, 0.7]
  return [1.0, 0.7, 0.5]
}

/** Build a star-field Points object at the given sky-sphere radius. */
export async function buildStarField(radius = 5000): Promise<THREE.Points> {
  const data = await loadStarRows()
  const positions = new Float32Array(data.length * 3)
  const colors = new Float32Array(data.length * 3)
  for (let i = 0; i < data.length; i++) {
    const [nx, ny, nz, , bv] = data[i]
    positions[i * 3] = nx * radius
    positions[i * 3 + 1] = ny * radius
    positions[i * 3 + 2] = nz * radius
    const [r, g, b] = bvToRGB(bv)
    colors[i * 3] = r
    colors[i * 3 + 1] = g
    colors[i * 3 + 2] = b
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const mat = new THREE.PointsMaterial({
    vertexColors: true, size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.85,
  })
  return new THREE.Points(geo, mat)
}

// ── Textures ─────────────────────────────────────────────────────
// Single shared TextureLoader + an in-memory cache keyed by URL.
// Three.js's default loader doesn't cache parsed textures across calls.

const textureLoader = new THREE.TextureLoader()
const textureCache = new Map<string, Promise<THREE.Texture | null>>()

export function loadTextureCached(url: string): Promise<THREE.Texture | null> {
  let p = textureCache.get(url)
  if (!p) {
    p = new Promise((resolve) => {
      textureLoader.load(
        url,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace
          resolve(tex)
        },
        undefined,
        () => {
          textureCache.delete(url)  // allow retry on failure
          resolve(null)
        },
      )
    })
    textureCache.set(url, p)
  }
  return p
}

// ── Pre-warm ─────────────────────────────────────────────────────
// Kick off background loads so by the time the user navigates, assets
// are already in memory.

const PLANET_TEXTURES = [
  '/textures/planets/2k_mercury.jpg',
  '/textures/planets/2k_venus_surface.jpg',
  '/textures/planets/2k_venus_atmosphere.jpg',
  '/textures/planets/2k_earth_daymap.jpg',
  '/textures/planets/2k_earth_clouds.jpg',
  '/textures/planets/2k_mars.jpg',
  '/textures/planets/2k_jupiter.jpg',
  '/textures/planets/2k_saturn.jpg',
  '/textures/planets/2k_saturn_ring_alpha.png',
  '/textures/planets/2k_uranus.jpg',
  '/textures/planets/2k_neptune.jpg',
  '/textures/planets/2k_moon.jpg',
]

export function prewarmAssets(): void {
  // Stars first — most likely to be needed quickly.
  loadStarRows()
  // Stagger texture loads via requestIdleCallback (or setTimeout fallback)
  // so we don't compete with the initial Globe render.
  const schedule = (cb: () => void) => {
    type RIC = (cb: () => void, opts?: { timeout?: number }) => number
    const ric = (window as unknown as { requestIdleCallback?: RIC }).requestIdleCallback
    if (typeof ric === 'function') ric(cb, { timeout: 2000 })
    else setTimeout(cb, 500)
  }
  schedule(() => {
    for (const url of PLANET_TEXTURES) loadTextureCached(url)
  })
}
