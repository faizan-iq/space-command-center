import * as satellite from 'satellite.js'
import type { SatellitePosition } from '../types'

const TLE_URL =
  'https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=tle'

interface TLERecord {
  name: string
  satrec: satellite.SatRec
  objectType: string
}

let cachedTLEs: TLERecord[] = []

function inferObjectType(name: string): string {
  const n = name.toUpperCase()
  if (n.includes('DEB') || n.includes('DEBRIS')) return 'DEBRIS'
  if (n.includes('R/B') || n.includes('ROCKET')) return 'ROCKET BODY'
  return 'PAYLOAD'
}

export function inferPurpose(name: string): string {
  const n = name.toUpperCase()
  if (n.includes('STARLINK')) return 'SpaceX Starlink — Internet constellation'
  if (n.includes('ONEWEB')) return 'OneWeb — Broadband internet constellation'
  if (n.includes('IRIDIUM')) return 'Iridium — Satellite communications & IoT'
  if (n.includes('NOAA')) return 'NOAA — Weather & environmental monitoring'
  if (n.includes('GOES')) return 'NOAA GOES — Geostationary weather satellite'
  if (n.includes('GPS')) return 'GPS — US navigation constellation'
  if (n.includes('GLONASS')) return 'GLONASS — Russian navigation constellation'
  if (n.includes('GALILEO')) return 'Galileo — EU navigation constellation'
  if (n.includes('BEIDOU') || n.includes('BDS')) return 'BeiDou — Chinese navigation constellation'
  if (n.includes('HUBBLE')) return 'Hubble Space Telescope — Astronomy observatory'
  if (n.includes('TERRA') || n.includes('AQUA')) return 'NASA Earth Observation — Climate & environment'
  if (n.includes('LANDSAT')) return 'USGS Landsat — Earth surface imaging'
  if (n.includes('SENTINEL')) return 'ESA Sentinel — Earth observation'
  if (n.includes('ISS') || n.includes('ZARYA')) return 'International Space Station'
  if (n.includes('COSMOS')) return 'Russian government satellite'
  if (n.includes('RESURS')) return 'Russian Earth observation'
  if (n.includes('YAOGAN')) return 'Chinese reconnaissance satellite'
  if (n.includes('DEB') || n.includes('DEBRIS')) return 'Space debris'
  if (n.includes('R/B')) return 'Spent rocket stage'
  return 'Purpose unknown'
}

export async function fetchTLEs(): Promise<TLERecord[]> {
  const res = await fetch(TLE_URL)
  const text = await res.text()
  const lines = text.trim().split('\n').map((l) => l.trim())

  const records: TLERecord[] = []
  for (let i = 0; i < lines.length - 2; i += 3) {
    const name = lines[i]
    const line1 = lines[i + 1]
    const line2 = lines[i + 2]
    if (!line1?.startsWith('1') || !line2?.startsWith('2')) continue

    const satrec = satellite.twoline2satrec(line1, line2)
    records.push({ name, satrec, objectType: inferObjectType(name) })
  }

  cachedTLEs = records
  return records
}

export function propagateSatellites(tles: TLERecord[]): SatellitePosition[] {
  const now = new Date()
  const results: SatellitePosition[] = []

  for (const { name, satrec, objectType } of tles) {
    const posVel = satellite.propagate(satrec, now)
    const pos = posVel.position
    const vel = posVel.velocity
    if (!pos || typeof pos === 'boolean') continue

    const gmst = satellite.gstime(now)
    const geo = satellite.eciToGeodetic(pos, gmst)

    const lat = satellite.degreesLat(geo.latitude)
    const lng = satellite.degreesLong(geo.longitude)
    const alt = geo.height

    if (isNaN(lat) || isNaN(lng) || isNaN(alt)) continue

    let velocity: number | undefined
    if (vel && typeof vel !== 'boolean') {
      velocity = Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2)
    }

    results.push({ name, lat, lng, alt, velocity, satrec, objectType, purpose: inferPurpose(name) })
  }

  return results
}

export function getCachedTLEs(): TLERecord[] {
  return cachedTLEs
}

// Compute one full orbit as ECEF coordinates (km).
// Caller maps to Three.js: new THREE.Vector3(x, z, -y) * (100 / 6371)
export function computeOrbitECEF(
  satrec: satellite.SatRec,
  steps = 160
): { x: number; y: number; z: number }[] {
  const meanMotion = satrec.no // rad/min
  const periodMin = (2 * Math.PI) / meanMotion
  const stepMs = (periodMin * 60 * 1000) / steps
  const now = Date.now()
  const points: { x: number; y: number; z: number }[] = []

  for (let i = 0; i <= steps; i++) {
    const t = new Date(now + i * stepMs)
    const posVel = satellite.propagate(satrec, t)
    const pos = posVel.position
    if (!pos || typeof pos === 'boolean') continue

    const gmst = satellite.gstime(t)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ecf = satellite.eciToEcf(pos as any, gmst) as { x: number; y: number; z: number }
    if (!isNaN(ecf.x) && !isNaN(ecf.y) && !isNaN(ecf.z)) {
      points.push(ecf)
    }
  }

  return points
}
