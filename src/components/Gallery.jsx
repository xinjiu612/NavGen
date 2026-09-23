import { useMemo, useState } from 'react'
import { mediaUrl, useMedia } from '../lib/media.jsx'
import { AutoVideo, Lightbox, Section } from './ui.jsx'

const SCENES = [
  { key: 'all', label: 'All scenes' },
  { key: 'outdoor', label: 'Outdoor' },
  { key: 'indoor', label: 'Indoor' },
]

function MarqueeRow({ clips }) {
  const doubled = [...clips, ...clips]
  return (
    <div
      className="relative -mx-6 mb-10 overflow-hidden md:-mx-10"
      style={{
        maskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)',
        WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)',
      }}
    >
      <div className="anim-marquee flex w-max gap-3">
        {doubled.map((c, i) => (
          <div
            key={`${c.id}-${i}`}
            className="media-frame w-[190px] shrink-0 sm:w-[230px]"
            style={{ aspectRatio: 5 / 3 }}
          >
            <img
              src={mediaUrl(c.poster)}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover opacity-80"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Gallery() {
  const { data } = useMedia()
  const clips = data?.gallery ?? []
  const [scene, setScene] = useState('all')
  const [q, setQ] = useState('')
  const [openClip, setOpenClip] = useState(null)

  const counts = useMemo(() => {
    const c = { all: clips.length, indoor: 0, outdoor: 0 }
    clips.forEach((x) => (c[x.scene] = (c[x.scene] ?? 0) + 1))
    return c
  }, [clips])

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return clips.filter(
      (c) =>
        (scene === 'all' || c.scene === scene) &&
        (!needle ||
          c.label.toLowerCase().includes(needle) ||
          c.id.toLowerCase().includes(needle)),
    )
  }, [clips, scene, q])

  return (
    <Section
      id="data"
      eyebrow="The dataset"
      title="400K episodes, and what they actually look like"
    >
      <MarqueeRow clips={clips.slice(0, 18)} />

      <div className="reveal mb-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {SCENES.map((s) => (
            <button
              key={s.key}
              className="chip"
              data-active={scene === s.key}
              onClick={() => setScene(s.key)}
            >
              {s.label}
              <span className="mono opacity-60">{counts[s.key] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-full sm:w-64">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter descriptions…"
            className="w-full rounded-full border border-white/[0.1] bg-white/[0.03] px-4 py-2 text-[0.82rem] text-txt placeholder:text-txt-mute focus:border-cyan/40 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((c, i) => (
          <button
            key={c.id}
            onClick={() => setOpenClip(c)}
            className="group reveal text-left"
            style={{ transitionDelay: `${Math.min(i, 12) * 35}ms` }}
          >
            <AutoVideo
              src={mediaUrl(c.video)}
              poster={mediaUrl(c.poster)}
              aspect={5 / 3}
              className="transition duration-300 group-hover:!border-cyan/40"
            />
            <div className="mt-2 px-0.5">
              <div className="truncate text-[0.78rem] text-txt-dim transition group-hover:text-txt">
                {c.label}
              </div>
              <div className="mono mt-0.5 text-[0.62rem] text-txt-mute">{c.scene}</div>
            </div>
          </button>
        ))}
      </div>

      {shown.length === 0 && (
        <p className="py-16 text-center text-sm text-txt-mute">
          No episode matches that filter.
        </p>
      )}

      <Lightbox
        open={!!openClip}
        onClose={() => setOpenClip(null)}
        caption={
          openClip && (
            <span className="mono">
              {openClip.label} · {openClip.scene}
            </span>
          )
        }
      >
        {openClip && (
          <div className="media-frame mx-auto max-w-4xl" style={{ aspectRatio: 5 / 3 }}>
            <video
              src={mediaUrl(openClip.video)}
              poster={mediaUrl(openClip.poster)}
              autoPlay
              muted
              loop
              playsInline
              controls
            />
          </div>
        )}
      </Lightbox>

    </Section>
  )
}
