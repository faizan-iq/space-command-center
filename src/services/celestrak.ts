import * as satellite from 'satellite.js'
import type { SatellitePosition } from '../types'

const TLE_URL =
  'https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=tle'

interface TLERecord {
  name: string
  satrec: satellite.SatRec
}

let cachedTLEs: TLERecord[] = []

export async function fetchTLEs(): Promise<TLERecord[]> {
  const res = await fetch(TLE_URL)
  const text = await res.text()
  const lines = text.trim().split('\n').map((l) => l.trim())

  const records: TLERecord[] = []
  for (let i = 0; i < lines.length - 2; i += 3) {
    const name = lines[i]
    const line1 = lines[i + 1]
    const line2 = lines[i + 2]
    if (line1?.startsWith('1') && line2?.startsWith('2')) {
      const satrec = satellite.twoline2satrec(line1, line2)
      records.push({ name, satrec })
    }
  }

  cachedTLEs = records
  return records
}

export function propagateSatellites(tles: TLERecord[]): SatellitePosition[] {
  const now = new Date()
  const results: SatellitePosition[] = []

  for (const { name, satrec } of tles) {
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

    results.push({ name, lat, lng, alt, velocity })
  }

  return results
}

export function getCachedTLEs(): TLERecord[] {
  return cachedTLEs
}
