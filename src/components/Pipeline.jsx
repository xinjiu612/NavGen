import { useEffect, useMemo, useState } from 'react'
import { MOTION_SPLIT, NAV_RUBRIC, PIPELINE } from '../lib/site.js'
import { mediaUrl, useMedia } from '../lib/media.jsx'
import { AutoVideo, Pill, Section, ZoomImage } from './ui.jsx'

/* -------------------------------------------------------------------------- */
/*  stage media                                                               */
/* -------------------------------------------------------------------------- */

function WordcloudMedia() {
  const { data } = useMedia()
  return (
    <div className="space-y-3">
      <ZoomImage
        src={mediaUrl(data?.figures?.wordcloud)}
        alt="Word cloud of generated navigation descriptions"
        caption="Vocabulary of the generated embodied navigation descriptions."
        className="bg-ink-900/40"
      />
      <p className="text-[0.8rem] leading-relaxed text-txt-mute">
        Object-level anchoring keeps the prompt vocabulary broad even at 300K
        samples, where an unconstrained VLM collapses into near-duplicates.
      </p>
    </div>
  )
}

function GalleryMedia() {
  const { data } = useMedia()
  const clips = (data?.gallery ?? []).slice(0, 6)
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {clips.map((c) => (
        <div key={c.id} className="space-y-1.5">
          <AutoVideo
            src={mediaUrl(c.video)}
            poster={mediaUrl(c.poster)}
            aspect={5 / 3}
          />
          <div className="mono truncate text-[0.62rem] text-txt-mute">{c.id}</div>
        </div>
      ))}
    </div>
  )
}

const DONUT_COLORS = [
  '#22d3ee', '#8b5cf6', '#e0559f', '#3fbf6f', '#f0a878', '#4f8ff7', '#4b5670',
]

function MotionDonut() {
  const [live, setLive] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setLive(true), 120)
    return () => clearTimeout(t)
  }, [])

  const R = 62
  const C = 2 * Math.PI * R
  const segments = useMemo(() => {
    let acc = 0
    return MOTION_SPLIT.map((m, i) => {
      const len = (m.pct / 100) * C
      const seg = { ...m, len, offset: acc, color: DONUT_COLORS[i % DONUT_COLORS.length] }
      acc += len
      return seg
    })
  }, [C])

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
      <svg viewBox="0 0 160 160" className="h-40 w-40 shrink-0 -rotate-90">
        <circle cx="80" cy="80" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="17" />
        {segments.map((s) => (
          <circle
            key={s.label}
            cx="80"
            cy="80"
            r={R}
            fill="none"
            stroke={s.color}
            strokeWidth="17"
            strokeDasharray={`${live ? s.len : 0} ${C}`}
            strokeDashoffset={-s.offset}
            style={{
              transition: 'stroke-dasharray 1.1s cubic-bezier(0.3,0.8,0.3,1)',
            }}
          />
        ))}
        <text
          x="80"
          y="80"
          textAnchor="middle"
          dominantBaseline="central"
          className="rotate-90 fill-txt font-mono"
          style={{ transformOrigin: '80px 80px', fontSize: 15, fontWeight: 600 }}
        >
          400K
        </text>
      </svg>

      <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-1">
        {segments.map((s) => (
          <li key={s.label} className="flex items-baseline gap-2.5 text-[0.82rem]">
            <span
              className="mt-1 h-2 w-2 shrink-0 rounded-sm"
              style={{ background: s.color }}
            />
            <span className="mono w-14 shrink-0 text-txt">{s.label}</span>
            <span className="mono text-txt-dim">{s.pct}%</span>
            <span className="hidden truncate text-[0.72rem] text-txt-mute lg:inline">
              {s.note}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function RebalanceMedia() {
  return (
    <div className="space-y-5">
      <MotionDonut />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
          <div className="mono text-[0.66rem] uppercase tracking-widest text-cyan">
            Left–right imbalance
          </div>
          <p className="mt-2 text-[0.85rem] leading-relaxed text-txt-dim">
            Corrected by horizontal mirroring of the clip — free, and it doubles
            the coverage of the under-represented side.
          </p>
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
          <div className="mono text-[0.66rem] uppercase tracking-widest text-violet">
            Forward–backward imbalance
          </div>
          <p className="mt-2 text-[0.85rem] leading-relaxed text-txt-dim">
            Corrected by temporal reversal, which adds the missing motion
            direction without another diffusion pass.
          </p>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  style-diversification demo                                                */
/* -------------------------------------------------------------------------- */

function DiversifyDemo() {
  const { data } = useMedia()
  const groups = data?.diversify ?? []
  const [gIdx, setGIdx] = useState(0)
  const [sIdx, setSIdx] = useState(null)
  const [showEdit, setShowEdit] = useState(false)

  const group = groups[gIdx]
  if (!group) return null

  const active = sIdx === null ? null : group.styles[sIdx]
  const main = active ?? group.reference

  return (
    <div className="space-y-4">
      {groups.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {groups.map((g, i) => (
            <button
              key={g.id}
              className="chip"
              data-active={i === gIdx}
              onClick={() => {
                setGIdx(i)
                setSIdx(null)
                setShowEdit(false)
              }}
            >
              {g.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-3">
          <div className="media-frame scanline" style={{ aspectRatio: 16 / 9 }}>
            <video
              key={main.video}
              src={mediaUrl(main.video)}
              poster={mediaUrl(main.poster)}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
            />
            <div className="pointer-events-none absolute left-3 top-3">
              <Pill tone={active ? 'violet' : 'cyan'}>
                {active ? `style ${active.id}` : 'seedance 2.0 original'}
              </Pill>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              className="chip"
              data-active={sIdx === null}
              onClick={() => setSIdx(null)}
            >
              Original
            </button>
            {group.styles.map((s, i) => (
              <button
                key={s.id}
                className="chip"
                data-active={i === sIdx}
                onClick={() => {
                  setSIdx(i)
                  setShowEdit(false)
                }}
              >
                {s.id}
              </button>
            ))}
            {active?.edit && (
              <button
                className="chip !border-violet/40 !text-violet"
                data-active={showEdit}
                onClick={() => setShowEdit((v) => !v)}
              >
                {showEdit ? 'Show video' : 'Show edited frame'}
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {showEdit && active?.edit ? (
            <div className="overflow-hidden rounded-lg border border-violet/30">
              <img
                src={mediaUrl(active.edit)}
                alt="Qwen-Image-Edit re-rendered first frame"
                className="w-full"
              />
              <div className="mono border-t border-violet/25 bg-violet/[0.07] px-3 py-2 text-[0.66rem] uppercase tracking-widest text-violet">
                Qwen-Image-Edit first frame
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 lg:grid-cols-2">
              {group.styles.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSIdx(i)
                    setShowEdit(false)
                  }}
                  className={`media-frame transition ${
                    i === sIdx
                      ? '!border-violet/70 ring-1 ring-violet/40'
                      : 'hover:!border-white/25'
                  }`}
                  style={{ aspectRatio: 5 / 3 }}
                  aria-label={`Style variant ${s.id}`}
                >
                  <img src={mediaUrl(s.poster)} alt="" className="h-full w-full object-cover" />
                  <span className="mono absolute bottom-1 left-1.5 text-[0.58rem] text-white/70">
                    {s.id}
                  </span>
                </button>
              ))}
            </div>
          )}

          <ol className="space-y-2.5 text-[0.82rem] leading-relaxed text-txt-dim">
            {[
              'Caption the first frame with Qwen3.6-27B, keeping object shape and changing surroundings, style and appearance.',
              'Re-render that frame with Qwen-Image-Edit.',
              'Convert the original clip to a depth video with MoGe-2 for structural guidance.',
              'Generate a new video with the LTX-2.3 ICLoraPipeline conditioned on the reference clip.',
            ].map((t, i) => (
              <li key={i} className="flex gap-3">
                <span className="mono shrink-0 text-[0.68rem] text-violet">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {t}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}

function FilterMedia() {
  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {NAV_RUBRIC.map((r) => (
          <div
            key={r.level}
            className="flex items-start gap-3 rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-3"
          >
            <span
              className={`mono shrink-0 rounded-md px-2 py-0.5 text-[0.7rem] font-semibold ${
                r.level === 'L2' || r.level === 'L3'
                  ? 'bg-cyan/15 text-cyan'
                  : 'bg-white/[0.06] text-txt-mute'
              }`}
            >
              {r.level}
            </span>
            <span className="text-[0.82rem] leading-snug text-txt-dim">{r.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const MEDIA = {
  wordcloud: WordcloudMedia,
  gallery: GalleryMedia,
  analysis: RebalanceMedia,
  diversify: DiversifyDemo,
  rubric: FilterMedia,
}

/* -------------------------------------------------------------------------- */
/*  section                                                                   */
/* -------------------------------------------------------------------------- */

export default function Pipeline() {
  const [active, setActive] = useState(0)
  const stage = PIPELINE[active]
  const Media = MEDIA[stage.media]

  return (
    <Section
      id="pipeline"
      eyebrow="Method"
      title="A five-stage data engine"
    >
      <div className="grid gap-8 lg:grid-cols-[280px_1fr] lg:gap-12">
        {/* stepper ------------------------------------------------------- */}
        <nav className="reveal lg:sticky lg:top-24 lg:self-start">
          <ol className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-2 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0">
            {PIPELINE.map((s, i) => {
              const on = i === active
              return (
                <li key={s.id} className="shrink-0 lg:shrink">
                  <button
                    onClick={() => setActive(i)}
                    className={`group relative flex w-full min-w-[190px] items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition lg:min-w-0 ${
                      on
                        ? 'border-cyan/35 bg-cyan/[0.07]'
                        : 'border-white/[0.07] bg-white/[0.015] hover:border-white/15 hover:bg-white/[0.04]'
                    }`}
                  >
                    <span
                      className={`mono mt-0.5 text-[0.68rem] ${
                        on ? 'text-cyan' : 'text-txt-mute'
                      }`}
                    >
                      {s.index}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={`block text-[0.68rem] uppercase tracking-[0.14em] ${
                          on ? 'text-cyan/80' : 'text-txt-mute'
                        }`}
                      >
                        {s.kicker}
                      </span>
                      <span
                        className={`mt-1 block text-[0.9rem] font-medium leading-snug ${
                          on ? 'text-txt' : 'text-txt-dim'
                        }`}
                      >
                        {s.title}
                      </span>
                    </span>
                    {on && (
                      <span className="absolute inset-y-2 -left-px hidden w-0.5 rounded-full bg-gradient-to-b from-cyan to-violet lg:block" />
                    )}
                  </button>
                </li>
              )
            })}
          </ol>
        </nav>

        {/* panel --------------------------------------------------------- */}
        <div key={stage.id} className="reveal min-w-0">
          <div className="mb-6">
            <div className="eyebrow mb-2">
              Stage {stage.index} · {stage.kicker}
            </div>
            <h3 className="text-2xl font-semibold text-txt md:text-[1.75rem]">
              {stage.title}
            </h3>
            <p className="mt-4 max-w-3xl text-[0.95rem] leading-relaxed text-txt-dim">
              {stage.lead}
            </p>
          </div>

          <ul className="mb-8 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {stage.points.map(([k, v]) => (
              <li key={k} className="flex gap-3 border-t border-white/[0.07] pt-3">
                <span className="mono shrink-0 text-[0.74rem] text-cyan">{k}</span>
                <span className="text-[0.84rem] leading-relaxed text-txt-dim">{v}</span>
              </li>
            ))}
          </ul>

          <Media />
        </div>
      </div>
    </Section>
  )
}
