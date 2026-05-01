import * as satellite from 'satellite.js'
import type { SatellitePosition } from '../types'

// CelesTrak's gp.php endpoint started returning 403 to direct fetches in 2026.
// Switched to ivanstanojevic.me TLE API — JSON, CORS-enabled, popularity-sorted.
const TLE_API = 'https://tle.ivanstanojevic.me/api/tle/'
const PAGE_SIZE = 100      // API hard cap
const PAGES_TO_FETCH = 15  // → ~1500 satellites, popularity-sorted

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

interface TLEApiItem {
  name: string
  line1: string
  line2: string
  satelliteId: number
}

async function fetchPage(page: number): Promise<TLERecord[]> {
  try {
    const res = await fetch(`${TLE_API}?page=${page}&page-size=${PAGE_SIZE}`)
    if (!res.ok) return []
    const json = await res.json() as { member?: TLEApiItem[] }
    const items = json.member ?? []
    const records: TLERecord[] = []
    for (const item of items) {
      if (!item.line1?.startsWith('1') || !item.line2?.startsWith('2')) continue
      try {
        const satrec = satellite.twoline2satrec(item.line1, item.line2)
        records.push({ name: item.name, satrec, objectType: inferObjectType(item.name) })
      } catch {
        // bad TLE — skip
      }
    }
    return records
  } catch {
    return []
  }
}

export async function fetchTLEs(): Promise<TLERecord[]> {
  const seen = new Set<string>()
  const records: TLERecord[] = []

  // Pages load sequentially so the first 100 (most popular) appear quickly.
  for (let page = 1; page <= PAGES_TO_FETCH; page++) {
    const batch = await fetchPage(page)
    for (const rec of batch) {
      if (!seen.has(rec.name)) {
        seen.add(rec.name)
        records.push(rec)
      }
    }
    cachedTLEs = [...records]
    if (batch.length === 0) break  // hit end of catalogue
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
