export interface SatellitePosition {
  name: string
  lat: number
  lng: number
  alt: number
  velocity?: number
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

export type SelectedObject =
  | { type: 'satellite'; data: SatellitePosition }
  | { type: 'launch'; data: Launch }
  | { type: 'iss'; data: ISSPosition }
  | null
