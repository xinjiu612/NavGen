import { useMemo, useState } from 'react'
import { mediaUrl, useMedia } from '../lib/media.jsx'
import { AutoVideo, Lightbox, Section } from './ui.jsx'

const HEADLINES = [
  ['75%', 'overall success rate', '20 real-world tasks, five trials each'],
  ['50%', 'when the target is ambiguous', 'long-horizon resumption'],
  ['0', 'fine-tuning on real flight', 'purely generated training data'],
]

function FlightGallery() {
  const { data } = useMedia()
  const clips = data?.realworld ?? []
  const [scene, setScene] = useState('all')
  const [open, setOpen] = useState(null)

  const counts = useMemo(() => {
    const c = { all: clips.length, indoor: 0, outdoor: 0 }
    clips.forEach((x) => (c[x.scene] = (c[x.scene] ?? 0) + 1))
    return c
  }, [clips])

  const shown = clips.filter((c) => scene === 'all' || c.scene === scene)

  return (
    <>
      <div className="reveal mb-6 flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {[
            ['all', 'All flights'],
            ['outdoor', 'Outdoor'],
            ['indoor', 'Indoor / garage'],
          ].map(([k, label]) => (
            <button
              key={k}
              className="chip"
              data-active={scene === k}
              onClick={() => setScene(k)}
            >
              {label}
              <span className="mono opacity-60">{counts[k] ?? 0}</span>
            </button>
          ))}
        </div>
        <span className="ml-auto text-[0.76rem] text-txt-mute">
          Burned-in subtitles are the issued command.
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((c, i) => (
          <button
            key={c.id}
            onClick={() => setOpen(c)}
            className="group reveal text-left"
            style={{ transitionDelay: `${Math.min(i, 10) * 35}ms` }}
          >
            <AutoVideo
              src={mediaUrl(c.video)}
              poster={mediaUrl(c.poster)}
              aspect={5 / 3}
              className="transition duration-300 group-hover:!border-cyan/40"
            />
            {/* No caption: the issued command is burned into each recording. */}
            <div className="mono mt-2 flex items-center gap-1.5 px-0.5 text-[0.62rem] text-txt-mute">
              <span>{c.scene}</span>
              <span className="opacity-40">·</span>
              <span>{c.duration.toFixed(1)}s</span>
              {c.duration > 12 && (
                <>
                  <span className="opacity-40">·</span>
                  <span className="text-violet">long horizon</span>
                </>
              )}
            </div>
          </button>
        ))}
      </div>

      <Lightbox
        open={!!open}
        onClose={() => setOpen(null)}
        caption={
          open && (
            <span className="mono">
              {open.label} · {open.scene} · {open.duration.toFixed(1)} s ·{' '}
              {open.frames} frames
            </span>
          )
        }
      >
        {open && (
          <div className="media-frame mx-auto max-w-4xl" style={{ aspectRatio: 5 / 3 }}>
            <video
              src={mediaUrl(open.video)}
              poster={mediaUrl(open.poster)}
              autoPlay
              muted
              loop
              playsInline
              controls
            />
          </div>
        )}
      </Lightbox>
    </>
  )
}

export default function RealWorld() {
  return (
    <Section
      id="realworld"
      eyebrow="Real world"
      title="Zero-shot flight in unseen environments"
      lead="20 real-world tasks, five trials each, spanning indoor garages, campus roads and parkland. The policy never saw any of them during training."
    >
      <div className="reveal mb-8 grid gap-4 sm:grid-cols-3">
        {HEADLINES.map(([k, l, s]) => (
          <div key={l} className="card p-6">
            <div className="mono text-[2rem] font-semibold leading-none text-txt">{k}</div>
            <div className="mt-2 text-[0.84rem] text-txt-dim">{l}</div>
            <div className="mt-0.5 text-[0.72rem] text-txt-mute">{s}</div>
          </div>
        ))}
      </div>

      <div className="reveal">
        <FlightGallery />
      </div>

      <p className="reveal mt-6 text-[0.82rem] leading-relaxed text-txt-mute">
        Failures cluster on targets that are very small, or that lack colour
        contrast against the background — the remaining gap between generated and
        real visual statistics.
      </p>
    </Section>
  )
}
