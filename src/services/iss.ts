import type { ISSPosition } from '../types'

const ISS_URL = 'https://api.wheretheiss.at/v1/satellites/25544'

export async function fetchISSPosition(): Promise<ISSPosition> {
  const res = await fetch(ISS_URL)
  const data = await res.json()
  return {
    lat: data.latitude,
    lng: data.longitude,
    alt: data.altitude,
    velocity: data.velocity,
    timestamp: data.timestamp,
  }
}
