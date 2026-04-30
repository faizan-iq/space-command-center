# Space Command Center

Immersive 3D space dashboard. Navigable Earth globe with live satellite, launch, and solar weather data.

## Stack
- Vite + React + TypeScript
- Globe.gl + Three.js — 3D navigable Earth
- satellite.js — orbital mechanics from TLE data
- Tailwind CSS — dark HUD styling
- ESLint + Prettier — code quality
- Vercel — deployment (free tier, auto-deploys from GitHub)

## APIs (all free, no key required)
- **CelesTrak** — satellite TLE data: `https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle`
- **WhereTheISS.at** — ISS live position: `https://api.wheretheiss.at/v1/satellites/25544`
- **Launch Library 2** — rocket launches: `https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=20`
- **NOAA SWPC** — solar weather: `https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json`
- **NASA DONKI** — CMEs: `https://api.nasa.gov/DONKI/CME?api_key=DEMO_KEY`

## Features
1. Navigable 3D Earth (click-drag rotate, scroll zoom, fly-through on select)
2. Live satellite orbits on globe (CelesTrak TLE + satellite.js, updates every 1s)
3. ISS live tracker (real-time position, updates every 5s)
4. Rocket launch markers pinned to launch sites
5. Solar storm / space weather panel
6. Click satellite/launch → detail side panel

## Visual Style
- Deep space dark background (#000008)
- Glowing Earth with atmosphere
- Cyan/blue neon accents
- Clean floating HUD panels (backdrop-blur, glow border)
- Smooth animations

## Dev Commands
```bash
npm run dev      # local dev server
npm run build    # production build
npm run lint     # ESLint check
```

## Deployment
Push to GitHub main branch → Vercel auto-deploys. No env vars needed (all APIs are public).
