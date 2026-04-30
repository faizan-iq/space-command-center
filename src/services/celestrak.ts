import * as satellite from 'satellite.js'
import type { SatellitePosition } from '../types'

const GP_URL =
  'https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=json'

interface TLERecord {
  name: string
  satrec: satellite.SatRec
  objectType: string
  country: string
  launchDate: string
  noradId: number
}

let cachedTLEs: TLERecord[] = []

export async function fetchTLEs(): Promise<TLERecord[]> {
  const res = await fetch(GP_URL)
  const data = await res.json()

  const records: TLERecord[] = []
  for (const entry of data) {
    const line1 = entry.TLE_LINE1
    const line2 = entry.TLE_LINE2
    if (!line1 || !line2) continue

    const satrec = satellite.twoline2satrec(line1, line2)
    records.push({
      name: entry.OBJECT_NAME ?? 'UNKNOWN',
      satrec,
      objectType: entry.OBJECT_TYPE ?? 'UNKNOWN',
      country: entry.COUNTRY_CODE ?? '—',
      launchDate: entry.LAUNCH_DATE ?? '',
      noradId: entry.NORAD_CAT_ID ?? 0,
    })
  }

  cachedTLEs = records
  return records
}

export function propagateSatellites(tles: TLERecord[]): SatellitePosition[] {
  const now = new Date()
  const results: SatellitePosition[] = []

  for (const { name, satrec, objectType, country, launchDate, noradId } of tles) {
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

    results.push({ name, lat, lng, alt, velocity, satrec, objectType, country, launchDate, noradId })
  }

  return results
}

export function getCachedTLEs(): TLERecord[] {
  return cachedTLEs
}

// Compute one full orbit path for a satellite (returns array of [lat, lng] points)
export function computeOrbitPath(
  satrec: satellite.SatRec,
  steps = 120
): [number, number][] {
  // Estimate orbital period from mean motion (revolutions per day → minutes per rev)
  const meanMotion = satrec.no // rad/min
  const periodMin = (2 * Math.PI) / meanMotion
  const stepMs = (periodMin * 60 * 1000) / steps

  const points: [number, number][] = []
  const now = Date.now()

  for (let i = 0; i <= steps; i++) {
    const t = new Date(now + i * stepMs)
    const posVel = satellite.propagate(satrec, t)
    const pos = posVel.position
    if (!pos || typeof pos === 'boolean') continue

    const gmst = satellite.gstime(t)
    const geo = satellite.eciToGeodetic(pos, gmst)
    const lat = satellite.degreesLat(geo.latitude)
    const lng = satellite.degreesLong(geo.longitude)

    if (!isNaN(lat) && !isNaN(lng)) points.push([lat, lng])
  }

  return points
}
