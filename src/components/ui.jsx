import { useCallback, useEffect, useRef, useState } from 'react'
import { useCountUp, useScrollLock } from '../lib/hooks.js'

/* -------------------------------------------------------------------------- */
/*  section scaffolding                                                       */
/* -------------------------------------------------------------------------- */

export function Section({ id, eyebrow, title, lead, children, className = '' }) {
  return (
    <section id={id} className={`relative py-20 md:py-28 ${className}`}>
      <div className="shell">
        {(eyebrow || title) && (
          <header className="reveal mb-10 max-w-3xl md:mb-14">
            {eyebrow && (
              <div className="eyebrow mb-4 flex items-center gap-3">
                <span className="inline-block h-px w-9 bg-cyan/60" />
                {eyebrow}
              </div>
            )}
            {title && (
              <h2 className="text-[2.1rem] font-semibold leading-[1.12] text-txt md:text-[3rem]">
                {title}
              </h2>
            )}
            {lead && (
              <p className="mt-6 text-[1.06rem] leading-relaxed text-txt-dim md:text-[1.2rem]">
                {lead}
              </p>
            )}
          </header>
        )}
        {children}
      </div>
    </section>
  )
}

export function Rule() {
  return <div className="shell"><div className="rule" /></div>
}

/* -------------------------------------------------------------------------- */
/*  numbers                                                                   */
/* -------------------------------------------------------------------------- */

export function Stat({ value, suffix = '', label, sub, decimals = 0, className = '' }) {
  const [ref, shown] = useCountUp(value, { decimals, duration: 1400 })
  const text = decimals > 0 ? shown.toFixed(decimals) : Math.round(shown).toLocaleString()
  return (
    <div ref={ref} className={className}>
      <div className="mono text-[1.9rem] font-semibold leading-none tracking-tight text-txt md:text-[2.3rem]">
        {text}
        <span className="text-cyan">{suffix}</span>
      </div>
      <div className="mt-2 text-[0.82rem] font-medium text-txt-dim">{label}</div>
      {sub && <div className="mt-0.5 text-[0.74rem] text-txt-mute">{sub}</div>}
    </div>
  )
}

export function Pill({ children, tone = 'default' }) {
  const tones = {
    default: 'border-white/10 bg-white/[0.04] text-txt-dim',
    cyan: 'border-cyan/30 bg-cyan/10 text-cyan',
    ours: 'border-ours/40 bg-ours/10 text-ours',
    violet: 'border-violet/30 bg-violet/10 text-violet',
  }
  return (
    <span
      className={`mono inline-flex items-center rounded-full border px-2.5 py-1 text-[0.68rem] uppercase tracking-wider ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/*  media                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * A muted, looping, poster-backed video. Sources are only attached once the
 * element is near the viewport so a page full of clips stays cheap.
 */
export function AutoVideo({
  src,
  poster,
  className = '',
  aspect = 16 / 9,
  eager = false,
  objectFit = 'cover',
  ...rest
}) {
  const ref = useRef(null)
  const visible = useRef(false)
  const [armed, setArmed] = useState(eager)

  // Play only while the clip is actually on screen. The retry matters: a clip
  // that just had its src attached has no data yet, so play() is a silent
  // no-op and the browser never asks again.
  const attempt = useCallback(() => {
    const el = ref.current
    if (!el || !visible.current) return
    const p = el.play?.()
    if (p?.catch) p.catch(() => {})
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const io = new IntersectionObserver(
      ([e]) => {
        visible.current = e.isIntersecting
        if (e.isIntersecting) {
          setArmed(true)
          attempt()
        } else {
          el.pause?.()
        }
      },
      { rootMargin: '300px' },
    )
    io.observe(el)

    el.addEventListener('loadeddata', attempt)
    el.addEventListener('canplay', attempt)
    return () => {
      io.disconnect()
      el.removeEventListener('loadeddata', attempt)
      el.removeEventListener('canplay', attempt)
    }
  }, [attempt])

  // src was attached after the observer already saw the element.
  useEffect(() => {
    if (armed) attempt()
  }, [armed, attempt])

  return (
    <div className={`media-frame scanline ${className}`} style={{ aspectRatio: aspect }}>
      <video
        ref={ref}
        src={armed ? src : undefined}
        poster={poster}
        muted
        loop
        playsInline
        preload="none"
        style={{ objectFit }}
        {...rest}
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  lightbox                                                                  */
/* -------------------------------------------------------------------------- */

export function Lightbox({ open, onClose, children, caption }) {
  useScrollLock(open)
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-ink-950/92 p-4 backdrop-blur-md md:p-10"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-txt-dim transition hover:bg-white/10 hover:text-txt"
      >
        ✕
      </button>
      <figure
        className="max-h-full w-full max-w-6xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
        {caption && (
          <figcaption className="mt-3 text-center text-sm text-txt-dim">
            {caption}
          </figcaption>
        )}
      </figure>
    </div>
  )
}

/** Click-to-zoom image used for the paper figures. */
export function ZoomImage({ src, alt, caption, className = '', imgClassName = '' }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group relative block w-full overflow-hidden rounded-xl border border-white/10 bg-ink-900 text-left transition hover:border-cyan/30 ${className}`}
      >
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={`w-full transition duration-500 group-hover:scale-[1.012] ${imgClassName}`}
        />
        <span className="mono pointer-events-none absolute bottom-2 right-2 rounded-full border border-white/15 bg-ink-950/80 px-2.5 py-1 text-[0.62rem] uppercase tracking-widest text-txt-mute opacity-0 transition group-hover:opacity-100">
          click to enlarge
        </span>
      </button>
      <Lightbox open={open} onClose={() => setOpen(false)} caption={caption}>
        <img src={src} alt={alt} className="max-h-[82vh] w-full rounded-lg object-contain" />
      </Lightbox>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  misc                                                                      */
/* -------------------------------------------------------------------------- */

export function Bar({ value, max = 1, color = 'var(--color-cyan)', delay = 0, height = 8 }) {
  const [ref, inView] = useInViewLocal()
  return (
    <div
      ref={ref}
      className="w-full overflow-hidden rounded-full bg-white/[0.07]"
      style={{ height }}
    >
      <div
        className="h-full rounded-full transition-[width] duration-1000 ease-out"
        style={{
          width: inView ? `${Math.min(100, (value / max) * 100)}%` : '0%',
          background: color,
          transitionDelay: `${delay}ms`,
        }}
      />
    </div>
  )
}

function useInViewLocal() {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) {
      setInView(true)
      return
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true)
          io.disconnect()
        }
      },
      { threshold: 0.3 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return [ref, inView]
}

export function FigureCard({ src, alt, caption, className = '' }) {
  return (
    <figure className={`card overflow-hidden p-2 md:p-3 ${className}`}>
      <ZoomImage src={src} alt={alt} caption={caption} className="border-0" />
      {caption && (
        <figcaption className="px-2 pb-1 pt-3 text-[0.82rem] leading-relaxed text-txt-mute">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
