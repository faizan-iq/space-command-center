// Run once: node scripts/download-planet-textures.mjs
import { writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'public', 'textures', 'planets')
await mkdir(OUT, { recursive: true })

const textures = [
  ['2k_sun.jpg',               'https://www.solarsystemscope.com/textures/download/2k_sun.jpg'],
  ['2k_mercury.jpg',           'https://www.solarsystemscope.com/textures/download/2k_mercury.jpg'],
  ['2k_venus_surface.jpg',     'https://www.solarsystemscope.com/textures/download/2k_venus_surface.jpg'],
  ['2k_mars.jpg',              'https://www.solarsystemscope.com/textures/download/2k_mars.jpg'],
  ['2k_jupiter.jpg',           'https://www.solarsystemscope.com/textures/download/2k_jupiter.jpg'],
  ['2k_saturn.jpg',            'https://www.solarsystemscope.com/textures/download/2k_saturn.jpg'],
  ['2k_saturn_ring_alpha.png', 'https://www.solarsystemscope.com/textures/download/2k_saturn_ring_alpha.png'],
  ['2k_uranus.jpg',            'https://www.solarsystemscope.com/textures/download/2k_uranus.jpg'],
  ['2k_neptune.jpg',           'https://www.solarsystemscope.com/textures/download/2k_neptune.jpg'],
  ['2k_moon.jpg',              'https://www.solarsystemscope.com/textures/download/2k_moon.jpg'],
  ['2k_sun_glow.jpg',          'https://www.solarsystemscope.com/textures/download/2k_sun.jpg'], // reuse for glow
]

for (const [filename, url] of textures) {
  process.stdout.write(`  ${filename.padEnd(28)}`)
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = await res.arrayBuffer()
    await writeFile(join(OUT, filename), Buffer.from(buf))
    console.log(`✓  ${(buf.byteLength / 1024).toFixed(0)} KB`)
  } catch (err) {
    console.log(`✗  ${err.message}`)
  }
}

console.log('\nDone. Textures saved to public/textures/planets/')
