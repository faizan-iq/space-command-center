import { writeFileSync } from 'fs'
import { gunzipSync } from 'zlib'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '../public/data/stars.json')

const URL = 'https://raw.githubusercontent.com/astronexus/HYG-Database/master/hyg/v3/hyg_v38.csv.gz'

console.log('Fetching HYG star catalog (compressed)...')
const res = await fetch(URL)
const buffer = await res.arrayBuffer()
const text = gunzipSync(Buffer.from(buffer)).toString('utf-8')
const lines = text.trim().split('\n')
const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
console.log('Headers:', headers.slice(0, 10).join(', '), '...')

const idx = (name) => headers.indexOf(name)
const iRa  = idx('ra')
const iDec = idx('dec')
const iMag = idx('mag')
const iBv  = idx('ci')
console.log(`Indices — ra:${iRa} dec:${iDec} mag:${iMag} ci:${iBv}`)

const stars = []
for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(',')
  const mag = parseFloat(cols[iMag])
  if (isNaN(mag) || mag > 6.5) continue

  const ra  = parseFloat(cols[iRa])
  const dec = parseFloat(cols[iDec])
  const bv  = parseFloat(cols[iBv])
  if (isNaN(ra) || isNaN(dec)) continue

  const raRad  = (ra / 24) * 2 * Math.PI
  const decRad = (dec * Math.PI) / 180
  const x = Math.cos(decRad) * Math.cos(raRad)
  const y = Math.sin(decRad)
  const z = Math.cos(decRad) * Math.sin(raRad)

  stars.push([
    parseFloat(x.toFixed(6)),
    parseFloat(y.toFixed(6)),
    parseFloat(z.toFixed(6)),
    parseFloat(mag.toFixed(2)),
    isNaN(bv) ? 0 : parseFloat(bv.toFixed(3)),
  ])
}

writeFileSync(OUT, JSON.stringify(stars))
console.log(`Written ${stars.length} stars → ${(JSON.stringify(stars).length / 1024).toFixed(1)} KB`)
