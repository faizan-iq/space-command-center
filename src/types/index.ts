import type { Spacecraft } from '../services/planetSpacecraft'
import type { MoonBody, PlanetBody } from '../services/horizons'

export interface SatellitePosition {
  name: string
  lat: number
  lng: number
  alt: number
  velocity?: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  satrec?: any
  objectType?: string
  purpose?: string
  operator?: string
  country?: string
  launched?: string
}

export interface ISSPosition {
  lat: number
  lng: number
  alt: number
  velocity: number
  timestamp: number
}

export interface Launch {
  id: string
  name: string
  status: string
  net: string
  pad: {
    name: string
    lat: number
    lng: number
    location: string
  }
  rocket: string
  mission: string | null
}

export interface SolarWeather {
  kpIndex: number
  kpLabel: string
  solarWindSpeed: number | null
  cmeCount: number
  lastUpdated: Date
}

export interface PlanetSelection {
  planet: PlanetBody
  distanceFromSunAU: number
}

export interface MoonSelection {
  moon: MoonBody
  parentPlanetName: string
}

export type SelectedObject =
  | { type: 'satellite'; data: SatellitePosition }
  | { type: 'launch'; data: Launch }
  | { type: 'iss'; data: ISSPosition }
  | { type: 'spacecraft'; data: Spacecraft }
  | { type: 'moon'; data: MoonSelection }
  | { type: 'planet'; data: PlanetSelection }
  | null
