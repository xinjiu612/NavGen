/**
 * Screenshot the running dev server for visual review.
 *
 *   node tools/shoot.mjs [url] [outDir]
 *
 * Captures each top-level section, every pipeline stage, deeper scroll
 * positions inside the long sections, and a mobile pass.
 */
import puppeteer from 'puppeteer-core'
import { mkdir } from 'node:fs/promises'

const URL = process.argv[2] ?? 'http://127.0.0.1:5199/'
const OUT = process.argv[3] ?? '_scratch/shots'
const CHROME = process.env.CHROME_PATH ?? '/usr/bin/google-chrome-stable'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

await mkdir(OUT, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    '--autoplay-policy=no-user-gesture-required',
  ],
})

const errors = []

async function session(width, height, tag) {
  const page = await browser.newPage()
  await page.setViewport({ width, height, deviceScaleFactor: 1 })
  page.on('pageerror', (e) => errors.push(`[${tag}] pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`[${tag}] console: ${m.text()}`)
  })
  page.on('requestfailed', (r) => {
    const why = r.failure()?.errorText ?? ''
    // Lazy media is cancelled whenever a clip scrolls back out of range; that
    // is the design working, not a fault.
    if (r.url().startsWith('data:') || why === 'net::ERR_ABORTED') return
    errors.push(`[${tag}] requestfailed: ${r.url()} — ${why}`)
  })
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await sleep(2200)
  return page
}

async function scrollTo(page, id, offset = 0) {
  return page.evaluate(
    (sel, off) => {
      const el = document.getElementById(sel)
      if (!el) return false
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY - 70 + off,
        behavior: 'instant',
      })
      return true
    },
    id,
    offset,
  )
}

async function shot(page, name) {
  await sleep(2000)
  await page.screenshot({ path: `${OUT}/${name}.png` })
  console.log(`  captured ${name}`)
}

/* ------------------------------ desktop ------------------------------ */
{
  const page = await session(1440, 1000, 'desktop')

  for (const [id, name, off = 0] of [
    ['top', 'hero'],
    ['overview', 'overview'],
    ['overview', 'overview-2', 600],
    ['pipeline', 'pipeline-3', 0],
    ['data', 'data'],
    ['data', 'data-2', 800],
    ['analysis', 'analysis'],
    ['benchmark', 'benchmark'],
    ['benchmark', 'benchmark-2', 800],
    ['benchmark', 'benchmark-3', 1500],
    ['realworld', 'realworld'],
    ['cite', 'cite'],
  ]) {
    if (await scrollTo(page, id, off)) await shot(page, name)
  }

  // pipeline stages need clicks
  await scrollTo(page, 'pipeline')
  await sleep(1200)
  const stageCount = await page.evaluate(
    () => document.querySelectorAll('#pipeline nav ol li button').length,
  )
  for (let i = 0; i < stageCount; i += 1) {
    await page.evaluate((idx) => {
      document.querySelectorAll('#pipeline nav ol li button')[idx].click()
    }, i)
    await sleep(1800)
    await page.screenshot({ path: `${OUT}/pipeline-stage-${i + 1}.png` })
    console.log(`  captured pipeline-stage-${i + 1}`)
  }
  await page.close()
}

/* ------------------------------- mobile ------------------------------ */
{
  const page = await session(390, 844, 'mobile')
  for (const [id, name] of [
    ['top', 'm-hero'],
    ['pipeline', 'm-pipeline'],
    ['data', 'm-data'],
    ['benchmark', 'm-benchmark'],
    ['realworld', 'm-realworld'],
  ]) {
    if (await scrollTo(page, id)) await shot(page, name)
  }
  await page.close()
}

console.log(errors.length ? `\nPROBLEMS:\n${errors.slice(0, 40).join('\n')}` : '\nno console errors')
await browser.close()
