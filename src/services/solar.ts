import type { SolarWeather } from '../types'

const KP_URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json'
const CME_URL = 'https://api.nasa.gov/DONKI/CME?api_key=DEMO_KEY&startDate=STARTDATE&endDate=ENDDATE'

export async function fetchSolarWeather(): Promise<SolarWeather> {
  const [kpData, cmeData] = await Promise.allSettled([fetchKpIndex(), fetchCMECount()])

  const kpIndex = kpData.status === 'fulfilled' ? kpData.value : 0
  const cmeCount = cmeData.status === 'fulfilled' ? cmeData.value : 0

  return {
    kpIndex,
    kpLabel: getKpLabel(kpIndex),
    solarWindSpeed: null,
    cmeCount,
    lastUpdated: new Date(),
  }
}

async function fetchKpIndex(): Promise<number> {
  const res = await fetch(KP_URL)
  const data = await res.json()
  const latest = data[data.length - 1]
  return parseFloat(latest[1]) || 0
}

async function fetchCMECount(): Promise<number> {
  const now = new Date()
  const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  const url = CME_URL.replace('STARTDATE', fmt(start)).replace('ENDDATE', fmt(now))
  const res = await fetch(url)
  const data = await res.json()
  return Array.isArray(data) ? data.length : 0
}

function getKpLabel(kp: number): string {
  if (kp < 4) return 'Quiet'
  if (kp < 5) return 'Unsettled'
  if (kp < 6) return 'Storm G1'
  if (kp < 7) return 'Storm G2'
  if (kp < 8) return 'Storm G3'
  if (kp < 9) return 'Storm G4'
  return 'Storm G5'
}
