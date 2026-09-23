import { useEffect, useState } from 'react'
import { SECTIONS, SHORT_TITLE } from '../lib/site.js'
import { useActiveSection } from '../lib/hooks.js'

function Mark() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="rgba(255,255,255,0.05)" />
      <path
        d="M8 20.5 16 8l8 12.5"
        stroke="url(#g)"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="23" r="2.2" fill="#8b5cf6" />
      <defs>
        <linearGradient id="g" x1="8" y1="8" x2="24" y2="21">
          <stop stopColor="#22d3ee" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export default function Nav() {
  const [solid, setSolid] = useState(false)
  const [open, setOpen] = useState(false)
  const ids = SECTIONS.map((s) => s.id)
  const active = useActiveSection(ids)

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const go = (id) => (e) => {
    e.preventDefault()
    setOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-[100] transition-all duration-500 ${
          solid
            ? 'border-b border-white/[0.07] bg-ink-950/80 backdrop-blur-xl'
            : 'border-b border-transparent'
        }`}
      >
        <div className="shell flex h-16 items-center justify-between gap-6">
          <a
            href="#top"
            onClick={go('top')}
            className="flex min-w-0 items-center gap-2.5 text-sm font-semibold tracking-tight text-txt"
          >
            <Mark />
            <span className="hidden truncate text-[0.82rem] text-txt-dim sm:block">
              {SHORT_TITLE}
            </span>
          </a>

          <nav className="hidden items-center gap-1 lg:flex">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={go(s.id)}
                className={`relative rounded-full px-3 py-2 text-[0.82rem] transition ${
                  active === s.id
                    ? 'text-txt'
                    : 'text-txt-mute hover:text-txt-dim'
                }`}
              >
                {s.label}
                {active === s.id && (
                  <span className="absolute inset-x-3 -bottom-px h-px bg-gradient-to-r from-transparent via-cyan to-transparent" />
                )}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href="paper.pdf"
              target="_blank"
              rel="noreferrer"
              className="btn hidden !px-4 !py-1.5 !text-[0.8rem] sm:inline-flex"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M6 2h8l6 6v14H6z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              </svg>
              Paper
            </a>
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle navigation"
              aria-expanded={open}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/5 text-txt-dim lg:hidden"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                {open ? (
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-[99] bg-ink-950/95 pt-16 backdrop-blur-xl lg:hidden">
          <nav className="shell flex flex-col py-6">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={go(s.id)}
                className="border-b border-white/[0.06] py-4 text-lg text-txt-dim transition hover:text-txt"
              >
                {s.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </>
  )
}
