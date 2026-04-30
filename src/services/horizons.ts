export interface PlanetBody {
  id: string
  name: string
  radius: number      // km, real radius
  color: number       // fallback THREE color
  textureUrl: string
  orbitPeriodDays: number
  ringTexture?: string
  moons?: MoonBody[]
}

export interface MoonBody {
  id: string
  name: string
  radius: number
  color: number
  textureUrl: string
  orbitRadiusAU: number
  orbitPeriodDays: number
}

export interface BodyPosition {
  id: string
  name: string
  x: number  // AU
  y: number  // AU
  z: number  // AU
}

const BASE = 'https://ssd.jpl.nasa.gov/api/horizons.api'
const TEX = 'https://www.solarsystemscope.com/textures/download'

// Static planet metadata — positions fetched from Horizons at runtime
export const PLANETS: PlanetBody[] = [
  { id: '199', name: 'Mercury', radius: 2439.7,  color: 0xb5b5b5, textureUrl: `${TEX}/2k_mercury.jpg`,         orbitPeriodDays: 87.97 },
  { id: '299', name: 'Venus',   radius: 6051.8,  color: 0xe8cda0, textureUrl: `${TEX}/2k_venus_surface.jpg`,   orbitPeriodDays: 224.7 },
  { id: '399', name: 'Earth',   radius: 6371,    color: 0x2277cc, textureUrl: '//unpkg.com/three-globe/example/img/earth-night.jpg', orbitPeriodDays: 365.25 },
  { id: '499', name: 'Mars',    radius: 3389.5,  color: 0xc1440e, textureUrl: `${TEX}/2k_mars.jpg`,            orbitPeriodDays: 686.97 },
  { id: '599', name: 'Jupiter', radius: 71492,   color: 0xc88b3a, textureUrl: `${TEX}/2k_jupiter.jpg`,         orbitPeriodDays: 4332.59,
    moons: [
      { id: '501', name: 'Io',       radius: 1821.6, color: 0xd4b96a, textureUrl: `${TEX}/2k_moon.jpg`, orbitRadiusAU: 0.002819, orbitPeriodDays: 1.769 },
      { id: '502', name: 'Europa',   radius: 1560.8, color: 0xc8b89a, textureUrl: `${TEX}/2k_moon.jpg`, orbitRadiusAU: 0.004485, orbitPeriodDays: 3.551 },
      { id: '503', name: 'Ganymede', radius: 2634.1, color: 0x8a8a8a, textureUrl: `${TEX}/2k_moon.jpg`, orbitRadiusAU: 0.007155, orbitPeriodDays: 7.155 },
      { id: '504', name: 'Callisto', radius: 2410.3, color: 0x706050, textureUrl: `${TEX}/2k_moon.jpg`, orbitRadiusAU: 0.012585, orbitPeriodDays: 16.69 },
    ],
  },
  { id: '699', name: 'Saturn',  radius: 58232,   color: 0xe4d191, textureUrl: `${TEX}/2k_saturn.jpg`,          orbitPeriodDays: 10759.22,
    ringTexture: `${TEX}/2k_saturn_ring_alpha.png`,
    moons: [
      { id: '606', name: 'Titan',    radius: 2574.7, color: 0xd4a43c, textureUrl: `${TEX}/2k_moon.jpg`, orbitRadiusAU: 0.008168, orbitPeriodDays: 15.945 },
    ],
  },
  { id: '799', name: 'Uranus',  radius: 25362,   color: 0x7de8e8, textureUrl: `${TEX}/2k_uranus.jpg`,          orbitPeriodDays: 30688.5 },
  { id: '899', name: 'Neptune', radius: 24622,   color: 0x3f54ba, textureUrl: `${TEX}/2k_neptune.jpg`,         orbitPeriodDays: 60182,
    moons: [
      { id: '801', name: 'Triton', radius: 1353.4, color: 0xa0b0c0, textureUrl: `${TEX}/2k_moon.jpg`, orbitRadiusAU: 0.002371, orbitPeriodDays: 5.877 },
    ],
  },
]

export const MOON: MoonBody = {
  id: '301', name: 'Moon', radius: 1737.4, color: 0xaaaaaa,
  textureUrl: `${TEX}/2k_moon.jpg`, orbitRadiusAU: 0.00257, orbitPeriodDays: 27.32,
}

function horizonsUrl(id: string): string {
  const now = new Date()
  const start = now.toISOString().slice(0, 16).replace('T', ' ')
  const stop = new Date(now.getTime() + 60000).toISOString().slice(0, 16).replace('T', ' ')
  const params = new URLSearchParams({
    format: 'json',
    COMMAND: `'${id}'`,
    OBJ_DATA: 'NO',
    MAKE_EPHEM: 'YES',
    EPHEM_TYPE: 'VECTORS',
    CENTER: '500@0',
    START_TIME: `'${start}'`,
    STOP_TIME: `'${stop}'`,
    STEP_SIZE: '1m',
    OUT_UNITS: 'AU-D',
    VEC_TABLE: '2',
    VEC_LABELS: 'NO',
    CSV_FORMAT: 'YES',
  })
  return `${BASE}?${params}`
}

function parsePosition(resultText: string): { x: number; y: number; z: number } | null {
  // CSV vector output: $$SOE ... X, Y, Z, ... $$EOE
  const soe = resultText.indexOf('$$SOE')
  const eoe = resultText.indexOf('$$EOE')
  if (soe === -1 || eoe === -1) return null
  const block = resultText.slice(soe + 5, eoe).trim()
  const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return null
  // Line 0: JDTDB, CalDate  Line 1: X, Y, Z, VX, VY, VZ
  const vals = lines[1].split(',').map((v) => parseFloat(v.trim()))
  if (vals.length < 3 || vals.some(isNaN)) return null
  return { x: vals[0], y: vals[1], z: vals[2] }
}

export async function fetchPlanetPositions(): Promise<BodyPosition[]> {
  const ids = PLANETS.map((p) => p.id)
  const results = await Promise.allSettled(ids.map(async (id) => {
    const res = await fetch(horizonsUrl(id))
    const json = await res.json()
    const pos = parsePosition(json.result ?? '')
    const planet = PLANETS.find((p) => p.id === id)!
    if (!pos) return null
    return { id, name: planet.name, ...pos } as BodyPosition
  }))

  return results
    .filter((r): r is PromiseFulfilledResult<BodyPosition | null> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter((v): v is BodyPosition => v !== null)
}
