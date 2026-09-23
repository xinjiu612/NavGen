import { useCallback, useEffect, useRef, useState } from 'react'
import { compareUrls, useMedia } from '../lib/media.jsx'
import { Lightbox, Pill } from './ui.jsx'

/**
 * Six policies, one held-out real-world task, played in lockstep: five models
 * trained on five different datasets, plus our bidirectional long-horizon run.
 * Every clip is retimed to the same duration, so a periodic drift correction is
 * enough to keep the grid synchronised without server-side compositing.
 */
function useSyncedPlayback() {
  const refs = useRef([])
  const [playing, setPlaying] = useState(true)

  const setRef = useCallback(
    (i) => (el) => {
      refs.current[i] = el
    },
    [],
  )

  const restart = useCallback(() => {
    refs.current.forEach((v) => {
      if (!v) return
      v.currentTime = 0
      const p = v.play()
      if (p?.catch) p.catch(() => {})
    })
    setPlaying(true)
  }, [])

  const toggle = useCallback(() => {
    setPlaying((was) => {
      refs.current.forEach((v) => {
        if (!v) return
        if (was) v.pause()
        else {
          const p = v.play()
          if (p?.catch) p.catch(() => {})
        }
      })
      return !was
    })
  }, [])

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => {
      const live = refs.current.filter(Boolean)
      if (live.length < 2) return
      const lead = live[0].currentTime
      live.forEach((v) => {
        if (Math.abs(v.currentTime - lead) > 0.12) v.currentTime = lead
      })
    }, 900)
    return () => clearInterval(id)
  }, [playing])

  return { refs: setRef, playing, restart, toggle }
}

export default function ComparePlayer() {
  const { data } = useMedia()
  const compare = data?.compare
  const [taskIdx, setTaskIdx] = useState(0)
  const [expanded, setExpanded] = useState(null)

  const tasks = compare?.tasks ?? []
  const task = tasks[Math.min(taskIdx, Math.max(0, tasks.length - 1))]
  const { refs, playing, restart, toggle } = useSyncedPlayback()

  useEffect(() => {
    if (!task) return
    const id = setTimeout(restart, 60)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id])

  if (!compare || !task) {
    return (
      <div className="card flex h-64 items-center justify-center text-sm text-txt-mute">
        Loading comparison clips…
      </div>
    )
  }

  const step = (d) => setTaskIdx((i) => (i + d + tasks.length) % tasks.length)

  return (
    <div className="card overflow-hidden">
      {/* controls -------------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.07] px-4 py-4 sm:px-5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => step(-1)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-txt-dim transition hover:bg-white/10 hover:text-txt"
            aria-label="Previous task"
          >
            ‹
          </button>
          <span className="mono min-w-[86px] text-center text-[0.76rem] text-txt-dim">
            {taskIdx + 1} / {tasks.length}
          </span>
          <button
            onClick={() => step(1)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-txt-dim transition hover:bg-white/10 hover:text-txt"
            aria-label="Next task"
          >
            ›
          </button>
        </div>

        <div className="flex items-center gap-2 sm:ml-auto">
          <button onClick={toggle} className="btn !px-3.5 !py-1.5 !text-[0.78rem]">
            {playing ? '❚❚ Pause' : '▶ Play'}
          </button>
          <button onClick={restart} className="btn !px-3.5 !py-1.5 !text-[0.78rem]">
            ↻ Restart
          </button>
        </div>
      </div>

      {/* current task ---------------------------------------------------- */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-white/[0.07] px-4 py-3.5 sm:px-5">
        <Pill tone={task.scene === 'indoor' ? 'cyan' : 'violet'}>{task.scene}</Pill>
        <span className="text-[0.98rem] font-medium text-txt">{task.label}</span>
        <button
          onClick={() => setExpanded({ method: null, task })}
          className="mono text-[0.66rem] uppercase tracking-wider text-txt-mute transition hover:text-cyan"
        >
          prompt
        </button>
      </div>

      {/* six tiles ------------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-3 p-4 sm:p-5 md:grid-cols-3">
        {compare.methods.map((m, i) => {
          const urls = compareUrls(m, task.id)
          return (
            <figure
              key={m.key}
              className={`group relative overflow-hidden rounded-lg border transition ${
                m.highlight
                  ? 'border-ours/50 shadow-[0_0_0_1px_rgba(240,69,63,0.18),0_18px_50px_-24px_rgba(240,69,63,0.5)]'
                  : 'border-white/[0.08] hover:border-white/20'
              }`}
            >
              <div className="relative bg-ink-900" style={{ aspectRatio: 5 / 3 }}>
                <video
                  ref={refs(i)}
                  src={urls.video}
                  poster={urls.poster}
                  muted
                  loop
                  playsInline
                  preload="auto"
                  className="h-full w-full object-cover"
                  onClick={() => setExpanded({ method: m, task, urls })}
                />
              </div>
              <figcaption className="px-2.5 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[0.8rem] ${
                      m.highlight ? 'font-semibold text-ours' : 'text-txt-dim'
                    }`}
                  >
                    {m.label}
                  </span>
                  <button
                    onClick={() => setExpanded({ method: m, task, urls })}
                    className="mono text-[0.6rem] uppercase tracking-wider text-txt-mute opacity-0 transition group-hover:opacity-100 hover:text-cyan"
                  >
                    expand
                  </button>
                </div>
              </figcaption>
            </figure>
          )
        })}
      </div>

      {/* task picker ----------------------------------------------------- */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto border-t border-white/[0.07] px-4 py-3 sm:px-5">
        {tasks.map((t, i) => (
          <button
            key={t.id}
            onClick={() => setTaskIdx(i)}
            title={t.label}
            className={`shrink-0 rounded-lg border px-3 py-2 text-left transition ${
              i === taskIdx
                ? 'border-cyan/40 bg-cyan/[0.09]'
                : 'border-white/[0.07] bg-white/[0.015] hover:border-white/15'
            }`}
          >
            <span
              className={`block whitespace-nowrap text-[0.76rem] ${
                i === taskIdx ? 'text-txt' : 'text-txt-dim'
              }`}
            >
              {t.label}
            </span>
            <span className="mono mt-0.5 block text-[0.6rem] text-txt-mute">
              {t.scene}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.07] px-4 py-4 sm:px-5">
        <Pill tone="ours">Ours (AR) · Ours (BI)</Pill>
        <span className="text-[0.78rem] leading-relaxed text-txt-mute">
          Wan2.2-5B fine-tuned on each dataset, rolled out on the same held-out
          task — identical first frame and prompt. All six tiles are retimed to
          the same duration so they can be read side by side.
        </span>
      </div>

      <Lightbox
        open={!!expanded}
        onClose={() => setExpanded(null)}
        caption={
          expanded && (
            <span className="mono">
              {expanded.method ? `${expanded.method.label} · ` : ''}
              {expanded.task.label} · {expanded.task.scene}
            </span>
          )
        }
      >
        {expanded && (
          <div className="mx-auto max-w-4xl">
            {expanded.urls && (
              <div className="media-frame" style={{ aspectRatio: 5 / 3 }}>
                <video
                  src={expanded.urls.video}
                  poster={expanded.urls.poster}
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls
                />
              </div>
            )}
            {expanded.task.prompt && (
              <p
                className={`max-h-44 overflow-y-auto rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 text-[0.8rem] leading-relaxed text-txt-dim ${
                  expanded.urls ? 'mt-4' : ''
                }`}
              >
                <span className="mono mb-1.5 block text-[0.62rem] uppercase tracking-widest text-txt-mute">
                  navigation prompt
                </span>
                {expanded.task.prompt}
              </p>
            )}
          </div>
        )}
      </Lightbox>
    </div>
  )
}
