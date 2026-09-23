import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Add `is-in` to `.reveal` elements once they scroll into view.
 *
 * A MutationObserver keeps this working for nodes that appear later — pipeline
 * stages and filtered gallery cards mount after the initial pass, and without
 * it they would stay at opacity 0 forever.
 */
export function useRevealRoot() {
  useEffect(() => {
    const markAll = () =>
      document.querySelectorAll('.reveal:not(.is-in)').forEach((n) => n.classList.add('is-in'))

    if (!('IntersectionObserver' in window)) {
      markAll()
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in')
            io.unobserve(e.target)
          }
        })
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.06 },
    )

    let queued = 0
    const attach = () => {
      queued = 0
      document.querySelectorAll('.reveal:not(.is-in)').forEach((n) => io.observe(n))
    }
    const schedule = () => {
      if (!queued) queued = requestAnimationFrame(attach)
    }

    attach()
    const mo = new MutationObserver(schedule)
    mo.observe(document.body, { childList: true, subtree: true })

    return () => {
      if (queued) cancelAnimationFrame(queued)
      io.disconnect()
      mo.disconnect()
    }
  }, [])
}

/** `[ref, inView]` for a single element. */
export function useInView({ threshold = 0.25, once = true } = {}) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) {
      setInView(true)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          if (once) io.disconnect()
        } else if (!once) {
          setInView(false)
        }
      },
      { threshold },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold, once])

  return [ref, inView]
}

const easeOut = (t) => 1 - Math.pow(1 - t, 3)

/** Count from 0 to `target` once the returned ref enters the viewport. */
export function useCountUp(target, { duration = 1500, decimals = 0 } = {}) {
  const [ref, inView] = useInView({ threshold: 0.4 })
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!inView) return
    let raf
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration)
      setValue(Number((target * easeOut(p)).toFixed(decimals)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, target, duration, decimals])

  return [ref, value]
}

/** Track which section id is currently closest to the top of the viewport. */
export function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0])

  useEffect(() => {
    const onScroll = () => {
      const probe = window.innerHeight * 0.32
      let current = ids[0]
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= probe) current = id
      }
      setActive(current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [ids])

  return active
}

/** Simple `matchMedia` hook. */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = (e) => setMatches(e.matches)
    mq.addEventListener('change', on)
    setMatches(mq.matches)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return matches
}

/** Lock body scroll while a modal is open. */
export function useScrollLock(locked) {
  useEffect(() => {
    if (!locked) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [locked])
}

/** Copy helper with a transient "copied" flag. */
export function useCopy(timeout = 1800) {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(
    async (text) => {
      try {
        await navigator.clipboard.writeText(text)
      } catch {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        ta.remove()
      }
      setCopied(true)
      setTimeout(() => setCopied(false), timeout)
    },
    [timeout],
  )
  return [copied, copy]
}
