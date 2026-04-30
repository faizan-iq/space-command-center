import type { Launch } from '../types'

const LAUNCHES_URL = 'https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=20&format=json'

export async function fetchUpcomingLaunches(): Promise<Launch[]> {
  const res = await fetch(LAUNCHES_URL)
  const data = await res.json()

  return (data.results ?? [])
    .filter((r: any) => r.pad?.latitude && r.pad?.longitude)
    .map((r: any): Launch => ({
      id: r.id,
      name: r.name,
      status: r.status?.abbrev ?? 'TBD',
      net: r.net,
      pad: {
        name: r.pad.name,
        lat: parseFloat(r.pad.latitude),
        lng: parseFloat(r.pad.longitude),
        location: r.pad.location?.name ?? '',
      },
      rocket: r.rocket?.configuration?.name ?? 'Unknown',
      mission: r.mission?.description ?? null,
    }))
}
