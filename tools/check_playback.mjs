/**
 * Assert that every clip that should be playing actually is.
 *
 *   node tools/check_playback.mjs [url]
 *
 * Lazy clips attach their `src` only once they scroll near the viewport, so a
 * play() call can land before there is any data and be a silent no-op. This
 * walks each section, waits, and reports paused / error / no-source clips.
 */
import puppeteer from 'puppeteer-core'

const URL = process.argv[2] ?? 'http://127.0.0.1:5299/'
const CHROME = process.env.CHROME_PATH ?? '/usr/bin/google-chrome-stable'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--autoplay-policy=no-user-gesture-required'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 1000 })

const problems = []
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`))

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await sleep(2500)

const survey = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('video')].map((v, i) => ({
      i,
      src: !!v.currentSrc,
      paused: v.paused,
      t: +v.currentTime.toFixed(2),
      ready: v.readyState,
      err: v.error?.code ?? null,
      inView: v.getBoundingClientRect().top < innerHeight && v.getBoundingClientRect().bottom > 0,
    })),
  )

async function section(id, extra = 0) {
  await page.evaluate(
    (sel, off) => {
      const el = document.getElementById(sel)
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 70 + off, behavior: 'instant' })
    },
    id,
    extra,
  )
  await sleep(2600)
}

let failures = 0

for (const [id, off] of [['data', 0], ['data', 700], ['benchmark', 0], ['benchmark', 900], ['realworld', 0]]) {
  await section(id, off)
  const before = await survey()
  await sleep(1500)
  const after = await survey()

  const visible = before.filter((v) => v.inView)
  const advancing = visible.filter((v, k) => after[before.indexOf(v)]?.t > v.t || after[before.indexOf(v)]?.paused === false)
  const bad = visible.filter((v) => v.err !== null || (v.paused && !advancing.includes(v)))

  console.log(
    `${id}${off ? `+${off}` : ''}: ${visible.length} in view, ${visible.length - bad.length} playing, ${bad.length} stalled`,
  )
  for (const v of bad) {
    console.log(`   !! video#${v.i} paused=${v.paused} src=${v.src} ready=${v.ready} err=${v.err}`)
    failures += 1
  }
}

// pipeline stage 02, where the lazy rows sit next to eager ones
await section('pipeline', 0)
await page.evaluate(() => document.querySelectorAll('#pipeline nav ol li button')[1]?.click())
await sleep(3200)
const stage = (await survey()).filter((v) => v.inView)
const stalled = stage.filter((v) => v.err !== null || v.paused)
console.log(`pipeline stage-02: ${stage.length} in view, ${stage.length - stalled.length} playing, ${stalled.length} stalled`)
for (const v of stalled) {
  console.log(`   !! video#${v.i} paused=${v.paused} src=${v.src} ready=${v.ready} err=${v.err}`)
  failures += 1
}

console.log(problems.length ? `\nPROBLEMS:\n${problems.join('\n')}` : '\nno console errors')
console.log(failures ? `\nFAIL: ${failures} stalled clip(s)` : '\nOK: every in-view clip is playing')
await browser.close()
process.exit(failures ? 1 : 0)
