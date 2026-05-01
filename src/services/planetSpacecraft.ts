// Curated database of active/historic spacecraft orbiting (or having orbited) other planets.
// Real orbital altitudes/periods where known; otherwise representative values.

export interface Spacecraft {
  id: string
  name: string
  planetId: string          // matches PlanetBody.id in horizons.ts
  operator: string
  country: string
  launched: string          // ISO year (or year-month)
  arrived: string           // year of orbital insertion
  status: 'active' | 'historic' | 'cruising'
  mission: string
  orbitAltKm: number        // mean orbital altitude above planet surface
  orbitPeriodMin: number    // orbital period in minutes
  inclinationDeg: number
  color: number             // three.js hex color
}

export const SPACECRAFT: Spacecraft[] = [
  // ============ MERCURY ============
  {
    id: 'bepicolombo', name: 'BepiColombo', planetId: '199',
    operator: 'ESA / JAXA', country: 'Europe / Japan',
    launched: '2018-10', arrived: '2025', status: 'active',
    mission: 'Joint ESA-JAXA mission studying Mercury\'s composition, magnetosphere, and exosphere with two orbiters.',
    orbitAltKm: 1500, orbitPeriodMin: 140, inclinationDeg: 90, color: 0xffcc66,
  },

  // ============ VENUS ============
  {
    id: 'akatsuki', name: 'Akatsuki', planetId: '299',
    operator: 'JAXA', country: 'Japan',
    launched: '2010-05', arrived: '2015', status: 'active',
    mission: 'Venus Climate Orbiter studying atmospheric dynamics, super-rotation, and cloud structure.',
    orbitAltKm: 8000, orbitPeriodMin: 600, inclinationDeg: 3, color: 0xffddaa,
  },

  // ============ MARS ============
  {
    id: 'mro', name: 'Mars Reconnaissance Orbiter', planetId: '499',
    operator: 'NASA', country: 'USA',
    launched: '2005-08', arrived: '2006', status: 'active',
    mission: 'High-resolution imaging (HiRISE), subsurface radar, and atmospheric science. Communications relay for surface rovers.',
    orbitAltKm: 300, orbitPeriodMin: 112, inclinationDeg: 93, color: 0xff8866,
  },
  {
    id: 'maven', name: 'MAVEN', planetId: '499',
    operator: 'NASA', country: 'USA',
    launched: '2013-11', arrived: '2014', status: 'active',
    mission: 'Mars Atmosphere and Volatile Evolution mission — studies atmospheric loss to space.',
    orbitAltKm: 6200, orbitPeriodMin: 270, inclinationDeg: 75, color: 0xffaa88,
  },
  {
    id: 'odyssey', name: 'Mars Odyssey', planetId: '499',
    operator: 'NASA', country: 'USA',
    launched: '2001-04', arrived: '2001', status: 'active',
    mission: 'Longest-serving Mars orbiter. Maps mineralogy and radiation environment; data relay for surface assets.',
    orbitAltKm: 400, orbitPeriodMin: 118, inclinationDeg: 93, color: 0xffbb77,
  },
  {
    id: 'tgo', name: 'ExoMars TGO', planetId: '499',
    operator: 'ESA / Roscosmos', country: 'Europe / Russia',
    launched: '2016-03', arrived: '2016', status: 'active',
    mission: 'Trace Gas Orbiter — searches for methane and other trace atmospheric gases.',
    orbitAltKm: 400, orbitPeriodMin: 120, inclinationDeg: 74, color: 0xff9977,
  },
  {
    id: 'mars-express', name: 'Mars Express', planetId: '499',
    operator: 'ESA', country: 'Europe',
    launched: '2003-06', arrived: '2003', status: 'active',
    mission: 'Europe\'s first Mars orbiter. Stereo imaging, subsurface radar, and atmospheric studies.',
    orbitAltKm: 10000, orbitPeriodMin: 460, inclinationDeg: 86, color: 0xffaa66,
  },
  {
    id: 'tianwen-1', name: 'Tianwen-1', planetId: '499',
    operator: 'CNSA', country: 'China',
    launched: '2020-07', arrived: '2021', status: 'active',
    mission: 'China\'s first independent Mars mission. Orbiter continues atmospheric and surface remote sensing.',
    orbitAltKm: 350, orbitPeriodMin: 115, inclinationDeg: 87, color: 0xff7755,
  },
  {
    id: 'hope', name: 'Hope (Al Amal)', planetId: '499',
    operator: 'UAESA', country: 'UAE',
    launched: '2020-07', arrived: '2021', status: 'active',
    mission: 'Emirates Mars Mission — first complete picture of the Martian atmosphere across all seasons.',
    orbitAltKm: 22000, orbitPeriodMin: 3300, inclinationDeg: 25, color: 0xffcc88,
  },

  // ============ JUPITER ============
  {
    id: 'juno', name: 'Juno', planetId: '599',
    operator: 'NASA', country: 'USA',
    launched: '2011-08', arrived: '2016', status: 'active',
    mission: 'Studies Jupiter\'s composition, gravity field, magnetic field, and polar magnetosphere.',
    orbitAltKm: 4200, orbitPeriodMin: 53 * 60, inclinationDeg: 90, color: 0xffddaa,
  },

  // ============ SATURN (historic) ============
  {
    id: 'cassini', name: 'Cassini', planetId: '699',
    operator: 'NASA / ESA / ASI', country: 'USA / Europe',
    launched: '1997-10', arrived: '2004', status: 'historic',
    mission: 'Studied Saturn\'s rings, moons, and atmosphere from 2004–2017. Mission ended with planned atmospheric entry.',
    orbitAltKm: 50000, orbitPeriodMin: 24000, inclinationDeg: 60, color: 0xffccaa,
  },
]

export function spacecraftForPlanet(planetId: string): Spacecraft[] {
  return SPACECRAFT.filter((s) => s.planetId === planetId)
}
