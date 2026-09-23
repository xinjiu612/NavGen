/**
 * Measure how long the page actually takes to become usable.
 *
 *   node tools/measure_load.mjs [url]
 *
 * Reports navigation timing, largest contentful paint, and every network
 * request with its transfer size and duration, so a slow page can be blamed on
 * the right thing (payload vs. connection latency) instead of guessed at.
 */
import puppeteer from 'puppeteer-core'

const URL = process.argv[2] ?? 'http://127.0.0.1:5299/'
const CHROME = process.env.CHROME_PATH ?? '/usr/bin/google-chrome-stable'

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--autoplay-policy=no-user-gesture-required'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 1000 })
await page.setCacheEnabled(false)

const requests = new Map()
page.on('request', (r) => requests.set(r.url(), { type: r.resourceType(), start: Date.now() }))
page.on('response', async (r) => {
  const rec = requests.get(r.url())
  if (!rec) return
  rec.end = Date.now()
  try {
    rec.status = r.status()
    const h = r.headers()
    rec.len = Number(h['content-length'] ?? 0)
  } catch {}
})

const t0 = Date.now()
await page.goto(URL, { waitUntil: 'load', timeout: 120000 })
const loadMs = Date.now() - t0
await new Promise((r) => setTimeout(r, 3000))

const nav = await page.evaluate(() => {
  const n = performance.getEntriesByType('navigation')[0] ?? {}
  const paints = Object.fromEntries(
    performance.getEntriesByType('paint').map((p) => [p.name, Math.round(p.startTime)]),
  )
  const lcp = performance.getEntriesByType('largest-contentful-paint').pop()
  return {
    dns: Math.round(n.domainLookupEnd - n.domainLookupStart || 0),
    tcp: Math.round(n.connectEnd - n.connectStart || 0),
    tls: Math.round(n.secureConnectionStart ? n.connectEnd - n.secureConnectionStart : 0),
    ttfb: Math.round(n.responseStart || 0),
    domContentLoaded: Math.round(n.domContentLoadedEventEnd || 0),
    load: Math.round(n.loadEventEnd || 0),
    paints,
    lcp: lcp ? Math.round(lcp.startTime) : null,
  }
})

const rows = [...requests.entries()]
  .filter(([, v]) => v.end)
  .map(([url, v]) => ({ url, ...v, ms: v.end - v.start }))
  .sort((a, b) => b.ms - a.ms)

const bytes = rows.reduce((s, r) => s + (r.len || 0), 0)

console.log(`\n${URL}`)
console.log('\nnavigation timing (ms)')
for (const [k, v] of Object.entries(nav)) {
  if (typeof v === 'number') console.log(`  ${k.padEnd(18)} ${v}`)
}
console.log(`  ${'wall clock load'.padEnd(18)} ${loadMs}`)
if (nav.paints) for (const [k, v] of Object.entries(nav.paints)) console.log(`  paint ${k.padEnd(12)} ${v}`)

console.log(`\nrequests: ${rows.length}, transferred: ${(bytes / 1024).toFixed(0)} KB`)
console.log('\nslowest 15')
for (const r of rows.slice(0, 15)) {
  const name = r.url.replace(URL, '').slice(0, 52) || '/'
  console.log(`  ${String(r.ms).padStart(6)}ms  ${String(r.status ?? '?').padStart(3)}  ${String(r.len).padStart(8)}B  ${r.type.padEnd(9)} ${name}`)
}

const byType = {}
for (const r of rows) {
  byType[r.type] ??= { n: 0, len: 0, ms: 0 }
  byType[r.type].n += 1
  byType[r.type].len += r.len || 0
  byType[r.type].ms += r.ms
}
console.log('\nby type')
for (const [t, v] of Object.entries(byType).sort((a, b) => b[1].len - a[1].len)) {
  console.log(`  ${t.padEnd(10)} n=${String(v.n).padStart(3)}  ${(v.len / 1024).toFixed(0).padStart(6)} KB`)
}

await browser.close()
