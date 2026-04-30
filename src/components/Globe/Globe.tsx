import { useEffect, useRef } from 'react'
import GlobeGL from 'globe.gl'
import type { SatellitePosition, ISSPosition, Launch, SelectedObject } from '../../types'

interface GlobeProps {
  satellites: SatellitePosition[]
  issPosition: ISSPosition | null
  launches: Launch[]
  onSelect: (obj: SelectedObject) => void
}

export function Globe({ satellites, issPosition, launches, onSelect }: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const globe = new GlobeGL(containerRef.current)
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
      .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
      .atmosphereColor('rgba(0, 200, 255, 0.15)')
      .atmosphereAltitude(0.18)
      .width(containerRef.current.offsetWidth)
      .height(containerRef.current.offsetHeight)

    globe.controls().autoRotate = true
    globe.controls().autoRotateSpeed = 0.3
    globe.controls().enableDamping = true
    globe.controls().dampingFactor = 0.1

    globeRef.current = globe

    const handleResize = () => {
      if (!containerRef.current) return
      globe.width(containerRef.current.offsetWidth).height(containerRef.current.offsetHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      globe._destructor?.()
    }
  }, [])

  // Satellite points
  useEffect(() => {
    if (!globeRef.current) return
    const globe = globeRef.current

    const satPoints = satellites.map((s) => ({
      lat: s.lat,
      lng: s.lng,
      alt: Math.min(s.alt / 6371, 0.5),
      color: 'rgba(100, 200, 255, 0.7)',
      size: 0.3,
      data: s,
      kind: 'satellite',
    }))

    const issPoint = issPosition
      ? [
          {
            lat: issPosition.lat,
            lng: issPosition.lng,
            alt: Math.min(issPosition.alt / 6371, 0.1),
            color: 'rgba(0, 255, 200, 1)',
            size: 1.2,
            data: issPosition,
            kind: 'iss',
          },
        ]
      : []

    const launchPoints = launches.map((l) => ({
      lat: l.pad.lat,
      lng: l.pad.lng,
      alt: 0,
      color: 'rgba(255, 160, 0, 0.9)',
      size: 0.8,
      data: l,
      kind: 'launch',
    }))

    const allPoints = [...satPoints, ...issPoint, ...launchPoints]

    globe
      .pointsData(allPoints)
      .pointLat('lat')
      .pointLng('lng')
      .pointAltitude('alt')
      .pointColor('color')
      .pointRadius('size')
      .pointLabel((d: any) => {
        if (d.kind === 'iss') return '<b style="color:#00ffc8">ISS</b>'
        if (d.kind === 'launch') return `<span style="color:#ffa000">${d.data.name}</span>`
        return `<span style="color:#64c8ff">${d.data.name}</span>`
      })
      .onPointClick((d: any) => {
        if (d.kind === 'satellite') onSelect({ type: 'satellite', data: d.data })
        if (d.kind === 'iss') onSelect({ type: 'iss', data: d.data })
        if (d.kind === 'launch') onSelect({ type: 'launch', data: d.data })

        globeRef.current?.pointOfView(
          { lat: d.lat, lng: d.lng, altitude: 1.5 },
          800
        )
      })
  }, [satellites, issPosition, launches, onSelect])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
