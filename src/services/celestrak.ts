import * as satellite from 'satellite.js'
import type { SatellitePosition } from '../types'

const BASE = 'https://celestrak.org/NORAD/elements/gp.php?FORMAT=tle&GROUP='

// Fetch these groups in parallel — each is small/fast, combined gives ~4000+ satellites
const TLE_GROUPS = [
  'stations', 'visual', 'weather', 'noaa', 'goes',
  'resource', 'sarsat', 'iridium-NEXT', 'orbcomm', 'globalstar',
  'amateur', 'x-comm', 'other-comm', 'gps-ops', 'glo-ops',
  'galileo', 'beidou', 'science', 'geodetic', 'engineering',
  'education', 'military', 'radar', 'cubesat', 'other',
  'oneweb',
]

interface TLERecord {
  name: string
  satrec: satellite.SatRec
  objectType: string
}

interface SatDbEntry {
  operator?: string
  purpose?: string
  country?: string
  launched?: string
}

let cachedTLEs: TLERecord[] = []
const groundTrackCache = new Map<string, [number, number, number][][]>()
const satDb = new Map<string, SatDbEntry>()
let satDbLoaded = false

export async function loadSatelliteDb(): Promise<void> {
  if (satDbLoaded) return
  try {
    const data: Record<string, SatDbEntry> = await fetch('/data/satellites-db.json').then((r) => r.json())
    for (const [name, entry] of Object.entries(data)) {
      satDb.set(name.toUpperCase(), entry)
    }
    satDbLoaded = true
  } catch {
    // DB optional — falls back to pattern matching
  }
}

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

async function fetchGroup(group: string): Promise<TLERecord[]> {
  try {
    const res = await fetch(BASE + group)
    if (!res.ok) return []
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
    return records
  } catch {
    return []
  }
}

export async function fetchTLEs(): Promise<TLERecord[]> {
  const results = await Promise.all(TLE_GROUPS.map(fetchGroup))

  // Deduplicate by name — same satellite can appear in multiple groups
  const seen = new Set<string>()
  const records: TLERecord[] = []
  for (const group of results) {
    for (const rec of group) {
      if (!seen.has(rec.name)) {
        seen.add(rec.name)
        records.push(rec)
      }
    }
  }

  cachedTLEs = records
  groundTrackCache.clear()
  _precomputeGroundTracks(records)
  return records
}

// Pre-compute 1-orbit ground tracks for all satellites after TLE fetch.
// Runs async in the background — cache fills gradually without blocking.
function _precomputeGroundTracks(records: TLERecord[]): void {
  let i = 0
  const BATCH = 20
  const step = () => {
    const end = Math.min(i + BATCH, records.length)
    for (; i < end; i++) {
      const { name, satrec } = records[i]
      if (!groundTrackCache.has(name)) {
        groundTrackCache.set(name, computeGroundTrack(satrec, 1, 80))
      }
    }
    if (i < records.length) setTimeout(step, 0)
  }
  setTimeout(step, 0)
}

export function getCachedGroundTrack(name: string): [number, number, number][][] {
  return groundTrackCache.get(name) ?? []
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

    const dbEntry = satDb.get(name.toUpperCase())
    results.push({
      name,
      lat,
      lng,
      alt,
      velocity,
      satrec,
      objectType,
      purpose: dbEntry?.purpose ?? inferPurpose(name),
      operator: dbEntry?.operator,
      country: dbEntry?.country,
      launched: dbEntry?.launched,
    })
  }

  return results
}

export function getCachedTLEs(): TLERecord[] {
  return cachedTLEs
}

// Compute the satellite's ground track over multiple orbits.
// Returns segments split at antimeridian crossings (>180° lng jump).
export function computeGroundTrack(
  satrec: satellite.SatRec,
  numOrbits = 3,
  stepsPerOrbit = 90
): [number, number, number][][] {
  const meanMotion = satrec.no
  const periodMin = (2 * Math.PI) / meanMotion
  const totalSteps = numOrbits * stepsPerOrbit
  const stepMs = (periodMin * 60 * 1000) / stepsPerOrbit
  const now = Date.now()

  const all: [number, number, number][] = []

  for (let i = 0; i <= totalSteps; i++) {
    const t = new Date(now + i * stepMs)
    const posVel = satellite.propagate(satrec, t)
    const pos = posVel.position
    if (!pos || typeof pos === 'boolean') continue

    const gmst = satellite.gstime(t)
    const geo = satellite.eciToGeodetic(pos, gmst)
    const lat = satellite.degreesLat(geo.latitude)
    const lng = satellite.degreesLong(geo.longitude)

    if (!isNaN(lat) && !isNaN(lng)) all.push([lat, lng, 0.004])
  }

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
