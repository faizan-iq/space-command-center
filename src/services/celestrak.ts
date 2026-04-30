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

    results.push({ name, lat, lng, alt, velocity, satrec, objectType })
  }

  return results
}

export function getCachedTLEs(): TLERecord[] {
  return cachedTLEs
}

// Compute one full orbit — returns segments split at antimeridian crossings
// Each point is [lat, lng, altFraction] so Globe.gl can elevate the path
export function computeOrbitPath(
  satrec: satellite.SatRec,
  steps = 160
): [number, number, number][][] {
  const meanMotion = satrec.no // rad/min
  const periodMin = (2 * Math.PI) / meanMotion
  const stepMs = (periodMin * 60 * 1000) / steps

  const all: [number, number, number][] = []
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
    const alt = Math.log1p(geo.height / 400) * 0.12

    if (!isNaN(lat) && !isNaN(lng) && !isNaN(alt)) all.push([lat, lng, alt])
  }

  // Split into segments wherever longitude jumps > 180° (antimeridian crossing)
  const segments: [number, number, number][][] = []
  let seg: [number, number, number][] = []

  for (let i = 0; i < all.length; i++) {
    if (i === 0) { seg.push(all[i]); continue }
    if (Math.abs(all[i][1] - all[i - 1][1]) > 180) {
      if (seg.length > 1) segments.push(seg)
      seg = []
    }
    seg.push(all[i])
  }
  if (seg.length > 1) segments.push(seg)

  return segments
}
