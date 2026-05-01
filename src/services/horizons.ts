export interface PlanetBody {
  id: string
  name: string
  radius: number
  color: number
  textureUrl: string
  orbitPeriodDays: number
  ringTexture?: string
  moons?: MoonBody[]
  // J2000 Keplerian elements
  a: number     // semi-major axis (AU)
  e: number     // eccentricity
  I: number     // inclination (deg)
  L0: number    // mean longitude at J2000 (deg)
  Ld: number    // mean longitude rate (deg/Julian century)
  wbar: number  // longitude of perihelion (deg)
  Omega: number // longitude of ascending node (deg)
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

const TEX = '/textures/planets'

export const PLANETS: PlanetBody[] = [
  {
    id: '199', name: 'Mercury', radius: 2439.7, color: 0xb5b5b5,
    textureUrl: `${TEX}/2k_mercury.jpg`, orbitPeriodDays: 87.97,
    a: 0.38710, e: 0.20563, I: 7.005,  L0: 252.251, Ld: 149472.674, wbar: 77.456,  Omega: 48.330,
  },
  {
    id: '299', name: 'Venus', radius: 6051.8, color: 0xe8cda0,
    textureUrl: `${TEX}/2k_venus_surface.jpg`, orbitPeriodDays: 224.7,
    a: 0.72333, e: 0.00677, I: 3.395,  L0: 181.980, Ld: 58517.816,  wbar: 131.564, Omega: 76.680,
  },
  {
    id: '399', name: 'Earth', radius: 6371, color: 0x2277cc,
    textureUrl: '//unpkg.com/three-globe/example/img/earth-night.jpg', orbitPeriodDays: 365.25,
    a: 1.00000, e: 0.01671, I: 0.000,  L0: 100.465, Ld: 35999.373,  wbar: 102.947, Omega: 0.000,
  },
  {
    id: '499', name: 'Mars', radius: 3389.5, color: 0xc1440e,
    textureUrl: `${TEX}/2k_mars.jpg`, orbitPeriodDays: 686.97,
    a: 1.52366, e: 0.09341, I: 1.850,  L0: 355.453, Ld: 19140.299,  wbar: 336.060, Omega: 49.558,
    moons: [
      { id: 'phobos', name: 'Phobos', radius: 11.3, color: 0x888888, textureUrl: `${TEX}/2k_moon.jpg`, orbitRadiusAU: 0.0000627, orbitPeriodDays: 0.319 },
    ],
  },
  {
    id: '599', name: 'Jupiter', radius: 71492, color: 0xc88b3a,
    textureUrl: `${TEX}/2k_jupiter.jpg`, orbitPeriodDays: 4332.59,
    a: 5.20336, e: 0.04839, I: 1.303,  L0: 34.396,  Ld: 3034.906,   wbar: 14.331,  Omega: 100.464,
    moons: [
      { id: '501', name: 'Io',       radius: 1821.6, color: 0xd4b96a, textureUrl: `${TEX}/2k_moon.jpg`, orbitRadiusAU: 0.002819, orbitPeriodDays: 1.769 },
      { id: '502', name: 'Europa',   radius: 1560.8, color: 0xc8b89a, textureUrl: `${TEX}/2k_moon.jpg`, orbitRadiusAU: 0.004485, orbitPeriodDays: 3.551 },
      { id: '503', name: 'Ganymede', radius: 2634.1, color: 0x8a8a8a, textureUrl: `${TEX}/2k_moon.jpg`, orbitRadiusAU: 0.007155, orbitPeriodDays: 7.155 },
      { id: '504', name: 'Callisto', radius: 2410.3, color: 0x706050, textureUrl: `${TEX}/2k_moon.jpg`, orbitRadiusAU: 0.012585, orbitPeriodDays: 16.69 },
    ],
  },
  {
    id: '699', name: 'Saturn', radius: 58232, color: 0xe4d191,
    textureUrl: `${TEX}/2k_saturn.jpg`, orbitPeriodDays: 10759.22,
    ringTexture: `${TEX}/2k_saturn_ring_alpha.png`,
    a: 9.53707, e: 0.05415, I: 2.485,  L0: 50.077,  Ld: 1222.114,   wbar: 93.057,  Omega: 113.666,
    moons: [
      { id: '606', name: 'Titan', radius: 2574.7, color: 0xd4a43c, textureUrl: `${TEX}/2k_moon.jpg`, orbitRadiusAU: 0.008168, orbitPeriodDays: 15.945 },
    ],
  },
  {
    id: '799', name: 'Uranus', radius: 25362, color: 0x7de8e8,
    textureUrl: `${TEX}/2k_uranus.jpg`, orbitPeriodDays: 30688.5,
    a: 19.1913, e: 0.04717, I: 0.772,  L0: 314.055, Ld: 428.497,    wbar: 173.005, Omega: 74.006,
  },
  {
    id: '899', name: 'Neptune', radius: 24622, color: 0x3f54ba,
    textureUrl: `${TEX}/2k_neptune.jpg`, orbitPeriodDays: 60182,
    a: 30.0690, e: 0.00859, I: 1.770,  L0: 304.349, Ld: 218.457,    wbar: 48.124,  Omega: 131.784,
    moons: [
      { id: '801', name: 'Triton', radius: 1353.4, color: 0xa0b0c0, textureUrl: `${TEX}/2k_moon.jpg`, orbitRadiusAU: 0.002371, orbitPeriodDays: 5.877 },
    ],
  },
]

export const MOON: MoonBody = {
  id: '301', name: 'Moon', radius: 1737.4, color: 0xaaaaaa,
  textureUrl: `${TEX}/2k_moon.jpg`, orbitRadiusAU: 0.00257, orbitPeriodDays: 27.32,
}

function toRad(deg: number): number { return deg * Math.PI / 180 }

function solveKepler(M: number, e: number): number {
  let E = M
  for (let i = 0; i < 10; i++) {
    E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E))
  }
  return E
}

// Compute current heliocentric ecliptic positions from Keplerian elements.
// No network required — purely mathematical, always correct.
export function computePlanetPositions(): BodyPosition[] {
  const JD = 2440587.5 + Date.now() / 86400000
  const T = (JD - 2451545.0) / 36525  // Julian centuries from J2000

  return PLANETS.map((p) => {
    const L = ((p.L0 + p.Ld * T) % 360 + 360) % 360
    const M = toRad(((L - p.wbar) % 360 + 360) % 360)
    const E = solveKepler(M, p.e)

    const nu = 2 * Math.atan2(
      Math.sqrt(1 + p.e) * Math.sin(E / 2),
      Math.sqrt(1 - p.e) * Math.cos(E / 2)
    )
    const r = p.a * (1 - p.e * Math.cos(E))
    const omega = toRad(p.wbar - p.Omega)
    const u = nu + omega
    const O = toRad(p.Omega)
    const I = toRad(p.I)

    const x = r * (Math.cos(O) * Math.cos(u) - Math.sin(O) * Math.sin(u) * Math.cos(I))
    const y = r * (Math.sin(O) * Math.cos(u) + Math.cos(O) * Math.sin(u) * Math.cos(I))
    const z = r * Math.sin(u) * Math.sin(I)

    return { id: p.id, name: p.name, x, y, z }
  })
}
